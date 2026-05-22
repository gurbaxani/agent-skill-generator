export interface RegistryRefFile {
	name: string;
	description: string;
	content?: string;
}

export interface RegistryScriptFile {
	name: string;
	content?: string;
}

export interface RegistryAssetFile {
	name: string;
	kind: string;
	content?: string;
}

export interface RegistrySkill {
	name: string;
	description: string;
	author: string;
	tag: string;
	license?: string;
	compatibility?: string;
	allowedTools?: string;
	body?: string;
	enableScripts?: boolean;
	scriptLanguages?: string[];
	scriptFiles?: RegistryScriptFile[];
	enableReferences?: boolean;
	refFiles?: RegistryRefFile[];
	enableAssets?: boolean;
	assetKinds?: string[];
	assetFiles?: RegistryAssetFile[];
}

export function getRegistrySkills(): RegistrySkill[] {
	const modules = import.meta.glob('./registry/*.json', { eager: true });
	return Object.values(modules).map((mod: any) => mod.default as RegistrySkill);
}
