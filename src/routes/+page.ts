import { parseSkill } from '$lib/parse-skill';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const modules = import.meta.glob('/static/skills/*.md', { query: '?raw', eager: true }) as Record<
		string,
		{ default: string }
	>;

	const skills = Object.values(modules).map((mod) => parseSkill(mod.default));

	return {
		skills
	};
};
