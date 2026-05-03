<script lang="ts">
	import { galleryEntries } from '$lib/gallery-data.js';

	let selectedImage = $state<number | null>(null);

	function close() {
		selectedImage = null;
	}

	function prev() {
		if (selectedImage === null) return;
		selectedImage = (selectedImage - 1 + galleryEntries.length) % galleryEntries.length;
	}

	function next() {
		if (selectedImage === null) return;
		selectedImage = (selectedImage + 1) % galleryEntries.length;
	}

	function onKey(e: KeyboardEvent) {
		if (selectedImage === null) return;
		if (e.key === 'Escape') close();
		if (e.key === 'ArrowLeft') prev();
		if (e.key === 'ArrowRight') next();
	}
</script>

<svelte:window onkeydown={onKey} />

<section id="galleri" class="py-20 px-6 bg-cream">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-4xl sm:text-5xl font-serif font-light text-dark-brown text-center mb-4">Vores Rejse</h2>
		<div class="w-16 h-px bg-soft-gold mx-auto mb-4"></div>
		<p class="text-center text-warm-brown font-serif italic mb-12 max-w-xl mx-auto">
			Et lille udvalg af øjeblikke fra vejen hertil
		</p>

		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
			{#each galleryEntries as entry, i (entry.src)}
				<button
					type="button"
					class="group relative overflow-hidden rounded-sm aspect-square bg-sand/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-soft-gold"
					onclick={() => (selectedImage = i)}
					aria-label={entry.caption}
				>
					<img
						src={entry.src}
						alt={entry.alt}
						loading="lazy"
						decoding="async"
						class="w-full h-full object-cover grayscale group-hover:grayscale-0 group-focus:grayscale-0 transition-[filter,transform] duration-700 ease-out group-hover:scale-105"
					/>
					<div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-dark-brown/80 to-transparent opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300">
						<p class="text-warm-white text-xs sm:text-sm font-serif italic leading-snug">
							{entry.caption}
						</p>
					</div>
				</button>
			{/each}
		</div>
	</div>
</section>

{#if selectedImage !== null}
	<div
		class="fixed inset-0 z-50 bg-dark-brown/90 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Billedvisning"
	>
		<button
			class="absolute inset-0"
			onclick={close}
			aria-label="Luk billede"
		></button>

		<button
			class="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-cream/90 hover:bg-cream rounded-full flex items-center justify-center text-dark-brown transition-colors"
			onclick={prev}
			aria-label="Forrige billede"
		>
			<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
		</button>

		<button
			class="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-cream/90 hover:bg-cream rounded-full flex items-center justify-center text-dark-brown transition-colors"
			onclick={next}
			aria-label="Næste billede"
		>
			<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
		</button>

		<div class="relative max-w-5xl w-full max-h-full flex flex-col items-center">
			<img
				src={galleryEntries[selectedImage].src}
				alt={galleryEntries[selectedImage].alt}
				class="max-w-full max-h-[80vh] w-auto rounded-sm shadow-2xl object-contain"
			/>
			<div class="mt-4 text-center">
				<p class="text-warm-white text-lg font-serif italic">{galleryEntries[selectedImage].caption}</p>
				<p class="text-warm-white/60 text-xs mt-1 font-sans">
					{selectedImage + 1} / {galleryEntries.length}
				</p>
			</div>
			<button
				class="absolute -top-2 -right-2 w-10 h-10 bg-cream rounded-full flex items-center justify-center text-dark-brown hover:bg-soft-gold hover:text-warm-white transition-colors"
				onclick={close}
				aria-label="Luk"
			>
				<i class="fa-solid fa-xmark" aria-hidden="true"></i>
			</button>
		</div>
	</div>
{/if}
