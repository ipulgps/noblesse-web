import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { env } from '$env/dynamic/private';
import type { voucherTemplates } from './schema';
import { encryptVoucherCode } from './voucher-token';

const UPLOAD_DIR = join(process.cwd(), 'static', 'uploads', 'vouchers');

type VoucherTemplate = typeof voucherTemplates.$inferSelect;

// Escape teks agar aman disisipkan ke dalam SVG (nomor voucher tampil apa adanya).
function escapeXml(s: string) {
	return s.replace(/[&<>"']/g, (c) =>
		c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;'
	);
}

function verifyUrl(code: string) {
	const origin = (env.ORIGIN || '').replace(/\/$/, '');
	return `${origin}/verify/${encryptVoucherCode(code)}`;
}

function formatExpiredDate(d: Date) {
	return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Render gambar voucher digital: composite QR code + nomor voucher + tanggal
// kedaluwarsa di atas gambar template, sesuai koordinat yang diatur admin.
// Hasil disimpan ke static/uploads/vouchers/ (di-serve nginx lewat alias
// /uploads/ yang sudah ada).
export async function renderVoucherImage(
	template: VoucherTemplate,
	code: string,
	expiredAt: Date | null
): Promise<string> {
	const templatePath = join(process.cwd(), 'static', template.imagePath.replace(/^\/+/, ''));
	const base = sharp(templatePath);
	const meta = await base.metadata();
	const canvasW = meta.width ?? 1000;
	const canvasH = meta.height ?? 1000;

	const qrBuffer = await QRCode.toBuffer(verifyUrl(code), {
		type: 'png',
		width: template.qrSize,
		margin: 1
	});

	const expiredText = expiredAt ? formatExpiredDate(expiredAt) : '';

	const textSvg = Buffer.from(`
		<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
			<text
				x="${template.codeX}"
				y="${template.codeY}"
				font-size="${template.fontSize}"
				font-family="sans-serif"
				font-weight="700"
				fill="${escapeXml(template.textColor)}"
			>${escapeXml(code)}</text>
			${
				expiredText
					? `<text
				x="${template.expiredX}"
				y="${template.expiredY}"
				font-size="${template.expiredFontSize}"
				font-family="sans-serif"
				font-weight="500"
				fill="${escapeXml(template.expiredTextColor)}"
			>${escapeXml(expiredText)}</text>`
					: ''
			}
		</svg>
	`);

	const outBuffer = await base
		.composite([
			{ input: qrBuffer, left: template.qrX, top: template.qrY },
			{ input: textSvg, left: 0, top: 0 }
		])
		.png()
		.toBuffer();

	await mkdir(UPLOAD_DIR, { recursive: true });
	const fileName = `${randomUUID()}.png`;
	await writeFile(join(UPLOAD_DIR, fileName), outBuffer);

	return `/uploads/vouchers/${fileName}`;
}
