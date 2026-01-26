const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const outDir = path.join(__dirname, '../docs/audit');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

async function toCsv(rows, cols) {
  const header = cols.join(',') + '\n';
  const lines = rows.map(r => cols.map(c => {
    const v = r[c];
    if (v === null || v === undefined) return '';
    return '"' + String(v).replace(/"/g, '""') + '"';
  }).join(',')).join('\n');
  return header + lines + '\n';
}

(async () => {
  try {
    const queries = {
      pages_null_module: `SELECT id,page_code,display_name,route,category,page_type,show_in_sidebar,status FROM pages_master WHERE module_id IS NULL AND status='active' ORDER BY route`,
      duplicate_routes: `SELECT route, COUNT(*) as cnt, array_agg(id) as page_ids, array_agg(display_name) as names FROM pages_master WHERE status='active' GROUP BY route HAVING COUNT(*)>1 ORDER BY cnt DESC`,
      duplicate_display_names: `SELECT display_name, COUNT(*) as cnt, array_agg(route) as routes, array_agg(id) as page_ids FROM pages_master WHERE status='active' GROUP BY display_name HAVING COUNT(*)>1 ORDER BY cnt DESC`,
      non_ui_sidebar: `SELECT id,page_code,display_name,route,page_type,show_in_sidebar FROM pages_master WHERE status='active' AND show_in_sidebar=true AND (page_type IS NULL OR page_type!='UI_PAGE') ORDER BY route`,
      orphan_pages: `SELECT p.id,p.page_code,p.display_name,p.route,m.module_code,p.category,p.is_public,p.show_in_sidebar FROM pages_master p LEFT JOIN modules_master m ON p.module_id=m.id LEFT JOIN role_page_access rpa ON p.id=rpa.page_id WHERE p.status='active' AND p.page_type='UI_PAGE' AND p.is_public=false AND p.category NOT IN ('PUBLIC','RESTRICTED_COMMON') AND rpa.page_id IS NULL ORDER BY m.module_code,p.route`,
      pump_pages: `SELECT p.id,p.page_code,p.display_name,p.route,m.module_code,p.status,p.show_in_sidebar FROM pages_master p LEFT JOIN modules_master m ON p.module_id=m.id WHERE LOWER(p.page_code) LIKE '%pump%' OR LOWER(p.route) LIKE '%pump%' OR LOWER(m.module_code) LIKE '%pump%' ORDER BY p.route`,
      dashboards: `SELECT p.id,p.page_code,p.display_name,p.route,m.module_code,p.show_in_sidebar FROM pages_master p LEFT JOIN modules_master m ON p.module_id=m.id WHERE p.status='active' AND (LOWER(p.display_name) LIKE '%dashboard%' OR LOWER(p.page_code) LIKE '%dashboard%' OR m.module_code='DASHBOARD') ORDER BY m.module_code,p.route`,
      route_module_mismatch: `SELECT p.id,p.page_code,p.display_name,p.route,m.module_code,m.base_route FROM pages_master p JOIN modules_master m ON p.module_id=m.id WHERE p.status='active' AND m.module_code NOT IN ('COMMON','PUBLIC','DASHBOARD') AND p.route NOT LIKE m.base_route || '%' AND p.route != m.base_route ORDER BY m.module_code,p.route LIMIT 500`,
      modules_summary: `SELECT m.module_code,m.display_name,COUNT(p.id) as page_count FROM modules_master m LEFT JOIN pages_master p ON p.module_id=m.id AND p.status='active' GROUP BY m.id,m.module_code,m.display_name ORDER BY page_count DESC`,
    };

    const results = {};
    for (const [name, q] of Object.entries(queries)) {
      const res = await pool.query(q);
      results[name] = res.rows;
      const cols = res.fields ? res.fields.map(f => f.name) : Object.keys(res.rows[0] || {});
      const csv = await toCsv(res.rows, cols);
      fs.writeFileSync(path.join(outDir, `${name}.csv`), csv, 'utf8');
    }

    // Summary markdown
    let md = '# RBAC DB Audit - Detailed Tables\n\n';
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += 'Files produced:\n\n';
    for (const name of Object.keys(queries)) md += `- docs/audit/${name}.csv\n`;

    // quick stats
    md += '\n## Quick Stats\n\n';
    md += `- Pages with NULL module: ${results.pages_null_module.length}\n`;
    md += `- Duplicate routes: ${results.duplicate_routes.length}\n`;
    md += `- Duplicate display names: ${results.duplicate_display_names.length}\n`;
    md += `- Non-UI pages in sidebar: ${results.non_ui_sidebar.length}\n`;
    md += `- Orphan pages (active, UI, not public, no roles): ${results.orphan_pages.length}\n`;
    md += `- PUMP-related pages found: ${results.pump_pages.length}\n`;
    md += `- Dashboard pages found: ${results.dashboards.length}\n`;
    md += '\n\n## Next Steps\n\n';
    md += '- Review CSVs in `docs/audit/` and confirm acceptance before running fixes.\n';
    md += '- If OK, run `scripts/rbac-page-module-fix.sql` via psql or admin tool (it is ROLLBACK by default).\n';

    fs.writeFileSync(path.join(outDir, 'README.md'), md, 'utf8');

    console.log('Audit export complete. Files written to docs/audit/');
    console.log(Object.fromEntries(Object.entries(results).map(([k,v]) => [k, v.length])));

    await pool.end();
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})().catch(e=>{console.error(e);process.exit(1)});
