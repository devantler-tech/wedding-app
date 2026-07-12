<script lang="ts">
	let { href }: { href: string } = $props();
</script>

<svelte:head>
	<link
		rel="preload"
		as="font"
		{href}
		type="font/woff2"
		crossorigin="anonymous"
		fetchpriority="high"
	/>
</svelte:head>
