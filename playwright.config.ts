import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		// The build step generates every gallery photo's AVIF/WebP variants
		// (enhanced-img/sharp), which busts Playwright's 60s default on CI runners.
		timeout: 240_000,
		env: {
			DEV_SKIP_AUTH: 'true'
		}
	},
	testDir: 'tests/e2e',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
});
