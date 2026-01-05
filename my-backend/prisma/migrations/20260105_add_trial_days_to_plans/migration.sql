-- Add trial_days column to subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 14;
