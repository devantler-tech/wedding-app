<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types.js';

	let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-cream">
	<div class="max-w-md w-full px-6">
		<div class="text-center mb-12">
			<p class="text-soft-gold mb-2" style="font-family: var(--font-script); font-size: 4.5rem; line-height: 1; letter-spacing: 0.02em;">
				Bryllup
			</p>
			<h1 class="text-5xl font-serif font-light text-dark-brown mb-4">
				Aimée & Nikolai Emil
			</h1>
			<p class="text-warm-brown text-lg">16. maj 2027</p>
			<div class="w-16 h-px bg-soft-gold mx-auto mt-6"></div>
		</div>

		<form method="POST" use:enhance class="space-y-6">
			<div>
				<label for="code" class="block text-sm font-medium text-warm-brown mb-2">
					Indtast jeres invitationskode
				</label>
				<input
					id="code"
					name="code"
					type="text"
					required
					autocomplete="off"
					value={form?.code ?? ''}
					placeholder="Kode"
					class="w-full px-4 py-3 border border-sand rounded-lg bg-warm-white text-dark-brown placeholder-sand focus:outline-none focus:ring-2 focus:ring-soft-gold focus:border-soft-gold text-center text-lg tracking-widest uppercase"
				/>
			</div>

			{#if form?.error}
				<p class="text-red-600 text-sm text-center">{form.error}</p>
			{/if}

			<button
				type="submit"
				class="w-full py-3 px-4 bg-soft-gold text-warm-white rounded-lg font-medium hover:bg-warm-brown transition-colors duration-200"
			>
				Se invitation
			</button>
		</form>
	</div>
</div>
