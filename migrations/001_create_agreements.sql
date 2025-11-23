-- Migration: Create agreements table
-- Note: Adjust schema to fit existing role/user references (users table assumed)
CREATE TYPE agreement_contract_type AS ENUM ('rent','vendor','client','vehicle','other');
CREATE TYPE agreement_status AS ENUM ('active','expiring_soon','expired','draft','suspended');
CREATE TYPE agreement_billing_frequency AS ENUM ('monthly','quarterly','yearly','one_time','custom');
CREATE TYPE party_type AS ENUM ('vendor','client','internal');

CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  contract_type agreement_contract_type NOT NULL,
  party_id UUID NOT NULL,
  party_type party_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  currency CHAR(3) NOT NULL,
  base_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  billing_frequency agreement_billing_frequency NOT NULL DEFAULT 'monthly',
  term_text TEXT,
  status agreement_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ
);

-- Indexes to speed queries
CREATE INDEX IF NOT EXISTS idx_agreements_party ON agreements(party_id, party_type);
CREATE INDEX IF NOT EXISTS idx_agreements_end_date ON agreements(end_date);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_reference_trgm ON agreements USING GIN (reference gin_trgm_ops);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION agreements_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agreements_set_updated_at
BEFORE UPDATE ON agreements
FOR EACH ROW EXECUTE FUNCTION agreements_set_updated_at();
