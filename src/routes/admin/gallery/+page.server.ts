import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { galleryImages } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select()
		.from(galleryImages)
		.orderBy(asc(galleryImages.sortOrder), asc(galleryImages.id));
	return { gallery: rows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

const parse = (form: FormData) => ({
	imagePath: str(form.get('imagePath'), 255),
	caption: str(form.get('caption'), 160) || null,
	heightPx: Math.max(120, Math.min(800, intOf(form.get('heightPx'), 300))),
	sortOrder: intOf(form.get('sortOrder'), 0),
	isActive: form.get('isActive') ? 1 : 0
});

export const actions: Actions = {
	create: async ({ request }) => {
		const data = parse(await request.formData());
		await db.insert(galleryImages).values(data);
		return { ok: true };
	},
	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(galleryImages).set(parse(form)).where(eq(galleryImages.id, id));
		return { ok: true };
	},
	delete: async ({ request }) => {
		const id = intOf((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(galleryImages).where(eq(galleryImages.id, id));
		return { ok: true };
	},
	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const isActive = form.get('isActive') === '1' ? 0 : 1;
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(galleryImages).set({ isActive }).where(eq(galleryImages.id, id));
		return { ok: true };
	}
};
