import fs from 'fs';
import path from 'path';
import { parseSkill } from '$lib/parse-skill';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const skillsDir = path.resolve('static/skills');
	const filenames = fs.readdirSync(skillsDir).filter((fn) => fn.endsWith('.md'));
	const skills = filenames.map((filename) => {
		const raw = fs.readFileSync(path.join(skillsDir, filename), 'utf-8');
		return parseSkill(raw);
	});

	return {
		skills
	};
};
