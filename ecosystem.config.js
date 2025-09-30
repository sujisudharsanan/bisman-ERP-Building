module.exports = {
  apps: [
    {
      name: 'bisman-backend',
      cwd: '.',
      script: 'node',
      args: '-r module-alias/register dist/apps/api/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    },
    {
      name: 'bisman-frontend',
      cwd: 'my-frontend',
      script: 'npm',
      args: 'run start -- -p 3001',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    }
  ]
}
