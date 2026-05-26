/**
 * Clean and parse JSON response text from LLM.
 * Handles markdown code block wrapping, leading/trailing conversation text, etc.
 */
export function extractAndParseJson<T>(text: string): T {
	const trimmed = text.trim();

	// 1. Try regex to extract standard code blocks
	const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
	const match = trimmed.match(codeBlockRegex);
	const jsonStr = match ? match[1].trim() : trimmed;

	// 2. Try JSON.parse directly. If it fails, try slicing from the first '{' to the last '}'
	try {
		return JSON.parse(jsonStr) as T;
	} catch (firstErr) {
		const firstBrace = jsonStr.indexOf('{');
		const lastBrace = jsonStr.lastIndexOf('}');
		if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
			const sliced = jsonStr.slice(firstBrace, lastBrace + 1).trim();
			try {
				return JSON.parse(sliced) as T;
			} catch (secondErr) {
				throw new Error(
					`Failed to parse JSON response. Raw output:\n${text}\nParse error: ${(secondErr as Error).message}`
				);
			}
		}
		throw new Error(
			`Failed to parse JSON response. No valid JSON object found. Raw output:\n${text}\nParse error: ${(firstErr as Error).message}`
		);
	}
}
