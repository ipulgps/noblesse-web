import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/schema';
import { rateLimit } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

// Batas panjang agar aman dari payload berlebihan.
const MAX = { name: 160, whatsapp: 40, interestedType: 120, message: 2000 };

// Maks 5 kiriman per IP tiap 10 menit.
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

const clean = (v: unknown, max: number) =>
	typeof v === 'string' ? v.trim().slice(0, max) : '';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = getClientAddress();
	const limited = rateLimit(`leads:${ip}`, LIMIT, WINDOW_MS);
	if (!limited.ok) {
		throw error(429, `Terlalu banyak kiriman. Coba lagi dalam ${limited.retryAfter} detik.`);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Format permintaan tidak valid.');
	}

	// Honeypot: bot biasanya mengisi semua field. Jika field jebakan terisi,
	// pura-pura sukses tanpa menyimpan.
	if (clean(body.website, 100)) return json({ ok: true });

	const name = clean(body.name, MAX.name);
	const whatsapp = clean(body.whatsapp, MAX.whatsapp);
	const interestedType = clean(body.interestedType, MAX.interestedType) || null;
	const message = clean(body.message, MAX.message) || null;

	// Validasi minimal: nama & whatsapp wajib.
	if (!name) throw error(422, 'Nama wajib diisi.');
	if (!whatsapp || !/[0-9]{6,}/.test(whatsapp.replace(/\D/g, ''))) {
		throw error(422, 'Nomor WhatsApp tidak valid.');
	}

	await db.insert(leads).values({
		name,
		whatsapp,
		interestedType,
		message,
		source: 'website_form',
		status: 'baru'
	});

	return json({ ok: true });
};
