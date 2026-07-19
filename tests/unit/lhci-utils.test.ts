import { describe, expect, it, vi } from 'vitest';

import { collectWithRetries } from '../../scripts/lhci-utils.mjs';

/**
 * `lhci collect` drives a real headless Chrome over CDP. On GitHub runners that
 * session can go dead mid-collection — the browser launches, then every gatherer
 * times out (PROTOCOL_TIMEOUT), the page never paints (NO_FCP) and Chrome is
 * killed with `Target closed`. Measured on the Lighthouse lane's own history
 * (issue #100): 1 such failure in 39 runs, with no code change behind it.
 *
 * The lane already retries the *server* launch (launchServerWithRetries), but a
 * failed `collect` was terminal, so one hung Chrome reddened the whole lane.
 * These tests pin the retry behaviour that closes that gap.
 */
describe('collectWithRetries', () => {
	const noSleep = () => Promise.resolve();

	it('runs collect once when the first attempt succeeds', async () => {
		const collect = vi.fn().mockResolvedValue(0);

		const result = await collectWithRetries(collect, { attempts: 3, sleep: noSleep });

		expect(result).toEqual({ code: 0, attempts: 1 });
		expect(collect).toHaveBeenCalledTimes(1);
	});

	// The regression this change exists for: a transient Chrome/CDP failure
	// must not fail the lane when a retry would have collected cleanly.
	it('retries a failed collect and succeeds on a later attempt', async () => {
		const collect = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);

		const result = await collectWithRetries(collect, { attempts: 3, sleep: noSleep });

		expect(result).toEqual({ code: 0, attempts: 2 });
		expect(collect).toHaveBeenCalledTimes(2);
	});

	// A deterministic failure (server genuinely dead, config wrong) must still
	// fail the lane — retries hide flakes, never real breakage.
	it('gives up and reports the failure after exhausting attempts', async () => {
		const collect = vi.fn().mockResolvedValue(1);

		const result = await collectWithRetries(collect, { attempts: 3, sleep: noSleep });

		expect(result).toEqual({ code: 1, attempts: 3 });
		expect(collect).toHaveBeenCalledTimes(3);
	});

	it('preserves a non-1 exit code from the last attempt', async () => {
		const collect = vi.fn().mockResolvedValue(7);

		const result = await collectWithRetries(collect, { attempts: 2, sleep: noSleep });

		expect(result).toEqual({ code: 7, attempts: 2 });
	});

	// Backoff belongs strictly *between* attempts: sleeping after the final
	// failure would add dead wall-clock to an already-failing lane.
	it('backs off between attempts but never after the last one', async () => {
		const collect = vi.fn().mockResolvedValue(1);
		const sleep = vi.fn().mockResolvedValue(undefined);

		await collectWithRetries(collect, { attempts: 3, backoffMs: 2000, sleep });

		expect(sleep).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledWith(2000);
	});

	it('does not back off at all when the first attempt succeeds', async () => {
		const collect = vi.fn().mockResolvedValue(0);
		const sleep = vi.fn().mockResolvedValue(undefined);

		await collectWithRetries(collect, { attempts: 3, sleep });

		expect(sleep).not.toHaveBeenCalled();
	});

	// A single attempt must behave like the old terminal-failure semantics.
	it('runs exactly once and never sleeps when attempts is 1', async () => {
		const collect = vi.fn().mockResolvedValue(1);
		const sleep = vi.fn().mockResolvedValue(undefined);

		const result = await collectWithRetries(collect, { attempts: 1, sleep });

		expect(result).toEqual({ code: 1, attempts: 1 });
		expect(collect).toHaveBeenCalledTimes(1);
		expect(sleep).not.toHaveBeenCalled();
	});
});
