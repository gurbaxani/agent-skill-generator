import type { Skill } from '$lib/types';
import type { SkillDraftState } from '$lib/state/draft.svelte';

function unescapeYamlValue(val: string): string {
	if (val.startsWith('"') && val.endsWith('"')) {
		return val
			.slice(1, -1)
			.replace(/\\"/g, '"')
			.replace(/\\n/g, '\n')
			.replace(/\\\\/g, '\\');
	}
	if (val.startsWith("'") && val.endsWith("'")) {
		return val.slice(1, -1);
	}
	return val;
}

export function parseFrontmatter(raw: string): { data: Record<string, any>; content: string } {
	const lines = raw.split('\n');
	if (lines.length === 0 || lines[0].trim() !== '---') {
		return { data: {}, content: raw };
	}

	let frontmatterEndIndex = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === '---') {
			frontmatterEndIndex = i;
			break;
		}
	}

	if (frontmatterEndIndex === -1) {
		return { data: {}, content: raw };
	}

	const fmLines = lines.slice(1, frontmatterEndIndex);
	const content = lines.slice(frontmatterEndIndex + 1).join('\n');

	const data: Record<string, any> = {};
	let currentParentKey: string | null = null;

	for (const line of fmLines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		const isIndented = line.startsWith(' ') || line.startsWith('\t');

		if (isIndented && currentParentKey) {
			const match = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
			if (match) {
				const key = match[1];
				const val = unescapeYamlValue(match[2]);
				if (!data[currentParentKey]) {
					data[currentParentKey] = {};
				}
				data[currentParentKey][key] = val;
			}
		} else {
			const match = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
			if (match) {
				const key = match[1];
				const val = match[2];

				if (val === '' && (trimmed.endsWith(':') || trimmed.endsWith(': '))) {
					currentParentKey = key;
					data[key] = {};
				} else {
					currentParentKey = null;
					data[key] = unescapeYamlValue(val);
				}
			}
		}
	}

	return { data, content };
}

/**
 * Parses raw SKILL.md contents into a Skill object.
 * Maps 'allowed-tools' in YAML frontmatter to allowedTools, and trims the body.
 */
export function parseSkill(raw: string): Skill {
	const { data, content } = parseFrontmatter(raw);

	const skill: Skill = {
		name: data.name !== undefined ? String(data.name) : '',
		description: data.description !== undefined ? String(data.description) : '',
		body: content.trim()
	};

	if (data.license !== undefined) {
		skill.license = String(data.license);
	}
	if (data.compatibility !== undefined) {
		skill.compatibility = String(data.compatibility);
	}
	if (data['allowed-tools'] !== undefined) {
		skill.allowedTools = String(data['allowed-tools']);
	}
	if (data.metadata !== undefined && data.metadata !== null) {
		const metadata: Record<string, string> = {};
		for (const [k, v] of Object.entries(data.metadata)) {
			metadata[k] = String(v);
		}
		skill.metadata = metadata;
	}

	return skill;
}

/**
 * Serializes a Skill object back to SKILL.md format with YAML frontmatter.
 * Maps allowedTools back to 'allowed-tools', and omits undefined optional fields.
 */
export function serializeSkill(skill: Skill): string {
	const yamlLines: string[] = ['---'];

	yamlLines.push(`name: ${escapeYamlValue(skill.name)}`);
	yamlLines.push(`description: ${escapeYamlValue(skill.description)}`);

	if (skill.license !== undefined) {
		yamlLines.push(`license: ${escapeYamlValue(skill.license)}`);
	}
	if (skill.compatibility !== undefined) {
		yamlLines.push(`compatibility: ${escapeYamlValue(skill.compatibility)}`);
	}
	if (skill.allowedTools !== undefined) {
		yamlLines.push(`allowed-tools: ${escapeYamlValue(skill.allowedTools)}`);
	}

	if (skill.metadata !== undefined && Object.keys(skill.metadata).length > 0) {
		yamlLines.push('metadata:');
		for (const [key, value] of Object.entries(skill.metadata)) {
			yamlLines.push(`  ${key}: ${escapeYamlValue(value)}`);
		}
	}

	yamlLines.push('---');

	return yamlLines.join('\n') + '\n' + skill.body;
}

function escapeYamlValue(str: string): string {
	return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

/**
 * Converts a SkillDraftState form state object into a Skill object.
 */
export function draftToSkill(draft: SkillDraftState): Skill {
	const skill: Skill = {
		name: draft.validName,
		description: draft.description,
		body: draft.body
	};

	if (draft.license) {
		skill.license = draft.license;
	}
	if (draft.compatibility) {
		skill.compatibility = draft.compatibility;
	}
	if (draft.allowedTools) {
		skill.allowedTools = draft.allowedTools;
	}

	const metadata: Record<string, string> = {};
	for (const m of draft.metadata) {
		if (m.key && m.value) {
			metadata[m.key] = m.value;
		}
	}
	if (Object.keys(metadata).length > 0) {
		skill.metadata = metadata;
	}

	return skill;
}
