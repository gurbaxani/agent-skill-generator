import { parseSkill } from '$lib/parse-skill';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const modules = import.meta.glob('../../../lib/skills/*.md', {
		query: '?raw',
		eager: true
	}) as Record<string, { default: string }>;

	const skills = Object.entries(modules).map(([path, mod]) => {
		const slug = path.split('/').pop()?.replace(/\.md$/, '') || '';
		return {
			...parseSkill(mod.default),
			slug
		};
	});

	return {
		skills,
		slug: params.slug
	};
};
