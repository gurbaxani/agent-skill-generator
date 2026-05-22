<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';
	import { marked } from 'marked';

	// ── Params from previous steps ──────────────────────────────────────────
	let skillName = $derived($page.url.searchParams.get('name') || '');
	let description = $derived($page.url.searchParams.get('description') || '');
	let license = $derived($page.url.searchParams.get('license') || '');
	let compatibility = $derived($page.url.searchParams.get('compatibility') || '');
	let allowedTools = $derived($page.url.searchParams.get('allowed-tools') || '');
	let metadataRaw = $derived($page.url.searchParams.get('metadata') || '{}');
	let metadataParsed = $derived.by<Record<string, string>>(() => {
		try {
			return JSON.parse(metadataRaw) as Record<string, string>;
		} catch {
			return {};
		}
	});

	// ── Body state ───────────────────────────────────────────────────────────
	let body = $state('');
	let isGenerating = $state(false);
	let errorMsg = $state('');
	let copied = $state(false);
	let downloaded = $state(false);
	let activeTab = $state<'write' | 'preview'>('write');

	// ── Provider state ───────────────────────────────────────────────────────
	let availableProviders = $derived(Object.keys(userState.keys));
	let selectedProvider = $state('');

	onMount(() => {
		if (!skillName) {
			goto('/create');
			return;
		}
		if (availableProviders.length > 0) {
			selectedProvider = availableProviders[0];
		}
	});

	// ── Assembled SKILL.md ───────────────────────────────────────────────────
	let skillFile = $derived.by(() => {
		const lines: string[] = ['---'];
		lines.push(`name: ${skillName}`);
		if (description) lines.push(`description: "${description.replace(/"/g, '\\"')}"`);
		if (license) lines.push(`license: ${license}`);
		if (compatibility) lines.push(`compatibility: "${compatibility.replace(/"/g, '\\"')}"`);
		if (allowedTools) lines.push(`allowed-tools: ${allowedTools}`);
		const meta = metadataParsed;
		if (Object.keys(meta).length > 0) {
			lines.push('metadata:');
			for (const [k, v] of Object.entries(meta)) {
				lines.push(`  ${k}: ${v}`);
			}
		}
		lines.push('---');
		if (body.trim()) {
			lines.push('');
			lines.push(body.trim());
		}
		return lines.join('\n');
	});

	let isValid = $derived(body.trim().length > 0);

	// ── Markdown preview ─────────────────────────────────────────────────────
	/** Frontmatter lines extracted from the assembled file (between the --- delimiters) */
	let frontmatterLines = $derived.by(() => {
		const lines = skillFile.split('\n');
		const start = lines.indexOf('---');
		const end = lines.indexOf('---', start + 1);
		if (start === -1 || end === -1) return [];
		return lines.slice(start + 1, end);
	});

	/** Rendered HTML of the body markdown */
	let renderedBody = $derived(marked.parse(body.trim() || '_No content written yet._') as string);

	// ── AI generation ────────────────────────────────────────────────────────
	async function handleGenerate() {
		if (!selectedProvider) return;
		const config = userState.keys[selectedProvider];
		isGenerating = true;
		errorMsg = '';
		try {
			const prompt = `You are an expert at writing AI Agent Skill instruction documents.
Write the markdown body content for a SKILL.md file for a skill named "${skillName}".
Description: "${description}"

The body is the skill's instructions — what the agent should do when this skill is active.
It follows the YAML frontmatter and has no format restrictions.

Write a thorough, practical body with these sections:
1. A short overview paragraph explaining the skill's purpose.
2. "## Step-by-step Instructions" – numbered steps the agent must follow.
3. "## Examples" – at least 2 input/output examples in markdown blocks.
4. "## Common Edge Cases" – bullet list of pitfalls and how to handle them.

Use clear, imperative language. Write for an AI agent, not a human user.
Output ONLY the markdown body content. Do NOT include the YAML frontmatter (---).`;

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
						max_tokens: 2048,
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

			body = responseText;
		} catch (err: unknown) {
			console.error(err);
			if (err instanceof Error) {
				errorMsg = err.message;
			} else {
				errorMsg = 'Failed to generate skill body. Please check your API key configuration.';
			}
		} finally {
			isGenerating = false;
		}
	}

	// ── Export actions ───────────────────────────────────────────────────────
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
</script>

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="grid items-start gap-12 lg:grid-cols-[1fr_2fr]">
		<!-- Left: title + tips ------------------------------------------------>
		<div class="flex flex-col gap-4 pt-2">
			<h1
				style="color: var(--text-primary); font-family: var(--font-display);"
				class="text-3xl font-extrabold tracking-widest uppercase"
			>
				Skill Body
			</h1>
			<p style="color: var(--text-secondary); font-family: var(--font-body);" class="text-base leading-relaxed">
				Write the instructions for <span style="color: var(--accent); font-family: var(--font-mono)"
					>{skillName}</span
				>. This becomes the markdown body of your <span style="font-family: var(--font-mono); color: var(--text-primary)">SKILL.md</span>.
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
					{#each [
						['01 // Step-by-step', 'Numbered steps help the agent follow a predictable, auditable flow.'],
						['02 // Examples', 'Show inputs and outputs. Agents learn patterns better from examples than rules.'],
						['03 // Edge cases', 'Anticipate failure modes and ambiguity — what should the agent do when things go wrong?'],
						['04 // Imperative tone', 'Write "Search the repository…" not "The skill searches…". Address the agent directly.']
					] as [title, tip] (title)}
						<div class="flex flex-col gap-1">
							<span
								style="color: var(--text-primary);"
								class="text-xs font-semibold tracking-widest uppercase">{title}</span
							>
							<span style="color: var(--text-secondary);" class="text-[11px] leading-relaxed opacity-80"
								>{tip}</span
							>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right: editor + preview ------------------------------------------->
		<div class="flex w-full flex-col gap-8">
			{#if errorMsg}
				<div
					style="border: 1px solid var(--secondary); background: var(--secondary-subtle); color: var(--secondary); font-family: var(--font-mono); border-radius: 2px;"
					class="p-4 text-sm shadow-sm"
				>
					[Error] {errorMsg}
				</div>
			{/if}

			<!-- AI generate panel -->
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
							Don't want to write it yourself?
						</h3>
						<p
							style="color: var(--text-secondary); font-family: var(--font-body);"
							class="mt-1 text-sm"
						>
							Let AI draft the full skill instructions for you.
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
								<span class="animate-pulse">Writing...</span>
							{:else}
								<i class="bi bi-magic" aria-hidden="true"></i> Let AI write it
							{/if}
						</button>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<div class="h-px w-full" style="background: var(--border-default)"></div>
					<span
						style="color: var(--text-tertiary); font-family: var(--font-display);"
						class="text-xs font-medium tracking-widest uppercase">OR</span
					>
					<div class="h-px w-full" style="background: var(--border-default)"></div>
				</div>
			{/if}

			<!-- Tab bar -->
			<div class="flex flex-col gap-3">
				<div class="flex gap-0" style="border-bottom: 1px solid var(--border-strong);">
					<button
						type="button"
						id="tab-write"
						onclick={() => (activeTab = 'write')}
						style="font-family: var(--font-display); border-radius: 0; border-bottom: 2px solid {activeTab === 'write' ? 'var(--accent)' : 'transparent'}; color: {activeTab === 'write' ? 'var(--accent)' : 'var(--text-tertiary)'};"
						class="px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors hover:text-(--text-primary) focus:outline-none"
					>
						<i class="bi bi-pencil" aria-hidden="true"></i>
						Write
					</button>
					<button
						type="button"
						id="tab-preview"
						onclick={() => (activeTab = 'preview')}
						style="font-family: var(--font-display); border-radius: 0; border-bottom: 2px solid {activeTab === 'preview' ? 'var(--accent)' : 'transparent'}; color: {activeTab === 'preview' ? 'var(--accent)' : 'var(--text-tertiary)'};"
						class="px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors hover:text-(--text-primary) focus:outline-none"
					>
						<i class="bi bi-eye" aria-hidden="true"></i>
						Preview file
					</button>
				</div>

				{#if activeTab === 'write'}
					<div class="flex flex-col gap-2">
						<label
							for="skill-body"
							style="color: var(--text-primary); font-family: var(--font-display);"
							class="text-xs font-bold tracking-widest uppercase"
						>
							{availableProviders.length > 0 ? 'Write it yourself' : 'Skill Instructions'}
						</label>
						<textarea
							id="skill-body"
							bind:value={body}
							placeholder={`## Step-by-step Instructions\n\n1. Read the user's request carefully.\n2. …\n\n## Examples\n\n**Input:** …\n**Output:** …\n\n## Common Edge Cases\n\n- If the user doesn't specify a language, default to English.`}
							rows="18"
							style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono); line-height: 1.65;"
							class="w-full resize-y p-4 text-sm transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
						></textarea>
						<div class="flex items-center justify-between">
							<span
								style="color: var(--text-tertiary); font-family: var(--font-mono);"
								class="text-xs tracking-wider uppercase"
							>
								Markdown supported
							</span>
							<span
								style="color: {body.length > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)'}; font-family: var(--font-mono);"
								class="text-xs tracking-wider uppercase"
							>
								{body.length.toLocaleString()} chars
							</span>
						</div>
					</div>
				{:else}
					<!-- Full assembled SKILL.md preview -->
					<div class="flex flex-col gap-2" id="skill-preview">
						<div class="flex items-center justify-between">
							<span
								style="color: var(--text-primary); font-family: var(--font-display);"
								class="text-xs font-bold tracking-widest uppercase"
							>
								SKILL.md preview
							</span>
							<span
								style="color: var(--text-tertiary); font-family: var(--font-mono);"
								class="text-xs tracking-wider uppercase"
							>
								{skillFile.split('\n').length} lines
							</span>
						</div>

						<!-- Frontmatter block -->
						<div class="preview-frontmatter">
							<span class="fm-fence">---</span>
							{#each frontmatterLines as fmLine (fmLine)}
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
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex flex-wrap items-center justify-between gap-4">
				<button
					type="button"
					onclick={() => history.back()}
					class="flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--surface-sunken) focus:outline-none"
					style="color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: 2px; font-family: var(--font-display);"
				>
					<i class="bi bi-arrow-left" aria-hidden="true"></i> Back
				</button>

				<div class="flex items-center gap-3">
					<!-- Copy button -->
					<button
						type="button"
						id="btn-copy"
						onclick={handleCopy}
						disabled={!isValid}
						style="border: 1px solid var(--border-strong); color: {copied ? 'var(--accent)' : 'var(--text-secondary)'}; font-family: var(--font-display); border-radius: 2px; {copied ? 'border-color: var(--accent);' : ''}"
						class="flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:border-(--accent) hover:text-(--accent) disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none"
					>
						{#if copied}
							<i class="bi bi-check-lg" aria-hidden="true"></i> Copied!
						{:else}
							<i class="bi bi-clipboard" aria-hidden="true"></i> Copy
						{/if}
					</button>

					<!-- Download button -->
					<button
						type="button"
						id="btn-download"
						onclick={handleDownload}
						disabled={!isValid}
						class="flex items-center gap-2 bg-(--accent) px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus:outline-none"
						style="color: var(--accent-fg); border-radius: 2px; font-family: var(--font-display);"
					>
						{#if downloaded}
							<i class="bi bi-check-lg" aria-hidden="true"></i> Downloaded!
						{:else}
							<i class="bi bi-download" aria-hidden="true"></i> Download SKILL.md
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* ── Frontmatter block ───────────────────────────────────────────────── */
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
		overflow-x: hidden;
		word-break: break-word;
		overflow-wrap: break-word;
	}

	.fm-fence {
		color: var(--terminal-comment, oklch(60% 0.05 270));
		font-style: italic;
	}

	.fm-row {
		display: flex;
		gap: 0;
		flex-wrap: wrap;
	}

	.fm-key {
		color: var(--terminal-keyword, oklch(70% 0.18 270));
		min-width: 0;
	}

	.fm-val {
		color: var(--terminal-text, var(--text-secondary));
		white-space: pre-wrap;
	}

	.fm-indent {
		color: var(--terminal-string, var(--text-secondary));
		padding-left: 1.25rem;
	}

	/* ── Markdown prose body ─────────────────────────────────────────────── */
	.preview-prose {
		padding: 1.25rem 1.25rem 1.5rem;
		background: var(--surface-sunken);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: 0.875rem;
		line-height: 1.75;
		max-height: 480px;
		overflow-x: hidden;
		overflow-y: auto;
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

	/* Paragraphs */
	.preview-prose :global(p) {
		margin-top: 0;
		margin-bottom: 0.85em;
	}

	/* Inline code */
	.preview-prose :global(code) {
		font-family: var(--font-mono);
		font-size: 0.8em;
		background: var(--surface-raised, oklch(20% 0.02 270 / 0.6));
		color: var(--accent);
		padding: 0.15em 0.4em;
		border-radius: 3px;
	}

	/* Code blocks */
	.preview-prose :global(pre) {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		background: oklch(12% 0.02 270 / 0.8);
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

	/* Blockquote */
	.preview-prose :global(blockquote) {
		border-left: 3px solid var(--accent);
		margin: 0.85em 0;
		padding: 0.4em 1em;
		color: var(--text-tertiary);
		font-style: italic;
		background: oklch(20% 0.02 270 / 0.3);
	}

	/* Horizontal rule */
	.preview-prose :global(hr) {
		border: none;
		border-top: 1px solid var(--border-strong);
		margin: 1.25em 0;
	}

	/* Strong / em */
	.preview-prose :global(strong) {
		color: var(--text-primary);
		font-weight: 700;
	}

	.preview-prose :global(em) {
		color: var(--text-tertiary);
	}
</style>
