import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

// Run axe at WCAG 2.1 AA and filter to critical/serious only (avoids minor/moderate noise
// from e.g. placeholder contrast in generated form elements).
async function checkA11y(page: import('@playwright/test').Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	const blocking = results.violations.filter((v) =>
		['critical', 'serious'].includes(v.impact as string)
	);
	expect(blocking, `a11y violations:\n${JSON.stringify(blocking, null, 2)}`).toEqual([]);
}

test('login page has no critical/serious a11y violations', async ({ page }) => {
	await page.goto('/login');
	await checkA11y(page);
});

test('error page has no critical/serious a11y violations', async ({ page }) => {
	await page.goto('/this-page-does-not-exist');
	await checkA11y(page);
});

test('main page (guest) has no critical/serious a11y violations', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel(/invitationskode/i).fill('MOCK1');
	await page.getByRole('button', { name: /Se invitation/i }).click();
	await page.waitForURL('**/');
	await checkA11y(page);
});

test('admin page has no critical/serious a11y violations', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel(/invitationskode/i).fill('ADMIN');
	await page.getByRole('button', { name: /Se invitation/i }).click();
	await page.waitForURL('**/admin');
	await checkA11y(page);
});
