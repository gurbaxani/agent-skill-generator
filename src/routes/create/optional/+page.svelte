<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';

	let skillName = $derived($page.url.searchParams.get('name') || '');
	let description = $derived($page.url.searchParams.get('description') || '');

	let license = $state('');
	let compatibility = $state('');

	type MetaEntry = { key: string; value: string; id: number };
	let metadata = $state<MetaEntry[]>([
		{ key: 'author', value: '', id: 1 },
		{ key: 'version', value: '1.0', id: 2 }
	]);
	let nextMetaId = 3;

	let allowedTools = $state('');
	let showExperimentalMsg = $state(false);

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

	function addMeta() {
		metadata = [...metadata, { key: '', value: '', id: nextMetaId++ }];
	}

	function removeMeta(id: number) {
		metadata = metadata.filter((m) => m.id !== id);
	}

	let isValid = $derived(compatibility.length <= 500);

	async function handleGenerate() {
		if (!selectedProvider) return;
		const config = userState.keys[selectedProvider];
		isGenerating = true;
		errorMsg = '';
		try {
			const prompt = `You are an expert at writing configuration options for AI Agent Skills.
Please suggest optional metadata for a skill named "${skillName}" with the description: "${description}".

Your output MUST be a valid JSON object matching this schema:
{
  "license": "Suggest a common open-source license name (e.g., MIT, Apache-2.0, GPL-3.0)",
  "compatibility": "Suggest environment requirements (max 500 chars)",
  "metadata": {
    "author": "Suggest an author name or org",
    "version": "1.0.0"
  },
  "allowed-tools": "Suggest a space-separated list of common tools/packages this skill might need (e.g., curl python)"
}

Output ONLY the JSON, nothing else.`;

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

			const cleaned = responseText
				.replace(/^```json\s*/i, '')
				.replace(/```$/, '')
				.trim();
			const parsed = JSON.parse(cleaned);

			if (parsed.license) license = parsed.license;
			if (parsed.compatibility) compatibility = parsed.compatibility.slice(0, 500);
			if (parsed.metadata) {
				const entries: MetaEntry[] = [];
				let id = 1;
				for (const [k, v] of Object.entries(parsed.metadata)) {
					entries.push({ key: k, value: String(v), id: id++ });
				}
				metadata = entries;
				nextMetaId = id;
			}
			if (parsed['allowed-tools']) allowedTools = parsed['allowed-tools'];
		} catch (err: unknown) {
			console.error(err);
			if (err instanceof Error) {
				errorMsg = err.message;
			} else {
				errorMsg = 'Failed to generate optional data. Please check your API key configuration.';
			}
		} finally {
			isGenerating = false;
		}
	}

	function handleSave() {
		const params = new URLSearchParams();
		params.set('name', skillName);
		params.set('description', description);
		if (license) params.set('license', license);
		if (compatibility) params.set('compatibility', compatibility);
		if (allowedTools) params.set('allowed-tools', allowedTools);
		if (metadata.length > 0) {
			const metaObj: Record<string, string> = {};
			for (const m of metadata) {
				if (m.key) metaObj[m.key] = m.value;
			}
			params.set('metadata', JSON.stringify(metaObj));
		}
		goto(`/create/skill?${params.toString()}`);
	}
