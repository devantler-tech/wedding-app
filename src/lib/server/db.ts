import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.DEV_SKIP_AUTH !== 'true') {
	throw new Error('DATABASE_URL environment variable is required');
}

const pool = new pg.Pool({
	...(connectionString ? { connectionString } : {})
});

export const db = drizzle(pool, { schema });
