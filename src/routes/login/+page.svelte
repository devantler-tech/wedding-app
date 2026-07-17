<script lang="ts">
	import pinyonScriptLatin400 from '@fontsource/pinyon-script/files/pinyon-script-latin-400-normal.woff2?url';
	import { enhance } from '$app/forms';
	import CornerOrnament from '$lib/components/CornerOrnament.svelte';
	import CriticalFontPreload from '$lib/components/CriticalFontPreload.svelte';
	import HeroBackground from '$lib/components/HeroBackground.svelte';
	import type { ActionData } from './$types.js';

	let { form }: { form: ActionData } = $props();
</script>

<CriticalFontPreload href={pinyonScriptLatin400} />

<div class="login-bg min-h-screen flex items-center justify-center bg-cream relative overflow-hidden">
	<HeroBackground preload />
	<CornerOrnament corner="tl" size={150} />
	<CornerOrnament corner="tr" size={150} />
	<div class="max-w-md w-full px-6">
		<div class="text-center mb-12">
			<p class="wedding-script-heading text-dark-brown mb-2">
				Bryllup
			</p>
			<h1
				class="wedding-couple-heading font-serif font-light text-dark-brown mb-4 whitespace-nowrap"
			>
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
					autocapitalize="characters"
					spellcheck="false"
					autocorrect="off"
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
				class="w-full py-3 px-4 bg-soft-gold text-dark-brown rounded-lg font-medium hover:bg-warm-brown hover:text-warm-white transition-colors duration-200"
			>
				Se invitation
			</button>
		</form>
	</div>
</div>

<style>
	.login-bg {
		position: relative;
		isolation: isolate;
	}
	.login-bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			rgba(240, 223, 204, 0.55) 0%,
			rgba(240, 223, 204, 0.85) 70%,
			rgba(240, 223, 204, 0.95) 100%
		);
		z-index: -1;
	}
</style>
