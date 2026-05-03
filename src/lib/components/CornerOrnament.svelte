<script lang="ts">
	type Corner = 'tl' | 'tr';
	let { corner = 'tl', size = 180 }: { corner?: Corner; size?: number } = $props();

	const positionClass: Record<Corner, string> = {
		tl: 'top-0 left-0',
		tr: 'top-0 right-0'
	};

	const gTransform: Record<Corner, string> = {
		tl: '',
		tr: 'translate(200,0) scale(-1,1)'
	};
</script>

<!--
  Soft eucalyptus-style corner ornament with rounded oval leaves
  on a gently curving stem. Designed as top-left and mirrored for top-right.
-->
<div
	class="absolute pointer-events-none text-warm-brown/30 {positionClass[corner]}"
	aria-hidden="true"
>
	<svg
		width={size}
		height={size}
		viewBox="0 0 200 200"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<g transform={gTransform[corner]}>
			<!-- Main flowing stem curving gently from top-left corner downward -->
			<path
				d="M 0 8 C 20 12, 50 30, 70 55 C 85 74, 95 100, 100 130 C 103 148, 104 168, 102 190"
				stroke="currentColor"
				stroke-width="1.2"
				stroke-linecap="round"
			/>

			<!-- Secondary branch splitting off near the top -->
			<path
				d="M 30 22 C 55 18, 85 10, 115 5 C 135 2, 160 2, 185 6"
				stroke="currentColor"
				stroke-width="1"
				stroke-linecap="round"
			/>

			<!-- ===== Leaves on the main stem ===== -->

			<!-- Leaf pair 1 — near start of curve -->
			<ellipse cx="28" cy="18" rx="10" ry="5"
				transform="rotate(-25, 28, 18)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.06"
			/>
			<ellipse cx="20" cy="30" rx="9" ry="4.5"
				transform="rotate(20, 20, 30)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.06"
			/>

			<!-- Leaf pair 2 — mid-curve -->
			<ellipse cx="56" cy="38" rx="11" ry="5"
				transform="rotate(-40, 56, 38)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.07"
			/>
			<ellipse cx="46" cy="52" rx="10" ry="4.5"
				transform="rotate(15, 46, 52)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.06"
			/>

			<!-- Leaf pair 3 — where the curve deepens -->
			<ellipse cx="78" cy="68" rx="11" ry="5"
				transform="rotate(-55, 78, 68)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.07"
			/>
			<ellipse cx="66" cy="78" rx="10" ry="5"
				transform="rotate(5, 66, 78)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.06"
			/>

			<!-- Leaf pair 4 — lower section -->
			<ellipse cx="92" cy="100" rx="11" ry="5"
				transform="rotate(-65, 92, 100)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.07"
			/>
			<ellipse cx="84" cy="112" rx="10" ry="4.5"
				transform="rotate(-10, 84, 112)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.06"
			/>

			<!-- Single leaf 5 — near the trailing end -->
			<ellipse cx="98" cy="142" rx="10" ry="4.5"
				transform="rotate(-75, 98, 142)"
				stroke="currentColor" stroke-width="0.8"
				fill="currentColor" fill-opacity="0.06"
			/>

			<!-- ===== Leaves on the secondary branch ===== -->

			<ellipse cx="72" cy="12" rx="9" ry="4"
				transform="rotate(-8, 72, 12)"
				stroke="currentColor" stroke-width="0.7"
				fill="currentColor" fill-opacity="0.05"
			/>
			<ellipse cx="100" cy="6" rx="9" ry="4"
				transform="rotate(5, 100, 6)"
				stroke="currentColor" stroke-width="0.7"
				fill="currentColor" fill-opacity="0.05"
			/>
			<ellipse cx="130" cy="3" rx="9" ry="4"
				transform="rotate(2, 130, 3)"
				stroke="currentColor" stroke-width="0.7"
				fill="currentColor" fill-opacity="0.05"
			/>
			<ellipse cx="158" cy="4" rx="8" ry="3.5"
				transform="rotate(8, 158, 4)"
				stroke="currentColor" stroke-width="0.7"
				fill="currentColor" fill-opacity="0.05"
			/>

			<!-- Small buds — soft dots along the stems -->
			<circle cx="12" cy="12" r="1.8" fill="currentColor" fill-opacity="0.2" />
			<circle cx="62" cy="55" r="1.5" fill="currentColor" fill-opacity="0.18" />
			<circle cx="88" cy="90" r="1.5" fill="currentColor" fill-opacity="0.18" />
			<circle cx="145" cy="3" r="1.5" fill="currentColor" fill-opacity="0.15" />
		</g>
	</svg>
</div>
