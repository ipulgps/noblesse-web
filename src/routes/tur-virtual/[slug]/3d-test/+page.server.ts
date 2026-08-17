import { existsSync } from 'node:fs';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Halaman UJI untuk Model3DViewer.svelte (three.js murni: DirectionalLight + HDRI + shadow).
// Memakai konvensi path yang sama dengan /tur-virtual/[slug] agar hasilnya sebanding.
export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;
	const projectRoot = process.cwd();

	const glbCandidates = [
		`/images/tours/${slug}/3D/${slug}_3d.glb`,
		`/images/tours/${slug}/3D/${slug.split('-')[0]}_3d.glb`,
		`/images/tours/${slug}/3D/model.glb`
	];
	const glbSrc = glbCandidates.find((rel) => existsSync(path.join(projectRoot, 'static', rel))) ?? null;
	if (!glbSrc) throw error(404, `Model .glb tidak ditemukan untuk "${slug}"`);

	const envCandidates = [
		`/images/tours/${slug}/env/golden-hour.hdr`,
		`/images/tours/${slug}/env/environment.hdr`,
		`/images/tours/${slug}/env/sunset.hdr`
	];
	const envImage = envCandidates.find((rel) => existsSync(path.join(projectRoot, 'static', rel))) ?? null;

	return { slug, glbSrc, envImage };
};
