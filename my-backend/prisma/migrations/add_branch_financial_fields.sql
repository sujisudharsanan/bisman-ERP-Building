-- Migration: Add financial and agreement fields to branches table
-- Date: 2026-01-01

-- Add district column
ALTER TABLE branches ADD COLUMN IF NOT EXISTS district VARCHAR(100);

-- Add building & property details
ALTER TABLE branches ADD COLUMN IF NOT EXISTS building_type VARCHAR(50) DEFAULT 'owned';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS area_square_feet DECIMAL(12, 2);

-- Add agreement & lease details
ALTER TABLE branches ADD COLUMN IF NOT EXISTS agreement_type VARCHAR(50);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS agreement_start_date DATE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS agreement_end_date DATE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS monthly_rent DECIMAL(12, 2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(12, 2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(12, 2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS rent_escalation_percent DECIMAL(5, 2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS notice_period_days INTEGER;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS agreement_reminder_days INTEGER;

-- Add owner/landlord details (for rented/leased)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS pan_holder_name VARCHAR(255);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20);

-- Add index on agreement_end_date for expiry queries
CREATE INDEX IF NOT EXISTS idx_branches_agreement_end_date ON branches(agreement_end_date);
