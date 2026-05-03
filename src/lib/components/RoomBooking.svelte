<script lang="ts">
	import { enhance } from '$app/forms';

	interface Booking {
		requested: boolean;
		nights: number | null;
		notes: string | null;
	}

	let { booking }: { booking: Booking | null } = $props();

	let requested = $state(booking?.requested ?? false);
	let saved = $state(false);

	function showSaved() {
		saved = true;
		setTimeout(() => (saved = false), 3000);
	}
</script>

<section id="booking" class="py-20 px-6 bg-cream">
	<div class="max-w-2xl mx-auto">
		<h2 class="text-4xl sm:text-5xl font-serif font-light text-dark-brown text-center mb-4">Overnatning</h2>
		<div class="w-16 h-px bg-soft-gold mx-auto mb-4"></div>
		<p class="text-center text-warm-brown mb-12 max-w-lg mx-auto">
			Vi vil elske at have jer overnattende — det gør aftenen endnu hyggeligere og tryggere for alle.
		</p>

		<form
			method="POST"
			action="/api/booking"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
					showSaved();
				};
			}}
			class="max-w-md mx-auto space-y-6"
		>
			<label class="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					name="requested"
					bind:checked={requested}
					class="w-5 h-5 accent-soft-gold rounded"
				/>
				<span class="text-dark-brown font-serif text-lg">Vi ønsker at booke et værelse</span>
			</label>

			{#if requested}
				<div class="space-y-4 pl-8 border-l-2 border-soft-gold/30">
					<div>
						<label for="nights" class="block text-sm text-warm-brown mb-1">
							Antal nætter
						</label>
						<select
							id="nights"
							name="nights"
							class="w-full px-4 py-2 border border-sand/50 rounded-lg bg-warm-white text-dark-brown focus:outline-none focus:ring-2 focus:ring-soft-gold"
						>
							<option value="1" selected={booking?.nights === 1}>1 nat (lørdag)</option>
							<option value="2" selected={booking?.nights === 2}>2 nætter (lørdag + søndag)</option>
						</select>
					</div>

					<div>
						<label for="notes" class="block text-sm text-warm-brown mb-1">
							Eventuelle bemærkninger
						</label>
						<textarea
							id="notes"
							name="notes"
							rows="2"
							value={booking?.notes ?? ''}
							placeholder="Fx særlige behov..."
							class="w-full px-4 py-2 border border-sand/50 rounded-lg bg-warm-white text-dark-brown placeholder-sand/70 focus:outline-none focus:ring-2 focus:ring-soft-gold text-sm resize-none"
						></textarea>
					</div>
				</div>
			{/if}

			<div class="text-center pt-4">
				<button
					type="submit"
					class="px-8 py-3 bg-soft-gold text-warm-white rounded-lg font-medium hover:bg-warm-brown transition-colors duration-200"
				>
					Gem booking
				</button>
				{#if saved}
					<p class="text-soft-gold mt-3 text-sm">✓ Din booking er gemt</p>
				{/if}
			</div>
		</form>
	</div>
</section>
