-- ============================================================================
-- BISMAN ERP - Permanent Page Governance Migration
-- ============================================================================
-- Purpose: Ensure pages_master is the SINGLE SOURCE OF TRUTH for:
--   1. Page existence & governance tracking
--   2. RBAC (role_page_access)
--   3. Sidebar/menu visibility (show_in_sidebar)
--   4. Subscription/module gating
--   5. Page metadata (module, order, icon, title)
-- 
-- Date: 2025-01-19
-- ============================================================================

-- Begin transaction
BEGIN;

-- ============================================================================
-- STEP 1: Add missing governance columns to pages_master
-- ============================================================================

-- Add is_governed column (determines if page requires DB tracking/RBAC)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages_master' AND column_name = 'is_governed') THEN
        ALTER TABLE pages_master ADD COLUMN is_governed BOOLEAN DEFAULT TRUE;
        COMMENT ON COLUMN pages_master.is_governed IS 'If TRUE, page requires RBAC check. If FALSE, page is public/auth.';
    END IF;
END $$;

-- Add is_dynamic column (for routes with parameters like [id])
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages_master' AND column_name = 'is_dynamic') THEN
        ALTER TABLE pages_master ADD COLUMN is_dynamic BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN pages_master.is_dynamic IS 'If TRUE, route contains dynamic segments like [id].';
    END IF;
END $$;

