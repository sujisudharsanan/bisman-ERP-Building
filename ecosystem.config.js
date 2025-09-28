module.exports = {
  apps: [
    {
      name: 'bisman-api',
      script: 'dist/apps/api/src/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      error_file: './logs/api.err.log',
      out_file: './logs/api.out.log',
      merge_logs: true,
    },
    {
      name: 'bisman-next',
      cwd: __dirname + '/my-frontend',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      error_file: './logs/next.err.log',
      out_file: './logs/next.out.log',
      merge_logs: true,
    },
  ],
};
