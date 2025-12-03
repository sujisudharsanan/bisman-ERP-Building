-- CreateTable: Admin Role Assignments
-- Unified table for Enterprise Admin, Super Admin, and Admin role allocations

CREATE TABLE IF NOT EXISTS "admin_role_assignments" (
    "id" SERIAL NOT NULL,
    "assigner_type" VARCHAR(50) NOT NULL,
    "assigner_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assignee_type" VARCHAR(50),
    "assignee_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_role_assign_assigner" ON "admin_role_assignments"("assigner_type", "assigner_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_role_assign_role" ON "admin_role_assignments"("role_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_role_assign_assignee" ON "admin_role_assignments"("assignee_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_role_assign_active" ON "admin_role_assignments"("is_active");

-- CreateUniqueIndex (for upsert operations)
CREATE UNIQUE INDEX IF NOT EXISTS "admin_role_assignments_assigner_type_assigner_id_role_id_assignee_type_assignee_id_key" 
ON "admin_role_assignments"("assigner_type", "assigner_id", "role_id", COALESCE("assignee_type", 'ALL'), COALESCE("assignee_id", 0));
