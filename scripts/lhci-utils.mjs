// Retry helpers for the non-required Lighthouse CI lane (issue #100).
// Kept in its own module so it is unit-testable: scripts/lighthouse.mjs boots a
// server and a proxy at import time, so importing *it* from a test would run the
// whole lane.
import { setTimeout as sleepMs } from 'node:timers/promises';

/**
 * Run `lhci collect`, retrying when an attempt fails.
 *
 * `lhci collect` drives a real headless Chrome over CDP, and on GitHub runners
 * that session can die mid-collection: the browser launches fine, then every
 * gatherer times out (PROTOCOL_TIMEOUT), the page never paints (NO_FCP), and
 * Chrome is torn down with `Target closed`. Nothing about the app changed — the
 * runner simply starved the browser. Measured over the lane's own history for
 * issue #100: 1 such failure in 39 runs.
 *
 * The lane already retried the *server* launch (launchServerWithRetries), but a
 * failed `collect` was terminal, so a single hung Chrome reddened the lane. The
 * `--numberOfRuns=3` flag does not cover this: LHCI aborts the whole collect on
 * its first failed run rather than treating the remaining runs as retries.
 *
 * Retries only ever hide *flakes*: a deterministic failure (dead server, bad
 * config) fails every attempt and still fails the lane, exactly as before. Budget
 * misses cannot reach here at all — they surface in `lhci assert`, which is
 * warn-level and separate.
 *
 * @param {() => Promise<number> | number} collect runs one `lhci collect`, resolving to its exit code
 * @param {{attempts?: number, backoffMs?: number, sleep?: (ms: number) => Promise<void>}} [opts]
 * @returns {Promise<{code: number, attempts: number}>} the final exit code and how many attempts ran
 */
export async function collectWithRetries(collect, opts = {}) {
	const attempts = opts.attempts ?? 3;
	const backoffMs = opts.backoffMs ?? 2000;
	const sleep = opts.sleep ?? sleepMs;

	let code = 1;
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		code = await collect();
		if (code === 0) return { code: 0, attempts: attempt };

		// Back off strictly *between* attempts — sleeping after the final failure
		// would add dead wall-clock to a lane that is already going red.
		if (attempt < attempts) {
			console.error(
				`lhci collect attempt ${attempt}/${attempts} failed (exit ${code}); retrying in ${backoffMs}ms`
			);
			await sleep(backoffMs);
		}
	}
	return { code, attempts };
}
