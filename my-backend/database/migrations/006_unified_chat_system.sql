-- =====================================================
-- UNIFIED AI CHAT SYSTEM - DATABASE SCHEMA
-- =====================================================
-- Consolidates all chat implementations into one
-- Features: RBAC, user data storage, dynamic responses
-- Created: 2025-11-14
-- =====================================================

-- =====================================================
-- 1. CHAT CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255),
    context_type VARCHAR(50) DEFAULT 'general', -- general, task, approval, support, report
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}', -- Store dynamic context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_chat_conv_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_conv_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_conv_active ON chat_conversations(is_active);
CREATE INDEX idx_chat_conv_context ON chat_conversations(context_type);
CREATE INDEX idx_chat_conv_updated ON chat_conversations(last_message_at DESC);

-- =====================================================
-- 2. CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    intent VARCHAR(100), -- Classified intent (e.g., 'list_tasks', 'get_report')
    entities JSONB DEFAULT '{}', -- Extracted entities
    response_metadata JSONB DEFAULT '{}', -- Dynamic response data
    feedback VARCHAR(20), -- positive, negative, neutral
    is_correction BOOLEAN DEFAULT false,
    corrected_from TEXT, -- Original message if this is a correction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_chat_msg_conv FOREIGN KEY (conversation_id) 
        REFERENCES chat_conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_msg_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_msg_conv ON chat_messages(conversation_id);
CREATE INDEX idx_chat_msg_user ON chat_messages(user_id);
CREATE INDEX idx_chat_msg_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_msg_intent ON chat_messages(intent);
CREATE INDEX idx_chat_msg_role ON chat_messages(role);

-- =====================================================
-- 3. CHAT USER PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    visit_count INTEGER DEFAULT 0,
    preferred_language VARCHAR(10) DEFAULT 'en',
    notification_enabled BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'light', -- light, dark
    settings JSONB DEFAULT '{}', -- Custom settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_chat_pref_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_pref_user ON chat_user_preferences(user_id);

