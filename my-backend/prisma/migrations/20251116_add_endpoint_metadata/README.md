Adds metadata columns to `routes` and `rbac_routes`:
- source_file VARCHAR(200)
- handler_count INT
- middleware_count INT
- has_params BOOLEAN
- last_scanned_at TIMESTAMPTZ

All nullable; populated by deep scan script.