<script lang="ts">
	const schedule = [
		{ time: '14:30', event: 'Vielse', icon: 'fa-solid fa-ring' },
		{ time: '15:00', event: 'Reception', icon: 'fa-solid fa-champagne-glasses' },
		{ time: '16:00', event: 'Fotografering', icon: 'fa-solid fa-camera' },
		{ time: '17:30', event: 'Velkomstdrinks', icon: 'fa-solid fa-martini-glass' },
		{ time: '18:00', event: 'Middag', icon: 'fa-solid fa-utensils' },
		{ time: '23:30', event: 'Brudevals', icon: 'fa-solid fa-heart' },
		{ time: '00:00', event: 'Fest', icon: 'fa-solid fa-music' },
		{ time: '01:00', event: 'Natmad', icon: 'fa-solid fa-moon' },
		{ time: '01:30', event: 'Godnat', icon: 'fa-solid fa-bed' },
		{ time: '07:30', event: 'Morgenmad (til kl. 10)', icon: 'fa-solid fa-sun' },
		{ time: '11:00', event: 'Tjek ud', icon: 'fa-solid fa-door-open' }
	];
</script>

<section id="program" class="py-20 px-6 bg-warm-white">
	<div class="max-w-2xl mx-auto">
		<h2 class="text-4xl sm:text-5xl font-serif font-light text-dark-brown text-center mb-4">Program</h2>
		<div class="w-16 h-px bg-soft-gold mx-auto mb-12"></div>

		<div class="relative">
			<div class="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-sand/50"></div>

			{#each schedule as item (item.time)}
				<div class="relative flex items-start gap-4 sm:gap-6 mb-8 last:mb-0 group">
					<div class="relative z-10 w-12 sm:w-16 flex-shrink-0 text-right">
						<span class="text-sm sm:text-base font-sans text-warm-brown font-medium">{item.time}</span>
					</div>

					<div class="relative z-10 w-3 h-3 mt-1.5 rounded-full bg-soft-gold flex-shrink-0 ring-4 ring-warm-white group-hover:scale-125 transition-transform"></div>

					<div class="flex items-center gap-3 pb-2">
						<i class="{item.icon} text-soft-gold w-5 text-center text-base sm:text-lg" aria-hidden="true"></i>
						<span class="text-base sm:text-lg text-dark-brown font-serif">{item.event}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
