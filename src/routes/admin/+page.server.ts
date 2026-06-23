import { db } from '$lib/server/db';
import { leads, projects, testimonials, houseTypes } from '$lib/server/schema';
import { count, eq, desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const load: PageServerLoad = async () => {
	const [newLeads] = await db.select({ n: count() }).from(leads).where(eq(leads.status, 'baru'));
	const [closingLeads] = await db
		.select({ n: count() })
		.from(leads)
		.where(eq(leads.status, 'closing'));
	const [totalLeads] = await db.select({ n: count() }).from(leads);
	const [totalProjects] = await db.select({ n: count() }).from(projects);
	const [totalTestimonials] = await db.select({ n: count() }).from(testimonials);
	const [totalHouseTypes] = await db.select({ n: count() }).from(houseTypes);

	// Prospek 12 bulan terakhir (per bulan) untuk grafik.
	const monthlyRows = await db
		.select({
			ym: sql<string>`DATE_FORMAT(${leads.createdAt}, '%Y-%m')`,
			n: count()
		})
		.from(leads)
		.where(sql`${leads.createdAt} >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)`)
		.groupBy(sql`DATE_FORMAT(${leads.createdAt}, '%Y-%m')`);

	const monthMap = new Map(monthlyRows.map((r) => [r.ym, Number(r.n)]));
	const now = new Date();
	const series: { label: string; value: number }[] = [];
	for (let i = 11; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		series.push({ label: MONTHS[d.getMonth()], value: monthMap.get(key) ?? 0 });
	}

	// Distribusi prospek per status (untuk donut).
	const statusRows = await db
		.select({ status: leads.status, n: count() })
		.from(leads)
		.groupBy(leads.status);
	const statusMap = new Map(statusRows.map((r) => [r.status, Number(r.n)]));

	// Prospek terbaru untuk tabel.
	const recentLeads = await db
		.select()
		.from(leads)
		.orderBy(desc(leads.createdAt), desc(leads.id))
		.limit(6);

	return {
		stats: {
			newLeads: newLeads.n,
			closingLeads: closingLeads.n,
			totalLeads: totalLeads.n,
			totalProjects: totalProjects.n,
			totalTestimonials: totalTestimonials.n,
			totalHouseTypes: totalHouseTypes.n
		},
		series,
		statusDist: {
			baru: statusMap.get('baru') ?? 0,
			dihubungi: statusMap.get('dihubungi') ?? 0,
			closing: statusMap.get('closing') ?? 0,
			batal: statusMap.get('batal') ?? 0
		},
		recentLeads
	};
};
