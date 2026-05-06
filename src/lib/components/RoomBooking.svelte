<script lang="ts">
	interface Booking {
		requested: boolean;
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
		<p class="text-center text-warm-brown mb-8 max-w-lg mx-auto">
			Vi vil elske at have jer overnattende — det gør aftenen endnu hyggeligere og tryggere for alle.
		</p>

		<div class="bg-warm-white/60 rounded-xl p-6 border border-sand/30 mb-8">
			<h3 class="text-lg font-serif text-dark-brown mb-1 text-center">Værelsestyper og priser</h3>
			<p class="text-xs text-warm-brown text-center mb-4">Pris pr. værelse, natten 16.–17. maj 2027</p>
			<div class="overflow-x-auto">
				<table class="w-full text-sm text-left">
					<thead>
						<tr class="border-b border-sand/40 text-warm-brown">
							<th class="py-2 pr-4 font-medium">Værelsestype</th>
							<th class="py-2 px-4 font-medium text-center">Pers.</th>
							<th class="py-2 pl-4 font-medium text-right">Pris</th>
						</tr>
					</thead>
					<tbody class="text-dark-brown">
						<tr class="border-b border-sand/20">
							<td class="py-2 pr-4">Enkelt m/fælles bad</td>
							<td class="py-2 px-4 text-center">1</td>
							<td class="py-2 pl-4 text-right whitespace-nowrap">795 kr.</td>
						</tr>
						<tr class="border-b border-sand/20">
							<td class="py-2 pr-4">Dobbelt m/fælles bad</td>
							<td class="py-2 px-4 text-center">2</td>
							<td class="py-2 pl-4 text-right whitespace-nowrap">995 kr.</td>
						</tr>
						<tr class="border-b border-sand/20">
							<td class="py-2 pr-4">Dobbelt m/eget bad</td>
							<td class="py-2 px-4 text-center">2</td>
							<td class="py-2 pl-4 text-right whitespace-nowrap">1.295 kr.</td>
						</tr>
						<tr>
							<td class="py-2 pr-4">Lejlighed (3 vær. m/bad)</td>
							<td class="py-2 px-4 text-center">4</td>
							<td class="py-2 pl-4 text-right whitespace-nowrap">2.295 kr.</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<div class="bg-soft-gold/10 rounded-lg px-5 py-4 border border-soft-gold/30 mb-12 text-center">
			<p class="text-dark-brown font-serif text-sm sm:text-base">
				<i class="fa-solid fa-bed text-soft-gold mr-2" aria-hidden="true"></i>
				Vi fordeler værelserne — angiv blot at I ønsker overnatning, så finder vi det bedste match.
			</p>
		</div>

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
