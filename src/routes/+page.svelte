<script lang="ts">
	import SkillPreview from '$lib/components/SkillPreview.svelte';
	import CatalogEntry from '$lib/components/CatalogEntry.svelte';

	interface CatalogSkill {
		name: string;
		description: string;
		author: string;
		tag: string;
	}

	const CATALOG_SKILLS: ReadonlyArray<CatalogSkill> = [
		{
			name: 'code-reviewer',
			description: 'Reviews pull requests for style, bugs, and performance issues',
			author: '@mchen',
			tag: 'dev'
		},
		{
			name: 'api-documenter',
			description: 'Generates OpenAPI specs from source code and inline comments',
			author: '@jpark',
			tag: 'docs'
		},
		{
			name: 'test-writer',
			description: 'Creates unit and integration tests with edge case coverage',
			author: '@sluna',
			tag: 'test'
		},
		{
			name: 'commit-crafter',
			description: 'Writes conventional commit messages from staged diffs',
			author: '@aroy',
			tag: 'git'
		},
		{
			name: 'sql-optimizer',
			description: 'Analyzes queries and suggests index, join, and schema improvements',
			author: '@kzhang',
			tag: 'data'
		},
		{
			name: 'a11y-auditor',
			description: 'Checks components against WCAG 2.2 and suggests ARIA fixes',
			author: '@tlee',
			tag: 'a11y'
		},
		{
			name: 'refactor-guide',
			description: 'Identifies code smells and proposes incremental refactoring steps',
			author: '@npatel',
			tag: 'dev'
		},
		{
			name: 'changelog-gen',
			description: 'Builds changelogs from commit history using keep-a-changelog format',
			author: '@mchen',
			tag: 'ops'
		}
	];

	interface ValueProp {
		icon: string;
		label: string;
		heading: string;
		body: string;
	}

	const VALUE_PROPS: ReadonlyArray<ValueProp> = [
		{
			icon: 'bi-shield-lock',
			label: '01',
			heading: 'No accounts. No cloud.',
			body: 'Your skills stay on your machine. API keys never leave your browser.'
		},
		{
			icon: 'bi-key',
			label: '02',
			heading: 'Any AI provider.',
			body: 'OpenAI, Anthropic, Google, Ollama — plug in whatever key you have.'
		},
		{
			icon: 'bi-arrow-repeat',
			label: '03',
			heading: 'Fork anything.',
			body: 'Every community skill is a starting point. Remix, combine, ship.'
		}
	];
</script>

<svelte:head>
	<title>ASG — Agent Skill Generator</title>
	<meta
		name="description"
		content="Free, open-source tool for creating structured AI agent skills. No accounts, no cloud — bring your own API key and start building."
	/>
</svelte:head>

<!-- ═══ HERO ═══ -->
<section class="hero" id="hero" aria-labelledby="hero-heading">
	<div class="hero-grid">
		<div class="hero-text">
			<div class="hero-badge" aria-hidden="true">
				<span class="badge-dot"></span>
				<span class="badge-label">Open Source · MIT Licensed</span>
			</div>
			<h1 id="hero-heading" class="hero-heading">
				Build skills<br />for your<br /><span class="hero-accent">AI agents</span>
			</h1>
			<p class="hero-sub">
				Author, browse, and remix structured agent skills.
				Runs entirely in your browser. Bring your own API key.
			</p>
			<div class="hero-actions">
				<a href="/create" class="btn btn-primary" id="cta-create">
					<i class="bi bi-terminal" aria-hidden="true"></i>
					Create Skill
				</a>
				<a href="/browse" class="btn btn-outline" id="cta-browse">
					Browse Registry
				</a>
			</div>
		</div>
		<div class="hero-terminal">
			<SkillPreview />
		</div>
	</div>
	<div class="hero-stats" aria-label="Key facts">
		<div class="stat">
			<span class="stat-value">0</span>
			<span class="stat-label">Accounts Needed</span>
		</div>
		<div class="stat-divider" aria-hidden="true"></div>
		<div class="stat">
			<span class="stat-value">100%</span>
			<span class="stat-label">Local Processing</span>
		</div>
		<div class="stat-divider" aria-hidden="true"></div>
		<div class="stat">
			<span class="stat-value">MIT</span>
			<span class="stat-label">Licensed</span>
		</div>
		<div class="stat-divider" aria-hidden="true"></div>
		<div class="stat">
			<span class="stat-value">BYOK</span>
			<span class="stat-label">Bring Your Key</span>
		</div>
	</div>
</section>

