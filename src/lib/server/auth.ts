import { hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { db } from './db';
import { adminUsers, adminSessions } from './schema';

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE = 'nb_session';
const SESSION_DAYS = 7;

// Apakah cookie sesi memakai flag Secure (hanya terkirim via HTTPS).
// Default mengikuti produksi (true). Saat masih akses lewat http (mis. via IP
// sebelum pasang HTTPS), set COOKIE_SECURE=false di .env agar cookie tersimpan.
// WAJIB kembalikan ke true (hapus override) setelah HTTPS aktif.
export const cookieSecure = env.COOKIE_SECURE === 'false' ? false : !dev;

// Parameter argon2 yang aman & masuk akal untuk server biasa.
const argonOpts = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string) {
	return hash(password, argonOpts);
}

export function verifyPassword(hashStr: string, password: string) {
	return verify(hashStr, password, argonOpts);
}

export type SessionUser = {
	id: number;
	name: string;
	email: string;
	role: 'superadmin' | 'editor';
};

// Buat sesi baru → kembalikan token + tanggal kedaluwarsa (untuk set cookie).
export async function createSession(userId: number) {
	const token = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
	await db.insert(adminSessions).values({ id: token, userId, expiresAt });
	return { token, expiresAt };
}

// Validasi token sesi → kembalikan user atau null. Sesi kedaluwarsa dihapus.
export async function validateSession(token: string | undefined): Promise<SessionUser | null> {
	if (!token) return null;
	const rows = await db
		.select({
			sessionId: adminSessions.id,
			expiresAt: adminSessions.expiresAt,
			id: adminUsers.id,
			name: adminUsers.name,
			email: adminUsers.email,
			role: adminUsers.role
		})
		.from(adminSessions)
		.innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
		.where(eq(adminSessions.id, token))
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	if (new Date(row.expiresAt).getTime() < Date.now()) {
		await db.delete(adminSessions).where(eq(adminSessions.id, token));
		return null;
	}

	return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function deleteSession(token: string | undefined) {
	if (!token) return;
	await db.delete(adminSessions).where(eq(adminSessions.id, token));
}

// Bersihkan sesi kedaluwarsa (bisa dipanggil sesekali).
export async function purgeExpiredSessions() {
	await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
}

// Verifikasi kredensial login → user atau null.
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
	const rows = await db
		.select()
		.from(adminUsers)
		.where(eq(adminUsers.email, email.toLowerCase().trim()))
		.limit(1);
	const user = rows[0];
	if (!user) return null;
	const ok = await verifyPassword(user.passwordHash, password);
	if (!ok) return null;
	await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
	return { id: user.id, name: user.name, email: user.email, role: user.role };
}
