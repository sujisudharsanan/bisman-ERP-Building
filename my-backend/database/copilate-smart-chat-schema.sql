-- Copilate Smart Chat Agent - Database Schema
-- For BISMAN ERP System
-- Date: 2025-11-12

-- =====================
-- USERS & ROLES
-- =====================

-- Roles table (if not exists)
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Insert default roles if not exists
INSERT INTO roles (name, permissions) VALUES 
  ('super_admin', '["all"]'::jsonb),
  ('admin', '["manage_users", "approve_bot_replies", "view_audit_logs"]'::jsonb),
  ('bot_trainer', '["approve_bot_replies", "manage_knowledge"]'::jsonb),
  ('manager', '["approve_payments", "view_reports"]'::jsonb),
  ('user', '["send_message", "view_tasks"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- =====================
-- CHAT MESSAGES & REPLIES
-- =====================

-- User messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  raw_text TEXT NOT NULL,
  parsed_json JSONB,
  intent TEXT,
  entities JSONB DEFAULT '[]'::jsonb,
  confidence REAL,
  session_id UUID,
  channel_id TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_intent ON chat_messages(intent);

-- Bot replies
CREATE TABLE IF NOT EXISTS bot_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  bot_text TEXT NOT NULL,
  reply_type TEXT DEFAULT 'standard', -- standard, clarifying, suggestion, error
  confidence REAL,
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_replies_message ON bot_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_bot_replies_approved ON bot_replies(approved);

-- =====================
-- KNOWLEDGE BASE
-- =====================

-- Unknown terms tracking
CREATE TABLE IF NOT EXISTS unknown_terms (
  id SERIAL PRIMARY KEY,
  term TEXT NOT NULL,
  occurrences INT DEFAULT 1,
  sample_message_id UUID REFERENCES chat_messages(id),
  context TEXT,
  status TEXT DEFAULT 'pending', -- pending, clarified, resolved, ignored
  created_at TIMESTAMP DEFAULT now(),
  last_seen TIMESTAMP DEFAULT now(),
  UNIQUE(term)
);

CREATE INDEX IF NOT EXISTS idx_unknown_terms_status ON unknown_terms(status);
CREATE INDEX IF NOT EXISTS idx_unknown_terms_occurrences ON unknown_terms(occurrences DESC);

-- Candidate responses (for learning)
CREATE TABLE IF NOT EXISTS candidate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id INT REFERENCES unknown_terms(id) ON DELETE CASCADE,
  suggested_text TEXT NOT NULL,
  suggested_by UUID,
  context TEXT,
  votes INT DEFAULT 0,
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approval_date TIMESTAMP,
  auto_promoted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_responses_approved ON candidate_responses(approved);
CREATE INDEX IF NOT EXISTS idx_candidate_responses_votes ON candidate_responses(votes DESC);

-- Confirmed user feedback on candidates
CREATE TABLE IF NOT EXISTS candidate_feedback (
  id SERIAL PRIMARY KEY,
  candidate_id UUID REFERENCES candidate_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('up', 'down', 'neutral')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(candidate_id, user_id)
);

-- Production knowledge base (approved replies)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  reply_template TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  requires_rbac BOOLEAN DEFAULT false,
  required_permissions TEXT[] DEFAULT '{}',
  requires_confirmation BOOLEAN DEFAULT false,
  category TEXT,
  priority INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  last_used TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_intent ON knowledge_base(intent);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON knowledge_base(active);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_priority ON knowledge_base(priority DESC);

-- =====================
-- AUDIT & LOGGING
-- =====================

-- Comprehensive audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT, -- message, reply, candidate, knowledge
  entity_id UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Bot learning events
CREATE TABLE IF NOT EXISTS learning_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- unknown_term, candidate_created, auto_promoted, manually_approved
  term_id INT REFERENCES unknown_terms(id),
  candidate_id UUID REFERENCES candidate_responses(id),
  user_id UUID,
  confidence REAL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at DESC);

-- =====================
-- CONVERSATION SESSIONS
-- =====================

-- Track conversation context
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  current_intent TEXT,
  awaiting_clarification BOOLEAN DEFAULT false,
  clarification_for UUID REFERENCES chat_messages(id),
  started_at TIMESTAMP DEFAULT now(),
  last_activity TIMESTAMP DEFAULT now(),
  ended_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_active ON conversation_sessions(ended_at) WHERE ended_at IS NULL;

-- =====================
-- BOT CONFIGURATION
-- =====================

-- Learning settings
CREATE TABLE IF NOT EXISTS bot_config (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT now()
);

