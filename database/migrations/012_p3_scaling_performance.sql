-- ============================================================================
-- P3 SCALING & PERFORMANCE MIGRATION
-- Priority: P3 (1-2 days)
-- Date: 2024-12-04
-- 
-- This migration addresses:
-- 1. Add indexes for common queries
-- 2. Partition high-volume tables (thread_messages, client_usage_events)
-- 3. Normalize JSON fields (message_reads, reactions)
-- ============================================================================

-- ============================================================================
-- PART 1: ADDITIONAL INDEXES FOR COMMON QUERIES
-- ============================================================================

-- 1.1 Thread Messages - Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created 
    ON thread_messages("threadId", "createdAt" DESC);
    
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_not_deleted 
    ON thread_messages("threadId", "createdAt" DESC) 
    WHERE "isDeleted" = false;

CREATE INDEX IF NOT EXISTS idx_thread_messages_sender_created 
    ON thread_messages("senderId", "createdAt" DESC);

-- GIN index for JSONB search on reactions and readBy
CREATE INDEX IF NOT EXISTS idx_thread_messages_reactions_gin 
    ON thread_messages USING GIN (reactions);
    
CREATE INDEX IF NOT EXISTS idx_thread_messages_readby_gin 
    ON thread_messages USING GIN ("readBy");

