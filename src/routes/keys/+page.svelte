<script lang="ts">
	import { userState } from '$lib/state/user.svelte';
	import { siAnthropic, siGooglegemini, siOllama, siOpenrouter } from 'simple-icons';
	import type { SimpleIcon } from 'simple-icons';

	let selectedProvider = $state('openai');
	let apiKeyValue = $state('');
	let endpointValue = $state('');
	
	type ProviderConfig = {
		id: string;
		name: string;
		hasEndpoint: boolean;
		keyRequired: boolean;
		defaultEndpoint?: string;
		icon?: string;
		svg?: SimpleIcon;
		keyUrl?: string;
	};

	const providers: ProviderConfig[] = [
		{ id: 'openai', name: 'OpenAI', icon: 'bi-openai', hasEndpoint: true, defaultEndpoint: 'https://api.openai.com/v1', keyRequired: true, keyUrl: 'https://platform.openai.com/api-keys' },
		{ id: 'anthropic', name: 'Anthropic', svg: siAnthropic, hasEndpoint: false, keyRequired: true, keyUrl: 'https://console.anthropic.com/settings/keys' },
		{ id: 'gemini', name: 'Google Gemini', svg: siGooglegemini, hasEndpoint: false, keyRequired: true, keyUrl: 'https://aistudio.google.com/app/apikey' },
		{ id: 'openrouter', name: 'OpenRouter', svg: siOpenrouter, hasEndpoint: true, defaultEndpoint: 'https://openrouter.ai/keys', keyRequired: true, keyUrl: 'https://openrouter.ai/keys' },
		{ id: 'ollama', name: 'Ollama', svg: siOllama, hasEndpoint: true, defaultEndpoint: 'http://localhost:11434/v1', keyRequired: false, keyUrl: 'https://ollama.com/' },
		{ id: 'custom', name: 'Custom Server', icon: 'bi-hdd-network', hasEndpoint: true, defaultEndpoint: 'http://localhost:11434/v1', keyRequired: false }
	];

	let currentProvider = $derived(providers.find(p => p.id === selectedProvider) || providers[0]);

	function handleProviderChange(id: string) {
		selectedProvider = id;
		if (currentProvider.hasEndpoint && currentProvider.defaultEndpoint) {
			endpointValue = currentProvider.defaultEndpoint;
		} else {
			endpointValue = '';
		}
	}

	function handleSave(e: Event) {
		e.preventDefault();
		if (apiKeyValue.trim() || !currentProvider.keyRequired) {
			userState.saveKey(selectedProvider, apiKeyValue.trim(), endpointValue.trim());
			apiKeyValue = ''; // Reset after saving
			if (currentProvider.hasEndpoint) {
				endpointValue = currentProvider.defaultEndpoint || '';
			}
		}
	}

	function handleRemove(providerId: string) {
		userState.removeKey(providerId);
	}
</script>

