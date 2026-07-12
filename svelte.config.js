import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			out: 'build',
			precompress: true
		}),
		// Content-Security-Policy, served as a response header by the
		// adapter-node server. mode 'auto' injects a per-request nonce for
		// SvelteKit's own inline hydration script, so script-src needs no
		// 'unsafe-inline'. Only the origins the site actually uses are
		// allow-listed (self-hosted Umami analytics, Google Fonts, the cdnjs
		// Font Awesome stylesheet + its webfonts). SvelteKit's navigation
		// announcer mounts client-side with one constant style attribute; allow
		// exactly that value by hash instead of opening every style attribute via
		// 'unsafe-inline'. A SvelteKit upgrade that changes the announcer style
		// will fail the security E2E test loudly. frame-ancestors is valid here
		// (header CSP, unlike a meta CSP) and supersedes the X-Frame-Options
		// header kept in hooks.server.ts for old browsers.
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'https://analytics.platform.devantler.tech'],
				'style-src': ['self'],
				'style-src-attr': [
					'unsafe-hashes',
					'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='
				],
				// Fonts are self-hosted (fontsource) and icons are inline SVG, so no
				// cross-origin style/font hosts remain in the policy.
				'font-src': ['self'],
				// data: covers the inline SVG favicon in app.html.
				'img-src': ['self', 'data:'],
				'connect-src': ['self', 'https://analytics.platform.devantler.tech'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'frame-ancestors': ['none']
			}
		}
	}
};

export default config;
