-- SAFE FK ADD FOR routes AND rbac_routes TO modules
-- Pre-condition: run backfill statements manually before applying if large dataset.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS module_id INT;
UPDATE routes SET module_id = m.id FROM modules m WHERE routes.module = m.module_name AND routes.module IS NOT NULL AND routes.module_id IS NULL;
ALTER TABLE rbac_routes ADD COLUMN IF NOT EXISTS module_id INT;
UPDATE rbac_routes SET module_id = m.id FROM modules m WHERE rbac_routes.module = m.module_name AND rbac_routes.module IS NOT NULL AND rbac_routes.module_id IS NULL;

-- Constraints (idempotent guards using DO blocks not supported in pure SQL; will rely on manual check):
DO $$ BEGIN
  ALTER TABLE routes ADD CONSTRAINT routes_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE rbac_routes ADD CONSTRAINT rbac_routes_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_routes_module_id ON routes(module_id);
CREATE INDEX IF NOT EXISTS idx_rbac_routes_module_id ON rbac_routes(module_id);
