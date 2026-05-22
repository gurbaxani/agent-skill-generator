<script lang="ts">
	import { userState } from '$lib/state/user.svelte';
	import { siAnthropic, siGooglegemini, siOllama, siOpenrouter } from 'simple-icons';
	import type { SimpleIcon } from 'simple-icons';

	let selectedProvider = $state('openai');
	let apiKeyValue = $state('');
	let endpointValue = $state('');
	let modelValue = $state('gpt-4o');
	
	type ProviderConfig = {
		id: string;
		name: string;
		hasEndpoint: boolean;
		keyRequired: boolean;
		defaultEndpoint?: string;
		defaultModel?: string;
		icon?: string;
		svg?: SimpleIcon;
		keyUrl?: string;
	};

	const providers: ProviderConfig[] = [
		{ id: 'openai', name: 'OpenAI', icon: 'bi-openai', hasEndpoint: true, defaultEndpoint: 'https://api.openai.com/v1', keyRequired: true, keyUrl: 'https://platform.openai.com/api-keys', defaultModel: 'gpt-4o' },
		{ id: 'anthropic', name: 'Anthropic', svg: siAnthropic, hasEndpoint: false, keyRequired: true, keyUrl: 'https://console.anthropic.com/settings/keys', defaultModel: 'claude-3-5-sonnet-latest' },
		{ id: 'gemini', name: 'Google Gemini', svg: siGooglegemini, hasEndpoint: false, keyRequired: true, keyUrl: 'https://aistudio.google.com/app/apikey', defaultModel: 'gemini-1.5-pro' },
		{ id: 'openrouter', name: 'OpenRouter', svg: siOpenrouter, hasEndpoint: true, defaultEndpoint: 'https://openrouter.ai/keys', keyRequired: true, keyUrl: 'https://openrouter.ai/keys' },
		{ id: 'ollama', name: 'Ollama', svg: siOllama, hasEndpoint: true, defaultEndpoint: 'http://localhost:11434/v1', keyRequired: false, keyUrl: 'https://ollama.com/', defaultModel: 'llama3' },
		{ id: 'custom', name: 'Custom Server', icon: 'bi-hdd-network', hasEndpoint: true, defaultEndpoint: 'http://localhost:11434/v1', keyRequired: false }
	];

	let currentProvider = $derived(providers.find(p => p.id === selectedProvider) || providers[0]);

	function handleProviderChange(id: string) {
		selectedProvider = id;
		const nextProvider = providers.find(p => p.id === id) || providers[0];
		if (nextProvider.hasEndpoint && nextProvider.defaultEndpoint) {
			endpointValue = nextProvider.defaultEndpoint;
		} else {
			endpointValue = '';
		}
		modelValue = nextProvider.defaultModel || '';
	}

	function handleSave(e: Event) {
		e.preventDefault();
		if (apiKeyValue.trim() || !currentProvider.keyRequired) {
			userState.saveKey(selectedProvider, apiKeyValue.trim(), endpointValue.trim(), modelValue.trim());
			apiKeyValue = ''; // Reset after saving
			if (currentProvider.hasEndpoint) {
				endpointValue = currentProvider.defaultEndpoint || '';
			}
			modelValue = currentProvider.defaultModel || '';
		}
	}

	function handleRemove(providerId: string) {
		userState.removeKey(providerId);
	}
</script>

