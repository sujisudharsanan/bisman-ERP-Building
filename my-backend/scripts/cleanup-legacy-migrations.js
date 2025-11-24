/*
  cleanup-legacy-migrations.js
  Moves loose .sql migration files (not in timestamped folders) out of prisma/migrations
  to prisma/legacy_sql/ to avoid Prisma drift/confusion.
  Safe: does not delete content.
*/
const { readdirSync, mkdirSync, renameSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations');
const LEGACY_DIR = join(__dirname, '..', 'prisma', 'legacy_sql');

function main() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error('[cleanup] migrations directory missing');
    process.exit(1);
  }
  mkdirSync(LEGACY_DIR, { recursive: true });
  const entries = readdirSync(MIGRATIONS_DIR);
  const moved = [];
  for (const e of entries) {
    if (e === 'migration_lock.toml') continue;
    const full = join(MIGRATIONS_DIR, e);
    // Folder migrations have timestamp prefixes; keep them.
    if (/^\d{8}/.test(e) && !e.endsWith('.sql')) continue;
    // Skip baseline folder
    if (/baseline/i.test(e) && !e.endsWith('.sql')) continue;
    // Raw .sql file -> move
    if (e.endsWith('.sql')) {
      const target = join(LEGACY_DIR, e);
      renameSync(full, target);
      moved.push(e);
    }
  }
  console.log(`[cleanup] Moved ${moved.length} loose sql files to prisma/legacy_sql:`);
  moved.forEach(f => console.log(' - ' + f));
}

main();
