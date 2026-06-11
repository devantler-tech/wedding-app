import { afterEach, describe, expect, test, vi } from 'vitest';

import { isRsvpClosed } from '../../src/lib/server/rsvp-deadline.js';

const NOW = new Date('2026-06-11T12:00:00.000Z');

describe('isRsvpClosed', () => {
	test('open when deadline is unset', () => {
		expect(isRsvpClosed(undefined, NOW)).toBe(false);
		expect(isRsvpClosed(null, NOW)).toBe(false);
	});

	test('open when deadline is an empty string', () => {
		expect(isRsvpClosed('', NOW)).toBe(false);
	});

	test('open when deadline is unparseable (fail-open, never lock guests out by mistake)', () => {
		expect(isRsvpClosed('not-a-date', NOW)).toBe(false);
		expect(isRsvpClosed('2026-13-99', NOW)).toBe(false);
	});

	test('open when the deadline is in the future', () => {
		expect(isRsvpClosed('2027-01-01', NOW)).toBe(false);
	});

	test('closed when the deadline is in the past', () => {
		expect(isRsvpClosed('2026-01-01', NOW)).toBe(true);
	});

	test('closed strictly after the cutoff instant, open at or before it', () => {
		const cutoff = '2026-06-11T12:00:00.000Z';
		// exactly at the cutoff → still open (now > cutoff is false)
		expect(isRsvpClosed(cutoff, new Date(cutoff))).toBe(false);
		// one millisecond before → open
		expect(isRsvpClosed(cutoff, new Date('2026-06-11T11:59:59.999Z'))).toBe(false);
		// one millisecond after → closed
		expect(isRsvpClosed(cutoff, new Date('2026-06-11T12:00:00.001Z'))).toBe(true);
	});

	test('accepts full ISO 8601 timestamps, not just dates', () => {
		expect(isRsvpClosed('2026-06-11T18:00:00.000Z', NOW)).toBe(false);
		expect(isRsvpClosed('2026-06-11T06:00:00.000Z', NOW)).toBe(true);
	});

	test('defaults the comparison clock to the current time', () => {
		// A deadline far in the past is closed; far in the future is open — without
		// passing `now`, exercising the real-clock default path.
		expect(isRsvpClosed('2000-01-01')).toBe(true);
		expect(isRsvpClosed('2999-01-01')).toBe(false);
	});
});

// Delegate $env/dynamic/private to process.env so RSVP_DEADLINE can be toggled per test.
vi.mock('$env/dynamic/private', () => ({
	env: new Proxy({} as Record<string, string | undefined>, {
		get(_target, prop: string) {
			return process.env[prop];
		}
	})
}));

// The deadline gate runs before any DB access; a no-op transaction is enough for
// the open-path cases (guestCount=0 means the callback never touches the tx).
vi.mock('../../src/lib/server/db.js', () => {
	const mockDb = { transaction: async (fn: (tx: unknown) => Promise<void>) => fn({}) };
	return { db: mockDb, getDb: () => mockDb };
});

const validateApiSession = vi.fn();
vi.mock('../../src/lib/server/validate-session.js', () => ({
	validateApiSession: () => validateApiSession()
}));

import { POST } from '../../src/routes/api/rsvp/+server.js';

function postWith(deadline: string | undefined) {
	if (deadline === undefined) delete process.env.RSVP_DEADLINE;
	else process.env.RSVP_DEADLINE = deadline;
	validateApiSession.mockResolvedValue({ session: { guestPairId: 1 }, earlyResponse: null });
	const request = {
		formData: async () => new Map([['guestCount', '0']])
	} as unknown as Request;
	return POST({ request, cookies: { get: () => 'session-id' } } as unknown as Parameters<
		typeof POST
	>[0]);
}

describe('POST /api/rsvp deadline gate', () => {
	afterEach(() => {
		delete process.env.RSVP_DEADLINE;
		vi.clearAllMocks();
	});

	test('rejects with 403 "RSVP is closed" when the deadline has passed', async () => {
		const res = await postWith('2000-01-01');
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: 'RSVP is closed' });
	});

	test('proceeds (200) when the deadline is unset', async () => {
		const res = await postWith(undefined);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ success: true });
	});

	test('proceeds (200) when the deadline is in the future', async () => {
		const res = await postWith('2999-01-01');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ success: true });
	});
});
