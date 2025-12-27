-- ============================================================================
-- BISMAN ERP - Add Missing Monetizable Features
-- Migration: 025_add_missing_monetizable_features.sql
-- Date: 2025-12-27
-- Description: Adds all hidden monetizable features discovered in audit
--              Includes: Security, Enterprise, Automation, Notifications
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD NEW FEATURE CATEGORIES
-- ============================================================================

-- SECURITY & AUTHENTICATION
INSERT INTO master_feature_definitions (feature_code, feature_name, description, category, icon, sort_order) VALUES
('concurrent_sessions', 'Concurrent Sessions', 'Number of simultaneous login sessions allowed per user', 'security', 'monitor', 70),
('mfa_authentication', 'MFA/2FA Authentication', 'Multi-factor authentication for enhanced security', 'security', 'key', 71),
('session_timeout_control', 'Session Timeout Control', 'Configure session timeout duration', 'security', 'clock', 72),
('password_policy', 'Password Policy', 'Password expiry and complexity rules', 'security', 'shield', 73),
('ip_whitelist', 'IP Whitelist', 'Restrict access to specific IP addresses', 'security', 'lock', 74),
('login_lockout', 'Login Lockout', 'Brute force protection with login attempt limits', 'security', 'alert-triangle', 75),
('support_sessions', 'Support Access Sessions', 'Time-limited support team access', 'security', 'headphones', 76),
('sso_saml', 'SSO/SAML Integration', 'Single sign-on with enterprise identity providers', 'security', 'users', 77),

-- RBAC & PERMISSIONS
('custom_role_creation', 'Custom Role Creation', 'Create custom roles with specific permissions', 'rbac', 'user-cog', 80),
('role_cloning', 'Role Cloning', 'Clone existing roles for quick setup', 'rbac', 'copy', 81),
('temporary_roles', 'Temporary Roles', 'Time-limited role assignments for contractors', 'rbac', 'timer', 82),
('approval_levels', 'Approval Level Hierarchy', 'Multi-level approval chains (L1-L10)', 'rbac', 'git-branch', 83),
('permission_audit', 'Permission Audit Trail', 'Track all permission changes', 'rbac', 'eye', 84),
('delegation_rules', 'Delegation Rules', 'Configure approval delegation for vacations', 'rbac', 'arrow-right', 85),

-- ADVANCED WORKFLOW
('recurring_tasks', 'Recurring Tasks', 'Create tasks on automatic schedule', 'advanced_workflow', 'repeat', 90),
('task_auto_assignment', 'Task Auto-Assignment', 'Automatic task assignment based on rules', 'advanced_workflow', 'zap', 91),
('task_escalation', 'Task Escalation', 'Automatic escalation for overdue tasks', 'advanced_workflow', 'trending-up', 92),
('task_templates', 'Task Templates', 'Pre-defined task templates for common workflows', 'advanced_workflow', 'file-text', 93),
('sla_management', 'SLA Management', 'Service level agreement tracking and alerts', 'advanced_workflow', 'clock', 94),
('workflow_automation', 'Workflow Automation', 'Automated workflow triggers and actions', 'advanced_workflow', 'cog', 95),

-- ADVANCED FINANCE
('multi_currency', 'Multi-Currency Support', 'Handle transactions in multiple currencies', 'advanced_finance', 'globe', 100),
('cost_centers', 'Cost Centers', 'Track expenses by cost center', 'advanced_finance', 'pie-chart', 101),
('budget_management', 'Budget Management', 'Set and track budgets per department', 'advanced_finance', 'target', 102),
('expense_categories', 'Expense Categories', 'Custom expense categorization', 'advanced_finance', 'tag', 103),
('approval_bypass_audit', 'Approval Bypass Audit', 'Track all approval bypasses', 'advanced_finance', 'alert-circle', 104),

