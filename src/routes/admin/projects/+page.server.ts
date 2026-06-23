import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id));
	return { projects: rows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

function parse(form: FormData) {
	const name = str(form.get('name'), 160);
	const location = str(form.get('location'), 160);
	const priceLabel = str(form.get('priceLabel'), 60);
	const badge = str(form.get('badge'), 40) || null;
	const badgeStyle: 'gold' | 'dark' = form.get('badgeStyle') === 'dark' ? 'dark' : 'gold';
	const imagePath = str(form.get('imagePath'), 255) || null;
	const description = str(form.get('description'), 2000) || null;
	const sortOrder = intOf(form.get('sortOrder'), 0);
	const isActive = form.get('isActive') ? 1 : 0;
	return { name, location, priceLabel, badge, badgeStyle, imagePath, description, sortOrder, isActive };
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const data = parse(form);
		if (!data.name || !data.location || !data.priceLabel) {
			return fail(422, { error: 'Nama, lokasi, dan harga wajib diisi.' });
		}
		await db.insert(projects).values(data);
		return { ok: true };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		const data = parse(form);
		if (!data.name || !data.location || !data.priceLabel) {
			return fail(422, { error: 'Nama, lokasi, dan harga wajib diisi.' });
		}
		await db.update(projects).set(data).where(eq(projects.id, id));
		return { ok: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(projects).where(eq(projects.id, id));
		return { ok: true };
	},

	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const isActive = form.get('isActive') === '1' ? 0 : 1;
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(projects).set({ isActive }).where(eq(projects.id, id));
		return { ok: true };
	}
};
