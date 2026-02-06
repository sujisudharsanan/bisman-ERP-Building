-- Migration: 052_billing_tables.sql
-- Description: Create billing profile, invoices, payments, and usage records tables
-- Required by: my-backend/routes/billing.js
-- Date: 2026-02-06

-- ============================================================================
-- BILLING PROFILES TABLE
-- Stores billing configuration and Stripe integration details per client
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_profiles (
    id SERIAL PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Plan & Status
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    
    -- Trial Information
    trial_start_date TIMESTAMPTZ,
    trial_end_date TIMESTAMPTZ,
    
    -- Billing Period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    next_billing_date TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Contact Information
    billing_name VARCHAR(255),
    billing_email VARCHAR(255),
    billing_address JSONB,
    tax_id VARCHAR(100),
    tax_id_type VARCHAR(50),
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    payment_method_id VARCHAR(255),
    
    -- Card Details (from Stripe)
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Balance
    balance DECIMAL(12, 2) DEFAULT 0,
    credit_balance DECIMAL(12, 2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT billing_profiles_client_id_unique UNIQUE (client_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_billing_profiles_client_id ON billing_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_stripe_customer_id ON billing_profiles(stripe_customer_id);

-- ============================================================================
-- INVOICES TABLE
-- Stores invoice records for billing
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_profile_id INTEGER NOT NULL REFERENCES billing_profiles(id) ON DELETE CASCADE,
    
    -- Invoice Details
    invoice_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, open, paid, void, uncollectible
    
    -- Dates
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Amounts
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax DECIMAL(12, 2) DEFAULT 0,
    discount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    amount_due DECIMAL(12, 2) DEFAULT 0,
    
    -- Content
    line_items JSONB DEFAULT '[]',
    description TEXT,
    notes TEXT,
    
    -- Stripe Integration
    stripe_invoice_id VARCHAR(255),
    stripe_pdf_url TEXT,
    stripe_hosted_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_billing_profile_id ON invoices(billing_profile_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);

-- ============================================================================
-- PAYMENTS TABLE
-- Stores payment records for invoices
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Payment Details
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, succeeded, failed
    
    -- Card Details
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    
    -- Failure Info
    failure_code VARCHAR(100),
    failure_message TEXT,
    
    -- Stripe Integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    -- Timestamps
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- USAGE RECORDS TABLE
-- Stores usage-based billing records
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_profile_id INTEGER NOT NULL REFERENCES billing_profiles(id) ON DELETE CASCADE,
    
    -- Usage Type
    usage_type VARCHAR(100) NOT NULL, -- api_calls, storage, active_users, etc.
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Quantities
    quantity DECIMAL(12, 2) DEFAULT 0,
    included_quantity DECIMAL(12, 2) DEFAULT 0,
    overage_quantity DECIMAL(12, 2) DEFAULT 0,
    
    -- Pricing
    unit_price DECIMAL(12, 4) DEFAULT 0,
    overage_price DECIMAL(12, 4) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    
    -- Stripe Integration
    stripe_usage_record_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_records_billing_profile_id ON usage_records(billing_profile_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_usage_type ON usage_records(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(period_start, period_end);

-- ============================================================================
-- ADD UPDATED_AT TRIGGER FUNCTION (if not exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD TRIGGERS FOR UPDATED_AT
-- ============================================================================
DROP TRIGGER IF EXISTS update_billing_profiles_updated_at ON billing_profiles;
CREATE TRIGGER update_billing_profiles_updated_at
    BEFORE UPDATE ON billing_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_records_updated_at ON usage_records;
CREATE TRIGGER update_usage_records_updated_at
    BEFORE UPDATE ON usage_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- These will be applied based on your DB user setup
-- GRANT SELECT, INSERT, UPDATE, DELETE ON billing_profiles TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON usage_records TO your_app_user;

COMMENT ON TABLE billing_profiles IS 'Billing configuration and Stripe integration per client';
COMMENT ON TABLE invoices IS 'Invoice records for billing';
COMMENT ON TABLE payments IS 'Payment records for invoices';
COMMENT ON TABLE usage_records IS 'Usage-based billing records';
