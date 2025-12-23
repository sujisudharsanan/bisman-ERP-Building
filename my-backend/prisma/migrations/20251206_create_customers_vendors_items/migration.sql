-- =============================================================================
-- Migration: Create Customers and Vendors Tables
-- Date: 2024-12-06
-- Description: Master data tables for customers and vendors with Indian compliance
-- =============================================================================

-- =============================================================================
-- CUSTOMERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Basic Information
    code VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    customer_type VARCHAR(20) NOT NULL DEFAULT 'business'
        CHECK (customer_type IN ('individual', 'business', 'government', 'ngo')),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    
    -- Tax Information (Indian Compliance)
    gstin VARCHAR(15) CHECK (gstin IS NULL OR gstin ~ '^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),
    pan VARCHAR(10) CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
    
    -- Credit Terms
    credit_limit DECIMAL(15, 2) DEFAULT 0 CHECK (credit_limit >= 0 AND credit_limit <= 100000000),
    credit_days INTEGER DEFAULT 0 CHECK (credit_days >= 0 AND credit_days <= 365),
    credit_utilized DECIMAL(15, 2) DEFAULT 0 CHECK (credit_utilized >= 0),
    
    -- Billing Address (embedded JSON for flexibility)
    billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Structure: { line1, line2, city, state, pinCode, country }
    
    -- Shipping Address
    shipping_address JSONB DEFAULT '{}'::jsonb,
    same_as_shipping BOOLEAN DEFAULT true,
    
    -- Additional
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'pending')),
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER ,
    updated_by INTEGER ,
    
    -- Constraints
    CONSTRAINT uk_customers_tenant_code UNIQUE (tenant_id, code),
    CONSTRAINT uk_customers_tenant_gstin UNIQUE (tenant_id, gstin),
    CONSTRAINT chk_customers_credit_utilized CHECK (credit_utilized <= credit_limit OR credit_limit = 0)
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin) WHERE gstin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(tenant_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(tenant_id, created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers 
    USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(code, '') || ' ' || coalesce(email, '')));

-- =============================================================================
-- VENDORS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Basic Information
    code VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    vendor_type VARCHAR(30) NOT NULL DEFAULT 'distributor'
        CHECK (vendor_type IN ('manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider')),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    website VARCHAR(255),
    contact_person VARCHAR(100),
    
    -- Tax Information (Indian Compliance)
    gstin VARCHAR(15) CHECK (gstin IS NULL OR gstin ~ '^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),
    pan VARCHAR(10) CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
    tan VARCHAR(10) CHECK (tan IS NULL OR tan ~ '^[A-Z]{4}[0-9]{5}[A-Z]$'),
    
    -- MSME
    is_msme BOOLEAN DEFAULT false,
    msme_number VARCHAR(30),
    
    -- Payment Terms
    payment_terms VARCHAR(20) DEFAULT 'net_30'
        CHECK (payment_terms IN ('immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'custom')),
    credit_days INTEGER DEFAULT 30 CHECK (credit_days >= 0 AND credit_days <= 365),
    
    -- Bank Details (encrypted sensitive fields should be handled at app level)
    bank_details JSONB DEFAULT '{}'::jsonb,
    -- Structure: { accountHolderName, bankName, accountNumber, ifscCode, branchName }
    
    -- Billing Address
    billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Shipping Address
    shipping_address JSONB DEFAULT '{}'::jsonb,
    
    -- TDS
    tds_applicable BOOLEAN DEFAULT false,
    tds_section VARCHAR(20),
    tds_rate DECIMAL(5, 2) DEFAULT 0 CHECK (tds_rate >= 0 AND tds_rate <= 100),
    
    -- Additional
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'pending')),
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER ,
    updated_by INTEGER ,
    
    -- Constraints
    CONSTRAINT uk_vendors_tenant_code UNIQUE (tenant_id, code),
    CONSTRAINT uk_vendors_tenant_gstin UNIQUE (tenant_id, gstin)
);

