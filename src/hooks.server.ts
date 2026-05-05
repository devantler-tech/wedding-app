import { runMigrations } from '$lib/server/migrate.js';

if (process.env.DATABASE_URL) {
	await runMigrations();
}
