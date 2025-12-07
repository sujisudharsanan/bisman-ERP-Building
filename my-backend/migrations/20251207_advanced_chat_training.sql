-- =====================================================
-- ADVANCED CHAT TRAINING SYSTEM
-- =====================================================
-- Enhanced training with:
-- - Semantic embeddings for similarity matching
-- - Multi-turn conversation context
-- - Feedback loops for continuous learning
-- - Intent confidence tracking
-- - Entity extraction patterns
-- - A/B testing for responses
-- - Analytics and performance metrics
-- =====================================================

-- 1. ENHANCED TRAINING DATA TABLE
-- Drop and recreate with advanced fields
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS synonyms JSONB DEFAULT '{}';
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS entity_patterns JSONB DEFAULT '{}';
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS follow_up_intents TEXT[] DEFAULT '{}';
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS context_required JSONB DEFAULT '{}';
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS response_variants JSONB DEFAULT '[]';
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,4) DEFAULT 0.0;
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS total_matches INTEGER DEFAULT 0;
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS positive_feedback INTEGER DEFAULT 0;
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS negative_feedback INTEGER DEFAULT 0;
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS last_matched_at TIMESTAMP;
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'medium';
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE chat_training_data ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 2. CONVERSATION CONTEXT TABLE (for multi-turn conversations)
CREATE TABLE IF NOT EXISTS chat_conversation_context (
    id SERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL,
    user_id INTEGER REFERENCES users_enhanced(id),
    turn_number INTEGER NOT NULL DEFAULT 1,
    user_message TEXT NOT NULL,
    bot_response TEXT,
    intent VARCHAR(100),
    confidence DECIMAL(5,4),
    entities JSONB DEFAULT '{}',
    context_state JSONB DEFAULT '{}',
    parent_turn_id INTEGER REFERENCES chat_conversation_context(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_context_conv ON chat_conversation_context(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_context_user ON chat_conversation_context(user_id);

-- 3. FEEDBACK & LEARNING TABLE
CREATE TABLE IF NOT EXISTS chat_feedback (
    id SERIAL PRIMARY KEY,
    conversation_id UUID,
    message_id INTEGER,
    user_id INTEGER REFERENCES users_enhanced(id),
    training_data_id INTEGER REFERENCES chat_training_data(id),
    feedback_type VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'correction', 'suggestion'
    feedback_value INTEGER, -- 1-5 rating or thumbs up/down (1/-1)
    user_correction TEXT, -- What the user thinks is correct
    user_expected_intent VARCHAR(100), -- What intent user expected
    original_response TEXT,
    correct_response TEXT,
    metadata JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_training ON chat_feedback(training_data_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_processed ON chat_feedback(processed);

-- 4. ENTITY DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS chat_entity_types (
    id SERIAL PRIMARY KEY,
    entity_name VARCHAR(50) NOT NULL UNIQUE,
    entity_type VARCHAR(30) NOT NULL, -- 'built_in', 'custom', 'regex', 'list'
    patterns TEXT[], -- Regex patterns for extraction
    values JSONB, -- For list-based entities (e.g., departments)
    synonyms JSONB DEFAULT '{}',
    description TEXT,
    examples TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. INTENT RELATIONSHIPS (for conversation flow)
CREATE TABLE IF NOT EXISTS chat_intent_flows (
    id SERIAL PRIMARY KEY,
    from_intent VARCHAR(100) NOT NULL,
    to_intent VARCHAR(100) NOT NULL,
    trigger_condition JSONB, -- When this transition should happen
    probability DECIMAL(5,4) DEFAULT 0.5, -- Likelihood of this flow
    context_update JSONB, -- What context to update
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intent_flow_unique ON chat_intent_flows(from_intent, to_intent);

-- 6. RESPONSE VARIANTS FOR A/B TESTING
CREATE TABLE IF NOT EXISTS chat_response_variants (
    id SERIAL PRIMARY KEY,
    training_data_id INTEGER REFERENCES chat_training_data(id),
    variant_name VARCHAR(50),
    response_template TEXT NOT NULL,
    weight DECIMAL(5,4) DEFAULT 0.5, -- Selection weight for A/B testing
    impressions INTEGER DEFAULT 0,
    positive_reactions INTEGER DEFAULT 0,
    negative_reactions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_response_variants_training ON chat_response_variants(training_data_id);

-- 7. TRAINING ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS chat_training_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_messages INTEGER DEFAULT 0,
    matched_intents INTEGER DEFAULT 0,
    unmatched_intents INTEGER DEFAULT 0,
    avg_confidence DECIMAL(5,4),
    top_intents JSONB DEFAULT '[]',
    top_unmatched_queries JSONB DEFAULT '[]',
    feedback_positive INTEGER DEFAULT 0,
    feedback_negative INTEGER DEFAULT 0,
    new_training_added INTEGER DEFAULT 0,
    model_accuracy DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_date ON chat_training_analytics(date);

-- 8. LEARNING QUEUE (for admin review of suggested training)
CREATE TABLE IF NOT EXISTS chat_learning_queue (
    id SERIAL PRIMARY KEY,
    source VARCHAR(30) NOT NULL, -- 'user_feedback', 'unmatched', 'low_confidence', 'correction'
    user_message TEXT NOT NULL,
    detected_intent VARCHAR(100),
    confidence DECIMAL(5,4),
    suggested_intent VARCHAR(100),
    suggested_response TEXT,
    user_feedback TEXT,
    frequency INTEGER DEFAULT 1, -- How many times similar query seen
    similar_messages JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'merged'
    reviewed_by INTEGER REFERENCES users_enhanced(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_queue_status ON chat_learning_queue(status);
CREATE INDEX IF NOT EXISTS idx_learning_queue_source ON chat_learning_queue(source);

-- 9. CONTEXT SLOTS (for slot filling in conversations)
CREATE TABLE IF NOT EXISTS chat_context_slots (
    id SERIAL PRIMARY KEY,
    intent VARCHAR(100) NOT NULL,
    slot_name VARCHAR(50) NOT NULL,
    slot_type VARCHAR(30) NOT NULL, -- 'entity', 'text', 'number', 'date', 'boolean', 'list'
    entity_type VARCHAR(50), -- References chat_entity_types
    is_required BOOLEAN DEFAULT FALSE,
    prompt_message TEXT, -- Message to ask if slot is missing
    validation_regex TEXT,
    default_value TEXT,
    order_priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_context_slots_unique ON chat_context_slots(intent, slot_name);

-- 10. SEMANTIC SIMILARITY CACHE (for faster lookups)
CREATE TABLE IF NOT EXISTS chat_semantic_cache (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    matched_intent VARCHAR(100),
    matched_training_id INTEGER REFERENCES chat_training_data(id),
    similarity_score DECIMAL(5,4),
    hit_count INTEGER DEFAULT 1,
    last_hit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_semantic_cache_hash ON chat_semantic_cache(query_hash);

-- 11. FUNCTION: Calculate and update success rates
CREATE OR REPLACE FUNCTION update_training_success_rate()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_training_data
    SET success_rate = CASE 
        WHEN (positive_feedback + negative_feedback) > 0 
        THEN positive_feedback::decimal / (positive_feedback + negative_feedback)
        ELSE 0
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.training_data_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for feedback updates
DROP TRIGGER IF EXISTS trigger_update_success_rate ON chat_feedback;
CREATE TRIGGER trigger_update_success_rate
AFTER INSERT ON chat_feedback
FOR EACH ROW
WHEN (NEW.training_data_id IS NOT NULL)
EXECUTE FUNCTION update_training_success_rate();

-- 12. FUNCTION: Add to learning queue from unmatched queries
CREATE OR REPLACE FUNCTION add_to_learning_queue(
    p_message TEXT,
    p_detected_intent VARCHAR(100),
    p_confidence DECIMAL(5,4),
    p_source VARCHAR(30) DEFAULT 'unmatched'
)
RETURNS INTEGER AS $$
DECLARE
    v_existing_id INTEGER;
    v_new_id INTEGER;
BEGIN
    -- Check if similar message exists
    SELECT id INTO v_existing_id
    FROM chat_learning_queue
    WHERE status = 'pending'
    AND SIMILARITY(user_message, p_message) > 0.7
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
        -- Update existing record
        UPDATE chat_learning_queue
        SET frequency = frequency + 1,
            similar_messages = similar_messages || jsonb_build_array(p_message),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_existing_id;
        RETURN v_existing_id;
    ELSE
        -- Insert new record
        INSERT INTO chat_learning_queue (source, user_message, detected_intent, confidence, suggested_intent)
        VALUES (p_source, p_message, p_detected_intent, p_confidence, p_detected_intent)
        RETURNING id INTO v_new_id;
        RETURN v_new_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 13. FUNCTION: Get best response variant (for A/B testing)
CREATE OR REPLACE FUNCTION get_best_response_variant(p_training_id INTEGER)
RETURNS TABLE (
    variant_id INTEGER,
    response_template TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT rv.id, rv.response_template
    FROM chat_response_variants rv
    WHERE rv.training_data_id = p_training_id
    AND rv.is_active = TRUE
    ORDER BY 
        -- Thompson Sampling: balance exploration vs exploitation
        (rv.positive_reactions + 1.0) / (rv.impressions + 2.0) * random() DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 14. FUNCTION: Daily analytics aggregation
CREATE OR REPLACE FUNCTION aggregate_chat_analytics()
RETURNS void AS $$
BEGIN
    INSERT INTO chat_training_analytics (
        date,
        total_messages,
        matched_intents,
        unmatched_intents,
        avg_confidence,
        feedback_positive,
        feedback_negative
    )
    SELECT 
        CURRENT_DATE,
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE intent IS NOT NULL AND intent != 'unknown') as matched_intents,
        COUNT(*) FILTER (WHERE intent IS NULL OR intent = 'unknown') as unmatched_intents,
        AVG(confidence) FILTER (WHERE confidence IS NOT NULL) as avg_confidence,
        (SELECT COUNT(*) FROM chat_feedback WHERE feedback_type = 'positive' AND DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM chat_feedback WHERE feedback_type = 'negative' AND DATE(created_at) = CURRENT_DATE)
    FROM chat_conversation_context
    WHERE DATE(created_at) = CURRENT_DATE
    ON CONFLICT (date) DO UPDATE
    SET total_messages = EXCLUDED.total_messages,
        matched_intents = EXCLUDED.matched_intents,
        unmatched_intents = EXCLUDED.unmatched_intents,
        avg_confidence = EXCLUDED.avg_confidence,
        feedback_positive = EXCLUDED.feedback_positive,
        feedback_negative = EXCLUDED.feedback_negative;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_trgm for similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram index for similarity searches
CREATE INDEX IF NOT EXISTS idx_learning_queue_trgm ON chat_learning_queue USING gin(user_message gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_training_pattern_trgm ON chat_training_data USING gin(pattern gin_trgm_ops);

COMMENT ON TABLE chat_conversation_context IS 'Stores multi-turn conversation state for context-aware responses';
COMMENT ON TABLE chat_feedback IS 'User feedback for continuous learning and model improvement';
COMMENT ON TABLE chat_entity_types IS 'Custom entity definitions for named entity recognition';
COMMENT ON TABLE chat_intent_flows IS 'Defines valid conversation flows between intents';
COMMENT ON TABLE chat_response_variants IS 'A/B testing variants for response optimization';
COMMENT ON TABLE chat_training_analytics IS 'Daily aggregated metrics for training performance';
COMMENT ON TABLE chat_learning_queue IS 'Queue of potential new training data for admin review';
COMMENT ON TABLE chat_context_slots IS 'Slot definitions for multi-turn slot filling';
COMMENT ON TABLE chat_semantic_cache IS 'Cache for frequently asked queries';

SELECT 'Advanced Chat Training Schema Created Successfully!' as status;
