import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

let _db: NodePgDatabase<typeof schema> | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
	if (!_db) {
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString && process.env.DEV_SKIP_AUTH !== 'true') {
			throw new Error('DATABASE_URL environment variable is required');
		}
		const pool = new pg.Pool({
			...(connectionString ? { connectionString } : {})
		});
		_db = drizzle(pool, { schema });
	}
	return _db;
}

// Re-export for backward compat — lazy initialized on first access
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
	get(_target, prop) {
		return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
	}
});
