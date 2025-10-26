-- Migration: Multi-Business Modular Permission System
-- Version: 1.0
-- Date: 2025-10-25

-- =====================================================
-- 1. BUSINESS TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS business_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_business_types_slug ON business_types(slug);
CREATE INDEX idx_business_types_active ON business_types(is_active);

-- =====================================================
-- 2. MODULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  route_path VARCHAR(200),
  component_path VARCHAR(200),
  parent_module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_permission BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_modules_slug ON modules(slug);
CREATE INDEX idx_modules_category ON modules(category);
CREATE INDEX idx_modules_parent ON modules(parent_module_id);
CREATE INDEX idx_modules_active ON modules(is_active);

-- =====================================================
-- 3. BUSINESS TYPE MODULES (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS business_type_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_id UUID NOT NULL REFERENCES business_types(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_type_id, module_id)
);

CREATE INDEX idx_btm_business_type ON business_type_modules(business_type_id);
CREATE INDEX idx_btm_module ON business_type_modules(module_id);

-- =====================================================
-- 4. SUPER ADMINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_type_id UUID NOT NULL REFERENCES business_types(id),
  business_name VARCHAR(200) NOT NULL,
  business_slug VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  logo_url TEXT,
  website VARCHAR(255),
  gst_number VARCHAR(15),
  pan_number VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_plan VARCHAR(50),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  max_users INTEGER DEFAULT 10,
  max_storage_gb INTEGER DEFAULT 5,
  custom_domain VARCHAR(255),
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_super_admins_user ON super_admins(user_id);
CREATE INDEX idx_super_admins_business_type ON super_admins(business_type_id);
CREATE INDEX idx_super_admins_slug ON super_admins(business_slug);
CREATE INDEX idx_super_admins_active ON super_admins(is_active);
CREATE INDEX idx_super_admins_subscription ON super_admins(subscription_status);

-- =====================================================
-- 5. SUPER ADMIN MODULES (Custom Assignments)
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admin_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT true,
  can_read BOOLEAN DEFAULT true,
  can_update BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  can_import BOOLEAN DEFAULT false,
  custom_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(super_admin_id, module_id)
);

CREATE INDEX idx_sam_super_admin ON super_admin_modules(super_admin_id);
CREATE INDEX idx_sam_module ON super_admin_modules(module_id);
CREATE INDEX idx_sam_enabled ON super_admin_modules(is_enabled);

-- =====================================================
-- 6. ACTIVITY LOG (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS module_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  super_admin_id UUID REFERENCES super_admins(id),
  module_id UUID REFERENCES modules(id),
  action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'assign', 'revoke'
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON module_activity_log(user_id);
CREATE INDEX idx_activity_super_admin ON module_activity_log(super_admin_id);
CREATE INDEX idx_activity_module ON module_activity_log(module_id);
CREATE INDEX idx_activity_created_at ON module_activity_log(created_at DESC);

-- =====================================================
-- 7. UPDATE USERS TABLE (Add Enterprise Admin Role)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role_enum'
  ) THEN
    CREATE TYPE user_role_enum AS ENUM (
      'ENTERPRISE_ADMIN',
      'SUPER_ADMIN',
      'ADMIN',
      'MANAGER',
      'STAFF',
      'HUB_INCHARGE',
      'VIEWER'
    );
  ELSE
    -- Add ENTERPRISE_ADMIN if it doesn't exist
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'ENTERPRISE_ADMIN';
  END IF;
END $$;

-- Add business context to users if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS super_admin_id UUID REFERENCES super_admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(super_admin_id);

-- =====================================================
-- 8. SEED DATA
-- =====================================================

-- Insert Business Types
INSERT INTO business_types (name, slug, description, icon) VALUES
  ('Petrol Pump', 'petrol-pump', 'Fuel station and retail management system', 'fuel'),
  ('Logistics', 'logistics', 'Transportation and fleet management system', 'truck'),
  ('Restaurant', 'restaurant', 'Food service and kitchen management', 'utensils'),
  ('Retail Store', 'retail-store', 'Point of sale and inventory management', 'shopping-bag'),
  ('Manufacturing', 'manufacturing', 'Production and supply chain management', 'tool')
