import type { RegistrySkill } from '$lib/registry';
import type { SkillDraftState } from '$lib/state/draft.svelte';

/**
 * Serializes the current skill draft state into a clean RegistrySkill object.
 * Reads file contents from File objects asynchronously if they are not already cached.
 */
export async function serializeSkillToRegistry(
	draft: SkillDraftState,
	authorUsername: string
): Promise<RegistrySkill> {
	const readTextFile = async (fileObj: { file?: File; content?: string }): Promise<string> => {
		if (fileObj.content !== undefined) {
			return fileObj.content;
		}
		if (fileObj.file) {
			try {
				return await fileObj.file.text();
			} catch (e) {
				console.error('Failed to read file text content:', fileObj.file.name, e);
				return '';
			}
		}
		return '';
	};

	const scriptFiles = [];
	if (draft.enableScripts) {
		const activeFiles = draft.scriptFiles ? draft.scriptFiles.filter((f) => f.name.trim().length > 0) : [];
		for (const f of activeFiles) {
			scriptFiles.push({
				name: f.name.trim(),
				content: await readTextFile(f)
			});
		}
	}

	const refFiles = [];
	if (draft.enableReferences) {
		const activeFiles = draft.refFiles ? draft.refFiles.filter((f) => f.name.trim().length > 0) : [];
		for (const f of activeFiles) {
			refFiles.push({
				name: f.name.trim(),
				description: f.description.trim(),
				content: await readTextFile(f)
			});
		}
	}

	const assetFiles = [];
	if (draft.enableAssets) {
		const activeFiles = draft.assetFiles ? draft.assetFiles.filter((f) => f.name.trim().length > 0) : [];
		for (const f of activeFiles) {
			assetFiles.push({
				name: f.name.trim(),
				kind: f.kind,
				content: await readTextFile(f)
			});
		}
	}

	return {
		name: draft.validName,
		description: draft.description,
		author: authorUsername.trim().startsWith('@')
			? authorUsername.trim()
			: `@${authorUsername.trim()}`,
		tag: 'dev', // Default community skill tag, can be adjusted by reviewers or in the JSON
		license: draft.license || undefined,
		compatibility: draft.compatibility || undefined,
		allowedTools: draft.allowedTools || undefined,
		body: draft.body,
		enableScripts: draft.enableScripts,
		scriptLanguages: draft.scriptLanguages,
		scriptFiles,
		enableReferences: draft.enableReferences,
		refFiles,
		enableAssets: draft.enableAssets,
		assetKinds: draft.assetKinds,
		assetFiles
	};
}

/**
 * Builds the GitHub URL for creating a new file in the community registry.
 * Pre-populates the filename, file contents (JSON string), and commit message.
 */
export function getGithubPrUrl(registrySkill: RegistrySkill): string {
	const filename = `src/lib/registry/${registrySkill.name}.json`;
	const value = JSON.stringify(registrySkill, null, 2);
	const message = `Add community skill: ${registrySkill.name}`;

	const baseUrl = `https://github.com/gurbaxani/agent-skill-generator/new/main`;
	const params = new URLSearchParams();
	params.append('filename', filename);
	params.append('value', value);
	params.append('message', message);

	return `${baseUrl}?${params.toString()}`;
}
