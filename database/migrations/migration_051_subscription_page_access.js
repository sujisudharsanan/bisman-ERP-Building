 
/**
 * ============================================================================
 * MIGRATION 051: Subscription-Aware Page Access Control
 * ============================================================================
 * 
 * Implements the THREE LAYER ACCESS MODEL:
 * 
 * Layer 1 (APPROVAL) - Controls page VISIBILITY
 *   → admin_page_assignments, role_page_access
 * 
 * Layer 2 (SUBSCRIPTION) - Controls page ACTIONS (edit/export/download)
 *   → subscription_page_features (NEW)
 * 
 * Layer 3 (DATA SCOPE) - Controls what DATA user can see
 *   → RLS policies (already implemented)
 * 
 * BEHAVIOR MATRIX:
 * | Approval | Subscription | Result              |
 * |----------|--------------|---------------------|
 * | ❌       | ❌           | Page NOT visible    |
 * | ❌       | ✅           | Page NOT visible    |
 * | ✅       | ❌           | Page visible (VIEW) |
 * | ✅       | ✅           | Page visible (FULL) |
 * 
 * KEY RULE: Approval comes first. Subscription never grants visibility alone.
 * 
 * @module migrations/migration_051_subscription_page_access
 */

const MIGRATION_ID = 51;
const MIGRATION_NAME = 'subscription_page_access';

