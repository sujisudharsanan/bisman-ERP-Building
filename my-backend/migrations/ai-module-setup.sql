-- ============================================
-- AI Module Database Migration
-- ============================================
-- Description: Creates tables for AI assistant and analytics
-- Date: 2025-10-26
-- Version: 1.0
-- ============================================

-- Table: ai_conversations
-- Stores all conversations between users and AI assistant
CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  role VARCHAR(50) DEFAULT 'user',
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  model VARCHAR(50) DEFAULT 'mistral',
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_id ON ai_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

COMMENT ON TABLE ai_conversations IS 'Stores all AI assistant conversations for audit and history';
COMMENT ON COLUMN ai_conversations.user_id IS 'Reference to user who initiated the conversation';
COMMENT ON COLUMN ai_conversations.tenant_id IS 'Multi-tenant isolation (null = enterprise level)';
COMMENT ON COLUMN ai_conversations.role IS 'User role at time of conversation (enterprise-admin, super-admin, etc.)';
COMMENT ON COLUMN ai_conversations.message IS 'User input/question';
COMMENT ON COLUMN ai_conversations.response IS 'AI generated response';
COMMENT ON COLUMN ai_conversations.model IS 'AI model used (mistral, llama3, etc.)';

-- Table: ai_reports
-- Stores automated AI-generated reports and analytics
CREATE TABLE IF NOT EXISTS ai_reports (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  report_type VARCHAR(50) NOT NULL DEFAULT 'daily',
  report_date DATE NOT NULL,
  report_content JSONB NOT NULL,
  executive_summary TEXT,
  insights TEXT,
  recommendations TEXT,
  status VARCHAR(20) DEFAULT 'generated',
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_reports_tenant_id ON ai_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_report_date ON ai_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_report_type ON ai_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_ai_reports_status ON ai_reports(status);
CREATE INDEX IF NOT EXISTS idx_ai_reports_created_at ON ai_reports(created_at DESC);

-- GIN index for JSONB content search
CREATE INDEX IF NOT EXISTS idx_ai_reports_content_gin ON ai_reports USING GIN (report_content);

COMMENT ON TABLE ai_reports IS 'Automated AI-generated analytics reports';
COMMENT ON COLUMN ai_reports.tenant_id IS 'Multi-tenant isolation (null = enterprise level)';
COMMENT ON COLUMN ai_reports.report_type IS 'Type of report: daily, weekly, sales, inventory, prediction';
COMMENT ON COLUMN ai_reports.report_date IS 'Date the report covers (not generation date)';
COMMENT ON COLUMN ai_reports.report_content IS 'Full report data in JSON format';
COMMENT ON COLUMN ai_reports.executive_summary IS 'Short summary for quick reading';
COMMENT ON COLUMN ai_reports.insights IS 'Key insights from analysis';
COMMENT ON COLUMN ai_reports.recommendations IS 'Actionable recommendations';
COMMENT ON COLUMN ai_reports.status IS 'Report status: generated, reviewed, archived';

-- Table: ai_settings
-- Stores AI module configuration per tenant/user
CREATE TABLE IF NOT EXISTS ai_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'string',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_tenant_id ON ai_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_settings_key ON ai_settings(setting_key);

COMMENT ON TABLE ai_settings IS 'AI module configuration and preferences';
COMMENT ON COLUMN ai_settings.setting_key IS 'Configuration key: preferred_model, auto_reports, report_frequency, etc.';
COMMENT ON COLUMN ai_settings.setting_value IS 'Configuration value (JSON string if complex)';

-- Table: ai_analytics_cache
-- Caches frequently used analytics to reduce AI computation
CREATE TABLE IF NOT EXISTS ai_analytics_cache (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  cache_key VARCHAR(255) NOT NULL,
  cache_data JSONB NOT NULL,
  query_hash VARCHAR(64),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_tenant_id ON ai_analytics_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON ai_analytics_cache(expires_at);

COMMENT ON TABLE ai_analytics_cache IS 'Cache for AI analytics to improve performance';

-- Function: Cleanup old conversations (data retention)
CREATE OR REPLACE FUNCTION cleanup_old_ai_conversations(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_conversations
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_ai_conversations IS 'Cleanup AI conversations older than specified days (default 90)';

-- Function: Cleanup expired cache
CREATE OR REPLACE FUNCTION cleanup_ai_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_analytics_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_ai_cache IS 'Remove expired cache entries';

-- Default AI settings for new tenants
INSERT INTO ai_settings (tenant_id, user_id, setting_key, setting_value, setting_type)
VALUES 
  (NULL, NULL, 'default_model', 'mistral', 'string'),
  (NULL, NULL, 'auto_reports_enabled', 'true', 'boolean'),
  (NULL, NULL, 'report_schedule', '{"frequency": "daily", "time": "20:00"}', 'json'),
  (NULL, NULL, 'max_conversation_history', '100', 'integer'),
  (NULL, NULL, 'enable_predictions', 'true', 'boolean')
ON CONFLICT DO NOTHING;

-- Sample data (optional - remove in production)
-- INSERT INTO ai_conversations (user_id, tenant_id, role, message, response)
-- VALUES 
--   (1, 1, 'super-admin', 'What were our sales yesterday?', 'Based on available data, your sales yesterday totaled $5,234. This is 12% higher than the previous day.'),
--   (1, 1, 'super-admin', 'Show me inventory status', 'Your current inventory shows 3 items below reorder level: Diesel (120L), Petrol 95 (350L), and Engine Oil (15 units).');

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE '✅ AI Module database migration completed successfully!';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - ai_conversations (for chat history)';
  RAISE NOTICE '  - ai_reports (for automated analytics)';
  RAISE NOTICE '  - ai_settings (for configuration)';
  RAISE NOTICE '  - ai_analytics_cache (for performance)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh';
  RAISE NOTICE '  2. Pull AI model: ollama pull mistral';
  RAISE NOTICE '  3. Start Ollama: ollama serve';
  RAISE NOTICE '  4. Test endpoints: curl http://localhost:3000/api/ai/health';
END $$;
