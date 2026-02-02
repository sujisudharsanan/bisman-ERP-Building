/* Quick DB connectivity & schema check for Railway (safe, read-only)
   - Prints SELECT 1, presence of key tables, column lists, counts, sample rows
   - Run from project root: node scripts/db_connectivity_check.js
*/

const { PrismaClient } = require('@prisma/client');

async function run() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'
      }
    }
  });

  try {
    console.log('CONNECTIVITY: SELECT 1');
    const ok = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log('->', ok);

    console.log('\nCHECK TABLES:');
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN (
        'admin_page_assignments','role_page_access','superadmin_page_pool','pages_master','_prisma_migrations'
      ) ORDER BY tablename
    `;
    console.table(tables);

    console.log('\nCOLUMNS: admin_page_assignments');
    const apa = await prisma.$queryRaw`
      SELECT column_name,data_type FROM information_schema.columns WHERE table_name='admin_page_assignments' ORDER BY ordinal_position
    `;
    console.table(apa);

    console.log('\nCOLUMNS: role_page_access');
    const rpa = await prisma.$queryRaw`
      SELECT column_name,data_type FROM information_schema.columns WHERE table_name='role_page_access' ORDER BY ordinal_position
    `;
    console.table(rpa);

    console.log('\nCOUNTS: active rows');
    const counts = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM admin_page_assignments WHERE is_active = true) as apa_active_count,
        (SELECT COUNT(*) FROM role_page_access WHERE can_view = true) as rpa_canview_count
    `;
    console.table(counts);

    console.log('\nPRISMA MIGRATIONS (recent):');
    try {
      const mig = await prisma.$queryRaw`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5`;
      console.table(mig);
    } catch (e) {
      console.warn('  _prisma_migrations not found or inaccessible:', e.message);
    }

    console.log('\nSAMPLE role_page_access for OPERATIONS_MANAGER (top 10):');
    const sample = await prisma.$queryRaw`
      SELECT pm.page_code, pm.route FROM role_page_access rpa JOIN pages_master pm ON pm.id = rpa.page_id
      WHERE rpa.role_name = 'OPERATIONS_MANAGER' AND rpa.can_view = true
      ORDER BY pm.sort_order LIMIT 10
    `;
    console.table(sample);

    console.log('\nSAMPLE admin_page_assignments for OPERATIONS_MANAGER (top 10):');
    const sample2 = await prisma.$queryRaw`
      SELECT page_key, page_id, is_active FROM admin_page_assignments
      WHERE assignee_type = 'OPERATIONS_MANAGER' AND is_active = true LIMIT 10
    `;
    console.table(sample2);

    console.log('\nDone.');
  } catch (err) {
    console.error('ERROR during DB check:', err.message || err);
    if (err.meta) console.error('META:', err.meta);
  } finally {
    await prisma.$disconnect();
  }
}

run();
