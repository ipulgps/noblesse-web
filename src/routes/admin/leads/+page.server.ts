import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/schema';
import { desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

const STATUSES = ['baru', 'dihubungi', 'closing', 'batal'] as const;
type Status = (typeof STATUSES)[number];

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(leads).orderBy(desc(leads.createdAt), desc(leads.id));
	return { leads: rows };
};

const intOf = (v: FormDataEntryValue | null) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : 0;
};

export const actions: Actions = {
	setStatus: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const status = String(form.get('status') ?? '') as Status;
		if (!id || !STATUSES.includes(status)) return fail(400, { error: 'Data tidak valid.' });
		await db.update(leads).set({ status }).where(eq(leads.id, id));
		return { ok: true };
	},
	delete: async ({ request }) => {
		const id = intOf((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(leads).where(eq(leads.id, id));
		return { ok: true };
	}
};
