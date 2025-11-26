-- Create new enums
DO $$ BEGIN
  CREATE TYPE "AddressType" AS ENUM ('PERMANENT', 'OFFICE', 'HOME', 'CORRESPONDENCE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProficiencyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE,
  "full_name" VARCHAR(255),
  "employee_code" VARCHAR(50) UNIQUE,
  "phone" VARCHAR(20),
  "alternate_phone" VARCHAR(20),
  "date_of_birth" DATE,
  "gender" "Gender",
  "blood_group" VARCHAR(10),
  "profile_pic_url" TEXT,
  "father_name" VARCHAR(255),
  "mother_name" VARCHAR(255),
  "marital_status" "MaritalStatus",
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_profiles_user_id_idx" ON "user_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "user_profiles_employee_code_idx" ON "user_profiles"("employee_code");

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS "user_addresses" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "type" "AddressType" NOT NULL,
  "line1" VARCHAR(255) NOT NULL,
  "line2" VARCHAR(255),
  "city" VARCHAR(100) NOT NULL,
  "state" VARCHAR(100) NOT NULL,
  "postal_code" VARCHAR(20) NOT NULL,
  "country" VARCHAR(100) NOT NULL DEFAULT 'India',
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_addresses_user_id_idx" ON "user_addresses"("user_id");
CREATE INDEX IF NOT EXISTS "user_addresses_type_idx" ON "user_addresses"("type");

-- Create user_kyc table
CREATE TABLE IF NOT EXISTS "user_kyc" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE,
  "pan_number" VARCHAR(20),
  "aadhaar_number" VARCHAR(20),
  "kyc_status" "KYCStatus" NOT NULL DEFAULT 'PENDING',
  "pan_document_url" TEXT,
  "aadhaar_document_url" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_kyc_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_kyc_user_id_idx" ON "user_kyc"("user_id");
CREATE INDEX IF NOT EXISTS "user_kyc_kyc_status_idx" ON "user_kyc"("kyc_status");

-- Create user_bank_accounts table
CREATE TABLE IF NOT EXISTS "user_bank_accounts" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "account_holder_name" VARCHAR(255) NOT NULL,
  "bank_name" VARCHAR(255) NOT NULL,
  "branch_name" VARCHAR(255) NOT NULL,
  "account_number" VARCHAR(50) NOT NULL,
  "ifsc_code" VARCHAR(20) NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "cancelled_cheque_document_url" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_bank_accounts_user_id_idx" ON "user_bank_accounts"("user_id");
CREATE INDEX IF NOT EXISTS "user_bank_accounts_is_primary_idx" ON "user_bank_accounts"("is_primary");

-- Create user_education table
CREATE TABLE IF NOT EXISTS "user_education" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "degree" VARCHAR(255) NOT NULL,
  "institution_name" VARCHAR(255) NOT NULL,
  "year_of_passing" INTEGER NOT NULL,
  "grade_or_percentage" VARCHAR(50) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_education_user_id_idx" ON "user_education"("user_id");

-- Create user_skills table
CREATE TABLE IF NOT EXISTS "user_skills" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "skill_name" VARCHAR(255) NOT NULL,
  "proficiency_level" "ProficiencyLevel" NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_skills_user_id_idx" ON "user_skills"("user_id");

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS "user_achievements" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "achievement_date" DATE NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "user_achievements"("user_id");

-- Create user_emergency_contacts table
CREATE TABLE IF NOT EXISTS "user_emergency_contacts" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "relationship" VARCHAR(100) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "alternate_phone" VARCHAR(20),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_emergency_contacts_user_id_idx" ON "user_emergency_contacts"("user_id");

-- Create branches table
CREATE TABLE IF NOT EXISTS "branches" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" UUID,
  "branch_code" VARCHAR(50) NOT NULL UNIQUE,
  "branch_name" VARCHAR(255) NOT NULL,
  "address_line1" VARCHAR(255) NOT NULL,
  "address_line2" VARCHAR(255),
  "city" VARCHAR(100) NOT NULL,
  "state" VARCHAR(100) NOT NULL,
  "postal_code" VARCHAR(20) NOT NULL,
  "country" VARCHAR(100) NOT NULL DEFAULT 'India',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "clients"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "branches_tenant_id_idx" ON "branches"("tenant_id");
CREATE INDEX IF NOT EXISTS "branches_branch_code_idx" ON "branches"("branch_code");

-- Create user_branches table
CREATE TABLE IF NOT EXISTS "user_branches" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "branch_id" INTEGER NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_branches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
  CONSTRAINT "user_branches_user_id_branch_id_key" UNIQUE ("user_id", "branch_id")
);

CREATE INDEX IF NOT EXISTS "user_branches_user_id_idx" ON "user_branches"("user_id");
CREATE INDEX IF NOT EXISTS "user_branches_branch_id_idx" ON "user_branches"("branch_id");

-- Success message
DO $$ BEGIN
  RAISE NOTICE '✅ All tables created successfully!';
END $$;
