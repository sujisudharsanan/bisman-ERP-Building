-- Migration: Create agreement payments & invoices & attachments & notifications tables
CREATE TYPE agreement_payment_type AS ENUM ('advance','regular','refund','deduction');
CREATE TYPE agreement_invoice_type AS ENUM ('invoice','credit_note');
CREATE TYPE agreement_notification_channel AS ENUM ('email','sms');
CREATE TYPE agreement_notification_status AS ENUM ('queued','sent','failed');

CREATE TABLE IF NOT EXISTS agreement_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL,
  payment_type agreement_payment_type NOT NULL,
  reference TEXT,
  source_system TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreement_payments_agreement ON agreement_payments(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_payments_date ON agreement_payments(payment_date);

CREATE TABLE IF NOT EXISTS agreement_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL,
  type agreement_invoice_type NOT NULL,
  linked_payment_id UUID REFERENCES agreement_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreement_invoices_agreement ON agreement_invoices(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_invoices_date ON agreement_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_agreement_invoices_invoice_no ON agreement_invoices(invoice_no);

CREATE TABLE IF NOT EXISTS agreement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreement_attachments_agreement ON agreement_attachments(agreement_id);

CREATE TABLE IF NOT EXISTS agreement_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  notif_type TEXT NOT NULL CHECK (notif_type = 'expiry_reminder'),
  notif_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  channel agreement_notification_channel NOT NULL DEFAULT 'email',
  status agreement_notification_status NOT NULL DEFAULT 'queued',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreement_notifications_agreement ON agreement_notifications(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_notifications_date ON agreement_notifications(notif_date);
