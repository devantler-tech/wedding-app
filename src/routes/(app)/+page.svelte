<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import Program from '$lib/components/Program.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import Rsvp from '$lib/components/Rsvp.svelte';
	import RoomBooking from '$lib/components/RoomBooking.svelte';
	import PracticalInfo from '$lib/components/PracticalInfo.svelte';
	import Wishlist from '$lib/components/Wishlist.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import BackToLogin from '$lib/components/BackToLogin.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<BackToLogin hideOnScroll />
<Nav />

<main>
	<Hero pairName={data.guestPair.name} />
	<Program />
	<Gallery />
	<Rsvp guests={data.guests} />
	<RoomBooking booking={data.booking} />
	<PracticalInfo />
	<Wishlist />
</main>

<Footer />
