import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const OWNER = 'gurbaxani';
const REPO = 'agent-skill-generator';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { skill, authorUsername } = await request.json();

		if (!skill || !skill.name) {
			return json({ error: 'Invalid or missing skill definition' }, { status: 400 });
		}

		if (!authorUsername || !authorUsername.trim()) {
			return json({ error: 'Missing author username' }, { status: 400 });
		}

		// Retrieve token from Cloudflare environment variables
		const token = env.GITHUB_PAT || env.GITHUB_TOKEN;
		if (!token) {
			return json(
				{
					error: 'GitHub Integration is not configured. Please define GITHUB_PAT on Cloudflare Pages.'
				},
				{ status: 501 }
			);
		}

		const cleanUsername = authorUsername.trim().replace(/^@/, '');
		const cleanSkillName = skill.name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
		const timestamp = Date.now();
		const branchName = `registry/submit-${cleanSkillName}-${timestamp}`;

		// 1. Get latest commit SHA from the trunk branch
		const refRes = await fetch(
			`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/trunk`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github.v3+json',
					'User-Agent': 'ASG-App'
				}
			}
		);

		if (!refRes.ok) {
			const text = await refRes.text();
			return json(
				{ error: `Failed to retrieve base main branch commit: ${text}` },
				{ status: refRes.status }
			);
		}

		const refData = (await refRes.json()) as { object: { sha: string } };
		const mainBranchSha = refData.object.sha;

		// 2. Create a new branch pointing to that SHA
		const branchRes = await fetch(
			`https://api.github.com/repos/${OWNER}/${REPO}/git/refs`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github.v3+json',
					'Content-Type': 'application/json',
					'User-Agent': 'ASG-App'
				},
				body: JSON.stringify({
					ref: `refs/heads/${branchName}`,
					sha: mainBranchSha
				})
			}
		);

		if (!branchRes.ok) {
			const text = await branchRes.text();
			return json(
				{ error: `Failed to create a submission branch: ${text}` },
				{ status: branchRes.status }
			);
		}

		// 3. Commit the skill registry JSON file to the new branch
		const filename = `src/lib/registry/${cleanSkillName}.json`;
		// Safely encode Unicode characters into base64 for GitHub API
		const serializedPayload = JSON.stringify(skill, null, 2);
		const base64Content = btoa(unescape(encodeURIComponent(serializedPayload)));

		// Check if the file already exists on the target branch (inherited from base) to get its SHA for updates
		let existingSha: string | undefined = undefined;
		const fileCheckRes = await fetch(
			`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filename}?ref=${branchName}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github.v3+json',
					'User-Agent': 'ASG-App'
				}
			}
		);
		if (fileCheckRes.ok) {
			const fileCheckData = (await fileCheckRes.json()) as { sha: string };
			existingSha = fileCheckData.sha;
		}

		const commitRes = await fetch(
			`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filename}`,
			{
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github.v3+json',
					'Content-Type': 'application/json',
					'User-Agent': 'ASG-App'
				},
				body: JSON.stringify({
					message: `Add community skill: ${skill.name} by @${cleanUsername}`,
					content: base64Content,
					branch: branchName,
					...(existingSha ? { sha: existingSha } : {})
				})
			}
		);

		if (!commitRes.ok) {
			const text = await commitRes.text();
			return json(
				{ error: `Failed to commit registry skill JSON file: ${text}` },
				{ status: commitRes.status }
			);
		}

		// 4. Open a Pull Request from our branch to main
		const prRes = await fetch(
			`https://api.github.com/repos/${OWNER}/${REPO}/pulls`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github.v3+json',
					'Content-Type': 'application/json',
					'User-Agent': 'ASG-App'
				},
				body: JSON.stringify({
					title: `Add community skill: ${skill.name} by @${cleanUsername}`,
					head: branchName,
					base: 'trunk',
					body: `### New Skill Submission\n\n- **Skill Name**: ${skill.name}\n- **Author**: @${cleanUsername}\n- **Description**: ${skill.description || 'No description provided.'}\n\n*Created automatically via the Agent Skill Generator web dashboard.*`
				})
			}
		);

		if (!prRes.ok) {
			const text = await prRes.text();
			return json(
				{ error: `Failed to open a GitHub Pull Request: ${text}` },
				{ status: prRes.status }
			);
		}

		const prData = (await prRes.json()) as { html_url: string };

		return json({ prUrl: prData.html_url });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ error: `Internal Server Error: ${message}` }, { status: 500 });
	}
};