-- Add route_pattern column (normalized route for matching, e.g., /admin/users/:id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages_master' AND column_name = 'route_pattern') THEN
        ALTER TABLE pages_master ADD COLUMN route_pattern TEXT;
        COMMENT ON COLUMN pages_master.route_pattern IS 'Normalized route pattern for matching (e.g., /admin/users/:id).';
    END IF;
END $$;

-- Add filesystem_path column (actual file path from Next.js app directory)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages_master' AND column_name = 'filesystem_path') THEN
        ALTER TABLE pages_master ADD COLUMN filesystem_path TEXT;
        COMMENT ON COLUMN pages_master.filesystem_path IS 'Actual path in Next.js app directory.';
    END IF;
END $$;

-- Add last_synced_at column (tracks when page was last verified by sync script)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages_master' AND column_name = 'last_synced_at') THEN
        ALTER TABLE pages_master ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN pages_master.last_synced_at IS 'Timestamp of last sync verification.';
    END IF;
END $$;

-- Add sync_status column (ACTIVE, ORPHANED, PENDING_REVIEW)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages_master' AND column_name = 'sync_status') THEN
        ALTER TABLE pages_master ADD COLUMN sync_status VARCHAR(20) DEFAULT 'ACTIVE';
        COMMENT ON COLUMN pages_master.sync_status IS 'Sync status: ACTIVE, ORPHANED (DB only), PENDING_REVIEW.';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add indexes for performance
-- ============================================================================

-- Index for route_pattern lookups (route matching)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pages_master_route_pattern') THEN
        CREATE INDEX idx_pages_master_route_pattern ON pages_master(route_pattern);
    END IF;
END $$;

-- Index for is_governed lookups
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pages_master_is_governed') THEN
        CREATE INDEX idx_pages_master_is_governed ON pages_master(is_governed);
    END IF;
END $$;

-- Index for sync_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pages_master_sync_status') THEN
        CREATE INDEX idx_pages_master_sync_status ON pages_master(sync_status);
    END IF;
END $$;

-- Unique constraint on route (if not already exists)
-- Check if unique constraint exists first
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_master_route_unique') THEN
        -- First, find and handle duplicates
        -- We'll keep the first one (lowest id) and update the route of others
        WITH duplicates AS (
            SELECT route, id, 
                   ROW_NUMBER() OVER (PARTITION BY route ORDER BY id) as rn
            FROM pages_master
            WHERE route IS NOT NULL
        )
        UPDATE pages_master p
        SET route = p.route || '_duplicate_' || p.id
        FROM duplicates d
        WHERE p.id = d.id AND d.rn > 1;
        
        -- Now create the unique constraint
        ALTER TABLE pages_master ADD CONSTRAINT pages_master_route_unique UNIQUE (route);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add unique constraint on route: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: Populate route_pattern from existing routes
-- ============================================================================

-- Update route_pattern for all existing routes
UPDATE pages_master
SET route_pattern = 
    REGEXP_REPLACE(
        REGEXP_REPLACE(route, '\[([^\]]+)\]', ':\1', 'g'),
        '/\([^)]+\)', '', 'g'  -- Remove route groups like (dashboard)
    ),
    is_dynamic = (route LIKE '%[%]%')
WHERE route_pattern IS NULL AND route IS NOT NULL;

-- ============================================================================
-- STEP 4: Mark public/auth routes as non-governed
-- ============================================================================

-- Auth and public pages should not require RBAC
UPDATE pages_master
SET is_governed = FALSE,
    show_in_sidebar = FALSE
WHERE route LIKE '/auth/%'
   OR route LIKE '/(public)/%'
   OR route IN ('/login', '/signup', '/unauthorized', '/access-denied', '/status', '/privacy', '/support');

-- ============================================================================
-- STEP 5: Create unregistered_route_access table for logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS unregistered_route_access (
    id SERIAL PRIMARY KEY,
    route TEXT NOT NULL,
    user_id INTEGER,
    user_role VARCHAR(100),
    tenant_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    blocked BOOLEAN DEFAULT TRUE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_unregistered_route_access_route ON unregistered_route_access(route);
CREATE INDEX IF NOT EXISTS idx_unregistered_route_access_accessed_at ON unregistered_route_access(accessed_at);

COMMENT ON TABLE unregistered_route_access IS 'Logs attempts to access routes not registered in pages_master.';

-- ============================================================================
-- STEP 6: Create view for sidebar menu (convenience view)
-- ============================================================================

CREATE OR REPLACE VIEW v_sidebar_menu AS
SELECT 
    p.id,
    p.page_code,
    p.display_name,
    p.description,
    p.route,
    p.route_pattern,
    p.icon,
    p.sort_order,
    p.is_active,
    p.show_in_sidebar,
    p.is_governed,
    p.is_dynamic,
    p.is_public,
    m.id as module_id,
    m.module_code,
    m.display_name as module_name,
    m.icon as module_icon,
    m.sort_order as module_sort_order,
    m.color_code as module_color,
    m.is_hidden as module_is_hidden
FROM pages_master p
LEFT JOIN modules_master m ON m.id = p.module_id
WHERE p.is_active = TRUE
  AND p.show_in_sidebar = TRUE
  AND (m.is_active = TRUE OR m.is_active IS NULL)
  AND (m.is_hidden = FALSE OR m.is_hidden IS NULL)
ORDER BY m.sort_order, p.sort_order, p.display_name;

COMMENT ON VIEW v_sidebar_menu IS 'Pre-filtered view for sidebar menu generation. Join with role_page_access for RBAC.';

-- ============================================================================
-- STEP 7: Create function to validate route access
-- ============================================================================

CREATE OR REPLACE FUNCTION check_route_access(
    p_route TEXT,
    p_role_name VARCHAR(100)
) RETURNS TABLE (
    page_id INTEGER,
    page_code VARCHAR(100),
    display_name VARCHAR(200),
    module_code VARCHAR(50),
    can_view BOOLEAN,
    can_edit BOOLEAN,
    is_governed BOOLEAN,
    is_public BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id as page_id,
        pm.page_code,
        pm.display_name,
        mm.module_code,
        COALESCE(rpa.can_view, FALSE) as can_view,
        COALESCE(rpa.can_edit, FALSE) as can_edit,
        pm.is_governed,
        pm.is_public
    FROM pages_master pm
    LEFT JOIN modules_master mm ON mm.id = pm.module_id
    LEFT JOIN role_page_access rpa ON rpa.page_id = pm.id AND rpa.role_name = p_role_name
    WHERE pm.is_active = TRUE
      AND (
          pm.route = p_route  -- Exact match
          OR pm.route_pattern = p_route  -- Pattern match
          OR (
              -- Handle dynamic routes: /admin/users/123 matches /admin/users/:id
              pm.is_dynamic = TRUE 
              AND p_route ~ ('^' || REGEXP_REPLACE(pm.route_pattern, ':[a-zA-Z_]+', '[^/]+', 'g') || '$')
          )
      )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_route_access IS 'Check if a route exists in pages_master and if a role has access to it.';

-- ============================================================================
-- STEP 8: Update all existing pages to sync_status = ACTIVE
-- ============================================================================

UPDATE pages_master
SET sync_status = 'ACTIVE',
    last_synced_at = NOW()
WHERE sync_status IS NULL;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually)
-- ============================================================================

-- Check new columns
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'pages_master' 
-- ORDER BY ordinal_position;

-- Count pages by governance status
-- SELECT is_governed, COUNT(*) FROM pages_master GROUP BY is_governed;

-- Check v_sidebar_menu view
-- SELECT COUNT(*) FROM v_sidebar_menu;

-- Test route access function
-- SELECT * FROM check_route_access('/admin/clients', 'SUPER_ADMIN');
