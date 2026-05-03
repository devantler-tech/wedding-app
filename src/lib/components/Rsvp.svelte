<script lang="ts">
	import { enhance } from '$app/forms';

	interface Guest {
		id: number;
		name: string;
		attending: boolean | null;
		dietaryNotes: string | null;
	}

	let { guests, pairName }: { guests: Guest[]; pairName: string } = $props();

	let saved = $state(false);

	function showSaved() {
		saved = true;
		setTimeout(() => (saved = false), 3000);
	}
</script>

<section id="rsvp" class="py-20 px-6 bg-warm-white">
	<div class="max-w-2xl mx-auto">
		<h2 class="text-4xl sm:text-5xl font-serif font-light text-dark-brown text-center mb-4">RSVP</h2>
		<div class="w-16 h-px bg-soft-gold mx-auto mb-4"></div>
		<p class="text-center text-warm-brown mb-12 font-serif italic">
			Kære {pairName}
		</p>

		<form
			method="POST"
			action="/api/rsvp"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
					showSaved();
				};
			}}
			class="space-y-8"
		>
			{#each guests as guest, i (guest.id)}
				<div class="bg-cream/50 rounded-xl p-6 border border-sand/30">
					<h3 class="text-xl font-serif text-dark-brown mb-4">{guest.name}</h3>
					<input type="hidden" name="guestId_{i}" value={guest.id} />

					<div class="flex gap-4 mb-4">
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name="attending_{i}"
								value="true"
								checked={guest.attending === true}
								class="w-4 h-4 accent-soft-gold"
							/>
							<span class="text-dark-brown">Ja, jeg deltager</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name="attending_{i}"
								value="false"
								checked={guest.attending === false}
								class="w-4 h-4 accent-soft-gold"
							/>
							<span class="text-dark-brown">Nej, desværre</span>
						</label>
					</div>

					<div>
						<label for="dietary_{i}" class="block text-sm text-warm-brown mb-1">
							Allergier eller kostbehov
						</label>
						<input
							id="dietary_{i}"
							name="dietary_{i}"
							type="text"
							value={guest.dietaryNotes ?? ''}
							placeholder="Fx vegetar, glutenfri..."
							class="w-full px-4 py-2 border border-sand/50 rounded-lg bg-warm-white text-dark-brown placeholder-sand/70 focus:outline-none focus:ring-2 focus:ring-soft-gold focus:border-soft-gold text-sm"
						/>
					</div>
				</div>
			{/each}

			<input type="hidden" name="guestCount" value={guests.length} />

			<div class="text-center">
				<button
					type="submit"
					class="px-8 py-3 bg-soft-gold text-warm-white rounded-lg font-medium hover:bg-warm-brown transition-colors duration-200"
				>
					Gem svar
				</button>
				{#if saved}
					<p class="text-soft-gold mt-3 text-sm animate-fade-in"><i class="fa-solid fa-check mr-1" aria-hidden="true"></i>Dit svar er gemt</p>
				{/if}
			</div>
		</form>
	</div>
</section>
