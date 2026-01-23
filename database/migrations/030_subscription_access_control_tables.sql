-- ============================================================================
-- Migration: 030_subscription_access_control_tables.sql
-- Purpose: Create tables for THREE-LAYER subscription access control
-- 
-- THREE-LAYER PERMISSION MODEL:
--   Layer 1: Subscription (plan_module_access) - Base entitlement
--   Layer 2: Enterprise Admin → Superadmin approval
--   Layer 3: Superadmin → Client Admin approval
--   
--   Effective Access = Intersection of all 3 layers
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADMIN PAGE ASSIGNMENTS TABLE
-- Tracks page approvals between admin levels
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_page_assignments (
  id                SERIAL PRIMARY KEY,
  
  -- WHO is granting
  assigner_id       INTEGER NOT NULL,
  assigner_type     VARCHAR(50) NOT NULL CHECK (assigner_type IN ('ENTERPRISE_ADMIN', 'SUPER_ADMIN')),
  
  -- WHO is receiving
  assignee_id       INTEGER NOT NULL,
  assignee_type     VARCHAR(50) NOT NULL CHECK (assignee_type IN ('SUPER_ADMIN', 'CLIENT_ADMIN', 'ADMIN', 'USER')),
  
  -- WHAT is being granted (page)
  page_id           INTEGER REFERENCES pages_master(id) ON DELETE CASCADE,
  page_key          VARCHAR(255) NOT NULL,
  
  -- For tenant-level assignments
  tenant_id         VARCHAR(100),
  
  -- Status and tracking
  is_active         BOOLEAN DEFAULT TRUE,
  granted_at        TIMESTAMPTZ DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ,
  
  -- Audit fields
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  notes             TEXT,
  
  -- Unique constraint: One assignment per assigner → assignee → page combination
  UNIQUE (assigner_id, assigner_type, assignee_id, page_key)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_page_assignments_assigner 
  ON admin_page_assignments(assigner_id, assigner_type);
  
CREATE INDEX IF NOT EXISTS idx_admin_page_assignments_assignee 
  ON admin_page_assignments(assignee_id, assignee_type);
  
CREATE INDEX IF NOT EXISTS idx_admin_page_assignments_page 
  ON admin_page_assignments(page_key);
  
CREATE INDEX IF NOT EXISTS idx_admin_page_assignments_active 
  ON admin_page_assignments(is_active) WHERE is_active = TRUE;
  
CREATE INDEX IF NOT EXISTS idx_admin_page_assignments_tenant 
  ON admin_page_assignments(tenant_id) WHERE tenant_id IS NOT NULL;


-- ============================================================================
-- 2. ADMIN ROLE ASSIGNMENTS FOR THREE-LAYER (if not exists)
-- Similar to page assignments but for roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_role_grants (
  id                SERIAL PRIMARY KEY,
  
  -- WHO is granting
  assigner_id       INTEGER NOT NULL,
  assigner_type     VARCHAR(50) NOT NULL CHECK (assigner_type IN ('ENTERPRISE_ADMIN', 'SUPER_ADMIN')),
  
  -- WHO is receiving
  assignee_id       INTEGER NOT NULL,
  assignee_type     VARCHAR(50) NOT NULL CHECK (assignee_type IN ('SUPER_ADMIN', 'CLIENT_ADMIN', 'ADMIN', 'USER')),
  
  -- WHAT role is being granted
  role_id           INTEGER REFERENCES rbac_roles(id) ON DELETE CASCADE,
  role_name         VARCHAR(100) NOT NULL,
  
  -- For tenant-level grants
  tenant_id         VARCHAR(100),
  
  -- Status
  is_active         BOOLEAN DEFAULT TRUE,
  granted_at        TIMESTAMPTZ DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ,
  
  -- Audit
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  notes             TEXT,
  
  UNIQUE (assigner_id, assigner_type, assignee_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_admin_role_grants_assigner 
  ON admin_role_grants(assigner_id, assigner_type);
  
CREATE INDEX IF NOT EXISTS idx_admin_role_grants_assignee 
  ON admin_role_grants(assignee_id, assignee_type);
  
CREATE INDEX IF NOT EXISTS idx_admin_role_grants_active 
  ON admin_role_grants(is_active) WHERE is_active = TRUE;


-- ============================================================================
-- 3. SUBSCRIPTION ACCESS AUDIT LOG
-- Tracks all approval changes for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_access_audit_log (
  id                SERIAL PRIMARY KEY,
  
  -- Action details
  action            VARCHAR(50) NOT NULL CHECK (action IN (
    'PAGE_GRANTED', 
    'PAGE_REVOKED', 
    'ROLE_GRANTED', 
    'ROLE_REVOKED',
    'BULK_GRANT',
    'BULK_REVOKE',
    'SUBSCRIPTION_ACTIVATED',
    'SUBSCRIPTION_CHANGED'
  )),
  
  -- WHO performed
  actor_id          INTEGER NOT NULL,
  actor_type        VARCHAR(50) NOT NULL,
  actor_email       VARCHAR(255),
  
  -- WHO was affected
  target_id         INTEGER,
  target_type       VARCHAR(50),
  target_email      VARCHAR(255),
  
  -- WHAT was affected
  resource_type     VARCHAR(50) NOT NULL CHECK (resource_type IN ('PAGE', 'ROLE', 'SUBSCRIPTION')),
  resource_id       VARCHAR(255),
  resource_name     VARCHAR(255),
  
  -- Context
  tenant_id         VARCHAR(100),
  plan_id           INTEGER,
  
  -- Old and new state for auditing
  old_state         JSONB,
  new_state         JSONB,
  
  -- Metadata
  ip_address        INET,
  user_agent        TEXT,
  request_id        VARCHAR(100),
  
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_subscription_audit_created 
  ON subscription_access_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_actor 
  ON subscription_access_audit_log(actor_id, actor_type);
  
CREATE INDEX IF NOT EXISTS idx_subscription_audit_target 
  ON subscription_access_audit_log(target_id, target_type);
  
CREATE INDEX IF NOT EXISTS idx_subscription_audit_tenant 
  ON subscription_access_audit_log(tenant_id);
  
CREATE INDEX IF NOT EXISTS idx_subscription_audit_action 
  ON subscription_access_audit_log(action);


-- ============================================================================
-- 4. SUBSCRIPTION PAGE GRANT CACHE (Optional - for performance)
-- Pre-computed effective access for fast lookups
-- ============================================================================

CREATE TABLE IF NOT EXISTS effective_access_cache (
  id                SERIAL PRIMARY KEY,
  
  user_id           INTEGER NOT NULL,
  tenant_id         VARCHAR(100) NOT NULL,
  plan_id           INTEGER,
  
  -- Cached effective pages (as array for fast lookup)
  effective_pages   TEXT[] DEFAULT '{}',
  effective_roles   TEXT[] DEFAULT '{}',
  
  -- Cache metadata
  computed_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  is_valid          BOOLEAN DEFAULT TRUE,
  
  -- What layers were used
  layer1_count      INTEGER DEFAULT 0,  -- Subscription pages
  layer2_count      INTEGER DEFAULT 0,  -- Enterprise approved
  layer3_count      INTEGER DEFAULT 0,  -- Superadmin approved
  
  UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_effective_cache_user 
  ON effective_access_cache(user_id);
  
CREATE INDEX IF NOT EXISTS idx_effective_cache_tenant 
  ON effective_access_cache(tenant_id);
  
CREATE INDEX IF NOT EXISTS idx_effective_cache_valid 
  ON effective_access_cache(is_valid, expires_at);


-- ============================================================================
-- 5. TRIGGER: Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscription_access_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_page_assignments_updated ON admin_page_assignments;
CREATE TRIGGER trg_admin_page_assignments_updated
  BEFORE UPDATE ON admin_page_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_access_timestamp();

DROP TRIGGER IF EXISTS trg_admin_role_grants_updated ON admin_role_grants;
CREATE TRIGGER trg_admin_role_grants_updated
  BEFORE UPDATE ON admin_role_grants
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_access_timestamp();


-- ============================================================================
-- 6. FUNCTION: Invalidate cache when approvals change
-- ============================================================================

CREATE OR REPLACE FUNCTION invalidate_effective_access_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- When a page/role assignment changes, invalidate affected caches
  UPDATE effective_access_cache 
  SET is_valid = FALSE
  WHERE user_id = COALESCE(NEW.assignee_id, OLD.assignee_id)
     OR tenant_id IN (
       SELECT id FROM clients WHERE super_admin_id = COALESCE(NEW.assignee_id, OLD.assignee_id)
     );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invalidate_cache_on_page_change ON admin_page_assignments;
CREATE TRIGGER trg_invalidate_cache_on_page_change
  AFTER INSERT OR UPDATE OR DELETE ON admin_page_assignments
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_effective_access_cache();


COMMIT;

-- ============================================================================
-- POST-MIGRATION: Grant access to application user
-- ============================================================================
-- Run this if using a separate app user:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON admin_page_assignments TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON admin_role_grants TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_access_audit_log TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON effective_access_cache TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE admin_page_assignments_id_seq TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE admin_role_grants_id_seq TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE subscription_access_audit_log_id_seq TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE effective_access_cache_id_seq TO app_user;
