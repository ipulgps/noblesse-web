import { db } from '$lib/server/db';
import {
	stats,
	aboutTimeline,
	projects,
	galleryImages,
	facilities,
	locationPoints,
	houseTypes,
	testimonials,
	partnerBanks,
	siteSettings
} from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [
		statsRows,
		timelineRows,
		projectRows,
		galleryRows,
		facilityRows,
		locationRows,
		houseTypeRows,
		testimonialRows,
		bankRows,
		settingRows
	] = await Promise.all([
		db.select().from(stats).where(eq(stats.isActive, 1)).orderBy(asc(stats.sortOrder)),
		db
			.select()
			.from(aboutTimeline)
			.where(eq(aboutTimeline.isActive, 1))
			.orderBy(asc(aboutTimeline.sortOrder)),
		db.select().from(projects).where(eq(projects.isActive, 1)).orderBy(asc(projects.sortOrder)),
		db
			.select()
			.from(galleryImages)
			.where(eq(galleryImages.isActive, 1))
			.orderBy(asc(galleryImages.sortOrder)),
		db
			.select()
			.from(facilities)
			.where(eq(facilities.isActive, 1))
			.orderBy(asc(facilities.sortOrder)),
		db
			.select()
			.from(locationPoints)
			.where(eq(locationPoints.isActive, 1))
			.orderBy(asc(locationPoints.sortOrder)),
		db
			.select()
			.from(houseTypes)
			.where(eq(houseTypes.isActive, 1))
			.orderBy(asc(houseTypes.sortOrder)),
		db
			.select()
			.from(testimonials)
			.where(eq(testimonials.isActive, 1))
			.orderBy(asc(testimonials.sortOrder)),
		db
			.select()
			.from(partnerBanks)
			.where(eq(partnerBanks.isActive, 1))
			.orderBy(asc(partnerBanks.sortOrder)),
		db.select().from(siteSettings)
	]);

	// site_settings (key-value) → objek biasa agar mudah dipakai di template.
	const settings: Record<string, string> = {};
	for (const row of settingRows) settings[row.key] = row.value ?? '';

	return {
		stats: statsRows,
		timeline: timelineRows,
		projects: projectRows,
		gallery: galleryRows,
		facilities: facilityRows,
		locations: locationRows,
		houseTypes: houseTypeRows,
		testimonials: testimonialRows,
		banks: bankRows,
		settings
	};
};
