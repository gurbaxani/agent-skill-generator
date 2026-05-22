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

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="grid items-start gap-12 lg:grid-cols-[1fr_2fr]">
		
		<div class="flex flex-col gap-4 pt-2">
			<h1 style="color: var(--text-primary);" class="text-3xl font-bold tracking-tight">
				Create a New Skill
			</h1>
			<p style="color: var(--text-secondary);" class="text-base">
				Give your agent skill a unique name to get started.
			</p>
		</div>

		<div class="flex w-full flex-col gap-8">
			
			<div class="flex flex-col gap-3">
				<label for="skillName" style="color: var(--text-primary);" class="text-sm font-medium">
					Skill Name
				</label>
				
				<input
					id="skillName"
					type="text"
					bind:value={rawName}
					placeholder="e.g. Code Reviewer"
					style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong);"
					class="w-full rounded p-3 text-base transition-colors focus:border-(--accent) focus:outline-none focus:ring-1 focus:ring-(--focus-ring) placeholder:text-(--text-tertiary)"
				/>

				<div style="background: var(--surface-base); border: 1px solid var(--border-default)" class="mt-2 rounded p-4">
					<div style="color: var(--text-tertiary);" class="mb-1 text-xs font-medium uppercase tracking-wider">
						Generated ID
					</div>
					<div style="color: var(--accent); font-family: var(--font-mono)" class="break-all text-sm min-h-5">
						{#if validName}
							{validName}
						{:else}
							<span style="opacity: 0.5">your-skill-id</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="flex justify-end">
				<button
					type="button"
					disabled={!validName}
					onclick={() => goto(`/create/description?name=${validName}`)}
					class="rounded bg-(--accent) px-6 py-3 text-sm font-semibold text-(--surface-base) transition-colors hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-50"
				>
					Continue
				</button>
			</div>
			
		</div>
	</div>
</div>
