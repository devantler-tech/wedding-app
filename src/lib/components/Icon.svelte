<script lang="ts">
	import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

	// Renders a Font Awesome icon as an inline SVG from tree-shaken path data,
	// replacing the render-blocking cdnjs all.min.css + webfont download. Width
	// scales with the glyph's aspect ratio (FA viewBox heights are 512; widths
	// vary per glyph) so icons keep their designed proportions at 1em, exactly
	// like the webfont's per-glyph advance widths; an explicit width class
	// (e.g. Tailwind w-5) still wins over the presentation attribute.
	let { icon, class: cls = '' }: { icon: IconDefinition; class?: string } = $props();

	const [width, height, , , path] = $derived(icon.icon);
	const paths = $derived(Array.isArray(path) ? path : [path]);
</script>

<svg
	class="fa-svg {cls}"
	viewBox="0 0 {width} {height}"
	width="{width / height}em"
	height="1em"
	fill="currentColor"
	aria-hidden="true"
>
	{#each paths as d (d)}
		<path {d} />
	{/each}
</svg>

<style>
	.fa-svg {
		display: inline-block;
		/* Font Awesome's own baseline alignment for inline icons. */
		vertical-align: -0.125em;
	}
</style>
