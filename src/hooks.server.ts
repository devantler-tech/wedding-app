import { runMigrations } from '$lib/server/migrate.js';
import { runSeed } from '$lib/server/seed.js';

if (process.env.DATABASE_URL) {
	await runMigrations();
	await runSeed();
}
