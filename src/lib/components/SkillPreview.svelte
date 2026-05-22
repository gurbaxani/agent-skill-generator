<script lang="ts">
	interface TerminalLine {
		content: string;
		type: 'comment' | 'key' | 'value' | 'text' | 'blank' | 'divider';
	}

	const LINES: ReadonlyArray<TerminalLine> = [
		{ content: '---', type: 'divider' },
		{ content: 'name: code-reviewer', type: 'key' },
		{ content: 'description: "Reviews PRs for style, bugs, perf"', type: 'key' },
		{ content: 'version: 1.2.0', type: 'key' },
		{ content: 'license: MIT', type: 'key' },
		{ content: '---', type: 'divider' },
		{ content: '', type: 'blank' },
		{ content: '# System Prompt', type: 'comment' },
		{ content: '', type: 'blank' },
		{ content: 'You are a meticulous code reviewer.', type: 'text' },
		{ content: 'Focus on:', type: 'text' },
		{ content: '  - Correctness over cleverness', type: 'value' },
		{ content: '  - Performance bottlenecks', type: 'value' },
		{ content: '  - Security vulnerabilities', type: 'value' },
		{ content: '  - Naming clarity', type: 'value' },
	];
</script>

<div class="terminal" role="img" aria-label="Example of a generated skill file">
	<div class="terminal-chrome">
		<div class="terminal-dots" aria-hidden="true">
			<span class="dot dot--red"></span>
			<span class="dot dot--yellow"></span>
			<span class="dot dot--green"></span>
		</div>
		<span class="terminal-title">SKILL.md — code-reviewer</span>
		<span class="terminal-status" aria-hidden="true">● LIVE</span>
	</div>
	<pre class="terminal-body"><code>{#each LINES as line, i (i)}<span class="line"><span class="line-num" aria-hidden="true">{String(i + 1).padStart(2, ' ')}</span>{#if line.type === 'divider'}<span class="t-divider">{line.content}</span>{:else if line.type === 'key'}<span class="t-key">{line.content.split(':')[0]}:</span><span class="t-val">{line.content.slice(line.content.indexOf(':') + 1)}</span>{:else if line.type === 'comment'}<span class="t-comment">{line.content}</span>{:else if line.type === 'value'}<span class="t-list">{line.content}</span>{:else if line.type === 'blank'}<span class="t-blank">{'\u200B'}</span>{:else}<span class="t-text">{line.content}</span>{/if}</span>
{/each}<span class="line"><span class="line-num" aria-hidden="true">{String(LINES.length + 1).padStart(2, ' ')}</span><span class="cursor" aria-hidden="true">▌</span></span></code></pre>
</div>

<style>
	.terminal {
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--terminal-bg);
		max-width: 500px;
		width: 100%;
		box-shadow:
			0 0 20px oklch(0% 0 0 / 0.4),
			0 0 60px var(--accent-glow);
	}

	.terminal-chrome {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--surface-raised);
		border-bottom: 1px solid var(--border-default);
	}

	.terminal-dots {
		display: flex;
		gap: var(--space-xs);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.dot--red { background: oklch(60% 0.2 25); }
	.dot--yellow { background: oklch(78% 0.16 85); }
	.dot--green { background: oklch(70% 0.16 145); }

	.terminal-title {
		flex: 1;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-tertiary);
		letter-spacing: 0.03em;
	}

	.terminal-status {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: oklch(70% 0.16 145);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.terminal-body {
		margin: 0;
		padding: var(--space-md);
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		line-height: 1.75;
		tab-size: 2;
	}

	code {
		font-family: inherit;
	}

	.line {
		display: block;
		min-height: 1.75em;
	}

	.line-num {
		display: inline-block;
		width: 2.5ch;
		margin-right: 1.5ch;
		color: var(--text-tertiary);
		user-select: none;
		text-align: right;
		opacity: 0.5;
	}

	.t-divider { color: var(--terminal-comment); }
	.t-key { color: var(--terminal-keyword); }
	.t-val { color: var(--terminal-text); }
	.t-comment { color: var(--terminal-comment); font-style: italic; }
	.t-list { color: var(--terminal-string); }
	.t-text { color: var(--text-secondary); }

	.cursor {
		color: var(--accent);
		animation: blink 1s step-end infinite;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}

	@media (prefers-reduced-motion: reduce) {
		.cursor {
			animation: none;
			opacity: 1;
		}
	}
</style>
