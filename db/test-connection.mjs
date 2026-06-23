// Smoke test koneksi DB di luar SvelteKit.
// Jalankan: node --env-file=.env db/test-connection.mjs
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL tidak ditemukan. Jalankan dengan: node --env-file=.env db/test-connection.mjs');
	process.exit(1);
}

const conn = await mysql.createConnection(url);
const [ver] = await conn.query('SELECT VERSION() AS v');
const [tables] = await conn.query('SHOW TABLES');
console.log('✓ Terhubung ke MySQL versi:', ver[0].v);
console.log('✓ Jumlah tabel di database:', tables.length);
console.log('  Tabel:', tables.map((t) => Object.values(t)[0]).join(', '));
await conn.end();