-- Indexes for vendors
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_vendors_gstin ON vendors(gstin) WHERE gstin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_phone ON vendors(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(tenant_id, vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_msme ON vendors(tenant_id, is_msme) WHERE is_msme = true;
CREATE INDEX IF NOT EXISTS idx_vendors_created ON vendors(tenant_id, created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_vendors_search ON vendors 
    USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(code, '') || ' ' || coalesce(email, '')));

-- =============================================================================
-- ITEMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Basic Information
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    barcode VARCHAR(50),
    item_type VARCHAR(20) NOT NULL DEFAULT 'goods'
        CHECK (item_type IN ('goods', 'service', 'raw_material', 'finished_goods', 'consumable', 'asset')),
    
    -- Category
    category_id INTEGER,
    subcategory_id INTEGER,
    brand_id INTEGER,
    
    -- Tax Classification (Indian)
    hsn_code VARCHAR(8) CHECK (hsn_code IS NULL OR hsn_code ~ '^[0-9]{4,8}$'),
    sac_code VARCHAR(6) CHECK (sac_code IS NULL OR sac_code ~ '^[0-9]{6}$'),
    gst_rate DECIMAL(5, 2) DEFAULT 18 CHECK (gst_rate >= 0 AND gst_rate <= 100),
    is_tax_exempt BOOLEAN DEFAULT false,
    
    -- Pricing
    purchase_price DECIMAL(15, 2) DEFAULT 0 CHECK (purchase_price >= 0),
    selling_price DECIMAL(15, 2) DEFAULT 0 CHECK (selling_price >= 0),
    mrp DECIMAL(15, 2) CHECK (mrp IS NULL OR mrp >= 0),
    min_selling_price DECIMAL(15, 2) CHECK (min_selling_price IS NULL OR min_selling_price >= 0),
    pricing_tiers JSONB DEFAULT '[]'::jsonb,
    
    -- Inventory
    uom VARCHAR(10) DEFAULT 'NOS' 
        CHECK (uom IN ('NOS', 'PCS', 'KGS', 'GMS', 'LTR', 'ML', 'MTR', 'CM', 'MM', 'SQM', 'SQFT', 'CBM', 'BOX', 'CTN', 'SET', 'PAC', 'ROL', 'BAG', 'OTH')),
    track_inventory BOOLEAN DEFAULT true,
    inventory_method VARCHAR(20) DEFAULT 'fifo'
        CHECK (inventory_method IN ('fifo', 'lifo', 'weighted_average', 'specific')),
    reorder_level DECIMAL(15, 3) DEFAULT 0 CHECK (reorder_level >= 0),
    reorder_qty DECIMAL(15, 3) DEFAULT 0 CHECK (reorder_qty >= 0),
    min_stock_level DECIMAL(15, 3) DEFAULT 0 CHECK (min_stock_level >= 0),
    max_stock_level DECIMAL(15, 3) CHECK (max_stock_level IS NULL OR max_stock_level >= 0),
    opening_stock DECIMAL(15, 3) DEFAULT 0 CHECK (opening_stock >= 0),
    current_stock DECIMAL(15, 3) DEFAULT 0,
    
    -- Dimensions
    weight DECIMAL(10, 3) CHECK (weight IS NULL OR weight >= 0),
    weight_unit VARCHAR(5) DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'g', 'lb', 'oz')),
    length DECIMAL(10, 2) CHECK (length IS NULL OR length >= 0),
    width DECIMAL(10, 2) CHECK (width IS NULL OR width >= 0),
    height DECIMAL(10, 2) CHECK (height IS NULL OR height >= 0),
    dimension_unit VARCHAR(5) DEFAULT 'cm' CHECK (dimension_unit IN ('cm', 'mm', 'in', 'm')),
    
    -- Description
    short_description VARCHAR(255),
    long_description TEXT,
    
    -- Media
    image_url VARCHAR(500),
    images TEXT[] DEFAULT '{}',
    
    -- Additional
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    is_active BOOLEAN DEFAULT true,
    is_sellable BOOLEAN DEFAULT true,
    is_purchasable BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER ,
    updated_by INTEGER ,
    
    -- Constraints
    CONSTRAINT uk_items_tenant_sku UNIQUE (tenant_id, sku),
    CONSTRAINT uk_items_tenant_barcode UNIQUE (tenant_id, barcode),
    CONSTRAINT chk_items_mrp_selling CHECK (mrp IS NULL OR mrp >= selling_price),
    CONSTRAINT chk_items_min_selling CHECK (min_selling_price IS NULL OR min_selling_price <= selling_price)
);

