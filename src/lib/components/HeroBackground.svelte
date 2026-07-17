<script lang="ts">
	let { preload = false }: { preload?: boolean } = $props();
</script>

<svelte:head>
	{#if preload}
		<link
			rel="preload"
			as="image"
			href="/gl-brydegaard.avif"
			type="image/avif"
			fetchpriority="high"
		/>
	{/if}
</svelte:head>

<!-- Native picture source selection keeps the preload and rendered format in
     sync even in browsers that only support the prefixed CSS image-set syntax. -->
<picture class="hero-background" aria-hidden="true">
	<source srcset="/gl-brydegaard.avif" type="image/avif" />
	<source srcset="/gl-brydegaard.webp" type="image/webp" />
	<img
		src="/gl-brydegaard.jpg"
		alt=""
		width="680"
		height="453"
		loading="eager"
		fetchpriority={preload ? 'high' : 'auto'}
	/>
</picture>

<style>
	.hero-background {
		position: absolute;
		inset: 0;
		z-index: -2;
		pointer-events: none;
	}

	.hero-background img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		opacity: 0.4;
		filter: saturate(0.65) sepia(0.25);
	}
</style>
