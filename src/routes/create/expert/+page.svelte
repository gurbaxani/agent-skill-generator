<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';
	import { skillDraft, type ScriptLanguage, type AssetKind, type MetaEntry, type RefFile } from '$lib/state/draft.svelte';
	import { marked } from 'marked';

	// ── Page States ──────────────────────────────────────────────────────────
	let isGenerating = $state(false);
	let errorMsg = $state('');
	let copied = $state(false);
	let downloaded = $state(false);
	let aiPrompt = $state('');

	// ── Provider state ───────────────────────────────────────────────────────
	let availableProviders = $derived(Object.keys(userState.keys));
	let selectedProvider = $state('');

	onMount(() => {
		if (availableProviders.length > 0) {
			selectedProvider = availableProviders[0];
		}
	});

	// ── Live SKILL.md Computed properties ────────────────────────────────────
	let skillFile = $derived(skillDraft.assembledMarkdown);
	let isValid = $derived(skillDraft.isValid);

	let frontmatterLines = $derived.by(() => {
		const lines = skillFile.split('\n');
		const start = lines.indexOf('---');
		const end = lines.indexOf('---', start + 1);
		if (start === -1 || end === -1) return [];
		return lines.slice(start + 1, end);
	});

	let renderedBody = $derived(marked.parse(skillDraft.body.trim() || '_No content written yet._') as string);

	// ── AI generation types ──────────────────────────────────────────────────
	interface AIGeneratedSkill {
		name?: string;
		description?: string;
		license?: string;
		compatibility?: string;
		metadata?: Record<string, string | number | boolean>;
		'allowed-tools'?: string;
		body?: string;
		scripts?: {
			enabled: boolean;
			languages: ScriptLanguage[];
		};
		references?: {
			enabled: boolean;
			files: { name: string; description: string }[];
		};
		assets?: {
			enabled: boolean;
			kinds: AssetKind[];
		};
	}

	async function handleGenerateAll() {
		if (!selectedProvider || !aiPrompt.trim()) return;
		const config = userState.keys[selectedProvider];
		isGenerating = true;
		errorMsg = '';
		try {
			const prompt = `You are an expert at creating AI agent skills.
Create a complete skill based on the following request:
"${aiPrompt}"

Output ONLY a valid JSON object matching this exact TypeScript structure:
{
  "name": "lowercase-hyphenated-name",
  "description": "Short description starting with 'Use this skill when...' focusing on when/under what conditions the agent should retrieve/use it (max 1024 chars)",
  "license": "SPDX license (e.g. MIT, Apache-2.0)",
  "compatibility": "System/runtime requirements (max 500 chars)",
  "metadata": {
    "author": "Suggest an author or org",
    "version": "1.0.0"
  },
  "allowed-tools": "space separated list of tools or utilities",
  "body": "Thorough instructions markdown body (no YAML frontmatter, no leading/trailing ---). Make sure to include Overview, Step-by-step Instructions, Examples, and Common Edge Cases.",
  "scripts": {
    "enabled": true/false,
    "languages": ["python", "bash", "javascript", "other"]
  },
  "references": {
    "enabled": true/false,
    "files": [
      { "name": "REFERENCE.md", "description": "Brief description" }
    ]
  },
  "assets": {
    "enabled": true/false,
    "kinds": ["templates", "images", "data"]
  }
}

Do NOT include any markdown formatting around the JSON except standard \`\`\`json blocks if needed, but output ONLY the raw JSON. Output no other conversational text.`;

			let responseText = '';
			if (selectedProvider === 'gemini') {
				const modelName = config.model || 'gemini-1.5-flash';
				const res = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.key}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
					}
				);
				const data = await res.json();
				if (data.error) throw new Error(data.error.message);
				responseText = data.candidates[0].content.parts[0].text.trim();
			} else if (selectedProvider === 'anthropic') {
				const res = await fetch('https://api.anthropic.com/v1/messages', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': config.key,
						'anthropic-version': '2023-06-01',
						'anthropic-dangerous-direct-browser-access': 'true'
					},
					body: JSON.stringify({
						model: config.model || 'claude-3-haiku-20240307',
						max_tokens: 4096,
						messages: [{ role: 'user', content: prompt }]
					})
				});
				const data = await res.json();
				if (data.error) throw new Error(data.error.message);
				responseText = data.content[0].text.trim();
			} else {
				const endpoint = config.endpoint || 'https://api.openai.com/v1';
				let model = config.model;
				if (!model) {
					model = 'gpt-4o-mini';
					if (selectedProvider === 'openrouter') model = 'meta-llama/llama-3-8b-instruct:free';
					if (selectedProvider === 'ollama') model = 'llama3';
				}
				const res = await fetch(`${endpoint}/chat/completions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(config.key ? { Authorization: `Bearer ${config.key}` } : {})
					},
					body: JSON.stringify({
						model,
						messages: [{ role: 'user', content: prompt }]
					})
				});
				const data = await res.json();
				if (data.error) throw new Error(data.error.message);
				responseText = data.choices[0].message.content.trim();
			}

			const cleaned = responseText
				.replace(/^```json\s*/i, '')
				.replace(/```$/, '')
				.trim();
			const parsed: AIGeneratedSkill = JSON.parse(cleaned);

			if (parsed.name) skillDraft.name = parsed.name;
			if (parsed.description) skillDraft.description = parsed.description;
			if (parsed.license) skillDraft.license = parsed.license;
			if (parsed.compatibility) skillDraft.compatibility = parsed.compatibility.slice(0, 500);

			if (parsed.metadata) {
				const entries: MetaEntry[] = [];
				let id = 1;
				for (const [k, v] of Object.entries(parsed.metadata)) {
					entries.push({ key: k, value: String(v), id: id++ });
				}
				skillDraft.metadata = entries;
				skillDraft.nextMetaId = id;
			} else {
				skillDraft.metadata = [];
				skillDraft.nextMetaId = 1;
			}

			if (parsed['allowed-tools']) skillDraft.allowedTools = parsed['allowed-tools'];
			if (parsed.body) skillDraft.body = parsed.body;

			if (parsed.scripts?.enabled) {
				skillDraft.enableScripts = true;
				skillDraft.scriptLanguages = parsed.scripts.languages || [];
			} else {
				skillDraft.enableScripts = false;
			}

			if (parsed.references?.enabled) {
				skillDraft.enableReferences = true;
				if (parsed.references.files) {
					skillDraft.refFiles = parsed.references.files.map((f, i) => ({
						name: f.name,
						description: f.description,
						id: i + 1
					}));
					skillDraft.nextRefId = parsed.references.files.length + 1;
				}
			} else {
				skillDraft.enableReferences = false;
			}

			if (parsed.assets?.enabled) {
				skillDraft.enableAssets = true;
				skillDraft.assetKinds = parsed.assets.kinds || [];
			} else {
				skillDraft.enableAssets = false;
			}
		} catch (err: unknown) {
			console.error(err);
			if (err instanceof Error) {
				errorMsg = err.message;
			} else {
				errorMsg = 'Failed to auto-generate the skill. Please verify your keys configuration and prompt text.';
			}
		} finally {
			isGenerating = false;
		}
	}

	// ── Form Adders / Removers ───────────────────────────────────────────────
	function addMeta() {
		skillDraft.metadata = [...skillDraft.metadata, { key: '', value: '', id: skillDraft.nextMetaId++ }];
	}

	function removeMeta(id: number) {
		skillDraft.metadata = skillDraft.metadata.filter((m) => m.id !== id);
	}

	function addRefFile() {
		skillDraft.refFiles = [...skillDraft.refFiles, { name: '', description: '', id: skillDraft.nextRefId++ }];
	}

	function removeRefFile(id: number) {
		skillDraft.refFiles = skillDraft.refFiles.filter((f) => f.id !== id);
	}

	// ── Scripts List ─────────────────────────────────────────────────────────
	const allLanguages: { value: ScriptLanguage; label: string; icon: string }[] = [
		{ value: 'python', label: 'Python', icon: 'bi-filetype-py' },
		{ value: 'bash', label: 'Bash', icon: 'bi-terminal' },
		{ value: 'javascript', label: 'JavaScript', icon: 'bi-filetype-js' },
		{ value: 'other', label: 'Other', icon: 'bi-file-earmark-code' }
	];

	function toggleLanguage(lang: ScriptLanguage) {
		if (skillDraft.scriptLanguages.includes(lang)) {
			skillDraft.scriptLanguages = skillDraft.scriptLanguages.filter((l) => l !== lang);
		} else {
			skillDraft.scriptLanguages = [...skillDraft.scriptLanguages, lang];
		}
	}

	// ── Assets List ──────────────────────────────────────────────────────────
	const allAssetKinds: { value: AssetKind; label: string; icon: string; hint: string }[] = [
		{ value: 'templates', label: 'Templates', icon: 'bi-file-earmark-text', hint: 'Document & config templates' },
		{ value: 'images', label: 'Images', icon: 'bi-image', hint: 'Diagrams, screenshots, examples' },
		{ value: 'data', label: 'Data files', icon: 'bi-table', hint: 'Lookup tables, schemas, CSVs' }
	];

	function toggleAsset(kind: AssetKind) {
		if (skillDraft.assetKinds.includes(kind)) {
			skillDraft.assetKinds = skillDraft.assetKinds.filter((k) => k !== kind);
		} else {
			skillDraft.assetKinds = [...skillDraft.assetKinds, kind];
		}
	}

	// ── Actions ──────────────────────────────────────────────────────────────
	async function handleCopy() {
		await navigator.clipboard.writeText(skillFile);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function handleDownload() {
		const blob = new Blob([skillFile], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'SKILL.md';
		a.click();
		URL.revokeObjectURL(url);
		downloaded = true;
		setTimeout(() => (downloaded = false), 2000);
	}

	function handleReset() {
		if (confirm('Are you sure you want to reset all form inputs?')) {
			skillDraft.reset();
		}
	}
</script>

<svelte:head>
	<title>Expert Skill Creator — ASG</title>
	<meta name="description" content="Generate and edit complete AI agent skills inside a single unified dashboard." />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 lg:px-6">
	<!-- Top Heading Row -->
	<div class="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-extrabold tracking-widest text-(--text-primary)">
				Expert Workspace
			</h1>
			<p class="text-sm text-(--text-secondary) mt-1">
				Configure the entire skill on a single dashboard or let AI generate the draft from a prompt.
			</p>
		</div>
		<div>
			<button
				type="button"
				onclick={handleReset}
				style="border: 1px solid var(--secondary); color: var(--secondary);"
				class="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--secondary-subtle) focus:outline-none rounded-[2px]"
			>
				<i class="bi bi-trash"></i> Reset Draft
			</button>
		</div>
	</div>

	<!-- Error Alert -->
	{#if errorMsg}
		<div
			style="border: 1px solid var(--secondary); background: var(--secondary-subtle); color: var(--secondary); font-family: var(--font-mono); border-radius: 2px;"
			class="mb-6 p-4 text-sm shadow-sm"
		>
			[Error] {errorMsg}
		</div>
	{/if}

	<!-- Main Columns Grid -->
	<div class="grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
		
		<!-- Left: Form Controls Column -->
		<div class="flex flex-col gap-6">

			<!-- AI Generation Dashboard Panel -->
			{#if availableProviders.length > 0}
				<div class="cyber-panel glow-accent p-5 flex flex-col gap-4">
					<div class="flex items-center gap-2 border-b border-(--border-default) pb-3">
						<i class="bi bi-magic text-lg text-(--accent)"></i>
						<h2 class="text-sm font-bold tracking-widest text-(--text-primary)">AI Complete Generator</h2>
					</div>

					<div class="flex flex-col gap-2">
						<label for="ai-prompt-input" class="text-xs font-bold tracking-wider text-(--text-secondary) uppercase">
							What should this skill do?
						</label>
						<textarea
							id="ai-prompt-input"
							bind:value={aiPrompt}
							placeholder="Describe the skill's purpose... (e.g. 'A Git assistant that drafts clean commit messages and summarizes branch diffs')"
							rows="3"
							style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-body);"
							class="w-full p-3 text-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent) focus:outline-none"
						></textarea>
					</div>

					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-2">
							<label for="provider-select" class="text-xs font-bold text-(--text-tertiary) uppercase whitespace-nowrap">Model Key:</label>
							<select
								id="provider-select"
								bind:value={selectedProvider}
								style="color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono);"
								class="bg-transparent px-3 py-1.5 text-xs focus:outline-none"
							>
								{#each availableProviders as provider (provider)}
									<option value={provider}>{provider}</option>
								{/each}
							</select>
						</div>

						<button
							type="button"
							onclick={handleGenerateAll}
							disabled={isGenerating || !aiPrompt.trim()}
							style="background: var(--accent); color: var(--accent-fg);"
							class="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_12px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none rounded-[2px]"
						>
							{#if isGenerating}
								<span class="animate-pulse flex items-center gap-1"><i class="bi bi-cpu animate-spin"></i> Writing...</span>
							{:else}
								<i class="bi bi-lightning-fill"></i> Let AI Write Everything
							{/if}
						</button>
					</div>
				</div>
			{:else}
				<div class="cyber-panel border-secondary p-5 flex items-start gap-3">
					<i class="bi bi-exclamation-triangle text-lg text-(--secondary)"></i>
					<div class="flex-1">
						<h3 class="text-sm font-bold text-(--text-primary) uppercase tracking-wide">AI Generation Disabled</h3>
						<p class="text-xs text-(--text-secondary) mt-1">
							No API Keys configured. Add a provider key in <a href="/keys" class="underline text-(--accent) hover:text-(--accent-hover)">Settings</a> to enable the one-click generator.
						</p>
					</div>
				</div>
			{/if}

			<!-- Step 1: Required Details -->
			<div class="cyber-panel p-5 flex flex-col gap-4">
				<div class="flex items-center gap-2 border-b border-(--border-default) pb-3">
					<i class="bi bi-asterisk text-sm text-(--accent)"></i>
					<h2 class="text-xs font-bold tracking-widest text-(--text-primary) uppercase">1. Core Information (Required)</h2>
				</div>

				<div class="flex flex-col gap-2">
					<label for="skill-name" class="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">Skill Name</label>
					<input
						id="skill-name"
						type="text"
						bind:value={skillDraft.name}
						placeholder="e.g. kubernetes-debugger"
						style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-mono);"
						class="w-full p-2.5 text-sm focus:border-(--accent) focus:outline-none"
					/>
					<div class="flex items-center gap-2 text-[11px] text-(--text-tertiary) font-mono">
						<span>Generated Identifier:</span>
						<span class="text-(--accent) font-semibold">{skillDraft.validName || 'none'}</span>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<label for="skill-desc" class="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">Description</label>
						<span class="text-xs font-mono text-(--text-tertiary)" class:text-(--secondary)={skillDraft.description.length > 1024}>
							{skillDraft.description.length} / 1024
						</span>
					</div>
					<textarea
						id="skill-desc"
						bind:value={skillDraft.description}
						placeholder="Use this skill when..."
						rows="3"
						style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-body);"
						class="w-full p-3 text-sm focus:border-(--accent) focus:outline-none"
					></textarea>
				</div>
			</div>

			<!-- Step 2: Optional Settings -->
			<div class="cyber-panel p-5 flex flex-col gap-4">
				<div class="flex items-center gap-2 border-b border-(--border-default) pb-3">
					<i class="bi bi-sliders text-sm text-(--accent)"></i>
					<h2 class="text-xs font-bold tracking-widest text-(--text-primary) uppercase">2. Optional Configuration</h2>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<label for="skill-license" class="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">License</label>
						<input
							id="skill-license"
							type="text"
							bind:value={skillDraft.license}
							placeholder="MIT, Apache-2.0, etc."
							style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-mono);"
							class="w-full p-2.5 text-xs focus:border-(--accent) focus:outline-none"
						/>
					</div>

					<div class="flex flex-col gap-2">
						<label for="allowed-tools-input" class="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">Allowed Tools</label>
						<input
							id="allowed-tools-input"
							type="text"
							bind:value={skillDraft.allowedTools}
							placeholder="e.g. kubectl docker"
							style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-mono);"
							class="w-full p-2.5 text-xs focus:border-(--accent) focus:outline-none"
						/>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<label for="skill-compat" class="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">Compatibility</label>
						<span class="text-xs font-mono text-(--text-tertiary)" class:text-(--secondary)={skillDraft.compatibility.length > 500}>
							{skillDraft.compatibility.length} / 500
						</span>
					</div>
					<textarea
						id="skill-compat"
						bind:value={skillDraft.compatibility}
						placeholder="Specify environment limits, runtime requirements..."
						rows="2"
						style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-body);"
						class="w-full p-3 text-xs focus:border-(--accent) focus:outline-none"
					></textarea>
				</div>

				<!-- Custom Metadata Key-Values -->
				<div class="flex flex-col gap-3 pt-2">
					<label for="meta-pairs-label" id="meta-pairs-label" class="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">Custom Metadata</label>
					{#if skillDraft.metadata.length > 0}
						<div class="flex flex-col gap-2">
							{#each skillDraft.metadata as item (item.id)}
								<div class="flex items-center gap-2">
									<input
										type="text"
										bind:value={item.key}
										aria-label="Metadata Key"
										placeholder="Key"
										style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-mono);"
										class="w-1/3 p-2 text-xs focus:border-(--accent) focus:outline-none"
									/>
									<input
										type="text"
										bind:value={item.value}
										aria-label="Metadata Value"
										placeholder="Value"
										style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-body);"
										class="flex-1 p-2 text-xs focus:border-(--accent) focus:outline-none"
									/>
									<button
										type="button"
										onclick={() => removeMeta(item.id)}
										class="p-2 text-(--text-tertiary) hover:text-(--secondary) transition-colors"
										title="Remove Field"
									>
										<i class="bi bi-x-lg text-xs"></i>
									</button>
								</div>
							{/each}
						</div>
					{/if}
					<button
						type="button"
						onclick={addMeta}
						style="border: 1px dashed var(--border-strong); color: var(--text-secondary);"
						class="py-2 text-xs font-bold uppercase tracking-wider hover:border-(--accent) hover:text-(--accent) transition-all focus:outline-none rounded-[2px]"
					>
						<i class="bi bi-plus-lg"></i> Add Custom Field
					</button>
				</div>
			</div>

			<!-- Step 3: Instructions (Markdown Body) -->
			<div class="cyber-panel p-5 flex flex-col gap-4">
				<div class="flex items-center gap-2 border-b border-(--border-default) pb-3">
					<i class="bi bi-file-text-fill text-sm text-(--accent)"></i>
					<h2 class="text-xs font-bold tracking-widest text-(--text-primary) uppercase">3. Instruction Guide (Markdown)</h2>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex justify-between items-center">
						<label for="expert-body-textarea" class="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">Instructions Body</label>
						<span class="text-xs font-mono text-(--text-tertiary)">{skillDraft.body.length.toLocaleString()} chars</span>
					</div>
					<textarea
						id="expert-body-textarea"
						bind:value={skillDraft.body}
						placeholder={`## Step-by-step Instructions\n\n1. Review the logs...\n2. Check config file...\n\n## Examples\n\n**Input:** ...\n**Output:** ...`}
						rows="12"
						style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-mono); line-height: 1.6;"
						class="w-full p-4 text-sm focus:border-(--accent) focus:outline-none"
					></textarea>
				</div>
			</div>

			<!-- Step 4: Directory Configuration -->
			<div class="cyber-panel p-5 flex flex-col gap-4">
				<div class="flex items-center gap-2 border-b border-(--border-default) pb-3">
					<i class="bi bi-folder-fill text-sm text-(--accent)"></i>
					<h2 class="text-xs font-bold tracking-widest text-(--text-primary) uppercase">4. Optional Directories</h2>
				</div>

				<!-- scripts/ -->
				<div class="border border-(--border-default) p-4 rounded-[2px]" style="background: var(--surface-sunken);">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<i class="bi bi-terminal text-lg text-(--accent)"></i>
							<span class="text-sm font-semibold font-mono text-(--text-primary)">scripts/</span>
						</div>
						<button
							type="button"
							id="toggle-expert-scripts"
							onclick={() => (skillDraft.enableScripts = !skillDraft.enableScripts)}
							class="toggle-pill"
							class:active={skillDraft.enableScripts}
							aria-pressed={skillDraft.enableScripts}
							aria-label="Toggle scripts"
						>
							<span class="toggle-knob"></span>
						</button>
					</div>

					{#if skillDraft.enableScripts}
						<div class="mt-4 border-t border-(--border-default) pt-4 flex flex-col gap-3">
							<span class="text-xs text-(--text-secondary)">Languages:</span>
							<div class="flex flex-wrap gap-2">
								{#each allLanguages as lang (lang.value)}
									<button
										type="button"
										id="expert-lang-{lang.value}"
										onclick={() => toggleLanguage(lang.value)}
										class="chip"
										class:chip-active={skillDraft.scriptLanguages.includes(lang.value)}
									>
										<i class="bi {lang.icon}"></i> {lang.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- references/ -->
				<div class="border border-(--border-default) p-4 rounded-[2px]" style="background: var(--surface-sunken);">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<i class="bi bi-book text-lg text-(--accent)"></i>
							<span class="text-sm font-semibold font-mono text-(--text-primary)">references/</span>
						</div>
						<button
							type="button"
							id="toggle-expert-references"
							onclick={() => (skillDraft.enableReferences = !skillDraft.enableReferences)}
							class="toggle-pill"
							class:active={skillDraft.enableReferences}
							aria-pressed={skillDraft.enableReferences}
							aria-label="Toggle references"
						>
							<span class="toggle-knob"></span>
						</button>
					</div>

					{#if skillDraft.enableReferences}
						<div class="mt-4 border-t border-(--border-default) pt-4 flex flex-col gap-3">
							<span class="text-xs text-(--text-secondary)">Reference Files:</span>
							{#if skillDraft.refFiles.length > 0}
								<div class="flex flex-col gap-2">
									{#each skillDraft.refFiles as file (file.id)}
										<div class="flex items-center gap-2">
											<input
												type="text"
												bind:value={file.name}
												aria-label="Reference File Name"
												placeholder="filename.md"
												style="background: var(--surface-base); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-mono);"
												class="w-1/3 p-2 text-xs focus:border-(--accent) focus:outline-none"
											/>
											<input
												type="text"
												bind:value={file.description}
												aria-label="Reference File Description"
												placeholder="Description"
												style="background: var(--surface-base); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-body);"
												class="flex-1 p-2 text-xs focus:border-(--accent) focus:outline-none"
											/>
											<button
												type="button"
												onclick={() => removeRefFile(file.id)}
												class="p-2 text-(--text-tertiary) hover:text-(--secondary) transition-colors"
												title="Remove Reference"
											>
												<i class="bi bi-x-lg text-xs"></i>
											</button>
										</div>
									{/each}
								</div>
							{/if}
							<button
								type="button"
								onclick={addRefFile}
								style="border: 1px dashed var(--border-strong); color: var(--text-secondary);"
								class="py-2 text-xs font-bold uppercase tracking-wider hover:border-(--accent) hover:text-(--accent) transition-all focus:outline-none rounded-[2px]"
							>
								<i class="bi bi-plus-lg"></i> Add Reference File
							</button>
						</div>
					{/if}
				</div>

				<!-- assets/ -->
				<div class="border border-(--border-default) p-4 rounded-[2px]" style="background: var(--surface-sunken);">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<i class="bi bi-folder2-open text-lg text-(--accent)"></i>
							<span class="text-sm font-semibold font-mono text-(--text-primary)">assets/</span>
						</div>
						<button
							type="button"
							id="toggle-expert-assets"
							onclick={() => (skillDraft.enableAssets = !skillDraft.enableAssets)}
							class="toggle-pill"
							class:active={skillDraft.enableAssets}
							aria-pressed={skillDraft.enableAssets}
							aria-label="Toggle assets"
						>
							<span class="toggle-knob"></span>
						</button>
					</div>

					{#if skillDraft.enableAssets}
						<div class="mt-4 border-t border-(--border-default) pt-4 flex flex-col gap-2">
							<span class="text-xs text-(--text-secondary) mb-1">Asset Types:</span>
							{#each allAssetKinds as kind (kind.value)}
								<button
									type="button"
									id="expert-asset-{kind.value}"
									onclick={() => toggleAsset(kind.value)}
									class="asset-row"
									class:asset-row-active={skillDraft.assetKinds.includes(kind.value)}
								>
									<div class="flex items-center gap-3">
										<i class="bi {kind.icon} text-base" style="color: {skillDraft.assetKinds.includes(kind.value) ? 'var(--accent)' : 'var(--text-tertiary)'};"></i>
										<div class="flex flex-col items-start gap-0.5">
											<span class="asset-label">{kind.label}</span>
											<span class="asset-hint">{kind.hint}</span>
										</div>
									</div>
									<div class="check-box" class:check-box-active={skillDraft.assetKinds.includes(kind.value)}>
										{#if skillDraft.assetKinds.includes(kind.value)}
											<i class="bi bi-check2 text-xs"></i>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Compiled Live Output Preview Column -->
		<div class="sticky-column">
			<div class="flex flex-col gap-4">
				
				<!-- Normal Markdown Preview Panel -->
				<div class="cyber-panel p-5 flex flex-col gap-4">
					<div class="flex items-center gap-2 border-b border-(--border-default) pb-3">
						<i class="bi bi-file-earmark-medical text-sm text-(--accent)"></i>
						<h2 class="text-xs font-bold tracking-widest text-(--text-primary) uppercase">SKILL.md Live Preview</h2>
					</div>

					<div class="preview-scroll-container">
						<!-- Frontmatter block -->
						<div class="preview-frontmatter">
							<span class="fm-fence">---</span>
							{#each frontmatterLines as fmLine, i (i)}
								{@const colonIdx = fmLine.indexOf(':')}
								{#if colonIdx > -1}
									<div class="fm-row">
										<span class="fm-key">{fmLine.slice(0, colonIdx)}:</span><span class="fm-val">{fmLine.slice(colonIdx + 1)}</span>
									</div>
								{:else}
									<div class="fm-row"><span class="fm-indent">{fmLine}</span></div>
								{/if}
							{/each}
							<span class="fm-fence">---</span>
						</div>

						<!-- Rendered markdown body -->
						<div class="preview-prose">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html renderedBody}
						</div>
					</div>
				</div>

				<!-- Live Preview Panel Action Footer -->
				<div class="flex items-center justify-between gap-3">
					<button
						type="button"
						id="expert-btn-copy"
						onclick={handleCopy}
						disabled={!isValid}
						style="border: 1px solid var(--border-strong); color: {copied ? 'var(--accent)' : 'var(--text-secondary)'}; {copied ? 'border-color: var(--accent);' : ''}"
						class="flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold tracking-widest uppercase transition-all hover:border-(--accent) hover:text-(--accent) disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none rounded-[2px]"
					>
						{#if copied}
							<i class="bi bi-check-lg"></i> Copied Markdown!
						{:else}
							<i class="bi bi-clipboard"></i> Copy SKILL.md
						{/if}
					</button>

					<button
						type="button"
						id="expert-btn-download"
						onclick={handleDownload}
						disabled={!isValid}
						style="background: var(--accent); color: var(--accent-fg);"
						class="flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus:outline-none rounded-[2px]"
					>
						{#if downloaded}
							<i class="bi bi-check-lg"></i> Downloaded!
						{:else}
							<i class="bi bi-download"></i> Download SKILL.md
						{/if}
					</button>
				</div>
			</div>
		</div>

	</div>
</div>

<style>
	/* ── Cyber panels ─────────────────────────────────────────────── */
	.cyber-panel {
		background: var(--surface-raised);
		backdrop-filter: blur(12px);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		transition: border-color var(--duration-normal) ease;
	}

	.glow-accent {
		border-color: var(--border-accent);
		box-shadow: 0 0 15px var(--accent-glow);
	}

	.cyber-panel:hover {
		border-color: var(--accent-dim);
	}

	/* Sticky panel column on right side */
	.sticky-column {
		position: sticky;
		top: var(--space-md);
	}

	/* ── Toggle Pills ─────────────────────────────────────────────── */
	.toggle-pill {
		position: relative;
		width: 44px;
		height: 24px;
		border-radius: 12px;
		background: var(--border-strong);
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.2s var(--ease-out-quart, ease);
	}
	.toggle-pill.active {
		background: var(--accent);
	}
	.toggle-knob {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--text-primary);
		transition: transform 0.2s var(--ease-out-quart, ease);
	}
	.toggle-pill.active .toggle-knob {
		transform: translateX(20px);
	}

	/* ── Language chips ───────────────────────────────────────────── */
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 2px;
		border: 1px solid var(--border-strong);
		background: transparent;
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.chip:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.chip-active {
		border-color: var(--accent) !important;
		color: var(--accent) !important;
		background: var(--accent-glow) !important;
	}

	/* ── Asset configuration row ──────────────────────────────────── */
	.asset-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 12px 14px;
		border-radius: 2px;
		border: 1px solid var(--border-strong);
		background: transparent;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
	}
	.asset-row:hover {
		border-color: var(--accent);
		background: var(--accent-glow);
	}
	.asset-row-active {
		border-color: var(--accent) !important;
		background: var(--accent-glow) !important;
	}
	.asset-label {
		font-family: var(--font-display);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-primary);
	}
	.asset-hint {
		font-family: var(--font-body);
		font-size: 11px;
		color: var(--text-secondary);
	}
	.check-box {
		width: 18px;
		height: 18px;
		border-radius: 2px;
		border: 1px solid var(--border-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent-fg);
		flex-shrink: 0;
		transition: all 0.15s ease;
	}
	.check-box-active {
		background: var(--accent);
		border-color: var(--accent);
	}

	/* ── Normal Markdown Preview design ───────────────────────────── */
	.preview-scroll-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		max-height: 600px;
		overflow-y: auto;
	}

	.preview-frontmatter {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.8;
		padding: 0.75rem 1rem;
		background: var(--surface-sunken);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.fm-fence {
		color: var(--terminal-comment);
		font-style: italic;
	}

	.fm-row {
		display: flex;
		gap: 0;
		flex-wrap: wrap;
	}

	.fm-key {
		color: var(--terminal-keyword);
		min-width: 0;
	}

	.fm-val {
		color: var(--terminal-text);
		white-space: pre-wrap;
	}

	.fm-indent {
		color: var(--terminal-string);
		padding-left: 1.25rem;
	}

	.preview-prose {
		padding: 1.25rem;
		background: var(--surface-sunken);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: 0.875rem;
		line-height: 1.75;
		word-break: break-word;
		overflow-wrap: break-word;
	}

	/* Headings */
	.preview-prose :global(h1),
	.preview-prose :global(h2),
	.preview-prose :global(h3),
	.preview-prose :global(h4) {
		font-family: var(--font-display);
		color: var(--text-primary);
		font-weight: 700;
		letter-spacing: 0.02em;
		margin-top: 1.5em;
		margin-bottom: 0.4em;
	}

	.preview-prose :global(h1) { font-size: 1.25rem; }
	.preview-prose :global(h2) { font-size: 1.05rem; border-bottom: 1px solid var(--border-default); padding-bottom: 0.25em; }
	.preview-prose :global(h3) { font-size: 0.9rem; color: var(--accent); }
	.preview-prose :global(h4) { font-size: 0.825rem; text-transform: uppercase; }

	.preview-prose :global(p) {
		margin-top: 0;
		margin-bottom: 0.85em;
	}

	/* Inline code */
	.preview-prose :global(code) {
		font-family: var(--font-mono);
		font-size: 0.8em;
		background: var(--surface-raised);
		color: var(--accent);
		padding: 0.15em 0.4em;
		border-radius: 3px;
	}

	/* Code blocks */
	.preview-prose :global(pre) {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		background: var(--terminal-bg);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		padding: 0.9rem 1rem;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
		margin: 0.85em 0;
	}

	.preview-prose :global(pre code) {
		background: none;
		padding: 0;
		color: var(--text-secondary);
		font-size: inherit;
	}

	/* Lists */
	.preview-prose :global(ul),
	.preview-prose :global(ol) {
		padding-left: 1.4em;
		margin-bottom: 0.85em;
	}

	.preview-prose :global(li) {
		margin-bottom: 0.3em;
	}

	.preview-prose :global(li::marker) {
		color: var(--accent);
	}

	/* Blockquotes */
	.preview-prose :global(blockquote) {
		border-left: 3px solid var(--accent);
		margin: 0.85em 0;
		padding: 0.4em 1em;
		color: var(--text-tertiary);
		font-style: italic;
		background: var(--surface-raised);
	}

	.preview-prose :global(hr) {
		border: none;
		border-top: 1px solid var(--border-strong);
		margin: 1.25em 0;
	}

	.preview-prose :global(strong) {
		color: var(--text-primary);
		font-weight: 700;
	}

	.preview-prose :global(em) {
		color: var(--text-tertiary);
	}

	.border-secondary {
		border-color: var(--secondary);
	}
</style>
