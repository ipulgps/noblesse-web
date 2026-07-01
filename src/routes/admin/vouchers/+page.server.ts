import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { vouchers, voucherTemplates } from '$lib/server/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [rows, templates] = await Promise.all([
		db
			.select({
				id: vouchers.id,
				code: vouchers.code,
				status: vouchers.status,
				claimedAt: vouchers.claimedAt,
				createdAt: vouchers.createdAt,
				templateId: vouchers.templateId,
				templateName: voucherTemplates.name
			})
			.from(vouchers)
			.innerJoin(voucherTemplates, eq(vouchers.templateId, voucherTemplates.id))
			.orderBy(desc(vouchers.id)),
		db
			.select({ id: voucherTemplates.id, name: voucherTemplates.name })
			.from(voucherTemplates)
			.where(eq(voucherTemplates.isActive, 1))
			.orderBy(asc(voucherTemplates.name))
	]);
	return { vouchers: rows, templates };
};

const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

const STATUSES = ['belum_aktivasi', 'aktif', 'tidak_aktif', 'sudah_digunakan'] as const;

function generateCode() {
	// 12 digit angka acak (kriptografis), boleh berawalan 0 — disimpan sebagai string.
	return String(randomInt(0, 1_000_000_000_000)).padStart(12, '0');
}

async function uniqueCode() {
	for (let i = 0; i < 10; i++) {
		const code = generateCode();
		const existing = await db
			.select({ id: vouchers.id })
			.from(vouchers)
			.where(eq(vouchers.code, code))
			.limit(1);
		if (existing.length === 0) return code;
	}
	throw new Error('Gagal membuat kode unik, coba lagi.');
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const templateId = intOf(form.get('templateId'));
		const count = Math.max(1, Math.min(100, intOf(form.get('count'), 1)));
		if (!templateId) return fail(422, { error: 'Pilih template terlebih dahulu.' });

		const [template] = await db
			.select({ id: voucherTemplates.id })
			.from(voucherTemplates)
			.where(eq(voucherTemplates.id, templateId))
			.limit(1);
		if (!template) return fail(422, { error: 'Template tidak ditemukan.' });

		for (let i = 0; i < count; i++) {
			const code = await uniqueCode();
			await db.insert(vouchers).values({ code, templateId, status: 'belum_aktivasi' });
		}
		return { ok: true };
	},

	setStatus: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const status = String(form.get('status') ?? '');
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
			return fail(400, { error: 'Status tidak valid.' });
		}
		await db
			.update(vouchers)
			.set({ status: status as (typeof STATUSES)[number] })
			.where(eq(vouchers.id, id));
		return { ok: true };
	},

	delete: async ({ request }) => {
		const id = intOf((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(vouchers).where(eq(vouchers.id, id));
		return { ok: true };
	}
};
