<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { userState } from '$lib/state/user.svelte';

	onMount(() => {
		if (!userState.hasKeys()) {
			goto('/keys');
		}
	});
</script>

