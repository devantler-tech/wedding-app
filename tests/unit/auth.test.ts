import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	getAdminCode,
	validateAdminCode
} from '../../src/lib/server/auth.js';

// Admin session functions are now async and DB-backed.
// We test them with a mock that simulates the database with proper ID filtering.
const store = new Map<string, { id: string; expiresAt: Date }>();

// Track the last sessionId passed to where() so select/delete can filter correctly.
let lastQueriedId: string | null = null;

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
							// Filter by the tracked session ID and expiry
							if (!lastQueriedId) return Promise.resolve([]);
							const session = store.get(lastQueriedId);
							if (session && session.expiresAt > new Date()) {
								return Promise.resolve([{ id: session.id }]);
							}
							return Promise.resolve([]);
						}
					})
				})
			}),
			delete: () => ({
				where: () => {
					// Delete the tracked session ID from store
					if (lastQueriedId) {
						store.delete(lastQueriedId);
					}
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

// Intercept drizzle-orm's eq() to capture the session ID being queried.
vi.mock('drizzle-orm', async (importOriginal) => {
	const original = await importOriginal<typeof import('drizzle-orm')>();
	return {
		...original,
		eq: (...args: unknown[]) => {
			// The second argument to eq() is the session ID value
			if (typeof args[1] === 'string') {
				lastQueriedId = args[1];
			}
			return original.eq(...(args as Parameters<typeof original.eq>));
		}
	};
});

describe('admin auth', () => {
	const originalAdminCode = process.env.ADMIN_CODE;

	afterEach(() => {
		if (originalAdminCode === undefined) delete process.env.ADMIN_CODE;
		else process.env.ADMIN_CODE = originalAdminCode;
		store.clear();
		lastQueriedId = null;
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
			const expires = new Date(Date.now() + 1000 * 60 * 60);
			store.set('test-session', { id: 'test-session', expiresAt: expires });

			const result = await getAdminSession('test-session');
			expect(result).toBe(true);
		});

		test('getAdminSession returns false for unknown session', async () => {
			const { getAdminSession } = await import('../../src/lib/server/auth.js');
			// Add a different session to ensure filtering works
			const expires = new Date(Date.now() + 1000 * 60 * 60);
			store.set('other-session', { id: 'other-session', expiresAt: expires });

			const result = await getAdminSession('nonexistent');
			expect(result).toBe(false);
		});

		test('getAdminSession returns false for expired session', async () => {
			const { getAdminSession } = await import('../../src/lib/server/auth.js');
			store.set('expired', { id: 'expired', expiresAt: new Date(Date.now() - 1000) });

			const result = await getAdminSession('expired');
			expect(result).toBe(false);
		});

		test('deleteAdminSession removes the session from the store', async () => {
			const { deleteAdminSession, getAdminSession } = await import(
				'../../src/lib/server/auth.js'
			);
			const expires = new Date(Date.now() + 1000 * 60 * 60);
			store.set('to-delete', { id: 'to-delete', expiresAt: expires });

			await deleteAdminSession('to-delete');
			expect(store.has('to-delete')).toBe(false);

			const result = await getAdminSession('to-delete');
			expect(result).toBe(false);
		});
	});
});
