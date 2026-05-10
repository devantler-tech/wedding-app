import { defineConfig } from '@playwright/test';

const isK8sE2E = process.env.K8S_E2E === 'true';

export default defineConfig({
	...(isK8sE2E
		? {
				use: { baseURL: `http://localhost:${process.env.K8S_PORT || '3000'}` }
			}
		: {
				webServer: {
					command: 'npm run build && npm run preview',
					port: 4173,
					reuseExistingServer: !process.env.CI,
					env: {
						DEV_SKIP_AUTH: 'true'
					}
				}
			}),
	testDir: 'tests/e2e',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
});
