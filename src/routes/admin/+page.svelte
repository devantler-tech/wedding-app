<script lang="ts">
	import { resolve } from '$app/paths';
	import BackToLogin from '$lib/components/BackToLogin.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	function attendingLabel(attending: boolean | null): string {
		if (attending === true) return 'Ja';
		if (attending === false) return 'Nej';
		return 'Ikke svaret';
	}

	function attendingClass(attending: boolean | null): string {
		if (attending === true) return 'text-green-700';
		if (attending === false) return 'text-red-700';
		return 'text-warm-brown';
	}

	const totals = $derived.by(() => {
		let pairs = 0;
		let people = 0;
		let attending = 0;
		let declined = 0;
		let pending = 0;
		let bookingsRequested = 0;
		for (const p of data.pairs) {
			pairs++;
			for (const g of p.guests) {
				people++;
				if (g.attending === true) attending++;
				else if (g.attending === false) declined++;
				else pending++;
			}
			if (p.booking?.requested) {
				bookingsRequested++;
			}
		}
		return { pairs, people, attending, declined, pending, bookingsRequested };
	});
</script>

<BackToLogin />

<main class="min-h-screen bg-cream py-12 px-4 sm:px-6">
	<div class="max-w-5xl mx-auto">
		<header class="mb-8">
			<p
				class="text-dark-brown mb-2"
				style="font-family: var(--font-script); font-size: 3rem; line-height: 1;"
			>
				Administrator
			</p>
			<h1 class="font-serif font-light text-dark-brown text-2xl sm:text-3xl">
				Oversigt over gæster
			</h1>
			<div class="w-16 h-px bg-soft-gold mt-4"></div>
			<a
				href={resolve('/api/admin/export')}
				download="rsvps.csv"
				class="inline-flex items-center gap-2 mt-4 text-sm text-warm-brown underline underline-offset-4 hover:text-dark-brown"
			>
				Download gæsteliste (CSV)
			</a>
		</header>

		<section
			class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 text-sm"
			aria-label="Sammenfatning"
		>
			<div class="bg-warm-white border border-sand rounded-lg p-3">
				<p class="text-warm-brown text-xs uppercase tracking-wide">Par</p>
				<p class="text-dark-brown text-xl font-serif">{totals.pairs}</p>
			</div>
			<div class="bg-warm-white border border-sand rounded-lg p-3">
				<p class="text-warm-brown text-xs uppercase tracking-wide">Gæster</p>
				<p class="text-dark-brown text-xl font-serif">{totals.people}</p>
			</div>
			<div class="bg-warm-white border border-sand rounded-lg p-3">
				<p class="text-warm-brown text-xs uppercase tracking-wide">Deltager</p>
				<p class="text-dark-brown text-xl font-serif">
					{totals.attending}
					<span class="text-warm-brown text-sm">/ {totals.declined} nej / {totals.pending} ?</span>
				</p>
			</div>
			<div class="bg-warm-white border border-sand rounded-lg p-3">
				<p class="text-warm-brown text-xs uppercase tracking-wide">Værelser</p>
				<p class="text-dark-brown text-xl font-serif">
					{totals.bookingsRequested}
				</p>
			</div>
		</section>

		<div class="space-y-4">
			{#each data.pairs as pair (pair.id)}
				<article class="bg-warm-white border border-sand rounded-lg p-5 shadow-sm">
					<header class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-4">
						<h2 class="font-serif text-dark-brown text-lg">{pair.name}</h2>
						<code
							class="text-xs sm:text-sm bg-cream border border-sand text-warm-brown px-2 py-1 rounded tracking-widest"
						>
							{pair.code}
						</code>
					</header>

					<section class="mb-4">
						<h3 class="text-xs uppercase tracking-wide text-warm-brown mb-2">RSVP</h3>
						<ul class="divide-y divide-sand/60">
							{#each pair.guests as guest (guest.id)}
								<li class="py-2 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
									<span class="text-dark-brown">{guest.name}</span>
									<span class="text-sm flex flex-wrap items-baseline gap-x-3">
										<span class={attendingClass(guest.attending)}>
											{attendingLabel(guest.attending)}
										</span>
										{#if guest.dietaryNotes}
											<span class="text-warm-brown italic">
												Diæt: {guest.dietaryNotes}
											</span>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					</section>

					<section>
						<h3 class="text-xs uppercase tracking-wide text-warm-brown mb-2">Overnatning</h3>
						{#if pair.booking?.requested}
							<p class="text-sm text-dark-brown">
								Ønsker værelse
							</p>
							{#if pair.booking.notes}
								<p class="text-sm text-warm-brown italic mt-1">
									"{pair.booking.notes}"
								</p>
							{/if}
						{:else if pair.booking}
							<p class="text-sm text-warm-brown">Ønsker ikke værelse</p>
						{:else}
							<p class="text-sm text-warm-brown">Ikke svaret</p>
						{/if}
					</section>
				</article>
			{/each}
		</div>
	</div>
</main>
