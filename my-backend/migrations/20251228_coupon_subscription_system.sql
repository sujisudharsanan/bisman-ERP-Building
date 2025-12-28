-- ============================================================================
-- BISMAN ERP - Coupon-Based Subscription Activation System
-- Created: 28 December 2025
-- Description: Complete coupon lifecycle management for subscription activation
-- ============================================================================

-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS subscription_coupons CASCADE;

-- Drop existing enum if it exists
DROP TYPE IF EXISTS coupon_status CASCADE;
DROP TYPE IF EXISTS tenant_restriction_type CASCADE;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Coupon status enum
CREATE TYPE coupon_status AS ENUM (
  'ACTIVE',      -- Available for redemption
  'EXPIRED',     -- Past validity date
  'REVOKED',     -- Manually revoked by SuperAdmin
  'EXHAUSTED'    -- Max activations reached
);

-- Tenant restriction type enum
CREATE TYPE tenant_restriction_type AS ENUM (
  'ANY',              -- Any tenant can use
  'ONLY_NEW_TENANTS', -- Only tenants without prior subscription
  'SPECIFIC_TENANT'   -- Specific tenant ID only
);

-- ============================================================================
-- SUBSCRIPTION COUPONS TABLE
-- ============================================================================

CREATE TABLE subscription_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Coupon code (unique, non-guessable)
  code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Plan binding (immutable after creation)
  plan_id INT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  plan_snapshot_json JSONB NOT NULL, -- Immutable snapshot of plan at creation time
  
  -- Duration (derived from plan at creation)
  duration_days INT NOT NULL DEFAULT 30,
  
  -- Validity rules
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  
  -- Usage constraints
  max_activations INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  
  -- Tenant restrictions
  tenant_restriction_type tenant_restriction_type NOT NULL DEFAULT 'ANY',
  restricted_tenant_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Status
  status coupon_status NOT NULL DEFAULT 'ACTIVE',
  
  -- Internal notes
  notes TEXT,
  sales_reference VARCHAR(255),
  invoice_reference VARCHAR(255), -- Future-proofing for payment integration
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users_enhanced(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by UUID REFERENCES users_enhanced(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  
  -- Constraints
  CONSTRAINT check_valid_dates CHECK (valid_until > valid_from),
  CONSTRAINT check_max_activations CHECK (max_activations >= 1),
  CONSTRAINT check_used_count CHECK (used_count >= 0 AND used_count <= max_activations)
);

-- Indexes for subscription_coupons
CREATE INDEX idx_subscription_coupons_code ON subscription_coupons(code);
CREATE INDEX idx_subscription_coupons_status ON subscription_coupons(status);
CREATE INDEX idx_subscription_coupons_plan ON subscription_coupons(plan_id);
CREATE INDEX idx_subscription_coupons_validity ON subscription_coupons(valid_from, valid_until);
CREATE INDEX idx_subscription_coupons_created_by ON subscription_coupons(created_by);
CREATE INDEX idx_subscription_coupons_created_at ON subscription_coupons(created_at DESC);

-- ============================================================================
-- COUPON REDEMPTIONS TABLE
-- ============================================================================

CREATE TABLE coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Coupon reference
  coupon_id UUID NOT NULL REFERENCES subscription_coupons(id) ON DELETE RESTRICT,
  
  -- Tenant that redeemed
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  
  -- User who performed the activation
  activated_by_user UUID NOT NULL REFERENCES users_enhanced(id) ON DELETE RESTRICT,
  
  -- Resulting subscription
  subscription_id INT REFERENCES client_subscriptions(id) ON DELETE SET NULL,
  
  -- Timestamps
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Subscription details (derived at redemption time)
  subscription_started_at TIMESTAMPTZ NOT NULL,
  subscription_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Snapshot of what was applied
  applied_plan_snapshot JSONB NOT NULL,
  
  -- Unique constraint: one coupon per tenant
  CONSTRAINT unique_coupon_tenant UNIQUE (coupon_id, tenant_id)
);

-- Indexes for coupon_redemptions
CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_tenant ON coupon_redemptions(tenant_id);
CREATE INDEX idx_coupon_redemptions_user ON coupon_redemptions(activated_by_user);
CREATE INDEX idx_coupon_redemptions_subscription ON coupon_redemptions(subscription_id);
CREATE INDEX idx_coupon_redemptions_activated_at ON coupon_redemptions(activated_at DESC);

