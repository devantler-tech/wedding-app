import { test, expect } from '@playwright/test';

// The Content-Security-Policy is a tested invariant (#172): adapter-node
// serves a header CSP (svelte.config.js kit.csp) with a per-request nonce for
// SvelteKit's inline hydration script, allow-listing exactly the site's
// external origins (self-hosted Umami analytics, Google Fonts, cdnjs Font
// Awesome). A directive typo would silently break analytics, fonts or
// hydration in production, so the page is exercised under the enforced policy
// here and any console violation fails the test.

function collectCspViolations(page: import('@playwright/test').Page): string[] {
	const violations: string[] = [];
	page.on('console', (message) => {
		const text = message.text();
		if (text.includes('Content Security Policy') || text.includes('Refused to')) {
			violations.push(text);
		}
	});
	return violations;
}

test('CSP header allows exactly what the page needs, with zero violations', async ({ page }) => {
	const violations = collectCspViolations(page);

	const fontsCss = page.waitForResponse((response) =>
		response.url().startsWith('https://fonts.googleapis.com/')
	);
	const response = await page.goto('/login');

	const csp = response?.headers()['content-security-policy'];
	expect(csp).toBeTruthy();
	expect(csp).toContain("default-src 'self'");
	expect(csp).toContain('https://analytics.platform.devantler.tech');
	expect(csp).toContain('https://fonts.googleapis.com');
	expect(csp).toContain('https://fonts.gstatic.com');
	expect(csp).toContain('https://cdnjs.cloudflare.com');
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).toContain('nonce-'); // SvelteKit nonced its inline hydration script

	// The external stylesheet consumers survive the policy: the Google Fonts
	// css actually loads and the analytics script tag is still in the head.
	expect((await fontsCss).ok()).toBe(true);
	await expect(
		page.locator('script[src^="https://analytics.platform.devantler.tech/"]')
	).toHaveAttribute('defer', '');

	// Exercise the hydrated app under the enforced CSP: the login form's
	// error state only renders when the (nonced) hydration script ran.
	await page.getByLabel(/invitationskode/i).fill('WRONGCODE');
	await page.getByRole('button', { name: /Se invitation/i }).click();
	await expect(page.getByText(/brug koden MOCK1, MOCK2 eller ADMIN/i)).toBeVisible();

	expect(violations, `CSP violations:\n${violations.join('\n')}`).toEqual([]);
});

test('transport and framing headers are served', async ({ page }) => {
	const response = await page.goto('/login');
	const headers = response?.headers() ?? {};

	expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['x-content-type-options']).toBe('nosniff');
});
