import { db } from '$lib/server/db';
import { siteSettings } from '$lib/server/schema';
import { sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

// Daftar field yang dikelola + label & tipe input.
const FIELDS: { key: string; label: string; type: 'text' | 'textarea' }[] = [
	{ key: 'hero_subtitle', label: 'Subjudul Hero', type: 'textarea' },
	{ key: 'about_heading', label: 'Judul Tentang (boleh <br>)', type: 'text' },
	{ key: 'about_paragraph_1', label: 'Tentang — Paragraf 1', type: 'textarea' },
	{ key: 'about_paragraph_2', label: 'Tentang — Paragraf 2', type: 'textarea' },
	{ key: 'footer_about', label: 'Teks Footer', type: 'textarea' },
	{ key: 'wa_number', label: 'Nomor WhatsApp (cth 62813...)', type: 'text' },
	{ key: 'wa_display', label: 'WhatsApp (tampilan)', type: 'text' },
	{ key: 'instagram_url', label: 'URL Instagram', type: 'text' },
	{ key: 'instagram_handle', label: 'Handle Instagram', type: 'text' },
	{ key: 'maps_url', label: 'URL Google Maps', type: 'text' },
	{ key: 'location_marker_label', label: 'Label Penanda Peta', type: 'text' },
	{ key: 'kpr_default_price', label: 'KPR — Harga default (juta)', type: 'text' },
	{ key: 'kpr_default_dp', label: 'KPR — DP default (%)', type: 'text' },
	{ key: 'kpr_default_tenor', label: 'KPR — Tenor default (tahun)', type: 'text' },
	{ key: 'kpr_default_rate', label: 'KPR — Bunga default (%)', type: 'text' }
];

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(siteSettings);
	const map: Record<string, string> = {};
	for (const r of rows) map[r.key] = r.value ?? '';
	return { fields: FIELDS, values: map };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		for (const f of FIELDS) {
			const value = String(form.get(f.key) ?? '').slice(0, 5000);
			await db
				.insert(siteSettings)
				.values({ key: f.key, value })
				.onDuplicateKeyUpdate({ set: { value: sql`VALUES(\`value\`)` } });
		}
		return { ok: true };
	}
};
