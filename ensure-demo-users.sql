-- Ensure Demo Users Exist (idempotent upserts)
-- Hub Incharge: demo_hub_incharge@bisman.demo -> demo123

-- bcrypt hash for demo123 (from repo fixes)
-- Note: keep consistent with fix-hub-incharge-password.sql
DO $$
BEGIN
  INSERT INTO users (email, username, password, role, is_active, productType, tenant_id, super_admin_id, created_at, updated_at)
  VALUES ('demo_hub_incharge@bisman.demo', 'hubincharge', '$2a$10$sSOb5fx4sIgiJNq6.OfIU.q0aFJlRgIbOfTu4k6lpV0yhJxFMHbWm', 'HUB_INCHARGE', true, 'BUSINESS_ERP', NULL, NULL, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE
  SET password = EXCLUDED.password,
      role = EXCLUDED.role,
      is_active = true,
      updated_at = NOW();
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'users table not found; skipping ensure-demo-users.sql';
END $$;

-- Verify
SELECT email, role, is_active, left(password, 20) || '...' as pwd_start
FROM users WHERE email='demo_hub_incharge@bisman.demo';