-- ============================================================================
-- SUBSCRIPTION COUPON AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE subscription_coupon_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event type
  event_type VARCHAR(50) NOT NULL,
  -- Valid events: COUPON_CREATED, COUPON_REVOKED, COUPON_REDEEMED, 
  --               COUPON_EXPIRED, SUBSCRIPTION_ACTIVATED, SUBSCRIPTION_EXPIRED
  
  -- References
  coupon_id UUID REFERENCES subscription_coupons(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  subscription_id INT REFERENCES client_subscriptions(id) ON DELETE SET NULL,
  
  -- Actor
  actor_user_id UUID REFERENCES users_enhanced(id) ON DELETE SET NULL,
  actor_role VARCHAR(50),
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Payload (complete snapshot of relevant data)
  payload_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  notes TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_coupon_audit_event ON subscription_coupon_audit_logs(event_type);
CREATE INDEX idx_coupon_audit_coupon ON subscription_coupon_audit_logs(coupon_id);
CREATE INDEX idx_coupon_audit_tenant ON subscription_coupon_audit_logs(tenant_id);
CREATE INDEX idx_coupon_audit_actor ON subscription_coupon_audit_logs(actor_user_id);
CREATE INDEX idx_coupon_audit_created ON subscription_coupon_audit_logs(created_at DESC);

-- ============================================================================
-- ADD COUPON REFERENCE TO CLIENT_SUBSCRIPTIONS
-- ============================================================================

-- Add activation_source and coupon_id to client_subscriptions if not exists
DO $$
BEGIN
  -- Add activation_source column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_subscriptions' AND column_name = 'activation_source'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN activation_source VARCHAR(50) DEFAULT 'LEGACY';
  END IF;
  
  -- Add coupon_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_subscriptions' AND column_name = 'coupon_id'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN coupon_id UUID REFERENCES subscription_coupons(id) ON DELETE SET NULL;
  END IF;
  
  -- Add plan_snapshot_json column for immutable plan record
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_subscriptions' AND column_name = 'plan_snapshot_json'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN plan_snapshot_json JSONB;
  END IF;
  
  -- Add started_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_subscriptions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  
  -- Add expires_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_subscriptions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_coupon ON client_subscriptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_activation_source ON client_subscriptions(activation_source);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_expires_at ON client_subscriptions(expires_at);

-- ============================================================================
-- HELPER FUNCTION: Generate Coupon Code
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_coupon_code(
  plan_code VARCHAR(50),
  duration_days INT
) RETURNS VARCHAR(50) AS $$
DECLARE
  duration_label VARCHAR(10);
  random_part VARCHAR(8);
  result_code VARCHAR(50);
BEGIN
  -- Determine duration label
  CASE
    WHEN duration_days <= 30 THEN duration_label := '1M';
    WHEN duration_days <= 90 THEN duration_label := '3M';
    WHEN duration_days <= 180 THEN duration_label := '6M';
    WHEN duration_days <= 365 THEN duration_label := '1Y';
    ELSE duration_label := 'XY';
  END CASE;
  
  -- Generate random part (uppercase alphanumeric)
  SELECT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
  INTO random_part;
  
  -- Compose code: BIS-[PLAN]-[DURATION]-[RANDOM]
  result_code := 'BIS-' || upper(left(plan_code, 4)) || '-' || duration_label || '-' || random_part;
  
  RETURN result_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Coupon Derived Status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_coupon_derived_status(
  p_coupon_id UUID
) RETURNS VARCHAR(20) AS $$
DECLARE
  coupon_rec RECORD;
  redemption_exists BOOLEAN;
  subscription_rec RECORD;
BEGIN
  -- Get coupon record
  SELECT * INTO coupon_rec FROM subscription_coupons WHERE id = p_coupon_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if revoked
  IF coupon_rec.status = 'REVOKED' THEN
    RETURN 'REVOKED';
  END IF;
  
  -- Check if any redemption exists
  SELECT EXISTS(SELECT 1 FROM coupon_redemptions WHERE coupon_id = p_coupon_id) INTO redemption_exists;
  
  IF NOT redemption_exists THEN
    -- Not activated yet
    IF NOW() > coupon_rec.valid_until THEN
      RETURN 'EXPIRED';
    END IF;
    RETURN 'CREATED';
  END IF;
  
  -- Has been redeemed - check subscription status
  SELECT cs.* INTO subscription_rec 
  FROM coupon_redemptions cr
  JOIN client_subscriptions cs ON cr.subscription_id = cs.id
  WHERE cr.coupon_id = p_coupon_id
  LIMIT 1;
  
  IF FOUND THEN
    IF subscription_rec.expires_at IS NOT NULL AND NOW() > subscription_rec.expires_at THEN
      RETURN 'EXPIRED';
    END IF;
    RETURN 'ACTIVE';
  END IF;
  
  RETURN 'REDEEMED';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update coupon status on expiry
-- ============================================================================

CREATE OR REPLACE FUNCTION update_expired_coupons() RETURNS TRIGGER AS $$
BEGIN
  -- Update coupons that have passed their validity
  UPDATE subscription_coupons
  SET 
    status = 'EXPIRED',
    updated_at = NOW()
  WHERE 
    status = 'ACTIVE' 
    AND valid_until < NOW() 
    AND used_count = 0;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job or use application-level cron for this
-- For now, this can be called periodically

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE subscription_coupons IS 'Coupon authorization tokens for subscription activation';
COMMENT ON TABLE coupon_redemptions IS 'Record of coupon redemptions by tenants';
COMMENT ON TABLE subscription_coupon_audit_logs IS 'Immutable audit trail for all coupon/subscription events';
COMMENT ON COLUMN subscription_coupons.plan_snapshot_json IS 'Immutable JSON snapshot of plan at coupon creation time';
COMMENT ON COLUMN subscription_coupons.used_count IS 'Number of times this coupon has been successfully redeemed';
COMMENT ON COLUMN coupon_redemptions.applied_plan_snapshot IS 'Snapshot of plan that was applied at redemption time';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON subscription_coupons TO bisman_app;
GRANT SELECT, INSERT ON coupon_redemptions TO bisman_app;
GRANT SELECT, INSERT ON subscription_coupon_audit_logs TO bisman_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO bisman_app;

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'Coupon subscription system migration completed successfully' AS status;
