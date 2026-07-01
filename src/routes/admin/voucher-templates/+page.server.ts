import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { voucherTemplates } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(voucherTemplates).orderBy(asc(voucherTemplates.id));
	return { templates: rows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

const parse = (form: FormData) => ({
	name: str(form.get('name'), 120),
	imagePath: str(form.get('imagePath'), 255),
	qrX: intOf(form.get('qrX')),
	qrY: intOf(form.get('qrY')),
	qrSize: Math.max(40, intOf(form.get('qrSize'), 200)),
	codeX: intOf(form.get('codeX')),
	codeY: intOf(form.get('codeY')),
	fontSize: Math.max(8, intOf(form.get('fontSize'), 32)),
	textColor: str(form.get('textColor'), 20) || '#000000',
	isActive: form.get('isActive') ? 1 : 0
});

export const actions: Actions = {
	create: async ({ request }) => {
		const data = parse(await request.formData());
		if (!data.name) return fail(422, { error: 'Nama template wajib diisi.' });
		if (!data.imagePath) return fail(422, { error: 'Gambar template wajib diunggah.' });
		await db.insert(voucherTemplates).values(data);
		return { ok: true };
	},
	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		const data = parse(form);
		if (!data.name) return fail(422, { error: 'Nama template wajib diisi.' });
		if (!data.imagePath) return fail(422, { error: 'Gambar template wajib diunggah.' });
		await db.update(voucherTemplates).set(data).where(eq(voucherTemplates.id, id));
		return { ok: true };
	},
	delete: async ({ request }) => {
		const id = intOf((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(voucherTemplates).where(eq(voucherTemplates.id, id));
		return { ok: true };
	},
	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const isActive = form.get('isActive') === '1' ? 0 : 1;
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(voucherTemplates).set({ isActive }).where(eq(voucherTemplates.id, id));
		return { ok: true };
	}
};
