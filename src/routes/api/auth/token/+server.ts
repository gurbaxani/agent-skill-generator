import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code } = await request.json();
		if (!code) {
			return json({ error: 'Missing authorization code' }, { status: 400 });
		}

		const clientId = env.GITHUB_CLIENT_ID || 'dummy_client_id';
		const clientSecret = env.GITHUB_CLIENT_SECRET || 'dummy_client_secret';

		const res = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'User-Agent': 'ASG-App'
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code
			})
		});

		if (!res.ok) {
			const text = await res.text();
			return json({ error: `GitHub API error: ${text}` }, { status: res.status });
		}

		const data = (await res.json()) as {
			access_token?: string;
			error?: string;
			error_description?: string;
		};

		if (data.error) {
			return json(
				{ error: data.error_description || data.error },
				{ status: 400 }
			);
		}

		return json({ access_token: data.access_token });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ error: `Internal Server Error: ${message}` }, { status: 500 });
	}
};
