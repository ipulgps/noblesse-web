import { redirect } from '@sveltejs/kit';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

// Akses langsung via GET tidak melakukan apa-apa → kembali ke dashboard.
export const load: PageServerLoad = async () => {
	throw redirect(302, '/admin');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		await deleteSession(token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
