module.exports = {
  apps: [
    {
      name: 'notes-platform',
      script: 'app.js',
      // Multi-Core Cluster Mode: scale across all available CPU cores automatically
      instances: 'max',
      exec_mode: 'cluster',
      
      // Zero-downtime reload & graceful shutdown
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,

      // Auto-restart if a process exceeds memory threshold (auto-healing)
      max_memory_restart: '500M',

      // Environment Variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Logging & Monitoring
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
