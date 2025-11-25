-- Migration: Add Serial Number to Tasks Table
-- Date: 2025-11-26
-- Description: Adds unique serial number field for task identification and search

-- ============================================
-- Add serial_number column to tasks table
-- ============================================

-- Step 1: Add the column (nullable first for existing rows)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(50);

-- Step 2: Generate serial numbers for existing tasks
-- Format: TASK-YYYYMMDD-HHMMSS-XXX
UPDATE tasks 
SET serial_number = CONCAT(
    'TASK-',
    TO_CHAR(created_at, 'YYYYMMDD-HH24MISS'),
    '-',
    UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 3))
)
WHERE serial_number IS NULL;

-- Step 3: Make the column NOT NULL and UNIQUE
ALTER TABLE tasks 
ALTER COLUMN serial_number SET NOT NULL;

ALTER TABLE tasks 
ADD CONSTRAINT uk_tasks_serial_number UNIQUE (serial_number);

-- Step 4: Create index for fast searching
CREATE INDEX IF NOT EXISTS idx_tasks_serial_number ON tasks(serial_number);

-- Step 5: Create index for partial text search (for quick lookup)
CREATE INDEX IF NOT EXISTS idx_tasks_serial_number_pattern ON tasks(serial_number varchar_pattern_ops);

-- ============================================
-- Comments
-- ============================================
COMMENT ON COLUMN tasks.serial_number IS 'Unique task identifier in format: TASK-YYYYMMDD-HHMMSS-XXX';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the migration:
-- SELECT id, serial_number, title, status, created_at FROM tasks LIMIT 10;

COMMIT;

-- ============================================
-- Rollback Instructions (if needed)
-- ============================================
-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_tasks_serial_number_pattern;
-- DROP INDEX IF EXISTS idx_tasks_serial_number;
-- ALTER TABLE tasks DROP CONSTRAINT IF EXISTS uk_tasks_serial_number;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS serial_number;
