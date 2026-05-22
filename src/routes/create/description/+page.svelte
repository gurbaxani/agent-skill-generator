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
		if (!skillName) {
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
				const modelName = config.model || 'gemini-1.5-flash';
				const res = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.key}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
					}
				);
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
						model: config.model || 'claude-3-haiku-20240307',
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
				let model = config.model;
				if (!model) {
					model = 'gpt-4o-mini';
					if (selectedProvider === 'openrouter') model = 'meta-llama/llama-3-8b-instruct:free';
					if (selectedProvider === 'ollama') model = 'llama3';
				}

				const res = await fetch(`${endpoint}/chat/completions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(config.key ? { Authorization: `Bearer ${config.key}` } : {})
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

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="grid items-start gap-12 lg:grid-cols-[1fr_2fr]">
		<div class="flex flex-col gap-4 pt-2">
			<h1
				style="color: var(--text-primary); font-family: var(--font-display);"
				class="text-3xl font-extrabold tracking-widest uppercase"
			>
				Description
			</h1>
			<p style="color: var(--text-secondary); font-family: var(--font-body);" class="text-base leading-relaxed">
				Describe what <span style="color: var(--accent); font-family: var(--font-mono)">{skillName}</span> does — and <em>when</em> an agent should reach for it.
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
						['01 // When to use it', 'Tell the AI exactly when it should use this skill, not just what it does.'],
						['02 // How to start', 'Begin with "Use this skill when…" — it primes retrieval.'],
						['03 // Be specific', 'Mention domain keywords so the agent matches correctly.'],
						['04 // Keep it short', 'Under 1 024 characters. One tight paragraph is ideal.']
					] as [title, tip] (title)}
						<div class="flex flex-col gap-1">
							<span style="color: var(--text-primary);" class="text-xs font-semibold tracking-widest uppercase">{title}</span>
							<span style="color: var(--text-secondary);" class="text-[11px] leading-relaxed opacity-80">{tip}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="flex w-full flex-col gap-8">
			{#if errorMsg}
				<div
					style="border-left: 2px solid var(--secondary); background: var(--secondary-subtle); color: var(--secondary); font-family: var(--font-mono)"
					class="rounded p-4 text-sm shadow-sm"
				>
					[Error] {errorMsg}
				</div>
			{/if}

			<div class="flex flex-col gap-6">
				{#if availableProviders.length > 0}
					<div
						style="background: var(--surface-sunken); border: 1px solid var(--border-strong)"
						class="flex flex-col gap-4 rounded p-5 shadow-sm"
					>
						<div>
							<h3
								style="color: var(--text-primary);"
								class="text-sm font-semibold tracking-wider uppercase"
							>
								Don't want to write it yourself?
							</h3>
							<p style="color: var(--text-secondary);" class="mt-1 text-sm">
								Let our AI write a great description for you.
							</p>
						</div>
						<div class="flex flex-col items-center gap-3 sm:flex-row">
							<select
								bind:value={selectedProvider}
								style="color: var(--text-primary); border: 1px solid var(--border-strong);"
								class="w-full appearance-none rounded bg-transparent px-3 py-2 text-sm focus:outline-none sm:w-auto"
							>
								{#each availableProviders as provider}
									<option value={provider}>{provider}</option>
								{/each}
							</select>
							<button
								type="button"
								onclick={handleGenerate}
								disabled={isGenerating}
								style="border: 1px solid var(--accent); color: var(--accent);"
								class="flex w-full items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium tracking-wider uppercase transition-colors hover:bg-(--accent-glow) disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
							>
								{#if isGenerating}
									<span class="animate-pulse">Writing...</span>
								{:else}
									<i class="bi bi-magic" aria-hidden="true"></i> Let AI write it
								{/if}
							</button>
						</div>
					</div>

					<div class="flex items-center gap-4">
						<div class="h-px w-full" style="background: var(--border-default)"></div>
						<span
							style="color: var(--text-tertiary);"
							class="text-xs font-medium tracking-widest uppercase">OR</span
						>
						<div class="h-px w-full" style="background: var(--border-default)"></div>
					</div>
				{/if}

				<div class="flex flex-col gap-3">
					<label
						for="description"
						style="color: var(--text-primary); font-family: var(--font-display);"
						class="text-xs font-bold tracking-widest uppercase"
					>
						{availableProviders.length > 0 ? 'Write it yourself' : 'Description'}
					</label>

					<textarea
						id="description"
						bind:value={description}
						placeholder="Use this skill when..."
						rows="8"
						style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-body);"
						class="w-full resize-y p-4 text-base transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
					></textarea>

					<div class="flex items-center justify-between" style="font-family: var(--font-mono);">
						<span style="color: var(--text-tertiary);" class="text-xs tracking-wider uppercase">Up to 1 024 characters</span>
						<span
							style="color: {description.length > 1024 ? 'var(--secondary)' : 'var(--text-tertiary)'};"
							class="text-xs tracking-wider uppercase"
						>
							{description.length} / 1024
						</span>
					</div>
				</div>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-4">
				<button
					type="button"
					onclick={() => history.back()}
					class="flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--surface-sunken) focus:outline-none"
					style="color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: 2px; font-family: var(--font-display);"
				>
					<i class="bi bi-arrow-left" aria-hidden="true"></i> Back
				</button>

				<div class="flex items-center gap-3">
					{#if !userState.hasKeys()}
						<a
							href="/keys"
							class="flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--surface-sunken)"
							style="color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: 2px; font-family: var(--font-display);"
						>
							<i class="bi bi-key" aria-hidden="true"></i> Add API Key
						</a>
					{/if}
					<button
						type="button"
						disabled={!isValid}
						onclick={() => goto(`/create/optional?name=${skillName}&description=${encodeURIComponent(description)}`)}
						class="flex items-center gap-2 bg-(--accent) px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus:outline-none"
						style="color: var(--accent-fg); border-radius: 2px; font-family: var(--font-display);"
					>
						Next <i class="bi bi-arrow-right" aria-hidden="true"></i>
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
