import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb } from './db.js';

export async function runMigrations(): Promise<void> {
	const db = getDb();
	await migrate(db, { migrationsFolder: './drizzle' });
}
