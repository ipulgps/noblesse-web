import { redirect, error, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = await validateSession(token);

	// ── Penjaga area admin (terpusat) ─────────────────────────────────────────
	// Melindungi SEMUA rute /admin/* dan /api/admin/* — termasuk form action
	// (POST) yang tidak menjalankan layout load. Halaman login dikecualikan.
	const { pathname } = event.url;
	const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
	const isLoginPage = pathname === '/admin/login';

	if (isAdminArea && !isLoginPage && !event.locals.user) {
		// GET halaman → arahkan ke login; selain itu (POST action, API) → tolak.
		if (event.request.method === 'GET') {
			throw redirect(302, '/admin/login');
		}
		throw error(401, 'Tidak diizinkan. Silakan login.');
	}

	const response = await resolve(event);

	// Header keamanan dasar.
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), interest-cohort=()'
	);

	return response;
};