ON CONFLICT (slug) DO NOTHING;

-- Insert Core Modules (Common to all businesses)
INSERT INTO modules (name, slug, category, route_path, icon, sort_order, description) VALUES
  ('Dashboard', 'dashboard', 'core', '/dashboard', 'home', 1, 'Main dashboard with analytics'),
  ('Users', 'users', 'core', '/users', 'users', 2, 'User management'),
  ('Settings', 'settings', 'core', '/settings', 'settings', 3, 'System settings'),
  ('Profile', 'profile', 'core', '/profile', 'user', 4, 'User profile management'),
  ('Reports', 'reports', 'core', '/reports', 'bar-chart', 5, 'Business reports')
ON CONFLICT (slug) DO NOTHING;

-- Insert Petrol Pump Modules
INSERT INTO modules (name, slug, category, route_path, icon, sort_order, description) VALUES
  ('Fuel Sales', 'fuel-sales', 'sales', '/fuel-sales', 'droplet', 10, 'Daily fuel sales tracking'),
  ('Pump Operations', 'pump-operations', 'operations', '/pump-operations', 'activity', 11, 'Pump nozzle operations'),
  ('Tank Inventory', 'tank-inventory', 'inventory', '/tank-inventory', 'database', 12, 'Fuel tank level monitoring'),
  ('Daily Reports', 'daily-reports', 'reports', '/daily-reports', 'file-text', 13, 'End-of-day reports'),
  ('Fuel Purchase', 'fuel-purchase', 'purchase', '/fuel-purchase', 'shopping-cart', 14, 'Fuel procurement'),
  ('Meter Reading', 'meter-reading', 'operations', '/meter-reading', 'trending-up', 15, 'Pump meter readings')
ON CONFLICT (slug) DO NOTHING;

-- Insert Logistics Modules
INSERT INTO modules (name, slug, category, route_path, icon, sort_order, description) VALUES
  ('Shipments', 'shipments', 'operations', '/shipments', 'package', 20, 'Shipment tracking'),
  ('Fleet Management', 'fleet', 'operations', '/fleet', 'truck', 21, 'Vehicle fleet management'),
  ('Routes', 'routes', 'operations', '/routes', 'map', 22, 'Route planning'),
  ('Drivers', 'drivers', 'hr', '/drivers', 'user-check', 23, 'Driver management'),
  ('Fuel Tracking', 'fuel-tracking', 'operations', '/fuel-tracking', 'fuel', 24, 'Vehicle fuel consumption'),
  ('Maintenance', 'maintenance', 'operations', '/maintenance', 'tool', 25, 'Vehicle maintenance'),
  ('Delivery Proof', 'delivery-proof', 'operations', '/delivery-proof', 'check-circle', 26, 'POD management')
ON CONFLICT (slug) DO NOTHING;

-- Insert Shared Finance Modules
INSERT INTO modules (name, slug, category, route_path, icon, sort_order, description) VALUES
  ('Payments', 'payments', 'finance', '/payments', 'credit-card', 30, 'Payment processing'),
  ('Non-Privileged Users', 'non-privileged-users', 'finance', '/payments/non-privileged-users', 'user-plus', 31, 'Vendor/Creditor management'),
  ('Invoices', 'invoices', 'finance', '/invoices', 'file-text', 32, 'Invoice generation'),
  ('Expenses', 'expenses', 'finance', '/expenses', 'dollar-sign', 33, 'Expense tracking'),
  ('Bank Accounts', 'bank-accounts', 'finance', '/bank-accounts', 'briefcase', 34, 'Bank account management')
ON CONFLICT (slug) DO NOTHING;

-- Map modules to Petrol Pump business type
INSERT INTO business_type_modules (business_type_id, module_id, is_default)
SELECT 
  (SELECT id FROM business_types WHERE slug = 'petrol-pump'),
  id,
  true
