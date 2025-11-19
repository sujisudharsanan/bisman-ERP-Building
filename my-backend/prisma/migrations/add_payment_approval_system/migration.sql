-- Add payment approval system tables
-- Generated: 2025-11-01

-- PaymentRequest table
CREATE TABLE "payment_requests" (
  "id" TEXT NOT NULL,
  "requestId" VARCHAR(100) NOT NULL,
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
  CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_requests_requestId_unique" UNIQUE ("requestId"),
  CONSTRAINT "payment_requests_paymentToken_unique" UNIQUE ("paymentToken"),
  CONSTRAINT "payment_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id"),
  CONSTRAINT "payment_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_payment_requests_request_id" ON "payment_requests"("requestId");
CREATE INDEX "idx_payment_requests_client" ON "payment_requests"("clientId");
CREATE INDEX "idx_payment_requests_status" ON "payment_requests"("status");
CREATE INDEX "idx_payment_requests_creator" ON "payment_requests"("createdById");
CREATE INDEX "idx_payment_requests_token" ON "payment_requests"("paymentToken");

-- PaymentRequestLineItem table
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
  CONSTRAINT "payment_request_line_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_request_line_items_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_line_items_payment_request" ON "payment_request_line_items"("paymentRequestId");

-- Expense table
CREATE TABLE "expenses" (
  "id" TEXT NOT NULL,
  "requestId" VARCHAR(100) NOT NULL,
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
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expenses_requestId_unique" UNIQUE ("requestId"),
  CONSTRAINT "expenses_paymentRequestId_unique" UNIQUE ("paymentRequestId"),
  CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id"),
  CONSTRAINT "expenses_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_expenses_request_id" ON "expenses"("requestId");
CREATE INDEX "idx_expenses_payment_request" ON "expenses"("paymentRequestId");
CREATE INDEX "idx_expenses_creator" ON "expenses"("createdById");
CREATE INDEX "idx_expenses_status" ON "expenses"("status");

-- Task table
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
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tasks_expenseId_unique" UNIQUE ("expenseId"),
  CONSTRAINT "tasks_paymentRequestId_unique" UNIQUE ("paymentRequestId"),
  CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id"),
  CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "tasks_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE,
  CONSTRAINT "tasks_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_tasks_expense" ON "tasks"("expenseId");
CREATE INDEX "idx_tasks_payment_request" ON "tasks"("paymentRequestId");
CREATE INDEX "idx_tasks_assignee" ON "tasks"("assigneeId");
CREATE INDEX "idx_tasks_status" ON "tasks"("status");
CREATE INDEX "idx_tasks_level" ON "tasks"("currentLevel");

-- Approval table
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
  CONSTRAINT "approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approvals_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id")
);

CREATE INDEX "idx_approvals_task" ON "approvals"("taskId");
CREATE INDEX "idx_approvals_approver" ON "approvals"("approverId");
CREATE INDEX "idx_approvals_level" ON "approvals"("level");

-- Message table
CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "senderId" INTEGER NOT NULL,
  "body" TEXT,
  "attachments" JSONB,
  "type" VARCHAR(50) NOT NULL DEFAULT 'TEXT',
  "meta" JSONB,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messages_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id")
);

CREATE INDEX "idx_messages_task" ON "messages"("taskId");
CREATE INDEX "idx_messages_sender" ON "messages"("senderId");
CREATE INDEX "idx_messages_type" ON "messages"("type");

-- PaymentRecord table
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
  CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_records_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "payment_records_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_payment_records_task" ON "payment_records"("taskId");
CREATE INDEX "idx_payment_records_payment_request" ON "payment_records"("paymentRequestId");
CREATE INDEX "idx_payment_records_paid_by" ON "payment_records"("paidById");
CREATE INDEX "idx_payment_records_transaction" ON "payment_records"("transactionId");

-- ApprovalLevel table
CREATE TABLE "approval_levels" (
  "id" SERIAL NOT NULL,
  "level" INTEGER NOT NULL,
  "levelName" VARCHAR(100) NOT NULL,
  "roleName" VARCHAR(100) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_levels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_levels_level_unique" UNIQUE ("level")
);

CREATE INDEX "idx_approval_levels_level" ON "approval_levels"("level");

-- PaymentActivityLog table
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
  CONSTRAINT "payment_activity_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_activity_logs_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE,
  CONSTRAINT "payment_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_activity_logs_payment_request" ON "payment_activity_logs"("paymentRequestId");
CREATE INDEX "idx_activity_logs_user" ON "payment_activity_logs"("userId");
CREATE INDEX "idx_activity_logs_action" ON "payment_activity_logs"("action");

-- Seed approval levels
INSERT INTO "approval_levels" ("level", "levelName", "roleName", "sortOrder", "isActive")
VALUES
  (0, 'L1 Manager', 'HUB_INCHARGE', 0, true),
  (1, 'L2 Senior Manager', 'REGIONAL_MANAGER', 1, true),
  (2, 'Finance Department', 'FINANCE_CONTROLLER', 2, true),
  (3, 'Banker', 'BANKER', 3, true);
