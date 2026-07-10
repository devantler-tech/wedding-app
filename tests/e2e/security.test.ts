import { test, expect } from '@playwright/test';

// The Content-Security-Policy is a tested invariant (#172): adapter-node
// serves a header CSP (svelte.config.js kit.csp) with a per-request nonce for
// SvelteKit's inline hydration script, allow-listing exactly the site's
// external origins (self-hosted Umami analytics, Google Fonts, cdnjs Font
// Awesome). A directive typo would silently break analytics, fonts or
// hydration in production, so the page is exercised under the enforced policy
// here and any browser-reported violation fails the test.

const invitationCodeLabel = /invitationskode/i;
const submitButtonName = /Se invitation/i;
const invalidCodeMessage = /brug koden MOCK1, MOCK2 eller ADMIN/i;

// Collects browser-level securitypolicyviolation events (the authoritative
// CSP signal — console text is browser-specific and can match unrelated
// logs), registered before any document script runs.
async function armCspViolationCapture(page: import('@playwright/test').Page): Promise<void> {
	await page.addInitScript(() => {
		const violations: string[] = [];
		(window as unknown as { __cspViolations: string[] }).__cspViolations = violations;
		document.addEventListener('securitypolicyviolation', (event) => {
			violations.push(
				`${event.violatedDirective}: ${event.blockedURI || 'inline'} @ ${event.sourceFile ?? ''}:${event.lineNumber ?? ''}`
			);
		});
	});
}

async function reportedCspViolations(page: import('@playwright/test').Page): Promise<string[]> {
	return page.evaluate(
		() => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []
	);
}

// Parses a CSP header into a directive → source-list map so the tests can
// assert exact source lists instead of substrings (a substring check would
// still pass if the policy silently grew extra allowances).
function parseCsp(csp: string): Map<string, string[]> {
	const directives = new Map<string, string[]>();
	for (const clause of csp.split(';')) {
		const [name, ...sources] = clause.trim().split(/\s+/);
		if (name) {
			directives.set(name, sources);
		}
	}
	return directives;
}

test('CSP header allows exactly what the page needs, with zero violations', async ({ page }) => {
	await armCspViolationCapture(page);

	const fontsCss = page.waitForResponse((response) =>
		response.url().startsWith('https://fonts.googleapis.com/')
	);
	const analyticsScript = page.waitForResponse((response) =>
		response.url().startsWith('https://analytics.platform.devantler.tech/script.js')
	);
	const response = await page.goto('/login');

	const cspHeader = response?.headers()['content-security-policy'];
	expect(cspHeader).toBeTruthy();

	const csp = parseCsp(cspHeader ?? '');
	expect(csp.get('default-src')).toEqual(["'self'"]);
	expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
	expect(csp.get('object-src')).toEqual(["'none'"]);
	expect(csp.get('base-uri')).toEqual(["'self'"]);
	expect(csp.get('form-action')).toEqual(["'self'"]);
	expect(csp.get('font-src')).toEqual([
		"'self'",
		'https://fonts.gstatic.com',
		'https://cdnjs.cloudflare.com'
	]);
	expect(csp.get('img-src')).toEqual(["'self'", 'data:']);
	expect(csp.get('connect-src')).toEqual(["'self'", 'https://analytics.platform.devantler.tech']);
	expect(csp.get('style-src')).toEqual([
		"'self'",
		'https://fonts.googleapis.com',
		'https://cdnjs.cloudflare.com'
	]);
	// style-src-attr 'unsafe-inline' is the documented compromise for the
	// SSR'd dynamic style attributes; tightening is tracked as a follow-up.
	expect(csp.get('style-src-attr')).toEqual(["'unsafe-inline'"]);
	// script-src: exactly self + the analytics origin + SvelteKit's
	// per-request hydration nonce — and nothing else (no 'unsafe-inline').
	const scriptSrc = csp.get('script-src') ?? [];
	expect(scriptSrc).toContain("'self'");
	expect(scriptSrc).toContain('https://analytics.platform.devantler.tech');
	expect(scriptSrc.filter((source) => source.startsWith("'nonce-"))).toHaveLength(1);
	expect(
		scriptSrc.filter(
			(source) =>
				source === "'self'" ||
				source === 'https://analytics.platform.devantler.tech' ||
				source.startsWith("'nonce-")
		)
	).toEqual(scriptSrc);

	// The external consumers actually load under the policy (a 404/DNS
	// failure or a blocked request must not pass).
	expect((await fontsCss).ok()).toBe(true);
	expect((await analyticsScript).ok()).toBe(true);

	// Exercise the hydrated app under the enforced CSP: the login form's
	// error state only renders when the (nonced) hydration script ran.
	await page.getByLabel(invitationCodeLabel).fill('WRONGCODE');
	await page.getByRole('button', { name: submitButtonName }).click();
	await expect(page.getByText(invalidCodeMessage)).toBeVisible();

	const violations = await reportedCspViolations(page);
	expect(violations, `CSP violations:\n${violations.join('\n')}`).toEqual([]);
});

test('transport and framing headers are served', async ({ page }) => {
	const response = await page.goto('/login');
	const headers = response?.headers() ?? {};

	expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['x-content-type-options']).toBe('nosniff');
});
