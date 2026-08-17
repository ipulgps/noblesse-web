import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	// Bind ke 0.0.0.0 agar dev & preview server bisa diakses dari
	// perangkat lain di jaringan lokal yang sama (LAN/Wi-Fi).
	server: {
		host: '0.0.0.0'
	},
	preview: {
		host: '0.0.0.0'
	},
	plugins: [tailwindcss(), sveltekit()],
	// @google/model-viewer membawa three.js versinya sendiri (bundle besar) dan kita
	// muat lazy (dynamic import di browser), jadi aman di-exclude dari pre-bundling.
	optimizeDeps: {
		exclude: ['@google/model-viewer', '@google/model-viewer-effects']
	}
});
