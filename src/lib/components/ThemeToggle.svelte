<script lang="ts">
	type Theme = 'light' | 'dark' | 'system';

	const THEMES: Theme[] = ['light', 'dark', 'system'];
	const LABELS: Record<Theme, string> = {
		light: 'Light',
		dark: 'Dark',
		system: 'System'
	};
	const ICONS: Record<Theme, string> = {
		light: 'bi-sun-fill',
		dark: 'bi-moon-stars-fill',
		system: 'bi-circle-half'
	};

	let currentTheme: Theme = $state('system');

	function cycleTheme() {
		const idx = THEMES.indexOf(currentTheme);
		currentTheme = THEMES[(idx + 1) % THEMES.length];
		applyTheme(currentTheme);
	}

	function applyTheme(theme: Theme) {
		const root = document.documentElement;
		if (theme === 'system') {
			root.removeAttribute('data-theme');
		} else {
			root.setAttribute('data-theme', theme);
		}
		try {
			localStorage.setItem('asg-theme', theme);
		} catch {
			// Storage unavailable
		}
	}

	function loadSavedTheme() {
		try {
			const saved = localStorage.getItem('asg-theme') as Theme | null;
			if (saved && THEMES.includes(saved)) {
				currentTheme = saved;
				applyTheme(saved);
			}
		} catch {
			// Storage unavailable
		}
	}

	if (typeof window !== 'undefined') {
		loadSavedTheme();
	}
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={cycleTheme}
	aria-label="Switch theme to {LABELS[THEMES[(THEMES.indexOf(currentTheme) + 1) % THEMES.length]]}"
	title="{LABELS[currentTheme]} theme"
>
	<i class="bi {ICONS[currentTheme]}" aria-hidden="true"></i>
</button>

<style>
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			color var(--duration-fast) var(--ease-out-quart),
			border-color var(--duration-fast) var(--ease-out-quart),
			box-shadow var(--duration-fast) var(--ease-out-quart);
		font-size: 0.85rem;
	}

	.theme-toggle i {
		transition: transform var(--duration-normal) var(--ease-out-quart);
	}

	.theme-toggle:hover {
		color: var(--accent);
		border-color: var(--border-accent);
		box-shadow: 0 0 8px var(--accent-glow);
	}

	.theme-toggle:hover i {
		transform: scale(1.15) rotate(15deg);
	}

	.theme-toggle:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
		color: var(--accent);
		border-color: var(--border-accent);
		box-shadow: 0 0 8px var(--accent-glow);
	}
</style>
