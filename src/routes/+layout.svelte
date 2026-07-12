<script lang="ts">
	// Self-hosted fonts (issue #176 lever 3): only the weights the design
	// actually uses, served same-origin instead of render-blocking
	// cross-origin CSS from fonts.googleapis.com.
	import '@fontsource/cormorant-garamond/latin-300.css';
	import '@fontsource/cormorant-garamond/latin-400.css';
	import '@fontsource/cormorant-garamond/latin-400-italic.css';
	import '@fontsource/cormorant-garamond/latin-500.css';
	import '@fontsource/inter/latin-400.css';
	import '@fontsource/inter/latin-500.css';
	import '@fontsource/pinyon-script/latin-400.css';
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}
