-- ============================================================================
-- P0 FIX: Smart Approver Selection & Enterprise Admin Escalation
-- ============================================================================
-- 
-- Migration: Add support for:
-- 1. Per-approver configuration (approval limits, availability)
-- 2. Enterprise Admin level (L4)
-- 3. Workload tracking
--
-- Date: November 2, 2025
-- ============================================================================

-- 1. Create ApproverConfiguration table for per-approver settings
CREATE TABLE IF NOT EXISTS "ApproverConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "approvalLimit" DECIMAL(15,2),  -- Maximum amount this approver can handle
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,  -- For leave/unavailability tracking
    "autoAssign" BOOLEAN NOT NULL DEFAULT true,   -- Include in auto-assignment pool
    "priority" INTEGER DEFAULT 0,                  -- Higher priority gets assigned first (for VIP approvers)
    "maxConcurrentTasks" INTEGER DEFAULT 10,       -- Max pending tasks before excluding from assignment
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ApproverConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "ApproverConfiguration_userId_idx" ON "ApproverConfiguration"("userId");
CREATE INDEX IF NOT EXISTS "ApproverConfiguration_level_isActive_idx" ON "ApproverConfiguration"("level", "isActive");
CREATE INDEX IF NOT EXISTS "ApproverConfiguration_isActive_isAvailable_idx" ON "ApproverConfiguration"("isActive", "isAvailable");

-- Unique constraint: One configuration per user per level
CREATE UNIQUE INDEX IF NOT EXISTS "ApproverConfiguration_userId_level_key" ON "ApproverConfiguration"("userId", "level");

-- 2. Update ApprovalLevel table to add Enterprise Admin level (if not exists)
INSERT INTO "ApprovalLevel" ("level", "roleName", "levelName", "approvalLimit", "isActive")
VALUES (3, 'ENTERPRISE_ADMIN', 'Enterprise Admin', 999999999.99, true)
ON CONFLICT ("level") DO UPDATE SET
    "roleName" = EXCLUDED."roleName",
    "levelName" = EXCLUDED."levelName",
    "approvalLimit" = EXCLUDED."approvalLimit",
    "isActive" = EXCLUDED."isActive";

-- 3. Add some sample approver configurations (optional - for testing)
-- Uncomment and modify these based on your actual user IDs

-- Example: Manager with ₹100K limit
-- INSERT INTO "ApproverConfiguration" ("id", "userId", "level", "approvalLimit", "isActive", "priority")
-- VALUES (gen_random_uuid(), 'manager-user-id', 0, 100000, true, 1);

-- Example: Admin with ₹500K limit
-- INSERT INTO "ApproverConfiguration" ("id", "userId", "level", "approvalLimit", "isActive", "priority")
-- VALUES (gen_random_uuid(), 'admin-user-id', 1, 500000, true, 1);

-- Example: Super Admin with ₹5M limit
-- INSERT INTO "ApproverConfiguration" ("id", "userId", "level", "approvalLimit", "isActive", "priority")
-- VALUES (gen_random_uuid(), 'super-admin-user-id', 2, 5000000, true, 1);

-- Example: Enterprise Admin with unlimited approval
-- INSERT INTO "ApproverConfiguration" ("id", "userId", "level", "approvalLimit", "isActive", "priority")
-- VALUES (gen_random_uuid(), 'enterprise-admin-user-id', 3, NULL, true, 1);

-- 4. Create view for approver workload statistics
CREATE OR REPLACE VIEW "ApproverWorkloadStats" AS
SELECT 
    u."id" AS "userId",
    u."username",
    u."email",
    u."role",
    COUNT(CASE WHEN t."status" = 'PENDING' THEN 1 END) AS "pendingTasks",
    COUNT(CASE WHEN a."action" = 'APPROVED' THEN 1 END) AS "totalApproved",
    COUNT(CASE WHEN a."action" = 'REJECTED' THEN 1 END) AS "totalRejected",
    CASE 
        WHEN COUNT(a."id") > 0 THEN 
            ROUND((COUNT(CASE WHEN a."action" = 'APPROVED' THEN 1 END)::numeric / COUNT(a."id")::numeric) * 100, 2)
        ELSE 0 
    END AS "approvalRate"
FROM "User" u
LEFT JOIN "Task" t ON t."assigneeId" = u."id" AND t."status" = 'PENDING'
LEFT JOIN "Approval" a ON a."approverId" = u."id"
WHERE u."role" IN ('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN')
  AND u."is_active" = true
GROUP BY u."id", u."username", u."email", u."role";

