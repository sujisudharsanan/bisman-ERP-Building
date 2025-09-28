-- Migration: add_roles_table
-- Creates a normalized roles table, migrates User.role enum values to role_id FK,
-- renames createdAt -> created_at to match Prisma mapping, and drops the old enum.

BEGIN;

-- 1) Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- 2) Seed roles (idempotent)
INSERT INTO roles (name)
VALUES ('USER'), ('ADMIN')
ON CONFLICT (name) DO NOTHING;

-- 3) Add nullable role_id column to quoted User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role_id integer;

-- 4) Migrate values from enum column `role` to the new FK (cast enum to text)
UPDATE "User" u
SET role_id = r.id
FROM roles r
WHERE u.role::text = r.name;

-- 5) Ensure any remaining NULL role_id are set to USER
UPDATE "User"
SET role_id = (SELECT id FROM roles WHERE name = 'USER')
WHERE role_id IS NULL;

-- 6) Make role_id NOT NULL and add FK constraint
ALTER TABLE "User" ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT user_role_fk FOREIGN KEY (role_id) REFERENCES roles(id);

-- 7) Rename createdAt column to created_at if it exists
-- (If your DB already uses created_at this will error; adjust if needed.)
-- Use a conditional DO block to avoid failing if column missing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'createdAt'
  ) THEN
    EXECUTE 'ALTER TABLE "User" RENAME COLUMN "createdAt" TO created_at';
  END IF;
END$$;

-- 8) Drop the old enum column and type (only if present)
ALTER TABLE "User" DROP COLUMN IF EXISTS role;
DROP TYPE IF EXISTS "Role";

COMMIT;
