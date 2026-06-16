import { beforeEach, describe, expect, test, vi } from 'vitest';

// Fresh module per test so the module-level `ready` flag never leaks between
// cases. The migrate/seed/sleep steps are injected, so these tests touch no
// real database and no real timers.
async function loadModule() {
	vi.resetModules();
	return import('../../src/lib/server/db-bootstrap.js');
}

const noSleep = () => Promise.resolve();

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('bootstrapDatabase', () => {
	test('runs migrate then seed once on success and marks the DB ready', async () => {
		const { bootstrapDatabase, isDatabaseReady } = await loadModule();
		const calls: string[] = [];
		const migrate = vi.fn(async () => {
			calls.push('migrate');
		});
		const seed = vi.fn(async () => {
			calls.push('seed');
		});

		await bootstrapDatabase({ migrate, seed, sleep: noSleep });

		expect(migrate).toHaveBeenCalledTimes(1);
		expect(seed).toHaveBeenCalledTimes(1);
		expect(calls).toEqual(['migrate', 'seed']); // seed only after migrate
		expect(isDatabaseReady()).toBe(true);
	});

	test('does not seed when migrations fail on that attempt', async () => {
		const { bootstrapDatabase } = await loadModule();
		let attempts = 0;
		const migrate = vi.fn(async () => {
			attempts++;
			if (attempts === 1) throw new Error('EHOSTUNREACH');
		});
		const seed = vi.fn(async () => {});

		await bootstrapDatabase({ migrate, seed, sleep: noSleep });

		expect(migrate).toHaveBeenCalledTimes(2); // failed once, then succeeded
		expect(seed).toHaveBeenCalledTimes(1); // seeded only after the successful migrate
	});

	test('retries with backoff until the database becomes reachable', async () => {
		const { bootstrapDatabase, isDatabaseReady } = await loadModule();
		let attempts = 0;
		const migrate = vi.fn(async () => {
			attempts++;
			if (attempts < 3) throw new Error('connect EHOSTUNREACH');
		});
		const seed = vi.fn(async () => {});
		const sleep = vi.fn(noSleep);

		await bootstrapDatabase({ migrate, seed, sleep, baseDelayMs: 10, maxDelayMs: 40 });

		expect(migrate).toHaveBeenCalledTimes(3);
		expect(seed).toHaveBeenCalledTimes(1);
		expect(isDatabaseReady()).toBe(true);
		// Backoff doubles: attempt 1 -> 10ms, attempt 2 -> 20ms.
		expect(sleep).toHaveBeenNthCalledWith(1, 10);
		expect(sleep).toHaveBeenNthCalledWith(2, 20);
	});

	test('caps the backoff delay at maxDelayMs', async () => {
		const { bootstrapDatabase } = await loadModule();
		let attempts = 0;
		const migrate = vi.fn(async () => {
			attempts++;
			if (attempts < 4) throw new Error('down');
		});
		const delays: number[] = [];
		const sleep = (ms: number) => {
			delays.push(ms);
			return Promise.resolve();
		};

		await bootstrapDatabase({
			migrate,
			seed: async () => {},
			sleep,
			baseDelayMs: 100,
			maxDelayMs: 150
		});

		// 100, 200->capped 150, 400->capped 150
		expect(delays).toEqual([100, 150, 150]);
	});

	test('gives up after maxAttempts without throwing (never crashes the server)', async () => {
		const { bootstrapDatabase, isDatabaseReady } = await loadModule();
		const migrate = vi.fn(async () => {
			throw new Error('permanently down');
		});
		const seed = vi.fn(async () => {});

		// Must resolve, not reject — a rejection here would crash the Node process.
		await expect(
			bootstrapDatabase({ migrate, seed, sleep: noSleep, maxAttempts: 3 })
		).resolves.toBeUndefined();

		expect(migrate).toHaveBeenCalledTimes(3);
		expect(seed).not.toHaveBeenCalled();
		expect(isDatabaseReady()).toBe(false);
	});
});
