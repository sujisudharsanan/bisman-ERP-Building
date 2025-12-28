-- ============================================================================
-- BISMAN ERP - Seed Subscription Plans for Local Development
-- Migration: 025_seed_subscription_plans_local.sql
-- Date: 2025-12-28
-- Description: Seeds 5 subscription plans with all 28 features for local testing
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Insert/Update Master Subscription Plans
-- 5 Plans: FREE, BASIC, STANDARD, PREMIUM, ENTERPRISE
-- ============================================================================

INSERT INTO master_subscription_plans (
    code, 
    name, 
    description, 
    status, 
    is_global,
    is_custom,
    badge_text, 
    sort_order, 
    is_popular, 
    color_code, 
    monthly_spend_cap, 
    auto_block_on_cap,
    cfo_approval_threshold,
    invoice_cycle_days,
    grace_period_days,
    read_only_after_grace
) VALUES
-- FREE Plan
(
    'FREE', 
    'Free', 
    'Get started with basic features. Perfect for trying out the platform and small businesses.', 
    'active', 
    TRUE,
    FALSE,
    'Free Forever', 
    1, 
    FALSE, 
    '#6B7280',  -- Gray
    1000.00, 
    TRUE,
    500.00,
    30,
    7,
    FALSE
),
-- BASIC Plan
(
    'BASIC', 
    'Basic', 
    'Essential features for small teams getting started. Includes core ERP functionality.', 
    'active', 
    TRUE,
    FALSE,
    'Starter', 
    2, 
    FALSE, 
    '#3B82F6',  -- Blue
    5000.00, 
    TRUE,
    2000.00,
    30,
    7,
    FALSE
),
-- STANDARD Plan
(
    'STANDARD', 
    'Standard', 
    'Comprehensive features for growing businesses. Best value for mid-sized teams.', 
    'active', 
    TRUE,
    FALSE,
    'Popular', 
    3, 
    TRUE,   -- Mark as popular
    '#8B5CF6',  -- Purple
    25000.00, 
    TRUE,
    10000.00,
    30,
    14,
    FALSE
),
-- PREMIUM Plan
(
    'PREMIUM', 
    'Premium', 
    'Advanced features with priority support. Ideal for established businesses.', 
    'active', 
    TRUE,
    FALSE,
    'Best Value', 
    4, 
    FALSE, 
    '#F59E0B',  -- Amber
    100000.00, 
    TRUE,
    50000.00,
    30,
    21,
    FALSE
),
-- ENTERPRISE Plan
(
    'ENTERPRISE', 
    'Enterprise', 
    'Unlimited features with dedicated support. For large organizations with custom needs.', 
    'active', 
    TRUE,
    FALSE,
    'Enterprise', 
    5, 
    FALSE, 
    '#10B981',  -- Emerald
    NULL,       -- No spend cap
    FALSE,
    NULL,       -- No CFO approval threshold
    30,
    30,
    FALSE
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    badge_text = EXCLUDED.badge_text,
    sort_order = EXCLUDED.sort_order,
    is_popular = EXCLUDED.is_popular,
    color_code = EXCLUDED.color_code,
    monthly_spend_cap = EXCLUDED.monthly_spend_cap,
    auto_block_on_cap = EXCLUDED.auto_block_on_cap,
    cfo_approval_threshold = EXCLUDED.cfo_approval_threshold,
    invoice_cycle_days = EXCLUDED.invoice_cycle_days,
    grace_period_days = EXCLUDED.grace_period_days,
    read_only_after_grace = EXCLUDED.read_only_after_grace,
    updated_at = NOW();

-- ============================================================================
-- STEP 2: Insert/Update Master Feature Definitions
-- 28 Features across 7 categories
-- ============================================================================

INSERT INTO master_feature_definitions (feature_code, feature_name, description, category, icon, sort_order, is_active) VALUES
-- 👤 USER & ACCESS (4 features)
('user_creation', 'User Creation', 'Create new user accounts', 'user_access', 'user-plus', 1, TRUE),
('role_assignment', 'Role Assignment', 'Assign roles to users', 'user_access', 'shield', 2, TRUE),
('branch_creation', 'Branch Creation', 'Create new branches/locations', 'user_access', 'building', 3, TRUE),
('location_creation', 'Location Creation', 'Create new locations', 'user_access', 'map-pin', 4, TRUE),

-- 📋 TASK & WORKFLOW (5 features)
('task_creation', 'Task Creation', 'Create new tasks and assignments', 'task_workflow', 'plus-circle', 10, TRUE),
('task_assignment', 'Task Assignment', 'Assign tasks to team members', 'task_workflow', 'users', 11, TRUE),
('task_approval', 'Task Approval', 'Approve submitted tasks', 'task_workflow', 'check-circle', 12, TRUE),
('task_reopen', 'Task Reopen', 'Reopen closed tasks', 'task_workflow', 'rotate-ccw', 13, TRUE),
('task_attachments', 'Task Attachments', 'Upload attachments to tasks', 'task_workflow', 'paperclip', 14, TRUE),

-- 💰 FINANCE & PAYMENTS (5 features)
('payment_request_creation', 'Payment Request Creation', 'Create payment requests', 'finance', 'credit-card', 20, TRUE),
('payment_approval', 'Payment Approval', 'Approve payment requests', 'finance', 'check-square', 21, TRUE),
('amount_approval_threshold', 'Amount Approval Threshold', 'Amount-based approval control', 'finance', 'dollar-sign', 22, TRUE),
('bank_transfer_execution', 'Bank Transfer Execution', 'Execute bank transfers', 'finance', 'send', 23, TRUE),
('refund_processing', 'Refund Processing', 'Process refunds', 'finance', 'rotate-ccw', 24, TRUE),

-- 📊 REPORTING (4 features)
('report_generation', 'Report Generation', 'Generate reports', 'reporting', 'file-text', 30, TRUE),
('report_download', 'Report Download', 'Download generated reports', 'reporting', 'download', 31, TRUE),
('export_to_excel', 'Export to Excel', 'Export data to Excel format', 'reporting', 'file-spreadsheet', 32, TRUE),
('export_to_pdf', 'Export to PDF', 'Export data to PDF format', 'reporting', 'file', 33, TRUE),

-- 🏦 BANKING & RECONCILIATION (4 features)
('bank_statement_upload', 'Bank Statement Upload', 'Upload bank statements', 'banking', 'upload', 40, TRUE),
('auto_reconciliation', 'Auto Reconciliation', 'Automatic bank reconciliation', 'banking', 'refresh-cw', 41, TRUE),
('manual_reconciliation', 'Manual Reconciliation', 'Manual reconciliation entries', 'banking', 'edit', 42, TRUE),
('utr_trace', 'UTR Trace', 'Trace transactions by UTR', 'banking', 'search', 43, TRUE),

-- 📁 DOCUMENTS & STORAGE (3 features)
('file_upload', 'File Upload', 'Upload files and documents', 'documents', 'upload-cloud', 50, TRUE),
('file_download', 'File Download', 'Download files and documents', 'documents', 'download-cloud', 51, TRUE),
('storage_usage', 'Storage Usage', 'Storage space allocation', 'documents', 'hard-drive', 52, TRUE),

-- ⚙️ SYSTEM & API (3 features)
('api_calls', 'API Calls', 'External API call limits', 'system', 'code', 60, TRUE),
('webhook_triggers', 'Webhook Triggers', 'Trigger outbound webhooks', 'system', 'link', 61, TRUE),
('audit_log_access', 'Audit Log Access', 'Access audit logs', 'system', 'eye', 62, TRUE)

ON CONFLICT (feature_code) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================================================
-- STEP 3: Clear existing plan feature controls (for fresh seed)
-- ============================================================================

DELETE FROM plan_feature_controls WHERE plan_id IN (
    SELECT id FROM master_subscription_plans WHERE code IN ('FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE')
);

-- ============================================================================
-- STEP 4: Insert Plan Feature Controls
-- Links each plan to all 28 features with appropriate limits
-- ============================================================================

-- ===== FREE PLAN FEATURES =====
-- Very limited, some features hard-locked
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit, currency, lock_mode, is_visible, show_in_pricing)
SELECT 
    p.id,
    f.feature_code,
    CASE f.category
        WHEN 'user_access' THEN
            CASE f.feature_code
                WHEN 'user_creation' THEN 3
                WHEN 'role_assignment' THEN 2
                WHEN 'branch_creation' THEN 1
                WHEN 'location_creation' THEN 2
            END
        WHEN 'task_workflow' THEN
            CASE f.feature_code
                WHEN 'task_creation' THEN 10
                WHEN 'task_assignment' THEN 10
                WHEN 'task_approval' THEN 10
                WHEN 'task_reopen' THEN 3
                WHEN 'task_attachments' THEN 5
            END
        WHEN 'finance' THEN
            CASE f.feature_code
                WHEN 'payment_request_creation' THEN 5
                WHEN 'payment_approval' THEN 5
                WHEN 'amount_approval_threshold' THEN 5000
                WHEN 'bank_transfer_execution' THEN 0
                WHEN 'refund_processing' THEN 0
            END
        WHEN 'reporting' THEN
            CASE f.feature_code
                WHEN 'report_generation' THEN 5
                WHEN 'report_download' THEN 5
                WHEN 'export_to_excel' THEN 3
                WHEN 'export_to_pdf' THEN 3
            END
        WHEN 'banking' THEN 0  -- All banking features locked
        WHEN 'documents' THEN
            CASE f.feature_code
                WHEN 'file_upload' THEN 10
                WHEN 'file_download' THEN 10
                WHEN 'storage_usage' THEN 1  -- 1 GB
            END
        WHEN 'system' THEN 0  -- All system features locked
        ELSE 5
    END as free_limit,
    'monthly'::limit_period_type,
    CASE 
        WHEN f.category IN ('banking', 'system') THEN 199.00
        ELSE 99.00
    END as unlock_price,
    'per month',
    'INR',
    CASE 
        WHEN f.category IN ('banking', 'system') THEN 'hard'::lock_mode_type
        WHEN f.feature_code IN ('bank_transfer_execution', 'refund_processing') THEN 'hard'::lock_mode_type
        ELSE 'none'::lock_mode_type
    END as lock_mode,
    CASE 
        WHEN f.category IN ('banking', 'system') THEN FALSE
        ELSE TRUE
    END as is_visible,
    TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'FREE';

