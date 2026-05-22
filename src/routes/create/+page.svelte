<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		const keys = localStorage.getItem('asg-api-keys');
		let hasKeys = false;
		if (keys) {
			try {
				const parsed = JSON.parse(keys);
				hasKeys = Object.keys(parsed).length > 0;
			} catch (e) {
				// ignore
			}
		}

		if (!hasKeys) {
			goto('/keys');
		}
	});
</script>
