<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { userState } from '$lib/state/user.svelte';
	import { skillDraft, type ScriptLanguage, type AssetKind } from '$lib/state/draft.svelte';
	import type { Skill } from '$lib/types';
	import { serializeSkill } from '$lib/parse-skill';
	import { marked } from 'marked';
	import type { PageData } from './$types';
	import { githubAuth } from '$lib/state/github-auth.svelte';
	import { publishSkill } from '$lib/github-publish';
	import { env } from '$env/dynamic/public';

	let { data }: { data: PageData } = $props();
	const skills = $derived(data.skills);

	// ── Publish flow states ───────────────────────────────────────────────
	let isPublishing = $state(false);
	let publishUrl = $state('');
	let publishError = $state('');

	function handleGithubLogin() {
		const clientId = env.PUBLIC_GITHUB_CLIENT_ID || 'Ov23lizpwtl9Z3J66Q2E';
		const scope = 'public_repo';
		const redirectUri = window.location.href;
		window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
	}

	async function handlePublish(skill: Skill) {
		if (!githubAuth.token) return;
		isPublishing = true;
		publishError = '';
		publishUrl = '';
		try {
			const url = await publishSkill(skill, githubAuth.token);
			publishUrl = url;
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : String(e);
			publishError = message;
		} finally {
			isPublishing = false;
		}
	}

	// ── Filter & Search State ───────────────────────────────────────────────
	let searchQuery = $state('');
	let selectedTag = $state('all');
	let selectedSkillName = $state(browser ? page.url.searchParams.get('skill') || '' : '');

	function selectSkill(skillName: string) {
		selectedSkillName = skillName;
		if (browser) {
			const url = new URL(page.url);
			url.searchParams.set('skill', skillName);
			goto(url, { replaceState: true, keepFocus: true });
		}
	}

	// ── Notification state ───────────────────────────────────────────────────
	let forkSuccessMessage = $state('');

	// Determine all available tags dynamically
	const allTags = $derived([
		'all',
		...new Set(
			skills.flatMap((s) =>
				s.metadata?.tags
					? s.metadata.tags.split(',').map((t) => t.trim()).filter(Boolean)
					: []
			)
		)
	]);

	// Filtered skills list
	const filteredSkills = $derived.by(() => {
		return skills.filter((skill) => {
			const matchesTag =
				selectedTag === 'all' ||
				(skill.metadata?.tags &&
					skill.metadata.tags
						.split(',')
						.map((t) => t.trim())
						.includes(selectedTag));
			const matchesSearch =
				skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				skill.description.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesTag && matchesSearch;
		});
	});

	// Select current skill based on active selection or first item in filtered list
	const selectedSkill = $derived.by(() => {
		const match = filteredSkills.find((s) => s.name === selectedSkillName);
		if (match) return match;
		return filteredSkills[0] || null;
	});

	const selectedSkillMarkdown = $derived(
		selectedSkill ? serializeSkill(selectedSkill) : ''
	);

	const frontmatterLines = $derived.by(() => {
		if (!selectedSkillMarkdown) return [];
		const lines = selectedSkillMarkdown.split('\n');
		const start = lines.indexOf('---');
		const end = lines.indexOf('---', start + 1);
		if (start === -1 || end === -1) return [];
		return lines.slice(start + 1, end);
	});

	const renderedBody = $derived(
		selectedSkill
			? (marked.parse(selectedSkill.body?.trim() || '_No instructions written yet._') as string)
			: ''
	);

	// Fork and load into draft
	function handleFork(skill: Skill) {
		goto('/create', { state: { prefill: skill } });
	}

	function handleDownload(skill: Skill) {
		try {
			const serialized = serializeSkill(skill);
			const blob = new Blob([serialized], { type: 'text/markdown;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `${skill.name}.md`);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to download skill:', error);
		}
	}
</script>


<svelte:head>
	<title>Browse Skills — ASG</title>
	<meta
		name="description"
		content="Explore community-built agent skills. Fork, modify, and build on existing templates."
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-12 lg:px-6">
	<!-- Toast Message -->
	{#if forkSuccessMessage}
		<div class="toast-overlay" role="alert">
			<div class="toast-content cyber-panel glow-accent">
				<div class="flex items-center gap-3">
					<i class="bi bi-cpu animate-spin text-lg text-(--accent)"></i>
					<span class="font-mono text-sm tracking-wider">{forkSuccessMessage}</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Header Row -->
	<div class="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1
				style="font-family: var(--font-display); color: var(--text-primary);"
				class="text-3xl font-extrabold tracking-widest uppercase"
			>
				Registry
			</h1>
			<p style="font-family: var(--font-body); color: var(--text-secondary);" class="mt-1 text-sm">
				Browse and import pre-configured agent skill templates.
			</p>
		</div>
		<div>
			<a
				href="/create"
				style="background: var(--accent); color: var(--accent-fg); font-family: var(--font-display);"
				class="flex items-center justify-center gap-2 rounded-[2px] px-5 py-2.5 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_12px_var(--accent-glow)]"
			>
				<i class="bi bi-plus-lg"></i> Author New Skill
			</a>
		</div>
	</div>

	<!-- Workspace Grid -->
	<div class="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
		<!-- Left: Filters + List -->
		<div class="flex flex-col gap-6">
			<!-- Search and Tags Filter Pane -->
			<div class="cyber-panel flex flex-col gap-4 p-5">
				<!-- Search -->
				<div class="flex flex-col gap-2">
					<label
						for="search-skills"
						class="font-mono text-[10px] font-bold tracking-wider text-(--text-secondary) uppercase"
					>
						Search Registry
					</label>
					<div class="relative">
						<i
							class="bi bi-search absolute top-1/2 left-3.5 -translate-y-1/2 text-xs text-(--text-tertiary)"
						></i>
						<input
							type="text"
							id="search-skills"
							bind:value={searchQuery}
							placeholder="Search by name, description..."
							style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px; color: var(--text-primary); font-family: var(--font-body);"
							class="w-full py-2.5 pr-4 pl-9 text-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent) focus:outline-none"
						/>
					</div>
				</div>

				<!-- Tag Chips -->
				<div class="flex flex-col gap-2">
					<span
						class="font-mono text-[10px] font-bold tracking-wider text-(--text-secondary) uppercase"
					>
						Filter by Tag
					</span>
					<div class="flex flex-wrap gap-2">
						{#each allTags as tag (tag)}
							<button
								type="button"
								onclick={() => (selectedTag = tag)}
								class="tag-chip"
								class:tag-chip-active={selectedTag === tag}
							>
								{tag}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Skills list -->
			<div class="flex flex-col gap-3">
				{#if filteredSkills.length > 0}
					{#each filteredSkills as skill (skill.name)}
						<button
							type="button"
							onclick={() => selectSkill(skill.name)}
							class="skill-card text-left"
							class:skill-card-active={selectedSkill?.name === skill.name}
							style="background: var(--surface-raised); border: 1px solid {selectedSkill?.name ===
							skill.name
								? 'var(--accent)'
								: 'var(--border-strong)'};"
						>
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span
											class="font-mono text-sm font-semibold tracking-wide text-(--text-primary)"
										>
											{skill.name}
										</span>
										{#each (skill.metadata?.tags ? skill.metadata.tags.split(',').map(t => t.trim()).filter(Boolean) : []) as tag (tag)}
											<span
												class="tag-pill font-mono text-[9px] font-bold uppercase mr-1"
												style="border: 1px solid var(--border-accent); color: var(--accent);"
											>
												{tag}
											</span>
										{/each}
									</div>
									<p
										style="font-family: var(--font-body);"
										class="mt-1 text-xs leading-relaxed text-(--text-secondary)"
									>
										{skill.description}
									</p>
								</div>
								<div
									class="flex shrink-0 flex-col items-end gap-1 font-mono text-[10px] text-(--text-tertiary)"
								>
									<span>by {skill.metadata?.author || ''}</span>
									{#if skill.license}
										<span class="opacity-70">{skill.license}</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				{:else}
					<div class="cyber-panel p-8 text-center" style="background: var(--surface-sunken);">
						<i class="bi bi-inbox text-3xl text-(--text-tertiary)"></i>
						<p class="mt-2 font-mono text-xs text-(--text-secondary)">No community skills found.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Details / Live preview -->
		<div class="sticky-column">
			{#if selectedSkill}
				<div class="flex flex-col gap-4">
					<!-- Preview box -->
					<div class="cyber-panel flex flex-col gap-4 p-5">
						<div class="flex items-center justify-between border-b border-(--border-default) pb-3">
							<div class="flex items-center gap-2">
								<i class="bi bi-file-earmark-medical text-sm text-(--accent)"></i>
								<h2
									class="font-mono text-xs font-bold tracking-widest text-(--text-primary) uppercase"
								>
									Preview: {selectedSkill.name}/SKILL.md
								</h2>
							</div>
							<span class="font-mono text-[10px] text-(--text-tertiary)">
								{selectedSkillMarkdown.split('\n').length} lines
							</span>
						</div>

						<div class="preview-scroll-container">
							<!-- Frontmatter block -->
							<div class="preview-frontmatter">
								<span class="fm-fence">---</span>
								{#each frontmatterLines as fmLine, i (i)}
									{@const colonIdx = fmLine.indexOf(':')}
									{#if colonIdx > -1}
										<div class="fm-row">
											<span class="fm-key">{fmLine.slice(0, colonIdx)}:</span><span class="fm-val"
												>{fmLine.slice(colonIdx + 1)}</span
											>
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

					<!-- Action CTAs -->
					<div class="flex flex-col gap-3">
						<div class="flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								onclick={() => handleDownload(selectedSkill)}
								style="border: 1px solid var(--accent); color: var(--accent); font-family: var(--font-display);"
								class="flex w-full items-center justify-center gap-2 rounded-[2px] py-4 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-glow) focus:outline-none"
							>
								<i class="bi bi-download" aria-hidden="true"></i> Download Skill
							</button>
							<button
								type="button"
								onclick={() => handleFork(selectedSkill)}
								style="background: var(--accent); color: var(--accent-fg); font-family: var(--font-display);"
								class="flex w-full items-center justify-center gap-2 rounded-[2px] py-4 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] focus:outline-none"
							>
								<i class="bi bi-git" aria-hidden="true"></i> Fork & Customize
							</button>
						</div>

						<!-- GitHub Publish Flow -->
						<div class="mt-2 border-t border-(--border-default) pt-4">
							{#if githubAuth.token}
								{#if publishUrl}
									<div class="cyber-panel p-4 text-center" style="background: var(--surface-sunken); border-color: var(--accent);">
										<p class="text-xs text-(--text-primary) font-mono">Skill published successfully!</p>
										<p class="mt-1 font-mono text-[10px] text-(--text-secondary) break-all">{publishUrl}</p>
										<a href={publishUrl} target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-xs text-(--accent) underline hover:text-(--accent-hover)">
											<i class="bi bi-link-45deg"></i> View on GitHub
										</a>
									</div>
								{:else}
									<button
										type="button"
										onclick={() => handlePublish(selectedSkill)}
										disabled={isPublishing}
										style="background: var(--accent); color: var(--accent-fg); font-family: var(--font-display);"
										class="flex w-full items-center justify-center gap-2 rounded-[2px] py-4 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] focus:outline-none disabled:opacity-50"
									>
										{#if isPublishing}
											<i class="bi bi-cpu animate-spin"></i> Publishing...
										{:else}
											<i class="bi bi-cloud-arrow-up"></i> Publish to Registry
										{/if}
									</button>
								{/if}
							{:else}
								<button
									type="button"
									onclick={handleGithubLogin}
									style="border: 1px solid var(--border-strong); color: var(--text-secondary); font-family: var(--font-display);"
									class="flex w-full items-center justify-center gap-2 rounded-[2px] py-4 text-xs font-bold tracking-widest uppercase transition-all hover:border-(--accent) hover:text-(--accent) focus:outline-none"
								>
									<i class="bi bi-github"></i> Login with GitHub to Publish
								</button>
							{/if}
							{#if publishError}
								<p class="mt-2 text-center text-xs font-mono text-(--secondary)">[Error] {publishError}</p>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<div class="cyber-panel p-8 text-center" style="background: var(--surface-sunken);">
					<p class="font-mono text-xs text-(--text-tertiary)">Select a skill to view details.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Tag Chips */
	.tag-chip {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: 2px;
		border: 1px solid var(--border-strong);
		background: transparent;
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.tag-chip:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.tag-chip-active {
		border-color: var(--accent) !important;
		color: var(--accent) !important;
		background: var(--accent-glow);
	}

	/* Skill card list rows */
	.skill-card {
		width: 100%;
		padding: 18px 20px;
		border-radius: 2px;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.skill-card:hover {
		border-color: var(--accent) !important;
		box-shadow: 0 0 12px var(--accent-glow);
	}
	.skill-card-active {
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.tag-pill {
		display: inline-block;
		padding: 1px 6px;
		border-radius: 2px;
		background: var(--accent-subtle);
		letter-spacing: 0.04em;
	}

	/* Sidebar Preview Layout */
	.sticky-column {
		position: sticky;
		top: var(--space-md);
	}

	.preview-scroll-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		max-height: 520px;
		overflow-y: auto;
	}

	/* Cyber panel structures */
	.cyber-panel {
		background: var(--surface-raised);
		backdrop-filter: blur(12px);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		transition: border-color var(--duration-normal) ease;
	}
	.cyber-panel:hover {
		border-color: var(--accent-dim);
	}
	.glow-accent {
		border-color: var(--border-accent);
		box-shadow: 0 0 15px var(--accent-glow);
	}

	/* Preview frontmatter block */
	.preview-frontmatter {
		font-family: var(--font-mono);
		font-size: 0.725rem;
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

	/* Markdown Preview Prose */
	.preview-prose {
		padding: 1.25rem;
		background: var(--surface-sunken);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: 0.825rem;
		line-height: 1.75;
		word-break: break-word;
		overflow-wrap: break-word;
	}

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
	.preview-prose :global(h1) {
		font-size: 1.15rem;
	}
	.preview-prose :global(h2) {
		font-size: 1rem;
		border-bottom: 1px solid var(--border-default);
		padding-bottom: 0.25em;
	}
	.preview-prose :global(h3) {
		font-size: 0.85rem;
		color: var(--accent);
	}

	.preview-prose :global(p) {
		margin-top: 0;
		margin-bottom: 0.85em;
	}

	.preview-prose :global(code) {
		font-family: var(--font-mono);
		font-size: 0.8em;
		background: var(--surface-raised);
		color: var(--accent);
		padding: 0.15em 0.4em;
		border-radius: 3px;
	}

	.preview-prose :global(pre) {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		background: var(--terminal-bg);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		padding: 0.8rem 0.9rem;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
		margin: 0.8em 0;
	}
	.preview-prose :global(pre code) {
		background: none;
		padding: 0;
		color: var(--text-secondary);
		font-size: inherit;
	}

	.preview-prose :global(ul),
	.preview-prose :global(ol) {
		padding-left: 1.4em;
		margin-bottom: 0.85em;
	}
	.preview-prose :global(li) {
		margin-bottom: 0.3em;
	}

	/* Toast overlay styling */
	.toast-overlay {
		position: fixed;
		top: var(--space-xl);
		right: var(--space-xl);
		z-index: 9999;
		animation: slide-in 0.25s var(--ease-out-quart) both;
	}
	.toast-content {
		padding: var(--space-md) var(--space-lg);
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
