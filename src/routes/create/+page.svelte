<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { userState } from '$lib/state/user.svelte';
	import { skillDraft } from '$lib/state/draft.svelte';
	import type { Skill } from '$lib/types';

	onMount(() => {
		const prefill = page.state?.prefill as Skill | undefined;
		if (prefill) {
			skillDraft.reset();
			skillDraft.name = prefill.name;
			skillDraft.description = prefill.description;
			skillDraft.license = prefill.license || '';
			skillDraft.compatibility = prefill.compatibility || '';
			skillDraft.allowedTools = prefill.allowedTools || '';
			skillDraft.body = prefill.body || '';

			// Rebuild metadata entries
			const metadata = [];
			metadata.push({ key: 'author', value: prefill.metadata?.author || '', id: 1 });
			metadata.push({ key: 'version', value: prefill.metadata?.version || '1.0', id: 2 });
			if (prefill.metadata?.tags) {
				metadata.push({ key: 'tags', value: prefill.metadata.tags, id: 3 });
			}
			skillDraft.metadata = metadata;
			skillDraft.nextMetaId = metadata.length + 1;
		}

		const options = { replaceState: true, state: page.state };
		if (userState.expertMode) {
			goto('/create/expert', options);
		} else {
			goto('/create/required', options);
		}
	});
</script>