FROM modules 
WHERE slug IN (
  'dashboard', 'users', 'settings', 'profile', 'reports',
  'fuel-sales', 'pump-operations', 'tank-inventory', 'daily-reports', 'fuel-purchase', 'meter-reading',
  'payments', 'non-privileged-users', 'invoices', 'expenses', 'bank-accounts'
)
ON CONFLICT (business_type_id, module_id) DO NOTHING;

-- Map modules to Logistics business type
INSERT INTO business_type_modules (business_type_id, module_id, is_default)
SELECT 
  (SELECT id FROM business_types WHERE slug = 'logistics'),
  id,
  true
FROM modules 
WHERE slug IN (
  'dashboard', 'users', 'settings', 'profile', 'reports',
  'shipments', 'fleet', 'routes', 'drivers', 'fuel-tracking', 'maintenance', 'delivery-proof',
  'payments', 'non-privileged-users', 'invoices', 'expenses', 'bank-accounts'
)
ON CONFLICT (business_type_id, module_id) DO NOTHING;

-- =====================================================
-- 9. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to auto-assign default modules when Super Admin is created
CREATE OR REPLACE FUNCTION assign_default_modules_to_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO super_admin_modules (super_admin_id, module_id, is_enabled, can_create, can_read, can_update, can_delete)
  SELECT 
    NEW.id,
    btm.module_id,
    true,
    true,
    true,
    true,
    true
  FROM business_type_modules btm
  WHERE btm.business_type_id = NEW.business_type_id
    AND btm.is_default = true
  ON CONFLICT (super_admin_id, module_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign modules
CREATE TRIGGER trigger_assign_default_modules
AFTER INSERT ON super_admins
FOR EACH ROW
EXECUTE FUNCTION assign_default_modules_to_super_admin();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER update_business_types_updated_at BEFORE UPDATE ON business_types
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_super_admins_updated_at BEFORE UPDATE ON super_admins
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_super_admin_modules_updated_at BEFORE UPDATE ON super_admin_modules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Super Admin with modules count
CREATE OR REPLACE VIEW v_super_admin_summary AS
SELECT 
  sa.id,
  sa.business_name,
  sa.business_slug,
  sa.email,
  sa.is_active,
  sa.subscription_status,
  bt.name as business_type_name,
  bt.slug as business_type_slug,
  u.email as admin_email,
  u.name as admin_name,
  COUNT(sam.id) as total_modules,
  COUNT(CASE WHEN sam.is_enabled THEN 1 END) as enabled_modules,
  sa.created_at
FROM super_admins sa
JOIN business_types bt ON sa.business_type_id = bt.id
JOIN users u ON sa.user_id = u.id
LEFT JOIN super_admin_modules sam ON sa.id = sam.super_admin_id
GROUP BY sa.id, bt.name, bt.slug, u.email, u.name;

-- View: Module usage statistics
CREATE OR REPLACE VIEW v_module_usage_stats AS
SELECT 
  m.id,
  m.name,
  m.slug,
  m.category,
  COUNT(DISTINCT sam.super_admin_id) as total_super_admins_using,
  COUNT(CASE WHEN sam.is_enabled THEN 1 END) as enabled_count,
  COUNT(DISTINCT btm.business_type_id) as business_types_count
FROM modules m
LEFT JOIN super_admin_modules sam ON m.id = sam.module_id
LEFT JOIN business_type_modules btm ON m.id = btm.module_id
GROUP BY m.id, m.name, m.slug, m.category;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE business_types IS 'Different types of businesses (Petrol Pump, Logistics, etc.)';
COMMENT ON TABLE modules IS 'All available modules/features in the system';
COMMENT ON TABLE business_type_modules IS 'Mapping of which modules belong to which business types';
COMMENT ON TABLE super_admins IS 'Super Admin instances for each business';
COMMENT ON TABLE super_admin_modules IS 'Custom module assignments per Super Admin';
COMMENT ON TABLE module_activity_log IS 'Audit trail for module access and changes';