<div class="keys-container">
	<header class="page-header">
		<h1 class="page-title">
			<span class="index">01</span> // Configuration
		</h1>
		<p class="page-subtitle">Configure provider credentials. Keys are stored locally in your browser.</p>
	</header>

	<div class="split-layout">
		<!-- Add Key Section -->
		<section class="panel add-panel">
			<h2 class="panel-title">Add Provider Key</h2>
			<form onsubmit={handleSave} class="key-form">
				<div class="form-group">
					<span class="form-label">Provider</span>
					<div class="provider-grid">
						{#each providers as provider (provider.id)}
							<button 
								type="button" 
								class="provider-card {selectedProvider === provider.id ? 'selected' : ''}" 
								onclick={() => handleProviderChange(provider.id)}
							>
								{#if provider.svg}
									<svg viewBox="0 0 24 24" class="provider-card-svg" aria-hidden="true" fill="currentColor">
										<path d={provider.svg.path} />
									</svg>
								{:else}
									<i class="bi {provider.icon} provider-card-icon" aria-hidden="true"></i>
								{/if}
								<span class="provider-card-name">{provider.name}</span>
							</button>
						{/each}
					</div>
				</div>

				{#if currentProvider.hasEndpoint}
					<div class="form-group">
						<label for="endpoint">Base URL / Endpoint</label>
						<input
							type="text"
							id="endpoint"
							bind:value={endpointValue}
							placeholder={currentProvider.defaultEndpoint}
							class="cyber-input"
							autocomplete="off"
						/>
					</div>
				{/if}

				{#if currentProvider.keyRequired}
					<div class="form-group">
						<div class="label-row">
							<label for="api-key">API Key</label>
							{#if currentProvider.keyUrl}
								<a href={currentProvider.keyUrl} target="_blank" rel="noopener noreferrer" class="get-key-link">
									Get API Key <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
								</a>
							{/if}
						</div>
						<input
							type="password"
							id="api-key"
							bind:value={apiKeyValue}
							placeholder="sk-..."
							class="cyber-input"
							autocomplete="off"
						/>
					</div>
				{:else}
					<div class="form-group">
						<div class="label-row">
							<label for="api-key">API Key (Optional)</label>
							{#if currentProvider.keyUrl}
								<a href={currentProvider.keyUrl} target="_blank" rel="noopener noreferrer" class="get-key-link">
									Learn More <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
								</a>
							{/if}
						</div>
						<input
							type="password"
							id="api-key"
							bind:value={apiKeyValue}
							placeholder="Leave empty if not required"
							class="cyber-input"
							autocomplete="off"
						/>
					</div>
				{/if}

				<button type="submit" class="cyber-btn primary" disabled={currentProvider.keyRequired && !apiKeyValue.trim()}>
					<i class="bi bi-plus-lg" aria-hidden="true"></i>
					Install Key
				</button>
			</form>
		</section>

		<!-- Active Keys Section -->
		<section class="panel active-panel">
			<h2 class="panel-title">Active Credentials</h2>
			
			<div class="keys-list">
				{#if !userState.hasKeys()}
					<div class="empty-state">
						<i class="bi bi-terminal" aria-hidden="true"></i>
						<p>No keys installed. System running in disconnected mode.</p>
					</div>
				{:else}
					{#each Object.entries(userState.keys) as [providerId, config] (providerId)}
						{@const provider = providers.find(p => p.id === providerId) || { id: providerId, name: providerId, icon: 'bi-key', hasEndpoint: false, keyRequired: true } as ProviderConfig}
						<div class="key-card">
							<div class="key-info">
								{#if provider.svg}
									<svg viewBox="0 0 24 24" class="provider-icon-svg" aria-hidden="true" fill="currentColor">
										<path d={provider.svg.path} />
									</svg>
								{:else}
									<i class="bi {provider.icon} provider-icon" aria-hidden="true"></i>
								{/if}
								<div class="key-details">
									<span class="provider-name">{provider.name}</span>
									{#if config.endpoint}
										<span class="provider-endpoint">{config.endpoint}</span>
									{/if}
								</div>
								<div class="spacer"></div>
								<span class="key-mask">
									{#if config.key}
										••••••••{config.key.slice(-4)}
									{:else}
										<span class="no-key">NO KEY</span>
									{/if}
								</span>
							</div>
							<button type="button" class="icon-btn remove-btn" onclick={() => handleRemove(providerId)} aria-label="Remove {provider.name} key">
								<i class="bi bi-x-lg" aria-hidden="true"></i>
							</button>
						</div>
					{/each}
				{/if}
			</div>
		</section>
	</div>
</div>

<style>
	.keys-container {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-2xl);
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.page-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-primary);
		font-size: var(--text-2xl);
	}

	.index {
		color: var(--accent);
		font-family: var(--font-mono);
		font-weight: 400;
		font-size: var(--text-lg);
	}

	.page-subtitle {
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}

	.split-layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-xl);
		align-items: start;
	}

	.panel {
		background: var(--surface-raised);
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		position: relative;
	}

	.panel::before,
	.panel::after {
		content: '';
		position: absolute;
		width: 12px;
		height: 12px;
		border: 1px solid var(--accent-subtle);
		pointer-events: none;
	}

	.panel::before {
		top: -1px;
		left: -1px;
		border-right: none;
		border-bottom: none;
	}

	.panel::after {
		bottom: -1px;
		right: -1px;
		border-left: none;
		border-top: none;
	}

	.panel-title {
		font-size: var(--text-lg);
		color: var(--text-primary);
		border-bottom: 1px solid var(--border-default);
		padding-bottom: var(--space-sm);
	}

	.key-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-group .form-label,
	.form-group label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.get-key-link {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--accent);
		text-decoration: none;
		text-transform: uppercase;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transition: color var(--duration-fast) var(--ease-out-quart);
	}

	.get-key-link:hover {
		color: var(--accent-hover);
		text-decoration: underline;
	}

	.provider-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-sm);
	}

	.provider-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		background: var(--surface-sunken);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: var(--space-md) var(--space-xs);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out-quart);
		color: var(--text-tertiary);
	}

	.provider-card:hover {
		border-color: var(--text-secondary);
		color: var(--text-primary);
	}

	.provider-card.selected {
		border-color: var(--accent);
		background: var(--accent-glow);
		color: var(--accent);
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.provider-card-icon,
	.provider-card-svg {
		font-size: var(--text-xl);
		width: var(--text-xl);
		height: var(--text-xl);
		line-height: 1;
	}

	.provider-card-name {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-align: center;
		letter-spacing: 0.02em;
	}

	.cyber-input {
		background: var(--surface-sunken);
		border: 1px solid var(--border-strong);
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		padding: 10px 12px;
		border-radius: var(--radius);
		transition: border-color var(--duration-fast) var(--ease-out-quart),
					box-shadow var(--duration-fast) var(--ease-out-quart);
		width: 100%;
		appearance: none;
	}

	.cyber-input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent-glow);
	}

	.cyber-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		background: transparent;
		color: var(--accent);
		border: 1px solid var(--accent);
		font-family: var(--font-display);
		font-weight: 600;
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 12px var(--space-lg);
		border-radius: var(--radius);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out-quart);
		margin-top: var(--space-sm);
	}

	.cyber-btn:hover:not(:disabled) {
		background: var(--accent-glow);
		box-shadow: 0 0 15px var(--accent-glow);
	}

	.cyber-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		border-color: var(--border-strong);
		color: var(--text-tertiary);
	}

	.keys-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--space-md);
		padding: var(--space-2xl) var(--space-lg);
		color: var(--text-tertiary);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		border: 1px dashed var(--border-default);
		border-radius: var(--radius);
		background: var(--surface-sunken);
	}

	.empty-state i {
		font-size: var(--text-2xl);
		color: var(--border-strong);
	}

	.key-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-md);
		background: var(--surface-base);
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		transition: border-color var(--duration-fast) var(--ease-out-quart);
	}

	.key-card:hover {
		border-color: var(--border-strong);
	}

	.key-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex: 1;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}

	.provider-icon,
	.provider-icon-svg {
		color: var(--secondary);
		font-size: var(--text-lg);
		width: var(--text-lg);
		height: var(--text-lg);
	}

	.key-details {
		display: flex;
		flex-direction: column;
	}

	.provider-name {
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.provider-endpoint {
		color: var(--text-tertiary);
		font-size: var(--text-xs);
		max-width: 150px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.spacer {
		flex: 1;
		border-bottom: 1px dotted var(--border-strong);
		margin: 0 var(--space-md);
		opacity: 0.5;
	}

	.key-mask {
		color: var(--text-secondary);
	}

	.no-key {
		color: var(--text-tertiary);
		font-size: var(--text-xs);
	}

	.icon-btn {
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius);
		transition: all var(--duration-fast) var(--ease-out-quart);
	}

	.icon-btn:hover {
		color: var(--secondary);
		background: var(--secondary-subtle);
	}
</style>
