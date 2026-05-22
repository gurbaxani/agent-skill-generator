import { browser } from '$app/environment';

class UserState {
	// Centralized reactive state using Svelte 5 Runes
	keys = $state<Record<string, { key: string; endpoint: string }>>({});

	constructor() {
		if (browser) {
			const storedKeys = localStorage.getItem('asg-api-keys');
			if (storedKeys) {
				try {
					const parsed = JSON.parse(storedKeys);
					const migratedKeys: Record<string, { key: string; endpoint: string }> = {};
					for (const [provider, value] of Object.entries(parsed)) {
						if (typeof value === 'string') {
							migratedKeys[provider] = { key: value, endpoint: '' };
						} else {
							migratedKeys[provider] = value as { key: string; endpoint: string };
						}
					}
					this.keys = migratedKeys;
				} catch (e) {
					console.error('Failed to parse keys', e);
				}
			}
		}
	}

	// Helper methods to keep components clean
	hasKeys(): boolean {
		return Object.keys(this.keys).length > 0;
	}

	saveKey(provider: string, key: string, endpoint: string = ''): void {
		this.keys[provider] = { key, endpoint };
		if (browser) {
			localStorage.setItem('asg-api-keys', JSON.stringify(this.keys));
		}
	}

	removeKey(provider: string): void {
		delete this.keys[provider];
		if (browser) {
			localStorage.setItem('asg-api-keys', JSON.stringify(this.keys));
		}
	}
}

export const userState = new UserState();
