<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';

	onMount(() => {
		// Removed forceful redirect to allow keyless users to reach this page
	});

	let rawName = $state('');

	let validName = $derived(
		rawName
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/-+/g, '-') // Replace consecutive hyphens with a single hyphen
			.replace(/^-+/, '') // Remove leading hyphens
			.slice(0, 63) // Max 63 chars (fewer than 64)
	);
</script>

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="grid items-start gap-12 lg:grid-cols-[1fr_2fr]">
		<div class="flex flex-col gap-4 pt-2">
			<h1 style="color: var(--text-primary);" class="text-3xl font-bold tracking-tight">
				Name your skill
			</h1>
			<p style="color: var(--text-secondary);" class="text-base">
				Pick a clear, simple name for your new AI skill.
			</p>
		</div>

		<div class="flex w-full flex-col gap-8">
			<div class="flex flex-col gap-3">
				<label
					for="skillName"
					style="color: var(--text-primary);"
					class="text-sm font-semibold tracking-wider uppercase"
				>
					Skill Name
				</label>

				<input
					id="skillName"
					type="text"
					bind:value={rawName}
					placeholder="e.g. Code Reviewer"
					style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong);"
					class="w-full rounded p-3 text-base transition-colors placeholder:text-(--text-tertiary) focus:border-(--accent) focus:ring-1 focus:ring-(--focus-ring) focus:outline-none"
				/>

				<div
					style="background: var(--surface-sunken); border: 1px solid var(--border-strong)"
					class="mt-2 flex flex-col gap-1 rounded border-l-2 border-l-(--accent) p-4 shadow-sm"
				>
					<div
						style="color: var(--text-tertiary);"
						class="flex items-center gap-2 text-xs font-bold tracking-widest uppercase"
					>
						<i class="bi bi-link-45deg text-base"></i>
						Unique Link ID
					</div>
					<div
						style="color: var(--text-secondary); font-family: var(--font-mono);"
						class="mb-1 text-[11px] leading-relaxed opacity-80"
					>
						This is the computer-friendly version of your name. It will be used for links and files.
					</div>
					<div
						style="color: var(--accent); font-family: var(--font-mono)"
						class="min-h-5 text-sm break-all"
					>
						{#if validName}
							{validName}
						{:else}
							<span style="opacity: 0.5">your-skill-name</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="flex justify-end gap-4">
				{#if !userState.hasKeys()}
					<a
						href="/keys"
						class="flex items-center gap-2 rounded px-4 py-3 text-sm font-bold tracking-wider uppercase transition-colors hover:bg-(--surface-sunken)"
						style="color: var(--text-secondary); border: 1px solid var(--border-default);"
					>
						<i class="bi bi-key" aria-hidden="true"></i> Add API Key
					</a>
				{/if}
				<button
					type="button"
					disabled={!validName}
					onclick={() => goto(`/create/description?name=${validName}`)}
					class="flex items-center gap-2 rounded bg-(--accent) px-6 py-3 text-sm font-bold tracking-wider uppercase transition-colors hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-50"
					style="color: var(--accent-fg);"
				>
					Next Step <i class="bi bi-arrow-right" aria-hidden="true"></i>
				</button>
			</div>
		</div>
	</div>
</div>