-- Indexes for items
CREATE INDEX IF NOT EXISTS idx_items_tenant ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_name ON items(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(tenant_id, item_type);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(tenant_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_hsn ON items(hsn_code) WHERE hsn_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_status ON items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_items_reorder ON items(tenant_id) WHERE current_stock <= reorder_level AND track_inventory = true;
CREATE INDEX IF NOT EXISTS idx_items_created ON items(tenant_id, created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_items_search ON items 
    USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(sku, '') || ' ' || coalesce(short_description, '')));

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_items_updated_at ON items;
CREATE TRIGGER trg_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) FOR MULTI-TENANCY
-- =============================================================================

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (assuming app sets current_setting('app.current_tenant'))
-- Note: These require the application to SET app.current_tenant before queries

-- Customers RLS
DROP POLICY IF EXISTS customers_tenant_isolation ON customers;
CREATE POLICY customers_tenant_isolation ON customers
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Vendors RLS
DROP POLICY IF EXISTS vendors_tenant_isolation ON vendors;
CREATE POLICY vendors_tenant_isolation ON vendors
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Items RLS
DROP POLICY IF EXISTS items_tenant_isolation ON items;
CREATE POLICY items_tenant_isolation ON items
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =============================================================================
-- AUDIT LOG TRIGGER (Optional - log changes)
-- =============================================================================

CREATE OR REPLACE FUNCTION log_entity_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            created_at
        ) VALUES (
            NULLIF(current_setting('app.current_user', true), '')::integer,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            v_old_data,
            v_new_data,
            NOW()
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            created_at
        ) VALUES (
            NULLIF(current_setting('app.current_user', true), '')::integer,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            v_old_data,
            NOW()
        );
        
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            new_values,
            created_at
        ) VALUES (
            NULLIF(current_setting('app.current_user', true), '')::integer,
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            v_new_data,
            NOW()
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers (optional, enable if needed)
-- DROP TRIGGER IF EXISTS trg_customers_audit ON customers;
-- CREATE TRIGGER trg_customers_audit
--     AFTER INSERT OR UPDATE OR DELETE ON customers
--     FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

-- DROP TRIGGER IF EXISTS trg_vendors_audit ON vendors;
-- CREATE TRIGGER trg_vendors_audit
--     AFTER INSERT OR UPDATE OR DELETE ON vendors
--     FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

-- DROP TRIGGER IF EXISTS trg_items_audit ON items;
-- CREATE TRIGGER trg_items_audit
--     AFTER INSERT OR UPDATE OR DELETE ON items
--     FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE customers IS 'Customer master data with Indian compliance (GSTIN, PAN, credit terms)';
COMMENT ON TABLE vendors IS 'Vendor/Supplier master data with Indian compliance (GSTIN, PAN, TAN, MSME, TDS)';
COMMENT ON TABLE items IS 'Item/Product master data with Indian tax codes (HSN/SAC) and inventory tracking';

COMMENT ON COLUMN customers.gstin IS '15-character GST Identification Number';
COMMENT ON COLUMN customers.pan IS '10-character Permanent Account Number';
COMMENT ON COLUMN customers.credit_limit IS 'Maximum credit allowed in INR (0 = no limit)';
COMMENT ON COLUMN customers.credit_utilized IS 'Current outstanding credit amount';
COMMENT ON COLUMN customers.billing_address IS 'JSON: { line1, line2, city, state, pinCode, country }';

COMMENT ON COLUMN vendors.tan IS '10-character Tax Deduction Account Number';
COMMENT ON COLUMN vendors.is_msme IS 'Whether vendor is registered under MSME Act';
COMMENT ON COLUMN vendors.tds_applicable IS 'Whether TDS should be deducted on payments';

COMMENT ON COLUMN items.hsn_code IS 'Harmonized System of Nomenclature code (4-8 digits) for goods';
COMMENT ON COLUMN items.sac_code IS 'Service Accounting Code (6 digits) for services';
COMMENT ON COLUMN items.gst_rate IS 'GST rate percentage (0, 0.25, 3, 5, 12, 18, 28)';
COMMENT ON COLUMN items.inventory_method IS 'Costing method: fifo, lifo, weighted_average, specific';
