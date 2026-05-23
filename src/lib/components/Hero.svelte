<script lang="ts">
	import CornerOrnament from '$lib/components/CornerOrnament.svelte';

	let { pairName, guestCount }: { pairName: string; guestCount: number } = $props();

	const isSingle = $derived(guestCount === 1);

	let now = $state(new Date());

	const weddingDate = new Date('2027-05-16T15:00:00+02:00');

	$effect(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 1000);
		return () => clearInterval(interval);
	});

	const diff = $derived.by(() => {
		const ms = weddingDate.getTime() - now.getTime();
		if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
		const days = Math.floor(ms / (1000 * 60 * 60 * 24));
		const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((ms % (1000 * 60)) / 1000);
		return { days, hours, minutes, seconds };
	});
</script>

<section id="top" class="hero-bg min-h-screen flex flex-col items-center justify-center text-center px-6 bg-cream relative overflow-hidden">
	<CornerOrnament corner="tl" size={170} />
	<CornerOrnament corner="tr" size={170} />

	<div class="mb-10 flex flex-col items-center">
		<div class="w-10 h-px bg-soft-gold mb-6"></div>
		<p class="text-warm-brown text-lg sm:text-xl font-serif italic">
			Kære {pairName}
		</p>
		<p class="text-dark-brown tracking-[0.3em] uppercase text-xs sm:text-sm font-sans my-4">
			Vi skal giftes
		</p>
		<p class="text-warm-brown text-base sm:text-lg font-serif italic max-w-md leading-relaxed text-balance">
			{#if isSingle}
				Du er helt speciel for os, så derfor ønsker vi at dele vores store dag med dig.
			{:else}
				I er helt specielle for os, så derfor ønsker vi at dele vores store dag med jer.
			{/if}
		</p>
		<div class="w-10 h-px bg-soft-gold mt-6"></div>
	</div>

	<h1 class="text-5xl sm:text-6xl md:text-8xl font-serif font-light text-dark-brown mb-8 leading-tight">
		<span class="whitespace-nowrap">Aimée <span class="text-soft-gold">&</span></span><br class="sm:hidden" />
		<span class="whitespace-nowrap">Nikolai Emil</span>
	</h1>

	<div class="w-20 h-px bg-soft-gold mb-6"></div>

	<p class="text-xl sm:text-2xl text-warm-brown font-serif">16. maj 2027</p>
	<p class="text-base sm:text-lg text-dark-brown mt-3 font-serif italic">Gl. Brydegaard</p>
	<a
		href="https://maps.google.com/?q=Gl.+Brydegaard+Helnæsvej+4+5683+Brydegård"
		target="_blank"
		rel="noopener noreferrer"
		class="text-sm sm:text-base text-warm-brown mt-1 tracking-wide underline decoration-soft-gold/50 underline-offset-2 hover:text-dark-brown transition-colors"
	>Helnæsvej 4, 5683 Brydegård</a>

	<div class="mt-12 flex gap-6 sm:gap-10 text-center">
		{#each [
			{ value: diff.days, label: 'Dage' },
			{ value: diff.hours, label: 'Timer' },
			{ value: diff.minutes, label: 'Min' },
			{ value: diff.seconds, label: 'Sek' }
		] as item (item.label)}
			<div>
				<span class="text-3xl sm:text-4xl font-serif text-dark-brown">{item.value}</span>
				<p class="text-xs text-warm-brown uppercase tracking-widest mt-1">{item.label}</p>
			</div>
		{/each}
	</div>

	<div class="absolute bottom-10 animate-bounce">
		<a href="#program" aria-label="Scroll til program" class="text-sand hover:text-warm-brown transition-colors">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
			</svg>
		</a>
	</div>
</section>

<style>
	.hero-bg {
		isolation: isolate;
	}
	.hero-bg::before {
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
	.hero-bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(240, 223, 204, 0.55) 0%,
			rgba(240, 223, 204, 0.8) 60%,
			rgba(240, 223, 204, 1) 100%
		);
		z-index: -1;
	}
</style>
