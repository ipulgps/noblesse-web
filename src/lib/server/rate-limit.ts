// Rate limiter sederhana berbasis memori (sliding window per kunci, mis. IP).
// Cukup untuk satu instance. Untuk multi-instance/produksi besar, ganti dengan
// penyimpanan bersama (Redis). Catatan: state hilang saat server restart.

type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

// Bersihkan entri kedaluwarsa sesekali agar Map tidak tumbuh tanpa batas.
let lastSweep = Date.now();
function sweep(now: number) {
	if (now - lastSweep < 60_000) return;
	lastSweep = now;
	for (const [key, hit] of buckets) {
		if (hit.resetAt <= now) buckets.delete(key);
	}
}

/**
 * @returns { ok: true } jika di bawah limit, atau { ok: false, retryAfter } (detik).
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
	const now = Date.now();
	sweep(now);
	const hit = buckets.get(key);
	if (!hit || hit.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return { ok: true as const };
	}
	if (hit.count >= limit) {
		return { ok: false as const, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
	}
	hit.count++;
	return { ok: true as const };
}