-- ===== BASIC PLAN FEATURES =====
-- Moderate limits, most features available
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit, currency, lock_mode, is_visible, show_in_pricing)
SELECT 
    p.id,
    f.feature_code,
    CASE f.category
        WHEN 'user_access' THEN
            CASE f.feature_code
                WHEN 'user_creation' THEN 10
                WHEN 'role_assignment' THEN 5
                WHEN 'branch_creation' THEN 2
                WHEN 'location_creation' THEN 5
            END
        WHEN 'task_workflow' THEN
            CASE f.feature_code
                WHEN 'task_creation' THEN 50
                WHEN 'task_assignment' THEN 50
                WHEN 'task_approval' THEN 50
                WHEN 'task_reopen' THEN 10
                WHEN 'task_attachments' THEN 25
            END
        WHEN 'finance' THEN
            CASE f.feature_code
                WHEN 'payment_request_creation' THEN 25
                WHEN 'payment_approval' THEN 25
                WHEN 'amount_approval_threshold' THEN 25000
                WHEN 'bank_transfer_execution' THEN 10
                WHEN 'refund_processing' THEN 5
            END
        WHEN 'reporting' THEN
            CASE f.feature_code
                WHEN 'report_generation' THEN 25
                WHEN 'report_download' THEN 25
                WHEN 'export_to_excel' THEN 15
                WHEN 'export_to_pdf' THEN 15
            END
        WHEN 'banking' THEN
            CASE f.feature_code
                WHEN 'bank_statement_upload' THEN 5
                WHEN 'auto_reconciliation' THEN 10
                WHEN 'manual_reconciliation' THEN 20
                WHEN 'utr_trace' THEN 10
            END
        WHEN 'documents' THEN
            CASE f.feature_code
                WHEN 'file_upload' THEN 100
                WHEN 'file_download' THEN 100
                WHEN 'storage_usage' THEN 5  -- 5 GB
            END
        WHEN 'system' THEN
            CASE f.feature_code
                WHEN 'api_calls' THEN 1000
                WHEN 'webhook_triggers' THEN 5
                WHEN 'audit_log_access' THEN 30  -- 30 days
            END
        ELSE 50
    END as free_limit,
    'monthly'::limit_period_type,
    75.00,
    'per month',
    'INR',
    'none'::lock_mode_type,
    TRUE,
    TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'BASIC';

