export type Skill = {
	name: string;
	description: string;
	license?: string;
	compatibility?: string;
	allowedTools?: string;
	metadata?: Record<string, string>;
	body: string;
};
