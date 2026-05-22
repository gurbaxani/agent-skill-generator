import JSZip from 'jszip';
import type { SkillDraftState } from '$lib/state/draft.svelte';

/**
 * Generates a structured .zip file for the skill draft and triggers a browser download.
 * Structure:
 * [skill-name]/
 * ├── SKILL.md
 * ├── scripts/ (optional)
 * ├── references/ (optional)
 * └── assets/ (optional)
 */
export async function downloadSkillZip(draft: SkillDraftState): Promise<void> {
	const zip = new JSZip();
	const folderName = draft.validName || 'my-skill';
	const skillFolder = zip.folder(folderName);
	if (!skillFolder) {
		throw new Error('Failed to create skill folder in ZIP archive.');
	}

	// 1. Required: SKILL.md
	skillFolder.file('SKILL.md', draft.assembledMarkdown);

	// 2. Optional: scripts/
	if (draft.enableScripts) {
		const scriptsFolder = skillFolder.folder('scripts');
		if (scriptsFolder) {
			if (draft.scriptLanguages && draft.scriptLanguages.length > 0) {
				for (const lang of draft.scriptLanguages) {
					if (lang === 'python') {
						scriptsFolder.file(
							'main.py',
							`#!/usr/bin/env python3\n"""\nPython script for skill: ${draft.name}\n"""\n\ndef main():\n    print("Hello from ${draft.name} script!")\n\nif __name__ == "__main__":\n    main()\n`
						);
					} else if (lang === 'bash') {
						scriptsFolder.file(
							'run.sh',
							`#!/bin/bash\n# Bash script for skill: ${draft.name}\n\nset -euo pipefail\n\necho "Running ${draft.name} script..."\n`
						);
					} else if (lang === 'javascript') {
						scriptsFolder.file(
							'index.js',
							`#!/usr/bin/env node\n/**\n * JavaScript script for skill: ${draft.name}\n */\n\nconsole.log("Running ${draft.name} script...");\n`
						);
					} else {
						scriptsFolder.file('script.txt', `Placeholder for custom script runtime.\n`);
					}
				}
			} else {
				scriptsFolder.file(
					'README.md',
					`# Scripts\n\nPlace your executable scripts in this directory.\n`
				);
			}
		}
	}

	// 3. Optional: references/
	if (draft.enableReferences) {
		const referencesFolder = skillFolder.folder('references');
		if (referencesFolder) {
			const activeFiles = draft.refFiles.filter((f) => f.name.trim().length > 0);
			if (activeFiles.length > 0) {
				for (const file of activeFiles) {
					const fileName = file.name.trim();
					referencesFolder.file(
						fileName,
						`# ${fileName}\n\n${file.description.trim() || 'Reference documentation placeholder.'}\n`
					);
				}
			} else {
				referencesFolder.file(
					'README.md',
					`# References\n\nPlace reference documentation in this directory.\n`
				);
			}
		}
	}

	// 4. Optional: assets/
	if (draft.enableAssets) {
		const assetsFolder = skillFolder.folder('assets');
		if (assetsFolder) {
			if (draft.assetKinds && draft.assetKinds.length > 0) {
				for (const kind of draft.assetKinds) {
					const kindFolder = assetsFolder.folder(kind);
					if (kindFolder) {
						kindFolder.file('.gitkeep', '');
					}
				}
			} else {
				assetsFolder.file(
					'README.md',
					`# Assets\n\nPlace static resources (templates, images, data files) in this directory.\n`
				);
			}
		}
	}

	// Generate the ZIP blob and download it
	const content = await zip.generateAsync({ type: 'blob' });
	const url = URL.createObjectURL(content);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${folderName}.zip`;
	a.click();
	URL.revokeObjectURL(url);
}