-- ADVANCED REPORTING
('custom_dashboards', 'Custom Dashboards', 'Create custom dashboard layouts', 'advanced_reporting', 'layout', 110),
('kpi_analytics', 'KPI Analytics', 'Key performance indicator tracking', 'advanced_reporting', 'bar-chart-2', 111),
('report_builder', 'Report Builder', 'Build custom reports with drag-and-drop', 'advanced_reporting', 'tool', 112),
('ai_analytics', 'AI Analytics', 'AI-powered insights and recommendations', 'advanced_reporting', 'brain', 113),
('scheduled_reports', 'Scheduled Reports', 'Automatic report generation and delivery', 'advanced_reporting', 'calendar', 114),
('report_sharing', 'Report Sharing', 'Share reports with external stakeholders', 'advanced_reporting', 'share-2', 115),

-- DOCUMENTS & OCR
('ocr_extraction', 'OCR Document Extraction', 'Extract data from uploaded documents', 'documents', 'scan', 53),
('document_versioning', 'Document Versioning', 'Track document version history', 'documents', 'git-commit', 54),
('bulk_upload', 'Bulk Upload', 'Upload multiple files at once', 'documents', 'upload', 55),
('advanced_search', 'Advanced Document Search', 'Full-text search across documents', 'documents', 'search', 56),

-- NOTIFICATIONS & COMMUNICATION
('email_notifications', 'Email Notifications', 'Send email notifications for events', 'notifications', 'mail', 120),
('sms_notifications', 'SMS Notifications', 'Send SMS alerts for critical events', 'notifications', 'smartphone', 121),
('push_notifications', 'Push Notifications', 'Browser push notifications', 'notifications', 'bell', 122),
('slack_integration', 'Slack Integration', 'Post notifications to Slack channels', 'notifications', 'message-square', 123),
('in_app_chat', 'In-App Chat', 'Real-time chat within the application', 'notifications', 'message-circle', 124),
('notification_templates', 'Notification Templates', 'Custom notification message templates', 'notifications', 'file-text', 125),

-- INTEGRATIONS & API
('custom_integrations', 'Custom Integrations', 'Build custom integrations with third-party services', 'integrations', 'link-2', 130),
('api_rate_limit_override', 'API Rate Limit Override', 'Higher API rate limits', 'integrations', 'zap', 131),
('api_key_management', 'API Key Management', 'Manage multiple API keys', 'integrations', 'key', 132),
('realtime_websocket', 'Real-time WebSocket', 'Live updates via WebSocket connection', 'integrations', 'activity', 133),
('data_export_api', 'Data Export API', 'Bulk data export via API', 'integrations', 'database', 134),

-- ENTERPRISE FEATURES
('multi_entity', 'Multi-Entity Support', 'Manage multiple legal entities', 'enterprise', 'building', 140),
('white_label', 'White Label', 'Custom branding and white-labeling', 'enterprise', 'palette', 141),
('custom_domain', 'Custom Domain', 'Use custom domain for the application', 'enterprise', 'globe', 142),
('dedicated_infrastructure', 'Dedicated Infrastructure', 'Isolated infrastructure for security', 'enterprise', 'server', 143),
('on_premise_deployment', 'On-Premise Deployment', 'Deploy on your own servers', 'enterprise', 'home', 144),
('sandbox_environment', 'Sandbox Environment', 'Test environment for safe testing', 'enterprise', 'box', 145),
('data_residency', 'Data Residency', 'Choose data storage region', 'enterprise', 'map', 146),

-- SUPPORT & SLA
('priority_support', 'Priority Support', 'Priority email and phone support', 'support', 'headphones', 150),
('dedicated_account_manager', 'Dedicated Account Manager', 'Personal account manager', 'support', 'user', 151),
('sla_guarantee', 'SLA Guarantee', 'Guaranteed response times', 'support', 'clock', 152),
('custom_training', 'Custom Training', 'Personalized training sessions', 'support', 'book-open', 153),
('business_reviews', 'Business Reviews', 'Quarterly business review meetings', 'support', 'calendar', 154),

-- COMPLIANCE & AUDIT
('audit_log_export', 'Audit Log Export', 'Export audit logs for compliance', 'compliance', 'download', 160),
('extended_retention', 'Extended Retention', 'Extended data retention periods', 'compliance', 'archive', 161),
('compliance_reports', 'Compliance Reports', 'Pre-built compliance reports', 'compliance', 'file-check', 162),
('gdpr_tools', 'GDPR Tools', 'GDPR compliance tools and data export', 'compliance', 'shield', 163),
('sox_compliance', 'SOX Compliance', 'SOX compliance features and audit trail', 'compliance', 'check-square', 164),

