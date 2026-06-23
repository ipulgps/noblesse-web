import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { houseTypes } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select()
		.from(houseTypes)
		.orderBy(asc(houseTypes.sortOrder), asc(houseTypes.id));
	return { houseTypes: rows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

const parse = (form: FormData) => ({
	name: str(form.get('name'), 80),
	typeCode: str(form.get('typeCode'), 20),
	buildingArea: intOf(form.get('buildingArea'), 0),
	landArea: intOf(form.get('landArea'), 0),
	bedrooms: str(form.get('bedrooms'), 10),
	bathrooms: str(form.get('bathrooms'), 10),
	carport: str(form.get('carport'), 10),
	floors: str(form.get('floors'), 40),
	floorplanImg: str(form.get('floorplanImg'), 255) || null,
	sortOrder: intOf(form.get('sortOrder'), 0),
	isActive: form.get('isActive') ? 1 : 0
});

const required = (d: ReturnType<typeof parse>) =>
	d.name && d.typeCode && d.buildingArea && d.landArea;

export const actions: Actions = {
	create: async ({ request }) => {
		const data = parse(await request.formData());
		if (!required(data)) return fail(422, { error: 'Nama, kode tipe, luas bangunan & tanah wajib diisi.' });
		await db.insert(houseTypes).values(data);
		return { ok: true };
	},
	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		const data = parse(form);
		if (!required(data)) return fail(422, { error: 'Nama, kode tipe, luas bangunan & tanah wajib diisi.' });
		await db.update(houseTypes).set(data).where(eq(houseTypes.id, id));
		return { ok: true };
	},
	delete: async ({ request }) => {
		const id = intOf((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(houseTypes).where(eq(houseTypes.id, id));
		return { ok: true };
	},
	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const isActive = form.get('isActive') === '1' ? 0 : 1;
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(houseTypes).set({ isActive }).where(eq(houseTypes.id, id));
		return { ok: true };
	}
};