</script>

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="grid items-start gap-12 lg:grid-cols-[1fr_2fr]">
		<div class="flex flex-col gap-4 pt-2">
			<h1
				style="color: var(--text-primary); font-family: var(--font-display);"
				class="text-3xl font-extrabold tracking-widest uppercase"
			>
				Optional Data
			</h1>
			<p
				style="color: var(--text-secondary); font-family: var(--font-body);"
				class="text-base leading-relaxed"
			>
				Add extra metadata to your skill <span
					style="color: var(--accent); font-family: var(--font-mono)">{skillName}</span
				>.
			</p>
		</div>

		<div class="flex w-full flex-col gap-8">
			{#if errorMsg}
				<div
					style="border: 1px solid var(--secondary); background: var(--secondary-subtle); color: var(--secondary); font-family: var(--font-mono); border-radius: 2px;"
					class="p-4 text-sm shadow-sm"
				>
					[Error] {errorMsg}
				</div>
			{/if}

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
							Let our AI write the optional metadata for you.
						</p>
					</div>
					<div class="flex flex-col items-center gap-3 sm:flex-row">
						<select
							bind:value={selectedProvider}
							style="color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono);"
							class="w-full appearance-none bg-transparent px-3 py-2 text-sm focus:outline-none sm:w-auto"
						>
							{#each availableProviders as provider}
								<option value={provider}>{provider}</option>
							{/each}
						</select>
						<button
							type="button"
							onclick={handleGenerate}
							disabled={isGenerating}
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

			<div class="flex flex-col gap-6">
				<!-- License -->
				<div class="flex flex-col gap-3">
					<label
						for="license"
						style="color: var(--text-primary); font-family: var(--font-display);"
						class="text-xs font-bold tracking-widest uppercase"
					>
						License
					</label>
					<input
						id="license"
						type="text"
						bind:value={license}
						placeholder="e.g. Apache-2.0"
						style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono);"
						class="w-full p-3 text-sm transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
					/>
				</div>

				<!-- Compatibility -->
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<label
							for="compatibility"
							style="color: var(--text-primary); font-family: var(--font-display);"
							class="text-xs font-bold tracking-widest uppercase"
						>
							Compatibility
						</label>
						<span
							style="color: {compatibility.length > 500
								? 'var(--secondary)'
								: 'var(--text-tertiary)'}; font-family: var(--font-mono)"
							class="text-xs tracking-wider uppercase"
						>
							{compatibility.length} / 500
						</span>
					</div>
					<textarea
						id="compatibility"
						bind:value={compatibility}
						placeholder="Environment requirements..."
						rows="3"
						style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-body);"
						class="w-full resize-y p-4 text-sm transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
					></textarea>
				</div>

				<!-- Metadata -->
				<div class="flex flex-col gap-3">
					<label
						for="metadata"
						style="color: var(--text-primary); font-family: var(--font-display);"
						class="text-xs font-bold tracking-widest uppercase"
					>
						Metadata
					</label>
					{#if metadata.length > 0}
						<div class="flex flex-col gap-3">
							{#each metadata as item (item.id)}
								<div class="flex items-center gap-3">
									<input
										type="text"
										bind:value={item.key}
										placeholder="Key (e.g. author)"
										style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono);"
										class="w-1/3 p-2.5 text-xs transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
									/>
									<input
										type="text"
										bind:value={item.value}
										placeholder="Value"
										style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-body);"
										class="flex-1 p-2.5 text-xs transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
									/>
									<button
										type="button"
										onclick={() => removeMeta(item.id)}
										class="flex items-center justify-center rounded-[2px] p-2.5 text-(--text-tertiary) transition-colors hover:bg-(--surface-sunken) hover:text-(--secondary) focus:outline-none"
										title="Remove"
									>
										<i class="bi bi-x-lg text-xs"></i>
									</button>
								</div>
							{/each}
						</div>
					{/if}
					<div>
						<button
							type="button"
							onclick={addMeta}
							style="border: 1px dashed var(--border-strong); color: var(--text-secondary); font-family: var(--font-display); border-radius: 2px;"
							class="flex w-full items-center justify-center gap-2 py-2.5 text-xs font-bold tracking-widest uppercase transition-all hover:border-(--accent) hover:bg-(--surface-sunken) hover:text-(--accent) focus:outline-none"
						>
							<i class="bi bi-plus-lg"></i> Add Metadata Pair
						</button>
					</div>
				</div>

				<!-- Allowed Tools -->
				<div class="flex flex-col gap-3">
					<label
						for="allowed-tools"
						style="color: var(--text-primary); font-family: var(--font-display);"
						class="flex items-center gap-2 text-xs font-bold tracking-widest uppercase"
					>
						Allowed Tools
						<button
							type="button"
							onclick={() => (showExperimentalMsg = !showExperimentalMsg)}
							class="flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none"
							title="Toggle info"
						>
							<i class="bi bi-flask text-xs" style="color: var(--accent);"></i>
						</button>
					</label>
					{#if showExperimentalMsg}
						<div
							style="color: var(--accent); font-family: var(--font-mono); border: 1px solid var(--accent); background: var(--accent-glow); border-radius: 2px;"
							class="flex items-start gap-2.5 p-3 text-xs transition-all"
						>
							<i class="bi bi-info-circle-fill text-sm"></i>
							<div>
								<span class="font-bold">Experimental Feature:</span> Specifies a list of pre-approved
								tools this skill is allowed to invoke. Use with caution.
							</div>
						</div>
					{/if}
					<input
						id="allowed-tools"
						type="text"
						bind:value={allowedTools}
						placeholder="Space-separated list of tools"
						style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 2px; font-family: var(--font-mono);"
						class="w-full p-3 text-sm transition-all placeholder:text-(--text-tertiary) focus:border-(--accent) focus:shadow-[0_0_8px_var(--accent-glow)] focus:ring-1 focus:ring-(--accent) focus:outline-none"
					/>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-4">
				<button
					type="button"
					onclick={() => history.back()}
					class="flex items-center gap-2 px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--surface-sunken) focus:outline-none"
					style="color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: 2px; font-family: var(--font-display);"
				>
					<i class="bi bi-arrow-left" aria-hidden="true"></i> Back
				</button>
				<button
					type="button"
					disabled={!isValid}
					onclick={handleSave}
					class="flex items-center gap-2 bg-(--accent) px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition-all hover:bg-(--accent-hover) hover:shadow-[0_0_15px_var(--accent-glow)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
					style="color: var(--accent-fg); border-radius: 2px; font-family: var(--font-display);"
				>
					Save Skill <i class="bi bi-check-lg" aria-hidden="true"></i>
				</button>
			</div>
		</div>
	</div>
</div>
