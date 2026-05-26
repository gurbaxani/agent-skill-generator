export interface MetaEntry {
	key: string;
	value: string;
	id: number;
}

export interface RefFile {
	name: string;
	description: string;
	id: number;
	file?: File;
	content?: string;
	size?: number;
}

export interface ScriptFile {
	name: string;
	id: number;
	file?: File;
	content?: string;
	size?: number;
}

export interface AssetFile {
	name: string;
	id: number;
	kind: AssetKind;
	file?: File;
	content?: string;
	size?: number;
}

export type ScriptLanguage = 'python' | 'bash' | 'javascript' | 'other';
export type AssetKind = 'templates' | 'images' | 'data';

export class SkillDraftState {
	name = $state('');
	description = $state('');
	license = $state('');
	compatibility = $state('');
	metadata = $state<MetaEntry[]>([
		{ key: 'author', value: '', id: 1 },
		{ key: 'version', value: '1.0', id: 2 }
	]);
	nextMetaId = 3;
	allowedTools = $state('');
	body = $state('');

	enableScripts = $state(false);
	scriptLanguages = $state<ScriptLanguage[]>(['python', 'bash']);
	scriptFiles = $state<ScriptFile[]>([]);
	nextScriptId = 1;

	enableReferences = $state(false);
	refFiles = $state<RefFile[]>([
		{ name: 'REFERENCE.md', description: 'Detailed technical reference', id: 1 }
	]);
	nextRefId = 2;

	enableAssets = $state(false);
	assetKinds = $state<AssetKind[]>([]);
	assetFiles = $state<AssetFile[]>([]);
	nextAssetId = 1;

	// Validation helpers
	get validName(): string {
		return this.name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-+/, '')
			.slice(0, 63);
	}

	get isValidRequired(): boolean {
		return (
			this.validName.length > 0 && this.description.length > 0 && this.description.length <= 1024
		);
	}

	get isValidOptional(): boolean {
		return this.compatibility.length <= 500;
	}

	get isValidBody(): boolean {
		return this.body.trim().length > 0;
	}

	get isValid(): boolean {
		return this.isValidRequired && this.isValidOptional && this.isValidBody;
	}

	reset(): void {
		this.name = '';
		this.description = '';
		this.license = '';
		this.compatibility = '';
		this.metadata = [
			{ key: 'author', value: '', id: 1 },
			{ key: 'version', value: '1.0', id: 2 }
		];
		this.nextMetaId = 3;
		this.allowedTools = '';
		this.body = '';
		this.enableScripts = false;
		this.scriptLanguages = ['python', 'bash'];
		this.scriptFiles = [];
		this.nextScriptId = 1;
		this.enableReferences = false;
		this.refFiles = [{ name: 'REFERENCE.md', description: 'Detailed technical reference', id: 1 }];
		this.nextRefId = 2;
		this.enableAssets = false;
		this.assetKinds = [];
		this.assetFiles = [];
		this.nextAssetId = 1;
	}

	get assembledMarkdown(): string {
		const lines: string[] = ['---'];
		lines.push(`name: ${this.validName}`);
		if (this.description) {
			lines.push(`description: "${this.description.replace(/"/g, '\\"')}"`);
		}
		if (this.license) {
			lines.push(`license: ${this.license}`);
		}
		if (this.compatibility) {
			lines.push(`compatibility: "${this.compatibility.replace(/"/g, '\\"')}"`);
		}
		if (this.allowedTools) {
			lines.push(`allowed-tools: ${this.allowedTools}`);
		}
		const metaObj: Record<string, string> = {};
		for (const m of this.metadata) {
			if (m.key && m.value) metaObj[m.key] = m.value;
		}
		if (Object.keys(metaObj).length > 0) {
			lines.push('metadata:');
			for (const [k, v] of Object.entries(metaObj)) {
				lines.push(`  ${k}: "${v.replace(/"/g, '\\"')}"`);
			}
		}
		lines.push('---');

		const docIndexHeader = `> ## Documentation Index
> Fetch the complete documentation index at: https://agentskills.io/llms.txt
> Use this file to discover all available pages before exploring further.`;

		let cleanedBody = this.body.trim();
		if (cleanedBody.startsWith('> ## Documentation Index')) {
			const bodyLines = cleanedBody.split('\n');
			let lastHeaderLine = -1;
			for (let i = 0; i < bodyLines.length; i++) {
				if (bodyLines[i].includes('discover all available pages before exploring further.')) {
					lastHeaderLine = i;
					break;
				}
			}
			if (lastHeaderLine !== -1) {
				cleanedBody = bodyLines
					.slice(lastHeaderLine + 1)
					.join('\n')
					.trim();
			}
		}

		lines.push(docIndexHeader);
		if (cleanedBody) {
			lines.push('');
			lines.push(cleanedBody);
		}
		return lines.join('\n');
	}
}

export const skillDraft = new SkillDraftState();
