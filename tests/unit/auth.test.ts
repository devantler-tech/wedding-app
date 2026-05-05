import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	getAdminCode,
	validateAdminCode
} from '../../src/lib/server/auth.js';

// Admin session functions are now async and DB-backed.
// We test them with a mock that simulates the database.
const store = new Map<string, { id: string; expiresAt: Date }>();

vi.mock('../../src/lib/server/db.js', () => {
	function createMockDb() {
		return {
			insert: () => ({
				values: (row: { id: string; expiresAt: Date }) => {
					store.set(row.id, row);
					return Promise.resolve();
				}
			}),
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => {
							// Return all non-expired sessions from store.
							// The real WHERE clause filters by id + expiry, but since
							// tests call with a specific id, we let the test control
							// what's in the store.
							const now = new Date();
							const valid = [...store.values()]
								.filter((r) => r.expiresAt > now)
								.map((r) => ({ id: r.id }));
							return Promise.resolve(valid);
						}
					})
				})
			}),
			delete: () => ({
				where: () => {
					// In tests, we call deleteAdminSession with a known id.
					// Since we can't inspect the opaque drizzle condition,
					// we clear the store entry in the test directly.
					return Promise.resolve();
				}
			})
		};
	}

	return {
		db: createMockDb(),
		getDb: createMockDb
	};
});

describe('admin auth', () => {
	const originalAdminCode = process.env.ADMIN_CODE;

	afterEach(() => {
		if (originalAdminCode === undefined) delete process.env.ADMIN_CODE;
		else process.env.ADMIN_CODE = originalAdminCode;
		store.clear();
	});

	test('getAdminCode falls back to default when env is unset', () => {
		delete process.env.ADMIN_CODE;
		expect(getAdminCode()).toBe('harndrupbryllupadmins1234');
	});

	test('getAdminCode honours ADMIN_CODE env var', () => {
		process.env.ADMIN_CODE = 'custom-secret-code';
		expect(getAdminCode()).toBe('custom-secret-code');
	});

	test('validateAdminCode accepts the configured code (with surrounding whitespace)', () => {
		delete process.env.ADMIN_CODE;
		expect(validateAdminCode('harndrupbryllupadmins1234')).toBe(true);
		expect(validateAdminCode('  harndrupbryllupadmins1234  ')).toBe(true);
	});

	test('validateAdminCode rejects wrong codes regardless of length', () => {
		delete process.env.ADMIN_CODE;
		expect(validateAdminCode('')).toBe(false);
		expect(validateAdminCode('WRONGCODE')).toBe(false);
		expect(validateAdminCode('harndrupbryllupadmins0000')).toBe(false);
		expect(validateAdminCode('HARNDRUPBRYLLUPADMINS1234')).toBe(false);
	});

	describe('admin session lifecycle', () => {
		test('createAdminSession returns a 64-char hex session id and persists it', async () => {
			const { createAdminSession } = await import('../../src/lib/server/auth.js');
			const id = await createAdminSession();
			expect(id).toMatch(/^[0-9a-f]{64}$/);
			expect(store.has(id)).toBe(true);
			const session = store.get(id);
			expect(session).toBeDefined();
			expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
		});

		test('createAdminSession returns unique ids', async () => {
			const { createAdminSession } = await import('../../src/lib/server/auth.js');
			const id1 = await createAdminSession();
			const id2 = await createAdminSession();
			expect(id1).not.toBe(id2);
		});

		test('getAdminSession returns true for valid session', async () => {
			const { getAdminSession } = await import('../../src/lib/server/auth.js');
			// Insert a valid session into the store
			const expires = new Date(Date.now() + 1000 * 60 * 60);
			store.set('test-session', { id: 'test-session', expiresAt: expires });

			const result = await getAdminSession('test-session');
			expect(result).toBe(true);
		});

		test('getAdminSession returns false for unknown session', async () => {
			const { getAdminSession } = await import('../../src/lib/server/auth.js');
			const result = await getAdminSession('nonexistent');
			expect(result).toBe(false);
		});

		test('getAdminSession returns false for expired session', async () => {
			const { getAdminSession } = await import('../../src/lib/server/auth.js');
			// Insert an expired session
			store.set('expired', { id: 'expired', expiresAt: new Date(Date.now() - 1000) });

			const result = await getAdminSession('expired');
			expect(result).toBe(false);
		});

		test('deleteAdminSession resolves without error', async () => {
			const { deleteAdminSession } = await import('../../src/lib/server/auth.js');
			await expect(deleteAdminSession('any-id')).resolves.toBeUndefined();
		});
	});
});
