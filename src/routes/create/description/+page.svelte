<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';

	let skillName = $derived($page.url.searchParams.get('name') || '');
	let description = $state('');
	let isGenerating = $state(false);
	let errorMsg = $state('');

	let availableProviders = $derived(Object.keys(userState.keys));
	let selectedProvider = $state('');

	onMount(() => {
		if (!userState.hasKeys()) {
			goto('/keys');
		} else if (!skillName) {
			goto('/create');
		}
		if (availableProviders.length > 0) {
			selectedProvider = availableProviders[0];
		}
	});

	async function handleGenerate() {
		if (!selectedProvider) return;
		const config = userState.keys[selectedProvider];
		isGenerating = true;
		errorMsg = '';
		try {
			const prompt = `You are an expert at writing descriptions for AI Agent Skills.
Please write a short description (under 1024 characters) for a skill about: ${skillName}

The description MUST follow these rules:
1. Prioritize describing WHEN to use the skill over what it does.
2. Include keywords related to the domain.
3. Use imperative phrasing, focusing on user intent. Start with "Use this skill when..."
4. Be concise and pushy. Provide contexts explicitly, including when the user doesn't explicitly name the domain.

Output ONLY the text of the description, nothing else.`;

			if (selectedProvider === 'gemini') {
				const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.key}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
				});
				const data = await res.json();
				if (data.error) throw new Error(data.error.message);
				description = data.candidates[0].content.parts[0].text.trim();
			} else if (selectedProvider === 'anthropic') {
				const res = await fetch('https://api.anthropic.com/v1/messages', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': config.key,
						'anthropic-version': '2023-06-01',
						'anthropic-dangerous-direct-browser-access': 'true'
					},
					body: JSON.stringify({
						model: 'claude-3-haiku-20240307',
						max_tokens: 1024,
						messages: [{ role: 'user', content: prompt }]
					})
				});
				const data = await res.json();
				if (data.error) throw new Error(data.error.message);
				description = data.content[0].text.trim();
			} else {
				// OpenAI, OpenRouter, Ollama, Custom
				const endpoint = config.endpoint || 'https://api.openai.com/v1';
				let model = 'gpt-4o-mini';
				if (selectedProvider === 'openrouter') model = 'meta-llama/llama-3-8b-instruct:free';
				if (selectedProvider === 'ollama') model = 'llama3';

				const res = await fetch(`${endpoint}/chat/completions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(config.key ? { 'Authorization': `Bearer ${config.key}` } : {})
					},
					body: JSON.stringify({
						model,
						messages: [{ role: 'user', content: prompt }]
					})
				});
				const data = await res.json();
				if (data.error) throw new Error(data.error.message);
				description = data.choices[0].message.content.trim();
			}
		} catch (err: unknown) {
			console.error(err);
			if (err instanceof Error) {
				errorMsg = err.message;
			} else {
				errorMsg = 'Failed to generate description. Please try again.';
			}
		} finally {
			isGenerating = false;
		}
	}

	let isValid = $derived(description.length > 0 && description.length <= 1024);
</script>

<div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
	<div class="w-full max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-8 shadow-2xl">
		<div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="mb-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Skill Description</h1>
				<p class="text-sm text-[var(--text-secondary)]">Describe what your skill <span class="font-mono text-[var(--accent)]">{skillName}</span> does.</p>
			</div>
			
			{#if availableProviders.length > 0}
				<div class="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-sunken)] p-2">
					<select bind:value={selectedProvider} class="bg-transparent text-sm text-[var(--text-primary)] focus:outline-none">
						{#each availableProviders as provider}
							<option value={provider}>{provider}</option>
						{/each}
					</select>
					<button
						type="button"
						onclick={handleGenerate}
						disabled={isGenerating}
						class="flex items-center gap-2 rounded bg-[var(--surface-base)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--border-default)] disabled:opacity-50"
					>
						{#if isGenerating}
							<span class="animate-pulse">Generating...</span>
						{:else}
							<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>
							Auto-Generate
						{/if}
					</button>
				</div>
			{/if}
		</div>

		{#if errorMsg}
			<div class="mb-4 rounded-lg border border-[var(--secondary)] bg-[var(--secondary-subtle)] p-3 text-sm text-[var(--secondary)]">
				{errorMsg}
			</div>
		{/if}

		<div class="mb-6">
			<textarea
				bind:value={description}
				placeholder="Use this skill when..."
				rows="6"
				class="w-full resize-none rounded-lg border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
			></textarea>
			<div class="mt-2 flex justify-between text-xs font-medium">
				<span class="text-[var(--text-tertiary)]">Max 1024 characters</span>
				<span class={description.length > 1024 ? 'text-[var(--secondary)]' : 'text-[var(--text-secondary)]'}>
					{description.length} / 1024
				</span>
			</div>
		</div>

		<button
			type="button"
			disabled={!isValid}
			class="w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-fg)] shadow-sm transition-all hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
		>
			Save Skill
		</button>
	</div>
</div>
