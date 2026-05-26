import JSZip from 'jszip';
import type { SkillDraftState } from '$lib/state/draft.svelte';
import type { Skill } from '$lib/types';
import { serializeSkill } from '$lib/parse-skill';

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
			const activeFiles = draft.scriptFiles
				? draft.scriptFiles.filter((f) => f.name.trim().length > 0)
				: [];
			if (activeFiles.length > 0) {
				for (const file of activeFiles) {
					const fileName = file.name.trim();
					if (file.file) {
						scriptsFolder.file(fileName, file.file);
					} else if (file.content !== undefined) {
						scriptsFolder.file(fileName, file.content);
					} else {
						scriptsFolder.file(fileName, `\n`);
					}
				}
			}
			if (draft.scriptLanguages && draft.scriptLanguages.length > 0) {
				for (const lang of draft.scriptLanguages) {
					if (lang === 'python' && !activeFiles.some((f) => f.name.trim() === 'main.py')) {
						scriptsFolder.file(
							'main.py',
							`#!/usr/bin/env python3\n"""\nPython script for skill: ${draft.name}\n"""\n\ndef main():\n    print("Hello from ${draft.name} script!")\n\nif __name__ == "__main__":\n    main()\n`
						);
					} else if (lang === 'bash' && !activeFiles.some((f) => f.name.trim() === 'run.sh')) {
						scriptsFolder.file(
							'run.sh',
							`#!/bin/bash\n# Bash script for skill: ${draft.name}\n\nset -euo pipefail\n\necho "Running ${draft.name} script..."\n`
						);
					} else if (
						lang === 'javascript' &&
						!activeFiles.some((f) => f.name.trim() === 'index.js')
					) {
						scriptsFolder.file(
							'index.js',
							`#!/usr/bin/env node\n/**\n * JavaScript script for skill: ${draft.name}\n */\n\nconsole.log("Running ${draft.name} script...");\n`
						);
					} else if (lang === 'other' && !activeFiles.some((f) => f.name.trim() === 'script.txt')) {
						scriptsFolder.file('script.txt', `Placeholder for custom script runtime.\n`);
					}
				}
			}
			if (
				activeFiles.length === 0 &&
				(!draft.scriptLanguages || draft.scriptLanguages.length === 0)
			) {
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
					let fileName = file.name.trim();
					if (!fileName.toLowerCase().endsWith('.md')) {
						fileName += '.md';
					}
					if (file.file) {
						referencesFolder.file(fileName, file.file);
					} else if (file.content !== undefined) {
						referencesFolder.file(fileName, file.content);
					} else {
						referencesFolder.file(
							fileName,
							`# ${fileName}\n\n${file.description.trim() || 'Reference documentation placeholder.'}\n`
						);
					}
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
			const activeFiles = draft.assetFiles
				? draft.assetFiles.filter((f) => f.name.trim().length > 0)
				: [];
			const writtenKinds = new Set<string>();

			if (activeFiles.length > 0) {
				for (const file of activeFiles) {
					const fileName = file.name.trim();
					const kind = file.kind || 'data';
					writtenKinds.add(kind);
					const kindFolder = assetsFolder.folder(kind) || assetsFolder;
					if (file.file) {
						kindFolder.file(fileName, file.file);
					} else if (file.content !== undefined) {
						kindFolder.file(fileName, file.content);
					} else {
						kindFolder.file(fileName, `\n`);
					}
				}
			}

			if (draft.assetKinds && draft.assetKinds.length > 0) {
				for (const kind of draft.assetKinds) {
					const kindFolder = assetsFolder.folder(kind);
					if (kindFolder && !writtenKinds.has(kind)) {
						kindFolder.file('.gitkeep', '');
					}
				}
			} else if (activeFiles.length === 0) {
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

export async function downloadSkillAsZip(skill: Skill): Promise<void> {
	const zip = new JSZip();
	const folderName =
		skill.name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-+/, '')
			.slice(0, 63) || 'skill';

	const skillFolder = zip.folder(folderName);
	if (!skillFolder) {
		throw new Error('Failed to create skill folder in ZIP archive.');
	}

	const serialized = serializeSkill(skill);
	skillFolder.file('SKILL.md', serialized);

	const content = await zip.generateAsync({ type: 'blob' });
	const url = URL.createObjectURL(content);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${folderName}.zip`;
	a.click();
	URL.revokeObjectURL(url);
}
