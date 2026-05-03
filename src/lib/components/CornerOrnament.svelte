<script lang="ts">
	type Corner = 'tl' | 'tr';
	let { corner = 'tl', size = 140 }: { corner?: Corner; size?: number } = $props();

	const positionClass: Record<Corner, string> = {
		tl: 'top-0 left-0',
		tr: 'top-0 right-0'
	};

	// Mirror the top-left design horizontally for top-right.
	const gTransform: Record<Corner, string> = {
		tl: '',
		tr: 'translate(140,0) scale(-1,1)'
	};
</script>

<!--
  Refined Art Deco-style corner ornament: thin gold bracket with
  classical fleuron terminals. Inspired by traditional wedding stationery.
-->
<div
	class="absolute pointer-events-none text-soft-gold {positionClass[corner]}"
	aria-hidden="true"
>
	<svg
		width={size}
		height={size}
		viewBox="0 0 140 140"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<g transform={gTransform[corner]}>
			<!-- Outer bracket: thin L-shape inset from the corner -->
			<path
				d="M 22 110 L 22 30 Q 22 22 30 22 L 110 22"
				stroke="currentColor"
				stroke-width="0.8"
				stroke-linecap="round"
				fill="none"
			/>

			<!-- Inner accent line, parallel and shorter -->
			<path
				d="M 30 96 L 30 36 Q 30 30 36 30 L 96 30"
				stroke="currentColor"
				stroke-width="0.5"
				stroke-linecap="round"
				stroke-opacity="0.55"
				fill="none"
			/>

			<!-- ===== Fleuron at the horizontal terminal (right end) ===== -->
			<g transform="translate(110, 22)">
				<!-- Central diamond/lozenge -->
				<path
					d="M 0 -3 L 3 0 L 0 3 L -3 0 Z"
					fill="currentColor"
				/>
				<!-- Four small leaflets radiating from the diamond -->
				<path
					d="M 0 -3 Q -2 -7 0 -10 Q 2 -7 0 -3 Z"
					fill="currentColor"
					fill-opacity="0.7"
				/>
				<path
					d="M 0 3 Q -2 7 0 10 Q 2 7 0 3 Z"
					fill="currentColor"
					fill-opacity="0.7"
				/>
				<path
					d="M 3 0 Q 7 -2 10 0 Q 7 2 3 0 Z"
					fill="currentColor"
					fill-opacity="0.7"
				/>
				<!-- Trailing dot accent -->
				<circle cx="16" cy="0" r="0.9" fill="currentColor" fill-opacity="0.6" />
			</g>

			<!-- ===== Fleuron at the vertical terminal (bottom end) ===== -->
			<g transform="translate(22, 110)">
				<!-- Central diamond/lozenge -->
				<path
					d="M 0 -3 L 3 0 L 0 3 L -3 0 Z"
					fill="currentColor"
				/>
				<!-- Three leaflets (the one toward the corner is omitted) -->
				<path
					d="M 0 3 Q -2 7 0 10 Q 2 7 0 3 Z"
					fill="currentColor"
					fill-opacity="0.7"
				/>
				<path
					d="M -3 0 Q -7 -2 -10 0 Q -7 2 -3 0 Z"
					fill="currentColor"
					fill-opacity="0.7"
				/>
				<path
					d="M 3 0 Q 7 -2 10 0 Q 7 2 3 0 Z"
					fill="currentColor"
					fill-opacity="0.7"
				/>
				<!-- Trailing dot accent -->
				<circle cx="0" cy="16" r="0.9" fill="currentColor" fill-opacity="0.6" />
			</g>

			<!-- Small refined dot at the inside corner of the bracket pivot -->
			<circle cx="30" cy="30" r="1.2" fill="currentColor" fill-opacity="0.6" />
		</g>
	</svg>
</div>