<div class="mx-auto max-w-6xl px-6 py-12 lg:px-12">
	<div class="mb-10 flex flex-col gap-2">
		<h1 style="color: var(--text-primary);" class="text-3xl font-bold tracking-tight">Configuration</h1>
		<p style="color: var(--text-secondary);" class="text-base">Configure provider credentials. Keys are stored locally in your browser.</p>
	</div>

	<div class="grid items-start gap-12 lg:grid-cols-2">
		<!-- Add Key Section -->
		<section style="background: var(--surface-raised); border: 1px solid var(--border-default);" class="flex flex-col gap-6 rounded-lg p-6">
			<h2 style="color: var(--text-primary); border-bottom: 1px solid var(--border-default);" class="pb-3 text-xl font-semibold">
				Add Provider Key
			</h2>
			
			<form onsubmit={handleSave} class="flex flex-col gap-6">
				<div class="flex flex-col gap-2">
					<span style="color: var(--text-primary);" class="text-sm font-medium">Provider</span>
					<div class="grid grid-cols-3 gap-3">
						{#each providers as provider (provider.id)}
							<button 
								type="button" 
								class="flex flex-col items-center justify-center gap-2 rounded-lg border p-3 transition-colors {selectedProvider === provider.id ? 'border-(--accent) bg-(--accent-glow) text-(--accent)' : 'border-(--border-strong) bg-(--surface-sunken) text-(--text-secondary) hover:text-(--text-primary)'}" 
								style={selectedProvider === provider.id ? 'border: 1px solid var(--accent); color: var(--accent); background: var(--accent-subtle);' : 'border: 1px solid var(--border-strong);'}
								onclick={() => handleProviderChange(provider.id)}
							>
								{#if provider.svg}
									<svg viewBox="0 0 24 24" class="h-6 w-6" aria-hidden="true" fill="currentColor">
										<path d={provider.svg.path} />
									</svg>
								{:else}
									<i class="bi {provider.icon} text-2xl" aria-hidden="true"></i>
								{/if}
								<span class="text-xs font-medium">{provider.name}</span>
							</button>
						{/each}
					</div>
				</div>

				{#if currentProvider.hasEndpoint}
					<div class="flex flex-col gap-2">
						<label for="endpoint" style="color: var(--text-primary);" class="text-sm font-medium">Base URL / Endpoint</label>
						<input
							type="text"
							id="endpoint"
							bind:value={endpointValue}
							placeholder={currentProvider.defaultEndpoint}
							style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong);"
							class="w-full rounded-md p-3 text-sm focus:border-(--accent) focus:outline-none focus:ring-1 focus:ring-(--focus-ring) placeholder:text-(--text-tertiary)"
							autocomplete="off"
						/>
					</div>
				{/if}

				<div class="flex flex-col gap-2">
					<label for="model" style="color: var(--text-primary);" class="text-sm font-medium">Model</label>
					<input
						type="text"
						id="model"
						bind:value={modelValue}
						placeholder={currentProvider.defaultModel || 'Enter model name'}
						style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong);"
						class="w-full rounded-md p-3 text-sm focus:border-(--accent) focus:outline-none focus:ring-1 focus:ring-(--focus-ring) placeholder:text-(--text-tertiary)"
						autocomplete="off"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<label for="api-key" style="color: var(--text-primary);" class="text-sm font-medium">
							API Key {!currentProvider.keyRequired ? '(Optional)' : ''}
						</label>
						{#if currentProvider.keyUrl}
							<a href={currentProvider.keyUrl} target="_blank" rel="noopener noreferrer" style="color: var(--accent);" class="text-xs hover:underline">
								Get Key <i class="bi bi-box-arrow-up-right ml-1"></i>
							</a>
						{/if}
					</div>
					<input
						type="password"
						id="api-key"
						bind:value={apiKeyValue}
						placeholder={currentProvider.keyRequired ? 'sk-...' : 'Leave empty if not required'}
						style="background: var(--surface-sunken); color: var(--text-primary); border: 1px solid var(--border-strong);"
						class="w-full rounded-md p-3 text-sm focus:border-(--accent) focus:outline-none focus:ring-1 focus:ring-(--focus-ring) placeholder:text-(--text-tertiary)"
						autocomplete="off"
					/>
				</div>

				<button 
					type="submit" 
					disabled={currentProvider.keyRequired && !apiKeyValue.trim()}
					class="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-(--accent) px-4 py-3 text-sm font-semibold text-(--surface-base) transition-colors hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-50"
				>
					<i class="bi bi-plus-lg"></i>
					Install Key
				</button>
			</form>
		</section>

		<!-- Active Keys Section -->
		<section style="background: var(--surface-raised); border: 1px solid var(--border-default);" class="flex flex-col gap-6 rounded-lg p-6">
			<h2 style="color: var(--text-primary); border-bottom: 1px solid var(--border-default);" class="pb-3 text-xl font-semibold">
				Active Credentials
			</h2>
			
			<div class="flex flex-col gap-4">
				{#if !userState.hasKeys()}
					<div style="background: var(--surface-sunken); border: 1px dashed var(--border-default); color: var(--text-secondary);" class="flex flex-col items-center justify-center gap-4 rounded-lg p-12 text-center text-sm">
						<i class="bi bi-terminal text-4xl text-(--border-strong)"></i>
						<p>No keys installed. System running in disconnected mode.</p>
					</div>
				{:else}
					{#each Object.entries(userState.keys) as [providerId, config] (providerId)}
						{@const provider = providers.find(p => p.id === providerId) || { id: providerId, name: providerId, icon: 'bi-key', hasEndpoint: false, keyRequired: true } as ProviderConfig}
						<div style="background: var(--surface-base); border: 1px solid var(--border-default);" class="flex items-center justify-between rounded-md p-4">
							<div class="flex items-center gap-4">
								{#if provider.svg}
									<svg viewBox="0 0 24 24" style="color: var(--secondary);" class="h-6 w-6" aria-hidden="true" fill="currentColor">
										<path d={provider.svg.path} />
									</svg>
								{:else}
									<i class="bi {provider.icon} text-2xl text-(--secondary)" aria-hidden="true"></i>
								{/if}
								
								<div class="flex flex-col gap-1">
									<span style="color: var(--text-primary);" class="font-semibold text-sm">{provider.name}</span>
									<div class="flex items-center gap-2 text-xs">
										{#if config.model}
											<span style="background: var(--surface-sunken); border: 1px solid var(--border-default); color: var(--text-secondary);" class="rounded px-2 py-0.5">
												{config.model}
											</span>
										{/if}
										{#if config.endpoint}
											<span style="color: var(--text-tertiary);" class="max-w-[150px] truncate">{config.endpoint}</span>
										{/if}
									</div>
								</div>
							</div>
							
							<div class="flex items-center gap-4">
								<span style="color: var(--text-tertiary);" class="text-sm font-mono">
									{#if config.key}
										••••{config.key.slice(-4)}
									{:else}
										<span class="opacity-50">NO KEY</span>
									{/if}
								</span>
								
								<button 
									type="button" 
									onclick={() => handleRemove(providerId)} 
									aria-label="Remove {provider.name} key"
									class="flex h-8 w-8 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--secondary-subtle) hover:text-(--secondary)"
								>
									<i class="bi bi-x-lg"></i>
								</button>
							</div>
						</div>
					{/each}
					
					<div class="mt-4 flex justify-end pt-4 border-t border-(--border-default)">
						<a href="/create" class="flex items-center gap-2 rounded-md bg-(--accent) px-6 py-3 text-sm font-semibold text-(--surface-base) transition-colors hover:bg-(--accent-hover)">
							Continue to Create Skill
							<i class="bi bi-arrow-right"></i>
						</a>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>
