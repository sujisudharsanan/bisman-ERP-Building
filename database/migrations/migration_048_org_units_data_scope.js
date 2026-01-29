/* eslint-env node */
/**
 * Migration 048: Org Units & Data Scope Schema for Large Orgs
 * =============================================================
 * 
 * PURPOSE:
 * Implement hierarchical organizational structure for large organizations
 * with proper data scope enforcement.
 * 
 * SCHEMA:
 * - org_units: Hierarchical org structure (Company > Branch > Department > Team)
 * - data_scopes: Enum table for scope levels
 * - user_org_units: User membership in org units
 * - rbac_roles.data_scope_id: Link roles to data scopes
 * 
 * @migration 048
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🚀 Migration 048: Creating Org Units & Data Scope Schema...\n');
  
  try {
    // =========================================================================
    // STEP 1: Create data_scopes table
    // =========================================================================
    console.log('STEP 1: Creating data_scopes table...');
    
    const dataScopesExists = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'data_scopes' AND table_schema = 'public'
    `);
    
    if (dataScopesExists.rows.length === 0) {
      await pool.query(`
        CREATE TABLE data_scopes (
          id SERIAL PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          hierarchy_level INT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Seed default scopes
      await pool.query(`
        INSERT INTO data_scopes (code, display_name, description, hierarchy_level) VALUES
        ('ALL', 'All Data', 'Access to all data across the system', 1),
        ('TENANT', 'Tenant', 'Access to all data within tenant', 2),
        ('ORG', 'Organization', 'Access to organization-level data', 3),
        ('BRANCH', 'Branch', 'Access to branch-level data', 4),
        ('DEPARTMENT', 'Department', 'Access to department-level data', 5),
        ('TEAM', 'Team', 'Access to team-level data', 6),
        ('SELF', 'Self Only', 'Access to own data only', 7),
        ('CUSTOM', 'Custom', 'Custom data scope rules', 8)
        ON CONFLICT (code) DO NOTHING
      `);
      
      console.log('   ✅ data_scopes table created and seeded');
    } else {
      console.log('   ℹ️  data_scopes table already exists');
    }
    
    // =========================================================================
    // STEP 2: Create org_units table
    // =========================================================================
    console.log('\nSTEP 2: Creating org_units table...');
    
    const orgUnitsExists = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'org_units' AND table_schema = 'public'
    `);
    
    if (orgUnitsExists.rows.length === 0) {
      await pool.query(`
        CREATE TABLE org_units (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM')),
          parent_id UUID REFERENCES org_units(id),
          name TEXT NOT NULL,
          code TEXT,
          manager_id INT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          
          CONSTRAINT org_units_no_self_parent CHECK (id != parent_id)
        )
      `);
      
      // Create indexes
      await pool.query(`CREATE INDEX idx_org_units_tenant ON org_units(tenant_id)`);
      await pool.query(`CREATE INDEX idx_org_units_parent ON org_units(parent_id)`);
      await pool.query(`CREATE INDEX idx_org_units_type ON org_units(type)`);
      
      console.log('   ✅ org_units table created with indexes');
    } else {
      console.log('   ℹ️  org_units table already exists');
    }
    
    // =========================================================================
    // STEP 3: Create user_org_units table
    // =========================================================================
    console.log('\nSTEP 3: Creating user_org_units table...');
    
    const userOrgUnitsExists = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'user_org_units' AND table_schema = 'public'
    `);
    
    if (userOrgUnitsExists.rows.length === 0) {
      await pool.query(`
        CREATE TABLE user_org_units (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          org_unit_id UUID NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
          is_primary BOOLEAN NOT NULL DEFAULT false,
          role_in_unit TEXT,
          assigned_at TIMESTAMP DEFAULT NOW(),
          assigned_by INT,
          
          UNIQUE(user_id, org_unit_id)
        )
      `);
      
      await pool.query(`CREATE INDEX idx_user_org_units_user ON user_org_units(user_id)`);
      await pool.query(`CREATE INDEX idx_user_org_units_org ON user_org_units(org_unit_id)`);
      
      console.log('   ✅ user_org_units table created');
    } else {
      console.log('   ℹ️  user_org_units table already exists');
    }
    
    // =========================================================================
    // STEP 4: Add data_scope_id to rbac_roles
    // =========================================================================
    console.log('\nSTEP 4: Adding data_scope_id to rbac_roles...');
    
    const hasScopeId = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'rbac_roles' AND column_name = 'data_scope_id'
    `);
    
    if (hasScopeId.rows.length === 0) {
      await pool.query(`
        ALTER TABLE rbac_roles 
        ADD COLUMN data_scope_id INT REFERENCES data_scopes(id)
      `);
      
      // Migrate existing data_scope values (using scope_name for existing table)
      await pool.query(`
        UPDATE rbac_roles r
        SET data_scope_id = ds.id
        FROM data_scopes ds
        WHERE r.data_scope = ds.scope_name AND r.data_scope IS NOT NULL
      `);
      
      console.log('   ✅ data_scope_id column added and migrated');
    } else {
      console.log('   ℹ️  data_scope_id column already exists');
    }
    
    // =========================================================================
    // STEP 5: Create org hierarchy helper function
    // =========================================================================
    console.log('\nSTEP 5: Creating org hierarchy functions...');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION get_org_unit_descendants(root_id UUID)
      RETURNS TABLE (id UUID, type TEXT, name TEXT, depth INT) AS $$
      WITH RECURSIVE descendants AS (
        SELECT id, type, name, 0 as depth
        FROM org_units
        WHERE id = root_id
        
        UNION ALL
        
        SELECT o.id, o.type, o.name, d.depth + 1
        FROM org_units o
        INNER JOIN descendants d ON o.parent_id = d.id
        WHERE d.depth < 10  -- Max depth protection
      )
      SELECT * FROM descendants;
      $$ LANGUAGE SQL STABLE;
    `);
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION get_user_org_units(p_user_id INT)
      RETURNS TABLE (org_unit_id UUID, org_type TEXT, org_name TEXT, is_primary BOOLEAN) AS $$
        SELECT ou.id, ou.type, ou.name, uou.is_primary
        FROM user_org_units uou
        JOIN org_units ou ON ou.id = uou.org_unit_id
        WHERE uou.user_id = p_user_id
        ORDER BY uou.is_primary DESC, ou.type;
      $$ LANGUAGE SQL STABLE;
    `);
    
    console.log('   ✅ Org hierarchy functions created');
    
    // =========================================================================
    // STEP 6: Create data scope resolution function
    // =========================================================================
    console.log('\nSTEP 6: Creating data scope resolution function...');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION resolve_data_scope_filter(
        p_user_id INT,
        p_tenant_id UUID,
        p_data_scope TEXT
      )
      RETURNS TABLE (allowed_org_unit_ids UUID[]) AS $$
      DECLARE
        v_primary_org_unit UUID;
      BEGIN
        -- Get user's primary org unit
        SELECT org_unit_id INTO v_primary_org_unit
        FROM user_org_units
        WHERE user_id = p_user_id AND is_primary = true;
        
        CASE p_data_scope
          WHEN 'ALL' THEN
            -- Return NULL to indicate no filtering
            RETURN QUERY SELECT NULL::UUID[];
            
          WHEN 'TENANT' THEN
            -- Return all org units in tenant
            RETURN QUERY 
            SELECT ARRAY_AGG(id) 
            FROM org_units 
            WHERE tenant_id = p_tenant_id;
            
          WHEN 'ORG', 'BRANCH', 'DEPARTMENT', 'TEAM' THEN
            -- Return descendants of primary org unit
            RETURN QUERY
            SELECT ARRAY_AGG(id)
            FROM get_org_unit_descendants(v_primary_org_unit);
            
          WHEN 'SELF' THEN
            -- Return empty array (handled by user_id check)
            RETURN QUERY SELECT ARRAY[]::UUID[];
            
          ELSE
            -- CUSTOM or unknown - return empty
            RETURN QUERY SELECT ARRAY[]::UUID[];
        END CASE;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    
    console.log('   ✅ Data scope resolution function created');
    
    // =========================================================================
    // STEP 7: Add org_unit_id to key business tables
    // =========================================================================
    console.log('\nSTEP 7: Adding org_unit_id to business tables...');
    
    const tablesToAddOrgUnit = [
      'workflow_tasks',
      'task_requests',
      'users_enhanced'
    ];
    
    for (const tableName of tablesToAddOrgUnit) {
      const hasOrgUnit = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'org_unit_id'
      `, [tableName]);
      
      if (hasOrgUnit.rows.length === 0) {
        try {
          await pool.query(`
            ALTER TABLE ${tableName} 
            ADD COLUMN org_unit_id UUID REFERENCES org_units(id)
          `);
          await pool.query(`
            CREATE INDEX idx_${tableName}_org_unit ON ${tableName}(org_unit_id)
          `);
          console.log(`   ✅ Added org_unit_id to ${tableName}`);
        } catch (e) {
          console.log(`   ⚠️  Could not add org_unit_id to ${tableName}: ${e.message}`);
        }
      } else {
        console.log(`   ℹ️  ${tableName} already has org_unit_id`);
      }
    }
    
    // =========================================================================
    // STEP 8: Verification
    // =========================================================================
    console.log('\nSTEP 8: Verification...');
    
    const scopeCount = await pool.query(`SELECT COUNT(*) as count FROM data_scopes`);
    console.log(`   📊 Data scopes defined: ${scopeCount.rows[0].count}`);
    
    const roleScopes = await pool.query(`
      SELECT rr.name, ds.scope_name as data_scope
      FROM rbac_roles rr
      LEFT JOIN data_scopes ds ON rr.data_scope_id = ds.id
      WHERE ds.scope_name IS NOT NULL
      LIMIT 10
    `);
    console.log(`   📊 Roles with data_scope_id: ${roleScopes.rows.length}`);
    
    console.log('\n✅ Migration 048 completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}

module.exports = { migrate };
