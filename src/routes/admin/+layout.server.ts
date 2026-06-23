import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isLogin = url.pathname === '/admin/login';

	// Belum login & bukan halaman login → arahkan ke login.
	if (!locals.user && !isLogin) {
		throw redirect(302, '/admin/login');
	}
	// Sudah login tapi membuka halaman login → arahkan ke dashboard.
	if (locals.user && isLogin) {
		throw redirect(302, '/admin');
	}

	return { user: locals.user };
};
