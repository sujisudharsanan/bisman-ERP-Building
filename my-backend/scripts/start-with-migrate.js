/*
  start-with-migrate.js
  Robust startup with Prisma migration auto-recovery.
  - Attempts migrate deploy.
  - On P3009 (failed migration history) tries to mark baseline applied & failed legacy migrations rolled back.
  - Falls back to db push as last resort (logged) without aborting container.
*/
const { execSync } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');

function run(cmd, opts = {}) {
  console.log(`[setup] ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function hasBaselineFolder() {
  if (!existsSync('./prisma/migrations')) return false;
  return readdirSync('./prisma/migrations').some(f => /baseline/i.test(f));
}

function attemptAutoResolve() {
  // Identify baseline and failed legacy migration names if present.
  const folders = readdirSync('./prisma/migrations').filter(f => !f.startsWith('.') && !f.endsWith('.toml'));
  const baseline = folders.find(f => /baseline/i.test(f));
  if (!baseline) {
    console.warn('[setup] No baseline migration folder detected; skipping auto-resolve.');
    return false;
  }
  console.log(`[setup] Auto-resolve: marking baseline applied (${baseline})`);
  try {
    run(`npx prisma migrate resolve --applied ${baseline}`);
  } catch (e) {
    console.warn('[setup] Failed to mark baseline applied:', e.message || e);
  }
  // Mark any failed early migration (example: 20250926_add_roles_table) as rolled back if still listed
  const legacy = folders.find(f => /20250926_add_roles_table/.test(f));
  if (legacy) {
    console.log(`[setup] Auto-resolve: marking legacy failed migration rolled-back (${legacy})`);
    try {
      run(`npx prisma migrate resolve --rolled-back ${legacy}`);
    } catch (e) {
      console.warn('[setup] Failed to mark legacy rolled-back:', e.message || e);
    }
  }
  return true;
}

(async () => {
  let migrateSucceeded = false;
  const hasMigrations = existsSync('./prisma/migrations');
  if (hasMigrations) {
    try {
      run('npx prisma migrate deploy');
      migrateSucceeded = true;
      console.log('[setup] migrate deploy succeeded');
    } catch (e) {
      const msg = e.message || String(e);
      console.error('[setup] migrate deploy failed:', msg);
      if (/P3009/.test(msg)) {
        console.warn('[setup] Detected P3009 failed migrations; attempting auto-resolve.');
        if (attemptAutoResolve()) {
          try {
            run('npx prisma migrate deploy');
            migrateSucceeded = true;
            console.log('[setup] migrate deploy succeeded after auto-resolve');
          } catch (e2) {
            console.error('[setup] Second migrate deploy attempt failed:', e2.message || e2);
          }
        }
      }
    }
  }

  if (!migrateSucceeded) {
    console.warn('[setup] Falling back to prisma db push (non-migration)');
    try {
      run('npx prisma db push');
    } catch (e) {
      console.error('[setup] db push failed:', e.message || e);
    }
  }

  // Start application
  try {
    run('node index.js');
  } catch (e) {
    console.error('[setup] App failed to start:', e.message || e);
    process.exit(1);
  }
})();
