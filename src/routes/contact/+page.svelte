<script lang="ts">
import { onMount } from "svelte";
let email = $state("");

onMount(() => {
	const handle = "asg";
	const domain = "ashwinig.com";
	email = `${handle}@${domain}`;
});
</script>

<div class="contact-container">
	<div class="terminal-card">
		<div class="terminal-header">
			<span class="index">01</span>
			<h1 class="title">CONTACT</h1>
			<span class="status-indicator" aria-hidden="true"></span>
		</div>

		<div class="terminal-body">
			<div class="terminal-line">
				<span class="prompt-arrow" aria-hidden="true">&gt;</span>
				<span class="label">Email:</span>
				{#if email}
					<a href="mailto:{email}" class="value email-link">{email}</a>
				{:else}
					<span class="value loading">Loading...</span>
				{/if}
				<span class="cursor" aria-hidden="true"></span>
			</div>
		</div>
	</div>
</div>

<style>
	.contact-container {
		padding: var(--space-xl);
		display: flex;
		justify-content: center;
		align-items: flex-start;
		min-height: calc(100vh - 100px);
	}

	.terminal-card {
		background: var(--surface-raised);
		border: 1px solid var(--border-default);
		border-radius: var(--radius, 2px);
		width: 100%;
		max-width: 600px;
		position: relative;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		margin-top: var(--space-xl);
	}

	/* Scanline effect */
	.terminal-card::after {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: repeating-linear-gradient(
			to bottom,
			transparent,
			transparent 2px,
			rgba(0, 0, 0, 0.05) 3px,
			rgba(0, 0, 0, 0.05) 4px
		);
		pointer-events: none;
		z-index: 10;
	}

	.terminal-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--border-default);
		background: var(--surface-base);
	}

	.index {
		font-family: var(--font-mono);
		color: var(--text-tertiary);
		font-size: var(--text-xs);
	}

	.title {
		font-family: var(--font-display);
		font-size: var(--text-sm);
		letter-spacing: 0.1em;
		color: var(--text-secondary);
		margin: 0;
		flex: 1;
		text-transform: uppercase;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		background: var(--accent);
		border-radius: 50%;
		box-shadow: 0 0 8px var(--accent);
		animation: pulse 2s infinite;
	}

	.terminal-body {
		padding: var(--space-xl) var(--space-md);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.terminal-line {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		line-height: 1.5;
	}

	.prompt-arrow {
		color: var(--accent);
		font-weight: 700;
	}

	.label {
		color: var(--text-secondary);
		min-width: 80px;
	}

	.value {
		color: var(--text-primary);
		word-break: break-all;
	}

	.email-link {
		color: var(--accent);
		text-decoration: none;
		position: relative;
		transition: text-shadow var(--duration-fast) var(--ease-out-quart, ease);
	}

	.email-link:hover {
		text-shadow: 0 0 8px var(--accent);
	}

	.email-link::after {
		content: "";
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 100%;
		height: 1px;
		background: var(--accent);
		transform: scaleX(0);
		transform-origin: right;
		transition: transform var(--duration-fast) var(--ease-out-quart, ease);
	}

	.email-link:hover::after {
		transform: scaleX(1);
		transform-origin: left;
	}

	.loading {
		color: var(--text-tertiary);
		animation: blink 1s step-end infinite;
	}

	.cursor {
		display: inline-block;
		width: 8px;
		height: 1.2em;
		background: var(--accent);
		vertical-align: middle;
		animation: blink 1s step-end infinite;
		margin-left: 2px;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--accent); }
		50% { opacity: 0.5; box-shadow: 0 0 2px var(--accent); }
	}
</style>
