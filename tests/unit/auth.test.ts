import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
	createAdminSession,
	deleteAdminSession,
	getAdminCode,
	getAdminSession,
	validateAdminCode
} from '../../src/lib/server/auth.js';

describe('admin auth', () => {
	const originalAdminCode = process.env.ADMIN_CODE;

	afterEach(() => {
		if (originalAdminCode === undefined) delete process.env.ADMIN_CODE;
		else process.env.ADMIN_CODE = originalAdminCode;
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
		let id: string;

		beforeEach(() => {
			id = createAdminSession();
		});

		afterEach(() => {
			deleteAdminSession(id);
		});

		test('createAdminSession returns a unique session that is recognised', () => {
			expect(id).toMatch(/^[0-9a-f]{64}$/);
			expect(getAdminSession(id)).toBe(true);

			const second = createAdminSession();
			expect(second).not.toBe(id);
			expect(getAdminSession(second)).toBe(true);
			deleteAdminSession(second);
		});

		test('deleteAdminSession invalidates the session', () => {
			deleteAdminSession(id);
			expect(getAdminSession(id)).toBe(false);
		});

		test('getAdminSession rejects unknown ids', () => {
			expect(getAdminSession('nope')).toBe(false);
		});
	});
});
