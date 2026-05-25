export type Skill = {
	name: string;
	description: string;
	license: string;
	compatibility?: string;
	allowedTools?: string;
	author: string;
	version?: string;
	tags?: string[];
	body: string;
};
