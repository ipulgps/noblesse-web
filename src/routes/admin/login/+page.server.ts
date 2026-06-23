import { fail, redirect } from '@sveltejs/kit';
import { authenticate, createSession, SESSION_COOKIE, cookieSecure } from '$lib/server/auth';
import { rateLimit } from '$lib/server/rate-limit';
import type { Actions } from './$types';

// Maks 8 percobaan login per IP tiap 5 menit (anti brute-force).
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const limited = rateLimit(`login:${getClientAddress()}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
		if (!limited.ok) {
			return fail(429, {
				email: '',
				error: `Terlalu banyak percobaan. Coba lagi dalam ${limited.retryAfter} detik.`
			});
		}

		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, error: 'Email dan password wajib diisi.' });
		}

		const user = await authenticate(email, password);
		if (!user) {
			return fail(401, { email, error: 'Email atau password salah.' });
		}

		const { token, expiresAt } = await createSession(user.id);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: cookieSecure,
			expires: expiresAt
		});

		throw redirect(303, '/admin');
	}
};