-- Default configuration
INSERT INTO bot_config (key, value, description) VALUES
  ('confidence_threshold_high', '0.90', 'Reply without clarification'),
  ('confidence_threshold_low', '0.80', 'Ask clarifying question'),
  ('auto_promote_threshold', '5', 'Number of votes needed for auto-promotion'),
  ('auto_promote_enabled', 'false', 'Enable automatic candidate promotion'),
  ('learning_enabled', 'true', 'Enable bot learning features'),
  ('rbac_enabled', 'true', 'Enforce role-based access control'),
  ('audit_enabled', 'true', 'Enable audit logging'),
  ('max_clarification_attempts', '3', 'Max clarification rounds before escalation')
ON CONFLICT (key) DO NOTHING;

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Update unknown term occurrence
CREATE OR REPLACE FUNCTION increment_unknown_term_occurrence(term_text TEXT, msg_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO unknown_terms (term, sample_message_id, occurrences, last_seen)
  VALUES (term_text, msg_id, 1, now())
  ON CONFLICT (term) 
  DO UPDATE SET 
    occurrences = unknown_terms.occurrences + 1,
    last_seen = now();
END;
$$ LANGUAGE plpgsql;

-- Get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
  perms TEXT[];
BEGIN
  SELECT COALESCE(array_agg(elem::text), '{}')
  INTO perms
  FROM users u
  JOIN roles r ON u.role_id = r.id,
  jsonb_array_elements_text(r.permissions) elem
  WHERE u.id = user_uuid;
  
  RETURN perms;
END;
$$ LANGUAGE plpgsql;

-- Check if user has permission
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_perms TEXT[];
BEGIN
  user_perms := get_user_permissions(user_uuid);
  RETURN 'all' = ANY(user_perms) OR permission_name = ANY(user_perms);
END;
$$ LANGUAGE plpgsql;

-- Update knowledge base usage
CREATE OR REPLACE FUNCTION update_knowledge_usage(kb_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE knowledge_base
  SET usage_count = usage_count + 1,
      last_used = now()
  WHERE id = kb_id;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- SEED DATA
-- =====================

-- Sample knowledge base entries
INSERT INTO knowledge_base (intent, keywords, reply_template, requires_rbac, required_permissions, category, priority) VALUES
  (
    'show_pending_tasks',
    ARRAY['pending', 'tasks', 'approvals', 'waiting'],
    'You have {{count}} pending approval{{plural}}. Would you like to see them?',
    true,
    ARRAY['view_tasks'],
    'erp_query',
    10
  ),
  (
    'create_payment_request',
    ARRAY['create', 'payment', 'request', 'new payment'],
    'I can help you create a payment request. Please provide: Client name, Amount, Currency, and Description.',
    true,
    ARRAY['create_payment_request'],
    'erp_action',
    20
  ),
  (
    'search_user',
    ARRAY['find', 'search', 'user', 'who is'],
    'Searching for "{{query}}"... I found {{count}} result{{plural}}.',
    false,
    ARRAY[],
    'system_query',
    5
  ),
  (
    'greeting',
    ARRAY['hi', 'hello', 'hey', 'good morning'],
    'Hello! 👋 How can I help you today?',
    false,
    ARRAY[],
    'general',
    1
  )
ON CONFLICT DO NOTHING;

-- =====================
-- VIEWS FOR ADMIN
-- =====================

-- Pending candidates view
CREATE OR REPLACE VIEW pending_candidates AS
SELECT 
  c.id,
  c.suggested_text,
  c.votes,
  c.created_at,
  u.term,
  u.occurrences,
  u.context,
  array_agg(DISTINCT cf.user_id) FILTER (WHERE cf.vote_type = 'up') as upvoters,
  array_agg(DISTINCT cf.user_id) FILTER (WHERE cf.vote_type = 'down') as downvoters
FROM candidate_responses c
JOIN unknown_terms u ON c.term_id = u.id
LEFT JOIN candidate_feedback cf ON c.id = cf.candidate_id
WHERE c.approved = false
GROUP BY c.id, c.suggested_text, c.votes, c.created_at, u.term, u.occurrences, u.context
ORDER BY c.votes DESC, c.created_at DESC;

-- Bot performance metrics view
CREATE OR REPLACE VIEW bot_metrics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE confidence >= 0.90) as high_confidence,
  COUNT(*) FILTER (WHERE confidence < 0.80) as low_confidence,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT user_id) as active_users
FROM chat_messages
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON TABLE chat_messages IS 'All user messages sent to Copilate Assistant';
COMMENT ON TABLE bot_replies IS 'All bot responses with confidence tracking';
COMMENT ON TABLE unknown_terms IS 'Terms not understood by bot, tracked for learning';
COMMENT ON TABLE candidate_responses IS 'Suggested replies pending approval';
COMMENT ON TABLE knowledge_base IS 'Production knowledge base used for bot replies';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance';
COMMENT ON TABLE learning_events IS 'Bot learning activity tracking';
