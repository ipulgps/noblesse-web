import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL belum diset di .env');
}

// Connection pool dipakai bersama untuk seluruh request server.
const pool = mysql.createPool(env.DATABASE_URL);

export const db = drizzle(pool, { schema, mode: 'default' });

export { schema };
