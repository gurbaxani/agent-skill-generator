import matter from 'gray-matter';
import type { Skill } from '$lib/types';
import type { SkillDraftState } from '$lib/state/draft.svelte';

/**
 * Parses raw SKILL.md contents into a Skill object.
 * Maps 'allowed-tools' in YAML frontmatter to allowedTools, and trims the body.
 */
export function parseSkill(raw: string): Skill {
	const { data, content } = matter(raw);

	const skill: Skill = {
		name: data.name !== undefined ? String(data.name) : '',
		description: data.description !== undefined ? String(data.description) : '',
		license: data.license !== undefined ? String(data.license) : '',
		author: data.author !== undefined ? String(data.author) : '',
		body: content.trim()
	};

	if (data.compatibility !== undefined) {
		skill.compatibility = String(data.compatibility);
	}
	if (data['allowed-tools'] !== undefined) {
		skill.allowedTools = String(data['allowed-tools']);
	}
	if (data.version !== undefined) {
		skill.version = String(data.version);
	}
	if (data.tags !== undefined) {
		skill.tags = Array.isArray(data.tags) ? data.tags.map(String) : [String(data.tags)];
	}

	return skill;
}

/**
 * Serializes a Skill object back to SKILL.md format with YAML frontmatter.
 * Maps allowedTools back to 'allowed-tools', and omits undefined optional fields.
 */
export function serializeSkill(skill: Skill): string {
	const data: Record<string, unknown> = {
		name: skill.name,
		description: skill.description,
		license: skill.license,
		author: skill.author
	};

	if (skill.compatibility !== undefined) {
		data.compatibility = skill.compatibility;
	}
	if (skill.allowedTools !== undefined) {
		data['allowed-tools'] = skill.allowedTools;
	}
	if (skill.version !== undefined) {
		data.version = skill.version;
	}
	if (skill.tags !== undefined) {
		data.tags = skill.tags;
	}

	const yamlLines: string[] = ['---'];
	for (const [key, value] of Object.entries(data)) {
		if (value === undefined || value === null) continue;
		if (Array.isArray(value)) {
			yamlLines.push(`${key}:`);
			for (const item of value) {
				yamlLines.push(`  - ${escapeYamlValue(String(item))}`);
			}
		} else {
			yamlLines.push(`${key}: ${escapeYamlValue(String(value))}`);
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
	const author = draft.metadata.find((m) => m.key === 'author')?.value || '';
	const version = draft.metadata.find((m) => m.key === 'version')?.value || undefined;
	const tagsEntry = draft.metadata.find((m) => m.key === 'tags' || m.key === 'tag');
	let tags: string[] | undefined = undefined;
	if (tagsEntry) {
		tags = tagsEntry.value.split(',').map((t) => t.trim()).filter(Boolean);
	}

	const skill: Skill = {
		name: draft.validName,
		description: draft.description,
		license: draft.license || 'MIT',
		author: author,
		body: draft.body
	};

	if (draft.compatibility) {
		skill.compatibility = draft.compatibility;
	}
	if (draft.allowedTools) {
		skill.allowedTools = draft.allowedTools;
	}
	if (version) {
		skill.version = version;
	}
	if (tags) {
		skill.tags = tags;
	}

	return skill;
}
