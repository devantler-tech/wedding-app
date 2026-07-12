<!-- The hero photo backs both / (Hero.svelte) and /login as a CSS ::before
     background. Current Lighthouse traces identify route-specific text as LCP,
     but starting this shared visual with the document still avoids discovering
     it only after CSS parses. Keep the path in sync with both CSS url()s. -->
<svelte:head>
	<link rel="preload" as="image" href="/gl-brydegaard.jpg" fetchpriority="high" />
</svelte:head>