-- ===== STANDARD PLAN FEATURES =====
-- Higher limits, all features visible
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit, currency, lock_mode, is_visible, show_in_pricing)
SELECT 
    p.id,
    f.feature_code,
    CASE f.category
        WHEN 'user_access' THEN
            CASE f.feature_code
                WHEN 'user_creation' THEN 50
                WHEN 'role_assignment' THEN 25
                WHEN 'branch_creation' THEN 10
                WHEN 'location_creation' THEN 25
            END
        WHEN 'task_workflow' THEN
            CASE f.feature_code
                WHEN 'task_creation' THEN 500
                WHEN 'task_assignment' THEN 500
                WHEN 'task_approval' THEN 500
                WHEN 'task_reopen' THEN 50
                WHEN 'task_attachments' THEN 250
            END
        WHEN 'finance' THEN
            CASE f.feature_code
                WHEN 'payment_request_creation' THEN 200
                WHEN 'payment_approval' THEN 200
                WHEN 'amount_approval_threshold' THEN 100000
                WHEN 'bank_transfer_execution' THEN 100
                WHEN 'refund_processing' THEN 50
            END
        WHEN 'reporting' THEN
            CASE f.feature_code
                WHEN 'report_generation' THEN 100
                WHEN 'report_download' THEN 100
                WHEN 'export_to_excel' THEN 75
                WHEN 'export_to_pdf' THEN 75
            END
        WHEN 'banking' THEN
            CASE f.feature_code
                WHEN 'bank_statement_upload' THEN 25
                WHEN 'auto_reconciliation' THEN 100
                WHEN 'manual_reconciliation' THEN 200
                WHEN 'utr_trace' THEN 100
            END
        WHEN 'documents' THEN
            CASE f.feature_code
                WHEN 'file_upload' THEN 1000
                WHEN 'file_download' THEN 1000
                WHEN 'storage_usage' THEN 25  -- 25 GB
            END
        WHEN 'system' THEN
            CASE f.feature_code
                WHEN 'api_calls' THEN 10000
                WHEN 'webhook_triggers' THEN 25
                WHEN 'audit_log_access' THEN 90  -- 90 days
            END
        ELSE 500
    END as free_limit,
    'monthly'::limit_period_type,
    50.00,
    'per month',
    'INR',
    'none'::lock_mode_type,
    TRUE,
    TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'STANDARD';

