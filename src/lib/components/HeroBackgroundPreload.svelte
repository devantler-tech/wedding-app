<!-- The hero photo backs both / (Hero.svelte) and /login as a CSS ::before
     background. Current Lighthouse traces identify route-specific text as LCP,
     but starting this shared visual with the document still avoids discovering
     it only after CSS parses. AVIF is the smallest supported source; browsers
     that cannot decode it fall through to the CSS WebP/JPEG sources. Keep the
     paths in sync with all three background image-set() declarations. -->
<svelte:head>
	<link
		rel="preload"
		as="image"
		href="/gl-brydegaard.avif"
		type="image/avif"
		fetchpriority="high"
	/>
</svelte:head>
