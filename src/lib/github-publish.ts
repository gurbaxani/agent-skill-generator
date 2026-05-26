import { serializeSkill } from './parse-skill';
import type { Skill } from './types';

/**
 * Publishes a skill directly to the community registry on GitHub.
 * Returns the HTML URL of the created/updated file.
 */
export async function publishSkill(skill: Skill, token: string): Promise<string> {
	const markdown = serializeSkill(skill);
	const base64Content = btoa(unescape(encodeURIComponent(markdown)));

	const OWNER = 'gurbaxani';
	const REPO = 'agent-skill-generator';
	const UPSTREAM_BRANCH = 'trunk';

	// 1. Get the latest commit SHA of upstream repository's trunk branch
	const trunkRes = await fetch(
		`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${UPSTREAM_BRANCH}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github.v3+json',
				'User-Agent': 'ASG-App'
			}
		}
	);
	if (!trunkRes.ok) {
		const text = await trunkRes.text();
		throw new Error(`Failed to get upstream default branch info: ${text}`);
	}
	const trunkData = (await trunkRes.json()) as { object: { sha: string } };
	const upstreamSha = trunkData.object.sha;

	// 2. Fork the repository
	const forkRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/forks`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github.v3+json',
			'Content-Type': 'application/json',
			'User-Agent': 'ASG-App'
		}
	});
	if (!forkRes.ok) {
		const text = await forkRes.text();
		throw new Error(`Failed to fork repository: ${text}`);
	}
	const forkData = (await forkRes.json()) as {
		name: string;
		owner: { login: string };
	};
	const forkOwner = forkData.owner.login;
	const forkRepo = forkData.name;

	// Define branch and path names
	let author = (skill.metadata?.author || '').trim().replace(/^@/, '');
	if (!author) {
		try {
			const userRes = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github.v3+json',
					'User-Agent': 'ASG-App'
				}
			});
			if (userRes.ok) {
				const userData = (await userRes.json()) as { login: string };
				author = userData.login.trim();
			}
		} catch (e) {
			console.warn('Failed to fetch authenticated user details:', e);
		}
	}

	const authorClean =
		author
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9_-]/g, '') || 'anonymous';
	const nameClean =
		skill.name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9_-]/g, '') || 'untitled-skill';
	const timestamp = Date.now();
	const branchName = `registry/submit-${nameClean}-${timestamp}`;
	const filepath = `community/${authorClean}/${nameClean}.md`;

	// Helper delay function
	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	// 3. Create branch on the user's fork with retry logic (waiting for fork to be ready)
	let branchCreated = false;
	for (let attempt = 1; attempt <= 6; attempt++) {
		const branchRes = await fetch(
			`https://api.github.com/repos/${forkOwner}/${forkRepo}/git/refs`,
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
					sha: upstreamSha
				})
			}
		);
		if (branchRes.ok) {
			branchCreated = true;
			break;
		}
		if (branchRes.status === 404 || branchRes.status === 409 || branchRes.status === 422) {
			console.warn(
				`Fork or reference not ready (status ${branchRes.status}), retrying branch creation (attempt ${attempt}/6)...`
			);
			await delay(2000);
		} else {
			const text = await branchRes.text();
			throw new Error(`Failed to create branch on fork: ${text}`);
		}
	}
	if (!branchCreated) {
		throw new Error(`Failed to create branch on fork: timed out waiting for fork creation.`);
	}

	// 4. Check for existing file SHA on the new branch in the fork
	let existingSha: string | undefined = undefined;
	try {
		const checkRes = await fetch(
			`https://api.github.com/repos/${forkOwner}/${forkRepo}/contents/${filepath}?ref=${branchName}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github.v3+json',
					'User-Agent': 'ASG-App'
				}
			}
		);
		if (checkRes.ok) {
			const checkData = (await checkRes.json()) as { sha: string };
			existingSha = checkData.sha;
		}
	} catch (err) {
		console.warn('Failed to check existing file SHA, writing without SHA:', err);
	}

	// 5. Commit the file contents to the branch on the fork
	const commitRes = await fetch(
		`https://api.github.com/repos/${forkOwner}/${forkRepo}/contents/${filepath}`,
		{
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
				branch: branchName,
				...(existingSha ? { sha: existingSha } : {})
			})
		}
	);
	if (!commitRes.ok) {
		const text = await commitRes.text();
		throw new Error(`Failed to commit file to fork repository: ${text}`);
	}

	// 6. Submit the Pull Request to the upstream repository
	const prRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github.v3+json',
			'Content-Type': 'application/json',
			'User-Agent': 'ASG-App'
		},
		body: JSON.stringify({
			title: `Add community skill: ${skill.name} by @${authorClean}`,
			head: `${forkOwner}:${branchName}`,
			base: UPSTREAM_BRANCH,
			body: `### New Skill Submission\n\n- **Skill Name**: ${skill.name}\n- **Author**: @${authorClean}\n- **Description**: ${skill.metadata?.description || skill.description || 'No description provided.'}\n\n*Created automatically via the Agent Skill Generator web dashboard.*`
		})
	});
	if (!prRes.ok) {
		const text = await prRes.text();
		throw new Error(`Failed to open Pull Request: ${text}`);
	}

	const prData = (await prRes.json()) as { html_url: string };
	return prData.html_url;
}
