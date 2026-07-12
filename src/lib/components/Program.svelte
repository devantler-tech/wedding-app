<script lang="ts">
	import {
		faBed,
		faCamera,
		faChampagneGlasses,
		faDoorOpen,
		faHeart,
		faMartiniGlass,
		faMoon,
		faMusic,
		faRing,
		faSun,
		faUtensils
	} from '@fortawesome/free-solid-svg-icons';
	import Icon from './Icon.svelte';
	const schedule = [
		{ time: '15:00', event: 'Vielse', icon: faRing },
		{ time: '15:30', event: 'Reception', icon: faChampagneGlasses },
		{ time: '16:00', event: 'Fotografering', icon: faCamera },
		{ time: '17:30', event: 'Velkomstdrinks', icon: faMartiniGlass },
		{ time: '18:00', event: 'Middag', icon: faUtensils },
		{ time: '23:30', event: 'Brudevals', icon: faHeart },
		{ time: '00:00', event: 'Fest', icon: faMusic },
		{ time: '01:00', event: 'Natmad', icon: faMoon },
		{ time: '01:30', event: 'Godnat', icon: faBed },
		{ time: '07:30', event: 'Morgenmad (til kl. 10)', icon: faSun },
		{ time: '11:00', event: 'Tjek ud', icon: faDoorOpen }
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
						<Icon icon={item.icon} class="text-soft-gold w-5 text-base sm:text-lg" />
						<span class="text-base sm:text-lg text-dark-brown font-serif">{item.event}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
