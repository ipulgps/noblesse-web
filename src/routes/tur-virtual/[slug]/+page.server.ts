import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects, virtualTourNodes } from '$lib/server/schema';
import { asc, and, eq, inArray } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PageServerLoad } from './$types';

// process.cwd() tidak selalu bisa diandalkan di dalam Vite dev/SSR module
// graph — turunkan root project dari lokasi file ini (src/routes/.../+page.server.ts
// -> naik 4 folder ke root), supaya path ke static/ selalu benar di dev maupun build.
const projectRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../');

type Link = { to: string; yaw: number };

export const load: PageServerLoad = async ({ params }) => {
	const [project] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.slug, params.slug), eq(projects.isActive, 1)));

	if (!project) throw error(404, 'Proyek tidak ditemukan.');

	const rows = await db
		.select()
		.from(virtualTourNodes)
		.where(and(eq(virtualTourNodes.projectId, project.id), eq(virtualTourNodes.isActive, 1)))
		.orderBy(asc(virtualTourNodes.sortOrder), asc(virtualTourNodes.id));

	const toNode = (row: (typeof rows)[number]) => ({
		id: row.nodeKey,
		name: row.name,
		img: row.imagePath,
		mapX: row.mapX,
		mapY: row.mapY,
		// Arah pandang awal kamera 360° (yaw derajat) — null bila belum diatur admin.
		initialYaw: row.initialYaw,
		links: row.linksJson ? (JSON.parse(row.linksJson) as Link[]) : [],
		marker: row.markerTitle
			? {
					yaw: row.markerYaw ?? '0deg',
					pitch: row.markerPitch ?? '0deg',
					title: row.markerTitle,
					desc: row.markerDesc ?? ''
				}
			: undefined
	});

	const vrNodes = rows.filter((r) => r.tourType === 'interior').map(toNode);
	const streetNodes = rows.filter((r) => r.tourType === 'streetview').map(toNode);

	// Denah skematik interior pakai foto floor plan asli kalau tersedia di
	// static/images/tours/<slug>/floor-plan.jpg, jatuh ke SVG garis putus-putus
	// (lihat VirtualTour.svelte) untuk proyek yang belum punya file ini.
	const floorPlanRelPath = `/images/tours/${project.slug}/floor-plan.jpg`;
	const floorPlanFsPath = path.join(projectRoot, 'static', floorPlanRelPath);
	const floorPlanImage = existsSync(floorPlanFsPath) ? floorPlanRelPath : null;

	// Model 3D rumah (hasil ekspor SketchUp -> .glb). Konvensi lokasi:
	//   static/images/tours/<slug>/3D/<slug>_3d.glb  (mis. rajendra-hills -> rajendra_3d.glb).
	// Cari beberapa nama umum; kalau tak ada, glbSrc=null dan komponen jatuh ke placeholder.
	const glbCandidates = [
		`/images/tours/${project.slug}/3D/${project.slug}_3d.glb`,
		`/images/tours/${project.slug}/3D/${project.slug.split('-')[0]}_3d.glb`,
		`/images/tours/${project.slug}/3D/model.glb`
	];
	const glbSrc =
		glbCandidates.find((rel) => existsSync(path.join(projectRoot, 'static', rel))) ?? null;

	// HDRI environment kustom untuk pencahayaan model 3D (mood realistis). Taruh file
	// di static/images/tours/<slug>/env/ dengan salah satu nama di bawah (.hdr equirect
	// direkomendasikan; .jpg/.png HDR juga didukung model-viewer). Kalau tak ada, komponen
	// pakai environment bawaan bernuansa keemasan (lihat GOLDEN_HOUR di VirtualTour.svelte).
	const envCandidates = [
		// `/images/tours/${project.slug}/env/environment.hdr`,
		`/images/tours/${project.slug}/env/golden-hour.hdr`,
		`/images/tours/${project.slug}/env/sunset.hdr`,
		`/images/tours/${project.slug}/env/environment.jpg`
	];
	const envImage =
		envCandidates.find((rel) => existsSync(path.join(projectRoot, 'static', rel))) ?? null;

	// Daftar semua proyek aktif + status apakah masing-masing sudah punya tur —
	// dipakai switcher "Proyek Lain" di header VirtualTour agar bisa berpindah
	// tanpa balik ke beranda. Proyek tanpa tur ditandai "Segera Hadir" (non-klik).
	const allProjects = await db
		.select({ id: projects.id, name: projects.name, slug: projects.slug, imagePath: projects.imagePath })
		.from(projects)
		.where(eq(projects.isActive, 1))
		.orderBy(asc(projects.sortOrder), asc(projects.id));

	const projectIdsWithNodes = await db
		.selectDistinct({ projectId: virtualTourNodes.projectId })
		.from(virtualTourNodes)
		.where(
			and(
				eq(virtualTourNodes.isActive, 1),
				inArray(
					virtualTourNodes.projectId,
					allProjects.map((p) => p.id)
				)
			)
		);
	const idsWithTour = new Set(projectIdsWithNodes.map((r) => r.projectId));

	const otherProjects = allProjects.map((p) => ({
		name: p.name,
		slug: p.slug,
		imagePath: p.imagePath,
		hasTour: idsWithTour.has(p.id)
	}));

	return { project, vrNodes, streetNodes, floorPlanImage, glbSrc, envImage, otherProjects };
};
