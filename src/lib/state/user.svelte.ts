import { browser } from '$app/environment';

class UserState {
	// Centralized reactive state using Svelte 5 Runes
	keys = $state<Record<string, string>>({});

	constructor() {
		if (browser) {
			const storedKeys = localStorage.getItem('asg-api-keys');
			if (storedKeys) {
				try {
					this.keys = JSON.parse(storedKeys);
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

	saveKey(provider: string, key: string): void {
		this.keys[provider] = key;
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
