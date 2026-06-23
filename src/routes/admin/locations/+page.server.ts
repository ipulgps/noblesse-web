import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { locationPoints } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select()
		.from(locationPoints)
		.orderBy(asc(locationPoints.sortOrder), asc(locationPoints.id));
	return { locations: rows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

const parse = (form: FormData) => ({
	label: str(form.get('label'), 120),
	travelTime: str(form.get('travelTime'), 40),
	iconSvg: str(form.get('iconSvg'), 4000) || null,
	sortOrder: intOf(form.get('sortOrder'), 0),
	isActive: form.get('isActive') ? 1 : 0
});

export const actions: Actions = {
	create: async ({ request }) => {
		const data = parse(await request.formData());
		if (!data.label || !data.travelTime) return fail(422, { error: 'Label dan waktu tempuh wajib diisi.' });
		await db.insert(locationPoints).values(data);
		return { ok: true };
	},
	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		const data = parse(form);
		if (!data.label || !data.travelTime) return fail(422, { error: 'Label dan waktu tempuh wajib diisi.' });
		await db.update(locationPoints).set(data).where(eq(locationPoints.id, id));
		return { ok: true };
	},
	delete: async ({ request }) => {
		const id = intOf((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(locationPoints).where(eq(locationPoints.id, id));
		return { ok: true };
	},
	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const isActive = form.get('isActive') === '1' ? 0 : 1;
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(locationPoints).set({ isActive }).where(eq(locationPoints.id, id));
		return { ok: true };
	}
};
