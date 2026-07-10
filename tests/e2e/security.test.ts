import { test, expect } from '@playwright/test';

// The Content-Security-Policy is a tested invariant (#172): adapter-node
// serves a header CSP (svelte.config.js kit.csp) with a per-request nonce for
// SvelteKit's inline hydration script, allow-listing exactly the site's
// external origins (self-hosted Umami analytics, Google Fonts, cdnjs Font
// Awesome). A directive typo would silently break analytics, fonts or
// hydration in production, so the pages are exercised under the enforced
// policy here and any browser-reported violation fails the test.
//
// kit.csp is app-wide (SvelteKit has no per-route CSP surface), so asserting
// the header shape on representative pages and zero violations on the two
// public entry points (/login and the invitation page /) covers every route;
// /admin renders the same policy from the same config.

const invitationCodeLabel = /invitationskode/i;
const submitButtonName = /Se invitation/i;
const invalidCodeMessage = /brug koden MOCK1, MOCK2 eller ADMIN/i;
const cspSourceSeparator = /\s+/;

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

// Parses a CSP header into a directive → source-list map, preserving CSP's
// own duplicate semantics: the browser enforces the FIRST occurrence of a
// directive and ignores later ones, so later duplicates are kept out of the
// map and reported for the test to reject (a duplicated directive in our
// header would mean the asserted policy differs from the enforced one).
function parseCsp(csp: string): { directives: Map<string, string[]>; duplicates: string[] } {
	const directives = new Map<string, string[]>();
	const duplicates: string[] = [];
	for (const clause of csp.split(';')) {
		const [name, ...sources] = clause.trim().split(cspSourceSeparator);
		if (!name) {
			continue;
		}
		if (directives.has(name)) {
			duplicates.push(name);
			continue;
		}
		directives.set(name, sources);
	}
	return { directives, duplicates };
}

// Asserts the exact shape of the served CSP header and returns the hydration
// nonce so callers can compare nonces across responses.
function assertCspShape(cspHeader: string | undefined): string {
	expect(cspHeader).toBeTruthy();

	const { directives: csp, duplicates } = parseCsp(cspHeader ?? '');
	expect(duplicates, 'the browser enforces the first duplicate directive — reject them').toEqual(
		[]
	);

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
	// SSR'd dynamic style attributes (#175 tracks tightening); the -elem
	// variant must not exist so styles stay governed by style-src above.
	expect(csp.get('style-src-attr')).toEqual(["'unsafe-inline'"]);
	expect(csp.has('style-src-elem')).toBe(false);
	// script-src: exactly self + the analytics origin + SvelteKit's
	// per-request hydration nonce — and nothing else (no 'unsafe-inline').
	// The -elem/-attr variants must not exist: a future
	// `script-src-elem 'unsafe-inline'` would override script-src for
	// element scripts while every script-src assertion stayed green.
	expect(csp.has('script-src-elem')).toBe(false);
	expect(csp.has('script-src-attr')).toBe(false);
	const scriptSrc = csp.get('script-src') ?? [];
	expect(scriptSrc).toContain("'self'");
	expect(scriptSrc).toContain('https://analytics.platform.devantler.tech');
	const nonces = scriptSrc.filter((source) => source.startsWith("'nonce-"));
	expect(nonces).toHaveLength(1);
	expect(
		scriptSrc.filter(
			(source) =>
				source === "'self'" ||
				source === 'https://analytics.platform.devantler.tech' ||
				source.startsWith("'nonce-")
		)
	).toEqual(scriptSrc);

	return nonces[0];
}

test('CSP header allows exactly what the page needs, with zero violations', async ({ page }) => {
	await armCspViolationCapture(page);

	const fontsCss = page.waitForResponse((response) =>
		response.url().startsWith('https://fonts.googleapis.com/')
	);
	const fontBinary = page.waitForResponse((response) =>
		response.url().startsWith('https://fonts.gstatic.com/')
	);
	const analyticsScript = page.waitForResponse((response) =>
		response.url().startsWith('https://analytics.platform.devantler.tech/script.js')
	);
	const response = await page.goto('/login');

	assertCspShape(response?.headers()['content-security-policy']);

	// The external consumers actually load under the policy: the stylesheet
	// AND a real font binary from the font origin (a blocked font fetch must
	// not go unnoticed), plus the analytics script itself.
	expect((await fontsCss).ok()).toBe(true);
	expect((await fontBinary).ok()).toBe(true);
	expect((await analyticsScript).ok()).toBe(true);

	// Exercise the hydrated app under the enforced CSP: the login form's
	// error state only renders when the (nonced) hydration script ran.
	await page.getByLabel(invitationCodeLabel).fill('WRONGCODE');
	await page.getByRole('button', { name: submitButtonName }).click();
	await expect(page.getByText(invalidCodeMessage)).toBeVisible();

	const violations = await reportedCspViolations(page);
	expect(violations, `CSP violations:\n${violations.join('\n')}`).toEqual([]);
});

test('the invitation page serves the same policy with zero violations', async ({ page }) => {
	await armCspViolationCapture(page);

	const response = await page.goto('/');

	assertCspShape(response?.headers()['content-security-policy']);
	await expect(page.locator('body')).toBeVisible();

	const violations = await reportedCspViolations(page);
	expect(violations, `CSP violations:\n${violations.join('\n')}`).toEqual([]);
});

test('the hydration nonce is unique per response', async ({ request }) => {
	const first = await request.get('/login');
	const second = await request.get('/login');

	const firstNonce = assertCspShape(first.headers()['content-security-policy']);
	const secondNonce = assertCspShape(second.headers()['content-security-policy']);
	expect(firstNonce).not.toBe(secondNonce);
});

test('transport and framing headers are served', async ({ page }) => {
	const response = await page.goto('/login');
	const headers = response?.headers() ?? {};

	expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['x-content-type-options']).toBe('nosniff');
});
