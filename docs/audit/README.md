# RBAC DB Audit - Detailed Tables

Generated: 2026-01-26T19:06:42.553Z

Files produced:

- docs/audit/pages_null_module.csv
- docs/audit/duplicate_routes.csv
- docs/audit/duplicate_display_names.csv
- docs/audit/non_ui_sidebar.csv
- docs/audit/orphan_pages.csv
- docs/audit/pump_pages.csv
- docs/audit/dashboards.csv
- docs/audit/route_module_mismatch.csv
- docs/audit/modules_summary.csv

## Quick Stats

- Pages with NULL module: 0
- Duplicate routes: 0
- Duplicate display names: 1
- Non-UI pages in sidebar: 0
- Orphan pages (active, UI, not public, no roles): 0
- PUMP-related pages found: 1
- Dashboard pages found: 12


## Next Steps

- Review CSVs in `docs/audit/` and confirm acceptance before running fixes.
- If OK, run `scripts/rbac-page-module-fix.sql` via psql or admin tool (it is ROLLBACK by default).
