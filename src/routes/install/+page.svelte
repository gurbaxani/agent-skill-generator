<script lang="ts">
	interface Step {
		title: string;
		description: string;
		code?: string;
		language?: string;
	}

	interface FrameworkOption {
		id: string;
		name: string;
		icon: string;
		description: string;
		steps: Step[];
	}

	const frameworks: ReadonlyArray<FrameworkOption> = [
		{
			id: 'openclaw',
			name: 'OpenClaw Gateway',
			icon: 'bi-grid-fill',
			description:
				'Deploy generated skills directly to your OpenClaw agent workspace or configuration paths.',
			steps: [
				{
					title: 'Choose deployment path',
					description:
						'OpenClaw resolves skill directories with specific precedence. Decide where to install your custom skill folder:',
					code: '# Options by precedence (highest to lowest):\n# 1. Local Workspace skills:\n#    <workspace>/skills/\n# 2. Managed / Local skills (user-wide):\n#    ~/.openclaw/skills/\n# 3. Personal agent skills:\n#    ~/.agents/skills/',
					language: 'bash'
				},
				{
					title: 'Deploy the skill directory',
					description:
						'Create the skill directory under your selected path and copy the generated SKILL.md file and optional subdirectories.',
					code: 'mkdir -p ~/.openclaw/skills/my-custom-skill\ncp -r ~/Downloads/my-custom-skill/* ~/.openclaw/skills/my-custom-skill/',
					language: 'bash'
				},
				{
					title: 'Verify configuration',
					description:
						'Verify that OpenClaw successfully detects and validates the custom skill package.',
					code: 'openclaw skills check\nopenclaw skills list',
					language: 'bash'
				},
				{
					title: 'Configure custom execution (Optional)',
					description:
						'Add environment mapping details or enable specific API credentials for the skill inside your user-wide configuration file.',
					code: '{\n  "skills": {\n    "entries": {\n      "my-custom-skill": {\n        "enabled": true,\n        "env": {\n          "CUSTOM_API_KEY": "YOUR_CREDENTIALS"\n        }\n      }\n    }\n  }\n}',
					language: 'json'
				}
			]
		},
		{
			id: 'hermes',
			name: 'Hermes Agent',
			icon: 'bi-cpu-fill',
			description:
				'Integrate skills into Hermes self-improving memory learning loops and runtime contexts.',
			steps: [
				{
					title: 'Deploy to skills directory',
					description:
						'Hermes automatically registers skills from its primary local folder path. Copy your skill directory there.',
					code: 'mkdir -p ~/.hermes/skills/my-custom-skill\ncp -r ~/Downloads/my-custom-skill/* ~/.hermes/skills/my-custom-skill/',
					language: 'bash'
				},
				{
					title: 'Verify via CLI',
					description: 'Inspect the newly registered skill using the hermes command-line client.',
					code: 'hermes skills list',
					language: 'bash'
				},
				{
					title: 'Configure external directories (Optional)',
					description:
						'If you want to keep your skills in another workspace directory, map the path under your Hermes configuration settings.',
					code: 'skills:\n  load:\n    watch: true\n    extraDirs:\n      - "~/Projects/workspace/skills"',
					language: 'yaml'
				}
			]
		},
		{
			id: 'vscode',
			name: 'VS Code Assistants',
			icon: 'bi-code-slash',
			description:
				'Provide workspace instructions for interactive assistant engines (Cline, Roo Code).',
			steps: [
				{
					title: 'Create workspace rules',
					description:
						'Create a rule definition file at the root of your active project workspace.',
					code: 'touch .clinerules # For Cline\ntouch .roomode   # For Roo Code',
					language: 'bash'
				},
				{
					title: 'Inject instructions',
					description:
						'Open the generated SKILL.md. Copy the markdown content (omit YAML frontmatter) and paste it directly into your workspace rule file.',
					code: '# Copy contents from SKILL.md body into the rules file...',
					language: 'text'
				}
			]
		}
	];

	let activeTabId = $state<string>('openclaw');
	let copiedKey = $state<string | null>(null);

	const activeFramework = $derived(frameworks.find((f) => f.id === activeTabId) || frameworks[0]);

	function setTab(id: string) {
		activeTabId = id;
	}

	function handleCopy(text: string, key: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedKey = key;
			setTimeout(() => {
				if (copiedKey === key) {
					copiedKey = null;
				}
			}, 2000);
		});
	}

	function highlightCode(code: string, language = 'code'): string {
		if (!code) return '';

		let escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		if (language === 'bash' || language === 'text') {
			escaped = escaped.replace(
				/(#.*)$/gm,
				'<span style="color: var(--terminal-comment); font-style: italic;">$1</span>'
			);
			escaped = escaped.replace(
				/(".*?"|'.*?')/g,
				'<span style="color: var(--terminal-string);">$1</span>'
			);
			const shKeywords = /\b(mkdir|cp|touch|cd|rm|echo|ls|cat|chmod|export|openclaw|hermes)\b/g;
			escaped = escaped.replace(
				shKeywords,
				'<span style="color: var(--terminal-keyword); font-weight: bold;">$1</span>'
			);
		} else if (language === 'json') {
			escaped = escaped.replace(
				/(".*?")(\s*:)/g,
				'<span style="color: var(--terminal-keyword); font-weight: bold;">$1</span>$2'
			);
			escaped = escaped.replace(
				/(:\s*)(".*?")/g,
				'$1<span style="color: var(--terminal-string);">$2</span>'
			);
		} else if (language === 'yaml') {
			escaped = escaped.replace(
				/(^\s*[^:\n#]+:)/gm,
				'<span style="color: var(--terminal-keyword); font-weight: bold;">$1</span>'
			);
			escaped = escaped.replace(
				/(:\s+)(.*)$/gm,
				'$1<span style="color: var(--terminal-string);">$2</span>'
			);
			escaped = escaped.replace(
				/(#.*)$/gm,
				'<span style="color: var(--terminal-comment); font-style: italic;">$1</span>'
			);
		}

		return escaped;
	}
</script>

<svelte:head>
	<title>ASG — Skill Installation Guide</title>
	<meta
		name="description"
		content="Learn how to install and integrate generated agent skills into OpenClaw paths, Hermes context directory setups, and VS Code configurations."
	/>
</svelte:head>

<div class="install-container mx-auto max-w-5xl px-6 py-12">
	<!-- Header -->
	<header class="mb-10 flex flex-col gap-2">
		<div class="badge-row flex items-center gap-2">
			<span class="badge-dot" aria-hidden="true"></span>
			<span class="badge-label">Deployment Terminal</span>
		</div>
		<h1
			style="color: var(--text-primary); font-family: var(--font-display);"
			class="text-3xl font-extrabold tracking-widest uppercase"
		>
			Install Agent Skills
		</h1>
		<p
			style="color: var(--text-secondary); font-family: var(--font-body);"
			class="max-w-2xl text-base leading-relaxed"
		>
			Learn how to load, integrate, and configure generated skills in modern agent environments.
		</p>
	</header>

	<!-- Main Workspace Grid -->
	<div class="grid items-start gap-8 lg:grid-cols-[1fr_2fr]">
		<!-- Left: Tab Navigation list -->
		<nav class="flex flex-col gap-2" aria-label="Framework installer options">
			{#each frameworks as fw (fw.id)}
				<button
					type="button"
					id="tab-{fw.id}"
					class="fw-tab-btn flex items-center gap-4 p-4 text-left transition-all"
					class:active={fw.id === activeTabId}
					onclick={() => setTab(fw.id)}
					style="background: {fw.id === activeTabId
						? 'var(--accent-subtle)'
						: 'var(--surface-raised)'}; border: 1px solid {fw.id === activeTabId
						? 'var(--accent)'
						: 'var(--border-strong)'}; border-radius: var(--radius);"
				>
					<span
						class="fw-tab-icon flex h-8 w-8 items-center justify-center rounded-[2px]"
						style="background: {fw.id === activeTabId
							? 'var(--accent)'
							: 'var(--surface-sunken)'}; color: {fw.id === activeTabId
							? 'var(--accent-fg)'
							: 'var(--text-secondary)'};"
					>
						<i class="bi {fw.icon} text-lg" aria-hidden="true"></i>
					</span>
					<div class="flex flex-col gap-0.5">
						<span
							style="font-family: var(--font-display); color: {fw.id === activeTabId
								? 'var(--accent)'
								: 'var(--text-primary)'};"
							class="text-sm font-bold tracking-wider uppercase"
						>
							{fw.name}
						</span>
						<span style="color: var(--text-tertiary);" class="max-w-[180px] truncate text-[11px]">
							{fw.id === 'openclaw'
								? 'Workspace / config integration'
								: fw.id === 'hermes'
									? 'Self-improving loops'
									: 'Cline & Roo Code rules'}
						</span>
					</div>
				</button>
			{/each}
		</nav>

		<!-- Right: Details / Steps Panel -->
		<section
			id="install-details-panel"
			class="flex flex-col gap-6 p-6 shadow-sm transition-all"
			style="background: var(--surface-raised); border: 1px solid var(--border-strong); border-radius: var(--radius);"
			aria-live="polite"
		>
			<!-- Active framework details -->
			<div class="flex flex-col gap-2 border-b pb-5" style="border-color: var(--border-default);">
				<div class="flex items-center gap-3">
					<i
						class="bi {activeFramework.icon} text-xl"
						style="color: var(--accent);"
						aria-hidden="true"
					></i>
					<h2
						style="color: var(--text-primary); font-family: var(--font-display);"
						class="text-lg font-bold tracking-widest uppercase"
					>
						{activeFramework.name} Deployment
					</h2>
				</div>
				<p style="color: var(--text-secondary); font-family: var(--font-body);" class="text-sm">
					{activeFramework.description}
				</p>
			</div>

			<!-- Dynamic steps list -->
			<div class="flex flex-col gap-8">
				{#each activeFramework.steps as step, index (step.title)}
					<div class="step-card flex flex-col gap-3">
						<div class="flex items-start gap-4">
							<span
								style="font-family: var(--font-mono); color: var(--accent);"
								class="shrink-0 text-xs leading-6 font-bold"
							>
								0{index + 1} //
							</span>
							<div class="flex flex-col gap-1">
								<h3
									style="color: var(--text-primary); font-family: var(--font-display);"
									class="text-sm font-bold tracking-wide uppercase"
								>
									{step.title}
								</h3>
								<p
									style="color: var(--text-secondary); font-family: var(--font-body);"
									class="text-xs leading-relaxed"
								>
									{step.description}
								</p>
							</div>
						</div>

						<!-- Embedded Code block -->
						{#if step.code}
							<div
								class="terminal-block ml-8 flex flex-col overflow-hidden"
								style="background: var(--terminal-bg); border: 1px solid var(--border-strong); border-radius: 2px;"
							>
								<div
									class="terminal-header flex items-center justify-between border-b px-4 py-2"
									style="border-color: var(--border-strong);"
								>
									<span
										style="color: var(--text-tertiary); font-family: var(--font-mono);"
										class="text-[10px] tracking-widest uppercase"
									>
										{step.language || 'code'}
									</span>
									<button
										type="button"
										class="copy-btn flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase transition-colors"
										onclick={() => handleCopy(step.code || '', activeFramework.id + '-' + index)}
										style="color: {copiedKey === activeFramework.id + '-' + index
											? 'var(--accent)'
											: 'var(--text-secondary)'}; background: transparent; border: none; font-family: var(--font-display);"
									>
										{#if copiedKey === activeFramework.id + '-' + index}
											<i class="bi bi-check2 text-xs" aria-hidden="true"></i> Copied
										{:else}
											<i class="bi bi-clipboard text-xs" aria-hidden="true"></i> Copy
										{/if}
									</button>
								</div>
								<pre
									class="m-0 overflow-x-auto p-4"
									style="font-family: var(--font-mono); font-size: 12px; line-height: 1.6;"><code
										style="color: var(--terminal-text);"
										>{@html highlightCode(step.code, step.language)}</code
									></pre>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	/* ── Subtitle badge ── */
	.badge-row {
		display: inline-flex;
		align-items: center;
		margin-bottom: var(--space-xs);
	}

	.badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 6px var(--accent-glow);
		animation: pulse-dot 2s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}

	.badge-label {
		font-family: var(--font-display);
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--accent-dim);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	/* ── Sidebar tabs ── */
	.fw-tab-btn {
		cursor: pointer;
		position: relative;
		overflow: hidden;
	}

	.fw-tab-btn:hover {
		border-color: var(--accent) !important;
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.fw-tab-btn.active::after {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--accent);
	}

	.fw-tab-icon {
		transition: transform var(--duration-fast) var(--ease-out-quart);
	}

	.fw-tab-btn:hover .fw-tab-icon {
		transform: scale(1.05);
	}

	/* ── Terminal design ── */
	.terminal-block pre {
		white-space: pre-wrap;
		word-break: break-all;
	}

	.copy-btn:hover {
		color: var(--accent) !important;
		text-shadow: 0 0 5px var(--accent-glow);
	}

	/* ── Responsive adjustments ── */
	@media (max-width: 1024px) {
		.install-container {
			padding-left: var(--space-md);
			padding-right: var(--space-md);
		}
	}

	@media (max-width: 768px) {
		.install-container {
			padding-top: var(--space-lg);
			padding-bottom: var(--space-lg);
		}
		.fw-tab-btn {
			padding: var(--space-sm);
		}
		.terminal-block {
			margin-left: 0 !important;
		}
	}
</style>
