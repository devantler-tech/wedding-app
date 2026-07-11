import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// enhancedImages must run before sveltekit so <enhanced:img> markup and
	// ?enhanced imports are transformed ahead of the Svelte compiler.
	plugins: [enhancedImages(), tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}']
	}
});
