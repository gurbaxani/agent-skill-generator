<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';

	onMount(() => {
		if (!userState.hasKeys()) {
			goto('/keys');
		}
	});

	let rawName = $state('');

	let validName = $derived(
		rawName
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
			.replace(/\s+/g, '-')         // Replace spaces with hyphens
			.replace(/-+/g, '-')          // Replace consecutive hyphens with a single hyphen
			.replace(/^-+/, '')           // Remove leading hyphens
			.slice(0, 63)                 // Max 63 chars (fewer than 64)
	);
</script>

<div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
	<div class="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-8 shadow-2xl">
		<h1 class="mb-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Create a New Skill</h1>
		<p class="mb-6 text-sm text-[var(--text-secondary)]">Give your agent skill a unique name to get started.</p>

		<div class="mb-6">
			<label for="skillName" class="mb-2 block text-sm font-medium text-[var(--text-primary)]">Skill Name</label>
			<input
				id="skillName"
				type="text"
				bind:value={rawName}
				placeholder="e.g. Code Reviewer"
				class="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
			/>
		</div>

		<div class="mb-8 rounded-lg border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
			<div class="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Generated ID</div>
			<div class="font-mono text-sm text-[var(--accent)] break-all min-h-[1.25rem]">
				{#if validName}
					{validName}
				{:else}
					<span class="opacity-50">your-skill-id</span>
				{/if}
			</div>
		</div>

		<button
			type="button"
			disabled={!validName}
			onclick={() => goto(`/create/description?name=${validName}`)}
			class="w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-fg)] shadow-sm transition-all hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
		>
			Continue
		</button>
	</div>
</div>