-- ===== PREMIUM PLAN FEATURES =====
-- Very high limits
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit, currency, lock_mode, is_visible, show_in_pricing)
SELECT 
    p.id,
    f.feature_code,
    CASE f.category
        WHEN 'user_access' THEN
            CASE f.feature_code
                WHEN 'user_creation' THEN 200
                WHEN 'role_assignment' THEN 100
                WHEN 'branch_creation' THEN 50
                WHEN 'location_creation' THEN 100
            END
        WHEN 'task_workflow' THEN
            CASE f.feature_code
                WHEN 'task_creation' THEN 2000
                WHEN 'task_assignment' THEN 2000
                WHEN 'task_approval' THEN 2000
                WHEN 'task_reopen' THEN 200
                WHEN 'task_attachments' THEN 1000
            END
        WHEN 'finance' THEN
            CASE f.feature_code
                WHEN 'payment_request_creation' THEN 1000
                WHEN 'payment_approval' THEN 1000
                WHEN 'amount_approval_threshold' THEN 500000
                WHEN 'bank_transfer_execution' THEN 500
                WHEN 'refund_processing' THEN 250
            END
        WHEN 'reporting' THEN
            CASE f.feature_code
                WHEN 'report_generation' THEN 500
                WHEN 'report_download' THEN 500
                WHEN 'export_to_excel' THEN 300
                WHEN 'export_to_pdf' THEN 300
            END
        WHEN 'banking' THEN
            CASE f.feature_code
                WHEN 'bank_statement_upload' THEN 100
                WHEN 'auto_reconciliation' THEN 500
                WHEN 'manual_reconciliation' THEN 1000
                WHEN 'utr_trace' THEN 500
            END
        WHEN 'documents' THEN
            CASE f.feature_code
                WHEN 'file_upload' THEN 5000
                WHEN 'file_download' THEN 5000
                WHEN 'storage_usage' THEN 100  -- 100 GB
            END
        WHEN 'system' THEN
            CASE f.feature_code
                WHEN 'api_calls' THEN 50000
                WHEN 'webhook_triggers' THEN 100
                WHEN 'audit_log_access' THEN 365  -- 1 year
            END
        ELSE 2000
    END as free_limit,
    'monthly'::limit_period_type,
    25.00,
    'per month',
    'INR',
    'none'::lock_mode_type,
    TRUE,
    TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'PREMIUM';

