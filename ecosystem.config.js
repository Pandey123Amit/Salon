module.exports = {
  apps: [
    {
      name: 'salonbot',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
      },
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/app/logs/error.log',
      out_file: '/app/logs/out.log',
      merge_logs: true,
      max_size: '10M',
      retain: 5,
      // Restart policy
      max_memory_restart: '512M',
      kill_timeout: 5000,
      wait_ready: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
    },
  ],
};
