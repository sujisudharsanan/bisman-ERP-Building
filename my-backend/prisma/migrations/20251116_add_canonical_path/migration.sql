ALTER TABLE routes ADD COLUMN IF NOT EXISTS canonical_path VARCHAR(255);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS param_names JSONB;
ALTER TABLE rbac_routes ADD COLUMN IF NOT EXISTS canonical_path VARCHAR(255);
ALTER TABLE rbac_routes ADD COLUMN IF NOT EXISTS param_names JSONB;
CREATE INDEX IF NOT EXISTS idx_routes_canonical_path ON routes(canonical_path);
CREATE INDEX IF NOT EXISTS idx_rbac_routes_canonical_path ON rbac_routes(canonical_path);