// Membuat / memperbarui user admin.
// Pakai:
//   node --env-file=.env db/create-admin.mjs <email> <password> [nama] [role]
//   (default: admin@noblesse.id / admin123 / "Administrator" / superadmin)
//
// Jika email sudah ada → password & data diperbarui (berguna untuk reset password).
import mysql from 'mysql2/promise';
import { hash } from '@node-rs/argon2';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL tidak ditemukan.');
	process.exit(1);
}

const [, , emailArg, passArg, nameArg, roleArg] = process.argv;
const email = (emailArg || 'admin@noblesse.id').toLowerCase().trim();
const password = passArg || 'admin123';
const name = nameArg || 'Administrator';
const role = roleArg === 'editor' ? 'editor' : 'superadmin';

const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

const db = await mysql.createConnection(url);
await db.query(
	`INSERT INTO admin_users (name, email, password_hash, role)
	 VALUES (?,?,?,?)
	 ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=VALUES(role)`,
	[name, email, passwordHash, role]
);
await db.end();

console.log('✓ Admin siap.');
console.log('  email   :', email);
console.log('  password:', password);
console.log('  role    :', role);
console.log('  (ganti password ini setelah login pertama di produksi)');
