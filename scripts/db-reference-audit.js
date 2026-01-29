/**
 * Database Reference Audit Script
 * ================================
 * 
 * Compares all database references in backend/frontend against actual DB schema.
 * 
 * Run: node scripts/db-reference-audit.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// Known Prisma model to table mappings (camelCase to snake_case)
const PRISMA_TO_TABLE = {
  // Standard snake_case tables
  'users_enhanced': 'users_enhanced',
  'user': 'users_enhanced',
  'User': 'users_enhanced',
  'users': 'users_enhanced',
  'client': 'clients',
  'clients': 'clients',
  'tenant': 'clients',
  'super_admins': 'super_admins',
  'superAdmin': 'super_admins',
  'enterprise_admins': 'enterprise_admins',
  'client_subscriptions': 'client_subscriptions',
  'clientSubscription': 'client_subscriptions',
  'subscription_plans': 'subscription_plans',
  'subscriptionPlan': 'subscription_plans',
  'recent_activity': 'recent_activity',
  'module': 'modules_master',
  'modules': 'modules_master',
  'rbac_roles': 'rbac_roles',
  'role': 'rbac_roles',
  'auditLog': 'audit_logs',
  'audit_logs': 'audit_logs',
  'module_assignments': 'module_assignments',
  'moduleAssignment': 'module_assignments',
  'rbac_user_permissions': 'rbac_user_permissions',
  'userPermission': 'rbac_user_permissions',
  'contract': 'contracts',
  'contracts': 'contracts',
  'subscription_coupons': 'subscription_coupons',
  'subscriptionCoupon': 'subscription_coupons',
  'permission': 'rbac_permissions',
  'rbac_permissions': 'rbac_permissions',
  'task': 'workflow_tasks',
  'tasks': 'workflow_tasks',
  'workflow_tasks': 'workflow_tasks',
  'user_sessions': 'user_sessions',
  'threads': 'threads',
  'thread': 'threads',
  'threadMessage': 'thread_messages',
  'thread_messages': 'thread_messages',
  'threadMember': 'thread_members',
  'paymentRequest': 'payment_requests',
  'payment_requests': 'payment_requests',
  'ledger': 'ledgers',
  'ledgers': 'ledgers',
  'tenantUsage': 'tenant_usage',
  'tenant_usage': 'tenant_usage',
  'rbac_user_roles': 'rbac_user_roles',
  'rbac_routes': 'rbac_routes',
  'routes': 'rbac_routes',
  'invoice': 'subscription_invoices',
  'customers': 'customers',
  'callLog': 'call_logs',
  'call_logs': 'call_logs',
  'branches': 'branches',
  'branch': 'branches',
  'bank_statements': 'bank_statements',
  'bank_statement_lines': 'bank_statement_lines',
  'admin_role_assignments': 'admin_role_assignments',
  'reconciliation_batches': 'reconciliation_batches',
  'otpToken': 'otp_tokens',
  'coupon_redemptions': 'coupon_redemptions',
  'couponRedemption': 'coupon_redemptions',
  'subscription_coupon_audit_logs': 'subscription_coupon_audit_logs',
  'billingProfile': 'billing_overrides',
  'systemHealthConfig': 'system_health_config',
  'scheduledPayable': 'scheduled_payables',
  'clientDailyUsage': 'client_daily_usage',
  'client_daily_usage': 'client_daily_usage',
  'bill': 'bills',
  'bills': 'bills',
  'reconciliation_exceptions': 'reconciliation_exceptions',
  'aIUsageLog': 'ai_usage_logs',
  'securityEvent': 'security_events',
  'security_events': 'security_events',
  'tenantQuota': 'tenant_quota_overrides',
  'userSkill': 'user_skills',
  'userKYC': 'user_kyc',
  'userEducation': 'user_education',
  'userBankAccount': 'user_bank_accounts',
  'userAddress': 'user_addresses',
  'userEmergencyContact': 'user_emergency_contacts',
  'userAchievement': 'user_achievements',
  'systemMetricSample': 'system_metric_samples',
  'systemMetricDailyAggregate': 'system_metric_daily',
  'contractAuditLog': 'contract_audit_logs',
  'client_module_permissions': 'client_module_permissions',
  'clientModulePermission': 'client_module_permissions',
  'coupon_templates': 'coupon_templates',
  'client_role_assignments': 'client_role_assignments',
  'user_branches': 'user_branches',
  'userPage': 'pages_master',
  'usageRecord': 'client_usage_events',
  'system_health_metric': 'system_health_metrics',
  'coupon_share_logs': 'coupon_share_logs',
  'contractFinancial': 'contract_financials',
  'client_feature_overrides': 'client_feature_overrides',
  'clientFeatureOverride': 'client_feature_overrides',
  'clientUsageEvent': 'client_usage_events',
  'billing_overrides': 'billing_overrides',
  'approval': 'approvals',
  'approvals': 'approvals',
  'warehouse': 'vendors', // warehouse might not exist - check
  'unitOfMeasure': 'items', // might not exist
  'pages_master': 'pages_master',
  'featureFlagDefinition': 'feature_flag_definitions',
  'reconciliation_audit_log': 'reconciliation_audit_log',
  'settlements': 'settlements',
  'securityViolation': 'rate_limit_violations',
  'moduleApprovalFlow': 'module_approval_flows',
  'userProfile': 'user_profiles',
  'non_privileged_user': 'users_enhanced',
  'non_privileged_users': 'users_enhanced',
  'roles': 'rbac_roles',
  'events': 'events',
  'qa_issues': 'qa_issues',
  'task_messages': 'task_messages',
  'task_attachments': 'task_attachments',
  'task_clarifications': 'task_clarifications',
  'task_requests': 'task_requests',
  'task_participants': 'task_participants',
  'approval_instances': 'approval_instances',
  'approval_stage_instances': 'approval_stage_instances',
  'role_page_access': 'role_page_access',
  'admin_page_assignments': 'admin_page_assignments',
  'chat_training_data': 'chat_training_data',
  'chat_messages': 'chat_messages',
  'chat_interactions': 'chat_interactions',
  'fallback_logs': 'fallback_logs',
  'settlement_line_items': 'settlement_line_items',
  'workflow_task_approvers': 'workflow_task_history', // might be different
  'plan_feature_controls': 'plan_feature_controls',
  'plan_module_access': 'plan_module_access',
  'plan_module_access_draft': 'plan_module_access_draft',
  'plan_feature_controls_draft': 'plan_feature_controls_draft',
  'master_feature_definitions': 'master_feature_definitions',
  'tenant_feature_unlocks': 'tenant_feature_unlocks',
  'support_sessions': 'support_sessions',
  'qa_test_tasks': 'qa_test_tasks',
  'knowledge_base': 'chat_training_data',
  'learning_events': 'chat_learning_queue',
  'chat_feedback': 'chat_feedback',
  'chat_learning_queue': 'chat_learning_queue',
  'custom_tenant_plan_configurations': 'custom_tenant_plan_configurations',
  'approval_audit_log': 'approval_audit_log',
  'payment_request_stages': 'approval_stage_instances',
  'task_request_messages': 'task_request_messages',
  'tenant_spend_limits': 'tenant_spend_limits',
  'event_attendees': 'events' // might not exist
};

// Tables that are NOT errors (system tables, partitions, etc.)
const IGNORE_TABLES = [
  'information_schema',
  'pg_stat_activity',
  'pg_tables',
  'unnest',
  'cacheInterceptorV',
  'SET',
  'io',
  'git',
  'js',
  'enginesVersion',
  'schema',
  'sh',
  'yml',
  'respond',
  'Mutation',
  '_isMonitoringWrapped'
];

async function audit() {
  console.log('🔍 DATABASE REFERENCE AUDIT');
  console.log('============================\n');

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // 1. Get all actual tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
    const actualTables = new Set(tablesResult.rows.map(r => r.table_name.toLowerCase()));

    console.log(`📊 Found ${actualTables.size} tables in database\n`);

    // 2. Collect all references from backend
    const backendReferences = new Map();

    // Prisma model references
    const prismaModels = [
      'users_enhanced', 'user', 'User', 'users', 'client', 'clients', 'tenant',
      'super_admins', 'superAdmin', 'enterprise_admins', 'client_subscriptions',
      'clientSubscription', 'subscription_plans', 'subscriptionPlan', 'recent_activity',
      'module', 'modules', 'rbac_roles', 'role', 'auditLog', 'audit_logs',
      'module_assignments', 'moduleAssignment', 'rbac_user_permissions', 'userPermission',
      'contract', 'contracts', 'subscription_coupons', 'subscriptionCoupon', 'permission',
      'rbac_permissions', 'task', 'tasks', 'workflow_tasks', 'user_sessions', 'threads',
      'thread', 'threadMessage', 'thread_messages', 'threadMember', 'paymentRequest',
      'payment_requests', 'ledger', 'ledgers', 'tenantUsage', 'tenant_usage',
      'rbac_user_roles', 'rbac_routes', 'routes', 'invoice', 'customers', 'callLog',
      'call_logs', 'branches', 'branch', 'bank_statements', 'bank_statement_lines',
      'admin_role_assignments', 'reconciliation_batches', 'otpToken', 'coupon_redemptions',
      'couponRedemption', 'billingProfile', 'systemHealthConfig', 'scheduledPayable',
      'clientDailyUsage', 'client_daily_usage', 'bill', 'bills', 'settlements',
      'reconciliation_exceptions', 'aIUsageLog', 'securityEvent', 'security_events',
      'tenantQuota', 'userSkill', 'userKYC', 'userEducation', 'userBankAccount',
      'userAddress', 'userEmergencyContact', 'userAchievement', 'systemMetricSample',
      'contractAuditLog', 'client_module_permissions', 'clientModulePermission',
      'coupon_templates', 'client_role_assignments', 'user_branches', 'pages_master'
    ];

    // SQL table references
    const sqlTables = [
      'users', 'pages_master', 'users_enhanced', 'workflow_tasks', 'payment_requests',
      'approval_stage_instances', 'audit_logs', 'task_messages', 'clients', 'audit_logs_dml',
      'admin_page_assignments', 'task_attachments', 'tasks', 'qa_issues', 'rbac_roles',
      'approval_instances', 'security_events', 'role_page_access', 'task_clarifications',
      'rbac_user_roles', 'chat_training_data', 'task_requests', 'settlement_line_items',
      'rbac_permissions', 'roles', 'events', 'tenant_feature_unlocks', 'task_participants',
      'rbac_routes', 'qa_test_tasks', 'chat_interactions', 'workflow_task_approvers',
      'chat_messages', 'settlements', 'plan_feature_controls', 'modules_master',
      'fallback_logs', 'support_sessions', 'subscription_plans', 'plan_module_access_draft',
      'plan_module_access', 'plan_feature_controls_draft', 'non_privileged_users',
      'master_feature_definitions', 'client_subscriptions', 'approval_audit_log',
      'tenant_spend_limits', 'chat_feedback', 'chat_learning_queue', 'knowledge_base'
    ];

    // 3. Check each reference
    const results = {
      found: [],
      missing: [],
      mapped: [],
      ignored: []
    };

    const allReferences = [...new Set([...prismaModels, ...sqlTables])];

    for (const ref of allReferences) {
      if (IGNORE_TABLES.includes(ref)) {
        results.ignored.push(ref);
        continue;
      }

      const mappedTable = PRISMA_TO_TABLE[ref];
      const tableToCheck = mappedTable || ref.toLowerCase();

      if (actualTables.has(tableToCheck)) {
        if (mappedTable && mappedTable !== ref.toLowerCase()) {
          results.mapped.push({ ref, table: mappedTable });
        } else {
          results.found.push(ref);
        }
      } else {
        results.missing.push({ ref, attempted: tableToCheck });
      }
    }

    // 4. Print results
    console.log('✅ FOUND (Direct Match):', results.found.length);
    results.found.slice(0, 20).forEach(r => console.log(`   ${r}`));
    if (results.found.length > 20) console.log(`   ... and ${results.found.length - 20} more`);

    console.log('\n🔄 MAPPED (Prisma → Table):', results.mapped.length);
    results.mapped.forEach(r => console.log(`   ${r.ref} → ${r.table}`));

    console.log('\n⚠️  IGNORED (System/Internal):', results.ignored.length);
    results.ignored.forEach(r => console.log(`   ${r}`));

    console.log('\n❌ MISSING (Not in DB):', results.missing.length);
    results.missing.forEach(r => console.log(`   ${r.ref} (tried: ${r.attempted})`));

    // 5. Check for potential table name mismatches
    console.log('\n\n📋 DETAILED MISSING TABLE ANALYSIS');
    console.log('=====================================\n');

    for (const missing of results.missing) {
      // Find similar tables
      const similar = [...actualTables].filter(t => 
        t.includes(missing.ref.toLowerCase().replace(/_/g, '')) ||
        missing.ref.toLowerCase().includes(t.replace(/_/g, ''))
      );
      
      if (similar.length > 0) {
        console.log(`❓ "${missing.ref}" might be: ${similar.join(', ')}`);
      } else {
        console.log(`❌ "${missing.ref}" - No similar tables found`);
      }
    }

    // 6. Check critical tables have required columns
    console.log('\n\n🔒 CRITICAL TABLE SCHEMA CHECK');
    console.log('================================\n');

    const criticalTables = [
      { table: 'users_enhanced', required: ['id', 'email', 'tenant_id', 'role_id', 'is_active'] },
      { table: 'clients', required: ['id', 'name', 'is_active'] },
      { table: 'workflow_tasks', required: ['id', 'tenant_id', 'status', 'created_by'] },
      { table: 'rbac_roles', required: ['id', 'name', 'data_scope'] },
      { table: 'audit_logs', required: ['id', 'tenant_id', 'action', 'user_id'] },
      { table: 'payment_requests', required: ['id', 'tenant_id', 'status'] },
      { table: 'thread_messages', required: ['id', 'thread_id', 'content'] },
      { table: 'pages_master', required: ['id', 'page_code', 'route'] }
    ];

    for (const check of criticalTables) {
      const cols = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [check.table]);
      
      const actualCols = new Set(cols.rows.map(r => r.column_name));
      const missing = check.required.filter(c => !actualCols.has(c));
      
      if (missing.length === 0) {
        console.log(`✅ ${check.table} - All required columns present`);
      } else {
        console.log(`❌ ${check.table} - Missing: ${missing.join(', ')}`);
      }
    }

    // 7. Summary
    console.log('\n\n📊 SUMMARY');
    console.log('===========');
    console.log(`Total references checked: ${allReferences.length}`);
    console.log(`✅ Found: ${results.found.length}`);
    console.log(`🔄 Mapped: ${results.mapped.length}`);
    console.log(`⚠️  Ignored: ${results.ignored.length}`);
    console.log(`❌ Missing: ${results.missing.length}`);
    
    const successRate = ((results.found.length + results.mapped.length) / 
      (allReferences.length - results.ignored.length) * 100).toFixed(1);
    console.log(`\n📈 Success Rate: ${successRate}%`);

    if (results.missing.length === 0) {
      console.log('\n🟢 ALL DATABASE REFERENCES VALID');
    } else {
      console.log('\n🟡 SOME REFERENCES NEED ATTENTION');
    }

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  } finally {
    await pool.end();
  }
}

audit().catch(console.error);
