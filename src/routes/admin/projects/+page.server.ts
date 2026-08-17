import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects, houseTypes } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [rows, houseTypeRows] = await Promise.all([
		db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id)),
		db.select().from(houseTypes).orderBy(asc(houseTypes.sortOrder))
	]);
	return { projects: rows, houseTypes: houseTypeRows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

function parse(form: FormData) {
	const name = str(form.get('name'), 160);
	const slug = str(form.get('slug'), 160)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	const location = str(form.get('location'), 160);
	const priceLabel = str(form.get('priceLabel'), 60);
	const badge = str(form.get('badge'), 40) || null;
	const badgeStyle: 'gold' | 'dark' = form.get('badgeStyle') === 'dark' ? 'dark' : 'gold';
	const imagePath = str(form.get('imagePath'), 255) || null;
	const description = str(form.get('description'), 2000) || null;
	const houseTypeIdRaw = String(form.get('houseTypeId') ?? '');
	const houseTypeId = houseTypeIdRaw ? intOf(form.get('houseTypeId')) : null;
	const sortOrder = intOf(form.get('sortOrder'), 0);
	const isActive = form.get('isActive') ? 1 : 0;
	return { name, slug, location, priceLabel, badge, badgeStyle, imagePath, description, houseTypeId, sortOrder, isActive };
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const data = parse(form);
		if (!data.name || !data.slug || !data.location || !data.priceLabel) {
			return fail(422, { error: 'Nama, slug, lokasi, dan harga wajib diisi.' });
		}
		const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, data.slug));
		if (existing.length > 0) return fail(422, { error: 'Slug sudah dipakai proyek lain.' });
		await db.insert(projects).values(data);
		return { ok: true };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		const data = parse(form);
		if (!data.name || !data.slug || !data.location || !data.priceLabel) {
			return fail(422, { error: 'Nama, slug, lokasi, dan harga wajib diisi.' });
		}
		const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, data.slug));
		if (existing.length > 0 && existing[0].id !== id) {
			return fail(422, { error: 'Slug sudah dipakai proyek lain.' });
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
