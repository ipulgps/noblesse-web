import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { vouchers, voucherTemplates } from '$lib/server/schema';
import { rateLimit } from '$lib/server/rate-limit';
import { renderVoucherImage } from '$lib/server/voucher-image';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// Maks 10 percobaan per IP tiap 5 menit — kode 12 digit rentan brute-force
// tanpa pembatasan ini.
const LIMIT = 10;
const WINDOW_MS = 5 * 60 * 1000;

const GENERIC_INVALID = 'Kode voucher tidak valid.';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = getClientAddress();
	const limited = rateLimit(`voucher-claim:${ip}`, LIMIT, WINDOW_MS);
	if (!limited.ok) {
		throw error(429, `Terlalu banyak percobaan. Coba lagi dalam ${limited.retryAfter} detik.`);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Format permintaan tidak valid.');
	}

	const code = typeof body.code === 'string' ? body.code.trim() : '';
	if (!/^[0-9]{12}$/.test(code)) throw error(422, GENERIC_INVALID);

	const [voucher] = await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);

	// Tidak ditemukan ATAU status selain 'aktif' → pesan generik yang sama,
	// supaya tidak membocorkan status/keberadaan kode ke publik.
	if (!voucher || voucher.status !== 'aktif') {
		throw error(422, GENERIC_INVALID);
	}

	if (voucher.generatedImagePath) {
		return json({ ok: true, imagePath: voucher.generatedImagePath });
	}

	const [template] = await db
		.select()
		.from(voucherTemplates)
		.where(eq(voucherTemplates.id, voucher.templateId))
		.limit(1);
	if (!template) throw error(500, 'Template voucher tidak ditemukan.');

	const imagePath = await renderVoucherImage(template, voucher.code);

	await db
		.update(vouchers)
		.set({ generatedImagePath: imagePath, claimedAt: new Date() })
		.where(eq(vouchers.id, voucher.id));

	return json({ ok: true, imagePath });
};
