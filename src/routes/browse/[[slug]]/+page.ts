import { parseSkill } from '$lib/parse-skill';
import type { EntryGenerator, PageLoad } from './$types';

const modules = import.meta.glob('../../../lib/skills/*.md', {
	query: '?raw',
	eager: true
}) as Record<string, { default: string }>;

export const entries: EntryGenerator = () => {
	const slugs = Object.keys(modules).map((path) => ({
		slug: path.split('/').pop()?.replace(/\.md$/, '') || ''
	}));
	return [{ slug: '' }, ...slugs];
};

export const load: PageLoad = async ({ params }) => {
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