-- =====================================================
-- 4. CHAT TRAINING DATA TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_training_data (
    id SERIAL PRIMARY KEY,
    pattern TEXT NOT NULL,
    intent VARCHAR(100) NOT NULL,
    response_template TEXT,
    category VARCHAR(50), -- tasks, approvals, reports, general, help
    requires_permission VARCHAR(100), -- RBAC permission required
    priority INTEGER DEFAULT 0, -- Higher priority patterns matched first
    is_active BOOLEAN DEFAULT true,
    examples JSONB DEFAULT '[]', -- Example messages
    metadata JSONB DEFAULT '{}',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_chat_training_creator FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_chat_training_intent ON chat_training_data(intent);
CREATE INDEX idx_chat_training_active ON chat_training_data(is_active);
CREATE INDEX idx_chat_training_priority ON chat_training_data(priority DESC);
CREATE INDEX idx_chat_training_category ON chat_training_data(category);

-- =====================================================
-- 5. CHAT USER CORRECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_user_corrections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    original_message TEXT NOT NULL,
    corrected_message TEXT NOT NULL,
    original_intent VARCHAR(100),
    corrected_intent VARCHAR(100),
    context JSONB DEFAULT '{}',
    learned BOOLEAN DEFAULT false, -- Has this been incorporated into training?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_chat_correction_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_correction_user ON chat_user_corrections(user_id);
CREATE INDEX idx_chat_correction_learned ON chat_user_corrections(learned);
CREATE INDEX idx_chat_correction_created ON chat_user_corrections(created_at DESC);

-- =====================================================
-- 6. CHAT FEEDBACK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_feedback (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    helpful BOOLEAN,
    feedback_type VARCHAR(50), -- thumbs_up, thumbs_down, correction, comment
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_chat_feedback_msg FOREIGN KEY (message_id) 
        REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_feedback_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_feedback_msg ON chat_feedback(message_id);
CREATE INDEX idx_chat_feedback_user ON chat_feedback(user_id);
CREATE INDEX idx_chat_feedback_type ON chat_feedback(feedback_type);

-- =====================================================
-- 7. CHAT ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    role_id INTEGER,
    conversation_id INTEGER,
    event_type VARCHAR(50), -- message_sent, response_generated, feedback_given, correction_made
    intent VARCHAR(100),
    success BOOLEAN DEFAULT true,
    response_time_ms INTEGER, -- Response generation time
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_chat_analytics_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_chat_analytics_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE SET NULL,
    CONSTRAINT fk_chat_analytics_conv FOREIGN KEY (conversation_id) 
        REFERENCES chat_conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_analytics_user ON chat_analytics(user_id);
CREATE INDEX idx_chat_analytics_role ON chat_analytics(role_id);
CREATE INDEX idx_chat_analytics_event ON chat_analytics(event_type);
CREATE INDEX idx_chat_analytics_created ON chat_analytics(created_at DESC);
CREATE INDEX idx_chat_analytics_intent ON chat_analytics(intent);

-- =====================================================
-- 8. CHAT COMMON MISTAKES TABLE (For Spell Check)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_common_mistakes (
    id SERIAL PRIMARY KEY,
    incorrect_word VARCHAR(255) NOT NULL,
    correct_word VARCHAR(255) NOT NULL,
    frequency INTEGER DEFAULT 1, -- How often this mistake occurs
    context VARCHAR(100), -- Where this is commonly misspelled
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_chat_mistakes_unique ON chat_common_mistakes(incorrect_word, correct_word);
CREATE INDEX idx_chat_mistakes_freq ON chat_common_mistakes(frequency DESC);

-- =====================================================
-- 9. INSERT DEFAULT TRAINING DATA
-- =====================================================

-- General Greetings
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples) VALUES
('hello|hi|hey|good morning|good afternoon', 'greeting', 'Hello {firstName}! How can I assist you today?', 'general', 100, 
    '["hello", "hi there", "hey", "good morning"]'::jsonb),
('how are you|what''s up|how''s it going', 'greeting', 'I''m doing great! Ready to help you with your tasks.', 'general', 90,
    '["how are you", "whats up", "hows it going"]'::jsonb),
('goodbye|bye|see you|talk later', 'farewell', 'Goodbye {firstName}! Have a great day!', 'general', 100,
    '["goodbye", "bye", "see you later"]'::jsonb);

-- Task Management
INSERT INTO chat_training_data (pattern, intent, response_template, category, requires_permission, priority, examples) VALUES
('show|list|get|view.*task', 'list_tasks', 'Here are your tasks:', 'tasks', 'view_tasks', 95,
    '["show my tasks", "list all tasks", "get my tasks", "view tasks"]'::jsonb),
('create|add|new.*task', 'create_task', 'I can help you create a task. What should be the task title?', 'tasks', 'create_task', 95,
    '["create a task", "add new task", "create task"]'::jsonb),
('pending|incomplete|active.*task', 'list_pending_tasks', 'Fetching your pending tasks...', 'tasks', 'view_tasks', 90,
    '["show pending tasks", "list incomplete tasks", "active tasks"]'::jsonb),
('complete|done|finish.*task', 'complete_task', 'Which task would you like to mark as complete?', 'tasks', 'update_task', 90,
    '["mark task as complete", "task done", "finish task"]'::jsonb);

-- Approval Management
INSERT INTO chat_training_data (pattern, intent, response_template, category, requires_permission, priority, examples) VALUES
('approval|pending approval|need approval', 'list_approvals', 'Checking your pending approvals...', 'approvals', 'view_approvals', 95,
    '["show approvals", "pending approvals", "what needs approval"]'::jsonb),
('approve|accept|grant', 'approve_request', 'Which request would you like to approve?', 'approvals', 'approve_request', 90,
    '["approve request", "accept approval", "grant approval"]'::jsonb),
('reject|deny|decline', 'reject_request', 'Which request should I reject?', 'approvals', 'reject_request', 90,
    '["reject request", "deny approval", "decline request"]'::jsonb);

-- Reports
INSERT INTO chat_training_data (pattern, intent, response_template, category, requires_permission, priority, examples) VALUES
('report|analytics|statistics|stats', 'get_report', 'What type of report would you like to see?', 'reports', 'view_reports', 90,
    '["show report", "get analytics", "view statistics"]'::jsonb),
('sales|revenue|income', 'sales_report', 'Generating sales report...', 'reports', 'view_reports', 85,
    '["sales report", "revenue report", "income stats"]'::jsonb),
('task.*report|task.*summary', 'task_report', 'Generating task summary...', 'reports', 'view_reports', 85,
    '["task report", "task summary", "task statistics"]'::jsonb);

-- Help & Support
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples) VALUES
('help|assist|support|guide', 'help', 'I can help you with:\n• Managing tasks\n• Approvals\n• Reports\n• System navigation\nWhat do you need?', 'help', 100,
    '["help", "i need help", "assist me", "guide me"]'::jsonb),
('what can you do|capabilities|features', 'capabilities', 'I can help you with tasks, approvals, reports, and general ERP navigation. I learn from your corrections!', 'help', 95,
    '["what can you do", "your capabilities", "what features"]'::jsonb),
('thank|thanks|appreciate', 'thanks', 'You''re welcome! Happy to help!', 'general', 100,
    '["thank you", "thanks", "appreciate it"]'::jsonb);

-- =====================================================
-- 10. INSERT COMMON SPELLING MISTAKES
-- =====================================================

INSERT INTO chat_common_mistakes (incorrect_word, correct_word, frequency, context) VALUES
('taks', 'task', 10, 'task_management'),
('taask', 'task', 5, 'task_management'),
('tsak', 'task', 3, 'task_management'),
('aprroval', 'approval', 8, 'approval_management'),
('aproval', 'approval', 12, 'approval_management'),
('approvel', 'approval', 6, 'approval_management'),
('reprot', 'report', 10, 'reporting'),
('reoprt', 'report', 4, 'reporting'),
('reporrt', 'report', 3, 'reporting'),
('crate', 'create', 8, 'general'),
('creat', 'create', 6, 'general'),
('shwo', 'show', 7, 'general'),
('lsit', 'list', 5, 'general'),
('udpate', 'update', 6, 'general'),
('delte', 'delete', 4, 'general');

-- =====================================================
-- 11. TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Update chat_conversations.updated_at on message insert
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations 
    SET last_message_at = NEW.created_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Update chat_user_preferences.updated_at
CREATE OR REPLACE FUNCTION update_chat_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_preferences
BEFORE UPDATE ON chat_user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_chat_preferences_timestamp();

-- Update chat_training_data.updated_at
CREATE OR REPLACE FUNCTION update_chat_training_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_training
BEFORE UPDATE ON chat_training_data
FOR EACH ROW
EXECUTE FUNCTION update_chat_training_timestamp();

-- =====================================================
-- 12. VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for user chat summary
CREATE OR REPLACE VIEW v_user_chat_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    r.role_name,
    cp.visit_count,
    cp.last_visit,
    COUNT(DISTINCT cc.id) as total_conversations,
    COUNT(DISTINCT cm.id) as total_messages,
    COUNT(DISTINCT CASE WHEN cm.feedback = 'positive' THEN cm.id END) as positive_feedback,
    COUNT(DISTINCT CASE WHEN cm.feedback = 'negative' THEN cm.id END) as negative_feedback
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN chat_user_preferences cp ON u.id = cp.user_id
LEFT JOIN chat_conversations cc ON u.id = cc.user_id
LEFT JOIN chat_messages cm ON u.id = cm.user_id AND cm.role = 'user'
GROUP BY u.id, u.name, u.email, r.role_name, cp.visit_count, cp.last_visit;

-- View for popular intents by role
CREATE OR REPLACE VIEW v_chat_intent_analytics AS
SELECT 
    r.role_name,
    cm.intent,
    COUNT(*) as usage_count,
    COUNT(DISTINCT cm.user_id) as unique_users,
    AVG(ca.response_time_ms) as avg_response_time,
    COUNT(CASE WHEN cm.feedback = 'positive' THEN 1 END) as positive_count,
    COUNT(CASE WHEN cm.feedback = 'negative' THEN 1 END) as negative_count
FROM chat_messages cm
JOIN users u ON cm.user_id = u.id
JOIN roles r ON u.role_id = r.id
LEFT JOIN chat_analytics ca ON cm.id = ca.metadata->>'message_id'
WHERE cm.intent IS NOT NULL
GROUP BY r.role_name, cm.intent
ORDER BY usage_count DESC;

-- =====================================================
-- 13. RBAC INTEGRATION
-- =====================================================

-- Function to check if user has permission for chat action
CREATE OR REPLACE FUNCTION check_chat_permission(
    p_user_id INTEGER,
    p_permission VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN;
BEGIN
    -- Check if user has the required permission through their role
    SELECT EXISTS (
        SELECT 1 
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN rbac_route_permissions rrp ON r.id = rrp.role_id
        JOIN rbac_routes rr ON rrp.route_id = rr.id
        WHERE u.id = p_user_id
        AND (
            rr.route_key = p_permission 
            OR p_permission IS NULL
        )
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. SEED CHAT PREFERENCES FOR EXISTING USERS
-- =====================================================

INSERT INTO chat_user_preferences (user_id, first_name, visit_count)
SELECT 
    id,
    SPLIT_PART(name, ' ', 1) as first_name,
    0 as visit_count
FROM users
WHERE id NOT IN (SELECT user_id FROM chat_user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 15. GRANTS & PERMISSIONS
-- =====================================================

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Unified Chat System Schema Created Successfully!';
    RAISE NOTICE '📊 Tables Created:';
    RAISE NOTICE '   - chat_conversations';
    RAISE NOTICE '   - chat_messages';
    RAISE NOTICE '   - chat_user_preferences';
    RAISE NOTICE '   - chat_training_data';
    RAISE NOTICE '   - chat_user_corrections';
    RAISE NOTICE '   - chat_feedback';
    RAISE NOTICE '   - chat_analytics';
    RAISE NOTICE '   - chat_common_mistakes';
    RAISE NOTICE '📈 Views Created:';
    RAISE NOTICE '   - v_user_chat_summary';
    RAISE NOTICE '   - v_chat_intent_analytics';
    RAISE NOTICE '🔧 Functions Created:';
    RAISE NOTICE '   - check_chat_permission()';
    RAISE NOTICE '🎯 Default training data loaded';
    RAISE NOTICE '📝 Common spelling mistakes loaded';
END $$;
