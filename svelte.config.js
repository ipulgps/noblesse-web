import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Paksa mode runes untuk proyek (kecuali library).
		runes: true
	},
	kit: {
		adapter: adapter()
		// Proteksi CSRF (tolak POST lintas-origin) aktif secara default di SvelteKit.
	}
};

export default config;
