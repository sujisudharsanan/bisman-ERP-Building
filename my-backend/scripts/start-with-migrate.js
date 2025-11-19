/*
  start-with-migrate.js
  Runs Prisma migrate deploy (or db push if no migrations) before starting server.
*/
const { execSync } = require('node:child_process');
const { existsSync } = require('node:fs');

function run(cmd) {
  console.log(`[setup] ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

(async () => {
  try {
    const hasMigrations = existsSync('./prisma/migrations');
    if (hasMigrations) {
      run('npx prisma migrate deploy');
    } else {
      console.warn('[setup] No prisma/migrations found. Running prisma db push.');
      run('npx prisma db push');
    }
  } catch (e) {
    console.error('[setup] Prisma migration failed:', e.message || e);
    // Continue anyway; app may still run if schema matches
  }

  try {
    run('node index.js');
  } catch (e) {
    console.error('[setup] App failed to start:', e.message || e);
    process.exit(1);
  }
})();
