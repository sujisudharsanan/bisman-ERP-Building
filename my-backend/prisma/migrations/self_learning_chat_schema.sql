-- Self-Learning Chat System Database Schema
-- Add to your Prisma schema or run as SQL migration

-- Main interactions table - stores all chat conversations with metadata
CREATE TABLE IF NOT EXISTS chat_interactions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL,
  user_role VARCHAR(50),
  user_hub VARCHAR(100),
  user_locale VARCHAR(10) DEFAULT 'en',
  
  -- Message data
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  raw_input TEXT NOT NULL,
  sanitized_input TEXT NOT NULL,
  user_intent VARCHAR(100),
  
  -- Response data
  model_response TEXT NOT NULL,
  response_candidates JSONB, -- stores n-best responses with scores
  confidence FLOAT,
  intent_predicted VARCHAR(100),
  intent_label VARCHAR(100), -- filled by annotator
  entities_extracted JSONB,
  
  -- Context and tracking
  conversation_turn INTEGER DEFAULT 1,
  previous_intent VARCHAR(100),
  repeated_question BOOLEAN DEFAULT FALSE,
  repeat_count INTEGER DEFAULT 0,
  
  -- Quality metrics
  response_time_ms INTEGER,
  fallback_used BOOLEAN DEFAULT FALSE,
  escalated BOOLEAN DEFAULT FALSE,
  
  -- Learning signals
  user_feedback VARCHAR(20), -- thumbs_up, thumbs_down, unclear, helpful
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  annotated BOOLEAN DEFAULT FALSE,
  annotation_tags JSONB,
  
  -- Safety and compliance
  contains_pii BOOLEAN DEFAULT FALSE,
  pii_redacted BOOLEAN DEFAULT FALSE,
  safety_check_passed BOOLEAN DEFAULT TRUE,
  
  -- Indexing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Annotation queue - manages human review workflow
CREATE TABLE IF NOT EXISTS annotation_queue (
  id SERIAL PRIMARY KEY,
  interaction_id INTEGER REFERENCES chat_interactions(id) ON DELETE CASCADE,
  assigned_to VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, skipped
  priority INTEGER DEFAULT 5, -- 1-10, higher = more urgent
  sampling_reason TEXT, -- why this was selected for annotation
  
  -- Annotation data
  annotated_intent VARCHAR(100),
  annotated_entities JSONB,
  canonical_response TEXT,
  annotation_notes TEXT,
  requires_escalation BOOLEAN DEFAULT FALSE,
  sensitivity_level VARCHAR(20), -- low, medium, high, critical
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  annotator_id VARCHAR(255)
);

-- Training examples - processed and validated training data
CREATE TABLE IF NOT EXISTS training_examples (
  id SERIAL PRIMARY KEY,
  interaction_id INTEGER REFERENCES chat_interactions(id),
  
  -- Training data
  prompt TEXT NOT NULL,
  completion TEXT NOT NULL,
  intent VARCHAR(100) NOT NULL,
  entities JSONB,
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'annotation', -- annotation, synthetic, imported
  quality_score FLOAT, -- 0-1, validated quality
  training_tags JSONB,
  
  -- Versioning
  used_in_training BOOLEAN DEFAULT FALSE,
  training_run_id VARCHAR(255),
  model_version VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  validated BOOLEAN DEFAULT FALSE
);

-- Model registry - tracks deployed models and their performance
CREATE TABLE IF NOT EXISTS model_registry (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) UNIQUE NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50), -- llm, hybrid, rule_based
  
  -- Training info
  training_data_snapshot_id VARCHAR(255),
  training_date TIMESTAMP,
  training_examples_count INTEGER,
  validation_accuracy FLOAT,
  
  -- Performance metrics
  intent_accuracy FLOAT,
  fallback_rate FLOAT,
  avg_confidence FLOAT,
  avg_response_time_ms INTEGER,
  
  -- Deployment info
  deployed BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMP,
  deployed_by VARCHAR(255),
  traffic_percentage INTEGER DEFAULT 0, -- for canary deployments
  
  -- Status
  status VARCHAR(50) DEFAULT 'training', -- training, testing, canary, production, deprecated
  rollback_model_id VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deprecated_at TIMESTAMP
);

-- Session tracking - maintains conversation state
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_role VARCHAR(50),
  
  -- Session state
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  
  -- Context
  current_intent VARCHAR(100),
  context_data JSONB, -- stores extracted entities, workflow state, etc.
  
  -- Metrics
  total_clarifications INTEGER DEFAULT 0,
  total_fallbacks INTEGER DEFAULT 0,
  total_escalations INTEGER DEFAULT 0,
  satisfaction_score INTEGER, -- 1-5
  
  ended_at TIMESTAMP,
  session_duration_seconds INTEGER
);

-- Feedback tracking
CREATE TABLE IF NOT EXISTS chat_feedback (
  id SERIAL PRIMARY KEY,
  interaction_id INTEGER REFERENCES chat_interactions(id),
  session_id VARCHAR(255) REFERENCES chat_sessions(id),
  user_id INTEGER NOT NULL,
  
  feedback_type VARCHAR(50), -- thumbs_up, thumbs_down, flag, rating
  rating INTEGER, -- 1-5
  comment TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_interactions_user ON chat_interactions(user_id);
CREATE INDEX idx_interactions_session ON chat_interactions(session_id);
CREATE INDEX idx_interactions_flagged ON chat_interactions(flagged) WHERE flagged = TRUE;
CREATE INDEX idx_interactions_annotated ON chat_interactions(annotated);
CREATE INDEX idx_interactions_timestamp ON chat_interactions(timestamp DESC);
CREATE INDEX idx_interactions_confidence ON chat_interactions(confidence);
CREATE INDEX idx_queue_status ON annotation_queue(status);
CREATE INDEX idx_queue_priority ON annotation_queue(priority DESC);
CREATE INDEX idx_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_sessions_activity ON chat_sessions(last_activity DESC);

-- Views for common queries
CREATE OR REPLACE VIEW flagged_interactions_view AS
SELECT 
  ci.*,
  aq.status as annotation_status,
  aq.priority as annotation_priority,
  cs.message_count as session_message_count
FROM chat_interactions ci
LEFT JOIN annotation_queue aq ON ci.id = aq.interaction_id
LEFT JOIN chat_sessions cs ON ci.session_id = cs.id
WHERE ci.flagged = TRUE OR ci.confidence < 0.6;

CREATE OR REPLACE VIEW training_ready_view AS
SELECT 
  te.*,
  ci.user_role,
  ci.timestamp as original_timestamp
FROM training_examples te
JOIN chat_interactions ci ON te.interaction_id = ci.id
WHERE te.validated = TRUE AND te.used_in_training = FALSE;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET 
    last_activity = NEW.timestamp,
    message_count = message_count + 1
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session
AFTER INSERT ON chat_interactions
FOR EACH ROW
EXECUTE FUNCTION update_session_activity();
