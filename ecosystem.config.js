// PM2 ecosystem config for production VPS deployment
module.exports = {
  apps: [
    {
      name: "wedding-photos",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 2,          // Adjust based on CPU cores
      exec_mode: "cluster",  // Cluster mode for multi-core
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
