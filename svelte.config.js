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
		// Font Awesome stylesheet + its webfonts). style-src-attr stays
		// 'unsafe-inline' as a documented compromise: several components bind
		// dynamic inline style attributes (e.g. the gallery's transform), which
		// cannot be nonced or hashed — scripts, not style attributes, are the
		// injection surface this policy hardens. frame-ancestors is valid here
		// (header CSP, unlike a meta CSP) and supersedes the X-Frame-Options
		// header kept in hooks.server.ts for old browsers.
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'https://analytics.platform.devantler.tech'],
				'style-src': ['self', 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
				'style-src-attr': ['unsafe-inline'],
				'font-src': ['self', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
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
