import { db } from '$lib/server/db';
import { projects, virtualTourNodes } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Halaman pilih-proyek dihapus dari alur — langsung redirect ke tur proyek PERTAMA
// (urutan sama dengan yang dulu dipakai daftar ini). Kalau nanti ada 2+ proyek tur
// aktif, tetap otomatis ke yang pertama tanpa perlu ubah kode.
export const load: PageServerLoad = async () => {
	const nodeProjectIds = await db
		.selectDistinct({ projectId: virtualTourNodes.projectId })
		.from(virtualTourNodes)
		.where(eq(virtualTourNodes.isActive, 1));

	const ids = nodeProjectIds.map((r) => r.projectId);
	if (ids.length === 0) throw error(404, 'Belum ada tur virtual yang tersedia.');

	const rows = await db
		.select()
		.from(projects)
		.where(eq(projects.isActive, 1))
		.orderBy(asc(projects.sortOrder), asc(projects.id));

	const first = rows.find((p) => ids.includes(p.id));
	if (!first) throw error(404, 'Belum ada tur virtual yang tersedia.');

	throw redirect(307, `/tur-virtual/${first.slug}`);
};
