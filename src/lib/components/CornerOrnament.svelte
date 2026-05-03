<script lang="ts">
	type Corner = 'tl' | 'tr' | 'bl' | 'br';
	let { corner = 'tl', size = 160 }: { corner?: Corner; size?: number } = $props();

	const positionClass: Record<Corner, string> = {
		tl: 'top-0 left-0',
		tr: 'top-0 right-0',
		bl: 'bottom-0 left-0',
		br: 'bottom-0 right-0'
	};

	// Mirror the top-left botanical design into each other corner via SVG coordinate transforms.
	// Using SVG-space transforms avoids CSS transform-origin issues.
	const gTransform: Record<Corner, string> = {
		tl: '',
		tr: 'translate(140,0) scale(-1,1)',
		bl: 'translate(0,140) scale(1,-1)',
		br: 'translate(140,140) scale(-1,-1)'
	};
</script>

<!--
  Botanical branch corner ornament inspired by the lush trees and nature at Gl. Brydegaard.
  Designed as top-left, then mirrored into the other three corners via SVG transforms.
-->
<div
	class="absolute pointer-events-none text-warm-brown/40 {positionClass[corner]}"
	aria-hidden="true"
>
	<svg
		width={size}
		height={size}
		viewBox="0 0 140 140"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		overflow="visible"
	>
		<g transform={gTransform[corner]}>
			<!-- Main sweeping branch from lower-left to upper-right -->
			<path
				d="M 10 130 C 35 98 72 65 110 35 C 120 27 130 16 130 10"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			/>

			<!-- === Cluster 1 — lower section ~(35, 100) === -->
			<path
				d="M 35 100 C 24 92 16 80 14 66"
				stroke="currentColor"
				stroke-width="1.1"
				stroke-linecap="round"
			/>
			<!-- Leaf 1a: pointing upper-left -->
			<path
				d="M 14 66 C 8 56 6 44 12 34 C 18 44 18 56 14 66 Z"
				stroke="currentColor"
				stroke-width="0.9"
				fill="currentColor"
				fill-opacity="0.09"
			/>
			<!-- Leaf 1b: pointing left -->
			<path
				d="M 14 66 C 4 62 0 52 4 42 C 10 50 14 60 14 66 Z"
				stroke="currentColor"
				stroke-width="0.9"
				fill="currentColor"
				fill-opacity="0.09"
			/>

			<!-- === Cluster 2 — middle section ~(72, 65) === -->
			<path
				d="M 72 65 C 60 55 54 42 52 28"
				stroke="currentColor"
				stroke-width="1.1"
				stroke-linecap="round"
			/>
			<!-- Leaf 2a: pointing upward -->
			<path
				d="M 52 28 C 46 18 46 6 52 -4 C 58 6 56 18 52 28 Z"
				stroke="currentColor"
				stroke-width="0.9"
				fill="currentColor"
				fill-opacity="0.09"
			/>
			<!-- Leaf 2b: pointing upper-left -->
			<path
				d="M 52 28 C 40 24 34 14 38 4 C 44 12 50 22 52 28 Z"
				stroke="currentColor"
				stroke-width="0.9"
				fill="currentColor"
				fill-opacity="0.09"
			/>
			<!-- Leaf 2c: pointing downward from main branch at (72,65) -->
			<path
				d="M 72 65 C 80 75 84 88 78 100 C 72 88 70 76 72 65 Z"
				stroke="currentColor"
				stroke-width="0.9"
				fill="currentColor"
				fill-opacity="0.09"
			/>

			<!-- === Cluster 3 — upper section ~(110, 35) === -->
			<path
				d="M 110 35 C 100 25 98 14 100 2"
				stroke="currentColor"
				stroke-width="1.1"
				stroke-linecap="round"
			/>
			<!-- Leaf 3a: pointing upward (extends above viewbox, clipped by container edge) -->
			<path
				d="M 100 2 C 94 -8 96 -20 102 -26 C 108 -18 106 -6 100 2 Z"
				stroke="currentColor"
				stroke-width="0.9"
				fill="currentColor"
				fill-opacity="0.09"
			/>
			<!-- Leaf 3b: pointing upper-left -->
			<path
				d="M 100 2 C 88 -2 82 -10 86 -20 C 92 -12 98 -4 100 2 Z"
				stroke="currentColor"
				stroke-width="0.9"
				fill="currentColor"
				fill-opacity="0.09"
			/>

			<!-- Small berries along the branch -->
			<circle cx="20" cy="118" r="2.4" fill="currentColor" fill-opacity="0.45" />
			<circle cx="50" cy="84" r="2.1" fill="currentColor" fill-opacity="0.4" />
			<circle cx="88" cy="50" r="2.1" fill="currentColor" fill-opacity="0.4" />
			<circle cx="120" cy="18" r="2.4" fill="currentColor" fill-opacity="0.45" />
		</g>
	</svg>
</div>
