<script lang="ts">
	interface Booking {
		requested: boolean;
		nights: number | null;
		notes: string | null;
	}

	let { booking }: { booking: Booking | null } = $props();

	let requested = $derived(booking?.requested ?? false);
	let requestedLocal = $state<boolean | undefined>(undefined);
	let isRequested = $derived(requestedLocal ?? requested);
	let saved = $state(false);
	let error = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		try {
			const res = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form)
			});
			if (res.ok) {
				saved = true;
				error = false;
				setTimeout(() => (saved = false), 3000);
			} else {
				error = true;
				saved = false;
				setTimeout(() => (error = false), 5000);
			}
		} catch {
			error = true;
			saved = false;
			setTimeout(() => (error = false), 5000);
		}
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
			onsubmit={handleSubmit}
			class="max-w-md mx-auto space-y-6"
		>
			<label class="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					name="requested"
					checked={isRequested}
					onchange={(e) => { requestedLocal = (e.currentTarget as HTMLInputElement).checked; }}
					class="w-5 h-5 accent-soft-gold rounded"
				/>
				<span class="text-dark-brown font-serif text-lg">Vi ønsker at booke et værelse</span>
			</label>

			{#if isRequested}
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
					<p class="text-soft-gold mt-3 text-sm"><i class="fa-solid fa-check mr-1" aria-hidden="true"></i>Din booking er gemt</p>
				{/if}
				{#if error}
					<p class="text-red-600 mt-3 text-sm">Der opstod en fejl — prøv igen</p>
				{/if}
			</div>
		</form>
	</div>
</section>
