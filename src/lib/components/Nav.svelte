<script lang="ts">
	import { enhance } from '$app/forms';

	let scrolled = $state(false);
	let menuOpen = $state(false);

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
	aria-hidden={!scrolled}
>
	<div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<form method="POST" action="/logout" use:enhance>
				<button
					type="submit"
					class="flex items-center gap-1.5 text-sm text-warm-brown hover:text-dark-brown transition-colors"
					aria-label="Gå tilbage til login"
					tabindex={scrolled ? 0 : -1}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					<span>Gå tilbage</span>
				</button>
			</form>
			<a
				href="#top"
				class="font-serif text-lg text-dark-brown hover:text-soft-gold transition-colors"
				tabindex={scrolled ? 0 : -1}
			>
				A & N
			</a>
		</div>
		<div class="hidden sm:flex gap-6">
			{#each sections as section (section.id)}
				<a
					href="#{section.id}"
					class="text-sm text-warm-brown hover:text-dark-brown transition-colors tracking-wide"
					tabindex={scrolled ? 0 : -1}
				>
					{section.label}
				</a>
			{/each}
		</div>
		<button
			aria-label={menuOpen ? 'Luk menu' : 'Åbn menu'}
			aria-expanded={menuOpen}
			aria-controls="mobile-menu"
			class="sm:hidden text-warm-brown"
			tabindex={scrolled ? 0 : -1}
			onclick={() => { menuOpen = !menuOpen; }}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
	</div>

	<div id="mobile-menu" class="{menuOpen ? '' : 'hidden'} sm:hidden bg-cream/95 backdrop-blur-sm border-t border-sand/30 px-4 pb-4">
		{#each sections as section (section.id)}
			<a
				href="#{section.id}"
				class="block py-2 text-sm text-warm-brown hover:text-dark-brown transition-colors tracking-wide"
				tabindex={scrolled && menuOpen ? 0 : -1}
				onclick={() => { menuOpen = false; }}
			>
				{section.label}
			</a>
		{/each}
	</div>
</nav>
