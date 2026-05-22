<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';
	import { skillDraft } from '$lib/state/draft.svelte';

	let isGenerating = $state(false);
	let errorMsg = $state('');

	let availableProviders = $derived(Object.keys(userState.keys));
	let selectedProvider = $state('');

	onMount(() => {
		if (availableProviders.length > 0) {
			selectedProvider = availableProviders[0];
		}
	});

	async function handleGenerate() {
		if (!selectedProvider || !skillDraft.validName) return;
		const config = userState.keys[selectedProvider];
		isGenerating = true;
		errorMsg = '';
		try {
			const prompt = `You are an expert at writing descriptions for AI Agent Skills.
Please write a short description (under 1024 characters) for a skill about: ${skillDraft.validName}

The description MUST follow these rules:
1. Prioritize describing WHEN to use the skill over what it does.
2. Include keywords related to the domain.
3. Use imperative phrasing, focusing on user intent. Start with "Use this skill when..."
4. Be concise and pushy. Provide contexts explicitly, including when the user doesn't explicitly name the domain.

Output ONLY the text of the description, nothing else.`;

			let responseText = '';
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
				responseText = data.candidates[0].content.parts[0].text.trim();
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
				responseText = data.content[0].text.trim();
			} else {
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
				responseText = data.choices[0].message.content.trim();
			}

			skillDraft.description = responseText;
		} catch (err: unknown) {
			console.error(err);
			if (err instanceof Error) {
				errorMsg = err.message;
			} else {
				errorMsg = 'Failed to generate description. Please check your API key configuration.';
			}
		} finally {
			isGenerating = false;
		}
	}

	let isValid = $derived(skillDraft.isValidRequired);

	function handleNext() {
		goto('/create/optional');
	}
</script>

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="grid items-start gap-12 lg:grid-cols-[1fr_2fr]">
		<!-- Left: title + guidance -->
		<div class="flex flex-col gap-4 pt-2">
			<h1
				style="color: var(--text-primary); font-family: var(--font-display);"
				class="text-3xl font-extrabold tracking-widest uppercase"
			>
				Required
			</h1>
			<p style="color: var(--text-secondary); font-family: var(--font-body);" class="text-base leading-relaxed">
				Name your skill and describe exactly when an agent should reach for it.
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
						['01 // Be specific', 'Prefer "typescript-refactor" over "code". Under 30 chars is ideal.'],
						['02 // Use hyphens', 'Spaces become hyphens automatically. Stick to lowercase.'],
						['03 // When, not what', 'Start the description with "Use this skill when…" — it primes retrieval.'],
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

		<!-- Right: form -->
		<div class="flex w-full flex-col gap-8">
			{#if errorMsg}
				<div
					style="border: 1px solid var(--secondary); background: var(--secondary-subtle); color: var(--secondary); font-family: var(--font-mono); border-radius: 2px;"
					class="p-4 text-sm shadow-sm"
				>
					[Error] {errorMsg}
				</div>
			{/if}

			<!-- Name field -->
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
					bind:value={skillDraft.name}
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
						{#if skillDraft.validName}
							{skillDraft.validName}
						{:else}
							<span style="opacity: 0.4">your-skill-name</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Divider -->
			<div class="flex items-center gap-4">
				<div class="h-px w-full" style="background: var(--border-default)"></div>
				<span
					style="color: var(--text-tertiary); font-family: var(--font-display);"
					class="text-xs font-medium tracking-widest uppercase whitespace-nowrap">Description</span
				>
				<div class="h-px w-full" style="background: var(--border-default)"></div>
			</div>

			<!-- AI generate block -->
			{#if availableProviders.length > 0}
				<div
					style="background: var(--surface-sunken); border: 1px solid var(--border-strong); border-radius: 2px;"
					class="flex flex-col gap-4 p-5 shadow-sm"
				>
					<div>
						<h3
							style="color: var(--text-primary); font-family: var(--font-display);"
							class="text-sm font-semibold tracking-wider uppercase"
						>
							Don't want to write it yourself?
						</h3>
						<p
							style="color: var(--text-secondary); font-family: var(--font-body);"
							class="mt-1 text-sm"
						>
							Let our AI write a great description for you.
						</p>
					</div>
					<div class="flex flex-col items-center gap-3 sm:flex-row">
						<select
							bind:value={selectedProvider}
							style="color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono);"
							class="w-full appearance-none bg-transparent px-3 py-2 text-sm focus:outline-none sm:w-auto"
						>
							{#each availableProviders as provider (provider)}
								<option value={provider}>{provider}</option>
							{/each}
						</select>
						<button
							type="button"
							onclick={handleGenerate}
							disabled={isGenerating || !skillDraft.validName}
							style="border: 1px solid var(--accent); color: var(--accent); font-family: var(--font-display); border-radius: 2px;"
							class="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium tracking-wider uppercase transition-colors hover:bg-(--accent-glow) disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
						style="color: var(--text-tertiary); font-family: var(--font-display);"
						class="text-xs font-medium tracking-widest uppercase">OR</span
					>
					<div class="h-px w-full" style="background: var(--border-default)"></div>
				</div>
			{/if}

			<!-- Description textarea -->
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
					bind:value={skillDraft.description}
					placeholder="Use this skill when..."
					rows="8"
					style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-body);"
					class="w-full resize-y p-4 text-base transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
				></textarea>

				<div class="flex items-center justify-between" style="font-family: var(--font-mono);">
					<span style="color: var(--text-tertiary);" class="text-xs tracking-wider uppercase">Up to 1 024 characters</span>
					<span
						style="color: {skillDraft.description.length > 1024 ? 'var(--secondary)' : 'var(--text-tertiary)'};"
						class="text-xs tracking-wider uppercase"
					>
						{skillDraft.description.length} / 1024
					</span>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					{#if !userState.hasKeys()}
						<a
							href="/keys"
							class="flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--surface-sunken) focus:outline-none"
							style="color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: 2px; font-family: var(--font-display);"
						>
							<i class="bi bi-key" aria-hidden="true"></i> Add API Key
						</a>
					{/if}
				</div>

				<button
					type="button"
					disabled={!isValid}
					onclick={handleNext}
					class="flex items-center gap-2 bg-(--accent) px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus:outline-none"
					style="color: var(--accent-fg); border-radius: 2px; font-family: var(--font-display);"
				>
					Next <i class="bi bi-arrow-right" aria-hidden="true"></i>
				</button>
			</div>
		</div>
	</div>
</div>
