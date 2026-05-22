<script lang="ts">
	import '@fontsource/chakra-petch/300.css';
	import '@fontsource/chakra-petch/400.css';
	import '@fontsource/chakra-petch/500.css';
	import '@fontsource/chakra-petch/600.css';
	import '@fontsource/chakra-petch/700.css';
	import '@fontsource/rajdhani/300.css';
	import '@fontsource/rajdhani/400.css';
	import '@fontsource/rajdhani/500.css';
	import '@fontsource/rajdhani/600.css';
	import '@fontsource/rajdhani/700.css';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<header class="top-bar" id="top-bar">
		<a href="/" class="logo-link" aria-label="Agent Skill Generator — Home">
			<span class="logo-glyph" aria-hidden="true">//</span>
			<span class="logo-text">ASG</span>
			<span class="logo-version" aria-hidden="true">v0.1</span>
		</a>

		<nav class="top-bar-actions">
			<a
				href="https://github.com/gurbaxani/agent-skill-generator"
				class="nav-link"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="View source on GitHub"
			>
				<i class="bi bi-github" aria-hidden="true"></i>
				<span class="nav-label">Source</span>
			</a>
			<ThemeToggle />
		</nav>
	</header>

	<main id="main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-xl);
		position: sticky;
		top: 0;
		z-index: 100;
		background-color: var(--surface-base);
		border-bottom: 1px solid var(--border-default);
	}

	.logo-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: var(--text-primary);
	}

	.logo-glyph {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--accent);
		font-weight: 700;
		line-height: 1;
	}

	.logo-text {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: var(--text-lg);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.logo-version {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-tertiary);
		letter-spacing: 0.02em;
		padding: 1px 5px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		line-height: 1.4;
	}

	.top-bar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 32px;
		padding: 0 10px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		background: transparent;
		color: var(--text-secondary);
		font-family: var(--font-display);
		font-size: var(--text-sm);
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-decoration: none;
		transition:
			color var(--duration-fast) var(--ease-out-quart),
			border-color var(--duration-fast) var(--ease-out-quart);
	}

	.nav-link:hover {
		color: var(--accent);
		border-color: var(--border-accent);
	}

	.nav-label {
		font-size: var(--text-xs);
	}

	main {
		flex: 1;
	}

	@media (max-width: 640px) {
		.top-bar {
			padding: var(--space-sm) var(--space-md);
		}

		.nav-label {
			display: none;
		}

		.logo-version {
			display: none;
		}
	}
</style>
