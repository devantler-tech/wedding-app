import { runMigrations } from './migrate.js';
import { runSeed } from './seed.js';

let ready = false;

/** True once migrations + seed have completed successfully at least once. */
export function isDatabaseReady(): boolean {
	return ready;
}

export interface BootstrapOptions {
	/** Stop after this many attempts. `Infinity` (the default) retries forever. */
	maxAttempts?: number;
	/** Base backoff in ms; doubles each attempt, capped at `maxDelayMs`. */
	baseDelayMs?: number;
	/** Maximum backoff in ms. */
	maxDelayMs?: number;
	/** Injectable sleep — overridable in tests. */
	sleep?: (ms: number) => Promise<void>;
	/** Injectable migrate step — overridable in tests. */
	migrate?: () => Promise<void>;
	/** Injectable seed step — overridable in tests. */
	seed?: () => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Apply migrations and seed data, retrying with exponential backoff until they
 * succeed.
 *
 * Invoked WITHOUT `await` at server start (see `hooks.server.ts`). A database
 * that is unreachable at boot must not crash the Node process or stall the
 * `/login` startup probe. Crashing at boot is especially harmful here: the pod
 * never becomes Ready, so a rollout started during a DB outage wedges (the new
 * ReplicaSet can never pass its probe) and the app cannot recover even once the
 * database returns. With background retry, the DB-free login page stays
 * available and the schema self-applies as soon as the database is reachable.
 *
 * Never rejects on a transient failure — failures are logged and retried.
 */
export async function bootstrapDatabase(options: BootstrapOptions = {}): Promise<void> {
	const {
		maxAttempts = Infinity,
		baseDelayMs = 2_000,
		maxDelayMs = 30_000,
		sleep = defaultSleep,
		migrate = runMigrations,
		seed = runSeed
	} = options;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			await migrate();
			await seed();
			ready = true;
			if (attempt > 1) {
				console.log(`✅ Database bootstrap succeeded on attempt ${attempt}.`);
			}
			return;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (attempt >= maxAttempts) {
				console.error(`❌ Database bootstrap gave up after ${attempt} attempt(s): ${message}`);
				return;
			}
			const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
			console.error(
				`⚠️  Database bootstrap attempt ${attempt} failed; retrying in ${delay}ms: ${message}`
			);
			await sleep(delay);
		}
	}
}
