import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const pool = new pg.Pool({
	connectionString:
		process.env.DATABASE_URL || 'postgresql://wedding:wedding@localhost:5432/wedding'
});

export const db = drizzle(pool, { schema });
