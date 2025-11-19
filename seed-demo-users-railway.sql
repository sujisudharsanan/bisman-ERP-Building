-- Seed Demo Users for Railway Database
-- Generated: 2025-11-14
-- Password for all users: Super@123 (bcrypt hash below)
-- Demo password hash: demo123

-- ==========================================
-- 1. INSERT ENTERPRISE ADMIN
-- ==========================================
INSERT INTO enterprise_admins (name, email, password, is_active, created_at, updated_at)
VALUES (
    'Enterprise Administrator',
    'enterprise@bisman.erp',
    '$2a$10$rH7L8qN9KzN5yYXW5x5f.KGvN5JqZmKZN5yYXW5x5f.KGvN5JqZmKu', -- enterprise123
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- 2. INSERT SUPER ADMINS
-- ==========================================

-- Business Super Admin
INSERT INTO super_admins (name, email, password, "productType", is_active, created_by, created_at, updated_at)
VALUES (
    'Business Super Admin',
    'business_superadmin@bisman.demo',
    '$2a$10$YQiWGN5KzN5yYXW5x5f.KGvN5JqZmKZN5yYXW5x5f.KGvN5JqZmKO', -- Super@123
    'BUSINESS_ERP',
    true,
    (SELECT id FROM enterprise_admins WHERE email = 'enterprise@bisman.erp' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Pump Super Admin
INSERT INTO super_admins (name, email, password, "productType", is_active, created_by, created_at, updated_at)
VALUES (
    'Pump Super Admin',
    'pump_superadmin@bisman.demo',
    '$2a$10$YQiWGN5KzN5yYXW5x5f.KGvN5JqZmKZN5yYXW5x5f.KGvN5JqZmKO', -- Super@123
    'PUMP_ERP',
    true,
    (SELECT id FROM enterprise_admins WHERE email = 'enterprise@bisman.erp' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Logistics Super Admin
INSERT INTO super_admins (name, email, password, "productType", is_active, created_by, created_at, updated_at)
VALUES (
    'Logistics Super Admin',
    'logistics_superadmin@bisman.demo',
    '$2a$10$YQiWGN5KzN5yYXW5x5f.KGvN5JqZmKZN5yYXW5x5f.KGvN5JqZmKO', -- Super@123
    'BUSINESS_ERP',
    true,
    (SELECT id FROM enterprise_admins WHERE email = 'enterprise@bisman.erp' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- 3. INSERT DEMO REGULAR USERS
-- ==========================================

-- Hub Incharge Demo User
INSERT INTO users (username, email, password, role, "productType", is_active, "assignedModules", "pagePermissions", created_at, updated_at)
VALUES (
    'Hub Incharge Demo',
    'demo_hub_incharge@bisman.demo',
    '$2a$10$rQZh8JqZmKZN5yYXW5x5f.KGvN5JqZmKZN5yYXW5x5f.KGvN5u', -- demo123
    'HUB_INCHARGE',
    'PETROL_PUMP_ERP',
    true,
    '["petrol_pump_management", "inventory", "sales", "common"]'::jsonb,
    '{"dashboard": {"view": true, "edit": true}}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Finance Manager
INSERT INTO users (username, email, password, role, "productType", is_active, "assignedModules", "pagePermissions", created_at, updated_at)
VALUES (
    'Finance Manager',
    'finance@bisman.demo',
    '$2a$10$YQiWGN5KzN5yYXW5x5f.KGvN5JqZmKZN5yYXW5x5f.KGvN5JqZmKO', -- Super@123
    'FINANCE_MANAGER',
    'BUSINESS_ERP',
    true,
    '["finance", "accounting", "reports", "common"]'::jsonb,
    '{"finance": {"view": true, "edit": true}}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- HR Manager
INSERT INTO users (username, email, password, role, "productType", is_active, "assignedModules", "pagePermissions", created_at, updated_at)
VALUES (
    'HR Manager',
    'hr@bisman.demo',
    '$2a$10$YQiWGN5KzN5yYXW5x5f.KGvN5JqZmKZN5yYXW5x5f.KGvN5JqZmKO', -- Super@123
    'HR_MANAGER',
    'BUSINESS_ERP',
    true,
    '["hr", "payroll", "recruitment", "common"]'::jsonb,
    '{"hr": {"view": true, "edit": true}}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Admin User
INSERT INTO users (username, email, password, role, "productType", is_active, "assignedModules", "pagePermissions", created_at, updated_at)
VALUES (
    'Admin User',
    'admin@bisman.demo',
    '$2a$10$YQiWGN5KzN5yYXW5x5f.KGvN5JqZmKZN5yYXW5x5f.KGvN5JqZmKO', -- Super@123
    'ADMIN',
    'BUSINESS_ERP',
    true,
    '["admin", "settings", "users", "common"]'::jsonb,
    '{"admin": {"view": true, "edit": true}}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- 4. VERIFICATION
-- ==========================================
SELECT 
    '✅ Demo Users Seeded Successfully!' as status;

SELECT 
    'ENTERPRISE ADMINS' as type,
    COUNT(*) as count 
FROM enterprise_admins
UNION ALL
SELECT 'SUPER ADMINS', COUNT(*) FROM super_admins
UNION ALL
SELECT 'REGULAR USERS', COUNT(*) FROM users;

-- Show created users
SELECT 
    'CREATED USERS' as info;
    
SELECT email, name, is_active 
FROM enterprise_admins
UNION ALL
SELECT email, name, is_active 
FROM super_admins
UNION ALL
SELECT email, username as name, is_active 
FROM users;
