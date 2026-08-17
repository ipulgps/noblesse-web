import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { virtualTourNodes, projects } from '$lib/server/schema';
import { asc, and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [nodeRows, projectRows] = await Promise.all([
		db
			.select()
			.from(virtualTourNodes)
			.orderBy(asc(virtualTourNodes.projectId), asc(virtualTourNodes.sortOrder), asc(virtualTourNodes.id)),
		db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id))
	]);
	return { nodes: nodeRows, projects: projectRows };
};

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const intOf = (v: FormDataEntryValue | null, fallback = 0) => {
	const n = parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
};

function parse(form: FormData) {
	const projectId = intOf(form.get('projectId'));
	const tourType: 'interior' | 'streetview' = form.get('tourType') === 'streetview' ? 'streetview' : 'interior';
	const nodeKey = str(form.get('nodeKey'), 60)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	const name = str(form.get('name'), 120);
	const imagePath = str(form.get('imagePath'), 255);
	const mapX = intOf(form.get('mapX'), 50);
	const mapY = intOf(form.get('mapY'), 50);

	// Arah pandang awal kamera 360° (yaw). Field 'initialYaw' kosong berarti belum
	// diatur -> simpan null supaya viewer jatuh ke horizon depan (yaw 0). Nilai
	// dinormalkan ke rentang 0-359 derajat.
	const initialYawRaw = str(form.get('initialYaw'), 10);
	const initialYaw =
		initialYawRaw === '' ? null : ((intOf(form.get('initialYaw'), 0) % 360) + 360) % 360;

	// Link diinput sebagai pasangan baris (linkTo[], linkYaw[]) dari form, digabung jadi JSON.
	const linkTos = form.getAll('linkTo').map((v) => str(v, 60));
	const linkYaws = form.getAll('linkYaw').map((v) => intOf(v, 0));
	const links = linkTos
		.map((to, i) => ({ to, yaw: linkYaws[i] ?? 0 }))
		.filter((l) => l.to);
	const linksJson = links.length > 0 ? JSON.stringify(links) : null;

	const markerTitle = str(form.get('markerTitle'), 120) || null;
	const markerDesc = str(form.get('markerDesc'), 500) || null;
	const markerYaw = str(form.get('markerYaw'), 20) || null;
	const markerPitch = str(form.get('markerPitch'), 20) || null;
	const sortOrder = intOf(form.get('sortOrder'), 0);
	const isActive = form.get('isActive') ? 1 : 0;

	return {
		projectId,
		tourType,
		nodeKey,
		name,
		imagePath,
		mapX,
		mapY,
		initialYaw,
		linksJson,
		markerTitle,
		markerDesc,
		markerYaw,
		markerPitch,
		sortOrder,
		isActive
	};
}

const required = (d: ReturnType<typeof parse>) =>
	d.projectId && d.nodeKey && d.name && d.imagePath;

async function nodeKeyTaken(projectId: number, tourType: string, nodeKey: string, excludeId?: number) {
	const rows = await db
		.select({ id: virtualTourNodes.id })
		.from(virtualTourNodes)
		.where(
			and(
				eq(virtualTourNodes.projectId, projectId),
				eq(virtualTourNodes.tourType, tourType as 'interior' | 'streetview'),
				eq(virtualTourNodes.nodeKey, nodeKey)
			)
		);
	return rows.some((r) => r.id !== excludeId);
}

export const actions: Actions = {
	create: async ({ request }) => {
		const data = parse(await request.formData());
		if (!required(data)) {
			return fail(422, { error: 'Proyek, kunci node, nama, dan foto wajib diisi.' });
		}
		if (await nodeKeyTaken(data.projectId, data.tourType, data.nodeKey)) {
			return fail(422, { error: 'Kunci node ini sudah dipakai titik lain di proyek & jenis tur yang sama.' });
		}
		await db.insert(virtualTourNodes).values(data);
		return { ok: true };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		const data = parse(form);
		if (!required(data)) {
			return fail(422, { error: 'Proyek, kunci node, nama, dan foto wajib diisi.' });
		}
		if (await nodeKeyTaken(data.projectId, data.tourType, data.nodeKey, id)) {
			return fail(422, { error: 'Kunci node ini sudah dipakai titik lain di proyek & jenis tur yang sama.' });
		}
		await db.update(virtualTourNodes).set(data).where(eq(virtualTourNodes.id, id));
		return { ok: true };
	},

	delete: async ({ request }) => {
		const id = intOf((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.delete(virtualTourNodes).where(eq(virtualTourNodes.id, id));
		return { ok: true };
	},

	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = intOf(form.get('id'));
		const isActive = form.get('isActive') === '1' ? 0 : 1;
		if (!id) return fail(400, { error: 'ID tidak valid.' });
		await db.update(virtualTourNodes).set({ isActive }).where(eq(virtualTourNodes.id, id));
		return { ok: true };
	}
};
