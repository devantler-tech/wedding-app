<!-- The hero photo backs both / (Hero.svelte) and /login as a CSS ::before
     background, so it is the LCP element yet only discovered after the
     render-blocking stylesheet chain parses. Emitting a head preload with high
     fetch priority starts the download with the document instead. Shared so
     the asset path lives in one place (keep it in sync with the CSS url()s). -->
<svelte:head>
	<link rel="preload" as="image" href="/gl-brydegaard.jpg" fetchpriority="high" />
</svelte:head>
