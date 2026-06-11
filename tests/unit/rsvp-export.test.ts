import { afterEach, describe, expect, test, vi } from 'vitest';

// Delegate $env/dynamic/private to process.env so DEV_SKIP_AUTH can be toggled per test.
vi.mock('$env/dynamic/private', () => ({
	env: new Proxy({} as Record<string, string | undefined>, {
		get(_target, prop: string) {
			return process.env[prop];
		}
	})
}));

// Mock the DB with a chainable builder that resolves to a fixed joined result set.
// Defined inside the factory because vi.mock is hoisted above module-scope consts.
vi.mock('../../src/lib/server/db.js', () => {
	const dbRows = [
		{
			name: 'Bob',
			attending: false,
			dietaryNotes: null,
			submittedAt: new Date('2026-02-03T09:30:00.000Z'),
			bookingRequested: null
		},
		{
			name: 'Alice',
			attending: true,
			dietaryNotes: 'Vegan, "no nuts"',
			submittedAt: new Date('2026-01-02T10:00:00.000Z'),
			bookingRequested: true
		}
	];
	const chain = {
		from: () => chain,
		innerJoin: () => chain,
		leftJoin: () => chain,
		orderBy: () => Promise.resolve(dbRows)
	};
	const mockDb = { select: () => chain };
	return { db: mockDb, getDb: () => mockDb };
});

const getAdminSession = vi.fn<(id: string) => Promise<boolean>>();
vi.mock('../../src/lib/server/auth.js', () => ({
	getAdminSession: (id: string) => getAdminSession(id)
}));

import { escapeCsvField, toCsv } from '../../src/lib/server/csv.js';
import { buildRsvpCsv, formatAttendance } from '../../src/lib/server/export.js';
import { GET } from '../../src/routes/api/admin/export/+server.js';

function cookiesWith(value: string | undefined) {
	return { get: () => value } as unknown as Parameters<typeof GET>[0]['cookies'];
}

function callGet(cookieValue: string | undefined) {
	return GET({ cookies: cookiesWith(cookieValue) } as Parameters<typeof GET>[0]);
}

describe('csv serialization', () => {
	test('leaves plain fields untouched', () => {
		expect(escapeCsvField('Alice')).toBe('Alice');
		expect(escapeCsvField('')).toBe('');
	});

	test('quotes and doubles embedded quotes, commas and newlines', () => {
		expect(escapeCsvField('a,b')).toBe('"a,b"');
		expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
		expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
		expect(escapeCsvField('carriage\rreturn')).toBe('"carriage\rreturn"');
	});

	test('toCsv assembles header + rows with CRLF and a trailing terminator', () => {
		const csv = toCsv(['a', 'b'], [['1', '2'], ['3,4', '5']]);
		expect(csv).toBe('a,b\r\n1,2\r\n"3,4",5\r\n');
	});
});

describe('formatAttendance', () => {
	test('maps the nullable boolean to a stable label', () => {
		expect(formatAttendance(true)).toBe('yes');
		expect(formatAttendance(false)).toBe('no');
		expect(formatAttendance(null)).toBe('no_response');
	});
});

describe('buildRsvpCsv', () => {
	const originalSkip = process.env.DEV_SKIP_AUTH;
	afterEach(() => {
		if (originalSkip === undefined) delete process.env.DEV_SKIP_AUTH;
		else process.env.DEV_SKIP_AUTH = originalSkip;
	});

	test('serializes DB rows in column order, escaping and mapping each field', async () => {
		delete process.env.DEV_SKIP_AUTH;
		const csv = await buildRsvpCsv();
		expect(csv).toBe(
			'name,attendance,dietary_notes,booking_requested,submitted_at\r\n' +
				'Bob,no,,no,2026-02-03T09:30:00.000Z\r\n' +
				'Alice,yes,"Vegan, ""no nuts""",yes,2026-01-02T10:00:00.000Z\r\n'
		);
	});

	test('falls back to mock rows (no DB) when DEV_SKIP_AUTH is set', async () => {
		process.env.DEV_SKIP_AUTH = 'true';
		const csv = await buildRsvpCsv();
		const lines = csv.trimEnd().split('\r\n');
		expect(lines[0]).toBe('name,attendance,dietary_notes,booking_requested,submitted_at');
		// Every mock guest is unanswered with no booking and no timestamp.
		for (const line of lines.slice(1)) {
			expect(line.endsWith('no_response,,no,')).toBe(true);
		}
		// First seeded pair "Charlotte og Orla" contributes both names.
		expect(csv).toContain('Charlotte,no_response,,no,');
		expect(csv).toContain('Orla,no_response,,no,');
	});
});

describe('GET /api/admin/export', () => {
	const originalSkip = process.env.DEV_SKIP_AUTH;
	afterEach(() => {
		if (originalSkip === undefined) delete process.env.DEV_SKIP_AUTH;
		else process.env.DEV_SKIP_AUTH = originalSkip;
		getAdminSession.mockReset();
	});

	test('rejects an unauthenticated request with 401', async () => {
		delete process.env.DEV_SKIP_AUTH;
		const res = await callGet(undefined);
		expect(res.status).toBe(401);
		expect(getAdminSession).not.toHaveBeenCalled();
		await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
	});

	test('rejects an invalid admin session with 401', async () => {
		delete process.env.DEV_SKIP_AUTH;
		getAdminSession.mockResolvedValue(false);
		const res = await callGet('bogus-session');
		expect(res.status).toBe(401);
		expect(getAdminSession).toHaveBeenCalledWith('bogus-session');
	});

	test('returns CSV with download headers for a valid admin session', async () => {
		delete process.env.DEV_SKIP_AUTH;
		getAdminSession.mockResolvedValue(true);
		const res = await callGet('valid-session');
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
		expect(res.headers.get('content-disposition')).toBe('attachment; filename="rsvps.csv"');
		const body = await res.text();
		expect(body.startsWith('name,attendance,dietary_notes,booking_requested,submitted_at')).toBe(
			true
		);
		expect(body).toContain('Alice,yes,');
	});

	test('bypasses auth and returns CSV when DEV_SKIP_AUTH is set', async () => {
		process.env.DEV_SKIP_AUTH = 'true';
		const res = await callGet(undefined);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
		expect(getAdminSession).not.toHaveBeenCalled();
	});
});
