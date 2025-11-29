-- Chat Tables Schema for Railway Database
-- Run this on Railway PostgreSQL to create chat tables

-- First, create the required trigger functions if they don't exist
CREATE OR REPLACE FUNCTION public.update_chat_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_chat_training_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_conversations 
    SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Chat Conversations Table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255),
    context_type VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(100),
    entities JSONB DEFAULT '{}',
    response_metadata JSONB DEFAULT '{}',
    feedback VARCHAR(20),
    is_correction BOOLEAN DEFAULT false,
    corrected_from TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Analytics Table
CREATE TABLE IF NOT EXISTS public.chat_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    role_id INTEGER,
    conversation_id INTEGER,
    event_type VARCHAR(50),
    intent VARCHAR(100),
    success BOOLEAN DEFAULT true,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Feedback Table
CREATE TABLE IF NOT EXISTS public.chat_feedback (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    helpful BOOLEAN,
    feedback_type VARCHAR(50),
    comment TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Training Data Table
CREATE TABLE IF NOT EXISTS public.chat_training_data (
    id SERIAL PRIMARY KEY,
    pattern TEXT NOT NULL,
    intent VARCHAR(100) NOT NULL,
    response_template TEXT,
    category VARCHAR(50),
    requires_permission VARCHAR(100),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    examples JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat User Corrections Table
CREATE TABLE IF NOT EXISTS public.chat_user_corrections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    original_message TEXT NOT NULL,
    corrected_message TEXT NOT NULL,
    original_intent VARCHAR(100),
    corrected_intent VARCHAR(100),
    context JSONB DEFAULT '{}',
    learned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat User Preferences Table
CREATE TABLE IF NOT EXISTS public.chat_user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_visit TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    visit_count INTEGER DEFAULT 0,
    preferred_language VARCHAR(10) DEFAULT 'en',
    notification_enabled BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'light',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Common Mistakes Table
CREATE TABLE IF NOT EXISTS public.chat_common_mistakes (
    id SERIAL PRIMARY KEY,
    incorrect_word VARCHAR(255) NOT NULL,
    correct_word VARCHAR(255) NOT NULL,
    frequency INTEGER DEFAULT 1,
    context VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_active ON public.chat_conversations(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_conv_context ON public.chat_conversations(context_type);
CREATE INDEX IF NOT EXISTS idx_chat_conv_updated ON public.chat_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_user ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_role ON public.chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_msg_intent ON public.chat_messages(intent);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON public.chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_analytics_user ON public.chat_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_role ON public.chat_analytics(role_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_event ON public.chat_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_intent ON public.chat_analytics(intent);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_created ON public.chat_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_msg ON public.chat_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_user ON public.chat_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_type ON public.chat_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_chat_training_intent ON public.chat_training_data(intent);
CREATE INDEX IF NOT EXISTS idx_chat_training_category ON public.chat_training_data(category);
CREATE INDEX IF NOT EXISTS idx_chat_training_active ON public.chat_training_data(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_training_priority ON public.chat_training_data(priority DESC);

CREATE INDEX IF NOT EXISTS idx_chat_correction_user ON public.chat_user_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_correction_learned ON public.chat_user_corrections(learned);
CREATE INDEX IF NOT EXISTS idx_chat_correction_created ON public.chat_user_corrections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_pref_user ON public.chat_user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_mistakes_freq ON public.chat_common_mistakes(frequency DESC);

-- Add Foreign Keys (if users and roles tables exist)
DO $$
BEGIN
    -- chat_conversations -> users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_conv_user') THEN
        ALTER TABLE public.chat_conversations 
        ADD CONSTRAINT fk_chat_conv_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- chat_messages -> chat_conversations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_msg_conv') THEN
        ALTER TABLE public.chat_messages 
        ADD CONSTRAINT fk_chat_msg_conv FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
    END IF;
    
    -- chat_messages -> users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_msg_user') THEN
        ALTER TABLE public.chat_messages 
        ADD CONSTRAINT fk_chat_msg_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- chat_analytics -> chat_conversations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_analytics_conv') THEN
        ALTER TABLE public.chat_analytics 
        ADD CONSTRAINT fk_chat_analytics_conv FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
    END IF;
    
    -- chat_analytics -> users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_analytics_user') THEN
        ALTER TABLE public.chat_analytics 
        ADD CONSTRAINT fk_chat_analytics_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- chat_analytics -> roles
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_analytics_role') THEN
        ALTER TABLE public.chat_analytics 
        ADD CONSTRAINT fk_chat_analytics_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
    END IF;
    
    -- chat_feedback -> chat_messages
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_feedback_msg') THEN
        ALTER TABLE public.chat_feedback 
        ADD CONSTRAINT fk_chat_feedback_msg FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;
    END IF;
    
    -- chat_feedback -> users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_feedback_user') THEN
        ALTER TABLE public.chat_feedback 
        ADD CONSTRAINT fk_chat_feedback_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- chat_training_data -> users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_training_creator') THEN
        ALTER TABLE public.chat_training_data 
        ADD CONSTRAINT fk_chat_training_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- chat_user_corrections -> users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_correction_user') THEN
        ALTER TABLE public.chat_user_corrections 
        ADD CONSTRAINT fk_chat_correction_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- chat_user_preferences -> users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_pref_user') THEN
        ALTER TABLE public.chat_user_preferences 
        ADD CONSTRAINT fk_chat_pref_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some foreign keys could not be added: %', SQLERRM;
END $$;

-- Create Triggers
DROP TRIGGER IF EXISTS trigger_update_chat_preferences ON public.chat_user_preferences;
CREATE TRIGGER trigger_update_chat_preferences 
    BEFORE UPDATE ON public.chat_user_preferences 
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_preferences_timestamp();

DROP TRIGGER IF EXISTS trigger_update_chat_training ON public.chat_training_data;
CREATE TRIGGER trigger_update_chat_training 
    BEFORE UPDATE ON public.chat_training_data 
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_training_timestamp();

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON public.chat_messages;
CREATE TRIGGER trigger_update_conversation_timestamp 
    AFTER INSERT ON public.chat_messages 
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- Create unique index for common mistakes
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_mistakes_unique 
    ON public.chat_common_mistakes(incorrect_word, correct_word);

-- Done
SELECT 'Chat tables created successfully!' as status;
