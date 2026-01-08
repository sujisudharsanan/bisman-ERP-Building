-- Add pricing and limit columns to master_subscription_plans if they don't exist
-- These columns are needed for the Super Admin subscription control page

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(12, 2) DEFAULT 0;

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(12, 2) DEFAULT 0;

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1;

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER DEFAULT 5;

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN DEFAULT true;

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 14;

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS trial_features_limited BOOLEAN DEFAULT false;

ALTER TABLE master_subscription_plans 
ADD COLUMN IF NOT EXISTS require_payment_method BOOLEAN DEFAULT false;

-- Create index on price columns for billing queries
CREATE INDEX IF NOT EXISTS idx_master_plans_pricing ON master_subscription_plans(price_monthly, price_yearly);