-- 5. Add function to get best approver for a level
CREATE OR REPLACE FUNCTION get_best_approver_for_level(
    p_level INTEGER,
    p_amount DECIMAL DEFAULT NULL,
    p_requested_user_ids TEXT[] DEFAULT NULL
) RETURNS TABLE (
    user_id TEXT,
    username TEXT,
    email TEXT,
    pending_tasks INTEGER,
    approval_limit DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u."id",
        u."username",
        u."email",
        COALESCE(COUNT(t."id"), 0)::INTEGER AS pending_tasks,
        ac."approvalLimit"
    FROM "User" u
    LEFT JOIN "ApproverConfiguration" ac ON ac."userId" = u."id" AND ac."level" = p_level AND ac."isActive" = true
    LEFT JOIN "ApprovalLevel" al ON al."level" = p_level AND al."isActive" = true
    LEFT JOIN "Task" t ON t."assigneeId" = u."id" AND t."status" = 'PENDING'
    WHERE u."role" = al."roleName"
      AND u."is_active" = true
      AND (ac."isAvailable" = true OR ac."isAvailable" IS NULL)
      AND (ac."autoAssign" = true OR ac."autoAssign" IS NULL)
      AND (p_amount IS NULL OR ac."approvalLimit" IS NULL OR ac."approvalLimit" >= p_amount)
      AND (p_requested_user_ids IS NULL OR u."id" = ANY(p_requested_user_ids))
    GROUP BY u."id", u."username", u."email", ac."approvalLimit", ac."priority"
    ORDER BY 
        -- Requested users first
        CASE WHEN p_requested_user_ids IS NOT NULL AND u."id" = ANY(p_requested_user_ids) THEN 0 ELSE 1 END,
        -- Then by priority (if configured)
        COALESCE(ac."priority", 0) DESC,
        -- Then by workload (least busy)
        COUNT(t."id") ASC,
        -- Finally by username (for deterministic results)
        u."username" ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Add audit logging for approver selection
CREATE TABLE IF NOT EXISTS "ApproverSelectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT,
    "paymentRequestId" TEXT,
    "level" INTEGER NOT NULL,
    "selectedApproverId" TEXT NOT NULL,
    "requestedApprovers" TEXT[],  -- Array of requested approver IDs
    "availableApprovers" TEXT[],  -- Array of all available approver IDs
    "selectionMethod" TEXT NOT NULL,  -- 'REQUESTED' | 'WORKLOAD_BALANCED' | 'APPROVAL_LIMIT' | 'ESCALATED' | 'FALLBACK'
    "paymentAmount" DECIMAL(15,2),
    "approverWorkload" INTEGER,   -- Pending tasks at time of assignment
    "metadata" JSONB,              -- Additional selection criteria/context
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ApproverSelectionLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApproverSelectionLog_selectedApproverId_fkey" FOREIGN KEY ("selectedApproverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for audit querying
CREATE INDEX IF NOT EXISTS "ApproverSelectionLog_taskId_idx" ON "ApproverSelectionLog"("taskId");
CREATE INDEX IF NOT EXISTS "ApproverSelectionLog_selectedApproverId_idx" ON "ApproverSelectionLog"("selectedApproverId");
CREATE INDEX IF NOT EXISTS "ApproverSelectionLog_level_createdAt_idx" ON "ApproverSelectionLog"("level", "createdAt" DESC);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if migration was successful
DO $$
BEGIN
    -- Check ApproverConfiguration table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ApproverConfiguration') THEN
        RAISE NOTICE '✅ ApproverConfiguration table created successfully';
    ELSE
        RAISE EXCEPTION '❌ ApproverConfiguration table not found';
    END IF;
    
    -- Check Enterprise Admin level
    IF EXISTS (SELECT 1 FROM "ApprovalLevel" WHERE "level" = 3 AND "roleName" = 'ENTERPRISE_ADMIN') THEN
        RAISE NOTICE '✅ Enterprise Admin level (L4) configured';
    ELSE
        RAISE WARNING '⚠️  Enterprise Admin level not found';
    END IF;
    
    -- Check function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_best_approver_for_level') THEN
        RAISE NOTICE '✅ get_best_approver_for_level function created';
    ELSE
        RAISE WARNING '⚠️  get_best_approver_for_level function not found';
    END IF;
    
    RAISE NOTICE '✅ Migration completed successfully';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP VIEW IF EXISTS "ApproverWorkloadStats";
-- DROP FUNCTION IF EXISTS get_best_approver_for_level;
-- DROP TABLE IF EXISTS "ApproverSelectionLog";
-- DROP TABLE IF EXISTS "ApproverConfiguration";
-- DELETE FROM "ApprovalLevel" WHERE "level" = 3 AND "roleName" = 'ENTERPRISE_ADMIN';
