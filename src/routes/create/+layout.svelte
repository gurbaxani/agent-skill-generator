<script lang="ts">
	import { page } from '$app/stores';

	const STEPS = [
		{ index: 1, label: 'Name', segment: '/create', exact: true },
		{ index: 2, label: 'Description', segment: '/create/description', exact: false },
		{ index: 3, label: 'Optional', segment: '/create/optional', exact: false },
		{ index: 4, label: 'Body', segment: '/create/skill', exact: false }
	] as const;

	let currentStep = $derived.by(() => {
		const path = $page.url.pathname;
		if (path === '/create' || path === '/create/') return 1;
		if (path.startsWith('/create/description')) return 2;
		if (path.startsWith('/create/optional')) return 3;
		if (path.startsWith('/create/skill')) return 4;
		return 1;
	});

	let { children } = $props();
</script>

<div class="create-flow">
	<!-- Step tracker -->
	<div class="stepper-wrap" aria-label="Creation progress">
		<div class="stepper">
			{#each STEPS as step (step.index)}
				{@const isDone = currentStep > step.index}
				{@const isActive = currentStep === step.index}
				{@const isFuture = currentStep < step.index}

				<!-- Connector line (before each step except the first) -->
				{#if step.index > 1}
					<div
						class="connector"
						class:connector--done={currentStep >= step.index}
						aria-hidden="true"
					></div>
				{/if}

				<div
					class="step"
					class:step--done={isDone}
					class:step--active={isActive}
					class:step--future={isFuture}
					aria-current={isActive ? 'step' : undefined}
				>
					<div class="step-bubble" aria-hidden="true">
						{#if isDone}
							<i class="bi bi-check-lg"></i>
						{:else}
							<span class="step-num">{step.index}</span>
						{/if}
					</div>
					<span class="step-label">{step.label}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Page content -->
	{@render children()}
</div>

<style>
	.create-flow {
		display: flex;
		flex-direction: column;
		min-height: 100%;
	}

	/* ── Stepper wrap ─────────────────────────────────────────────── */
	.stepper-wrap {
		border-bottom: 1px solid var(--border-default);
		background: var(--surface-raised);
		padding: 0 var(--space-xl);
	}

	.stepper {
		display: flex;
		align-items: center;
		max-width: 56rem;
		margin: 0 auto;
		padding: var(--space-md) 0;
		gap: 0;
	}

	/* ── Connector line ───────────────────────────────────────────── */
	.connector {
		flex: 1;
		height: 1px;
		background: var(--border-strong);
		transition: background var(--duration-normal) var(--ease-out-quart);
		min-width: var(--space-md);
	}

	.connector--done {
		background: var(--accent-dim);
	}

	/* ── Step node ────────────────────────────────────────────────── */
	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	.step-bubble {
		width: 28px;
		height: 28px;
		border-radius: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		transition:
			background var(--duration-normal) var(--ease-out-quart),
			border-color var(--duration-normal) var(--ease-out-quart),
			color var(--duration-normal) var(--ease-out-quart),
			box-shadow var(--duration-normal) var(--ease-out-quart);
	}

	.step-num {
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.step-label {
		font-family: var(--font-display);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-weight: 600;
		transition: color var(--duration-normal) var(--ease-out-quart);
		white-space: nowrap;
	}

	/* Future */
	.step--future .step-bubble {
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-tertiary);
	}
	.step--future .step-label {
		color: var(--text-tertiary);
	}

	/* Active */
	.step--active .step-bubble {
		background: var(--accent);
		border: 1px solid var(--accent);
		color: var(--accent-fg);
		box-shadow: 0 0 12px var(--accent-glow);
	}
	.step--active .step-label {
		color: var(--accent);
	}

	/* Done */
	.step--done .step-bubble {
		background: var(--accent-subtle);
		border: 1px solid var(--accent-dim);
		color: var(--accent-dim);
	}
	.step--done .step-label {
		color: var(--accent-dim);
	}

	/* ── Responsive ───────────────────────────────────────────────── */
	@media (max-width: 480px) {
		.stepper-wrap {
			padding: 0 var(--space-md);
		}

		.step-label {
			display: none;
		}

		.step-bubble {
			width: 24px;
			height: 24px;
		}
	}
</style>
