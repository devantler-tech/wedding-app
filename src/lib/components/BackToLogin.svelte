<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<form
	method="POST"
	action="/logout"
	use:enhance
	class="fixed top-4 left-4 z-50"
>
	<button
		type="submit"
		class="flex items-center gap-2 px-3 py-2 bg-warm-white/90 backdrop-blur-sm border border-sand text-warm-brown text-sm rounded-lg shadow-sm hover:bg-warm-white hover:text-dark-brown hover:border-soft-gold transition-colors"
		aria-label="Gå tilbage til login"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				d="M15 19l-7-7 7-7"
			/>
		</svg>
		<span>Gå tilbage</span>
	</button>
</form>