async function up(pool) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`[Migration ${MIGRATION_ID}] Starting: ${MIGRATION_NAME}`);
    
    // =========================================================================
    // 1. Create subscription_page_features table
    // =========================================================================
    console.log('[Migration 051] Creating subscription_page_features table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_page_features (
        id SERIAL PRIMARY KEY,
        plan_id INT NOT NULL,
        page_code TEXT NOT NULL,
        
        -- Action permissions (subscription-controlled)
        can_view BOOLEAN NOT NULL DEFAULT true,
        can_edit BOOLEAN NOT NULL DEFAULT false,
        can_delete BOOLEAN NOT NULL DEFAULT false,
        can_export BOOLEAN NOT NULL DEFAULT false,
        can_download BOOLEAN NOT NULL DEFAULT false,
        can_create BOOLEAN NOT NULL DEFAULT false,
        
        -- Limits
        daily_action_limit INT,
        monthly_action_limit INT,
        
        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        UNIQUE(plan_id, page_code)
      )
    `);
    
    // Add FK constraint
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE subscription_page_features
          ADD CONSTRAINT fk_spf_plan
          FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    
    // Add FK to pages_master
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE subscription_page_features
          ADD CONSTRAINT fk_spf_page
          FOREIGN KEY (page_code) REFERENCES pages_master(page_code) ON DELETE CASCADE;
      EXCEPTION 
        WHEN undefined_column THEN NULL;
        WHEN duplicate_object THEN NULL;
      END $$
    `);
    
    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_spf_plan ON subscription_page_features(plan_id);
      CREATE INDEX IF NOT EXISTS idx_spf_page ON subscription_page_features(page_code);
    `);
    
    console.log('  ✅ subscription_page_features table created');
    
    // =========================================================================
    // 2. Create access_requests table
    // =========================================================================
    console.log('[Migration 051] Creating access_requests table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        page_code TEXT NOT NULL,
        requested_action TEXT NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'PENDING',
        reviewed_by UUID,
        reviewed_at TIMESTAMPTZ,
        review_notes TEXT,
        admin_notified BOOLEAN DEFAULT false,
        admin_notified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
      )
    `);
    
    // FK constraints
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE access_requests
          ADD CONSTRAINT fk_ar_tenant
          FOREIGN KEY (tenant_id) REFERENCES clients(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE access_requests
          ADD CONSTRAINT fk_ar_user
          FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    
    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_tenant ON access_requests(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_ar_user ON access_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_ar_status ON access_requests(status) WHERE status = 'PENDING';
      CREATE INDEX IF NOT EXISTS idx_ar_page ON access_requests(page_code);
    `);
    
    console.log('  ✅ access_requests table created');
    
    // =========================================================================
    // 3. Create admin_access_request_notifications table
    // =========================================================================
    console.log('[Migration 051] Creating access request notification table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_access_notifications (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        access_request_id INT NOT NULL REFERENCES access_requests(id) ON DELETE CASCADE,
        admin_user_id UUID NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        upgrade_suggestion TEXT,
        suggested_plan_id INT,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        action_taken TEXT,
        action_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_aan_admin ON admin_access_notifications(admin_user_id);
      CREATE INDEX IF NOT EXISTS idx_aan_unread ON admin_access_notifications(admin_user_id, is_read) WHERE is_read = false;
    `);
    
    console.log('  ✅ admin_access_notifications table created');
    
    // =========================================================================
    // 4. Create subscription_action_audit table
    // =========================================================================
    console.log('[Migration 051] Creating subscription action audit table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_action_audit (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        page_code TEXT NOT NULL,
        action_attempted TEXT NOT NULL, -- 'edit', 'export', etc.
        
        -- Result
        allowed BOOLEAN NOT NULL,
        denial_reason TEXT, -- 'SUBSCRIPTION_LIMIT', 'PLAN_NOT_ALLOWED', etc.
        
        -- Context
        plan_id INT,
        plan_name TEXT,
        
        -- Metadata
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saa_tenant ON subscription_action_audit(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_saa_denied ON subscription_action_audit(tenant_id, allowed) WHERE allowed = false;
      CREATE INDEX IF NOT EXISTS idx_saa_created ON subscription_action_audit(created_at);
    `);
    
    console.log('  ✅ subscription_action_audit table created');
    
    // =========================================================================
    // 5. Create helper function for subscription feature check
    // =========================================================================
    console.log('[Migration 051] Creating subscription check function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION check_subscription_page_access(
        p_tenant_id UUID,
        p_page_code TEXT,
        p_action TEXT DEFAULT 'view'
      ) RETURNS JSONB AS $$
      DECLARE
        v_plan_id INT;
        v_feature RECORD;
        v_result JSONB;
      BEGIN
        -- Get tenant's current plan
        SELECT plan_id INTO v_plan_id
        FROM client_subscriptions
        WHERE client_id = p_tenant_id
          AND state = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- If no active subscription, default to free tier behavior
        IF v_plan_id IS NULL THEN
          v_plan_id := 1; -- Assume plan 1 is free tier
        END IF;
        
        -- Get subscription features for this page
        SELECT * INTO v_feature
        FROM subscription_page_features
        WHERE plan_id = v_plan_id AND page_code = p_page_code;
        
        -- If no entry, default to view-only
        IF NOT FOUND THEN
          v_result := jsonb_build_object(
            'canView', true,
            'canEdit', false,
            'canDelete', false,
            'canExport', false,
            'canDownload', false,
            'canCreate', false,
            'subscriptionRestricted', true,
            'planId', v_plan_id
          );
        ELSE
          v_result := jsonb_build_object(
            'canView', v_feature.can_view,
            'canEdit', v_feature.can_edit,
            'canDelete', v_feature.can_delete,
            'canExport', v_feature.can_export,
            'canDownload', v_feature.can_download,
            'canCreate', v_feature.can_create,
            'subscriptionRestricted', NOT (
              v_feature.can_edit AND 
              v_feature.can_export AND 
              v_feature.can_create
            ),
            'planId', v_plan_id
          );
        END IF;
        
        -- Check specific action
        IF p_action = 'edit' AND NOT (v_result->>'canEdit')::boolean THEN
          v_result := v_result || jsonb_build_object('actionAllowed', false, 'denialReason', 'PLAN_NOT_ALLOWED');
        ELSIF p_action = 'export' AND NOT (v_result->>'canExport')::boolean THEN
          v_result := v_result || jsonb_build_object('actionAllowed', false, 'denialReason', 'PLAN_NOT_ALLOWED');
        ELSIF p_action = 'delete' AND NOT (v_result->>'canDelete')::boolean THEN
          v_result := v_result || jsonb_build_object('actionAllowed', false, 'denialReason', 'PLAN_NOT_ALLOWED');
        ELSIF p_action = 'download' AND NOT (v_result->>'canDownload')::boolean THEN
          v_result := v_result || jsonb_build_object('actionAllowed', false, 'denialReason', 'PLAN_NOT_ALLOWED');
        ELSIF p_action = 'create' AND NOT (v_result->>'canCreate')::boolean THEN
          v_result := v_result || jsonb_build_object('actionAllowed', false, 'denialReason', 'PLAN_NOT_ALLOWED');
        ELSE
          v_result := v_result || jsonb_build_object('actionAllowed', true);
        END IF;
        
        RETURN v_result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    
    console.log('  ✅ check_subscription_page_access function created');
    
    // =========================================================================
    // 6. Seed default subscription page features for existing plans
    // =========================================================================
    console.log('[Migration 051] Seeding default subscription page features...');
    
    // Get all plans
    const plans = await client.query(`SELECT id, name FROM subscription_plans`);
    
    // Get key pages
    const pages = await client.query(`
      SELECT page_code FROM pages_master 
      WHERE status = 'active' AND is_active = true
      LIMIT 50
    `);
    
    // Seed based on plan tier
    for (const plan of plans.rows) {
      const planName = plan.name?.toLowerCase() || '';
      const isFree = planName.includes('free') || planName.includes('basic') || plan.id === 1;
      const isEnterprise = planName.includes('enterprise') || planName.includes('premium');
      
      for (const page of pages.rows) {
        await client.query(`
          INSERT INTO subscription_page_features 
            (plan_id, page_code, can_view, can_edit, can_delete, can_export, can_download, can_create)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (plan_id, page_code) DO NOTHING
        `, [
          plan.id,
          page.page_code,
          true,                          // can_view - always true
          !isFree,                       // can_edit - not for free
          !isFree,                       // can_delete - not for free
          isEnterprise,                  // can_export - enterprise only
          isEnterprise,                  // can_download - enterprise only
          !isFree                        // can_create - not for free
        ]);
      }
    }
    
    console.log('  ✅ Default subscription page features seeded');
    
    // =========================================================================
    // 7. Record migration
    // =========================================================================
    // Check if migration_history has migration_id column
    const historyCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'migration_history' AND column_name = 'migration_id'
    `);
    
    if (historyCheck.rows.length > 0) {
      await client.query(`
        INSERT INTO migration_history (migration_id, name, executed_at, success)
        VALUES ($1, $2, NOW(), true)
        ON CONFLICT (migration_id) DO UPDATE SET executed_at = NOW(), success = true
      `, [MIGRATION_ID, MIGRATION_NAME]);
    } else {
      // Alternative: use migration_name column
      await client.query(`
        INSERT INTO migration_history (migration_name, applied_at)
        VALUES ($1, NOW())
        ON CONFLICT (migration_name) DO NOTHING
      `, [`migration_${MIGRATION_ID}_${MIGRATION_NAME}`]);
    }
    
    await client.query('COMMIT');
    
    console.log(`[Migration ${MIGRATION_ID}] ✅ COMPLETE: ${MIGRATION_NAME}`);
    
    return { success: true, tables_created: 4, functions_created: 1 };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[Migration ${MIGRATION_ID}] ❌ FAILED:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function down(pool) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(`DROP FUNCTION IF EXISTS check_subscription_page_access(UUID, TEXT, TEXT)`);
    await client.query(`DROP TABLE IF EXISTS subscription_action_audit`);
    await client.query(`DROP TABLE IF EXISTS admin_access_notifications`);
    await client.query(`DROP TABLE IF EXISTS access_requests`);
    await client.query(`DROP TABLE IF EXISTS subscription_page_features`);
    
    await client.query(`
      DELETE FROM migration_history WHERE migration_id = $1
    `, [MIGRATION_ID]);
    
    await client.query('COMMIT');
    
    console.log(`[Migration ${MIGRATION_ID}] Rollback complete`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down, MIGRATION_ID, MIGRATION_NAME };
