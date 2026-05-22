<script lang="ts">
	import { goto } from '$app/navigation';
	import { userState } from '$lib/state/user.svelte';

	let rawName = $state('');

	let validName = $derived(
		rawName
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-+/, '')
			.slice(0, 63)
	);
</script>

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="grid items-start gap-12 lg:grid-cols-[1fr_2fr]">
		<!-- Left: title + guidance -->
		<div class="flex flex-col gap-4 pt-2">
			<h1
				style="color: var(--text-primary); font-family: var(--font-display);"
				class="text-3xl font-extrabold tracking-widest uppercase"
			>
				Name your skill
			</h1>
			<p style="color: var(--text-secondary); font-family: var(--font-body);" class="text-base leading-relaxed">
				Pick a clear, simple name. It becomes the skill's unique ID and file name.
			</p>

			<div
				class="mt-6 flex flex-col gap-5 border-l-2 border-(--accent) p-5"
				style="background: var(--surface-sunken);"
			>
				<h3
					style="color: var(--accent); font-family: var(--font-display);"
					class="flex items-center gap-3 text-xs font-bold tracking-widest uppercase"
				>
					<i class="bi bi-lightbulb"></i>
					Tips
				</h3>
				<div class="flex flex-col gap-4" style="font-family: var(--font-mono);">
					{#each [
						['01 // Be specific', 'Prefer "typescript-refactor" over "code".'],
						['02 // Keep it short', 'Shorter names are easier to reference. Under 30 chars is ideal.'],
						['03 // Use hyphens', 'Spaces become hyphens automatically. Stick to lowercase.']
					] as [title, tip] (title)}
						<div class="flex flex-col gap-1">
							<span
								style="color: var(--text-primary);"
								class="text-xs font-semibold tracking-widest uppercase">{title}</span
							>
							<span style="color: var(--text-secondary);" class="text-[11px] leading-relaxed opacity-80"
								>{tip}</span
							>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right: form -->
		<div class="flex w-full flex-col gap-8">
			<div class="flex flex-col gap-3">
				<label
					for="skillName"
					style="color: var(--text-primary); font-family: var(--font-display);"
					class="text-xs font-bold tracking-widest uppercase"
				>
					Skill Name
				</label>

				<input
					id="skillName"
					type="text"
					bind:value={rawName}
					placeholder="e.g. code-reviewer"
					style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-body);"
					class="w-full p-3 text-base transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
				/>

				<!-- Live slug preview -->
				<div
					style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-left: 2px solid var(--accent); border-radius: 2px;"
					class="flex flex-col gap-1 p-4 shadow-sm"
				>
					<div
						style="color: var(--text-tertiary); font-family: var(--font-display);"
						class="flex items-center gap-2 text-xs font-bold tracking-widest uppercase"
					>
						<i class="bi bi-link-45deg text-base"></i>
						Unique Link ID
					</div>
					<div
						style="color: var(--text-secondary); font-family: var(--font-mono);"
						class="mb-1 text-[11px] leading-relaxed opacity-80"
					>
						The computer-friendly version — used for links and file names.
					</div>
					<div
						style="color: var(--accent); font-family: var(--font-mono)"
						class="min-h-5 text-sm break-all"
					>
						{#if validName}
							{validName}
						{:else}
							<span style="opacity: 0.4">your-skill-name</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="flex items-center justify-between gap-4">
				{#if !userState.hasKeys()}
					<a
						href="/keys"
						class="flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--surface-sunken) focus:outline-none"
						style="color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: 2px; font-family: var(--font-display);"
					>
						<i class="bi bi-key" aria-hidden="true"></i> Add API Key
					</a>
				{:else}
					<div></div>
				{/if}

				<button
					type="button"
					disabled={!validName}
					onclick={() => goto(`/create/description?name=${validName}`)}
					class="flex items-center gap-2 bg-(--accent) px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus:outline-none"
					style="color: var(--accent-fg); border-radius: 2px; font-family: var(--font-display);"
				>
					Next <i class="bi bi-arrow-right" aria-hidden="true"></i>
				</button>
			</div>
		</div>
	</div>
</div>
