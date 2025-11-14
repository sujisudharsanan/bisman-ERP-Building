-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "productType" VARCHAR(50) DEFAULT 'BUSINESS_ERP',
    "tenant_id" UUID,
    "super_admin_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "profile_pic_url" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "assignedModules" JSONB,
    "pagePermissions" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(50) NOT NULL,
    "table_name" VARCHAR(100),
    "record_id" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "session_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_history" (
    "id" SERIAL NOT NULL,
    "migration_name" VARCHAR(255) NOT NULL,
    "applied_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "applied_by" VARCHAR(100) DEFAULT CURRENT_USER,
    "backup_file" TEXT,
    "checksum" TEXT,

    CONSTRAINT "migration_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_actions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "display_name" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "rbac_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER,
    "action_id" INTEGER,
    "route_id" INTEGER,
    "granted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(200),
    "display_name" VARCHAR(250),
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "rbac_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "level" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "display_name" VARCHAR(150),
    "status" VARCHAR(20) DEFAULT 'active',

    CONSTRAINT "rbac_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_routes" (
    "id" SERIAL NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "method" VARCHAR(10) DEFAULT 'GET',
    "module" VARCHAR(50),
    "is_protected" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "display_name" VARCHAR(200),
    "is_active" BOOLEAN DEFAULT true,
    "is_menu_item" BOOLEAN DEFAULT true,
    "icon" VARCHAR(100),
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "rbac_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER,
    "assigned_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "expires_at" TIMESTAMP(6),

    CONSTRAINT "rbac_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_user_permissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "page_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rbac_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recent_activity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" INTEGER,
    "username" VARCHAR(255),
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recent_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" SERIAL NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "method" VARCHAR(10) DEFAULT 'GET',
    "module" VARCHAR(50),
    "is_protected" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "last_activity_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_admins" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "profile_pic_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "productType" VARCHAR(50) NOT NULL,
    "profile_pic_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "productType" VARCHAR(50) NOT NULL,
    "super_admin_id" INTEGER NOT NULL,
    "subscriptionPlan" VARCHAR(50) NOT NULL DEFAULT 'free',
    "subscriptionStatus" VARCHAR(50) NOT NULL DEFAULT 'active',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "logo" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "module_name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "route" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(100),
    "productType" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "module_id" INTEGER NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_assignments" (
    "id" SERIAL NOT NULL,
    "super_admin_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "page_permissions" JSONB,

    CONSTRAINT "module_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_requests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "clientId" UUID,
    "clientName" VARCHAR(200) NOT NULL,
    "clientEmail" VARCHAR(150),
    "clientPhone" VARCHAR(50),
    "subtotal" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "description" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(6),
    "invoiceNumber" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "attachments" JSONB,
    "paymentToken" TEXT,
    "paymentLinkSentAt" TIMESTAMP(6),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_request_line_items" (
    "id" SERIAL NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" VARCHAR(50) DEFAULT 'unit',
    "rate" DECIMAL(18,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payment_request_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "clientId" UUID,
    "description" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "dueDate" TIMESTAMP(6),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "attachments" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "createdById" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "levelName" VARCHAR(100) NOT NULL,
    "approverId" INTEGER NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "comment" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "body" TEXT,
    "attachments" JSONB,
    "type" VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    "meta" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "paidById" INTEGER,
    "paymentMode" VARCHAR(100),
    "paymentGateway" VARCHAR(100),
    "transactionId" VARCHAR(255),
    "details" JSONB,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "paidAt" TIMESTAMP(6),
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_levels" (
    "id" SERIAL NOT NULL,
    "level" INTEGER NOT NULL,
    "levelName" VARCHAR(100) NOT NULL,
    "roleName" VARCHAR(100) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvalLimit" DECIMAL(15,2),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approver_configurations" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "approvalLimit" DECIMAL(15,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "autoAssign" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxConcurrentTasks" INTEGER DEFAULT 10,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approver_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approver_selection_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "paymentRequestId" TEXT,
    "level" INTEGER NOT NULL,
    "selectedApproverId" INTEGER NOT NULL,
    "requestedApprovers" JSONB,
    "availableApprovers" JSONB,
    "selectionMethod" VARCHAR(50) NOT NULL,
    "paymentAmount" DECIMAL(15,2),
    "approverWorkload" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approver_selection_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_activity_logs" (
    "id" SERIAL NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "userId" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "oldStatus" VARCHAR(50),
    "newStatus" VARCHAR(50),
    "comment" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_tenant" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_users_product_type" ON "users"("productType");

-- CreateIndex
CREATE INDEX "idx_users_super_admin" ON "users"("super_admin_id");

-- CreateIndex
CREATE INDEX "idx_users_active" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "actions_name_key" ON "actions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "migration_history_migration_name_key" ON "migration_history"("migration_name");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_actions_name_key" ON "rbac_actions"("name");

-- CreateIndex
CREATE INDEX "idx_rbac_permissions_action_id" ON "rbac_permissions"("action_id");

-- CreateIndex
CREATE INDEX "idx_rbac_permissions_active" ON "rbac_permissions"("is_active");

-- CreateIndex
CREATE INDEX "idx_rbac_permissions_name" ON "rbac_permissions"("name");

-- CreateIndex
CREATE INDEX "idx_rbac_permissions_role_id" ON "rbac_permissions"("role_id");

-- CreateIndex
CREATE INDEX "idx_rbac_permissions_route_id" ON "rbac_permissions"("route_id");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_permissions_role_id_action_id_route_id_key" ON "rbac_permissions"("role_id", "action_id", "route_id");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_roles_name_key" ON "rbac_roles"("name");

-- CreateIndex
CREATE INDEX "idx_rbac_routes_active" ON "rbac_routes"("is_active");

-- CreateIndex
CREATE INDEX "idx_rbac_routes_menu" ON "rbac_routes"("is_menu_item");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_routes_path_method_key" ON "rbac_routes"("path", "method");

-- CreateIndex
CREATE INDEX "idx_rbac_user_roles_active" ON "rbac_user_roles"("is_active");

-- CreateIndex
CREATE INDEX "idx_rbac_user_roles_role_id" ON "rbac_user_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_rbac_user_roles_user_id" ON "rbac_user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_user_roles_user_id_role_id_key" ON "rbac_user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "idx_user_permissions_user_id" ON "rbac_user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_user_permissions_user_id_page_key_key" ON "rbac_user_permissions"("user_id", "page_key");

-- CreateIndex
CREATE INDEX "idx_recent_activity_created_at" ON "recent_activity"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_recent_activity_entity" ON "recent_activity"("entity");

-- CreateIndex
CREATE INDEX "idx_recent_activity_user_id" ON "recent_activity"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "routes_path_method_key" ON "routes"("path", "method");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "idx_user_sessions_token" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "idx_user_sessions_user" ON "user_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "enterprise_admins_email_key" ON "enterprise_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "idx_super_admins_product_type" ON "super_admins"("productType");

-- CreateIndex
CREATE INDEX "idx_super_admins_created_by" ON "super_admins"("created_by");

-- CreateIndex
CREATE INDEX "idx_clients_super_admin" ON "clients"("super_admin_id");

-- CreateIndex
CREATE INDEX "idx_clients_product_type" ON "clients"("productType");

-- CreateIndex
CREATE UNIQUE INDEX "modules_module_name_key" ON "modules"("module_name");

-- CreateIndex
CREATE INDEX "idx_modules_product_type" ON "modules"("productType");

-- CreateIndex
CREATE INDEX "idx_modules_active" ON "modules"("is_active");

-- CreateIndex
CREATE INDEX "idx_permissions_role" ON "permissions"("role");

-- CreateIndex
CREATE INDEX "idx_permissions_module" ON "permissions"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_role_module_id_key" ON "permissions"("role", "module_id");

-- CreateIndex
CREATE INDEX "idx_module_assignments_super_admin" ON "module_assignments"("super_admin_id");

-- CreateIndex
CREATE INDEX "idx_module_assignments_module" ON "module_assignments"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_assignments_super_admin_id_module_id_key" ON "module_assignments"("super_admin_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_requests_requestId_key" ON "payment_requests"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_requests_paymentToken_key" ON "payment_requests"("paymentToken");

-- CreateIndex
CREATE INDEX "idx_payment_requests_request_id" ON "payment_requests"("requestId");

-- CreateIndex
CREATE INDEX "idx_payment_requests_client" ON "payment_requests"("clientId");

-- CreateIndex
CREATE INDEX "idx_payment_requests_status" ON "payment_requests"("status");

-- CreateIndex
CREATE INDEX "idx_payment_requests_creator" ON "payment_requests"("createdById");

-- CreateIndex
CREATE INDEX "idx_payment_requests_token" ON "payment_requests"("paymentToken");

-- CreateIndex
CREATE INDEX "idx_line_items_payment_request" ON "payment_request_line_items"("paymentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_requestId_key" ON "expenses"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_paymentRequestId_key" ON "expenses"("paymentRequestId");

-- CreateIndex
CREATE INDEX "idx_expenses_request_id" ON "expenses"("requestId");

-- CreateIndex
CREATE INDEX "idx_expenses_payment_request" ON "expenses"("paymentRequestId");

-- CreateIndex
CREATE INDEX "idx_expenses_creator" ON "expenses"("createdById");

-- CreateIndex
CREATE INDEX "idx_expenses_status" ON "expenses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_expenseId_key" ON "tasks"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_paymentRequestId_key" ON "tasks"("paymentRequestId");

-- CreateIndex
CREATE INDEX "idx_tasks_expense" ON "tasks"("expenseId");

-- CreateIndex
CREATE INDEX "idx_tasks_payment_request" ON "tasks"("paymentRequestId");

-- CreateIndex
CREATE INDEX "idx_tasks_assignee" ON "tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tasks_level" ON "tasks"("currentLevel");

-- CreateIndex
CREATE INDEX "idx_approvals_task" ON "approvals"("taskId");

-- CreateIndex
CREATE INDEX "idx_approvals_approver" ON "approvals"("approverId");

-- CreateIndex
CREATE INDEX "idx_approvals_level" ON "approvals"("level");

-- CreateIndex
CREATE INDEX "idx_messages_task" ON "messages"("taskId");

-- CreateIndex
CREATE INDEX "idx_messages_sender" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "idx_messages_type" ON "messages"("type");

-- CreateIndex
CREATE INDEX "idx_payment_records_task" ON "payment_records"("taskId");

-- CreateIndex
CREATE INDEX "idx_payment_records_payment_request" ON "payment_records"("paymentRequestId");

-- CreateIndex
CREATE INDEX "idx_payment_records_paid_by" ON "payment_records"("paidById");

-- CreateIndex
CREATE INDEX "idx_payment_records_transaction" ON "payment_records"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_levels_level_key" ON "approval_levels"("level");

-- CreateIndex
CREATE INDEX "idx_approval_levels_level" ON "approval_levels"("level");

-- CreateIndex
CREATE INDEX "idx_approver_config_user" ON "approver_configurations"("userId");

-- CreateIndex
CREATE INDEX "idx_approver_config_level_active" ON "approver_configurations"("level", "isActive");

-- CreateIndex
CREATE INDEX "idx_approver_config_availability" ON "approver_configurations"("isActive", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "approver_configurations_userId_level_key" ON "approver_configurations"("userId", "level");

-- CreateIndex
CREATE INDEX "idx_selection_log_task" ON "approver_selection_logs"("taskId");

-- CreateIndex
CREATE INDEX "idx_selection_log_approver" ON "approver_selection_logs"("selectedApproverId");

-- CreateIndex
CREATE INDEX "idx_selection_log_level_created" ON "approver_selection_logs"("level", "createdAt");

-- CreateIndex
CREATE INDEX "idx_activity_logs_payment_request" ON "payment_activity_logs"("paymentRequestId");

-- CreateIndex
CREATE INDEX "idx_activity_logs_user" ON "payment_activity_logs"("userId");

-- CreateIndex
CREATE INDEX "idx_activity_logs_action" ON "payment_activity_logs"("action");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac_permissions" ADD CONSTRAINT "rbac_permissions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "rbac_actions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac_permissions" ADD CONSTRAINT "rbac_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "rbac_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac_permissions" ADD CONSTRAINT "rbac_permissions_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "rbac_routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac_user_roles" ADD CONSTRAINT "rbac_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "rbac_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "super_admins" ADD CONSTRAINT "super_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "enterprise_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_assignments" ADD CONSTRAINT "module_assignments_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_assignments" ADD CONSTRAINT "module_assignments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request_line_items" ADD CONSTRAINT "payment_request_line_items_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_configurations" ADD CONSTRAINT "approver_configurations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_selection_logs" ADD CONSTRAINT "approver_selection_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_selection_logs" ADD CONSTRAINT "approver_selection_logs_selectedApproverId_fkey" FOREIGN KEY ("selectedApproverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_activity_logs" ADD CONSTRAINT "payment_activity_logs_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_activity_logs" ADD CONSTRAINT "payment_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

