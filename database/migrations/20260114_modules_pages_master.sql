-- ============================================================================
-- BISMAN ERP - Module Alignment SSOT Migration
-- ============================================================================
-- Created: 2026-01-14
-- Purpose: Create Single Source of Truth for navigation and page access
-- 
-- This migration creates:
-- 1. modules_master - Master list of all modules
-- 2. pages_master - Master list of all pages with routes
-- 3. role_page_access - Role → Page access mapping
-- 4. get_menu_for_role() - Function to generate menu for a role
-- ============================================================================

-- ============================================================================
-- 1. MODULES_MASTER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS modules_master (
  id SERIAL PRIMARY KEY,
  module_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  base_route VARCHAR(200) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_hidden BOOLEAN DEFAULT FALSE,
  color_code VARCHAR(20),
  layout_group VARCHAR(50) DEFAULT 'common',
  product_type VARCHAR(50) DEFAULT 'ALL',
  parent_module_id INT REFERENCES modules_master(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_master_active ON modules_master(is_active);
CREATE INDEX IF NOT EXISTS idx_modules_master_layout ON modules_master(layout_group);
CREATE INDEX IF NOT EXISTS idx_modules_master_sort ON modules_master(sort_order);

COMMENT ON TABLE modules_master IS 'SSOT for all ERP modules - replaces hardcoded roleLayoutConfig';
COMMENT ON COLUMN modules_master.module_code IS 'Unique identifier e.g. FINANCE, HR, SYSTEM';
COMMENT ON COLUMN modules_master.layout_group IS 'Groups: common, admin, super-admin, enterprise-admin, internal';
COMMENT ON COLUMN modules_master.product_type IS 'Product filter: ALL, PUMP, RETAIL, DISTRIBUTION';

-- ============================================================================
-- 2. PAGES_MASTER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pages_master (
  id SERIAL PRIMARY KEY,
  page_code VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  route VARCHAR(300) NOT NULL,
  module_id INT REFERENCES modules_master(id) ON DELETE SET NULL,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  show_in_sidebar BOOLEAN DEFAULT TRUE,
  required_roles TEXT[] DEFAULT '{}',
  required_permissions TEXT[] DEFAULT '{}',
  required_features TEXT[] DEFAULT '{}',
  min_role_level INT DEFAULT 1,
  layout_group VARCHAR(50) DEFAULT 'common',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_master_route ON pages_master(route);
CREATE INDEX IF NOT EXISTS idx_pages_master_module ON pages_master(module_id);
CREATE INDEX IF NOT EXISTS idx_pages_master_active ON pages_master(is_active);
CREATE INDEX IF NOT EXISTS idx_pages_master_sidebar ON pages_master(show_in_sidebar);
CREATE INDEX IF NOT EXISTS idx_pages_master_roles ON pages_master USING GIN(required_roles);

COMMENT ON TABLE pages_master IS 'SSOT for all ERP pages - replaces page-registry.ts';
COMMENT ON COLUMN pages_master.page_code IS 'Unique identifier e.g. FINANCE_PAYMENT_APPROVAL';
COMMENT ON COLUMN pages_master.required_roles IS 'Array of role names that can access this page';
COMMENT ON COLUMN pages_master.required_features IS 'Links to master_feature_definitions for subscription checks';
COMMENT ON COLUMN pages_master.status IS 'active, deprecated, coming_soon, beta';

-- ============================================================================
-- 3. ROLE_PAGE_ACCESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_page_access (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  page_id INT NOT NULL REFERENCES pages_master(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by INT,
  notes TEXT,
  UNIQUE(role_name, page_id)
);

CREATE INDEX IF NOT EXISTS idx_role_page_access_role ON role_page_access(role_name);
CREATE INDEX IF NOT EXISTS idx_role_page_access_page ON role_page_access(page_id);
CREATE INDEX IF NOT EXISTS idx_role_page_access_view ON role_page_access(can_view);

COMMENT ON TABLE role_page_access IS 'Role → Page access mapping - replaces ROLE_PERMISSIONS';
COMMENT ON COLUMN role_page_access.role_name IS 'Role name from rbac_roles table';
COMMENT ON COLUMN role_page_access.can_view IS 'Can view/navigate to this page';
COMMENT ON COLUMN role_page_access.can_edit IS 'Can edit data on this page';

-- ============================================================================
-- 4. GET_MENU_FOR_ROLE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_menu_for_role(p_role_name VARCHAR)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(module_data ORDER BY module_data->>'sort_order')
  INTO result
  FROM (
    SELECT json_build_object(
      'id', m.id,
      'code', m.module_code,
      'name', m.display_name,
      'icon', m.icon,
      'baseRoute', m.base_route,
      'colorCode', m.color_code,
      'sortOrder', m.sort_order,
      'pages', (
        SELECT json_agg(
          json_build_object(
            'id', p.id,
            'code', p.page_code,
            'name', p.display_name,
            'route', p.route,
            'icon', p.icon,
            'sortOrder', p.sort_order,
            'canView', rpa.can_view,
            'canEdit', rpa.can_edit
          ) ORDER BY p.sort_order
        )
        FROM pages_master p
        INNER JOIN role_page_access rpa ON rpa.page_id = p.id
        WHERE p.module_id = m.id
          AND rpa.role_name = p_role_name
          AND rpa.can_view = TRUE
          AND p.is_active = TRUE
          AND p.show_in_sidebar = TRUE
      )
    ) AS module_data
    FROM modules_master m
    WHERE m.is_active = TRUE
      AND m.is_hidden = FALSE
      AND EXISTS (
        SELECT 1 FROM pages_master p2
        INNER JOIN role_page_access rpa2 ON rpa2.page_id = p2.id
        WHERE p2.module_id = m.id
          AND rpa2.role_name = p_role_name
          AND rpa2.can_view = TRUE
          AND p2.is_active = TRUE
          AND p2.show_in_sidebar = TRUE
      )
  ) subq;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_menu_for_role IS 'Returns JSON menu structure for a given role';

-- ============================================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS modules_master_updated_at ON modules_master;
CREATE TRIGGER modules_master_updated_at
  BEFORE UPDATE ON modules_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS pages_master_updated_at ON pages_master;
CREATE TRIGGER pages_master_updated_at
  BEFORE UPDATE ON pages_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- Next steps:
-- 1. Run: psql $DATABASE_URL < database/migrations/20260114_modules_pages_master.sql
-- 2. Run: node my-backend/scripts/seed-modules-pages.js
-- 3. Test: curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/modules/menu
-- ============================================================================
