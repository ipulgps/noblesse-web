import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { testimonials } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select()
		.from(testimonials)
		.orderBy(asc(testimonials.sortOrder), asc(testimonials.id));
	return { testimonials: rows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

function parse(form: FormData) {
	const rating = Math.max(1, Math.min(5, intOf(form.get('rating'), 5)));
	return {
		quote: str(form.get('quote'), 2000),
		authorName: str(form.get('authorName'), 120),
		authorRole: str(form.get('authorRole'), 160) || null,
		rating,
		photoPath: str(form.get('photoPath'), 255) || null,
		sortOrder: intOf(form.get('sortOrder'), 0),
		isActive: form.get('isActive') ? 1 : 0
	};
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const data = parse(form);
		if (!data.quote || !data.authorName) return fail(422, { error: 'Kutipan dan nama wajib diisi.' });
		await db.insert(testimonials).values(data);
		return { ok: true };
	},
	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		const data = parse(form);
		if (!data.quote || !data.authorName) return fail(422, { error: 'Kutipan dan nama wajib diisi.' });
		await db.update(testimonials).set(data).where(eq(testimonials.id, id));
		return { ok: true };
	},
	delete: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(testimonials).where(eq(testimonials.id, id));
		return { ok: true };
	},
	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const isActive = form.get('isActive') === '1' ? 0 : 1;
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(testimonials).set({ isActive }).where(eq(testimonials.id, id));
		return { ok: true };
	}
};