-- 1.2 Client Usage Events - Composite indexes
CREATE INDEX IF NOT EXISTS idx_client_usage_events_composite 
    ON client_usage_events(client_id, module_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_usage_events_type_date 
    ON client_usage_events(event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_usage_events_user_date 
    ON client_usage_events(user_id, occurred_at DESC) 
    WHERE user_id IS NOT NULL;

-- 1.3 Chat Threads - Performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated 
    ON chat_threads("updatedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_chat_threads_type_updated 
    ON chat_threads(type, "updatedAt" DESC);

-- 1.4 User Sessions - Active sessions lookup
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
    ON user_sessions(user_id, is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires 
    ON user_sessions(expires_at) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash 
    ON user_sessions(token_hash) 
    WHERE is_active = true;

-- 1.5 Tasks - Status and assignment queries
CREATE INDEX IF NOT EXISTS idx_tasks_expense_status 
    ON tasks("expenseId", status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status 
    ON tasks("assignedToId", status);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
    ON tasks("dueDate") 
    WHERE status NOT IN ('COMPLETED', 'CANCELLED');

-- 1.6 Approvals - Lookup by request and status
CREATE INDEX IF NOT EXISTS idx_approvals_expense_status 
    ON approvals("expenseId", action);

CREATE INDEX IF NOT EXISTS idx_approvals_approver_pending 
    ON approvals("approverId") 
    WHERE action = 'PENDING';

-- 1.7 Module Assignments - Fast lookup
CREATE INDEX IF NOT EXISTS idx_module_assignments_super_admin 
    ON module_assignments(super_admin_id, is_active) 
    WHERE is_active = true;

-- 1.8 Branches - Tenant lookup
CREATE INDEX IF NOT EXISTS idx_branches_tenant_active 
    ON branches(tenant_id, is_active) 
    WHERE is_active = true;

-- ============================================================================
-- PART 2: NORMALIZED TABLES FOR JSON FIELDS
-- ============================================================================

-- 2.1 Message Reads Table (replaces readBy JSONB)
CREATE TABLE IF NOT EXISTS message_reads (
    id BIGSERIAL PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES thread_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    read_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_date ON message_reads(user_id, read_at DESC);

COMMENT ON TABLE message_reads IS 'Normalized message read receipts (replaces readBy JSONB in thread_messages)';

-- 2.2 Message Reactions Table (replaces reactions JSONB)
CREATE TABLE IF NOT EXISTS message_reactions (
    id BIGSERIAL PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES thread_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    emoji VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions(emoji);

COMMENT ON TABLE message_reactions IS 'Normalized message reactions (replaces reactions JSONB in thread_messages)';

-- 2.3 Migration function: readBy JSONB → message_reads table
CREATE OR REPLACE FUNCTION migrate_readby_to_normalized()
RETURNS TABLE(migrated_count BIGINT) AS $$
DECLARE
    v_count BIGINT := 0;
BEGIN
    -- Insert from JSONB array into normalized table
    INSERT INTO message_reads (message_id, user_id, read_at)
    SELECT 
        tm.id as message_id,
        (reader->>'userId')::INTEGER as user_id,
        COALESCE((reader->>'readAt')::TIMESTAMP, tm."createdAt") as read_at
    FROM thread_messages tm,
         jsonb_array_elements(tm."readBy") as reader
    WHERE tm."readBy" IS NOT NULL 
      AND jsonb_array_length(tm."readBy") > 0
    ON CONFLICT (message_id, user_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- 2.4 Migration function: reactions JSONB → message_reactions table
CREATE OR REPLACE FUNCTION migrate_reactions_to_normalized()
RETURNS TABLE(migrated_count BIGINT) AS $$
DECLARE
    v_count BIGINT := 0;
BEGIN
    -- Insert from JSONB object into normalized table
    -- Assumes reactions format: { "emoji": [userId1, userId2, ...] }
    INSERT INTO message_reactions (message_id, user_id, emoji, created_at)
    SELECT 
        tm.id as message_id,
        user_id::INTEGER,
        emoji,
        tm."createdAt" as created_at
    FROM thread_messages tm,
         jsonb_each(tm.reactions) as r(emoji, users),
         jsonb_array_elements_text(users) as user_id
    WHERE tm.reactions IS NOT NULL 
      AND jsonb_typeof(tm.reactions) = 'object'
    ON CONFLICT (message_id, user_id, emoji) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: TABLE PARTITIONING
-- ============================================================================

-- 3.1 Create partitioned thread_messages table
-- Note: We'll create a new partitioned table and migrate data

-- Create the partitioned version
CREATE TABLE IF NOT EXISTS thread_messages_partitioned (
    id TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    attachments JSONB,
    "replyToId" TEXT,
    reactions JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP,
    "readBy" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Create partitions for current and future months
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', NOW() - INTERVAL '3 months');
    end_date DATE := DATE_TRUNC('month', NOW() + INTERVAL '12 months');
    partition_date DATE;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    partition_date := start_date;
    
    WHILE partition_date < end_date LOOP
        partition_name := 'thread_messages_p' || TO_CHAR(partition_date, 'YYYY_MM');
        partition_start := TO_CHAR(partition_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');
        
        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF thread_messages_partitioned 
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, partition_start, partition_end
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
        
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- Create default partition for old data
CREATE TABLE IF NOT EXISTS thread_messages_p_default 
    PARTITION OF thread_messages_partitioned DEFAULT;

-- Create indexes on partitioned table
CREATE INDEX IF NOT EXISTS idx_thread_messages_part_thread_created 
    ON thread_messages_partitioned("threadId", "createdAt" DESC);
    
CREATE INDEX IF NOT EXISTS idx_thread_messages_part_sender 
    ON thread_messages_partitioned("senderId");

-- 3.2 Create partitioned client_usage_events table
CREATE TABLE IF NOT EXISTS client_usage_events_partitioned (
    id SERIAL,
    client_id UUID NOT NULL,
    module_id INTEGER,
    user_id INTEGER,
    event_type VARCHAR(100) NOT NULL,
    meta JSONB,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Create partitions for usage events (monthly)
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', NOW() - INTERVAL '3 months');
    end_date DATE := DATE_TRUNC('month', NOW() + INTERVAL '12 months');
    partition_date DATE;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    partition_date := start_date;
    
    WHILE partition_date < end_date LOOP
        partition_name := 'client_usage_events_p' || TO_CHAR(partition_date, 'YYYY_MM');
        partition_start := TO_CHAR(partition_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');
        
        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF client_usage_events_partitioned 
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, partition_start, partition_end
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
        
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- Create default partition
CREATE TABLE IF NOT EXISTS client_usage_events_p_default 
    PARTITION OF client_usage_events_partitioned DEFAULT;

-- Create indexes on partitioned table
CREATE INDEX IF NOT EXISTS idx_client_usage_part_client_date 
    ON client_usage_events_partitioned(client_id, occurred_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_client_usage_part_type 
    ON client_usage_events_partitioned(event_type);

-- 3.3 Create partitioned audit_logs table for future use
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    id SERIAL,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    session_id INTEGER,
    service_name VARCHAR(100),
    service_user VARCHAR(100),
    query_text TEXT,
    execution_time_ms INTEGER,
    rows_affected INTEGER,
    request_id UUID,
    tenant_id UUID,
    super_admin_id INTEGER,
    operation_context JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create audit partitions (monthly)
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', NOW());
    end_date DATE := DATE_TRUNC('month', NOW() + INTERVAL '6 months');
    partition_date DATE;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    partition_date := start_date;
    
    WHILE partition_date < end_date LOOP
        partition_name := 'audit_logs_p' || TO_CHAR(partition_date, 'YYYY_MM');
        partition_start := TO_CHAR(partition_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF audit_logs_partitioned 
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, partition_start, partition_end
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
        
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs_p_default 
    PARTITION OF audit_logs_partitioned DEFAULT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_part_created 
    ON audit_logs_partitioned(created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_audit_logs_part_table_action 
    ON audit_logs_partitioned(table_name, action);

-- ============================================================================
-- PART 4: PARTITION MAINTENANCE FUNCTIONS
-- ============================================================================

-- 4.1 Function to create future partitions automatically
CREATE OR REPLACE FUNCTION create_future_partitions(
    p_table_name TEXT,
    p_months_ahead INTEGER DEFAULT 3
)
RETURNS TABLE(partition_name TEXT, created BOOLEAN) AS $$
DECLARE
    partition_date DATE;
    end_date DATE;
    v_partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    end_date := DATE_TRUNC('month', NOW() + (p_months_ahead || ' months')::INTERVAL);
    partition_date := DATE_TRUNC('month', NOW());
    
    WHILE partition_date < end_date LOOP
        v_partition_name := p_table_name || '_p' || TO_CHAR(partition_date, 'YYYY_MM');
        partition_start := TO_CHAR(partition_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = v_partition_name AND n.nspname = 'public'
        ) THEN
            BEGIN
                EXECUTE format(
                    'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                    v_partition_name, p_table_name || '_partitioned', partition_start, partition_end
                );
                RETURN QUERY SELECT v_partition_name, true;
            EXCEPTION WHEN OTHERS THEN
                RETURN QUERY SELECT v_partition_name, false;
            END;
        ELSE
            RETURN QUERY SELECT v_partition_name, false;
        END IF;
        
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Function to drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions(
    p_table_name TEXT,
    p_months_to_keep INTEGER DEFAULT 12
)
RETURNS TABLE(partition_name TEXT, dropped BOOLEAN) AS $$
DECLARE
    cutoff_date DATE;
    rec RECORD;
BEGIN
    cutoff_date := DATE_TRUNC('month', NOW() - (p_months_to_keep || ' months')::INTERVAL);
    
    FOR rec IN 
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_inherits i ON i.inhrelid = c.oid
        JOIN pg_class parent ON parent.oid = i.inhparent
        WHERE n.nspname = 'public'
          AND parent.relname = p_table_name || '_partitioned'
          AND c.relname ~ (p_table_name || '_p[0-9]{4}_[0-9]{2}')
    LOOP
        -- Extract date from partition name and check if it's old
        IF TO_DATE(SUBSTRING(rec.relname FROM '_p([0-9]{4}_[0-9]{2})$'), 'YYYY_MM') < cutoff_date THEN
            BEGIN
                EXECUTE format('DROP TABLE %I', rec.relname);
                RETURN QUERY SELECT rec.relname, true;
            EXCEPTION WHEN OTHERS THEN
                RETURN QUERY SELECT rec.relname, false;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: PERMISSION CACHE TABLE (for Redis fallback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS permission_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    user_id INTEGER,
    tenant_id UUID,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_cache_key ON permission_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_permission_cache_user ON permission_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON permission_cache(expires_at);

COMMENT ON TABLE permission_cache IS 'Database fallback for Redis permission cache';

-- 5.1 Function to get cached permission
CREATE OR REPLACE FUNCTION get_cached_permission(p_cache_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT cache_value INTO v_value
    FROM permission_cache
    WHERE cache_key = p_cache_key
      AND expires_at > NOW();
    
    RETURN v_value;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Function to set cached permission
CREATE OR REPLACE FUNCTION set_cached_permission(
    p_cache_key TEXT,
    p_cache_value JSONB,
    p_ttl_seconds INTEGER DEFAULT 300,
    p_user_id INTEGER DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO permission_cache (cache_key, cache_value, user_id, tenant_id, expires_at)
    VALUES (p_cache_key, p_cache_value, p_user_id, p_tenant_id, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (cache_key) DO UPDATE SET
        cache_value = EXCLUDED.cache_value,
        expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 5.3 Function to invalidate cache by pattern
CREATE OR REPLACE FUNCTION invalidate_permission_cache(p_pattern TEXT DEFAULT '%')
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM permission_cache WHERE cache_key LIKE p_pattern;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 5.4 Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_permission_cache()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM permission_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: QUERY ANALYSIS HELPERS
-- ============================================================================

-- 6.1 View for slow queries analysis
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query_hash,
    query_sample,
    COUNT(*) as execution_count,
    AVG(execution_time_ms) as avg_time_ms,
    MAX(execution_time_ms) as max_time_ms,
    MIN(execution_time_ms) as min_time_ms,
    SUM(rows_affected) as total_rows_affected
FROM statement_logs
WHERE execution_time_ms > 100
  AND logged_at > NOW() - INTERVAL '24 hours'
GROUP BY query_hash, query_sample
ORDER BY avg_time_ms DESC;

-- 6.2 View for table access patterns
CREATE OR REPLACE VIEW v_table_access_patterns AS
SELECT 
    table_name,
    operation,
    COUNT(*) as access_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT service_name) as unique_services,
    AVG(execution_time_ms) as avg_time_ms
FROM service_table_usage
GROUP BY table_name, operation
ORDER BY access_count DESC;

-- ============================================================================
-- MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (migration_name, applied_at, applied_by)
VALUES ('012_p3_scaling_performance', NOW(), CURRENT_USER)
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
    new_index_count INTEGER;
    partition_count INTEGER;
BEGIN
    -- Count new indexes
    SELECT COUNT(*) INTO new_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%';
    
    -- Count partitions
    SELECT COUNT(*) INTO partition_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname LIKE '%_p%';
    
    RAISE NOTICE 'P3 Scaling Migration Complete:';
    RAISE NOTICE '  - Total indexes: %', new_index_count;
    RAISE NOTICE '  - Total partitions created: %', partition_count;
    RAISE NOTICE '  - New tables: message_reads, message_reactions, permission_cache';
    RAISE NOTICE '  - Partitioned tables: thread_messages_partitioned, client_usage_events_partitioned, audit_logs_partitioned';
END $$;
