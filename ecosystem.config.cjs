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
			env: {
				NODE_ENV: 'production',
				PORT: 3003,
				HOST: '127.0.0.1'
			},
			time: true,
			merge_logs: true,
			out_file: 'logs/out.log',
			error_file: 'logs/error.log',
			watch: false
		}
	]
};
