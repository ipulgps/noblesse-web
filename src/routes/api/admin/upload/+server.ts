import { json, error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { RequestHandler } from './$types';

const ALLOWED: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/avif': '.avif',
	'image/gif': '.gif'
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOAD_DIR = join(process.cwd(), 'static', 'uploads');

export const POST: RequestHandler = async ({ request, locals }) => {
	// Hanya admin yang sudah login boleh upload.
	if (!locals.user) throw error(401, 'Tidak diizinkan.');

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) throw error(400, 'Tidak ada file.');

	const ext = ALLOWED[file.type];
	if (!ext) throw error(415, 'Format harus JPG, PNG, WebP, AVIF, atau GIF.');
	if (file.size > MAX_BYTES) throw error(413, 'Ukuran maksimal 5 MB.');

	const buf = Buffer.from(await file.arrayBuffer());
	// Nama unik; abaikan ekstensi asli, pakai dari tipe MIME.
	const name = randomUUID() + ext;
	await mkdir(UPLOAD_DIR, { recursive: true });
	await writeFile(join(UPLOAD_DIR, name), buf);

	// Path publik yang disimpan ke kolom *_path / image_path di DB.
	return json({ ok: true, path: `/uploads/${name}` });
};
