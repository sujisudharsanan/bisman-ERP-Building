-- Role & User Privilege Management Schema
-- Production-ready PostgreSQL schema following international standards

-- Features/Modules table - represents application features that can have permissions
CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_features_name_module UNIQUE (name, module)
);

-- Role privileges table - defines what each role can do for each feature
CREATE TABLE IF NOT EXISTS role_privileges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id INT NOT NULL,
    feature_id UUID NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_hide BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_role_privileges_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_privileges_feature FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
    CONSTRAINT uk_role_privileges_role_feature UNIQUE (role_id, feature_id)
);

-- User privileges table - allows user-specific overrides of role defaults
CREATE TABLE IF NOT EXISTS user_privileges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL,
    role_id INT NOT NULL, -- For audit trail
    feature_id UUID NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_hide BOOLEAN NOT NULL DEFAULT false,
    overrides_role BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_user_privileges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_privileges_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_privileges_feature FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_privileges_user_feature UNIQUE (user_id, feature_id)
);

-- Audit log table for tracking privilege changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('ROLE_PRIVILEGE', 'USER_PRIVILEGE', 'ROLE', 'USER', 'FEATURE')),
    entity_id VARCHAR(255) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_features_module ON features(module);
CREATE INDEX IF NOT EXISTS idx_features_active ON features(is_active);
CREATE INDEX IF NOT EXISTS idx_role_privileges_role ON role_privileges(role_id);
CREATE INDEX IF NOT EXISTS idx_role_privileges_feature ON role_privileges(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_privileges_user ON user_privileges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privileges_feature ON user_privileges(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_privileges_overrides ON user_privileges(overrides_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS trigger_features_updated_at ON features;
CREATE TRIGGER trigger_features_updated_at
    BEFORE UPDATE ON features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_role_privileges_updated_at ON role_privileges;
CREATE TRIGGER trigger_role_privileges_updated_at
    BEFORE UPDATE ON role_privileges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_privileges_updated_at ON user_privileges;
CREATE TRIGGER trigger_user_privileges_updated_at
    BEFORE UPDATE ON user_privileges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default features for ERP system
INSERT INTO features (name, module, description) VALUES
-- User Management Module
('User List', 'User Management', 'View and browse user accounts'),
('User Create', 'User Management', 'Create new user accounts'),
('User Edit', 'User Management', 'Modify existing user details'),
('User Delete', 'User Management', 'Remove user accounts'),
('User Roles', 'User Management', 'Assign and manage user roles'),
('User Import', 'User Management', 'Bulk import users from files'),
('User Export', 'User Management', 'Export user data'),

-- Inventory Management Module
('Product List', 'Inventory', 'View product catalog and inventory'),
('Product Create', 'Inventory', 'Add new products to inventory'),
('Product Edit', 'Inventory', 'Modify product information'),
('Product Delete', 'Inventory', 'Remove products from catalog'),
('Stock Management', 'Inventory', 'Manage stock levels and movements'),
('Inventory Reports', 'Inventory', 'Generate inventory reports'),
('Barcode Management', 'Inventory', 'Manage product barcodes'),

-- Sales Management Module
('Sales Dashboard', 'Sales', 'View sales analytics and KPIs'),
('Create Orders', 'Sales', 'Create new sales orders'),
('Edit Orders', 'Sales', 'Modify existing sales orders'),
('Delete Orders', 'Sales', 'Cancel or remove sales orders'),
('Sales Reports', 'Sales', 'Generate sales performance reports'),
('Customer Management', 'Sales', 'Manage customer information'),
('Quotation Management', 'Sales', 'Create and manage sales quotations'),

-- Financial Management Module
('Financial Dashboard', 'Finance', 'View financial overview and metrics'),
('Invoice Management', 'Finance', 'Create and manage invoices'),
('Payment Processing', 'Finance', 'Process and track payments'),
('Financial Reports', 'Finance', 'Generate financial statements'),
('Tax Management', 'Finance', 'Calculate and manage taxes'),
('Budget Planning', 'Finance', 'Create and manage budgets'),
('Expense Tracking', 'Finance', 'Track business expenses'),

-- Human Resources Module
('Employee Management', 'HR', 'Manage employee records'),
('Payroll Processing', 'HR', 'Process employee payroll'),
('Attendance Tracking', 'HR', 'Track employee attendance'),
('Leave Management', 'HR', 'Manage employee leave requests'),
('Performance Reviews', 'HR', 'Conduct employee evaluations'),
('Training Management', 'HR', 'Manage employee training programs'),

-- System Administration Module
('System Settings', 'Administration', 'Configure application settings'),
('Backup Management', 'Administration', 'Manage system backups'),
('Audit Logs', 'Administration', 'View system audit trails'),
('System Health', 'Administration', 'Monitor system performance'),
('Database Management', 'Administration', 'Manage database operations'),
('Security Settings', 'Administration', 'Configure security policies'),
('Integration Management', 'Administration', 'Manage third-party integrations'),

-- Reporting Module
('Custom Reports', 'Reporting', 'Create custom business reports'),
('Scheduled Reports', 'Reporting', 'Schedule automated reports'),
('Report Templates', 'Reporting', 'Manage report templates'),
('Data Export', 'Reporting', 'Export data in various formats'),
('Dashboard Builder', 'Reporting', 'Build custom dashboards'),

-- Communication Module
('Email Notifications', 'Communication', 'Send email notifications'),
('SMS Notifications', 'Communication', 'Send SMS notifications'),
('Message Templates', 'Communication', 'Manage communication templates'),
('Notification History', 'Communication', 'View notification logs'),

-- API Management Module
('API Keys', 'API', 'Manage API access keys'),
('API Logs', 'API', 'View API usage logs'),
('API Documentation', 'API', 'Access API documentation'),
('Webhook Management', 'API', 'Configure webhooks')

ON CONFLICT (name, module) DO NOTHING;

-- Create a function to get privilege summary for a role
CREATE OR REPLACE FUNCTION get_role_privilege_summary(role_id_param INT)
RETURNS TABLE (
    module VARCHAR,
    total_features BIGINT,
    granted_view BIGINT,
    granted_create BIGINT,
    granted_edit BIGINT,
    granted_delete BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.module,
        COUNT(*) as total_features,
        SUM(CASE WHEN rp.can_view THEN 1 ELSE 0 END) as granted_view,
        SUM(CASE WHEN rp.can_create THEN 1 ELSE 0 END) as granted_create,
        SUM(CASE WHEN rp.can_edit THEN 1 ELSE 0 END) as granted_edit,
        SUM(CASE WHEN rp.can_delete THEN 1 ELSE 0 END) as granted_delete
    FROM features f
    LEFT JOIN role_privileges rp ON f.id = rp.feature_id AND rp.role_id = role_id_param
    WHERE f.is_active = true
    GROUP BY f.module
    ORDER BY f.module;
END;
$$ LANGUAGE plpgsql;

-- Create a function to sync user privileges when role privileges change
CREATE OR REPLACE FUNCTION sync_user_privileges_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be used to automatically update user privileges
    -- when role privileges change, if business logic requires it
    -- For now, it's a placeholder for future functionality
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE features IS 'Application features that can have permissions assigned';
COMMENT ON TABLE role_privileges IS 'Permissions granted to roles for specific features';
COMMENT ON TABLE user_privileges IS 'User-specific permission overrides that supersede role defaults';
COMMENT ON TABLE audit_logs IS 'Audit trail for all privilege-related changes';

COMMENT ON COLUMN features.module IS 'Logical grouping of related features (e.g., User Management, Sales)';
COMMENT ON COLUMN role_privileges.can_view IS 'Permission to view/read the feature';
COMMENT ON COLUMN role_privileges.can_create IS 'Permission to create new records';
COMMENT ON COLUMN role_privileges.can_edit IS 'Permission to modify existing records';
COMMENT ON COLUMN role_privileges.can_delete IS 'Permission to delete records';
COMMENT ON COLUMN role_privileges.can_hide IS 'Permission to hide the feature from UI';
COMMENT ON COLUMN user_privileges.overrides_role IS 'Indicates if this user privilege overrides the role default';
