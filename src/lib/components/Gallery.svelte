<script lang="ts">
	import { galleryEntries } from '$lib/gallery-data.js';

	let selectedImage = $state<number | null>(null);
</script>

<section id="galleri" class="py-20 px-6 bg-cream">
	<div class="max-w-5xl mx-auto">
		<h2 class="text-4xl sm:text-5xl font-serif font-light text-dark-brown text-center mb-4">Vores Rejse</h2>
		<div class="w-16 h-px bg-soft-gold mx-auto mb-12"></div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each galleryEntries as entry, i}
				<button
					class="group relative overflow-hidden rounded-lg aspect-[4/3] bg-sand/30 cursor-pointer"
					onclick={() => (selectedImage = i)}
				>
					<img
						src={entry.src}
						alt={entry.alt}
						class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
						onerror={(e) => {
							const target = e.currentTarget as HTMLImageElement;
							target.style.display = 'none';
						}}
					/>
					<div class="absolute inset-0 bg-dark-brown/0 group-hover:bg-dark-brown/30 transition-colors duration-300 flex items-end">
						<div class="p-4 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300">
							<p class="text-warm-white text-sm font-sans">{entry.date}</p>
							<p class="text-warm-white text-base font-serif">{entry.caption}</p>
						</div>
					</div>
					<div class="absolute inset-0 flex items-center justify-center">
						<span class="text-warm-brown/50 font-serif text-lg">{entry.date} — {entry.caption}</span>
					</div>
				</button>
			{/each}
		</div>
	</div>
</section>

{#if selectedImage !== null}
	<div
		class="fixed inset-0 z-50 bg-dark-brown/80 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
	>
		<button
			class="absolute inset-0"
			onclick={() => (selectedImage = null)}
			aria-label="Luk billede"
		></button>
		<div class="relative max-w-4xl w-full">
			<img
				src={galleryEntries[selectedImage].src}
				alt={galleryEntries[selectedImage].alt}
				class="w-full rounded-lg shadow-2xl"
			/>
			<div class="mt-4 text-center">
				<p class="text-warm-white/70 text-sm">{galleryEntries[selectedImage].date}</p>
				<p class="text-warm-white text-lg font-serif">{galleryEntries[selectedImage].caption}</p>
			</div>
			<button
				class="absolute -top-2 -right-2 w-10 h-10 bg-cream rounded-full flex items-center justify-center text-dark-brown hover:bg-soft-gold hover:text-warm-white transition-colors"
				onclick={() => (selectedImage = null)}
				aria-label="Luk"
			>
				✕
			</button>
		</div>
	</div>
{/if}
