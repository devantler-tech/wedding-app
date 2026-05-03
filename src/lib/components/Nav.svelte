<script lang="ts">
	let scrolled = $state(false);

	const sections = [
		{ id: 'program', label: 'Program' },
		{ id: 'galleri', label: 'Galleri' },
		{ id: 'rsvp', label: 'RSVP' },
		{ id: 'booking', label: 'Booking' },
		{ id: 'praktisk', label: 'Praktisk' },
		{ id: 'oenskeliste', label: 'Ønskeliste' }
	];

	$effect(() => {
		const onScroll = () => {
			scrolled = window.scrollY > window.innerHeight * 0.8;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<nav
	class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 {scrolled
		? 'bg-cream/95 backdrop-blur-sm shadow-sm'
		: 'pointer-events-none opacity-0 -translate-y-full'}"
>
	<div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
		<a href="#top" class="font-serif text-lg text-dark-brown hover:text-soft-gold transition-colors">
			A & N
		</a>
		<div class="hidden sm:flex gap-6">
			{#each sections as section}
				<a
					href="#{section.id}"
					class="text-sm text-warm-brown hover:text-dark-brown transition-colors tracking-wide"
				>
					{section.label}
				</a>
			{/each}
		</div>
		<button
			aria-label="Åbn menu"
			class="sm:hidden text-warm-brown"
			onclick={() => {
				const menu = document.getElementById('mobile-menu');
				menu?.classList.toggle('hidden');
			}}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
	</div>

	<div id="mobile-menu" class="hidden sm:hidden bg-cream/95 backdrop-blur-sm border-t border-sand/30 px-4 pb-4">
		{#each sections as section}
			<a
				href="#{section.id}"
				class="block py-2 text-sm text-warm-brown hover:text-dark-brown transition-colors tracking-wide"
				onclick={() => document.getElementById('mobile-menu')?.classList.add('hidden')}
			>
				{section.label}
			</a>
		{/each}
	</div>
</nav>
