import { serializeSkill } from './parse-skill';
import type { Skill } from './types';

/**
 * Publishes a skill directly to the community registry on GitHub.
 * Returns the HTML URL of the created/updated file.
 */
export async function publishSkill(skill: Skill, token: string): Promise<string> {
	const markdown = serializeSkill(skill);
	const base64Content = btoa(unescape(encodeURIComponent(markdown)));

	const authorClean = skill.author.trim().replace(/^@/, '');
	const nameClean = skill.name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
	const url = `https://api.github.com/repos/gurbaxani/agent-skill-generator/contents/community/${authorClean}/${nameClean}.md`;

	// Check for existing file to get its SHA (for update support)
	let existingSha: string | undefined = undefined;
	try {
		const checkRes = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github.v3+json',
				'User-Agent': 'ASG-App'
			}
		});
		if (checkRes.ok) {
			const checkData = (await checkRes.json()) as { sha: string };
			existingSha = checkData.sha;
		}
	} catch (err) {
		console.warn('Failed to check existing file SHA, writing without SHA:', err);
	}

	// PUT the file contents
	const commitRes = await fetch(url, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github.v3+json',
			'Content-Type': 'application/json',
			'User-Agent': 'ASG-App'
		},
		body: JSON.stringify({
			message: `Add community skill: ${skill.name} by @${authorClean}`,
			content: base64Content,
			branch: 'trunk',
			...(existingSha ? { sha: existingSha } : {})
		})
	});

	if (!commitRes.ok) {
		const text = await commitRes.text();
		throw new Error(`GitHub commit failed (${commitRes.status}): ${text}`);
	}

	const commitData = (await commitRes.json()) as { content: { html_url: string } };
	return commitData.content.html_url;
}
