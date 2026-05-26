<script lang="ts">
	// Product Hunt launch URL
	const href =
		'https://www.producthunt.com/products/agent-skill-generator?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-agent-skill-generator';
</script>

<a
	{href}
	target="_blank"
	rel="noopener noreferrer"
	class="ph-badge-official"
	aria-label="Agent Skill Generator on Product Hunt"
>
	<!-- Dark theme badge for dark mode -->
	<img
		alt="Agent Skill Generator - The skill layer your AI agents are missing | Product Hunt"
		width="250"
		height="54"
		src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1153124&theme=dark&t=1779780603087"
		class="ph-img-dark"
	/>
	<!-- Light theme badge for light mode -->
	<img
		alt="Agent Skill Generator - The skill layer your AI agents are missing | Product Hunt"
		width="250"
		height="54"
		src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1153124&theme=light&t=1779780603087"
		class="ph-img-light"
	/>
</a>

<style>
	.ph-badge-official {
		display: inline-flex;
		align-items: center;
		width: 250px;
		height: 54px;
		box-sizing: border-box;
		overflow: hidden;
		transition: transform var(--duration-fast) var(--ease-out-quart);
	}

	.ph-badge-official:hover {
		transform: translateY(-1px);
	}

	.ph-badge-official img {
		display: block;
		border-radius: var(--radius);
	}

	/* Default: show dark image (as the site is dark-first) */
	.ph-img-dark {
		display: block;
	}
	.ph-img-light {
		display: none;
	}

	/* Light mode theme selector detection */
	:global(html[data-theme='light']) .ph-img-dark {
		display: none;
	}
	:global(html[data-theme='light']) .ph-img-light {
		display: block;
	}

	/* System-preference light mode detection (when data-theme is not explicitly set to dark) */
	@media (prefers-color-scheme: light) {
		:global(html:not([data-theme='dark'])) .ph-img-dark {
			display: none;
		}
		:global(html:not([data-theme='dark'])) .ph-img-light {
			display: block;
		}
	}
</style>
