<script lang="ts">
	import { onMount } from 'svelte';
	let email = $state('');

	onMount(() => {
		const handle = 'asg';
		const domain = 'ashwinig.com';
		email = `${handle}@${domain}`;
	});
</script>

			<h3>Contact</h3>

			<p>
				<strong>Email:</strong>
				{email}
			</p>