<!-- ═══ VALUE PROPS ═══ -->
<section class="features" id="values" aria-labelledby="values-heading">
	<h2 id="values-heading" class="section-label">
		<span class="label-line" aria-hidden="true"></span>
		How it works
		<span class="label-line" aria-hidden="true"></span>
	</h2>
	<div class="feature-grid">
		{#each VALUE_PROPS as prop, i (prop.heading)}
			<div class="feature" style="--stagger: {i}">
				<div class="feature-head">
					<span class="feature-num" aria-hidden="true">{prop.label}</span>
					<i class="bi {prop.icon} feature-icon" aria-hidden="true"></i>
				</div>
				<h3 class="feature-heading">{prop.heading}</h3>
				<p class="feature-body">{prop.body}</p>
			</div>
		{/each}
	</div>
</section>

<!-- ═══ CATALOG ═══ -->
<section class="catalog" id="catalog" aria-labelledby="catalog-heading">
	<div class="catalog-header">
		<h2 id="catalog-heading" class="section-label">
			<span class="label-line" aria-hidden="true"></span>
			Skill Registry
			<span class="label-line" aria-hidden="true"></span>
		</h2>
		<a href="/browse" class="registry-link">
			Browse all
			<i class="bi bi-arrow-right" aria-hidden="true"></i>
		</a>
	</div>
	<div class="catalog-list">
		{#each CATALOG_SKILLS as skill (skill.name)}
			<CatalogEntry
				name={skill.name}
				description={skill.description}
				author={skill.author}
				tag={skill.tag}
			/>
		{/each}
	</div>
</section>

<!-- ═══ FOOTER ═══ -->
<footer class="site-footer" id="footer">
	<div class="footer-inner">
		<div class="footer-links">
			<span class="footer-text">&copy; {new Date().getFullYear()} KH Systems Private Limited</span>
			<span class="footer-sep" aria-hidden="true">·</span>
			<span class="footer-text">MIT License</span>
		</div>
		<div class="footer-links">
			<a
				href="https://github.com/gurbaxani/agent-skill-generator"
				target="_blank"
				rel="noopener noreferrer"
				class="footer-link"
			>
				GitHub
			</a>
			<span class="footer-sep" aria-hidden="true">/</span>
			<a href="/contact" class="footer-link">Contact</a>
		</div>
	</div>
</footer>

<style>
	/* ─── Utilities ─── */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* ─── HERO ─── */
	.hero {
		padding: var(--space-3xl) var(--space-xl) var(--space-2xl);
	}

	.hero-grid {
		max-width: 1120px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: var(--space-3xl);
		align-items: center;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
		padding: var(--space-xs) 12px;
		border: 1px solid var(--border-accent);
		border-radius: var(--radius);
		background: var(--accent-subtle);
	}

	.badge-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 6px var(--accent-glow);
		animation: pulse-dot 2s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.badge-label {
		font-family: var(--font-display);
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--accent-dim);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.hero-heading {
		font-size: clamp(2.25rem, 5vw + 1.25rem, 3.5rem);
		line-height: var(--leading-2xl);
		font-weight: 700;
		letter-spacing: 0.04em;
	}

	.hero-accent {
		color: var(--accent);
		text-shadow: 0 0 30px var(--accent-glow);
	}

	.hero-sub {
		margin-top: var(--space-lg);
		font-size: var(--text-lg);
		line-height: var(--leading-base);
		color: var(--text-secondary);
		max-width: 42ch;
		font-weight: 500;
	}

	.hero-actions {
		margin-top: var(--space-xl);
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	/* ─── Buttons ─── */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 12px 24px;
		border-radius: var(--radius);
		font-family: var(--font-display);
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-decoration: none;
		cursor: pointer;
		border: none;
		transition:
			background-color var(--duration-fast) var(--ease-out-quart),
			color var(--duration-fast) var(--ease-out-quart),
			box-shadow var(--duration-fast) var(--ease-out-quart),
			border-color var(--duration-fast) var(--ease-out-quart),
			transform var(--duration-fast) var(--ease-out-quart);
	}

	.btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.btn-primary {
		background: var(--accent);
		color: var(--accent-fg);
		box-shadow: 0 0 16px var(--accent-glow);
	}

	.btn-primary:hover {
		background: var(--accent-hover);
		box-shadow: 0 0 24px var(--accent-glow), 0 0 48px var(--accent-glow);
		color: var(--accent-fg);
	}

	.btn-outline {
		background: transparent;
		color: var(--text-primary);
		border: 1px solid var(--border-strong);
	}

	.btn-outline:hover {
		border-color: var(--accent);
		color: var(--accent);
		box-shadow: 0 0 12px var(--accent-glow);
		text-shadow: 0 0 8px var(--accent-glow);
	}

	/* ─── Hero Stats ─── */
	.hero-stats {
		max-width: 1120px;
		margin: var(--space-3xl) auto 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xl);
		padding: var(--space-lg) var(--space-xl);
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		background: var(--surface-raised);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		transition: transform var(--duration-fast) var(--ease-out-quart);
	}

	.stat:hover {
		transform: translateY(-2px);
	}

	.stat-value {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 700;
		color: var(--accent);
		letter-spacing: 0.04em;
		font-variant-numeric: tabular-nums;
		transition:
			color var(--duration-fast) var(--ease-out-quart),
			text-shadow var(--duration-fast) var(--ease-out-quart);
	}

	.stat:hover .stat-value {
		color: var(--accent-hover);
		text-shadow: 0 0 12px var(--accent-glow);
	}

	.stat-label {
		font-family: var(--font-display);
		font-size: 0.65rem;
		color: var(--text-tertiary);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.stat-divider {
		width: 1px;
		height: 32px;
		background: var(--border-default);
	}

	/* ─── Hero Terminal ─── */
	.hero-terminal {
		display: flex;
		justify-content: flex-end;
	}

	/* ─── Section Labels ─── */
	.section-label {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		color: var(--text-tertiary);
		text-transform: uppercase;
		margin-bottom: var(--space-2xl);
	}

	.label-line {
		flex: 1;
		height: 1px;
		background: var(--border-default);
	}

	/* ─── Features ─── */
	.features {
		padding: var(--space-3xl) var(--space-xl);
	}

	.feature-grid {
		max-width: 1120px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
	}

	.feature {
		padding: var(--space-lg);
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		background: var(--surface-raised);
		transition:
			border-color var(--duration-fast) var(--ease-out-quart),
			box-shadow var(--duration-fast) var(--ease-out-quart),
			transform var(--duration-fast) var(--ease-out-quart);
	}

	.feature:hover {
		border-color: var(--border-accent);
		box-shadow: 0 0 24px var(--accent-glow);
		transform: translateY(-2px);
	}

	.feature-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.feature-num {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--accent-dim);
		letter-spacing: 0.05em;
	}

	.feature-icon {
		font-size: var(--text-lg);
		color: var(--accent);
		transition:
			color var(--duration-fast) var(--ease-out-quart),
			transform var(--duration-fast) var(--ease-out-quart);
	}

	.feature:hover .feature-icon {
		color: var(--accent-hover);
		transform: scale(1.1);
	}

	.feature-heading {
		font-size: var(--text-lg);
		font-weight: 600;
		letter-spacing: 0.04em;
		margin-bottom: var(--space-sm);
	}

	.feature-body {
		font-size: var(--text-sm);
		line-height: var(--leading-base);
		color: var(--text-secondary);
		max-width: 36ch;
	}

	/* ─── Catalog ─── */
	.catalog {
		padding: var(--space-2xl) var(--space-xl) var(--space-3xl);
	}

	.catalog-header {
		max-width: 1120px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.catalog-header .section-label {
		flex: 1;
		margin-bottom: 0;
	}

	.registry-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-family: var(--font-display);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		flex-shrink: 0;
		color: var(--text-secondary);
		transition:
			color var(--duration-fast) var(--ease-out-quart),
			text-shadow var(--duration-fast) var(--ease-out-quart);
	}

	.registry-link:hover {
		color: var(--accent);
		text-shadow: 0 0 8px var(--accent-glow);
	}

	.catalog-list {
		max-width: 1120px;
		margin: 0 auto;
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		background: var(--surface-raised);
		padding: var(--space-xs) 0;
	}

	/* ─── Footer ─── */
	.site-footer {
		padding: var(--space-xl) var(--space-xl);
		border-top: 1px solid var(--border-default);
	}

	.footer-inner {
		max-width: 1120px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-display);
		font-size: var(--text-xs);
		color: var(--text-tertiary);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.footer-links {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.footer-link {
		color: var(--text-tertiary);
	}

	.footer-link:hover {
		color: var(--accent);
	}

	.footer-sep {
		color: var(--border-strong);
		user-select: none;
	}

	/* ─── Entrance Animations ─── */
	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes glow-in {
		from {
			opacity: 0;
			filter: brightness(1.5);
		}
		to {
			opacity: 1;
			filter: brightness(1);
		}
	}

	.hero-text {
		animation: fade-in-up var(--duration-entrance) var(--ease-out-expo) both;
	}

	.hero-terminal {
		animation: glow-in var(--duration-entrance) var(--ease-out-quart) 150ms both;
	}

	.hero-stats {
		animation: fade-in-up var(--duration-entrance) var(--ease-out-quart) 300ms both;
	}

	.feature {
		animation: fade-in-up var(--duration-entrance) var(--ease-out-quart) both;
		animation-delay: calc(350ms + var(--stagger, 0) * 80ms);
	}

	.catalog {
		animation: fade-in-up var(--duration-entrance) var(--ease-out-quart) 650ms both;
	}

	/* ─── Responsive ─── */
	@media (max-width: 900px) {
		.hero-grid {
			grid-template-columns: 1fr;
			gap: var(--space-2xl);
		}

		.hero-terminal {
			justify-content: center;
		}

		.hero-stats {
			flex-wrap: wrap;
			gap: var(--space-lg);
		}

		.stat-divider {
			display: none;
		}

		.feature-grid {
			grid-template-columns: 1fr;
			gap: var(--space-md);
		}
	}

	@media (max-width: 640px) {
		.hero {
			padding: var(--space-2xl) var(--space-md) var(--space-xl);
		}

		.hero-sub {
			font-size: var(--text-base);
		}

		.hero-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.btn {
			justify-content: center;
		}

		.hero-stats {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-md);
			padding: var(--space-md);
		}

		.features,
		.catalog {
			padding-left: var(--space-md);
			padding-right: var(--space-md);
		}

		.footer-inner {
			flex-direction: column;
			gap: var(--space-sm);
			text-align: center;
		}
	}
</style>