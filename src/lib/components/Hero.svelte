<script lang="ts">
	import CornerOrnament from '$lib/components/CornerOrnament.svelte';

	let now = $state(new Date());

	const weddingDate = new Date('2027-05-16T14:30:00+02:00');

	$effect(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 1000);
		return () => clearInterval(interval);
	});

	const diff = $derived(() => {
		const ms = weddingDate.getTime() - now.getTime();
		if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
		const days = Math.floor(ms / (1000 * 60 * 60 * 24));
		const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((ms % (1000 * 60)) / 1000);
		return { days, hours, minutes, seconds };
	});
</script>

<section id="top" class="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-cream relative overflow-hidden">
	<CornerOrnament corner="tl" size={170} />
	<CornerOrnament corner="tr" size={170} />
	<p class="text-warm-brown tracking-[0.3em] uppercase text-sm mb-6 font-sans">Vi skal giftes</p>
	<h1 class="text-5xl sm:text-6xl md:text-8xl font-serif font-light text-dark-brown mb-6 leading-tight">
		Aimée<br class="sm:hidden" />
		<span class="text-soft-gold">&</span>
		Nikolai Emil
	</h1>
	<div class="w-20 h-px bg-soft-gold mb-6"></div>
	<p class="text-xl sm:text-2xl text-warm-brown font-serif">16. maj 2027</p>
	<p class="text-base sm:text-lg text-warm-brown mt-2 font-serif italic">Gl. Brydegaard</p>
	<p class="text-sm text-sand mt-1">Helnæsvej 4, 5683 Haarby</p>

	<div class="mt-12 flex gap-6 sm:gap-10 text-center">
		{#each [
			{ value: diff().days, label: 'Dage' },
			{ value: diff().hours, label: 'Timer' },
			{ value: diff().minutes, label: 'Min' },
			{ value: diff().seconds, label: 'Sek' }
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
