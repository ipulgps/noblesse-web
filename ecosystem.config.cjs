module.exports = {
	apps: [
		{
			name: 'noblesse',
			script: 'build/index.js',
			node_args: '--env-file=.env',
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			restart_delay: 3000,
			max_restarts: 10,
			max_memory_restart: '400M',
			// Semua variabel (termasuk NODE_ENV) dibaca dari .env via --env-file
			// agar hanya ada satu sumber kebenaran. Jangan set env di sini supaya
			// tidak menimpa .env (PM2 env di-inject lebih dulu & tidak ditimpa
			// oleh --env-file Node).
			time: true,
			merge_logs: true,
			out_file: 'logs/out.log',
			error_file: 'logs/error.log',
			watch: false
		}
	]
};
