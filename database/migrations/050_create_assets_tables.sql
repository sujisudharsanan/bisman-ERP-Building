-- ============================================================================
-- BISMAN ERP - Asset Management Tables
-- Migration: 050_create_assets_tables.sql
-- Description: Creates asset management tables with multi-tenant support,
--              audit logging, and approval workflow capabilities
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Asset Categories (Reference Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS asset_categories (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES asset_categories(id) ON DELETE SET NULL,
    icon VARCHAR(50) DEFAULT 'Package',
    color_code VARCHAR(20) DEFAULT '#6366f1',
    depreciation_rate DECIMAL(5, 2) DEFAULT 10.00,  -- Annual depreciation %
    useful_life_years INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users_enhanced(legacy_id),
    
    CONSTRAINT uq_asset_category_code_tenant UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_asset_categories_tenant ON asset_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_parent ON asset_categories(parent_id);

-- ============================================================================
-- 2. Assets (Main Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Basic Information
    asset_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES asset_categories(id) ON DELETE SET NULL,
    asset_type VARCHAR(100),
    serial_number VARCHAR(100),
    model_number VARCHAR(100),
    manufacturer VARCHAR(200),
    
    -- Financial Information
    purchase_date DATE,
    purchase_cost DECIMAL(15, 2),
    current_value DECIMAL(15, 2),
    salvage_value DECIMAL(15, 2) DEFAULT 0,
    depreciation_method VARCHAR(50) DEFAULT 'straight_line',
    warranty_expiry DATE,
    
    -- Vendor / Supplier
    vendor_id INTEGER,  -- References vendor table if exists
    vendor_name VARCHAR(200),
    vendor_contact VARCHAR(200),
    purchase_order_number VARCHAR(100),
    invoice_number VARCHAR(100),
    
    -- Location / Assignment
    location_id INTEGER,  -- References locations table if exists
    location_name VARCHAR(200),
    department VARCHAR(200),
    assigned_to_user_id INTEGER REFERENCES users_enhanced(legacy_id),
    assigned_to_name VARCHAR(200),
    assigned_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
        'draft', 'pending_approval', 'active', 'inactive', 
        'under_maintenance', 'retired', 'disposed', 'lost', 'sold'
    )),
    condition VARCHAR(50) DEFAULT 'good' CHECK (condition IN (
        'new', 'excellent', 'good', 'fair', 'poor', 'damaged'
    )),
    
    -- Approval Workflow
    requires_approval BOOLEAN DEFAULT false,
    approval_status VARCHAR(50) DEFAULT 'not_required' CHECK (approval_status IN (
        'not_required', 'pending', 'approved', 'rejected'
    )),
    approved_by INTEGER REFERENCES users_enhanced(legacy_id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users_enhanced(legacy_id),
    updated_by INTEGER REFERENCES users_enhanced(legacy_id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by INTEGER REFERENCES users_enhanced(legacy_id),
    
    CONSTRAINT uq_asset_code_tenant UNIQUE (tenant_id, asset_code)
);

CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);

-- ============================================================================
-- 3. Asset Files (Attachments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS asset_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN (
        'invoice', 'warranty', 'manual', 'image', 'certificate', 'insurance', 'general'
    )),
    description TEXT,
    
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by INTEGER REFERENCES users_enhanced(legacy_id),
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_asset_files_asset ON asset_files(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_files_tenant ON asset_files(tenant_id);

-- ============================================================================
-- 4. Asset History (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS asset_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'created', 'updated', 'deleted', 'restored',
        'assigned', 'unassigned', 'transferred',
        'status_changed', 'maintenance_started', 'maintenance_completed',
        'approved', 'rejected', 'disposed', 'sold'
    )),
    
    -- What changed
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changes_json JSONB,  -- Full change set for bulk updates
    
    -- Who and when
    performed_by INTEGER REFERENCES users_enhanced(legacy_id),
    performed_by_name VARCHAR(200),
    performed_by_role VARCHAR(100),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    ip_address VARCHAR(50),
    user_agent TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_asset_history_asset ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_tenant ON asset_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_action ON asset_history(action);
CREATE INDEX IF NOT EXISTS idx_asset_history_performed_at ON asset_history(performed_at);

-- ============================================================================
-- 5. Asset Assignments (Assignment History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    assigned_to_user_id INTEGER REFERENCES users_enhanced(legacy_id),
    assigned_to_name VARCHAR(200),
    assigned_to_department VARCHAR(200),
    
    assigned_by INTEGER REFERENCES users_enhanced(legacy_id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    returned_at TIMESTAMP WITH TIME ZONE,
    return_notes TEXT,
    return_condition VARCHAR(50),
    
    notes TEXT,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_user ON asset_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_active ON asset_assignments(is_active);

-- ============================================================================
-- 6. Asset Maintenance Records
-- ============================================================================
CREATE TABLE IF NOT EXISTS asset_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN (
        'preventive', 'corrective', 'predictive', 'emergency', 'inspection'
    )),
    
    scheduled_date DATE,
    completed_date DATE,
    
    description TEXT NOT NULL,
    work_performed TEXT,
    
    technician_name VARCHAR(200),
    vendor_name VARCHAR(200),
    
    parts_cost DECIMAL(15, 2) DEFAULT 0,
    labor_cost DECIMAL(15, 2) DEFAULT 0,
    total_cost DECIMAL(15, 2) DEFAULT 0,
    
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'in_progress', 'completed', 'cancelled'
    )),
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users_enhanced(legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_status ON asset_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_date ON asset_maintenance(scheduled_date);

-- ============================================================================
-- 7. Subscription Limit for Assets
-- Add asset limit to subscription plans
-- ============================================================================
ALTER TABLE subscription_plans 
    ADD COLUMN IF NOT EXISTS max_assets INTEGER DEFAULT 100;

-- ============================================================================
-- 8. Insert Default Asset Categories (Global Templates)
-- ============================================================================
-- Note: These are templates. Tenants will get copies on first use.
INSERT INTO asset_categories (tenant_id, code, name, description, depreciation_rate, useful_life_years, created_by)
SELECT 
    c.id,
    cat.code,
    cat.name,
    cat.description,
    cat.depreciation_rate,
    cat.useful_life_years,
    NULL
FROM clients c
CROSS JOIN (VALUES
    ('IT_EQUIPMENT', 'IT Equipment', 'Computers, servers, networking equipment', 33.33, 3),
    ('FURNITURE', 'Furniture', 'Office furniture, desks, chairs', 10.00, 10),
    ('VEHICLES', 'Vehicles', 'Company vehicles, trucks, cars', 15.00, 7),
    ('MACHINERY', 'Machinery', 'Production and manufacturing equipment', 10.00, 10),
    ('OFFICE_EQUIPMENT', 'Office Equipment', 'Printers, copiers, projectors', 20.00, 5),
    ('TOOLS', 'Tools', 'Hand tools and power tools', 20.00, 5),
    ('BUILDING', 'Building', 'Buildings and structures', 2.50, 40),
    ('LAND', 'Land', 'Land and property (no depreciation)', 0.00, 0),
    ('INTANGIBLE', 'Intangible Assets', 'Software, patents, licenses', 25.00, 4),
    ('OTHER', 'Other', 'Miscellaneous assets', 10.00, 10)
) AS cat(code, name, description, depreciation_rate, useful_life_years)
WHERE NOT EXISTS (
    SELECT 1 FROM asset_categories ac 
    WHERE ac.tenant_id = c.id AND ac.code = cat.code
);

-- ============================================================================
-- 9. Page Entry for Asset Add Form
-- ============================================================================
INSERT INTO pages_master (
    page_code, display_name, route, description, module_id, 
    icon, show_in_sidebar, status, sort_order
)
SELECT 
    'ASSETS_ADD',
    'Add Asset',
    '/assets/add',
    'Create new asset with full details',
    m.id,
    'PlusCircle',
    false,  -- Not in sidebar, accessed via button
    'active',
    10
FROM modules_master m
WHERE m.module_code = 'operations'
ON CONFLICT (page_code) DO NOTHING;

INSERT INTO pages_master (
    page_code, display_name, route, description, module_id, 
    icon, show_in_sidebar, status, sort_order
)
SELECT 
    'ASSETS_LIST',
    'Asset Register',
    '/assets',
    'View and manage all organizational assets',
    m.id,
    'Package',
    true,
    'active',
    5
FROM modules_master m
WHERE m.module_code = 'operations'
ON CONFLICT (page_code) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Asset tables migration completed successfully';
    RAISE NOTICE 'Tables created: assets, asset_categories, asset_files, asset_history, asset_assignments, asset_maintenance';
END $$;
