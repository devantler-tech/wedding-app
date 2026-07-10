<script lang="ts">
	import { page } from '$app/state';
	import CornerOrnament from '$lib/components/CornerOrnament.svelte';
</script>

<div class="login-bg min-h-screen flex items-center justify-center bg-cream relative overflow-hidden">
	<CornerOrnament corner="tl" size={150} />
	<CornerOrnament corner="tr" size={150} />
	<div class="max-w-md w-full px-6 text-center">
		<p class="wedding-script-heading text-dark-brown mb-2">
			Ups
		</p>
		<h1 class="font-serif font-light text-dark-brown mb-4 text-2xl sm:text-3xl">
			{page.status}
			{#if page.status === 404}
				— Siden blev ikke fundet
			{:else if page.status === 503}
				— Midlertidig fejl
			{:else if page.status === 500}
				— Serverfejl
			{:else}
				— Noget gik galt
			{/if}
		</h1>
		<div class="w-16 h-px bg-soft-gold mx-auto mt-6 mb-6"></div>
		<p class="text-warm-brown text-lg mb-8">
			{#if page.status === 404}
				Den side, du leder efter, findes ikke.
			{:else if page.status === 503}
				Vi er straks tilbage. Prøv igen om et øjeblik.
			{:else if page.status === 500}
				Der opstod en serverfejl. Prøv igen senere.
			{:else}
				Der opstod en uventet fejl. Prøv igen senere.
			{/if}
		</p>
		<form method="POST" action="/logout">
			<button
				type="submit"
				class="inline-block py-3 px-8 bg-soft-gold text-dark-brown rounded-lg font-medium hover:bg-warm-brown hover:text-warm-white transition-colors duration-200 cursor-pointer"
			>
				Gå til login
			</button>
		</form>
	</div>
</div>

<style>
	.login-bg {
		position: relative;
		isolation: isolate;
	}
	.login-bg::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: url('/gl-brydegaard.jpg');
		background-size: cover;
		background-position: center;
		opacity: 0.4;
		filter: saturate(0.65) sepia(0.25);
		z-index: -2;
	}
	.login-bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			rgba(240, 223, 204, 0.55) 0%,
			rgba(240, 223, 204, 0.85) 70%,
			rgba(240, 223, 204, 0.95) 100%
		);
		z-index: -1;
	}
</style>