-- ===== ENTERPRISE PLAN FEATURES =====
-- Unlimited (-1)
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit, currency, lock_mode, is_visible, show_in_pricing)
SELECT 
    p.id,
    f.feature_code,
    -1,  -- -1 means unlimited
    'monthly'::limit_period_type,
    0.00,  -- No unlock price needed
    'unlimited',
    'INR',
    'none'::lock_mode_type,
    TRUE,
    TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'ENTERPRISE';

-- ============================================================================
-- STEP 5: Insert Infrastructure Billing Rates
-- ============================================================================

INSERT INTO infrastructure_billing_rates (resource_type, resource_name, price_per_unit, unit_type, billing_method) VALUES
('db_storage', 'Database Storage', 5.00, 'GB / month', 'metered'),
('file_storage', 'File Storage', 3.00, 'GB / month', 'metered'),
('api_calls', 'API Calls', 0.50, '1000 calls', 'metered'),
('background_jobs', 'Background Jobs', 0.10, 'job', 'metered'),
('email_notifications', 'Email Notifications', 0.25, '100 emails', 'metered'),
('sms_notifications', 'SMS Notifications', 0.50, 'SMS', 'metered')
ON CONFLICT (resource_type) DO UPDATE SET
    resource_name = EXCLUDED.resource_name,
    price_per_unit = EXCLUDED.price_per_unit,
    unit_type = EXCLUDED.unit_type,
    billing_method = EXCLUDED.billing_method;

-- ============================================================================
-- STEP 6: Verification Query
-- ============================================================================

-- Show plan summary
SELECT 
    p.code,
    p.name,
    p.status,
    p.is_popular,
    p.monthly_spend_cap,
    p.cfo_approval_threshold,
    COUNT(pfc.id) as feature_count
FROM master_subscription_plans p
LEFT JOIN plan_feature_controls pfc ON pfc.plan_id = p.id
GROUP BY p.id, p.code, p.name, p.status, p.is_popular, p.monthly_spend_cap, p.cfo_approval_threshold
ORDER BY p.sort_order;

-- Show feature summary by category
SELECT 
    category,
    COUNT(*) as feature_count
FROM master_feature_definitions
WHERE is_active = TRUE
GROUP BY category
ORDER BY MIN(sort_order);

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTE
-- ============================================================================
-- 
-- 5 Plans Created:
-- 1. FREE      - Free Forever (Gray)   - Basic features, some hard-locked
-- 2. BASIC     - Starter (Blue)        - Essential features for small teams
-- 3. STANDARD  - Popular (Purple)      - Best for growing businesses  
-- 4. PREMIUM   - Best Value (Amber)    - Advanced features, priority support
-- 5. ENTERPRISE- Enterprise (Emerald)  - Unlimited everything
--
-- 28 Features across 7 categories:
-- - User & Access (4): user_creation, role_assignment, branch_creation, location_creation
-- - Task & Workflow (5): task_creation, task_assignment, task_approval, task_reopen, task_attachments
-- - Finance & Payments (5): payment_request_creation, payment_approval, amount_approval_threshold, bank_transfer_execution, refund_processing
-- - Reporting (4): report_generation, report_download, export_to_excel, export_to_pdf
-- - Banking & Reconciliation (4): bank_statement_upload, auto_reconciliation, manual_reconciliation, utr_trace
-- - Documents & Storage (3): file_upload, file_download, storage_usage
-- - System & API (3): api_calls, webhook_triggers, audit_log_access
--
-- ============================================================================
