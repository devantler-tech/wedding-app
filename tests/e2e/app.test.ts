import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
	test('shows login form with correct title', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: /Aimée.*Nikolai Emil/ })).toBeVisible();
		await expect(page.getByLabel(/invitationskode/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /Se invitation/i })).toBeVisible();
	});

	test('shows date on login page', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByText('16. maj 2027')).toBeVisible();
	});
});

test.describe('Admin view (dev mode)', () => {
	test('admin code logs in and shows attendee overview', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel(/invitationskode/i).fill('ADMIN');
		await page.getByRole('button', { name: /Se invitation/i }).click();
		await page.waitForURL('**/admin');

		await expect(page.getByRole('heading', { name: /Oversigt over gæster/i })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Test1 og Test2' })).toBeVisible();
		await expect(page.getByText('Charlotte og Orla')).toBeVisible();
		await expect(page.getByText(/MOCK14/)).toBeVisible();
		await expect(page.getByText('Vegetarisk')).toBeVisible();
		await expect(page.getByText(/Ønsker værelse/)).toBeVisible();
	});

	test('full admin code is accepted', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel(/invitationskode/i).fill('harndrupbryllupadmins1234');
		await page.getByRole('button', { name: /Se invitation/i }).click();
		await page.waitForURL('**/admin');
		await expect(page.getByRole('heading', { name: /Oversigt over gæster/i })).toBeVisible();
	});

	test('"Gå tilbage" on admin view returns to login and clears cookies', async ({
		page,
		context
	}) => {
		await page.goto('/login');
		await page.getByLabel(/invitationskode/i).fill('ADMIN');
		await page.getByRole('button', { name: /Se invitation/i }).click();
		await page.waitForURL('**/admin');

		await page.getByRole('button', { name: /Gå tilbage/i }).click();
		await page.waitForURL('**/login');
		await expect(page.getByLabel(/invitationskode/i)).toBeVisible();
		const cookies = await context.cookies();
		expect(cookies.find((c) => c.name === 'admin_session')).toBeUndefined();
	});
});

test.describe('Main page (dev mode)', () => {
	test('shows hero section with couple names', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText(/Vi skal giftes/i)).toBeVisible();
		await expect(page.getByRole('heading', { name: /Aimée.*Nikolai Emil/ })).toBeVisible();
	});

	test('shows countdown timer', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Dage', { exact: true })).toBeVisible();
		await expect(page.getByText('Timer', { exact: true })).toBeVisible();
	});

	test('shows program section with events', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Program' })).toBeVisible();
		await expect(page.getByText('Vielse')).toBeVisible();
		await expect(page.getByText('Middag')).toBeVisible();
		await expect(page.getByText('Brudevals')).toBeVisible();
		await expect(page.getByText('Morgenmad')).toBeVisible();
	});

	test('shows gallery section', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Vores Rejse' })).toBeVisible();
	});

	test('shows RSVP section with guest names', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'RSVP' })).toBeVisible();
		await expect(page.getByText('Test1 og Test2')).toBeVisible();
		await expect(page.getByText('Ja, jeg deltager').first()).toBeVisible();
	});

	test('shows room booking section', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('#booking').getByRole('heading', { name: 'Overnatning' })).toBeVisible();
		await expect(page.getByText(/ønsker at booke et værelse/i)).toBeVisible();
	});

	test('shows practical information', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Praktisk Information' })).toBeVisible();
		await expect(page.getByText(/trøje eller jakke/i)).toBeVisible();
		await expect(page.getByRole('heading', { name: 'En aften for voksne' })).toBeVisible();
	});

	test('shows wishlist section with link', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Ønskeliste' })).toBeVisible();
		const link = page.getByRole('link', { name: /Ønskeskyen/i });
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute('href', 'https://onskeskyen.dk/s/eqj9hm');
	});

	test('shows footer', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Gl. Brydegaard').last()).toBeVisible();
	});

	test('shows "Gå tilbage" button that returns to login', async ({ page, context }) => {
		await page.goto('/');
		const back = page.getByRole('button', { name: /Gå tilbage/i });
		await expect(back).toBeVisible();
		await back.click();
		await page.waitForURL('**/login');
		await expect(page.getByLabel(/invitationskode/i)).toBeVisible();
		const cookies = await context.cookies();
		expect(cookies.find((c) => c.name === 'session')).toBeUndefined();
		expect(cookies.find((c) => c.name === 'admin_session')).toBeUndefined();
	});

	test('navigation links work with smooth scroll', async ({ page }) => {
		await page.goto('/');
		// Scroll well past the hero to trigger nav visibility
		await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
		await page.waitForTimeout(800);

		const programLink = page.getByRole('link', { name: 'Program' }).first();
		await expect(programLink).toBeVisible();
	});
});
