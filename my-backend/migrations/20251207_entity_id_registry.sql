-- Migration: Create Entity ID Registry System
-- Purpose: Track all unique IDs generated for users, tasks, clients, and other entities
-- Date: 2024-12-07

-- ============================================
-- ENTITY ID SEQUENCES
-- ============================================
-- Tracks the sequence numbers for each entity type per day
CREATE TABLE IF NOT EXISTS entity_id_sequences (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    date_prefix VARCHAR(8) NOT NULL,  -- YYYYMMDD format
    last_number BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for entity type + date combination
    CONSTRAINT uq_entity_sequences_type_date UNIQUE (entity_type, date_prefix)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_entity_sequences_type ON entity_id_sequences(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_sequences_date ON entity_id_sequences(date_prefix);

-- ============================================
-- ENTITY ID REGISTRY
-- ============================================
-- Central registry of all generated unique IDs
CREATE TABLE IF NOT EXISTS entity_id_registry (
    id SERIAL PRIMARY KEY,
    unique_id VARCHAR(50) NOT NULL UNIQUE,
    entity_type VARCHAR(50) NOT NULL,
    entity_db_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,  -- User who created the entity
    metadata JSONB DEFAULT '{}',
    
    -- Indexes for lookups
    CONSTRAINT uq_entity_registry_unique_id UNIQUE (unique_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entity_registry_type ON entity_id_registry(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_registry_db_id ON entity_id_registry(entity_db_id);
CREATE INDEX IF NOT EXISTS idx_entity_registry_type_db_id ON entity_id_registry(entity_type, entity_db_id);
CREATE INDEX IF NOT EXISTS idx_entity_registry_created_at ON entity_id_registry(created_at DESC);

-- ============================================
-- ADD UNIQUE_ID COLUMNS TO EXISTING TABLES
-- ============================================

-- Add unique_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS unique_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_unique_id ON users(unique_id);

-- Add unique_id to tasks table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS unique_id VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_tasks_unique_id ON tasks(unique_id);
    END IF;
END $$;

-- Add unique_id to workflow_tasks table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_tasks') THEN
        ALTER TABLE workflow_tasks ADD COLUMN IF NOT EXISTS unique_id VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_workflow_tasks_unique_id ON workflow_tasks(unique_id);
    END IF;
END $$;

-- Add unique_id to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS unique_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_clients_unique_id ON clients(unique_id);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_entity_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entity_sequences_updated_at ON entity_id_sequences;
CREATE TRIGGER trg_entity_sequences_updated_at
    BEFORE UPDATE ON entity_id_sequences
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_sequences_updated_at();

-- ============================================
-- VIEW: Entity ID Summary
-- ============================================
CREATE OR REPLACE VIEW v_entity_id_summary AS
SELECT 
    entity_type,
    COUNT(*) as total_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created,
    DATE(MAX(created_at)) as last_activity_date
FROM entity_id_registry
GROUP BY entity_type
ORDER BY entity_type;

-- ============================================
-- FUNCTION: Get next sequence number
-- ============================================
CREATE OR REPLACE FUNCTION get_next_entity_id(
    p_entity_type VARCHAR(50),
    p_date_prefix VARCHAR(8)
) RETURNS BIGINT AS $$
DECLARE
    v_next_number BIGINT;
BEGIN
    INSERT INTO entity_id_sequences (entity_type, date_prefix, last_number)
    VALUES (p_entity_type, p_date_prefix, 1)
    ON CONFLICT (entity_type, date_prefix)
    DO UPDATE SET last_number = entity_id_sequences.last_number + 1
    RETURNING last_number INTO v_next_number;
    
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE entity_id_sequences IS 'Tracks sequence numbers for generating unique IDs per entity type and date';
COMMENT ON TABLE entity_id_registry IS 'Central registry of all generated unique IDs for traceability';
COMMENT ON COLUMN entity_id_registry.unique_id IS 'Human-readable unique ID (e.g., USR-20251207-00001)';
COMMENT ON COLUMN entity_id_registry.entity_type IS 'Type of entity: user, task, client, organization, etc.';
COMMENT ON COLUMN entity_id_registry.entity_db_id IS 'The actual database primary key of the entity';
COMMENT ON COLUMN entity_id_registry.metadata IS 'Additional metadata about the entity at creation time';

-- ============================================
-- SEED: Initial ID prefixes documentation
-- ============================================
-- This is just a reference, the actual prefixes are defined in code
-- USR = User
-- TSK = Task
-- CLI = Client
-- ORG = Organization
-- INV = Invoice
-- ORD = Order
-- PAY = Payment
-- AGR = Agreement
-- DOC = Document
-- TKT = Ticket
