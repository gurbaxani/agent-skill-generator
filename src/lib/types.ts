export type Skill = {
	slug?: string;
	name: string;
	description: string;
	license?: string;
	compatibility?: string;
	allowedTools?: string;
	metadata?: Record<string, string>;
	body: string;
};
