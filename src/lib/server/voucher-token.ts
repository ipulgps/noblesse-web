import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

// Token QR voucher: AES-256-GCM, output base64url(iv[12] + authTag[16] + ciphertext).
// Kunci 32-byte hex di VOUCHER_TOKEN_KEY (.env) — generate sekali dengan:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const ALGO = 'aes-256-gcm';

function keyBuffer(): Buffer {
	const hex = env.VOUCHER_TOKEN_KEY;
	if (!hex || hex.length !== 64) {
		throw new Error('VOUCHER_TOKEN_KEY tidak diset atau bukan 32-byte hex (64 karakter).');
	}
	return Buffer.from(hex, 'hex');
}

export function encryptVoucherCode(code: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv(ALGO, keyBuffer(), iv);
	const ciphertext = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return Buffer.concat([iv, authTag, ciphertext]).toString('base64url');
}

// Kembalikan kode voucher asli, atau null jika token rusak/tidak valid — jangan
// bocorkan detail kegagalan dekripsi ke publik (pemanggil cukup tahu invalid/tidak).
export function decryptVoucherCode(token: string): string | null {
	try {
		const raw = Buffer.from(token, 'base64url');
		if (raw.length <= 12 + 16) return null;
		const iv = raw.subarray(0, 12);
		const authTag = raw.subarray(12, 28);
		const ciphertext = raw.subarray(28);
		const decipher = createDecipheriv(ALGO, keyBuffer(), iv);
		decipher.setAuthTag(authTag);
		const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
		return plain.toString('utf8');
	} catch {
		return null;
	}
}
