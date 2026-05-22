<script lang="ts">
	import { page } from '$app/stores';
	import { userState } from '$lib/state/user.svelte';
	import { goto } from '$app/navigation';

	const STEPS = [
		{ index: 1, label: 'Required', segment: '/create/required', exact: false },
		{ index: 2, label: 'Optional', segment: '/create/optional', exact: false },
		{ index: 3, label: 'Body', segment: '/create/skill', exact: false },
		{ index: 4, label: 'Directories', segment: '/create/directories', exact: false }
	] as const;

	let currentStep = $derived.by(() => {
		const path = $page.url.pathname;
		if (path.startsWith('/create/required')) return 1;
		if (path.startsWith('/create/optional')) return 2;
		if (path.startsWith('/create/skill')) return 3;
		if (path.startsWith('/create/directories')) return 4;
		return 1;
	});

	let isExpert = $derived($page.url.pathname.startsWith('/create/expert'));

	function handleToggleExpert(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = target.checked;
		userState.setExpertMode(val);
		if (val) {
			goto('/create/expert');
		} else {
			goto('/create/required');
		}
	}

	let { children } = $props();
</script>

<div class="create-flow">
	<!-- Step tracker -->
	<div class="stepper-wrap" aria-label="Creation progress">
		<div class="stepper-header">
			{#if isExpert}
				<div class="expert-badge">
					<i class="bi bi-cpu" aria-hidden="true"></i>
					<span>Expert Mode — Single Form</span>
				</div>
			{:else}
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
			{/if}

			<div class="toggle-container">
				<span class="toggle-label">Expert Mode</span>
				<label class="switch" for="expert-toggle">
					<input
						type="checkbox"
						id="expert-toggle"
						checked={isExpert}
						onchange={handleToggleExpert}
					/>
					<span class="slider"></span>
				</label>
			</div>
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

	.stepper-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 56rem;
		margin: 0 auto;
		gap: var(--space-lg);
	}

	.stepper {
		display: flex;
		align-items: center;
		flex: 1;
		padding: var(--space-md) 0;
		gap: 0;
	}

	.expert-badge {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--accent-subtle);
		border: 1px solid var(--border-accent);
		border-radius: 2px;
		color: var(--accent);
		font-family: var(--font-display);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin: var(--space-md) 0;
	}

	.toggle-container {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin: var(--space-md) 0;
	}

	.toggle-label {
		font-family: var(--font-display);
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-secondary);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 20px;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		inset: 0;
		background-color: var(--border-strong);
		transition: 0.2s var(--ease-out-quart);
		border: 1px solid var(--border-default);
		border-radius: 2px;
	}

	.slider::before {
		position: absolute;
		content: '';
		height: 12px;
		width: 12px;
		left: 3px;
		bottom: 3px;
		background-color: var(--text-tertiary);
		transition: 0.2s var(--ease-out-quart);
		border-radius: 1px;
	}

	input:checked + .slider {
		background-color: var(--accent-subtle);
		border-color: var(--accent);
	}

	input:checked + .slider::before {
		transform: translateX(20px);
		background-color: var(--accent);
		box-shadow: 0 0 8px var(--accent-glow);
	}

	input:focus-visible + .slider {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
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
