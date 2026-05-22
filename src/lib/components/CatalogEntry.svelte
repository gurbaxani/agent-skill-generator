<script lang="ts">
	interface Props {
		name: string;
		description: string;
		author: string;
		tag: string;
	}

	let { name, description, author, tag }: Props = $props();
</script>

<a href="/browse" class="catalog-entry" id="catalog-entry-{name}">
	<span class="entry-index" aria-hidden="true">›</span>
	<span class="entry-name">{name}</span>
	<span class="entry-desc">{description}</span>
	<span class="entry-spacer" aria-hidden="true"></span>
	<span class="entry-author">{author}</span>
	<span class="entry-tag">{tag}</span>
</a>

<style>
	.catalog-entry {
		display: flex;
		align-items: baseline;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		text-decoration: none;
		color: inherit;
		border-radius: var(--radius);
		font-family: var(--font-body);
		transition:
			background-color var(--duration-fast) var(--ease-out-quart),
			box-shadow var(--duration-fast) var(--ease-out-quart),
			outline var(--duration-fast) var(--ease-out-quart);
	}

	.catalog-entry:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
		background-color: var(--accent-subtle);
		box-shadow: inset 0 0 0 1px var(--border-accent);
	}

	.catalog-entry:hover {
		background-color: var(--accent-subtle);
		box-shadow: inset 0 0 0 1px var(--border-accent);
	}

	.catalog-entry:hover .entry-index {
		color: var(--accent);
	}

	.catalog-entry:hover .entry-name {
		color: var(--accent);
		text-shadow: 0 0 6px var(--accent-glow);
	}

	.entry-index {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--text-tertiary);
		flex-shrink: 0;
		transition: color var(--duration-fast) var(--ease-out-quart);
	}

	.entry-name {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--text-primary);
		white-space: nowrap;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		transition: color var(--duration-fast) var(--ease-out-quart);
	}

	.entry-desc {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.entry-spacer {
		flex: 1;
		min-width: var(--space-md);
		border-bottom: 1px dotted var(--border-default);
		align-self: center;
		margin-bottom: 2px;
	}

	.entry-author {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-tertiary);
		white-space: nowrap;
	}

	.entry-tag {
		font-family: var(--font-display);
		font-size: 0.65rem;
		color: var(--secondary);
		background: var(--secondary-subtle);
		padding: 1px 8px;
		border-radius: var(--radius);
		border: 1px solid var(--secondary);
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
		line-height: 1.6;
	}

	@media (max-width: 768px) {
		.catalog-entry {
			flex-wrap: wrap;
			gap: var(--space-xs);
		}

		.entry-desc {
			flex-basis: 100%;
			order: 10;
			padding-left: calc(var(--space-md) + 1ch);
			white-space: normal;
		}

		.entry-spacer {
			display: none;
		}
	}

	@media (max-width: 480px) {
		.entry-author {
			display: none;
		}
	}
</style>
