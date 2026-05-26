import { redirect } from '@sveltejs/kit';
import { parseSkill } from '$lib/parse-skill';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
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

	// Support legacy URLs like /browse?skill=Agentic+Search+Optimizer
	const legacySkillName = url.searchParams.get('skill');
	if (!params.slug && legacySkillName) {
		const match = skills.find(
			(s) =>
				s.name.toLowerCase() === legacySkillName.toLowerCase() ||
				s.slug.toLowerCase() === legacySkillName.toLowerCase()
		);
		if (match) {
			redirect(301, `/browse/${match.slug}`);
		}
	}

	return {
		skills,
		slug: params.slug
	};
};
