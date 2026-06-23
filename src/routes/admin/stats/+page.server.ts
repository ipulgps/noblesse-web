import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stats } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(stats).orderBy(asc(stats.sortOrder), asc(stats.id));
	return { stats: rows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

const parse = (form: FormData) => ({
	value: intOf(form.get('value'), 0),
	suffix: str(form.get('suffix'), 8),
	label: str(form.get('label'), 120),
	sortOrder: intOf(form.get('sortOrder'), 0),
	isActive: form.get('isActive') ? 1 : 0
});

export const actions: Actions = {
	create: async ({ request }) => {
		const data = parse(await request.formData());
		if (!data.label) return fail(422, { error: 'Label wajib diisi.' });
		await db.insert(stats).values(data);
		return { ok: true };
	},
	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		const data = parse(form);
		if (!data.label) return fail(422, { error: 'Label wajib diisi.' });
		await db.update(stats).set(data).where(eq(stats.id, id));
		return { ok: true };
	},
	delete: async ({ request }) => {
		const id = intOf((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(stats).where(eq(stats.id, id));
		return { ok: true };
	},
	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const isActive = form.get('isActive') === '1' ? 0 : 1;
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(stats).set({ isActive }).where(eq(stats.id, id));
		return { ok: true };
	}
};
