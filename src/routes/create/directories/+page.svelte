<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';
	import { skillDraft, type ScriptLanguage, type AssetKind } from '$lib/state/draft.svelte';
	import { downloadSkillZip } from '$lib/utils/zip';

	let isGenerating = $state(false);
	let errorMsg = $state('');
	let availableProviders = $derived(Object.keys(userState.keys));
	let selectedProvider = $state('');

	onMount(() => {
		if (!skillDraft.name) {
			goto('/create/required');
		}
		if (availableProviders.length > 0) {
			selectedProvider = availableProviders[0];
		}
	});

	// ── AI generation ─────────────────────────────────────────────
	type GenerateResult = {
		scripts?: { enabled: boolean; languages: ScriptLanguage[] };
		references?: { enabled: boolean; files: { name: string; description: string }[] };
		assets?: { enabled: boolean; kinds: AssetKind[] };
	};

	async function handleGenerate() {
		if (!selectedProvider) return;
		const config = userState.keys[selectedProvider];
		isGenerating = true;
		errorMsg = '';
		try {
			const prompt = `You are an expert at structuring AI agent skills.
A skill named "${skillDraft.validName}" has this description: "${skillDraft.description || 'Not provided'}".

Decide which optional directories this skill should include and what content they need.
Output ONLY a valid JSON object with this exact shape (omit any directory the skill doesn't need):
{
  "scripts": {
    "enabled": true,
    "languages": ["python", "bash", "javascript", "other"]  // only include relevant ones
  },
  "references": {
    "enabled": true,
    "files": [
      { "name": "REFERENCE.md", "description": "What this file covers" }
    ]
  },
  "assets": {
    "enabled": true,
    "kinds": ["templates", "images", "data"]  // only include relevant ones
  }
}
If a directory is not needed, set enabled: false or omit it entirely.
Output ONLY the JSON, nothing else.`;

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
						max_tokens: 1024,
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
			const parsed: GenerateResult = JSON.parse(cleaned);

			if (parsed.scripts?.enabled) {
				skillDraft.enableScripts = true;
				const validLangs = parsed.scripts.languages.filter((l): l is ScriptLanguage =>
					['python', 'bash', 'javascript', 'other'].includes(l)
				);
				if (validLangs.length > 0) skillDraft.scriptLanguages = validLangs;
			} else {
				skillDraft.enableScripts = false;
			}
			if (parsed.references?.enabled) {
				skillDraft.enableReferences = true;
				if (parsed.references.files.length > 0) {
					skillDraft.refFiles = parsed.references.files.map((f, i) => ({
						name: f.name,
						description: f.description,
						id: skillDraft.nextRefId + i
					}));
					skillDraft.nextRefId += parsed.references.files.length;
				}
			} else {
				skillDraft.enableReferences = false;
			}
			if (parsed.assets?.enabled) {
				skillDraft.enableAssets = true;
				const validKinds = parsed.assets.kinds.filter((k): k is AssetKind =>
					['templates', 'images', 'data'].includes(k)
				);
				if (validKinds.length > 0) skillDraft.assetKinds = validKinds;
			} else {
				skillDraft.enableAssets = false;
			}
		} catch (err: unknown) {
			console.error(err);
			if (err instanceof Error) {
				errorMsg = err.message;
			} else {
				errorMsg =
					'Failed to generate directory suggestions. Please check your API key configuration.';
			}
		} finally {
			isGenerating = false;
		}
	}

	// ── scripts/ config ───────────────────────────────────────────
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

	// ── references/ config ────────────────────────────────────────
	function addRefFile() {
		skillDraft.refFiles = [
			...skillDraft.refFiles,
			{ name: '', description: '', id: skillDraft.nextRefId++ }
		];
	}
	function removeRefFile(id: number) {
		skillDraft.refFiles = skillDraft.refFiles.filter((f) => f.id !== id);
	}

	// ── assets/ config ────────────────────────────────────────────
	const allAssetKinds: { value: AssetKind; label: string; icon: string; hint: string }[] = [
		{
			value: 'templates',
			label: 'Templates',
			icon: 'bi-file-earmark-text',
			hint: 'Document & config templates'
		},
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

	// ── Navigation ────────────────────────────────────────────────
	let downloaded = $state(false);

	async function handleFinish() {
		try {
			await downloadSkillZip(skillDraft);
			downloaded = true;
			setTimeout(() => (downloaded = false), 2500);
		} catch (err) {
			console.error(err);
			errorMsg = err instanceof Error ? err.message : 'Failed to generate ZIP download.';
		}
	}
</script>

<svelte:head>
	<title>Directories — ASG</title>
	<meta
		name="description"
		content="Configure optional directories for your skill: scripts, references, and assets."
	/>
</svelte:head>

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="grid items-start gap-12 lg:grid-cols-[1fr_2fr]">
		<!-- Left: title + guidance -->
		<div class="flex flex-col gap-4 pt-2">
			<h1
				style="color: var(--text-primary); font-family: var(--font-display);"
				class="text-3xl font-extrabold tracking-widest uppercase"
			>
				Directories
			</h1>
			<p
				style="color: var(--text-secondary); font-family: var(--font-body);"
				class="text-base leading-relaxed"
			>
				Enable optional directories to bundle executable scripts, reference docs, and static assets
				alongside your skill.
			</p>

			<div
				class="mt-6 flex flex-col gap-5 border-l-2 border-(--accent) p-5"
				style="background: var(--surface-sunken);"
			>
				<h3
					style="color: var(--accent); font-family: var(--font-display);"
					class="flex items-center gap-3 text-xs font-bold tracking-widest uppercase"
				>
					<i class="bi bi-lightbulb"></i>
					Tips
				</h3>
				<div class="flex flex-col gap-4" style="font-family: var(--font-mono);">
					{#each [['01 // scripts/', 'Self-contained executables. Document any external dependencies clearly.'], ['02 // references/', 'Keep files small — agents load them on demand, using context budget.'], ['03 // assets/', 'Static resources only. No executable code; prefer templates and schemas.'], ['04 // All optional', "Skip any directory that doesn't apply. Less is more for context efficiency."]] as [title, tip] (title)}
						<div class="flex flex-col gap-1">
							<span
								style="color: var(--text-primary);"
								class="text-xs font-semibold tracking-widest uppercase">{title}</span
							>
							<span
								style="color: var(--text-secondary);"
								class="text-[11px] leading-relaxed opacity-80">{tip}</span
							>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right: directory cards -->
		<div class="flex w-full flex-col gap-6">
			{#if errorMsg}
				<div
					style="border: 1px solid var(--secondary); background: var(--secondary-subtle); color: var(--secondary); font-family: var(--font-mono); border-radius: 2px;"
					class="p-4 text-sm shadow-sm"
				>
					[Error] {errorMsg}
				</div>
			{/if}

			{#if availableProviders.length > 0}
				<div
					style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px;"
					class="flex flex-col gap-4 p-5 shadow-sm"
				>
					<div>
						<h3
							style="color: var(--text-primary); font-family: var(--font-display);"
							class="text-sm font-semibold tracking-wider uppercase"
						>
							Not sure what to include?
						</h3>
						<p
							style="color: var(--text-secondary); font-family: var(--font-body);"
							class="mt-1 text-sm"
						>
							Let AI suggest the right directories and content for <span
								style="color: var(--accent); font-family: var(--font-mono);"
								>{skillDraft.name || 'Skill'}</span
							>.
						</p>
					</div>
					<div class="flex flex-col items-center gap-3 sm:flex-row">
						<select
							bind:value={selectedProvider}
							style="color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono);"
							class="w-full appearance-none bg-transparent px-3 py-2 text-sm focus:outline-none sm:w-auto"
						>
							{#each availableProviders as provider (provider)}
								<option value={provider}>{provider}</option>
							{/each}
						</select>
						<button
							type="button"
							onclick={handleGenerate}
							disabled={isGenerating}
							style="border: 1px solid var(--accent); color: var(--accent); font-family: var(--font-display); border-radius: 2px;"
							class="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium tracking-wider uppercase transition-colors hover:bg-(--accent-glow) disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
						>
							{#if isGenerating}
								<span class="animate-pulse">Thinking...</span>
							{:else}
								<i class="bi bi-magic" aria-hidden="true"></i> Let AI suggest it
							{/if}
						</button>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<div class="h-px w-full" style="background: var(--border-default)"></div>
					<span
						style="color: var(--text-tertiary); font-family: var(--font-display);"
						class="text-xs font-medium tracking-widest whitespace-nowrap uppercase"
						>OR configure manually</span
					>
					<div class="h-px w-full" style="background: var(--border-default)"></div>
				</div>
			{/if}

			<!-- scripts/ -->
			<div
				class="dir-card flex flex-col gap-0 transition-all"
				style="border: 1px solid {skillDraft.enableScripts
					? 'var(--accent)'
					: 'var(--border-strong)'}; border-radius: 2px; background: var(--surface-sunken);"
			>
				<!-- Header row -->
				<div class="flex items-center justify-between gap-4 p-5">
					<div class="flex items-center gap-3">
						<i class="bi bi-terminal-fill text-lg" style="color: var(--accent);"></i>
						<div class="flex flex-col gap-0.5">
							<span
								style="color: var(--text-primary); font-family: var(--font-mono);"
								class="text-sm font-semibold">scripts/</span
							>
							<span
								style="color: var(--text-secondary); font-family: var(--font-body);"
								class="text-xs leading-relaxed"
							>
								Executable code agents can invoke directly
							</span>
						</div>
					</div>
					<button
						type="button"
						id="toggle-scripts"
						onclick={() => (skillDraft.enableScripts = !skillDraft.enableScripts)}
						class="toggle-pill"
						class:active={skillDraft.enableScripts}
						aria-pressed={skillDraft.enableScripts}
						aria-label="Enable scripts directory"
					>
						<span class="toggle-knob"></span>
					</button>
				</div>

				<!-- Expanded config -->
				{#if skillDraft.enableScripts}
					<div class="flex flex-col gap-4 border-t p-5" style="border-color: var(--border-strong);">
						<p
							style="color: var(--text-secondary); font-family: var(--font-body);"
							class="text-xs leading-relaxed"
						>
							Select the languages your scripts will use. Agents will know what runtimes are
							expected.
						</p>
						<div class="flex flex-wrap gap-2">
							{#each allLanguages as lang (lang.value)}
								<button
									type="button"
									id="lang-{lang.value}"
									onclick={() => toggleLanguage(lang.value)}
									class="chip"
									class:chip-active={skillDraft.scriptLanguages.includes(lang.value)}
								>
									<i class="bi {lang.icon} text-xs"></i>
									{lang.label}
								</button>
							{/each}
						</div>
						{#if skillDraft.scriptLanguages.length === 0}
							<p
								style="color: var(--text-tertiary); font-family: var(--font-mono);"
								class="text-[11px]"
							>
								⚠ Select at least one language.
							</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- references/ -->
			<div
				class="dir-card flex flex-col gap-0 transition-all"
				style="border: 1px solid {skillDraft.enableReferences
					? 'var(--accent)'
					: 'var(--border-strong)'}; border-radius: 2px; background: var(--surface-sunken);"
			>
				<div class="flex items-center justify-between gap-4 p-5">
					<div class="flex items-center gap-3">
						<i class="bi bi-book-fill text-lg" style="color: var(--accent);"></i>
						<div class="flex flex-col gap-0.5">
							<span
								style="color: var(--text-primary); font-family: var(--font-mono);"
								class="text-sm font-semibold">references/</span
							>
							<span
								style="color: var(--text-secondary); font-family: var(--font-body);"
								class="text-xs leading-relaxed"
							>
								Documentation agents load on demand
							</span>
						</div>
					</div>
					<button
						type="button"
						id="toggle-references"
						onclick={() => (skillDraft.enableReferences = !skillDraft.enableReferences)}
						class="toggle-pill"
						class:active={skillDraft.enableReferences}
						aria-pressed={skillDraft.enableReferences}
						aria-label="Enable references directory"
					>
						<span class="toggle-knob"></span>
					</button>
				</div>

				{#if skillDraft.enableReferences}
					<div class="flex flex-col gap-4 border-t p-5" style="border-color: var(--border-strong);">
						<p
							style="color: var(--text-secondary); font-family: var(--font-body);"
							class="text-xs leading-relaxed"
						>
							List the reference files you plan to include. Keep files focused — agents load these
							individually.
						</p>

						{#if skillDraft.refFiles.length > 0}
							<div class="flex flex-col gap-3">
								{#each skillDraft.refFiles as file (file.id)}
									<div class="flex items-center gap-2">
										<i
											class="bi bi-file-earmark-text shrink-0 text-sm"
											style="color: var(--text-tertiary);"
										></i>
										<input
											type="text"
											bind:value={file.name}
											placeholder="filename.md"
											style="background: var(--surface-base); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono);"
											class="w-2/5 p-2 text-xs transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
										/>
										<input
											type="text"
											bind:value={file.description}
											placeholder="Brief description"
											style="background: var(--surface-base); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-body);"
											class="flex-1 p-2 text-xs transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
										/>
										<button
											type="button"
											onclick={() => removeRefFile(file.id)}
											class="flex items-center justify-center rounded-[2px] p-2 text-(--text-tertiary) transition-colors hover:bg-(--surface-base) hover:text-(--secondary) focus:outline-none"
											title="Remove"
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
							style="border: 1px dashed var(--border-strong); color: var(--text-secondary); font-family: var(--font-display); border-radius: 2px;"
							class="flex w-full items-center justify-center gap-2 py-2.5 text-xs font-bold tracking-widest uppercase transition-all hover:border-(--accent) hover:bg-(--surface-base) hover:text-(--accent) focus:outline-none"
						>
							<i class="bi bi-plus-lg"></i> Add Reference File
						</button>

						<!-- Hint about common files -->
						<div class="flex flex-wrap gap-2 pt-1">
							{#each ['REFERENCE.md', 'FORMS.md', 'finance.md', 'legal.md', 'api.md'] as suggestion (suggestion)}
								<button
									type="button"
									onclick={() => {
										if (!skillDraft.refFiles.some((f) => f.name === suggestion)) {
											skillDraft.refFiles = [
												...skillDraft.refFiles,
												{ name: suggestion, description: '', id: skillDraft.nextRefId++ }
											];
										}
									}}
									class="suggestion-pill"
									style="font-family: var(--font-mono);"
								>
									<i class="bi bi-plus text-[10px]"></i>
									{suggestion}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- assets/ -->
			<div
				class="dir-card flex flex-col gap-0 transition-all"
				style="border: 1px solid {skillDraft.enableAssets
					? 'var(--accent)'
					: 'var(--border-strong)'}; border-radius: 2px; background: var(--surface-sunken);"
			>
				<div class="flex items-center justify-between gap-4 p-5">
					<div class="flex items-center gap-3">
						<i class="bi bi-folder2-open text-lg" style="color: var(--accent);"></i>
						<div class="flex flex-col gap-0.5">
							<span
								style="color: var(--text-primary); font-family: var(--font-mono);"
								class="text-sm font-semibold">assets/</span
							>
							<span
								style="color: var(--text-secondary); font-family: var(--font-body);"
								class="text-xs leading-relaxed"
							>
								Static resources: templates, images, data files
							</span>
						</div>
					</div>
					<button
						type="button"
						id="toggle-assets"
						onclick={() => (skillDraft.enableAssets = !skillDraft.enableAssets)}
						class="toggle-pill"
						class:active={skillDraft.enableAssets}
						aria-pressed={skillDraft.enableAssets}
						aria-label="Enable assets directory"
					>
						<span class="toggle-knob"></span>
					</button>
				</div>

				{#if skillDraft.enableAssets}
					<div class="flex flex-col gap-4 border-t p-5" style="border-color: var(--border-strong);">
						<p
							style="color: var(--text-secondary); font-family: var(--font-body);"
							class="text-xs leading-relaxed"
						>
							Choose the types of static assets you'll include.
						</p>
						<div class="flex flex-col gap-3">
							{#each allAssetKinds as kind (kind.value)}
								<button
									type="button"
									id="asset-{kind.value}"
									onclick={() => toggleAsset(kind.value)}
									class="asset-row"
									class:asset-row-active={skillDraft.assetKinds.includes(kind.value)}
								>
									<div class="flex items-center gap-3">
										<i
											class="bi {kind.icon} text-base"
											style="color: {skillDraft.assetKinds.includes(kind.value)
												? 'var(--accent)'
												: 'var(--text-tertiary)'};"
										></i>
										<div class="flex flex-col items-start gap-0.5">
											<span class="asset-label">{kind.label}</span>
											<span class="asset-hint">{kind.hint}</span>
										</div>
									</div>
									<div
										class="check-box"
										class:check-box-active={skillDraft.assetKinds.includes(kind.value)}
									>
										{#if skillDraft.assetKinds.includes(kind.value)}
											<i class="bi bi-check2 text-xs"></i>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="mt-2 flex flex-wrap items-center justify-between gap-4">
				<button
					type="button"
					onclick={() => history.back()}
					class="flex items-center gap-2 px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--surface-sunken) focus:outline-none"
					style="color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: 2px; font-family: var(--font-display);"
				>
					<i class="bi bi-arrow-left" aria-hidden="true"></i> Back
				</button>
				<button
					type="button"
					id="btn-finish"
					onclick={handleFinish}
					class="flex items-center gap-2 bg-(--accent) px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] focus:outline-none"
					style="color: var(--accent-fg); border-radius: 2px; font-family: var(--font-display);"
				>
					{#if downloaded}
						<i class="bi bi-check-lg" aria-hidden="true"></i> Downloaded!
					{:else}
						<i class="bi bi-download" aria-hidden="true"></i> Download ZIP
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* Toggle pill */
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

	/* Language / generic chips */
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 12px;
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
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;
	}
	.chip:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.chip-active {
		border-color: var(--accent) !important;
		color: var(--accent) !important;
		background: var(--accent-glow);
	}

	/* Suggestion pills */
	.suggestion-pill {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 3px 8px;
		border-radius: 2px;
		border: 1px dashed var(--border-default);
		background: transparent;
		color: var(--text-tertiary);
		font-size: 10px;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.suggestion-pill:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	/* Asset kind row */
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
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
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

	/* Checkbox */
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
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}
	.check-box-active {
		background: var(--accent);
		border-color: var(--accent);
	}
</style>
