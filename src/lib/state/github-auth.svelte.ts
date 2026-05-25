class GithubAuthState {
	token = $state<string | null>(null);
	username = $state<string | null>(null);
}

export const githubAuth = new GithubAuthState();