-- BACKUP & RECOVERY
('daily_backup', 'Daily Backup', 'Automatic daily backups', 'backup', 'save', 170),
('hourly_backup', 'Hourly Backup', 'Frequent hourly backups', 'backup', 'clock', 171),
('point_in_time_recovery', 'Point-in-Time Recovery', 'Restore data to any point in time', 'backup', 'rotate-ccw', 172),
('cross_region_backup', 'Cross-Region Backup', 'Backup data to multiple regions', 'backup', 'globe', 173)

ON CONFLICT (feature_code) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 2. ADD DEFAULT PLAN FEATURE CONTROLS FOR NEW FEATURES
-- ============================================================================

-- FREE PLAN - Most features locked
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible, requires_approval)
SELECT p.id, f.feature_code,
  CASE 
    -- Security - very limited
    WHEN f.feature_code = 'concurrent_sessions' THEN 1
    WHEN f.feature_code = 'session_timeout_control' THEN 1
    WHEN f.feature_code IN ('mfa_authentication', 'password_policy', 'ip_whitelist', 'login_lockout', 'support_sessions', 'sso_saml') THEN 0
    -- RBAC - basic only
    WHEN f.feature_code = 'custom_role_creation' THEN 2
    WHEN f.feature_code IN ('role_cloning', 'temporary_roles', 'delegation_rules', 'permission_audit') THEN 0
    WHEN f.feature_code = 'approval_levels' THEN 2
    -- Advanced workflow - none
    WHEN f.category = 'advanced_workflow' THEN 0
    -- Advanced finance - none
    WHEN f.category = 'advanced_finance' THEN 0
    -- Advanced reporting - very limited
    WHEN f.feature_code = 'custom_dashboards' THEN 1
    WHEN f.category = 'advanced_reporting' THEN 0
    -- Documents - limited OCR
    WHEN f.feature_code = 'ocr_extraction' THEN 5
    WHEN f.feature_code IN ('document_versioning', 'bulk_upload', 'advanced_search') THEN 0
    -- Notifications - email only
    WHEN f.feature_code = 'email_notifications' THEN 10
    WHEN f.category = 'notifications' THEN 0
    -- Integrations - none
    WHEN f.category = 'integrations' THEN 0
    -- Enterprise - none
    WHEN f.category = 'enterprise' THEN 0
    -- Support - none
    WHEN f.category = 'support' THEN 0
    -- Compliance - basic only
    WHEN f.feature_code = 'audit_log_export' THEN 0
    WHEN f.category = 'compliance' THEN 0
    -- Backup - daily only
    WHEN f.feature_code = 'daily_backup' THEN 1
    WHEN f.category = 'backup' THEN 0
    ELSE 0
  END,
  'monthly'::limit_period_type,
  CASE 
    WHEN f.category IN ('enterprise', 'support') THEN 0
    WHEN f.category = 'security' THEN 200.00
    WHEN f.category = 'advanced_reporting' THEN 150.00
    ELSE 100.00
  END,
  CASE 
    WHEN f.category IN ('enterprise', 'support', 'integrations') THEN 'hard'::lock_mode_type
    WHEN f.category IN ('advanced_workflow', 'advanced_finance', 'compliance') THEN 'hard'::lock_mode_type
    WHEN f.feature_code IN ('sso_saml', 'ip_whitelist', 'temporary_roles', 'delegation_rules') THEN 'hard'::lock_mode_type
    WHEN f.feature_code IN ('ai_analytics', 'report_builder', 'scheduled_reports') THEN 'hard'::lock_mode_type
    ELSE 'soft'::lock_mode_type
  END,
  CASE 
    WHEN f.category IN ('enterprise', 'support') THEN FALSE
    ELSE TRUE
  END,
  FALSE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'FREE'
  AND f.feature_code NOT IN (SELECT feature_code FROM plan_feature_controls WHERE plan_id = p.id)
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- BASIC PLAN - Some features unlocked
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible, requires_approval)
SELECT p.id, f.feature_code,
  CASE 
    -- Security
    WHEN f.feature_code = 'concurrent_sessions' THEN 3
    WHEN f.feature_code = 'session_timeout_control' THEN 1
    WHEN f.feature_code = 'mfa_authentication' THEN 1
    WHEN f.feature_code = 'password_policy' THEN 1
    WHEN f.feature_code = 'login_lockout' THEN 1
    WHEN f.feature_code IN ('ip_whitelist', 'support_sessions', 'sso_saml') THEN 0
    -- RBAC
    WHEN f.feature_code = 'custom_role_creation' THEN 5
    WHEN f.feature_code = 'role_cloning' THEN 5
    WHEN f.feature_code = 'approval_levels' THEN 3
    WHEN f.feature_code IN ('temporary_roles', 'delegation_rules', 'permission_audit') THEN 0
    -- Advanced workflow - limited
    WHEN f.feature_code = 'recurring_tasks' THEN 10
    WHEN f.feature_code = 'task_templates' THEN 5
    WHEN f.feature_code IN ('task_auto_assignment', 'task_escalation', 'sla_management', 'workflow_automation') THEN 0
    -- Advanced finance - limited
    WHEN f.feature_code = 'expense_categories' THEN 10
    WHEN f.feature_code IN ('multi_currency', 'cost_centers', 'budget_management', 'approval_bypass_audit') THEN 0
    -- Advanced reporting
    WHEN f.feature_code = 'custom_dashboards' THEN 3
    WHEN f.feature_code = 'kpi_analytics' THEN 1
    WHEN f.feature_code IN ('report_builder', 'ai_analytics', 'scheduled_reports', 'report_sharing') THEN 0
    -- Documents
    WHEN f.feature_code = 'ocr_extraction' THEN 20
    WHEN f.feature_code = 'bulk_upload' THEN 10
    WHEN f.feature_code IN ('document_versioning', 'advanced_search') THEN 0
    -- Notifications
    WHEN f.feature_code = 'email_notifications' THEN 100
    WHEN f.feature_code = 'push_notifications' THEN 50
    WHEN f.feature_code IN ('sms_notifications', 'slack_integration', 'in_app_chat', 'notification_templates') THEN 0
    -- Integrations - limited
    WHEN f.feature_code = 'api_key_management' THEN 2
    WHEN f.category = 'integrations' THEN 0
    -- Enterprise - none
    WHEN f.category = 'enterprise' THEN 0
    -- Support - limited
    WHEN f.feature_code = 'priority_support' THEN 0
    WHEN f.category = 'support' THEN 0
    -- Compliance
    WHEN f.feature_code = 'audit_log_export' THEN 1
    WHEN f.category = 'compliance' THEN 0
    -- Backup
    WHEN f.feature_code = 'daily_backup' THEN 1
    WHEN f.category = 'backup' THEN 0
    ELSE 0
  END,
  'monthly'::limit_period_type,
  CASE 
    WHEN f.category IN ('enterprise', 'support') THEN 0
    WHEN f.category = 'security' THEN 150.00
    WHEN f.category = 'advanced_reporting' THEN 100.00
    ELSE 75.00
  END,
  CASE 
    WHEN f.category IN ('enterprise') THEN 'hard'::lock_mode_type
    WHEN f.feature_code IN ('sso_saml', 'ip_whitelist', 'support_sessions') THEN 'hard'::lock_mode_type
    WHEN f.feature_code IN ('ai_analytics', 'report_builder', 'workflow_automation') THEN 'hard'::lock_mode_type
    WHEN f.feature_code IN ('dedicated_account_manager', 'sla_guarantee', 'custom_training', 'business_reviews') THEN 'hard'::lock_mode_type
    ELSE 'soft'::lock_mode_type
  END,
  TRUE,
  FALSE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'BASIC'
  AND f.feature_code NOT IN (SELECT feature_code FROM plan_feature_controls WHERE plan_id = p.id)
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- STANDARD PLAN - Most features available
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible, requires_approval)
SELECT p.id, f.feature_code,
  CASE 
    -- Security - good limits
    WHEN f.feature_code = 'concurrent_sessions' THEN 5
    WHEN f.feature_code IN ('session_timeout_control', 'mfa_authentication', 'password_policy', 'login_lockout') THEN -1
    WHEN f.feature_code = 'support_sessions' THEN 2
    WHEN f.feature_code IN ('ip_whitelist', 'sso_saml') THEN 0
    -- RBAC - good limits
    WHEN f.feature_code = 'custom_role_creation' THEN 20
    WHEN f.feature_code = 'role_cloning' THEN 20
    WHEN f.feature_code = 'approval_levels' THEN 5
    WHEN f.feature_code = 'permission_audit' THEN -1
    WHEN f.feature_code IN ('temporary_roles', 'delegation_rules') THEN 5
    -- Advanced workflow - available
    WHEN f.feature_code = 'recurring_tasks' THEN 50
    WHEN f.feature_code = 'task_templates' THEN 20
    WHEN f.feature_code = 'task_auto_assignment' THEN 20
    WHEN f.feature_code = 'task_escalation' THEN 20
    WHEN f.feature_code = 'sla_management' THEN 5
    WHEN f.feature_code = 'workflow_automation' THEN 10
    -- Advanced finance - available
    WHEN f.feature_code IN ('multi_currency', 'cost_centers', 'budget_management', 'expense_categories') THEN -1
    WHEN f.feature_code = 'approval_bypass_audit' THEN -1
    -- Advanced reporting - good limits
    WHEN f.feature_code = 'custom_dashboards' THEN 10
    WHEN f.feature_code = 'kpi_analytics' THEN -1
    WHEN f.feature_code = 'scheduled_reports' THEN 10
    WHEN f.feature_code = 'report_sharing' THEN 20
    WHEN f.feature_code IN ('report_builder', 'ai_analytics') THEN 0
    -- Documents - good limits
    WHEN f.feature_code = 'ocr_extraction' THEN 100
    WHEN f.feature_code = 'bulk_upload' THEN 50
    WHEN f.feature_code = 'document_versioning' THEN 100
    WHEN f.feature_code = 'advanced_search' THEN -1
    -- Notifications - good limits
    WHEN f.feature_code = 'email_notifications' THEN 500
    WHEN f.feature_code = 'push_notifications' THEN 500
    WHEN f.feature_code = 'sms_notifications' THEN 50
    WHEN f.feature_code = 'slack_integration' THEN 1
    WHEN f.feature_code = 'in_app_chat' THEN -1
    WHEN f.feature_code = 'notification_templates' THEN 10
    -- Integrations - limited
    WHEN f.feature_code = 'api_key_management' THEN 5
    WHEN f.feature_code = 'realtime_websocket' THEN 1
    WHEN f.feature_code IN ('custom_integrations', 'api_rate_limit_override', 'data_export_api') THEN 0
    -- Enterprise - limited
    WHEN f.feature_code = 'sandbox_environment' THEN 1
    WHEN f.category = 'enterprise' THEN 0
    -- Support - basic
    WHEN f.feature_code = 'priority_support' THEN 1
    WHEN f.category = 'support' THEN 0
    -- Compliance - available
    WHEN f.feature_code = 'audit_log_export' THEN 10
    WHEN f.feature_code = 'compliance_reports' THEN 5
    WHEN f.feature_code = 'gdpr_tools' THEN 1
    WHEN f.feature_code IN ('extended_retention', 'sox_compliance') THEN 0
    -- Backup - good
    WHEN f.feature_code IN ('daily_backup', 'hourly_backup') THEN -1
    WHEN f.feature_code IN ('point_in_time_recovery', 'cross_region_backup') THEN 0
    ELSE 0
  END,
  'monthly'::limit_period_type,
  CASE 
    WHEN f.category IN ('enterprise') THEN 0
    WHEN f.category = 'security' THEN 100.00
    WHEN f.category = 'advanced_reporting' THEN 75.00
    ELSE 50.00
  END,
  CASE 
    WHEN f.feature_code IN ('multi_entity', 'white_label', 'custom_domain', 'dedicated_infrastructure', 'on_premise_deployment', 'data_residency') THEN 'hard'::lock_mode_type
    WHEN f.feature_code IN ('sso_saml', 'ip_whitelist') THEN 'soft'::lock_mode_type
    WHEN f.feature_code IN ('dedicated_account_manager', 'custom_training', 'business_reviews') THEN 'hard'::lock_mode_type
    ELSE 'none'::lock_mode_type
  END,
  TRUE,
  FALSE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'STANDARD'
  AND f.feature_code NOT IN (SELECT feature_code FROM plan_feature_controls WHERE plan_id = p.id)
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- PREMIUM PLAN - Almost everything available
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible, requires_approval)
SELECT p.id, f.feature_code,
  CASE 
    -- Most features unlimited
    WHEN f.feature_code = 'concurrent_sessions' THEN 10
    WHEN f.category IN ('security', 'rbac', 'advanced_workflow', 'advanced_finance', 'advanced_reporting', 'documents', 'notifications', 'compliance', 'backup') THEN -1
    -- Integrations - good limits
    WHEN f.feature_code IN ('custom_integrations', 'api_rate_limit_override', 'data_export_api', 'api_key_management', 'realtime_websocket') THEN -1
    -- Enterprise - limited
    WHEN f.feature_code = 'sandbox_environment' THEN 2
    WHEN f.feature_code IN ('multi_entity', 'white_label', 'custom_domain', 'dedicated_infrastructure', 'on_premise_deployment', 'data_residency') THEN 0
    -- Support - good
    WHEN f.feature_code = 'priority_support' THEN -1
    WHEN f.feature_code = 'sla_guarantee' THEN 1
    WHEN f.feature_code IN ('dedicated_account_manager', 'custom_training', 'business_reviews') THEN 0
    ELSE -1
  END,
  'monthly'::limit_period_type,
  25.00,
  CASE 
    WHEN f.feature_code IN ('multi_entity', 'white_label', 'custom_domain', 'dedicated_infrastructure', 'on_premise_deployment', 'data_residency') THEN 'soft'::lock_mode_type
    WHEN f.feature_code IN ('dedicated_account_manager', 'custom_training', 'business_reviews') THEN 'soft'::lock_mode_type
    ELSE 'none'::lock_mode_type
  END,
  TRUE,
  FALSE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'PREMIUM'
  AND f.feature_code NOT IN (SELECT feature_code FROM plan_feature_controls WHERE plan_id = p.id)
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- ENTERPRISE PLAN - Everything unlimited
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible, requires_approval)
SELECT p.id, f.feature_code,
  -1,  -- Unlimited
  'monthly'::limit_period_type,
  0,   -- No unlock price needed
  'none'::lock_mode_type,
  TRUE,
  FALSE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'ENTERPRISE'
  AND f.feature_code NOT IN (SELECT feature_code FROM plan_feature_controls WHERE plan_id = p.id)
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- ============================================================================
-- 3. ADD NEW INFRASTRUCTURE BILLING RATES
-- ============================================================================

INSERT INTO infrastructure_billing_rates (resource_type, resource_name, price_per_unit, unit_type, currency, billing_method, minimum_charge, is_active) VALUES
('ocr_scans', 'OCR Document Scans', 2.00, 'per scan', 'INR', 'metered', 0, TRUE),
('sms_messages', 'SMS Notifications', 0.50, 'per message', 'INR', 'metered', 0, TRUE),
('ai_tokens', 'AI Analytics Tokens', 0.01, 'per 1000 tokens', 'INR', 'metered', 0, TRUE),
('websocket_connections', 'WebSocket Connections', 100.00, 'per 1000 connection-hours', 'INR', 'metered', 0, TRUE),
('support_hours', 'Support Session Hours', 500.00, 'per hour', 'INR', 'metered', 0, TRUE),
('backup_storage', 'Backup Storage', 3.00, 'per GB', 'INR', 'metered', 0, TRUE)
ON CONFLICT (resource_type) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  price_per_unit = EXCLUDED.price_per_unit,
  unit_type = EXCLUDED.unit_type;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after migration to verify:
-- SELECT category, COUNT(*) as feature_count 
-- FROM master_feature_definitions 
-- GROUP BY category 
-- ORDER BY category;
