--
-- PostgreSQL database dump
--

\restrict 3iObDrn7KtdbEZhxUDAEpsJa1EBrhuuibwJ0spZu86hwpd41PWC7ExZyVGGewqL

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 17.6 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: erp; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA erp;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: AddressType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AddressType" AS ENUM (
    'PERMANENT',
    'OFFICE',
    'HOME',
    'CORRESPONDENCE'
);


--
-- Name: Gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);


--
-- Name: KYCStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."KYCStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED'
);


--
-- Name: MaritalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MaritalStatus" AS ENUM (
    'SINGLE',
    'MARRIED',
    'DIVORCED',
    'WIDOWED'
);


--
-- Name: OcrStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OcrStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'DONE',
    'FAILED'
);


--
-- Name: ProficiencyLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProficiencyLevel" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT'
);


--
-- Name: account_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_status AS ENUM (
    'active',
    'inactive',
    'closed'
);


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'savings',
    'current',
    'salary',
    'business'
);


--
-- Name: approval_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_action AS ENUM (
    'APPROVED',
    'REJECTED',
    'RETURNED',
    'ESCALATED',
    'PENDING'
);


--
-- Name: approval_instance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_instance_status AS ENUM (
    'draft',
    'pending',
    'in_progress',
    'approved',
    'rejected',
    'cancelled',
    'expired'
);


--
-- Name: approval_stage_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_stage_status AS ENUM (
    'pending',
    'active',
    'approved',
    'rejected',
    'skipped',
    'escalated',
    'expired'
);


--
-- Name: bank_file_format; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bank_file_format AS ENUM (
    'CSV',
    'XLS',
    'XLSX',
    'OFX',
    'MT940'
);


--
-- Name: billing_cycle_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing_cycle_type AS ENUM (
    'MONTHLY',
    'YEARLY',
    'CUSTOM'
);


--
-- Name: billing_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing_source_type AS ENUM (
    'feature',
    'infra',
    'unlock',
    'base_plan'
);


--
-- Name: call_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.call_status AS ENUM (
    'ringing',
    'ongoing',
    'ended',
    'missed',
    'declined',
    'failed'
);


--
-- Name: clarification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clarification_status AS ENUM (
    'pending',
    'responded',
    'expired',
    'cancelled'
);


--
-- Name: client_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.client_status AS ENUM (
    'Active',
    'Inactive',
    'Suspended',
    'Pending',
    'Archived'
);


--
-- Name: fallback_strategy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fallback_strategy AS ENUM (
    'none',
    'skip_stage',
    'auto_approve',
    'auto_assign_admin',
    'assign_department_head',
    'escalate_to_next',
    'queue_for_manual'
);


--
-- Name: feature_flag_value; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feature_flag_value AS ENUM (
    'DISABLED',
    'ENABLED',
    'LIMITED',
    'UNLIMITED'
);


--
-- Name: limit_period_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.limit_period_type AS ENUM (
    'lifetime',
    'daily',
    'weekly',
    'monthly',
    'yearly'
);


--
-- Name: lock_mode_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lock_mode_type AS ENUM (
    'none',
    'soft',
    'hard'
);


--
-- Name: message_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_type AS ENUM (
    'text',
    'image',
    'file',
    'audio',
    'video',
    'system',
    'call'
);


--
-- Name: micro_invoice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.micro_invoice_status AS ENUM (
    'PENDING',
    'GENERATED',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'REFUNDED'
);


--
-- Name: onboarding_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.onboarding_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
);


--
-- Name: payment_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_request_status AS ENUM (
    'DRAFT',
    'PENDING',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'PAID',
    'CANCELLED',
    'EXPIRED'
);


--
-- Name: plan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_status AS ENUM (
    'active',
    'inactive',
    'archived'
);


--
-- Name: recon_batch_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recon_batch_status AS ENUM (
    'DRAFT',
    'PARSED',
    'MATCHING',
    'REVIEW',
    'FINALIZED',
    'CANCELLED'
);


--
-- Name: recon_exception_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recon_exception_type AS ENUM (
    'BANK_CHARGE',
    'INTEREST',
    'REVERSAL',
    'DUPLICATE',
    'AMOUNT_MISMATCH',
    'DATE_MISMATCH',
    'UNKNOWN_UTR',
    'OTHER'
);


--
-- Name: recon_match_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recon_match_type AS ENUM (
    'EXACT_UTR',
    'AMOUNT_DATE',
    'FUZZY_DESC',
    'MANUAL',
    'UNMATCHED'
);


--
-- Name: review_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_purpose AS ENUM (
    'FYI',
    'CONFIRMATION',
    'AUDIT',
    'KNOWLEDGE'
);


--
-- Name: review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_status AS ENUM (
    'PENDING',
    'ACKNOWLEDGED',
    'COMMENTED',
    'EXPIRED',
    'CANCELLED'
);


--
-- Name: settlement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.settlement_status AS ENUM (
    'DRAFT',
    'SUBMITTED_TO_FINANCE',
    'FINANCE_CONTROLLER_APPROVED',
    'CFO_APPROVED',
    'SENT_TO_BANK',
    'PAID',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: stage_assignee_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stage_assignee_type AS ENUM (
    'specific_user',
    'role',
    'department_head',
    'requester_manager',
    'dynamic_rule'
);


--
-- Name: subscription_plan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_plan AS ENUM (
    'free',
    'starter',
    'professional',
    'enterprise',
    'custom'
);


--
-- Name: subscription_plan_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_plan_tier AS ENUM (
    'STARTER',
    'PROFESSIONAL',
    'BUSINESS',
    'ENTERPRISE',
    'CUSTOM'
);


--
-- Name: subscription_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_state AS ENUM (
    'TRIAL',
    'ACTIVE',
    'UPGRADING',
    'DOWNGRADING',
    'GRACE_PERIOD',
    'SUSPENDED',
    'CANCELLED'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'suspended',
    'cancelled',
    'expired',
    'trial'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: task_workflow_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_workflow_status AS ENUM (
    'DRAFT',
    'ASSIGNED',
    'IN_PROGRESS',
    'IN_REVIEW',
    'NEED_ATTENTION',
    'DONE',
    'CANCELLED',
    'ARCHIVED'
);


--
-- Name: txn_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.txn_direction AS ENUM (
    'CREDIT',
    'DEBIT'
);


--
-- Name: unlock_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.unlock_status AS ENUM (
    'LOCKED',
    'UNLOCKED',
    'TRIAL',
    'EXPIRED'
);


--
-- Name: usage_period_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usage_period_type AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'YEARLY',
    'LIFETIME'
);


--
-- Name: user_role_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role_type AS ENUM (
    'SYSTEM_ADMIN',
    'ENTERPRISE_ADMIN',
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'FINANCE_CONTROLLER',
    'HR_MANAGER',
    'OPERATIONS_MANAGER',
    'STAFF',
    'VIEWER',
    'USER'
);


--
-- Name: workflow_entity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_entity_type AS ENUM (
    'payment_request',
    'purchase_order',
    'expense_claim',
    'leave_request',
    'time_off',
    'travel_request',
    'asset_request',
    'contract_approval',
    'invoice_approval',
    'budget_request',
    'general_approval',
    'task_request'
);


--
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        INSERT INTO erp.audit_logs (
            table_name, record_id, action, old_data, new_data, timestamp
        ) VALUES (
            TG_TABLE_NAME, OLD.id::TEXT, TG_OP, old_data, NULL, CURRENT_TIMESTAMP
        );
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        INSERT INTO erp.audit_logs (
            table_name, record_id, action, old_data, new_data, timestamp
        ) VALUES (
            TG_TABLE_NAME, NEW.id::TEXT, TG_OP, NULL, new_data, CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        INSERT INTO erp.audit_logs (
            table_name, record_id, action, old_data, new_data, timestamp
        ) VALUES (
            TG_TABLE_NAME, NEW.id::TEXT, TG_OP, old_data, new_data, CURRENT_TIMESTAMP
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: decrypt_sensitive_data(text, text); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.decrypt_sensitive_data(encrypted_data text, key text DEFAULT 'default_encryption_key'::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(encrypted_data, 'base64'),
        key
    );
EXCEPTION
    WHEN others THEN
        RETURN NULL; -- Return NULL if decryption fails
END;
$$;


--
-- Name: encrypt_sensitive_data(text, text); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.encrypt_sensitive_data(data text, key text DEFAULT 'default_encryption_key'::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(data, key),
        'base64'
    );
END;
$$;


--
-- Name: get_current_user_company_id(); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.get_current_user_company_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_company_id', true)::UUID,
        NULL
    );
END;
$$;


--
-- Name: get_current_user_id(); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.get_current_user_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        NULL
    );
END;
$$;


--
-- Name: get_current_user_role(); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.get_current_user_role() RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_role', true),
        'guest'
    );
END;
$$;


--
-- Name: hash_password(text, text); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.hash_password(password text, salt text DEFAULT NULL::text) RETURNS TABLE(password_hash text, password_salt text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    generated_salt TEXT;
BEGIN
    -- Generate salt if not provided
    IF salt IS NULL THEN
        generated_salt := encode(gen_random_bytes(32), 'hex');
    ELSE
        generated_salt := salt;
    END IF;
    
    -- Return hashed password and salt
    RETURN QUERY SELECT 
        crypt(password, '$2a$10$' || generated_salt) as password_hash,
        generated_salt as password_salt;
END;
$_$;


--
-- Name: log_security_event(text, uuid, jsonb, inet, text); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.log_security_event(event_type text, user_id_param uuid, details jsonb, ip_address_param inet DEFAULT NULL::inet, user_agent_param text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO erp.audit_logs (
        table_name,
        record_id,
        action,
        new_data,
        user_id,
        ip_address,
        user_agent,
        timestamp
    ) VALUES (
        'security_events',
        event_type,
        'SECURITY',
        details,
        user_id_param,
        ip_address_param,
        user_agent_param,
        CURRENT_TIMESTAMP
    );
END;
$$;


--
-- Name: password_change_trigger(); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.password_change_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        NEW.password_changed_at := CURRENT_TIMESTAMP;
        NEW.login_attempts := 0;
    END IF;
    
    IF OLD.last_login IS DISTINCT FROM NEW.last_login AND NEW.last_login IS NOT NULL THEN
        NEW.login_attempts := 0;
        NEW.locked_until := NULL;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: secure_login(text, text, inet, text); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.secure_login(user_email text, password text, ip_address inet DEFAULT NULL::inet, user_agent text DEFAULT NULL::text) RETURNS TABLE(success boolean, user_id uuid, username character varying, role_name character varying, company_id uuid, session_token character varying, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_record RECORD;
    new_session_token VARCHAR(255);
    max_attempts INTEGER := 5;
    lockout_duration INTERVAL := '30 minutes';
BEGIN
    -- Find user
    SELECT u.*, r.name as role_name 
    INTO user_record
    FROM erp.users u
    LEFT JOIN erp.roles r ON u.role_id = r.id
    WHERE u.email = user_email AND u.is_active = true;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::UUID, NULL::VARCHAR, 'Invalid credentials'::TEXT;
        RETURN;
    END IF;
    
    -- Check if account is locked
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::UUID, NULL::VARCHAR, 'Account temporarily locked'::TEXT;
        RETURN;
    END IF;
    
    -- Verify password
    IF NOT erp.verify_password(password, user_record.password_hash) THEN
        -- Increment login attempts
        UPDATE erp.users 
        SET login_attempts = login_attempts + 1,
            locked_until = CASE 
                WHEN login_attempts + 1 >= max_attempts 
                THEN CURRENT_TIMESTAMP + lockout_duration 
                ELSE NULL 
            END
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::UUID, NULL::VARCHAR, 'Invalid credentials'::TEXT;
        RETURN;
    END IF;
    
    -- Generate session token
    new_session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create session
    INSERT INTO erp.user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
    VALUES (
        user_record.id,
        new_session_token,
        ip_address,
        user_agent,
        CURRENT_TIMESTAMP + INTERVAL '24 hours'
    );
    
    -- Update user login info
    UPDATE erp.users 
    SET last_login = CURRENT_TIMESTAMP,
        login_attempts = 0,
        locked_until = NULL
    WHERE id = user_record.id;
    
    -- Find user's company (first company they're associated with)
    DECLARE
        user_company_id UUID;
    BEGIN
        SELECT c.id INTO user_company_id
        FROM erp.companies c
        JOIN erp.departments d ON c.id = d.company_id
        WHERE d.manager_id = user_record.id
        LIMIT 1;
        
        -- If not a manager, try to find any company (in a real system, this would be through employee records)
        IF user_company_id IS NULL THEN
            SELECT id INTO user_company_id FROM erp.companies WHERE is_active = true LIMIT 1;
        END IF;
    END;
    
    RETURN QUERY SELECT 
        true,
        user_record.id,
        user_record.username,
        user_record.role_name,
        user_company_id,
        new_session_token,
        'Login successful'::TEXT;
END;
$$;


--
-- Name: update_timestamp_function(); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.update_timestamp_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: validate_session(text); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.validate_session(token text) RETURNS TABLE(valid boolean, user_id uuid, username character varying, role_name character varying, company_id uuid, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Find active session
    SELECT 
        s.*,
        u.username,
        u.email,
        r.name as role_name
    INTO session_record
    FROM erp.user_sessions s
    JOIN erp.users u ON s.user_id = u.id
    LEFT JOIN erp.roles r ON u.role_id = r.id
    WHERE s.session_token = token 
    AND s.is_active = true 
    AND s.expires_at > CURRENT_TIMESTAMP
    AND u.is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Update last accessed time
    UPDATE erp.user_sessions 
    SET last_accessed = CURRENT_TIMESTAMP 
    WHERE id = session_record.id;
    
    -- Get user's company
    DECLARE
        user_company_id UUID;
    BEGIN
        SELECT c.id INTO user_company_id
        FROM erp.companies c
        JOIN erp.departments d ON c.id = d.company_id
        WHERE d.manager_id = session_record.user_id
        LIMIT 1;
        
        IF user_company_id IS NULL THEN
            SELECT id INTO user_company_id FROM erp.companies WHERE is_active = true LIMIT 1;
        END IF;
    END;
    
    RETURN QUERY SELECT 
        true,
        session_record.user_id,
        session_record.username,
        session_record.role_name,
        user_company_id,
        session_record.expires_at;
END;
$$;


--
-- Name: verify_password(text, text); Type: FUNCTION; Schema: erp; Owner: -
--

CREATE FUNCTION erp.verify_password(password text, hash text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$;


--
-- Name: add_to_learning_queue(text, character varying, numeric, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_to_learning_queue(p_message text, p_detected_intent character varying, p_confidence numeric, p_source character varying DEFAULT 'unmatched'::character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: aggregate_chat_analytics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aggregate_chat_analytics() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: audit_dml_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_dml_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        INSERT INTO audit_logs_dml (
          table_name, operation, old_data, new_data, 
          changed_by, changed_at, client_id
        ) VALUES (
          TG_TABLE_NAME,
          TG_OP,
          CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
          CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
          COALESCE(current_setting('app.current_user_id', true)::INT, NULL),
          NOW(),
          COALESCE(current_setting('app.current_client_id', true)::INT, NULL)
        );
        RETURN COALESCE(NEW, OLD);
      END;
      $$;


--
-- Name: audit_feature_unlock_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_feature_unlock_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO micro_unlock_audit_log (
      tenant_id, action, action_category, 
      target_type, target_id, target_name,
      new_values, actor_type, actor_id
    ) VALUES (
      NEW.tenant_id, 'feature_unlock', 'unlock',
      'feature', NEW.feature_key, 
      (SELECT feature_name FROM feature_catalog WHERE feature_key = NEW.feature_key),
      jsonb_build_object(
        'status', NEW.status,
        'price_per_month', NEW.price_per_month,
        'auto_renew', NEW.auto_renew
      ),
      'user', NEW.unlocked_by
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO micro_unlock_audit_log (
      tenant_id, action, action_category,
      target_type, target_id, target_name,
      old_values, new_values, reason, actor_type, actor_id
    ) VALUES (
      NEW.tenant_id, 
      CASE WHEN NEW.status = 'LOCKED' THEN 'feature_disable' ELSE 'feature_status_change' END,
      'unlock',
      'feature', NEW.feature_key,
      (SELECT feature_name FROM feature_catalog WHERE feature_key = NEW.feature_key),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      NEW.disable_reason,
      'user', COALESCE(NEW.disabled_by, NEW.unlocked_by)
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: audit_subscription_state_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_subscription_state_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO subscription_audit_log (
      client_id, subscription_id, action, action_category,
      old_values, new_values, actor_type, actor_id
    ) VALUES (
      NEW.client_id,
      NEW.id,
      'state_change',
      'state',
      jsonb_build_object('state', OLD.state, 'plan_id', OLD.plan_id),
      jsonb_build_object('state', NEW.state, 'plan_id', NEW.plan_id),
      'system',
      NULL
    );
  END IF;
  
  IF OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
    INSERT INTO subscription_audit_log (
      client_id, subscription_id, action, action_category,
      old_values, new_values, actor_type, actor_id
    ) VALUES (
      NEW.client_id,
      NEW.id,
      'plan_change',
      'billing',
      jsonb_build_object('plan_id', OLD.plan_id),
      jsonb_build_object('plan_id', NEW.plan_id),
      'system',
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: audit_trigger_func(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_trigger_func() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, created_at)
        VALUES (
            NULLIF(current_setting('app.user_id', true), '')::INTEGER,
            'DELETE',
            TG_TABLE_NAME,
            (OLD.id)::INTEGER,
            to_jsonb(OLD),
            NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, created_at)
        VALUES (
            NULLIF(current_setting('app.user_id', true), '')::INTEGER,
            'UPDATE',
            TG_TABLE_NAME,
            (NEW.id)::INTEGER,
            to_jsonb(OLD),
            to_jsonb(NEW),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, created_at)
        VALUES (
            NULLIF(current_setting('app.user_id', true), '')::INTEGER,
            'INSERT',
            TG_TABLE_NAME,
            (NEW.id)::INTEGER,
            to_jsonb(NEW),
            NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: auto_expire_support_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_expire_support_sessions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Mark session as inactive if expired
  IF NEW.expires_at <= NOW() AND NEW.is_active = TRUE THEN
    NEW.is_active := FALSE;
    NEW.ended_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: can_assign_directly(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_assign_directly(creator_id integer, assignee_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_creator_level INTEGER;
    v_assignee_level INTEGER;
BEGIN
    v_creator_level := get_user_role_level(creator_id);
    v_assignee_level := get_user_role_level(assignee_id);
    
    -- Can assign directly if creator is same level or higher
    RETURN v_creator_level >= v_assignee_level;
END;
$$;


--
-- Name: check_chat_permission(integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_chat_permission(p_user_id integer, p_permission character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: check_feature_access(uuid, integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_feature_access(p_tenant_id uuid, p_user_id integer, p_feature_key character varying) RETURNS TABLE(allowed boolean, reason character varying, current_usage integer, usage_limit integer, is_unlocked boolean, unlock_price numeric, reset_in_seconds integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_feature feature_catalog;
  v_unlock tenant_feature_unlocks;
  v_counter usage_counters;
  v_plan_included BOOLEAN := FALSE;
BEGIN
  -- Get feature details
  SELECT * INTO v_feature FROM feature_catalog 
  WHERE feature_key = p_feature_key AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN, 'feature_not_found'::VARCHAR(50), 
      0::INT, 0::INT, FALSE::BOOLEAN, 0::DECIMAL(10,2), 0::INT;
    RETURN;
  END IF;

  -- Check if unlocked for this tenant
  SELECT * INTO v_unlock FROM tenant_feature_unlocks
  WHERE tenant_id = p_tenant_id 
    AND feature_key = p_feature_key
    AND status = 'UNLOCKED'
    AND (end_date IS NULL OR end_date > NOW());

  IF FOUND THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN, 'unlocked'::VARCHAR(50),
      0::INT, -1::INT, TRUE::BOOLEAN, 
      v_unlock.price_per_month, 0::INT;
    RETURN;
  END IF;

  -- Check if included in tenant's plan
  SELECT EXISTS (
    SELECT 1 FROM tenant_subscription ts
    JOIN micro_subscription_plans msp ON ts.plan_id = msp.id
    WHERE ts.tenant_id = p_tenant_id
      AND ts.is_active = TRUE
      AND (
        msp.included_features ? 'ALL' 
        OR msp.included_features ? p_feature_key
      )
  ) INTO v_plan_included;

  IF v_plan_included THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN, 'plan_included'::VARCHAR(50),
      0::INT, -1::INT, TRUE::BOOLEAN, 
      0::DECIMAL(10,2), 0::INT;
    RETURN;
  END IF;

  -- Check usage counter
  SELECT * INTO v_counter FROM get_or_create_usage_counter(
    p_tenant_id, NULL, p_feature_key, v_feature.limit_period
  );

  -- Check if within free limit
  IF v_feature.default_limit = -1 OR v_counter.usage_count < v_feature.default_limit THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN, 'within_limit'::VARCHAR(50),
      v_counter.usage_count, v_feature.default_limit, FALSE::BOOLEAN,
      v_feature.base_price,
      EXTRACT(EPOCH FROM (v_counter.reset_at - NOW()))::INT;
    RETURN;
  END IF;

  -- Over limit
  RETURN QUERY SELECT 
    FALSE::BOOLEAN, 'limit_exceeded'::VARCHAR(50),
    v_counter.usage_count, v_feature.default_limit, FALSE::BOOLEAN,
    v_feature.base_price,
    EXTRACT(EPOCH FROM (v_counter.reset_at - NOW()))::INT;
END;
$$;


--
-- Name: check_feature_enforcement(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_feature_enforcement(p_tenant_id uuid, p_feature_code character varying) RETURNS TABLE(allowed boolean, decision character varying, reason character varying, current_usage integer, usage_limit integer, unlock_price numeric, reset_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_plan_feature plan_feature_controls;
  v_tenant_plan tenant_plan_assignments;
  v_usage feature_usage_counters;
  v_unlock feature_micro_unlocks;
  v_custom_limit INT;
BEGIN
  -- Get tenant's plan
  SELECT * INTO v_tenant_plan
  FROM tenant_plan_assignments
  WHERE tenant_id = p_tenant_id AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'blocked'::VARCHAR(20), 'no_active_plan'::VARCHAR(200), 0::INT, 0::INT, 0::DECIMAL(12,2), NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Get feature controls for this plan
  SELECT * INTO v_plan_feature
  FROM plan_feature_controls
  WHERE plan_id = v_tenant_plan.plan_id
    AND feature_code = p_feature_code;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'blocked'::VARCHAR(20), 'feature_not_in_plan'::VARCHAR(200), 0::INT, 0::INT, 0::DECIMAL(12,2), NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check hard lock
  IF v_plan_feature.lock_mode = 'hard' THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'blocked'::VARCHAR(20), 'hard_locked'::VARCHAR(200), 0::INT, 0::INT, v_plan_feature.unlock_price, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check for active unlock
  SELECT * INTO v_unlock
  FROM feature_micro_unlocks
  WHERE tenant_id = p_tenant_id
    AND feature_code = p_feature_code
    AND is_active = TRUE
    AND (valid_until IS NULL OR valid_until > NOW());
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, 'allowed'::VARCHAR(20), 'unlocked'::VARCHAR(200), 0::INT, -1::INT, 0::DECIMAL(12,2), NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check if unlimited
  v_custom_limit := COALESCE(
    (v_tenant_plan.custom_overrides->p_feature_code->>'free_limit')::INT,
    v_plan_feature.free_limit
  );
  
  IF v_custom_limit = -1 THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, 'allowed'::VARCHAR(20), 'unlimited'::VARCHAR(200), 0::INT, -1::INT, 0::DECIMAL(12,2), NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Get current usage
  SELECT * INTO v_usage
  FROM feature_usage_counters
  WHERE tenant_id = p_tenant_id
    AND feature_code = p_feature_code
    AND period_type = v_plan_feature.limit_period
    AND period_end > NOW()
  ORDER BY period_start DESC
  LIMIT 1;
  
  -- Check limits
  IF COALESCE(v_usage.used_count, 0) >= v_custom_limit THEN
    IF v_plan_feature.lock_mode = 'soft' THEN
      RETURN QUERY SELECT FALSE::BOOLEAN, 'throttled'::VARCHAR(20), 'limit_exceeded'::VARCHAR(200), 
        COALESCE(v_usage.used_count, 0)::INT, v_custom_limit::INT, v_plan_feature.unlock_price, v_usage.period_end;
    ELSE
      RETURN QUERY SELECT FALSE::BOOLEAN, 'blocked'::VARCHAR(20), 'limit_exceeded'::VARCHAR(200), 
        COALESCE(v_usage.used_count, 0)::INT, v_custom_limit::INT, v_plan_feature.unlock_price, v_usage.period_end;
    END IF;
    RETURN;
  END IF;
  
  -- Allow
  RETURN QUERY SELECT TRUE::BOOLEAN, 'allowed'::VARCHAR(20), 'within_limit'::VARCHAR(200), 
    COALESCE(v_usage.used_count, 0)::INT, v_custom_limit::INT, v_plan_feature.unlock_price, v_usage.period_end;
END;
$$;


--
-- Name: check_tenant_access(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_tenant_access(required_client_id integer) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
      DECLARE
        current_client INT;
      BEGIN
        current_client := NULLIF(current_setting('app.current_client_id', true), '')::INT;
        IF current_client IS NULL THEN
          RETURN true; -- Allow if no tenant context (admin/system)
        END IF;
        RETURN current_client = required_client_id;
      END;
      $$;


--
-- Name: cleanup_expired_otps(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_otps() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete OTPs that are expired or verified more than 24 hours ago
    DELETE FROM otp_tokens
    WHERE expires_at < NOW()
       OR (verified = true AND created_at < NOW() - INTERVAL '24 hours')
       OR created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_otps(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_otps() IS 'Removes expired OTP tokens. Run hourly via cron.';


--
-- Name: cleanup_expired_permission_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_permission_cache() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM permission_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions that are expired or inactive for more than 7 days
    DELETE FROM user_sessions
    WHERE expires_at < NOW()
       OR (is_active = false AND last_activity_at < NOW() - INTERVAL '7 days')
       OR (last_activity_at < NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO audit_logs (action, table_name, old_values, created_at)
    VALUES ('SESSION_CLEANUP', 'user_sessions', 
            jsonb_build_object('deleted_count', deleted_count, 'cleanup_time', NOW()),
            NOW());
    
    RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_sessions(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_sessions() IS 'Removes expired and stale sessions. Run daily via cron.';


--
-- Name: cleanup_old_audit_logs(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_audit_logs(p_days_to_keep integer DEFAULT 90) RETURNS TABLE(audit_logs_deleted bigint, statement_logs_deleted bigint, security_events_archived bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_cutoff_date TIMESTAMP;
    v_audit_deleted BIGINT;
    v_statement_deleted BIGINT;
    v_security_archived BIGINT;
BEGIN
    v_cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    -- Delete old audit logs
    DELETE FROM audit_logs WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;
    
    -- Delete old statement logs (keep only 30 days by default)
    DELETE FROM statement_logs WHERE logged_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_statement_deleted = ROW_COUNT;
    
    -- Archive old security events (don't delete, just mark as archived)
    -- Security events should be kept longer for compliance
    v_security_archived := 0;
    
    RETURN QUERY SELECT v_audit_deleted, v_statement_deleted, v_security_archived;
END;
$$;


--
-- Name: FUNCTION cleanup_old_audit_logs(p_days_to_keep integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_old_audit_logs(p_days_to_keep integer) IS 'Cleanup old audit data. Run periodically via cron.';


--
-- Name: cleanup_old_events(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_events(retention_days integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM events
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: create_future_partitions(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_future_partitions(p_table_name text, p_months_ahead integer DEFAULT 3) RETURNS TABLE(partition_name text, created boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    partition_date DATE;
    end_date DATE;
    v_partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    end_date := DATE_TRUNC('month', NOW() + (p_months_ahead || ' months')::INTERVAL);
    partition_date := DATE_TRUNC('month', NOW());
    
    WHILE partition_date < end_date LOOP
        v_partition_name := p_table_name || '_p' || TO_CHAR(partition_date, 'YYYY_MM');
        partition_start := TO_CHAR(partition_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = v_partition_name AND n.nspname = 'public'
        ) THEN
            BEGIN
                EXECUTE format(
                    'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                    v_partition_name, p_table_name || '_partitioned', partition_start, partition_end
                );
                RETURN QUERY SELECT v_partition_name, true;
            EXCEPTION WHEN OTHERS THEN
                RETURN QUERY SELECT v_partition_name, false;
            END;
        ELSE
            RETURN QUERY SELECT v_partition_name, false;
        END IF;
        
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END;
$$;


--
-- Name: current_super_admin_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_super_admin_id() RETURNS integer
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN NULLIF(current_setting('app.super_admin_id', true), '')::INTEGER;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


--
-- Name: current_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_tenant_id() RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


--
-- Name: drop_old_partitions(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.drop_old_partitions(p_table_name text, p_months_to_keep integer DEFAULT 12) RETURNS TABLE(partition_name text, dropped boolean)
    LANGUAGE plpgsql
    AS $_$
DECLARE
    cutoff_date DATE;
    rec RECORD;
BEGIN
    cutoff_date := DATE_TRUNC('month', NOW() - (p_months_to_keep || ' months')::INTERVAL);
    
    FOR rec IN 
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_inherits i ON i.inhrelid = c.oid
        JOIN pg_class parent ON parent.oid = i.inhparent
        WHERE n.nspname = 'public'
          AND parent.relname = p_table_name || '_partitioned'
          AND c.relname ~ (p_table_name || '_p[0-9]{4}_[0-9]{2}')
    LOOP
        -- Extract date from partition name and check if it's old
        IF TO_DATE(SUBSTRING(rec.relname FROM '_p([0-9]{4}_[0-9]{2})$'), 'YYYY_MM') < cutoff_date THEN
            BEGIN
                EXECUTE format('DROP TABLE %I', rec.relname);
                RETURN QUERY SELECT rec.relname, true;
            EXCEPTION WHEN OTHERS THEN
                RETURN QUERY SELECT rec.relname, false;
            END;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: enforce_single_primary_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_single_primary_account() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- If setting this account as primary, unset all other primary accounts for this user
    IF NEW.is_primary = true THEN
        UPDATE bank_accounts 
        SET is_primary = false, updated_at = NOW()
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_primary = true
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: enhanced_audit_trigger_func(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enhanced_audit_trigger_func() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
    v_user_id INTEGER;
    v_tenant_id UUID;
    v_super_admin_id INTEGER;
    v_service_name TEXT;
    v_request_id UUID;
BEGIN
    -- Get context from session variables
    v_user_id := NULLIF(current_setting('app.user_id', true), '')::INTEGER;
    v_tenant_id := NULLIF(current_setting('app.tenant_id', true), '')::UUID;
    v_super_admin_id := NULLIF(current_setting('app.super_admin_id', true), '')::INTEGER;
    v_service_name := COALESCE(NULLIF(current_setting('app.service_name', true), ''), 'unknown');
    v_request_id := NULLIF(current_setting('app.request_id', true), '')::UUID;

    IF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);

        INSERT INTO audit_logs (
            user_id, action, table_name, record_id,
            old_values, service_name, service_user,
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'DELETE', TG_TABLE_NAME, NULL,
            v_old_data, v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        SELECT ARRAY_AGG(key) INTO v_changed_fields
        FROM jsonb_each(v_new_data) AS new_kv(key, value)
        LEFT JOIN jsonb_each(v_old_data) AS old_kv(key, value)
            ON new_kv.key = old_kv.key
        WHERE new_kv.value IS DISTINCT FROM old_kv.value;

        INSERT INTO audit_logs (
            user_id, action, table_name, record_id,
            old_values, new_values, changed_fields,
            service_name, service_user,
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'UPDATE', TG_TABLE_NAME, NULL,
            v_old_data, v_new_data, v_changed_fields,
            v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );

        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);

        INSERT INTO audit_logs (
            user_id, action, table_name, record_id,
            new_values, service_name, service_user,
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'INSERT', TG_TABLE_NAME, NULL,
            v_new_data, v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: FUNCTION enhanced_audit_trigger_func(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.enhanced_audit_trigger_func() IS 'Comprehensive audit trigger that captures DML changes with context';


--
-- Name: generate_qa_issue_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_qa_issue_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    year_part TEXT;
    seq_part TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    seq_part := LPAD(NEXTVAL('qa_issue_code_seq')::TEXT, 4, '0');
    NEW.code := 'QA-' || year_part || '-' || seq_part;
    RETURN NEW;
END;
$$;


--
-- Name: generate_qa_issue_code(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_qa_issue_code(p_tenant_id bigint) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_year TEXT;
    v_next_num INT;
    v_code VARCHAR(20);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next number for this tenant and year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(issue_code FROM 'BUG-' || v_year || '-(\d+)') AS INT)
    ), 0) + 1
    INTO v_next_num
    FROM qa_issues
    WHERE tenant_id = p_tenant_id
    AND issue_code LIKE 'BUG-' || v_year || '-%';
    
    v_code := 'BUG-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
    
    RETURN v_code;
END;
$$;


--
-- Name: generate_qa_issue_code(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_qa_issue_code(p_tenant_id uuid) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_year TEXT;
    v_next_num INT;
    v_code VARCHAR(20);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next number for this tenant and year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(issue_code FROM 'BUG-' || v_year || '-(\d+)') AS INT)
    ), 0) + 1
    INTO v_next_num
    FROM qa_issues
    WHERE tenant_id = p_tenant_id
    AND issue_code LIKE 'BUG-' || v_year || '-%';
    
    v_code := 'BUG-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
    
    RETURN v_code;
END;
$$;


--
-- Name: generate_recon_batch_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_recon_batch_number(p_tenant_id uuid) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INT;
    v_batch_number VARCHAR(50);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next sequence for this tenant and year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(batch_number FROM 'RECON-' || v_year || '-(\d+)') AS INT)
    ), 0) + 1
    INTO v_sequence
    FROM reconciliation_batches
    WHERE tenant_id = p_tenant_id
    AND batch_number LIKE 'RECON-' || v_year || '-%';
    
    v_batch_number := 'RECON-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
    
    RETURN v_batch_number;
END;
$$;


--
-- Name: generate_request_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_request_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    SELECT nextval('task_request_number_seq') INTO v_seq;
    RETURN 'REQ-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;


--
-- Name: get_best_response_variant(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_best_response_variant(p_training_id integer) RETURNS TABLE(variant_id integer, response_template text)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: get_cached_permission(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cached_permission(p_cache_key text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT cache_value INTO v_value
    FROM permission_cache
    WHERE cache_key = p_cache_key
      AND expires_at > NOW();
    
    RETURN v_value;
END;
$$;


--
-- Name: get_next_entity_id(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_entity_id(p_entity_type character varying, p_date_prefix character varying) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_next_number BIGINT;
BEGIN
    INSERT INTO entity_id_sequences (entity_type, date_prefix, last_number)
    VALUES (p_entity_type, p_date_prefix, 1)
    ON CONFLICT (entity_type, date_prefix)
    DO UPDATE SET last_number = entity_id_sequences.last_number + 1
    RETURNING last_number INTO v_next_number;
    
    RETURN v_next_number;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: usage_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_counters (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    user_id integer,
    feature_key character varying(100) NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    period public.usage_period_type DEFAULT 'DAILY'::public.usage_period_type NOT NULL,
    period_start timestamp with time zone DEFAULT date_trunc('day'::text, now()) NOT NULL,
    reset_at timestamp with time zone NOT NULL,
    peak_usage_count integer DEFAULT 0 NOT NULL,
    peak_usage_date timestamp with time zone,
    total_lifetime_usage bigint DEFAULT 0 NOT NULL,
    last_incremented_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: get_or_create_usage_counter(uuid, integer, character varying, public.usage_period_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_usage_counter(p_tenant_id uuid, p_user_id integer, p_feature_key character varying, p_period public.usage_period_type) RETURNS public.usage_counters
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_counter usage_counters;
  v_period_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Calculate period start and reset time based on period type
  CASE p_period
    WHEN 'DAILY' THEN
      v_period_start := DATE_TRUNC('day', NOW());
      v_reset_at := v_period_start + INTERVAL '1 day';
    WHEN 'WEEKLY' THEN
      v_period_start := DATE_TRUNC('week', NOW());
      v_reset_at := v_period_start + INTERVAL '1 week';
    WHEN 'MONTHLY' THEN
      v_period_start := DATE_TRUNC('month', NOW());
      v_reset_at := v_period_start + INTERVAL '1 month';
    WHEN 'YEARLY' THEN
      v_period_start := DATE_TRUNC('year', NOW());
      v_reset_at := v_period_start + INTERVAL '1 year';
    ELSE
      v_period_start := NOW();
      v_reset_at := NULL;
  END CASE;

  -- Try to get existing counter for current period
  SELECT * INTO v_counter
  FROM usage_counters
  WHERE tenant_id = p_tenant_id
    AND (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL))
    AND feature_key = p_feature_key
    AND period = p_period
    AND period_start = v_period_start;

  -- If not found, create new counter
  IF NOT FOUND THEN
    INSERT INTO usage_counters (
      tenant_id, user_id, feature_key, period, period_start, reset_at, usage_count
    ) VALUES (
      p_tenant_id, p_user_id, p_feature_key, p_period, v_period_start, v_reset_at, 0
    )
    RETURNING * INTO v_counter;
  END IF;

  RETURN v_counter;
END;
$$;


--
-- Name: get_tenant_plan_features(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tenant_plan_features(p_tenant_id uuid) RETURNS TABLE(feature_code character varying, feature_name character varying, category character varying, free_limit integer, limit_period public.limit_period_type, unlock_price numeric, approval_threshold numeric, lock_mode public.lock_mode_type, is_visible boolean, current_usage integer, is_unlocked boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pfc.feature_code,
    mfd.feature_name,
    mfd.category,
    COALESCE(
      (tpa.custom_overrides->>pfc.feature_code)::jsonb->>'free_limit',
      pfc.free_limit::TEXT
    )::INT as free_limit,
    pfc.limit_period,
    pfc.unlock_price,
    COALESCE(
      (tpa.custom_overrides->>pfc.feature_code)::jsonb->>'approval_threshold',
      pfc.approval_threshold::TEXT
    )::DECIMAL(15,2) as approval_threshold,
    pfc.lock_mode,
    pfc.is_visible,
    COALESCE(fuc.used_count, 0) as current_usage,
    EXISTS (
      SELECT 1 FROM feature_micro_unlocks fmu
      WHERE fmu.tenant_id = p_tenant_id
        AND fmu.feature_code = pfc.feature_code
        AND fmu.is_active = TRUE
        AND (fmu.valid_until IS NULL OR fmu.valid_until > NOW())
    ) as is_unlocked
  FROM tenant_plan_assignments tpa
  JOIN plan_feature_controls pfc ON pfc.plan_id = tpa.plan_id
  JOIN master_feature_definitions mfd ON mfd.feature_code = pfc.feature_code
  LEFT JOIN feature_usage_counters fuc ON fuc.tenant_id = p_tenant_id 
    AND fuc.feature_code = pfc.feature_code
    AND fuc.period_type = pfc.limit_period
    AND fuc.period_end > NOW()
  WHERE tpa.tenant_id = p_tenant_id
    AND tpa.is_active = TRUE;
END;
$$;


--
-- Name: get_user_role_level(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role_level(p_user_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_level INTEGER;
BEGIN
    SELECT COALESCE(r.level, 0) INTO v_level
    FROM users u
    LEFT JOIN rbac_roles r ON u.role_id = r.id
    WHERE u.id = p_user_id;
    
    RETURN COALESCE(v_level, 0);
END;
$$;


--
-- Name: increment_usage_counter(uuid, integer, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_usage_counter(p_tenant_id uuid, p_user_id integer, p_feature_key character varying, p_increment integer DEFAULT 1) RETURNS public.usage_counters
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_counter usage_counters;
  v_feature feature_catalog;
BEGIN
  -- Get feature details
  SELECT * INTO v_feature FROM feature_catalog WHERE feature_key = p_feature_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature not found: %', p_feature_key;
  END IF;

  -- Get or create counter
  SELECT * INTO v_counter FROM get_or_create_usage_counter(p_tenant_id, p_user_id, p_feature_key, v_feature.limit_period);

  -- Increment counter
  UPDATE usage_counters
  SET 
    usage_count = usage_count + p_increment,
    total_lifetime_usage = total_lifetime_usage + p_increment,
    last_incremented_at = NOW(),
    peak_usage_count = GREATEST(peak_usage_count, usage_count + p_increment),
    peak_usage_date = CASE WHEN usage_count + p_increment > peak_usage_count THEN NOW() ELSE peak_usage_date END,
    updated_at = NOW()
  WHERE id = v_counter.id
  RETURNING * INTO v_counter;

  RETURN v_counter;
END;
$$;


--
-- Name: invalidate_permission_cache(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invalidate_permission_cache(p_pattern text DEFAULT '%'::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM permission_cache WHERE cache_key LIKE p_pattern;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


--
-- Name: is_platform_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_platform_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN COALESCE(current_setting('app.is_platform_admin', true), 'false')::BOOLEAN;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;


--
-- Name: is_superior_to(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_superior_to(superior_user_id integer, subordinate_user_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_superior_level INTEGER;
    v_subordinate_level INTEGER;
BEGIN
    -- Get superior's role level
    SELECT COALESCE(r.level, 0) INTO v_superior_level
    FROM users u
    LEFT JOIN rbac_roles r ON u.role_id = r.id
    WHERE u.id = superior_user_id;
    
    -- Get subordinate's role level
    SELECT COALESCE(r.level, 0) INTO v_subordinate_level
    FROM users u
    LEFT JOIN rbac_roles r ON u.role_id = r.id
    WHERE u.id = subordinate_user_id;
    
    RETURN v_superior_level > v_subordinate_level;
END;
$$;


--
-- Name: log_business_level_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_business_level_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.business_level IS DISTINCT FROM NEW.business_level THEN
    INSERT INTO audit_logs (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_values, 
      new_values, 
      created_at
    ) VALUES (
      NULL,  -- Will be populated by application layer
      'BUSINESS_LEVEL_CHANGED',
      'users_enhanced',
      NEW.id,
      jsonb_build_object('business_level', OLD.business_level),
      jsonb_build_object('business_level', NEW.business_level),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_entity_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_entity_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            created_at
        ) VALUES (
            NULLIF(current_setting('app.current_user', true), '')::integer,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            v_old_data,
            v_new_data,
            NOW()
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            created_at
        ) VALUES (
            NULLIF(current_setting('app.current_user', true), '')::integer,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            v_old_data,
            NOW()
        );
        
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            new_values,
            created_at
        ) VALUES (
            NULLIF(current_setting('app.current_user', true), '')::integer,
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            v_new_data,
            NOW()
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;


--
-- Name: log_security_event(text, text, integer, text, text, inet, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_security_event(p_event_type text, p_severity text DEFAULT 'INFO'::text, p_user_id integer DEFAULT NULL::integer, p_user_email text DEFAULT NULL::text, p_user_type text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet, p_details jsonb DEFAULT NULL::jsonb) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_event_id BIGINT;
    v_tenant_id UUID;
    v_service_name TEXT;
    v_request_id UUID;
BEGIN
    v_tenant_id := NULLIF(current_setting('app.tenant_id', true), '')::UUID;
    v_service_name := COALESCE(NULLIF(current_setting('app.service_name', true), ''), 'unknown');
    v_request_id := NULLIF(current_setting('app.request_id', true), '')::UUID;
    
    INSERT INTO security_events (
        event_type, severity, service_name,
        user_id, user_email, user_type,
        tenant_id, ip_address, request_id,
        event_details, created_at
    )
    VALUES (
        p_event_type, p_severity, v_service_name,
        p_user_id, p_user_email, p_user_type,
        v_tenant_id, p_ip_address, v_request_id,
        p_details, NOW()
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;


--
-- Name: FUNCTION log_security_event(p_event_type text, p_severity text, p_user_id integer, p_user_email text, p_user_type text, p_ip_address inet, p_details jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_security_event(p_event_type text, p_severity text, p_user_id integer, p_user_email text, p_user_type text, p_ip_address inet, p_details jsonb) IS 'Log security-relevant events for monitoring and alerting';


--
-- Name: log_task_request_status_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_task_request_status_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO task_request_history (
            request_id, actor_id, actor_role_level, actor_role_name,
            action, action_category, previous_status, new_status,
            reason, tenant_id
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.resolved_by, NEW.requested_by),
            CASE WHEN NEW.resolved_by IS NOT NULL THEN NEW.target_role_level ELSE NEW.requester_role_level END,
            CASE WHEN NEW.resolved_by IS NOT NULL THEN NEW.target_role_name ELSE NEW.requester_role_name END,
            'STATUS_CHANGED',
            'STATUS_CHANGE',
            OLD.status,
            NEW.status,
            NEW.resolution_reason,
            NEW.tenant_id
        );
    END IF;
    
    -- Log resolution
    IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
        INSERT INTO task_request_history (
            request_id, actor_id, actor_role_level, actor_role_name,
            action, action_category, previous_status, new_status,
            field_changed, new_value, reason, tenant_id
        )
        VALUES (
            NEW.id,
            NEW.resolved_by,
            NEW.target_role_level,
            NEW.target_role_name,
            NEW.resolution_action,
            'RESOLUTION',
            OLD.status,
            NEW.status,
            'resolution_action',
            NEW.resolution_action,
            NEW.resolution_reason,
            NEW.tenant_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: log_task_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_task_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO workflow_task_history (task_id, from_status, to_status, action, actor_id, actor_type)
    VALUES (NEW.id, OLD.status, NEW.status, 'STATUS_CHANGE', NEW.creator_id::UUID, 'USER');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: migrate_reactions_to_normalized(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.migrate_reactions_to_normalized() RETURNS TABLE(migrated_count bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count BIGINT := 0;
BEGIN
    -- Insert from JSONB object into normalized table
    -- Assumes reactions format: { "emoji": [userId1, userId2, ...] }
    INSERT INTO message_reactions (message_id, user_id, emoji, created_at)
    SELECT 
        tm.id as message_id,
        user_id::INTEGER,
        emoji,
        tm."createdAt" as created_at
    FROM thread_messages tm,
         jsonb_each(tm.reactions) as r(emoji, users),
         jsonb_array_elements_text(users) as user_id
    WHERE tm.reactions IS NOT NULL 
      AND jsonb_typeof(tm.reactions) = 'object'
    ON CONFLICT (message_id, user_id, emoji) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count;
END;
$$;


--
-- Name: migrate_readby_to_normalized(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.migrate_readby_to_normalized() RETURNS TABLE(migrated_count bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count BIGINT := 0;
BEGIN
    -- Insert from JSONB array into normalized table
    INSERT INTO message_reads (message_id, user_id, read_at)
    SELECT 
        tm.id as message_id,
        (reader->>'userId')::INTEGER as user_id,
        COALESCE((reader->>'readAt')::TIMESTAMP, tm."createdAt") as read_at
    FROM thread_messages tm,
         jsonb_array_elements(tm."readBy") as reader
    WHERE tm."readBy" IS NOT NULL 
      AND jsonb_array_length(tm."readBy") > 0
    ON CONFLICT (message_id, user_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count;
END;
$$;


--
-- Name: prevent_finalized_batch_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_finalized_batch_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status = 'FINALIZED' AND NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Cannot modify a finalized reconciliation batch';
    END IF;
    
    -- Allow only status changes if batch is finalized
    IF OLD.status = 'FINALIZED' THEN
        IF OLD.matched_lines != NEW.matched_lines OR
           OLD.unmatched_lines != NEW.unmatched_lines OR
           OLD.matched_amount != NEW.matched_amount THEN
            RAISE EXCEPTION 'Cannot modify statistics of a finalized batch';
        END IF;
    END IF;
    
    NEW.updated_at := NOW();
    NEW.version := OLD.version + 1;
    
    RETURN NEW;
END;
$$;


--
-- Name: set_audit_context(integer, uuid, integer, text, uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_audit_context(p_user_id integer DEFAULT NULL::integer, p_tenant_id uuid DEFAULT NULL::uuid, p_super_admin_id integer DEFAULT NULL::integer, p_service_name text DEFAULT 'backend'::text, p_request_id uuid DEFAULT NULL::uuid, p_is_platform_admin boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_user_id IS NOT NULL THEN
        PERFORM set_config('app.user_id', p_user_id::TEXT, true);
    END IF;
    
    IF p_tenant_id IS NOT NULL THEN
        PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, true);
    END IF;
    
    IF p_super_admin_id IS NOT NULL THEN
        PERFORM set_config('app.super_admin_id', p_super_admin_id::TEXT, true);
    END IF;
    
    IF p_service_name IS NOT NULL THEN
        PERFORM set_config('app.service_name', p_service_name, true);
    END IF;
    
    IF p_request_id IS NOT NULL THEN
        PERFORM set_config('app.request_id', p_request_id::TEXT, true);
    END IF;
    
    PERFORM set_config('app.is_platform_admin', p_is_platform_admin::TEXT, true);
END;
$$;


--
-- Name: FUNCTION set_audit_context(p_user_id integer, p_tenant_id uuid, p_super_admin_id integer, p_service_name text, p_request_id uuid, p_is_platform_admin boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_audit_context(p_user_id integer, p_tenant_id uuid, p_super_admin_id integer, p_service_name text, p_request_id uuid, p_is_platform_admin boolean) IS 'Set audit context for the current transaction. Call at start of each request.';


--
-- Name: set_cached_permission(text, jsonb, integer, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_cached_permission(p_cache_key text, p_cache_value jsonb, p_ttl_seconds integer DEFAULT 300, p_user_id integer DEFAULT NULL::integer, p_tenant_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO permission_cache (cache_key, cache_value, user_id, tenant_id, expires_at)
    VALUES (p_cache_key, p_cache_value, p_user_id, p_tenant_id, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (cache_key) DO UPDATE SET
        cache_value = EXCLUDED.cache_value,
        expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
        updated_at = NOW();
END;
$$;


--
-- Name: set_tenant_context(uuid, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_tenant_context(p_tenant_id uuid DEFAULT NULL::uuid, p_super_admin_id integer DEFAULT NULL::integer, p_is_platform_admin boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_tenant_id IS NOT NULL THEN
        PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, true);
    ELSE
        PERFORM set_config('app.tenant_id', '', true);
    END IF;
    
    IF p_super_admin_id IS NOT NULL THEN
        PERFORM set_config('app.super_admin_id', p_super_admin_id::TEXT, true);
    ELSE
        PERFORM set_config('app.super_admin_id', '', true);
    END IF;
    
    PERFORM set_config('app.is_platform_admin', p_is_platform_admin::TEXT, true);
END;
$$;


--
-- Name: FUNCTION set_tenant_context(p_tenant_id uuid, p_super_admin_id integer, p_is_platform_admin boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_tenant_context(p_tenant_id uuid, p_super_admin_id integer, p_is_platform_admin boolean) IS 'Set tenant context for RLS. Call at start of each request.';


--
-- Name: trigger_qa_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_qa_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: trigger_set_issue_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_issue_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.issue_code IS NULL OR NEW.issue_code = '' THEN
        NEW.issue_code := generate_qa_issue_code(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_bank_accounts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bank_accounts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_batch_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_batch_statistics() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_batch_id UUID;
BEGIN
    -- Determine batch_id from the match or exception
    IF TG_TABLE_NAME = 'reconciliation_matches' THEN
        v_batch_id := COALESCE(NEW.batch_id, OLD.batch_id);
    ELSIF TG_TABLE_NAME = 'reconciliation_exceptions' THEN
        v_batch_id := COALESCE(NEW.batch_id, OLD.batch_id);
    END IF;
    
    IF v_batch_id IS NOT NULL THEN
        UPDATE reconciliation_batches
        SET 
            matched_lines = (
                SELECT COUNT(DISTINCT bank_line_id) 
                FROM reconciliation_matches 
                WHERE batch_id = v_batch_id
            ),
            exception_lines = (
                SELECT COUNT(DISTINCT bank_line_id) 
                FROM reconciliation_exceptions 
                WHERE batch_id = v_batch_id AND is_resolved = false
            ),
            matched_amount = (
                SELECT COALESCE(SUM(bank_amount), 0)
                FROM reconciliation_matches
                WHERE batch_id = v_batch_id
            ),
            updated_at = NOW()
        WHERE id = v_batch_id;
    END IF;
    
    RETURN NULL;
END;
$$;


--
-- Name: update_chat_preferences_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_chat_preferences_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_chat_training_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_chat_training_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_conversation_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE chat_conversations 
    SET last_message_at = NEW.created_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


--
-- Name: update_entity_sequences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_entity_sequences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_micro_unlock_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_micro_unlock_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_qa_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_qa_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_service_usage(text, text, text, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_service_usage(p_service_name text, p_table_name text, p_operation text, p_execution_ms integer DEFAULT NULL::integer, p_success boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO service_table_usage (
        service_name, service_user, table_name, operation,
        first_seen, last_seen, total_count, success_count, error_count,
        avg_execution_ms, max_execution_ms
    )
    VALUES (
        p_service_name, current_user, p_table_name, p_operation,
        NOW(), NOW(), 1,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END,
        p_execution_ms,
        p_execution_ms
    )
    ON CONFLICT (service_name, table_name, operation) 
    DO UPDATE SET
        last_seen = NOW(),
        total_count = service_table_usage.total_count + 1,
        success_count = service_table_usage.success_count + (CASE WHEN p_success THEN 1 ELSE 0 END),
        error_count = service_table_usage.error_count + (CASE WHEN p_success THEN 0 ELSE 1 END),
        avg_execution_ms = CASE 
            WHEN p_execution_ms IS NOT NULL THEN
                (COALESCE(service_table_usage.avg_execution_ms, 0) * service_table_usage.total_count + p_execution_ms) 
                / (service_table_usage.total_count + 1)
            ELSE service_table_usage.avg_execution_ms
        END,
        max_execution_ms = GREATEST(COALESCE(service_table_usage.max_execution_ms, 0), COALESCE(p_execution_ms, 0));
END;
$$;


--
-- Name: FUNCTION update_service_usage(p_service_name text, p_table_name text, p_operation text, p_execution_ms integer, p_success boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_service_usage(p_service_name text, p_table_name text, p_operation text, p_execution_ms integer, p_success boolean) IS 'Track service-to-table usage for monitoring dashboard';


--
-- Name: update_subscription_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_subscription_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_task_clarifications_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_clarifications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;


--
-- Name: update_task_request_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_request_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_training_success_rate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_training_success_rate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_workflow_tasks_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_workflow_tasks_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_workflow_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_workflow_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: users_delete_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.users_delete_fn() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.users_enhanced WHERE legacy_id = OLD.id;
    RETURN OLD;
END;
$$;


--
-- Name: users_insert_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.users_insert_fn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    new_legacy_id INTEGER;
BEGIN
    IF NEW.id IS NULL THEN
        new_legacy_id := nextval('public.users_legacy_id_seq');
    ELSE
        new_legacy_id := NEW.id;
    END IF;

    INSERT INTO public.users_enhanced (
        id, legacy_id, username, email, password_hash, role, is_active,
        product_type, tenant_id, super_admin_id, created_at, updated_at,
        profile_pic_url, assigned_modules, page_permissions, theme_preference,
        email_verified, phone_verified, login_attempts, preferences
    ) VALUES (
        gen_random_uuid(),
        new_legacy_id,
        NEW.username,
        NEW.email,
        NEW.password_hash,
        NEW.role,
        COALESCE(NEW.is_active, true),
        COALESCE(NEW."productType", 'BUSINESS_ERP'),
        NEW.tenant_id,
        NEW.super_admin_id,
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW()),
        NEW.profile_pic_url,
        COALESCE(NEW."assignedModules", '[]'::jsonb),
        COALESCE(NEW."pagePermissions", '{}'::jsonb),
        COALESCE(NEW.theme_preference, 'bisman-default'),
        false, false, 0, '{}'::jsonb
    );

    NEW.id := new_legacy_id;
    RETURN NEW;
END;
$$;


--
-- Name: users_update_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.users_update_fn() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public.users_enhanced SET
        username = COALESCE(NEW.username, OLD.username),
        email = COALESCE(NEW.email, OLD.email),
        password_hash = COALESCE(NEW.password, OLD.password),
        role = COALESCE(NEW.role, OLD.role),
        is_active = COALESCE(NEW.is_active, OLD.is_active),
        product_type = COALESCE(NEW."productType", OLD."productType"),
        tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id),
        super_admin_id = COALESCE(NEW.super_admin_id, OLD.super_admin_id),
        profile_pic_url = NEW.profile_pic_url,
        assigned_modules = COALESCE(NEW."assignedModules", OLD."assignedModules"),
        page_permissions = COALESCE(NEW."pagePermissions", OLD."pagePermissions"),
        theme_preference = COALESCE(NEW.theme_preference, OLD.theme_preference),
        updated_at = NOW()
    WHERE legacy_id = OLD.id;
    RETURN NEW;
END;
$$;


--
-- Name: audit_logs; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.audit_logs (
    id uuid NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id character varying(50) NOT NULL,
    action character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    user_id uuid,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_action_check CHECK (((action)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text])))
);


--
-- Name: audit_logs_2025_10; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.audit_logs_2025_10 (
    id uuid NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id character varying(50) NOT NULL,
    action character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    user_id uuid,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs_2025_11; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.audit_logs_2025_11 (
    id uuid NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id character varying(50) NOT NULL,
    action character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    user_id uuid,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs_2025_12; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.audit_logs_2025_12 (
    id uuid NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id character varying(50) NOT NULL,
    action character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    user_id uuid,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs_new; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.audit_logs_new (
    id uuid NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id character varying(50) NOT NULL,
    action character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    user_id uuid,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
)
PARTITION BY RANGE ("timestamp");


--
-- Name: chart_of_accounts; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.chart_of_accounts (
    id uuid NOT NULL,
    account_code character varying(20) NOT NULL,
    account_name character varying(255) NOT NULL,
    account_type character varying(50) NOT NULL,
    parent_id uuid,
    level integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chart_of_accounts_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('ASSET'::character varying)::text, ('LIABILITY'::character varying)::text, ('EQUITY'::character varying)::text, ('REVENUE'::character varying)::text, ('EXPENSE'::character varying)::text])))
);


--
-- Name: companies; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.companies (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    parent_id uuid,
    address jsonb,
    contact_info jsonb,
    business_details jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chk_companies_code_format CHECK (((code)::text ~ '^[A-Z0-9_]{2,50}$'::text)),
    CONSTRAINT companies_type_check CHECK (((type)::text = ANY (ARRAY[('HEAD_OFFICE'::character varying)::text, ('BRANCH'::character varying)::text, ('FRANCHISE'::character varying)::text])))
);


--
-- Name: currency; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.currency (
    id uuid NOT NULL,
    currency_code character varying(3) NOT NULL,
    currency_name character varying(100) NOT NULL,
    symbol character varying(10),
    decimal_places integer DEFAULT 2,
    is_base_currency boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


--
-- Name: customers; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.customers (
    id uuid NOT NULL,
    customer_code character varying(50) NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(20),
    address jsonb,
    tax_id character varying(50),
    credit_limit numeric(15,2) DEFAULT 0,
    payment_terms integer DEFAULT 30,
    customer_type character varying(50) DEFAULT 'REGULAR'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


--
-- Name: departments; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.departments (
    id uuid NOT NULL,
    company_id uuid,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    manager_id uuid,
    parent_id uuid,
    budget numeric(15,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


--
-- Name: exchange_rates; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.exchange_rates (
    id uuid NOT NULL,
    from_currency_id uuid NOT NULL,
    to_currency_id uuid NOT NULL,
    exchange_rate numeric(15,6) NOT NULL,
    effective_date date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT exchange_rates_exchange_rate_check CHECK ((exchange_rate > (0)::numeric))
);


--
-- Name: fuel_types; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.fuel_types (
    id uuid NOT NULL,
    name character varying(50) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    unit character varying(20) DEFAULT 'LITER'::character varying,
    density numeric(8,4),
    specifications jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inventory_movements; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.inventory_movements (
    id uuid NOT NULL,
    movement_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    product_id uuid NOT NULL,
    movement_type character varying(20) NOT NULL,
    reference_type character varying(50),
    reference_id uuid,
    quantity numeric(15,3) NOT NULL,
    unit_cost numeric(15,2),
    warehouse_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT inventory_movements_movement_type_check CHECK (((movement_type)::text = ANY (ARRAY[('IN'::character varying)::text, ('OUT'::character varying)::text, ('TRANSFER'::character varying)::text, ('ADJUSTMENT'::character varying)::text]))),
    CONSTRAINT inventory_movements_quantity_check CHECK ((quantity <> (0)::numeric)),
    CONSTRAINT inventory_movements_unit_cost_check CHECK ((unit_cost >= (0)::numeric))
)
PARTITION BY RANGE (movement_date);


--
-- Name: inventory_movements_2025_10; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.inventory_movements_2025_10 (
    id uuid NOT NULL,
    movement_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    product_id uuid NOT NULL,
    movement_type character varying(20) NOT NULL,
    reference_type character varying(50),
    reference_id uuid,
    quantity numeric(15,3) NOT NULL,
    unit_cost numeric(15,2),
    warehouse_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT inventory_movements_movement_type_check CHECK (((movement_type)::text = ANY (ARRAY[('IN'::character varying)::text, ('OUT'::character varying)::text, ('TRANSFER'::character varying)::text, ('ADJUSTMENT'::character varying)::text]))),
    CONSTRAINT inventory_movements_quantity_check CHECK ((quantity <> (0)::numeric)),
    CONSTRAINT inventory_movements_unit_cost_check CHECK ((unit_cost >= (0)::numeric))
);


--
-- Name: inventory_movements_2025_11; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.inventory_movements_2025_11 (
    id uuid NOT NULL,
    movement_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    product_id uuid NOT NULL,
    movement_type character varying(20) NOT NULL,
    reference_type character varying(50),
    reference_id uuid,
    quantity numeric(15,3) NOT NULL,
    unit_cost numeric(15,2),
    warehouse_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT inventory_movements_movement_type_check CHECK (((movement_type)::text = ANY (ARRAY[('IN'::character varying)::text, ('OUT'::character varying)::text, ('TRANSFER'::character varying)::text, ('ADJUSTMENT'::character varying)::text]))),
    CONSTRAINT inventory_movements_quantity_check CHECK ((quantity <> (0)::numeric)),
    CONSTRAINT inventory_movements_unit_cost_check CHECK ((unit_cost >= (0)::numeric))
);


--
-- Name: inventory_movements_2025_12; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.inventory_movements_2025_12 (
    id uuid NOT NULL,
    movement_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    product_id uuid NOT NULL,
    movement_type character varying(20) NOT NULL,
    reference_type character varying(50),
    reference_id uuid,
    quantity numeric(15,3) NOT NULL,
    unit_cost numeric(15,2),
    warehouse_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT inventory_movements_movement_type_check CHECK (((movement_type)::text = ANY (ARRAY[('IN'::character varying)::text, ('OUT'::character varying)::text, ('TRANSFER'::character varying)::text, ('ADJUSTMENT'::character varying)::text]))),
    CONSTRAINT inventory_movements_quantity_check CHECK ((quantity <> (0)::numeric)),
    CONSTRAINT inventory_movements_unit_cost_check CHECK ((unit_cost >= (0)::numeric))
);


--
-- Name: product_categories; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.product_categories (
    id uuid NOT NULL,
    category_code character varying(50) NOT NULL,
    category_name character varying(255) NOT NULL,
    parent_id uuid,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


--
-- Name: products; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.products (
    id uuid NOT NULL,
    product_code character varying(50) NOT NULL,
    product_name character varying(255) NOT NULL,
    category_id uuid,
    description text,
    unit_of_measure character varying(20) DEFAULT 'PIECE'::character varying,
    unit_price numeric(15,2) DEFAULT 0,
    cost_price numeric(15,2) DEFAULT 0,
    minimum_stock_level numeric(15,3) DEFAULT 0,
    maximum_stock_level numeric(15,3),
    reorder_level numeric(15,3),
    is_active boolean DEFAULT true,
    product_type character varying(50) DEFAULT 'STOCK_ITEM'::character varying,
    specifications jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT products_cost_price_check CHECK ((cost_price >= (0)::numeric)),
    CONSTRAINT products_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: pumps; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.pumps (
    id uuid NOT NULL,
    company_id uuid,
    pump_number character varying(20) NOT NULL,
    fuel_type_id uuid,
    brand character varying(50),
    model character varying(50),
    serial_number character varying(100),
    installation_date date,
    last_calibration date,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    specifications jsonb,
    location jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pumps_status_check CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text, ('MAINTENANCE'::character varying)::text, ('REPAIR'::character varying)::text])))
);


--
-- Name: purchase_order_details; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.purchase_order_details (
    id uuid NOT NULL,
    purchase_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    line_total numeric(15,2) GENERATED ALWAYS AS ((quantity * unit_price)) STORED,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_order_details_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT purchase_order_details_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: purchase_orders; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.purchase_orders (
    id uuid NOT NULL,
    order_number character varying(50) NOT NULL,
    vendor_id uuid NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_delivery_date date,
    status character varying(20) DEFAULT 'DRAFT'::character varying,
    currency_id uuid,
    exchange_rate numeric(15,6) DEFAULT 1,
    subtotal numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) GENERATED ALWAYS AS ((subtotal + tax_amount)) STORED,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT purchase_orders_status_check CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('APPROVED'::character varying)::text, ('SENT'::character varying)::text, ('RECEIVED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
    CONSTRAINT purchase_orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT purchase_orders_tax_amount_check CHECK ((tax_amount >= (0)::numeric))
);


--
-- Name: roles; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.roles (
    id uuid NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


--
-- Name: sales_order_details; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.sales_order_details (
    id uuid NOT NULL,
    sales_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount_percentage numeric(5,2) DEFAULT 0,
    line_total numeric(15,2) GENERATED ALWAYS AS (((quantity * unit_price) * ((1)::numeric - (discount_percentage / (100)::numeric)))) STORED,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_order_details_discount_percentage_check CHECK (((discount_percentage >= (0)::numeric) AND (discount_percentage <= (100)::numeric))),
    CONSTRAINT sales_order_details_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT sales_order_details_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: sales_orders; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.sales_orders (
    id uuid NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_id uuid NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    delivery_date date,
    status character varying(20) DEFAULT 'DRAFT'::character varying,
    currency_id uuid,
    exchange_rate numeric(15,6) DEFAULT 1,
    subtotal numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) GENERATED ALWAYS AS (((subtotal + tax_amount) - discount_amount)) STORED,
    notes text,
    delivery_address jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT sales_orders_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT sales_orders_status_check CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('CONFIRMED'::character varying)::text, ('SHIPPED'::character varying)::text, ('DELIVERED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
    CONSTRAINT sales_orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT sales_orders_tax_amount_check CHECK ((tax_amount >= (0)::numeric))
);


--
-- Name: tanks; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.tanks (
    id uuid NOT NULL,
    company_id uuid,
    tank_number character varying(20) NOT NULL,
    fuel_type_id uuid,
    capacity numeric(12,3) NOT NULL,
    current_stock numeric(12,3) DEFAULT 0,
    minimum_level numeric(12,3),
    maximum_level numeric(12,3),
    location jsonb,
    specifications jsonb,
    last_inspection date,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tanks_capacity_positive CHECK ((capacity > (0)::numeric)),
    CONSTRAINT chk_tanks_stock_valid CHECK (((current_stock >= (0)::numeric) AND (current_stock <= capacity))),
    CONSTRAINT tanks_status_check CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text, ('MAINTENANCE'::character varying)::text, ('REPAIR'::character varying)::text])))
);


--
-- Name: vendors; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.vendors (
    id uuid NOT NULL,
    vendor_code character varying(50) NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(20),
    address jsonb,
    tax_id character varying(50),
    payment_terms integer DEFAULT 30,
    vendor_type character varying(50) DEFAULT 'SUPPLIER'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


--
-- Name: _ClientToClientSequence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_ClientToClientSequence" (
    "A" uuid NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: _schema_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._schema_info (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: _schema_info_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._schema_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _schema_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._schema_info_id_seq OWNED BY public._schema_info.id;


--
-- Name: admin_role_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_role_assignments (
    id integer NOT NULL,
    assigner_type character varying(50) NOT NULL,
    assigner_id integer NOT NULL,
    role_id integer NOT NULL,
    assignee_type character varying(50),
    assignee_id integer,
    is_active boolean DEFAULT true NOT NULL,
    assigned_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: admin_role_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_role_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_role_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_role_assignments_id_seq OWNED BY public.admin_role_assignments.id;


--
-- Name: ai_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_logs (
    id integer NOT NULL,
    client_id uuid,
    user_id integer,
    model character varying(100) NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    cost_usd numeric(10,6) DEFAULT 0 NOT NULL,
    response_time_ms integer,
    endpoint character varying(255),
    success boolean DEFAULT true NOT NULL,
    error_message text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ai_usage_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_usage_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_usage_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_usage_logs_id_seq OWNED BY public.ai_usage_logs.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    key_hash character varying(64) NOT NULL,
    key_prefix character varying(8) NOT NULL,
    client_id integer,
    scopes text[] DEFAULT '{}'::text[],
    rate_limit integer DEFAULT 1000,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by integer
);


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: approval_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    approval_instance_id uuid NOT NULL,
    stage_instance_id uuid,
    action character varying(50) NOT NULL,
    action_category character varying(30) NOT NULL,
    performed_by uuid,
    performed_by_name character varying(200),
    performed_by_role character varying(50),
    is_system_action boolean DEFAULT false,
    previous_status character varying(50),
    new_status character varying(50),
    comment text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    workflow_template_id uuid,
    entity_type public.workflow_entity_type NOT NULL,
    entity_id uuid NOT NULL,
    entity_reference character varying(100),
    status public.approval_instance_status DEFAULT 'draft'::public.approval_instance_status NOT NULL,
    current_stage_id uuid,
    current_stage_order integer DEFAULT 0,
    requested_amount numeric(15,2),
    request_metadata jsonb,
    initiated_by uuid NOT NULL,
    initiated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    completed_by uuid,
    rejection_count integer DEFAULT 0,
    last_rejection_reason text,
    last_rejected_by uuid,
    last_rejected_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


--
-- Name: approval_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_levels (
    id integer NOT NULL,
    level integer NOT NULL,
    "levelName" character varying(100) NOT NULL,
    "roleName" character varying(100) NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "approvalLimit" numeric(15,2),
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: approval_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_levels_id_seq OWNED BY public.approval_levels.id;


--
-- Name: approval_stage_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_stage_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_instance_id uuid NOT NULL,
    workflow_stage_id uuid NOT NULL,
    status public.approval_stage_status DEFAULT 'pending'::public.approval_stage_status NOT NULL,
    stage_order integer NOT NULL,
    resolved_approver_id uuid,
    resolved_via public.stage_assignee_type,
    fallback_applied public.fallback_strategy,
    fallback_reason text,
    actioned_by uuid,
    actioned_at timestamp with time zone,
    action_comment text,
    activated_at timestamp with time zone,
    due_at timestamp with time zone,
    escalated_at timestamp with time zone,
    escalated_to uuid,
    attempt_number integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


--
-- Name: approval_workflow_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_workflow_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_template_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    stage_order integer NOT NULL,
    assignee_type public.stage_assignee_type DEFAULT 'role'::public.stage_assignee_type NOT NULL,
    assigned_user_id uuid,
    assigned_role character varying(50),
    assignment_condition jsonb,
    fallback_strategy public.fallback_strategy DEFAULT 'auto_assign_admin'::public.fallback_strategy NOT NULL,
    fallback_user_id uuid,
    fallback_role character varying(50),
    secondary_fallback public.fallback_strategy,
    fallback_reason text,
    is_optional boolean DEFAULT false,
    is_conditional boolean DEFAULT false,
    condition_expression jsonb,
    allow_self_approval boolean DEFAULT false,
    require_comment boolean DEFAULT false,
    min_amount numeric(15,2),
    max_amount numeric(15,2),
    sla_hours integer DEFAULT 24,
    escalation_hours integer DEFAULT 48,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


--
-- Name: approval_workflow_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_workflow_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    entity_type public.workflow_entity_type NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    allow_parallel_stages boolean DEFAULT false,
    require_all_approvals boolean DEFAULT true,
    max_rejection_count integer DEFAULT 3,
    expiry_days integer DEFAULT 30,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone
);


--
-- Name: approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approvals (
    id text NOT NULL,
    "taskId" text NOT NULL,
    level integer NOT NULL,
    "levelName" character varying(100) NOT NULL,
    "approverId" integer NOT NULL,
    action character varying(50) NOT NULL,
    comment text,
    attachments jsonb,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: approver_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approver_configurations (
    id text NOT NULL,
    "userId" integer NOT NULL,
    level integer NOT NULL,
    "approvalLimit" numeric(15,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "autoAssign" boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "maxConcurrentTasks" integer DEFAULT 10,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: approver_selection_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approver_selection_logs (
    id text NOT NULL,
    "taskId" text,
    "paymentRequestId" text,
    level integer NOT NULL,
    "selectedApproverId" integer NOT NULL,
    "requestedApprovers" jsonb,
    "availableApprovers" jsonb,
    "selectionMethod" character varying(50) NOT NULL,
    "paymentAmount" numeric(15,2),
    "approverWorkload" integer,
    metadata jsonb,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assistant_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assistant_memory (
    id text NOT NULL,
    "userId" integer NOT NULL,
    "lastBranchId" integer,
    "lastModule" character varying(100),
    preferences jsonb,
    "lastSummary" text,
    "conversationCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    session_id integer,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    changed_fields text[],
    operation_context jsonb
);


--
-- Name: COLUMN audit_logs.service_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.service_name IS 'Name of the service/application that made the change (backend, worker, migrator)';


--
-- Name: COLUMN audit_logs.service_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.service_user IS 'Database user used for the connection';


--
-- Name: COLUMN audit_logs.query_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.query_text IS 'The SQL query that was executed (truncated for large queries)';


--
-- Name: COLUMN audit_logs.execution_time_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.execution_time_ms IS 'Query execution time in milliseconds';


--
-- Name: COLUMN audit_logs.rows_affected; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.rows_affected IS 'Number of rows affected by the operation';


--
-- Name: COLUMN audit_logs.request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.request_id IS 'Unique ID for the HTTP request (for tracing)';


--
-- Name: COLUMN audit_logs.tenant_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.tenant_id IS 'Tenant ID for multi-tenant isolation';


--
-- Name: COLUMN audit_logs.super_admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.super_admin_id IS 'Super Admin ID for ownership tracking';


--
-- Name: COLUMN audit_logs.changed_fields; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.changed_fields IS 'List of field names that were modified';


--
-- Name: COLUMN audit_logs.operation_context; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.operation_context IS 'Additional context (endpoint, method, etc.)';


--
-- Name: audit_logs_dml; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_dml (
    id bigint NOT NULL,
    table_name character varying(100) NOT NULL,
    operation character varying(10) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by integer,
    changed_at timestamp with time zone DEFAULT now(),
    client_id integer,
    business_id integer,
    transaction_id uuid DEFAULT gen_random_uuid()
);


--
-- Name: audit_logs_dml_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_dml_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_dml_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_dml_id_seq OWNED BY public.audit_logs_dml.id;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: audit_logs_partitioned; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_partitioned (
    id integer NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id integer,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    operation_context jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (created_at);


--
-- Name: audit_logs_partitioned_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_partitioned_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_partitioned_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_partitioned_id_seq OWNED BY public.audit_logs_partitioned.id;


--
-- Name: audit_logs_p2025_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_p2025_12 (
    id integer DEFAULT nextval('public.audit_logs_partitioned_id_seq'::regclass) NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id integer,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    operation_context jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_p2026_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_p2026_01 (
    id integer DEFAULT nextval('public.audit_logs_partitioned_id_seq'::regclass) NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id integer,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    operation_context jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_p2026_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_p2026_02 (
    id integer DEFAULT nextval('public.audit_logs_partitioned_id_seq'::regclass) NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id integer,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    operation_context jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_p2026_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_p2026_03 (
    id integer DEFAULT nextval('public.audit_logs_partitioned_id_seq'::regclass) NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id integer,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    operation_context jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_p2026_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_p2026_04 (
    id integer DEFAULT nextval('public.audit_logs_partitioned_id_seq'::regclass) NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id integer,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    operation_context jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_p2026_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_p2026_05 (
    id integer DEFAULT nextval('public.audit_logs_partitioned_id_seq'::regclass) NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id integer,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    operation_context jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_p_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_p_default (
    id integer DEFAULT nextval('public.audit_logs_partitioned_id_seq'::regclass) NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(100),
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id integer,
    service_name character varying(100),
    service_user character varying(100),
    query_text text,
    execution_time_ms integer,
    rows_affected integer,
    request_id uuid,
    tenant_id uuid,
    super_admin_id integer,
    operation_context jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bank_statement_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_statement_lines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    statement_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    row_number integer NOT NULL,
    txn_date date NOT NULL,
    value_date date,
    description text,
    narration text,
    amount numeric(18,4) NOT NULL,
    direction public.txn_direction NOT NULL,
    balance numeric(18,4),
    reference character varying(100),
    utr character varying(50),
    cheque_number character varying(50),
    category character varying(100),
    is_bank_charge boolean DEFAULT false,
    is_interest boolean DEFAULT false,
    is_reversal boolean DEFAULT false,
    is_matched boolean DEFAULT false,
    match_confidence integer DEFAULT 0,
    matched_at timestamp with time zone,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_amount CHECK ((amount >= (0)::numeric)),
    CONSTRAINT valid_confidence CHECK (((match_confidence >= 0) AND (match_confidence <= 100)))
);


--
-- Name: bank_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_statements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    statement_number character varying(100),
    bank_account_id uuid,
    bank_name character varying(255) NOT NULL,
    account_number character varying(100),
    original_filename character varying(500) NOT NULL,
    file_path character varying(1000) NOT NULL,
    file_size_bytes bigint,
    file_hash character varying(64),
    file_format public.bank_file_format NOT NULL,
    period_start date,
    period_end date,
    opening_balance numeric(18,4),
    closing_balance numeric(18,4),
    currency character varying(3) DEFAULT 'INR'::character varying,
    template_id uuid,
    total_rows integer DEFAULT 0,
    parsed_rows integer DEFAULT 0,
    error_rows integer DEFAULT 0,
    parse_errors jsonb DEFAULT '[]'::jsonb,
    is_parsed boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    uploaded_by uuid NOT NULL,
    parsed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bank_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    bank_name character varying(255) NOT NULL,
    account_pattern character varying(100),
    description text,
    file_format public.bank_file_format DEFAULT 'CSV'::public.bank_file_format NOT NULL,
    file_encoding character varying(50) DEFAULT 'UTF-8'::character varying,
    delimiter character varying(10) DEFAULT ','::character varying,
    header_row integer DEFAULT 1,
    data_start_row integer DEFAULT 2,
    column_mappings jsonb DEFAULT '{}'::jsonb NOT NULL,
    date_format character varying(50) DEFAULT 'YYYY-MM-DD'::character varying,
    date_locale character varying(10) DEFAULT 'en'::character varying,
    amount_format jsonb DEFAULT '{"debit_column": null, "credit_column": null, "debit_indicators": ["DR", "D", "-"], "separate_columns": false, "credit_indicators": ["CR", "C", "+"], "decimal_separator": ".", "thousands_separator": ","}'::jsonb,
    utr_extraction jsonb DEFAULT '{"regex": "[A-Z0-9]{12,22}", "column": "reference", "fallback_columns": ["description", "narration"]}'::jsonb,
    validation_rules jsonb DEFAULT '{"max_rows": 100000, "min_rows": 1, "required_columns": ["date", "amount"]}'::jsonb,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: billing_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    feature_key character varying(100) NOT NULL,
    feature_name character varying(200) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    days_active integer DEFAULT 30 NOT NULL,
    proration_factor numeric(5,4) DEFAULT 1.0000 NOT NULL,
    amount numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    net_amount numeric(12,2) NOT NULL,
    service_start timestamp with time zone NOT NULL,
    service_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_invoice_items_id_seq OWNED BY public.billing_invoice_items.id;


--
-- Name: billing_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_overrides (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    override_type character varying(50) NOT NULL,
    discount_percent numeric(5,2),
    custom_price numeric(12,2),
    pause_start timestamp with time zone,
    pause_end timestamp with time zone,
    trial_extension_days integer,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    reason text NOT NULL,
    internal_notes text,
    is_active boolean DEFAULT true,
    applied_at timestamp with time zone,
    created_by integer NOT NULL,
    approved_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: billing_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_overrides_id_seq OWNED BY public.billing_overrides.id;


--
-- Name: bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills (
    id text NOT NULL,
    "filePath" character varying(500) NOT NULL,
    "originalName" character varying(255) NOT NULL,
    "fileType" character varying(50) NOT NULL,
    "fileSize" integer NOT NULL,
    "uploadedById" integer NOT NULL,
    "ocrStatus" public."OcrStatus" DEFAULT 'PENDING'::public."OcrStatus" NOT NULL,
    "ocrText" text,
    "parsedJson" jsonb,
    "taskId" text,
    "taskCreated" boolean DEFAULT false NOT NULL,
    "processingError" text,
    "processingTime" integer DEFAULT 0,
    confidence double precision,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    tenant_id uuid,
    branch_code character varying(50) NOT NULL,
    branch_name character varying(255) NOT NULL,
    address_line1 character varying(255) NOT NULL,
    address_line2 character varying(255),
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    postal_code character varying(20) NOT NULL,
    country character varying(100) DEFAULT 'India'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.branches FORCE ROW LEVEL SECURITY;


--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_logs (
    id text NOT NULL,
    room_name character varying(255) NOT NULL,
    thread_id text NOT NULL,
    initiator_id integer NOT NULL,
    call_type character varying(20) DEFAULT 'audio'::character varying NOT NULL,
    status character varying(30) DEFAULT 'ringing'::character varying NOT NULL,
    started_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ended_at timestamp(3) without time zone,
    duration_seconds integer DEFAULT 0,
    participants jsonb,
    recording_url text,
    transcript_url text,
    quality_metrics jsonb,
    consent_recorded boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: chat_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_analytics (
    id integer NOT NULL,
    user_id integer,
    role_id integer,
    conversation_id integer,
    event_type character varying(50),
    intent character varying(100),
    success boolean DEFAULT true,
    response_time_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_analytics_id_seq OWNED BY public.chat_analytics.id;


--
-- Name: chat_common_mistakes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_common_mistakes (
    id integer NOT NULL,
    incorrect_word character varying(255) NOT NULL,
    correct_word character varying(255) NOT NULL,
    frequency integer DEFAULT 1,
    context character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_common_mistakes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_common_mistakes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_common_mistakes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_common_mistakes_id_seq OWNED BY public.chat_common_mistakes.id;


--
-- Name: chat_context_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_context_slots (
    id integer NOT NULL,
    intent character varying(100) NOT NULL,
    slot_name character varying(50) NOT NULL,
    slot_type character varying(30) NOT NULL,
    entity_type character varying(50),
    is_required boolean DEFAULT false,
    prompt_message text,
    validation_regex text,
    default_value text,
    order_priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE chat_context_slots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_context_slots IS 'Slot definitions for multi-turn slot filling';


--
-- Name: chat_context_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_context_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_context_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_context_slots_id_seq OWNED BY public.chat_context_slots.id;


--
-- Name: chat_conversation_context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversation_context (
    id integer NOT NULL,
    conversation_id uuid NOT NULL,
    user_id integer,
    turn_number integer DEFAULT 1 NOT NULL,
    user_message text NOT NULL,
    bot_response text,
    intent character varying(100),
    confidence numeric(5,4),
    entities jsonb DEFAULT '{}'::jsonb,
    context_state jsonb DEFAULT '{}'::jsonb,
    parent_turn_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_conversation_context_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_conversation_context_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_conversation_context_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_conversation_context_id_seq OWNED BY public.chat_conversation_context.id;


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255),
    context_type character varying(50) DEFAULT 'general'::character varying,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_message_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_conversations_id_seq OWNED BY public.chat_conversations.id;


--
-- Name: chat_entity_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_entity_types (
    id integer NOT NULL,
    entity_name character varying(50) NOT NULL,
    entity_type character varying(30) NOT NULL,
    patterns text[],
    "values" jsonb,
    synonyms jsonb DEFAULT '{}'::jsonb,
    description text,
    examples text[],
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE chat_entity_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_entity_types IS 'Custom entity definitions for named entity recognition';


--
-- Name: chat_entity_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_entity_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_entity_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_entity_types_id_seq OWNED BY public.chat_entity_types.id;


--
-- Name: chat_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_feedback (
    id integer NOT NULL,
    conversation_id uuid,
    message_id integer,
    user_id integer,
    training_data_id integer,
    feedback_type character varying(20) NOT NULL,
    feedback_value integer,
    user_correction text,
    user_expected_intent character varying(100),
    original_response text,
    correct_response text,
    metadata jsonb DEFAULT '{}'::jsonb,
    processed boolean DEFAULT false,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_feedback_id_seq OWNED BY public.chat_feedback.id;


--
-- Name: chat_intent_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_intent_flows (
    id integer NOT NULL,
    from_intent character varying(100) NOT NULL,
    to_intent character varying(100) NOT NULL,
    trigger_condition jsonb,
    probability numeric(5,4) DEFAULT 0.5,
    context_update jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE chat_intent_flows; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_intent_flows IS 'Defines valid conversation flows between intents';


--
-- Name: chat_intent_flows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_intent_flows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_intent_flows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_intent_flows_id_seq OWNED BY public.chat_intent_flows.id;


--
-- Name: chat_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_interactions (
    id integer NOT NULL,
    user_id integer,
    session_id character varying(100),
    user_message text,
    bot_response text,
    intent character varying(100),
    confidence numeric(5,4),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sanitized_message text,
    response_time_ms integer
);


--
-- Name: chat_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_interactions_id_seq OWNED BY public.chat_interactions.id;


--
-- Name: chat_learning_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_learning_queue (
    id integer NOT NULL,
    source character varying(30) NOT NULL,
    user_message text NOT NULL,
    detected_intent character varying(100),
    confidence numeric(5,4),
    suggested_intent character varying(100),
    suggested_response text,
    user_feedback text,
    frequency integer DEFAULT 1,
    similar_messages jsonb DEFAULT '[]'::jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_learning_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_learning_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_learning_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_learning_queue_id_seq OWNED BY public.chat_learning_queue.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    intent character varying(100),
    entities jsonb DEFAULT '{}'::jsonb,
    response_metadata jsonb DEFAULT '{}'::jsonb,
    feedback character varying(20),
    is_correction boolean DEFAULT false,
    corrected_from text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: chat_response_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_response_variants (
    id integer NOT NULL,
    training_data_id integer,
    variant_name character varying(50),
    response_template text NOT NULL,
    weight numeric(5,4) DEFAULT 0.5,
    impressions integer DEFAULT 0,
    positive_reactions integer DEFAULT 0,
    negative_reactions integer DEFAULT 0,
    conversion_rate numeric(5,4) DEFAULT 0.0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE chat_response_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_response_variants IS 'A/B testing variants for response optimization';


--
-- Name: chat_response_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_response_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_response_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_response_variants_id_seq OWNED BY public.chat_response_variants.id;


--
-- Name: chat_semantic_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_semantic_cache (
    id integer NOT NULL,
    query_hash character varying(64) NOT NULL,
    query_text text NOT NULL,
    matched_intent character varying(100),
    matched_training_id integer,
    similarity_score numeric(5,4),
    hit_count integer DEFAULT 1,
    last_hit_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE chat_semantic_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_semantic_cache IS 'Cache for frequently asked queries';


--
-- Name: chat_semantic_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_semantic_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_semantic_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_semantic_cache_id_seq OWNED BY public.chat_semantic_cache.id;


--
-- Name: chat_training_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_training_analytics (
    id integer NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    total_messages integer DEFAULT 0,
    matched_intents integer DEFAULT 0,
    unmatched_intents integer DEFAULT 0,
    avg_confidence numeric(5,4),
    top_intents jsonb DEFAULT '[]'::jsonb,
    top_unmatched_queries jsonb DEFAULT '[]'::jsonb,
    feedback_positive integer DEFAULT 0,
    feedback_negative integer DEFAULT 0,
    new_training_added integer DEFAULT 0,
    model_accuracy numeric(5,4),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE chat_training_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_training_analytics IS 'Daily aggregated metrics for training performance';


--
-- Name: chat_training_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_training_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_training_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_training_analytics_id_seq OWNED BY public.chat_training_analytics.id;


--
-- Name: chat_training_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_training_data (
    id integer NOT NULL,
    pattern text NOT NULL,
    intent character varying(100) NOT NULL,
    response_template text NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    priority integer DEFAULT 50,
    examples jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    keywords text[] DEFAULT '{}'::text[],
    synonyms jsonb DEFAULT '{}'::jsonb,
    entity_patterns jsonb DEFAULT '{}'::jsonb,
    follow_up_intents text[] DEFAULT '{}'::text[],
    context_required jsonb DEFAULT '{}'::jsonb,
    response_variants jsonb DEFAULT '[]'::jsonb,
    success_rate numeric(5,4) DEFAULT 0.0,
    total_matches integer DEFAULT 0,
    positive_feedback integer DEFAULT 0,
    negative_feedback integer DEFAULT 0,
    last_matched_at timestamp without time zone,
    difficulty_level character varying(20) DEFAULT 'medium'::character varying,
    language character varying(10) DEFAULT 'en'::character varying,
    tags text[] DEFAULT '{}'::text[],
    requires_permission character varying(100)
);


--
-- Name: chat_training_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_training_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_training_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_training_data_id_seq OWNED BY public.chat_training_data.id;


--
-- Name: chat_user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_user_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    first_name character varying(100),
    last_visit timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    visit_count integer DEFAULT 0,
    preferred_language character varying(10) DEFAULT 'en'::character varying,
    notification_enabled boolean DEFAULT true,
    theme character varying(20) DEFAULT 'light'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ignore_spellcheck text[] DEFAULT '{}'::text[]
);


--
-- Name: chat_user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_user_preferences_id_seq OWNED BY public.chat_user_preferences.id;


--
-- Name: clarification_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clarification_audit (
    id integer NOT NULL,
    clarification_id uuid NOT NULL,
    task_id integer NOT NULL,
    tenant_id uuid,
    actor_id integer NOT NULL,
    actor_name character varying(255),
    actor_role character varying(100),
    action character varying(50) NOT NULL,
    old_status character varying(50),
    new_status character varying(50),
    comment text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: clarification_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clarification_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clarification_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clarification_audit_id_seq OWNED BY public.clarification_audit.id;


--
-- Name: client_daily_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_daily_usage (
    date date NOT NULL,
    client_id uuid NOT NULL,
    module_id integer NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    create_count integer DEFAULT 0 NOT NULL,
    edit_count integer DEFAULT 0 NOT NULL,
    delete_count integer DEFAULT 0 NOT NULL,
    active_users integer DEFAULT 0 NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.client_daily_usage FORCE ROW LEVEL SECURITY;


--
-- Name: client_feature_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_feature_overrides (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    flag_code character varying(100) NOT NULL,
    override_value public.feature_flag_value NOT NULL,
    numeric_override integer,
    reason text,
    expires_at timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_feature_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_feature_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_feature_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_feature_overrides_id_seq OWNED BY public.client_feature_overrides.id;


--
-- Name: client_module_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_module_permissions (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    module_id integer NOT NULL,
    can_view boolean DEFAULT true NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.client_module_permissions FORCE ROW LEVEL SECURITY;


--
-- Name: client_module_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_module_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_module_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_module_permissions_id_seq OWNED BY public.client_module_permissions.id;


--
-- Name: client_onboarding_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_onboarding_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    step_key character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    meta jsonb,
    actor_email character varying(150),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.client_onboarding_activity FORCE ROW LEVEL SECURITY;


--
-- Name: client_role_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_role_assignments (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer
);


--
-- Name: client_role_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_role_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_role_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_role_assignments_id_seq OWNED BY public.client_role_assignments.id;


--
-- Name: client_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_sequences (
    id integer NOT NULL,
    client_type character varying(50) NOT NULL,
    year integer NOT NULL,
    last_number bigint DEFAULT 0 NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: client_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_sequences_id_seq OWNED BY public.client_sequences.id;


--
-- Name: client_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_subscriptions (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    plan_id integer NOT NULL,
    state public.subscription_state DEFAULT 'TRIAL'::public.subscription_state NOT NULL,
    previous_state public.subscription_state,
    state_changed_at timestamp with time zone DEFAULT now(),
    billing_cycle public.billing_cycle_type DEFAULT 'MONTHLY'::public.billing_cycle_type NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    next_billing_date timestamp with time zone,
    trial_start_date timestamp with time zone,
    trial_end_date timestamp with time zone,
    trial_converted boolean DEFAULT false,
    grace_period_start timestamp with time zone,
    grace_period_end timestamp with time zone,
    grace_reason character varying(255),
    current_user_count integer DEFAULT 0,
    current_storage_used bigint DEFAULT 0,
    current_api_calls integer DEFAULT 0,
    stripe_subscription_id character varying(100),
    stripe_customer_id character varying(100),
    scheduled_plan_id integer,
    scheduled_change_date timestamp with time zone,
    scheduled_change_type character varying(20),
    is_active boolean DEFAULT true,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_subscriptions_id_seq OWNED BY public.client_subscriptions.id;


--
-- Name: client_usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(50) NOT NULL,
    meta jsonb,
    occurred_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.client_usage_events FORCE ROW LEVEL SECURITY;


--
-- Name: client_usage_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_usage_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_usage_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_usage_events_id_seq OWNED BY public.client_usage_events.id;


--
-- Name: client_usage_events_partitioned; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_partitioned (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (occurred_at);


--
-- Name: client_usage_events_partitioned_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_usage_events_partitioned_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_usage_events_partitioned_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_usage_events_partitioned_id_seq OWNED BY public.client_usage_events_partitioned.id;


--
-- Name: client_usage_events_p2025_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2025_09 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2025_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2025_10 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2025_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2025_11 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2025_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2025_12 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_01 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_02 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_03 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_04 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_05 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_06 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_07 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_08 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_09 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_10 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p2026_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p2026_11 (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_usage_events_p_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_usage_events_p_default (
    id integer DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass) NOT NULL,
    client_id uuid NOT NULL,
    module_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    meta jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    client_code character varying(50),
    public_code character varying(50),
    client_number bigint,
    legal_name character varying(200),
    trade_name character varying(200),
    client_type character varying(50),
    industry character varying(100),
    business_size character varying(50),
    registration_number character varying(100),
    tax_id character varying(50),
    legal_status character varying(50),
    import_export_code character varying(50),
    registration_year integer,
    addresses jsonb,
    contact_persons jsonb,
    financial_details jsonb,
    bank_details jsonb,
    documents jsonb,
    system_access jsonb,
    operational jsonb,
    risk jsonb,
    status character varying(30) DEFAULT 'Active'::character varying,
    onboarding_status character varying(30) DEFAULT 'pending'::character varying,
    trial_start_date timestamp(6) without time zone,
    trial_end_date timestamp(6) without time zone,
    modules_enabled jsonb,
    notification_prefs jsonb,
    preferred_language character varying(10),
    timezone character varying(100),
    mfa_enabled boolean DEFAULT false,
    duplicate_check jsonb,
    onboarding_activity jsonb,
    onboarding_date timestamp(6) without time zone,
    first_invoice_date timestamp(6) without time zone,
    last_activity_date timestamp(6) without time zone,
    auto_disable_rules jsonb,
    "productType" character varying(50) NOT NULL,
    super_admin_id integer NOT NULL,
    "subscriptionPlan" character varying(50) DEFAULT 'free'::character varying NOT NULL,
    "subscriptionStatus" character varying(50) DEFAULT 'active'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    settings jsonb,
    logo text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    stripe_customer_id character varying(100),
    stripe_subscription_id character varying(100),
    subscription_status character varying(50),
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    trial_expired boolean DEFAULT false,
    payment_failed boolean DEFAULT false,
    payment_failed_at timestamp with time zone,
    last_payment_at timestamp with time zone,
    unique_id character varying(50)
);

ALTER TABLE ONLY public.clients FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN clients.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.created_by IS 'User/Admin ID who created this client';


--
-- Name: contract_accounting_maps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_accounting_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    expense_ledger_id uuid NOT NULL,
    advance_ledger_id uuid,
    payable_ledger_id uuid,
    is_activated boolean DEFAULT false NOT NULL,
    activated_at timestamp(6) with time zone,
    activated_by integer,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: contract_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    action_details text,
    old_values jsonb,
    new_values jsonb,
    performed_by integer NOT NULL,
    performed_by_name character varying(255),
    performed_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address character varying(50)
);


--
-- Name: contract_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size_bytes integer,
    document_type character varying(50) NOT NULL,
    description text,
    version integer DEFAULT 1 NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    uploaded_by integer NOT NULL,
    uploaded_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: contract_financials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_financials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    monthly_amount numeric(15,2) DEFAULT 0 NOT NULL,
    advance_amount numeric(15,2) DEFAULT 0 NOT NULL,
    security_deposit numeric(15,2) DEFAULT 0 NOT NULL,
    tax_type character varying(30),
    tax_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    payment_cycle character varying(30) DEFAULT 'MONTHLY'::character varying NOT NULL,
    payment_due_day integer DEFAULT 1,
    escalation_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    escalation_frequency character varying(30),
    total_contract_value numeric(18,2) DEFAULT 0 NOT NULL,
    bank_name character varying(255),
    bank_account_number character varying(50),
    bank_ifsc character varying(20),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: contract_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    reminder_type character varying(30) NOT NULL,
    reminder_days_before integer NOT NULL,
    is_sent boolean DEFAULT false NOT NULL,
    sent_at timestamp(6) with time zone,
    recipient_emails text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    contract_type character varying(30) NOT NULL,
    contract_number character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    party_name character varying(255) NOT NULL,
    party_type character varying(50) NOT NULL,
    contact_person character varying(255),
    contact_phone character varying(30),
    contact_email character varying(255),
    party_address text,
    party_gst character varying(50),
    party_pan character varying(30),
    start_date date NOT NULL,
    end_date date NOT NULL,
    signed_date date,
    auto_renew boolean DEFAULT false NOT NULL,
    renewal_period_months integer,
    notice_period_days integer DEFAULT 30,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    termination_reason text,
    terminated_at timestamp(6) with time zone,
    terminated_by integer,
    tags text[] DEFAULT ARRAY[]::text[],
    internal_notes text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    code character varying(50),
    name character varying(200) NOT NULL,
    customer_type character varying(20) DEFAULT 'business'::character varying NOT NULL,
    email character varying(255),
    phone character varying(20),
    alternate_phone character varying(20),
    website character varying(255),
    contact_person character varying(100),
    gstin character varying(15),
    pan character varying(10),
    credit_limit numeric(15,2) DEFAULT 0,
    credit_days integer DEFAULT 0,
    credit_utilized numeric(15,2) DEFAULT 0,
    billing_address jsonb DEFAULT '{}'::jsonb NOT NULL,
    shipping_address jsonb DEFAULT '{}'::jsonb,
    same_as_shipping boolean DEFAULT true,
    notes text,
    tags text[] DEFAULT '{}'::text[],
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_customers_credit_utilized CHECK (((credit_utilized <= credit_limit) OR (credit_limit = (0)::numeric))),
    CONSTRAINT customers_credit_days_check CHECK (((credit_days >= 0) AND (credit_days <= 365))),
    CONSTRAINT customers_credit_limit_check CHECK (((credit_limit >= (0)::numeric) AND (credit_limit <= (100000000)::numeric))),
    CONSTRAINT customers_credit_utilized_check CHECK ((credit_utilized >= (0)::numeric)),
    CONSTRAINT customers_customer_type_check CHECK (((customer_type)::text = ANY ((ARRAY['individual'::character varying, 'business'::character varying, 'government'::character varying, 'ngo'::character varying])::text[]))),
    CONSTRAINT customers_gstin_check CHECK (((gstin IS NULL) OR ((gstin)::text ~ '^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'::text))),
    CONSTRAINT customers_pan_check CHECK (((pan IS NULL) OR ((pan)::text ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'::text))),
    CONSTRAINT customers_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'blocked'::character varying, 'pending'::character varying])::text[])))
);


--
-- Name: TABLE customers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customers IS 'Customer master data with Indian compliance (GSTIN, PAN, credit terms)';


--
-- Name: COLUMN customers.gstin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.gstin IS '15-character GST Identification Number';


--
-- Name: COLUMN customers.pan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.pan IS '10-character Permanent Account Number';


--
-- Name: COLUMN customers.credit_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.credit_limit IS 'Maximum credit allowed in INR (0 = no limit)';


--
-- Name: COLUMN customers.credit_utilized; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.credit_utilized IS 'Current outstanding credit amount';


--
-- Name: COLUMN customers.billing_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.billing_address IS 'JSON: { line1, line2, city, state, pinCode, country }';


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id integer NOT NULL,
    client_id uuid,
    user_id integer,
    event_type character varying(100) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: daily_event_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daily_event_summary AS
 SELECT client_id,
    date(created_at) AS date,
    event_type,
    count(*) AS event_count
   FROM public.events
  GROUP BY client_id, (date(created_at)), event_type;


--
-- Name: enforcement_decision_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enforcement_decision_log (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    user_id integer,
    feature_code character varying(100) NOT NULL,
    action_type character varying(50) NOT NULL,
    request_path character varying(500),
    request_method character varying(10),
    decision character varying(20) NOT NULL,
    decision_reason character varying(200),
    current_usage integer,
    usage_limit integer,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text
);


--
-- Name: enforcement_decision_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enforcement_decision_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: enforcement_decision_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enforcement_decision_log_id_seq OWNED BY public.enforcement_decision_log.id;


--
-- Name: enterprise_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enterprise_admins (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    profile_pic_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_enterprise_admins_password_hash_not_empty CHECK (((password_hash IS NOT NULL) AND (length((password_hash)::text) >= 60)))
);


--
-- Name: TABLE enterprise_admins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.enterprise_admins IS 'Platform-level administrators. Passwords stored as hashes.';


--
-- Name: COLUMN enterprise_admins.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.enterprise_admins.password_hash IS 'Bcrypt/Argon2 hashed password. Never store plaintext.';


--
-- Name: enterprise_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enterprise_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: enterprise_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enterprise_admins_id_seq OWNED BY public.enterprise_admins.id;


--
-- Name: entity_id_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_id_registry (
    id integer NOT NULL,
    unique_id character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_db_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE entity_id_registry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.entity_id_registry IS 'Central registry of all generated unique IDs for traceability';


--
-- Name: COLUMN entity_id_registry.unique_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.entity_id_registry.unique_id IS 'Human-readable unique ID (e.g., USR-20251207-00001)';


--
-- Name: COLUMN entity_id_registry.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.entity_id_registry.entity_type IS 'Type of entity: user, task, client, organization, etc.';


--
-- Name: COLUMN entity_id_registry.entity_db_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.entity_id_registry.entity_db_id IS 'The actual database primary key of the entity';


--
-- Name: COLUMN entity_id_registry.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.entity_id_registry.metadata IS 'Additional metadata about the entity at creation time';


--
-- Name: entity_id_registry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_id_registry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_id_registry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_id_registry_id_seq OWNED BY public.entity_id_registry.id;


--
-- Name: entity_id_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_id_sequences (
    id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    date_prefix character varying(8) NOT NULL,
    last_number bigint DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE entity_id_sequences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.entity_id_sequences IS 'Tracks sequence numbers for generating unique IDs per entity type and date';


--
-- Name: entity_id_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_id_sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_id_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_id_sequences_id_seq OWNED BY public.entity_id_sequences.id;


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    error_code character varying(100) NOT NULL,
    message text NOT NULL,
    http_status integer,
    module character varying(100),
    method character varying(10),
    path text,
    ip_address character varying(100),
    user_id integer,
    user_email character varying(255),
    user_role character varying(100),
    user_type character varying(100),
    user_agent text,
    stack text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: error_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.error_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: error_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.error_logs_id_seq OWNED BY public.error_logs.id;


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "paymentRequestId" text NOT NULL,
    "createdById" integer NOT NULL,
    "clientId" uuid,
    description text,
    amount numeric(18,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    "dueDate" timestamp(6) without time zone,
    status character varying(50) DEFAULT 'DRAFT'::character varying NOT NULL,
    attachments jsonb,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.expenses FORCE ROW LEVEL SECURITY;


--
-- Name: failed_login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_login_attempts (
    id integer NOT NULL,
    user_id integer,
    ip_address inet,
    user_agent text,
    reason character varying(100),
    attempted_at timestamp with time zone DEFAULT now()
);


--
-- Name: failed_login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_login_attempts_id_seq OWNED BY public.failed_login_attempts.id;


--
-- Name: fallback_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fallback_logs (
    id integer NOT NULL,
    module_name character varying(100) NOT NULL,
    operation_name character varying(100) NOT NULL,
    error_message text NOT NULL,
    error_code character varying(50),
    user_id character varying(50),
    request_payload text,
    response_type character varying(50) DEFAULT 'safe_default'::character varying,
    severity character varying(20) DEFAULT 'warning'::character varying,
    fallback_triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by character varying(50),
    resolution_notes text
);


--
-- Name: TABLE fallback_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fallback_logs IS 'Stores all fallback events triggered in the system for monitoring and debugging';


--
-- Name: COLUMN fallback_logs.module_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fallback_logs.module_name IS 'The service/module that triggered the fallback (e.g., privilege, auth, inventory)';


--
-- Name: COLUMN fallback_logs.operation_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fallback_logs.operation_name IS 'The specific operation that failed (e.g., getAllRoles, getUsersByRole)';


--
-- Name: COLUMN fallback_logs.error_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fallback_logs.error_code IS 'Categorized error type: TIMEOUT, DATABASE_ERROR, CONNECTION_ERROR, etc.';


--
-- Name: COLUMN fallback_logs.response_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fallback_logs.response_type IS 'Type of fallback response: safe_default, cached_data, empty_list';


--
-- Name: COLUMN fallback_logs.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fallback_logs.severity IS 'info, warning, critical, or alert';


--
-- Name: fallback_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fallback_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fallback_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fallback_logs_id_seq OWNED BY public.fallback_logs.id;


--
-- Name: fallback_stats_daily; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.fallback_stats_daily AS
 SELECT module_name,
    operation_name,
    date(fallback_triggered_at) AS date,
    count(*) AS total_fallbacks,
    count(*) FILTER (WHERE ((severity)::text = 'critical'::text)) AS critical_count,
    count(*) FILTER (WHERE ((severity)::text = 'warning'::text)) AS warning_count,
    count(*) FILTER (WHERE (resolved = true)) AS resolved_count
   FROM public.fallback_logs
  WHERE (fallback_triggered_at > (now() - '30 days'::interval))
  GROUP BY module_name, operation_name, (date(fallback_triggered_at))
  ORDER BY (date(fallback_triggered_at)) DESC;


--
-- Name: fallback_stats_hourly; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.fallback_stats_hourly AS
 SELECT module_name,
    operation_name,
    severity,
    date_trunc('hour'::text, fallback_triggered_at) AS hour,
    count(*) AS fallback_count,
    count(DISTINCT user_id) AS affected_users,
    count(*) FILTER (WHERE (resolved = true)) AS resolved_count
   FROM public.fallback_logs
  WHERE (fallback_triggered_at > (now() - '24:00:00'::interval))
  GROUP BY module_name, operation_name, severity, (date_trunc('hour'::text, fallback_triggered_at))
  ORDER BY (date_trunc('hour'::text, fallback_triggered_at)) DESC;


--
-- Name: feature_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_catalog (
    id integer NOT NULL,
    feature_key character varying(100) NOT NULL,
    feature_name character varying(200) NOT NULL,
    description text,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    default_limit integer DEFAULT 0 NOT NULL,
    limit_period public.usage_period_type DEFAULT 'DAILY'::public.usage_period_type NOT NULL,
    base_price numeric(10,2) DEFAULT 100.00 NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    is_editable boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    requires_approval boolean DEFAULT false NOT NULL,
    icon character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    display_on_pricing boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer,
    updated_by integer
);


--
-- Name: feature_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_catalog_id_seq OWNED BY public.feature_catalog.id;


--
-- Name: feature_flag_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flag_definitions (
    id integer NOT NULL,
    flag_code character varying(100) NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    category character varying(50),
    default_value public.feature_flag_value DEFAULT 'DISABLED'::public.feature_flag_value,
    is_numeric boolean DEFAULT false,
    numeric_unit character varying(20),
    enforce_at_api boolean DEFAULT true,
    enforce_at_ui boolean DEFAULT true,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: feature_flag_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_flag_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_flag_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_flag_definitions_id_seq OWNED BY public.feature_flag_definitions.id;


--
-- Name: feature_grace_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_grace_periods (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    feature_key character varying(100) NOT NULL,
    unlock_id integer NOT NULL,
    invoice_id integer,
    grace_start timestamp with time zone DEFAULT now() NOT NULL,
    grace_end timestamp with time zone NOT NULL,
    grace_days integer DEFAULT 7 NOT NULL,
    reminder_sent_at timestamp with time zone,
    final_warning_sent_at timestamp with time zone,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    resolved_at timestamp with time zone,
    resolution_type character varying(30),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_grace_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_grace_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_grace_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_grace_periods_id_seq OWNED BY public.feature_grace_periods.id;


--
-- Name: feature_micro_unlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_micro_unlocks (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    feature_code character varying(100) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    approval_notes text,
    requested_by integer NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_micro_unlocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_micro_unlocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_micro_unlocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_micro_unlocks_id_seq OWNED BY public.feature_micro_unlocks.id;


--
-- Name: feature_usage_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_usage_counters (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    feature_code character varying(100) NOT NULL,
    period_type public.limit_period_type DEFAULT 'monthly'::public.limit_period_type NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    used_count integer DEFAULT 0 NOT NULL,
    peak_count integer DEFAULT 0 NOT NULL,
    peak_date timestamp with time zone,
    lifetime_count bigint DEFAULT 0 NOT NULL,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_usage_counters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_usage_counters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_usage_counters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_usage_counters_id_seq OWNED BY public.feature_usage_counters.id;


--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(255) NOT NULL,
    tenant_id uuid,
    user_id uuid,
    request_path character varying(500),
    request_method character varying(10),
    request_body_hash character varying(64),
    response_status integer,
    response_body jsonb,
    result_entity_type character varying(100),
    result_entity_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone DEFAULT (now() + '24:00:00'::interval),
    completed_at timestamp without time zone,
    status character varying(20) DEFAULT 'PENDING'::character varying
);


--
-- Name: infrastructure_billing_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.infrastructure_billing_rates (
    id integer NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_name character varying(200) NOT NULL,
    price_per_unit numeric(12,4) NOT NULL,
    unit_type character varying(50) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    billing_method character varying(20) DEFAULT 'metered'::character varying NOT NULL,
    minimum_charge numeric(12,2) DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by integer
);


--
-- Name: infrastructure_billing_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.infrastructure_billing_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: infrastructure_billing_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.infrastructure_billing_rates_id_seq OWNED BY public.infrastructure_billing_rates.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    sku character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    barcode character varying(50),
    item_type character varying(20) DEFAULT 'goods'::character varying NOT NULL,
    category_id integer,
    subcategory_id integer,
    brand_id integer,
    hsn_code character varying(8),
    sac_code character varying(6),
    gst_rate numeric(5,2) DEFAULT 18,
    is_tax_exempt boolean DEFAULT false,
    purchase_price numeric(15,2) DEFAULT 0,
    selling_price numeric(15,2) DEFAULT 0,
    mrp numeric(15,2),
    min_selling_price numeric(15,2),
    pricing_tiers jsonb DEFAULT '[]'::jsonb,
    uom character varying(10) DEFAULT 'NOS'::character varying,
    track_inventory boolean DEFAULT true,
    inventory_method character varying(20) DEFAULT 'fifo'::character varying,
    reorder_level numeric(15,3) DEFAULT 0,
    reorder_qty numeric(15,3) DEFAULT 0,
    min_stock_level numeric(15,3) DEFAULT 0,
    max_stock_level numeric(15,3),
    opening_stock numeric(15,3) DEFAULT 0,
    current_stock numeric(15,3) DEFAULT 0,
    weight numeric(10,3),
    weight_unit character varying(5) DEFAULT 'kg'::character varying,
    length numeric(10,2),
    width numeric(10,2),
    height numeric(10,2),
    dimension_unit character varying(5) DEFAULT 'cm'::character varying,
    short_description character varying(255),
    long_description text,
    image_url character varying(500),
    images text[] DEFAULT '{}'::text[],
    notes text,
    tags text[] DEFAULT '{}'::text[],
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    is_sellable boolean DEFAULT true,
    is_purchasable boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_items_min_selling CHECK (((min_selling_price IS NULL) OR (min_selling_price <= selling_price))),
    CONSTRAINT chk_items_mrp_selling CHECK (((mrp IS NULL) OR (mrp >= selling_price))),
    CONSTRAINT items_dimension_unit_check CHECK (((dimension_unit)::text = ANY ((ARRAY['cm'::character varying, 'mm'::character varying, 'in'::character varying, 'm'::character varying])::text[]))),
    CONSTRAINT items_gst_rate_check CHECK (((gst_rate >= (0)::numeric) AND (gst_rate <= (100)::numeric))),
    CONSTRAINT items_height_check CHECK (((height IS NULL) OR (height >= (0)::numeric))),
    CONSTRAINT items_hsn_code_check CHECK (((hsn_code IS NULL) OR ((hsn_code)::text ~ '^[0-9]{4,8}$'::text))),
    CONSTRAINT items_inventory_method_check CHECK (((inventory_method)::text = ANY ((ARRAY['fifo'::character varying, 'lifo'::character varying, 'weighted_average'::character varying, 'specific'::character varying])::text[]))),
    CONSTRAINT items_item_type_check CHECK (((item_type)::text = ANY ((ARRAY['goods'::character varying, 'service'::character varying, 'raw_material'::character varying, 'finished_goods'::character varying, 'consumable'::character varying, 'asset'::character varying])::text[]))),
    CONSTRAINT items_length_check CHECK (((length IS NULL) OR (length >= (0)::numeric))),
    CONSTRAINT items_max_stock_level_check CHECK (((max_stock_level IS NULL) OR (max_stock_level >= (0)::numeric))),
    CONSTRAINT items_min_selling_price_check CHECK (((min_selling_price IS NULL) OR (min_selling_price >= (0)::numeric))),
    CONSTRAINT items_min_stock_level_check CHECK ((min_stock_level >= (0)::numeric)),
    CONSTRAINT items_mrp_check CHECK (((mrp IS NULL) OR (mrp >= (0)::numeric))),
    CONSTRAINT items_opening_stock_check CHECK ((opening_stock >= (0)::numeric)),
    CONSTRAINT items_purchase_price_check CHECK ((purchase_price >= (0)::numeric)),
    CONSTRAINT items_reorder_level_check CHECK ((reorder_level >= (0)::numeric)),
    CONSTRAINT items_reorder_qty_check CHECK ((reorder_qty >= (0)::numeric)),
    CONSTRAINT items_sac_code_check CHECK (((sac_code IS NULL) OR ((sac_code)::text ~ '^[0-9]{6}$'::text))),
    CONSTRAINT items_selling_price_check CHECK ((selling_price >= (0)::numeric)),
    CONSTRAINT items_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'discontinued'::character varying])::text[]))),
    CONSTRAINT items_uom_check CHECK (((uom)::text = ANY ((ARRAY['NOS'::character varying, 'PCS'::character varying, 'KGS'::character varying, 'GMS'::character varying, 'LTR'::character varying, 'ML'::character varying, 'MTR'::character varying, 'CM'::character varying, 'MM'::character varying, 'SQM'::character varying, 'SQFT'::character varying, 'CBM'::character varying, 'BOX'::character varying, 'CTN'::character varying, 'SET'::character varying, 'PAC'::character varying, 'ROL'::character varying, 'BAG'::character varying, 'OTH'::character varying])::text[]))),
    CONSTRAINT items_weight_check CHECK (((weight IS NULL) OR (weight >= (0)::numeric))),
    CONSTRAINT items_weight_unit_check CHECK (((weight_unit)::text = ANY ((ARRAY['kg'::character varying, 'g'::character varying, 'lb'::character varying, 'oz'::character varying])::text[]))),
    CONSTRAINT items_width_check CHECK (((width IS NULL) OR (width >= (0)::numeric)))
);


--
-- Name: TABLE items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.items IS 'Item/Product master data with Indian tax codes (HSN/SAC) and inventory tracking';


--
-- Name: COLUMN items.hsn_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.items.hsn_code IS 'Harmonized System of Nomenclature code (4-8 digits) for goods';


--
-- Name: COLUMN items.sac_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.items.sac_code IS 'Service Accounting Code (6 digits) for services';


--
-- Name: COLUMN items.gst_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.items.gst_rate IS 'GST rate percentage (0, 0.25, 3, 5, 12, 18, 28)';


--
-- Name: COLUMN items.inventory_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.items.inventory_method IS 'Costing method: fifo, lifo, weighted_average, specific';


--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    entry_number character varying(50) NOT NULL,
    entry_date date NOT NULL,
    reference_type character varying(50) NOT NULL,
    reference_id uuid,
    description character varying(500) NOT NULL,
    total_debit numeric(18,2) NOT NULL,
    total_credit numeric(18,2) NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    posted_at timestamp(6) with time zone,
    posted_by integer,
    reversed_at timestamp(6) with time zone,
    reversed_by integer,
    reversal_entry_id uuid,
    created_by integer NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: journal_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_id uuid NOT NULL,
    ledger_id uuid NOT NULL,
    debit numeric(18,2) DEFAULT 0 NOT NULL,
    credit numeric(18,2) DEFAULT 0 NOT NULL,
    description character varying(255),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: ledgers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledgers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    ledger_type character varying(50) NOT NULL,
    parent_id uuid,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    opening_balance numeric(18,2) DEFAULT 0 NOT NULL,
    current_balance numeric(18,2) DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: load_test_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.load_test_reports (
    id integer NOT NULL,
    source character varying(100) NOT NULL,
    "p95Ms" integer NOT NULL,
    "p99Ms" integer NOT NULL,
    "avgMs" integer NOT NULL,
    errors integer NOT NULL,
    "timestamp" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes character varying(500)
);


--
-- Name: load_test_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.load_test_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: load_test_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.load_test_reports_id_seq OWNED BY public.load_test_reports.id;


--
-- Name: master_feature_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_feature_definitions (
    id integer NOT NULL,
    feature_code character varying(100) NOT NULL,
    feature_name character varying(200) NOT NULL,
    description text,
    category character varying(50) NOT NULL,
    icon character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: master_feature_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_feature_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: master_feature_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_feature_definitions_id_seq OWNED BY public.master_feature_definitions.id;


--
-- Name: master_subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_subscription_plans (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    status public.plan_status DEFAULT 'active'::public.plan_status NOT NULL,
    is_global boolean DEFAULT true NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    badge_text character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_popular boolean DEFAULT false NOT NULL,
    color_code character varying(20) DEFAULT '#3B82F6'::character varying,
    monthly_spend_cap numeric(15,2) DEFAULT 50000.00,
    auto_block_on_cap boolean DEFAULT true NOT NULL,
    cfo_approval_threshold numeric(15,2) DEFAULT 10000.00,
    invoice_cycle_days integer DEFAULT 30 NOT NULL,
    grace_period_days integer DEFAULT 7 NOT NULL,
    read_only_after_grace boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer,
    updated_by integer,
    archived_at timestamp with time zone,
    archived_by integer
);


--
-- Name: master_subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: master_subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_subscription_plans_id_seq OWNED BY public.master_subscription_plans.id;


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    id bigint NOT NULL,
    message_id text NOT NULL,
    user_id integer NOT NULL,
    emoji character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE message_reactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_reactions IS 'Normalized message reactions (replaces reactions JSONB in thread_messages)';


--
-- Name: message_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_reactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_reactions_id_seq OWNED BY public.message_reactions.id;


--
-- Name: message_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reads (
    id bigint NOT NULL,
    message_id text NOT NULL,
    user_id integer NOT NULL,
    read_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE message_reads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_reads IS 'Normalized message read receipts (replaces readBy JSONB in thread_messages)';


--
-- Name: message_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_reads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_reads_id_seq OWNED BY public.message_reads.id;


--
-- Name: micro_subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.micro_subscription_plans (
    id integer NOT NULL,
    plan_code character varying(50) NOT NULL,
    plan_name character varying(200) NOT NULL,
    description text,
    base_price_monthly numeric(10,2) DEFAULT 0 NOT NULL,
    base_price_yearly numeric(10,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    included_features jsonb DEFAULT '[]'::jsonb NOT NULL,
    feature_price_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    limit_multipliers jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    badge_text character varying(50),
    is_popular boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer,
    updated_by integer
);


--
-- Name: micro_subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.micro_subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: micro_subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.micro_subscription_plans_id_seq OWNED BY public.micro_subscription_plans.id;


--
-- Name: micro_unlock_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.micro_unlock_audit_log (
    id integer NOT NULL,
    tenant_id uuid,
    action character varying(100) NOT NULL,
    action_category character varying(50) NOT NULL,
    target_type character varying(50),
    target_id character varying(100),
    target_name character varying(200),
    old_values jsonb,
    new_values jsonb,
    reason text,
    ip_address inet,
    user_agent text,
    actor_type character varying(20) NOT NULL,
    actor_id integer,
    actor_email character varying(255),
    actor_name character varying(200),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: micro_unlock_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.micro_unlock_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: micro_unlock_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.micro_unlock_audit_log_id_seq OWNED BY public.micro_unlock_audit_log.id;


--
-- Name: micro_unlock_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.micro_unlock_invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    tenant_id uuid NOT NULL,
    billing_period_start timestamp with time zone NOT NULL,
    billing_period_end timestamp with time zone NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.micro_invoice_status DEFAULT 'PENDING'::public.micro_invoice_status NOT NULL,
    invoice_date timestamp with time zone DEFAULT now() NOT NULL,
    due_date timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    payment_method character varying(50),
    payment_reference character varying(255),
    payment_notes text,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer,
    CONSTRAINT valid_billing_period CHECK ((billing_period_end > billing_period_start))
);


--
-- Name: micro_unlock_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.micro_unlock_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: micro_unlock_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.micro_unlock_invoices_id_seq OWNED BY public.micro_unlock_invoices.id;


--
-- Name: migration_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_history (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    applied_by character varying(100) DEFAULT CURRENT_USER,
    backup_file text,
    checksum text
);


--
-- Name: migration_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migration_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migration_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migration_history_id_seq OWNED BY public.migration_history.id;


--
-- Name: module_approval_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_approval_flows (
    id integer NOT NULL,
    module_id integer NOT NULL,
    approval_level character varying(10) NOT NULL,
    level_name character varying(100) NOT NULL,
    min_business_level integer NOT NULL,
    step_order integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT module_approval_flows_min_business_level_check CHECK (((min_business_level >= 1) AND (min_business_level <= 10)))
);


--
-- Name: module_approval_flows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.module_approval_flows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: module_approval_flows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.module_approval_flows_id_seq OWNED BY public.module_approval_flows.id;


--
-- Name: module_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_assignments (
    id integer NOT NULL,
    super_admin_id integer NOT NULL,
    module_id integer NOT NULL,
    assigned_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    page_permissions jsonb
);


--
-- Name: module_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.module_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: module_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.module_assignments_id_seq OWNED BY public.module_assignments.id;


--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    id integer NOT NULL,
    module_name character varying(100) NOT NULL,
    display_name character varying(150) NOT NULL,
    description text,
    route character varying(255) NOT NULL,
    icon character varying(100),
    "productType" character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_always_accessible boolean DEFAULT false NOT NULL
);


--
-- Name: modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modules_id_seq OWNED BY public.modules.id;


--
-- Name: onboarding_magic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_magic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    email character varying(150),
    token_hash character varying(255) NOT NULL,
    expires_at timestamp(6) without time zone NOT NULL,
    used_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_ip inet,
    user_agent character varying(255)
);


--
-- Name: otp_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_tokens (
    id text NOT NULL,
    email character varying(150) NOT NULL,
    purpose character varying(50) NOT NULL,
    otp_hash character varying(128) NOT NULL,
    expires_at timestamp(6) without time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_sent_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    blocked_until timestamp(3) without time zone,
    CONSTRAINT chk_otp_hash_length CHECK ((length((otp_hash)::text) >= 64))
);


--
-- Name: TABLE otp_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.otp_tokens IS 'One-time passwords. OTPs stored as SHA-256 hashes.';


--
-- Name: partial_payment_disallow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partial_payment_disallow (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_request_id character varying(255) NOT NULL,
    reason text NOT NULL,
    disallowed_by uuid,
    disallowed_at timestamp without time zone DEFAULT now(),
    notes text
);


--
-- Name: password_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: password_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_history_id_seq OWNED BY public.password_history.id;


--
-- Name: payment_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_activity_logs (
    id integer NOT NULL,
    "paymentRequestId" text NOT NULL,
    "userId" integer,
    action character varying(100) NOT NULL,
    "oldStatus" character varying(50),
    "newStatus" character varying(50),
    comment text,
    metadata jsonb,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payment_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_activity_logs_id_seq OWNED BY public.payment_activity_logs.id;


--
-- Name: payment_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_records (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "paymentRequestId" text NOT NULL,
    "paidById" integer,
    "paymentMode" character varying(100),
    "paymentGateway" character varying(100),
    "transactionId" character varying(255),
    details jsonb,
    amount numeric(18,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    "paidAt" timestamp(6) without time zone,
    "receiptUrl" text,
    notes text,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payment_request_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_request_line_items (
    id integer NOT NULL,
    "paymentRequestId" text NOT NULL,
    description character varying(500) NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit character varying(50) DEFAULT 'unit'::character varying,
    rate numeric(18,2) NOT NULL,
    "taxRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "discountRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(18,2) NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: payment_request_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_request_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_request_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_request_line_items_id_seq OWNED BY public.payment_request_line_items.id;


--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_requests (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "clientId" uuid,
    "clientName" character varying(200) NOT NULL,
    "clientEmail" character varying(150),
    "clientPhone" character varying(50),
    subtotal numeric(18,2) NOT NULL,
    "taxAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(18,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    description text,
    notes text,
    "dueDate" timestamp(6) without time zone,
    "invoiceNumber" character varying(100),
    status character varying(50) DEFAULT 'DRAFT'::character varying NOT NULL,
    attachments jsonb,
    "paymentToken" text,
    "paymentLinkSentAt" timestamp(6) without time zone,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by integer
);

ALTER TABLE ONLY public.payment_requests FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN payment_requests.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_requests.updated_by IS 'Last user who modified this request';


--
-- Name: payment_settlement_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_settlement_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_number character varying(50) NOT NULL,
    tenant_id uuid,
    batch_type character varying(50) DEFAULT 'WEEKLY'::character varying,
    total_requests integer DEFAULT 0,
    total_amount numeric(18,2) DEFAULT 0,
    settled_amount numeric(18,2) DEFAULT 0,
    bank_account_id uuid,
    bank_transaction_id character varying(100),
    utr_number character varying(100),
    status character varying(50) DEFAULT 'OPEN'::character varying,
    settlement_date date,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone,
    settled_at timestamp without time zone,
    created_by uuid,
    processed_by uuid,
    CONSTRAINT valid_batch_status CHECK (((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('LOCKED'::character varying)::text, ('PROCESSING'::character varying)::text, ('SETTLED'::character varying)::text, ('FAILED'::character varying)::text, ('CANCELLED'::character varying)::text])))
);


--
-- Name: permission_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_cache (
    id integer NOT NULL,
    cache_key character varying(255) NOT NULL,
    cache_value jsonb NOT NULL,
    user_id integer,
    tenant_id uuid,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE permission_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permission_cache IS 'Database fallback for Redis permission cache';


--
-- Name: permission_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permission_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permission_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permission_cache_id_seq OWNED BY public.permission_cache.id;


--
-- Name: permission_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_keys (
    permission_key text NOT NULL,
    module text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: personal_user_dictionary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_user_dictionary (
    id integer NOT NULL,
    user_id integer NOT NULL,
    term character varying(100) NOT NULL,
    meaning character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    replacement character varying(100),
    owner_type character varying(20) DEFAULT 'user'::character varying,
    owner_id integer,
    ignore_spellcheck boolean DEFAULT false
);


--
-- Name: personal_user_dictionary_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personal_user_dictionary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personal_user_dictionary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_user_dictionary_id_seq OWNED BY public.personal_user_dictionary.id;


--
-- Name: plan_change_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_change_audit_log (
    id integer NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id character varying(100) NOT NULL,
    target_name character varying(200),
    action character varying(50) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    change_summary text,
    changed_by integer NOT NULL,
    changed_by_email character varying(255),
    changed_by_name character varying(200),
    ip_address inet,
    user_agent text,
    reason text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_change_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_change_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_change_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_change_audit_log_id_seq OWNED BY public.plan_change_audit_log.id;


--
-- Name: plan_feature_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_feature_controls (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    feature_code character varying(100) NOT NULL,
    free_limit integer DEFAULT 0 NOT NULL,
    limit_period public.limit_period_type DEFAULT 'monthly'::public.limit_period_type NOT NULL,
    unlock_price numeric(12,2) DEFAULT 0 NOT NULL,
    unlock_unit character varying(50) DEFAULT 'per month'::character varying,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    approval_threshold numeric(15,2),
    requires_approval boolean DEFAULT false NOT NULL,
    lock_mode public.lock_mode_type DEFAULT 'none'::public.lock_mode_type NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    show_in_pricing boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_feature_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_feature_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_feature_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_feature_controls_id_seq OWNED BY public.plan_feature_controls.id;


--
-- Name: preprocessing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preprocessing_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value jsonb NOT NULL,
    description character varying(500),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: preprocessing_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.preprocessing_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: preprocessing_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.preprocessing_settings_id_seq OWNED BY public.preprocessing_settings.id;


--
-- Name: preprocessor_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preprocessor_audit (
    id integer NOT NULL,
    user_id integer,
    original_text text NOT NULL,
    normalized_text text,
    corrected_text text,
    corrections jsonb DEFAULT '[]'::jsonb,
    protected_spans jsonb DEFAULT '[]'::jsonb,
    processing_time_ms integer,
    accepted_corrections jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rephrased_text text,
    was_autocorrected boolean DEFAULT false,
    role character varying(50),
    language_detected character varying(10) DEFAULT 'en'::character varying,
    rephrase_options jsonb
);


--
-- Name: preprocessor_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.preprocessor_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: preprocessor_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.preprocessor_audit_id_seq OWNED BY public.preprocessor_audit.id;


--
-- Name: protected_spans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.protected_spans (
    id integer NOT NULL,
    pattern character varying(500) NOT NULL,
    pattern_type character varying(50) NOT NULL,
    description character varying(200),
    priority integer DEFAULT 100,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: protected_spans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.protected_spans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: protected_spans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.protected_spans_id_seq OWNED BY public.protected_spans.id;


--
-- Name: qa_issue_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qa_issue_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qa_issue_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_issue_comments (
    id bigint NOT NULL,
    issue_id bigint NOT NULL,
    author_id bigint,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false
);


--
-- Name: qa_issue_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qa_issue_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qa_issue_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qa_issue_comments_id_seq OWNED BY public.qa_issue_comments.id;


--
-- Name: qa_issue_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_issue_history (
    id bigint NOT NULL,
    issue_id bigint NOT NULL,
    changed_by bigint,
    changed_at timestamp with time zone DEFAULT now(),
    field_name character varying(50) NOT NULL,
    old_value text,
    new_value text,
    comment text
);


--
-- Name: qa_issue_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qa_issue_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qa_issue_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qa_issue_history_id_seq OWNED BY public.qa_issue_history.id;


--
-- Name: qa_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_issues (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    issue_code character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    steps_to_reproduce text,
    expected_behavior text,
    actual_behavior text,
    module character varying(100),
    severity character varying(20) DEFAULT 'medium'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    issue_type character varying(30) DEFAULT 'bug'::character varying,
    status character varying(30) DEFAULT 'open'::character varying,
    related_task_id bigint,
    opened_by bigint,
    assigned_to bigint,
    environment text,
    browser character varying(100),
    os character varying(100),
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    CONSTRAINT valid_issue_priority CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT valid_issue_status CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('in_progress'::character varying)::text, ('resolved'::character varying)::text, ('closed'::character varying)::text, ('reopened'::character varying)::text, ('wont_fix'::character varying)::text, ('duplicate'::character varying)::text]))),
    CONSTRAINT valid_issue_type CHECK (((issue_type)::text = ANY (ARRAY[('bug'::character varying)::text, ('enhancement'::character varying)::text, ('task'::character varying)::text, ('question'::character varying)::text, ('documentation'::character varying)::text]))),
    CONSTRAINT valid_severity CHECK (((severity)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('critical'::character varying)::text])))
);


--
-- Name: qa_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qa_issues_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qa_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qa_issues_id_seq OWNED BY public.qa_issues.id;


--
-- Name: qa_test_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_test_tasks (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    module character varying(100),
    test_type character varying(50) DEFAULT 'manual'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(30) DEFAULT 'pending'::character varying,
    assigned_to bigint,
    due_date date,
    test_steps text,
    expected_result text,
    actual_result text,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT valid_priority CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT valid_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('passed'::character varying)::text, ('failed'::character varying)::text, ('blocked'::character varying)::text, ('skipped'::character varying)::text]))),
    CONSTRAINT valid_test_type CHECK (((test_type)::text = ANY (ARRAY[('manual'::character varying)::text, ('automated'::character varying)::text, ('regression'::character varying)::text, ('smoke'::character varying)::text, ('integration'::character varying)::text])))
);


--
-- Name: qa_test_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qa_test_tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qa_test_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qa_test_tasks_id_seq OWNED BY public.qa_test_tasks.id;


--
-- Name: rate_limit_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_violations (
    id integer NOT NULL,
    ip_address character varying(45) NOT NULL,
    endpoint character varying(255) NOT NULL,
    user_agent text,
    violation_type character varying(50) DEFAULT 'UNKNOWN'::character varying NOT NULL,
    "timestamp" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    country_code character varying(2),
    user_id integer,
    request_method character varying(10),
    response_status integer DEFAULT 429 NOT NULL
);


--
-- Name: rate_limit_violations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rate_limit_violations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_limit_violations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rate_limit_violations_id_seq OWNED BY public.rate_limit_violations.id;


--
-- Name: rbac_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rbac_actions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    display_name character varying(100),
    is_active boolean DEFAULT true
);


--
-- Name: rbac_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rbac_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rbac_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rbac_actions_id_seq OWNED BY public.rbac_actions.id;


--
-- Name: rbac_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rbac_permissions (
    id integer NOT NULL,
    role_id integer,
    action_id integer,
    route_id integer,
    granted boolean DEFAULT false,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(200),
    display_name character varying(250),
    is_active boolean DEFAULT true
);


--
-- Name: rbac_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rbac_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rbac_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rbac_permissions_id_seq OWNED BY public.rbac_permissions.id;


--
-- Name: rbac_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rbac_roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    level integer DEFAULT 1,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    display_name character varying(150),
    status character varying(20) DEFAULT 'active'::character varying
);


--
-- Name: rbac_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rbac_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rbac_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rbac_roles_id_seq OWNED BY public.rbac_roles.id;


--
-- Name: rbac_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rbac_routes (
    id integer NOT NULL,
    path character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    method character varying(10) DEFAULT 'GET'::character varying,
    module character varying(50),
    is_protected boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    display_name character varying(200),
    is_active boolean DEFAULT true,
    is_menu_item boolean DEFAULT true,
    icon character varying(100),
    sort_order integer DEFAULT 0
);


--
-- Name: rbac_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rbac_routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rbac_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rbac_routes_id_seq OWNED BY public.rbac_routes.id;


--
-- Name: rbac_user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rbac_user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    page_key character varying(255) NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: rbac_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rbac_user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rbac_user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rbac_user_permissions_id_seq OWNED BY public.rbac_user_permissions.id;


--
-- Name: rbac_user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rbac_user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer,
    assigned_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by integer,
    is_active boolean DEFAULT true,
    expires_at timestamp(6) without time zone
);


--
-- Name: rbac_user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rbac_user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rbac_user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rbac_user_roles_id_seq OWNED BY public.rbac_user_roles.id;


--
-- Name: recent_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recent_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    username character varying(255),
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    details jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: reconciliation_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_audit_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    action_category character varying(50),
    old_values jsonb,
    new_values jsonb,
    batch_id uuid,
    bank_line_id uuid,
    actor_id uuid NOT NULL,
    actor_role character varying(100),
    actor_ip character varying(45),
    actor_user_agent text,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sensitive_action_requires_reason CHECK ((((action)::text <> ALL (ARRAY[('MANUAL_MATCH'::character varying)::text, ('FORCE_FINALIZE'::character varying)::text, ('OVERRIDE_EXCEPTION'::character varying)::text])) OR (reason IS NOT NULL)))
);


--
-- Name: reconciliation_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    statement_id uuid NOT NULL,
    batch_number character varying(50) NOT NULL,
    description text,
    recon_period_start date NOT NULL,
    recon_period_end date NOT NULL,
    total_lines integer DEFAULT 0,
    matched_lines integer DEFAULT 0,
    unmatched_lines integer DEFAULT 0,
    exception_lines integer DEFAULT 0,
    total_credits numeric(18,4) DEFAULT 0,
    total_debits numeric(18,4) DEFAULT 0,
    matched_amount numeric(18,4) DEFAULT 0,
    unmatched_amount numeric(18,4) DEFAULT 0,
    status public.recon_batch_status DEFAULT 'DRAFT'::public.recon_batch_status,
    auto_match_completed_at timestamp with time zone,
    review_started_at timestamp with time zone,
    finalized_at timestamp with time zone,
    finalized_by uuid,
    finalization_notes text,
    version integer DEFAULT 1,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reconciliation_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_exceptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    batch_id uuid NOT NULL,
    bank_line_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    exception_type public.recon_exception_type NOT NULL,
    description text NOT NULL,
    severity character varying(20) DEFAULT 'MEDIUM'::character varying,
    suggested_action text,
    is_resolved boolean DEFAULT false,
    resolution_notes text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reconciliation_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_matches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    batch_id uuid NOT NULL,
    bank_line_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    matched_entity_type character varying(50) NOT NULL,
    matched_entity_id uuid NOT NULL,
    match_type public.recon_match_type NOT NULL,
    confidence integer DEFAULT 0 NOT NULL,
    bank_amount numeric(18,4) NOT NULL,
    erp_amount numeric(18,4) NOT NULL,
    amount_difference numeric(18,4) GENERATED ALWAYS AS ((bank_amount - erp_amount)) STORED,
    bank_date date NOT NULL,
    erp_date date,
    bank_utr character varying(50),
    erp_utr character varying(50),
    manual_reason text,
    manual_matched_by uuid,
    manual_matched_at timestamp with time zone,
    is_confirmed boolean DEFAULT false,
    confirmed_by uuid,
    confirmed_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT manual_requires_reason CHECK (((match_type <> 'MANUAL'::public.recon_match_type) OR (manual_reason IS NOT NULL))),
    CONSTRAINT valid_match_confidence CHECK (((confidence >= 0) AND (confidence <= 100)))
);


--
-- Name: rent_contract_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rent_contract_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    property_type character varying(50) NOT NULL,
    property_address text NOT NULL,
    property_area_sqft numeric(12,2),
    maintenance_charges numeric(15,2) DEFAULT 0 NOT NULL,
    electricity_included boolean DEFAULT false NOT NULL,
    water_included boolean DEFAULT false NOT NULL,
    registration_number character varying(100),
    stamp_duty_paid numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: resource_consumption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_consumption (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    total_users integer DEFAULT 0 NOT NULL,
    active_users_30d integer DEFAULT 0 NOT NULL,
    total_branches integer DEFAULT 0 NOT NULL,
    tasks_created integer DEFAULT 0 NOT NULL,
    payments_processed numeric(15,2) DEFAULT 0 NOT NULL,
    reports_generated integer DEFAULT 0 NOT NULL,
    reconciliations_run integer DEFAULT 0 NOT NULL,
    db_storage_bytes bigint DEFAULT 0 NOT NULL,
    file_storage_bytes bigint DEFAULT 0 NOT NULL,
    api_calls_made integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resource_consumption_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resource_consumption_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: resource_consumption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resource_consumption_id_seq OWNED BY public.resource_consumption.id;


--
-- Name: review_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_audit (
    id integer NOT NULL,
    review_id uuid NOT NULL,
    actor_id integer NOT NULL,
    action character varying(50) NOT NULL,
    old_status character varying(50),
    new_status character varying(50),
    comment text,
    metadata jsonb DEFAULT '{}'::jsonb,
    tenant_id character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: review_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.review_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: review_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.review_audit_id_seq OWNED BY public.review_audit.id;


--
-- Name: review_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    author_id integer NOT NULL,
    content text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    parent_id uuid,
    tenant_id character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: scheduled_payables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_payables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    contract_id uuid NOT NULL,
    due_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    tax_amount numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    description character varying(500),
    period_start date,
    period_end date,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    posted_at timestamp(6) with time zone,
    posted_by integer,
    journal_entry_id uuid,
    paid_at timestamp(6) with time zone,
    paid_by integer,
    payment_reference character varying(100),
    payment_journal_id uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(50) NOT NULL,
    name character varying(255),
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id bigint NOT NULL,
    event_type character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'INFO'::character varying NOT NULL,
    service_name character varying(100),
    user_id integer,
    user_email character varying(255),
    user_type character varying(50),
    tenant_id uuid,
    ip_address inet,
    user_agent text,
    request_path text,
    request_method character varying(10),
    request_id uuid,
    event_details jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE security_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.security_events IS 'Security-relevant events for threat detection and compliance';


--
-- Name: security_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: security_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;


--
-- Name: settlement_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    settlement_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    previous_status character varying(50),
    new_status character varying(50),
    performed_by uuid NOT NULL,
    performed_at timestamp without time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    changes jsonb DEFAULT '{}'::jsonb,
    notes text
);


--
-- Name: settlement_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    settlement_id uuid NOT NULL,
    payment_request_id character varying(255) NOT NULL,
    requested_amount numeric(18,2) NOT NULL,
    approved_amount numeric(18,2) NOT NULL,
    partial_payment_amount numeric(18,2),
    is_partial boolean DEFAULT false,
    partial_sequence integer DEFAULT 1,
    beneficiary_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    settlement_number character varying(50) NOT NULL,
    purpose text NOT NULL,
    beneficiary_name character varying(255),
    beneficiary_bank character varying(255),
    beneficiary_account_masked character varying(50),
    beneficiary_account_full character varying(100),
    beneficiary_ifsc character varying(20),
    total_amount numeric(18,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying,
    request_count integer DEFAULT 0,
    vendor_count integer DEFAULT 0,
    status character varying(50) DEFAULT 'DRAFT'::character varying,
    current_stage character varying(50) DEFAULT 'ACCOUNTANT_DRAFT'::character varying,
    current_approver_id uuid,
    utr_number character varying(100),
    bank_transaction_id character varying(100),
    bank_reference character varying(100),
    payment_mode character varying(50),
    bank_account_id uuid,
    settlement_date date,
    due_date date,
    paid_at timestamp without time zone,
    accountant_remarks text,
    finance_remarks text,
    cfo_remarks text,
    banker_remarks text,
    attachments jsonb DEFAULT '[]'::jsonb,
    tenant_id uuid,
    created_by uuid NOT NULL,
    submitted_by uuid,
    submitted_at timestamp without time zone,
    finance_approved_by uuid,
    finance_approved_at timestamp without time zone,
    cfo_approved_by uuid,
    cfo_approved_at timestamp without time zone,
    sent_to_bank_by uuid,
    sent_to_bank_at timestamp without time zone,
    executed_by uuid,
    executed_at timestamp without time zone,
    rejected_by uuid,
    rejected_at timestamp without time zone,
    rejection_reason text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: spelling_dictionary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spelling_dictionary (
    id integer NOT NULL,
    term character varying(100) NOT NULL,
    aliases text[] DEFAULT '{}'::text[],
    category character varying(50),
    preferred_display character varying(100),
    is_protected boolean DEFAULT false,
    case_sensitive boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: spelling_dictionary_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spelling_dictionary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spelling_dictionary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spelling_dictionary_id_seq OWNED BY public.spelling_dictionary.id;


--
-- Name: subscription_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_audit_log (
    id integer NOT NULL,
    client_id uuid,
    subscription_id integer,
    action character varying(100) NOT NULL,
    action_category character varying(50),
    old_values jsonb,
    new_values jsonb,
    reason text,
    ip_address inet,
    user_agent text,
    actor_type character varying(20) NOT NULL,
    actor_id integer,
    actor_email character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscription_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_audit_log_id_seq OWNED BY public.subscription_audit_log.id;


--
-- Name: subscription_billing_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_billing_ledger (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    source_type public.billing_source_type NOT NULL,
    reference_id character varying(100),
    reference_name character varying(200),
    amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    billing_period_start timestamp with time zone NOT NULL,
    billing_period_end timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    invoice_id integer,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer
);


--
-- Name: subscription_billing_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_billing_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_billing_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_billing_ledger_id_seq OWNED BY public.subscription_billing_ledger.id;


--
-- Name: subscription_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_invoices (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    subscription_id integer,
    invoice_number character varying(50) NOT NULL,
    invoice_date timestamp with time zone NOT NULL,
    due_date timestamp with time zone NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT 0,
    tax numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    paid_at timestamp with time zone,
    stripe_invoice_id character varying(100),
    payment_method character varying(50),
    pdf_url text,
    line_items jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscription_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_invoices_id_seq OWNED BY public.subscription_invoices.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    plan_code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    short_description character varying(255),
    badge_text character varying(50),
    price_monthly numeric(12,2) DEFAULT 0 NOT NULL,
    price_yearly numeric(12,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    max_users integer DEFAULT 5 NOT NULL,
    max_storage_gb integer DEFAULT 5 NOT NULL,
    max_branches integer DEFAULT 1 NOT NULL,
    max_api_calls_day integer DEFAULT 0 NOT NULL,
    feature_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_popular boolean DEFAULT false,
    is_enterprise boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_public boolean DEFAULT true,
    cta_text character varying(100) DEFAULT 'Get Started'::character varying,
    cta_action character varying(50) DEFAULT 'subscribe'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer,
    updated_by integer
);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: super_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admins (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    "productType" character varying(50) NOT NULL,
    profile_pic_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    CONSTRAINT chk_super_admins_password_hash_not_empty CHECK (((password_hash IS NOT NULL) AND (length((password_hash)::text) >= 60)))
);


--
-- Name: TABLE super_admins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.super_admins IS 'Business owner accounts. Passwords stored as hashes.';


--
-- Name: COLUMN super_admins.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.super_admins.password_hash IS 'Bcrypt/Argon2 hashed password. Never store plaintext.';


--
-- Name: super_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.super_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: super_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.super_admins_id_seq OWNED BY public.super_admins.id;


--
-- Name: support_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_sessions (
    id integer NOT NULL,
    support_user_id uuid NOT NULL,
    target_client_id uuid NOT NULL,
    reason text NOT NULL,
    session_token character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    ip_address inet,
    user_agent text,
    actions_performed integer DEFAULT 0
);


--
-- Name: support_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_sessions_id_seq OWNED BY public.support_sessions.id;


--
-- Name: support_ticket_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_comments (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    author_name character varying(200) NOT NULL,
    author_email character varying(255),
    author_type character varying(30) NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    attachments jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: support_ticket_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_ticket_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_ticket_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_ticket_comments_id_seq OWNED BY public.support_ticket_comments.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    ticket_number character varying(20) NOT NULL,
    subject character varying(255) NOT NULL,
    description text NOT NULL,
    client_id uuid,
    organization character varying(200),
    user_name character varying(200),
    user_email character varying(255),
    user_role character varying(50),
    user_phone character varying(50),
    status character varying(30) DEFAULT 'new'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    category character varying(50),
    assigned_to integer,
    assigned_name character varying(200),
    first_response_at timestamp(6) with time zone,
    resolved_at timestamp(6) with time zone,
    closed_at timestamp(6) with time zone,
    sla_breached boolean DEFAULT false NOT NULL,
    response_time integer,
    resolution_time integer,
    tags jsonb,
    custom_fields jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: system_health_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_health_config (
    id integer NOT NULL,
    thresholds jsonb NOT NULL,
    "backupLocation" character varying(255) NOT NULL,
    "refreshInterval" integer DEFAULT 30000 NOT NULL,
    "metricsRetentionDays" integer DEFAULT 7 NOT NULL,
    "aggregateRetentionDays" integer DEFAULT 365 NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: system_health_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_health_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_health_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_health_config_id_seq OWNED BY public.system_health_config.id;


--
-- Name: system_health_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_health_metrics (
    id integer NOT NULL,
    metric_type character varying(50) NOT NULL,
    metric_name character varying(100) NOT NULL,
    metric_value numeric(20,4) NOT NULL,
    metric_unit character varying(30),
    tags jsonb,
    recorded_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: system_health_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_health_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_health_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_health_metrics_id_seq OWNED BY public.system_health_metrics.id;


--
-- Name: system_metric_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_metric_daily (
    id integer NOT NULL,
    day timestamp(3) without time zone NOT NULL,
    "avgLatencyMs" integer NOT NULL,
    "avgErrorRatePct" double precision NOT NULL,
    "reqCount" integer NOT NULL,
    "errCount" integer NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: system_metric_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_metric_daily_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_metric_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_metric_daily_id_seq OWNED BY public.system_metric_daily.id;


--
-- Name: system_metric_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_metric_samples (
    id integer NOT NULL,
    "latencyMs" integer NOT NULL,
    "errorRatePct" double precision NOT NULL,
    "reqCount" integer DEFAULT 0 NOT NULL,
    "errCount" integer DEFAULT 0 NOT NULL,
    collected_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: system_metric_samples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_metric_samples_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_metric_samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_metric_samples_id_seq OWNED BY public.system_metric_samples.id;


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attachments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    tenant_id uuid,
    message_id integer,
    filename character varying(500) NOT NULL,
    original_name character varying(500),
    file_url text NOT NULL,
    file_type character varying(100),
    file_size bigint,
    mime_type character varying(100),
    storage_provider character varying(50) DEFAULT 'LOCAL'::character varying,
    storage_key text,
    uploaded_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_attachments_id_seq OWNED BY public.task_attachments.id;


--
-- Name: task_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_audit (
    id integer NOT NULL,
    task_id integer NOT NULL,
    actor_id integer NOT NULL,
    actor_name character varying(255),
    actor_role character varying(100),
    action character varying(50) NOT NULL,
    from_status character varying(50),
    to_status character varying(50),
    reason text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid
);


--
-- Name: task_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_audit_id_seq OWNED BY public.task_audit.id;


--
-- Name: task_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_audit_logs (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id character varying(100) NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_audit_logs_id_seq OWNED BY public.task_audit_logs.id;


--
-- Name: task_clarifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_clarifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id integer NOT NULL,
    tenant_id uuid,
    requester_id integer NOT NULL,
    requester_name character varying(255),
    requester_department character varying(100),
    responder_id integer,
    responder_department_id character varying(100),
    responder_name character varying(255),
    responder_type character varying(255) DEFAULT 'user'::character varying NOT NULL,
    question text NOT NULL,
    attachments jsonb,
    response text,
    response_attachments jsonb,
    responded_by_id integer,
    responded_by_name character varying(255),
    responded_at timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    pause_sla boolean DEFAULT true,
    sla_paused_at timestamp with time zone,
    sla_resumed_at timestamp with time zone,
    sla_paused_hours integer,
    expiry_hours integer DEFAULT 48,
    expires_at timestamp with time zone,
    previous_task_status character varying(50),
    previous_task_state jsonb,
    urgency character varying(20) DEFAULT 'normal'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_label_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_label_assignments (
    task_id integer NOT NULL,
    label_id integer NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_labels (
    id integer NOT NULL,
    tenant_id uuid,
    name character varying(50) NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_labels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_labels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_labels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_labels_id_seq OWNED BY public.task_labels.id;


--
-- Name: task_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_messages (
    id integer NOT NULL,
    task_id integer NOT NULL,
    tenant_id uuid,
    sender_id integer NOT NULL,
    content text NOT NULL,
    message_type character varying(50) DEFAULT 'TEXT'::character varying,
    is_system_message boolean DEFAULT false,
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    read_by integer[] DEFAULT '{}'::integer[],
    reply_to_id integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_task_message_type CHECK (((message_type)::text = ANY ((ARRAY['TEXT'::character varying, 'SYSTEM'::character varying, 'STATUS_CHANGE'::character varying, 'ASSIGNEE_CHANGE'::character varying, 'APPROVAL'::character varying, 'MENTION'::character varying, 'AI_RESPONSE'::character varying])::text[])))
);


--
-- Name: task_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_messages_id_seq OWNED BY public.task_messages.id;


--
-- Name: task_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_participants (
    id integer NOT NULL,
    task_id integer NOT NULL,
    tenant_id uuid,
    user_id integer NOT NULL,
    role character varying(50) DEFAULT 'VIEWER'::character varying,
    can_edit boolean DEFAULT false,
    can_comment boolean DEFAULT true,
    can_approve boolean DEFAULT false,
    added_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_participant_role CHECK (((role)::text = ANY ((ARRAY['VIEWER'::character varying, 'COLLABORATOR'::character varying, 'REVIEWER'::character varying, 'APPROVER'::character varying])::text[])))
);


--
-- Name: task_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_participants_id_seq OWNED BY public.task_participants.id;


--
-- Name: task_request_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_request_history (
    id integer NOT NULL,
    request_id integer NOT NULL,
    actor_id uuid NOT NULL,
    actor_role_level integer,
    actor_role_name character varying(100),
    action character varying(100) NOT NULL,
    action_category character varying(50),
    previous_status character varying(50),
    new_status character varying(50),
    field_changed character varying(100),
    old_value text,
    new_value text,
    reason text,
    ip_address character varying(45),
    user_agent text,
    session_id character varying(255),
    tenant_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_request_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_request_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_request_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_request_history_id_seq OWNED BY public.task_request_history.id;


--
-- Name: task_request_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_request_messages (
    id integer NOT NULL,
    request_id integer NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    message_type character varying(50) DEFAULT 'TEXT'::character varying,
    is_system_message boolean DEFAULT false,
    is_clarification_request boolean DEFAULT false,
    is_clarification_response boolean DEFAULT false,
    attachment_ids integer[] DEFAULT '{}'::integer[],
    read_by uuid[] DEFAULT '{}'::uuid[],
    tenant_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_request_message_type CHECK (((message_type)::text = ANY (ARRAY[('TEXT'::character varying)::text, ('SYSTEM'::character varying)::text, ('CLARIFICATION_REQUEST'::character varying)::text, ('CLARIFICATION_RESPONSE'::character varying)::text, ('STATUS_CHANGE'::character varying)::text, ('DELEGATION_NOTICE'::character varying)::text, ('REJECTION_NOTICE'::character varying)::text])))
);


--
-- Name: task_request_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_request_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_request_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_request_messages_id_seq OWNED BY public.task_request_messages.id;


--
-- Name: task_request_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_request_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_requests (
    id integer NOT NULL,
    request_number character varying(20) NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    priority character varying(20) DEFAULT 'MEDIUM'::character varying,
    suggested_due_date timestamp without time zone,
    requested_by uuid NOT NULL,
    requested_to uuid NOT NULL,
    requester_role_level integer NOT NULL,
    requester_role_name character varying(100),
    target_role_level integer NOT NULL,
    target_role_name character varying(100),
    status character varying(50) DEFAULT 'REQUESTED'::character varying NOT NULL,
    resolved_at timestamp without time zone,
    resolved_by uuid,
    resolution_action character varying(50),
    resolution_reason text,
    converted_task_id integer,
    delegated_to uuid,
    deferred_until timestamp without time zone,
    clarification_count integer DEFAULT 0,
    last_clarification_at timestamp without time zone,
    watcher_ids uuid[] DEFAULT '{}'::uuid[],
    tags text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    tenant_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_hierarchy_valid CHECK ((requester_role_level < target_role_level)),
    CONSTRAINT chk_request_priority CHECK (((priority)::text = ANY (ARRAY[('LOW'::character varying)::text, ('MEDIUM'::character varying)::text, ('HIGH'::character varying)::text, ('URGENT'::character varying)::text, ('CRITICAL'::character varying)::text]))),
    CONSTRAINT chk_request_status CHECK (((status)::text = ANY (ARRAY[('REQUESTED'::character varying)::text, ('NEED_INFO'::character varying)::text, ('DEFERRED'::character varying)::text, ('ACCEPTED'::character varying)::text, ('DELEGATED'::character varying)::text, ('REJECTED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
    CONSTRAINT chk_resolution_action CHECK (((resolution_action IS NULL) OR ((resolution_action)::text = ANY (ARRAY[('ACCEPTED'::character varying)::text, ('DELEGATED'::character varying)::text, ('REJECTED'::character varying)::text, ('DEFERRED'::character varying)::text, ('NEED_INFO'::character varying)::text, ('CANCELLED'::character varying)::text]))))
);


--
-- Name: task_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_requests_id_seq OWNED BY public.task_requests.id;


--
-- Name: task_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id integer NOT NULL,
    sender_id integer NOT NULL,
    reviewer_id integer,
    reviewer_department_id character varying(50),
    purpose public.review_purpose DEFAULT 'FYI'::public.review_purpose NOT NULL,
    note text,
    attachments jsonb DEFAULT '[]'::jsonb,
    status public.review_status DEFAULT 'PENDING'::public.review_status NOT NULL,
    acknowledgment_note text,
    acknowledged_at timestamp with time zone,
    acknowledged_by integer,
    expiry_days integer,
    expires_at timestamp with time zone,
    priority character varying(20) DEFAULT 'normal'::character varying,
    tenant_id character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_time_entries (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    hours numeric(10,2) NOT NULL,
    description text,
    entry_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_time_entries_id_seq OWNED BY public.task_time_entries.id;


--
-- Name: task_watchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_watchers (
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_feature_unlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_feature_unlocks (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    feature_key character varying(100) NOT NULL,
    status public.unlock_status DEFAULT 'LOCKED'::public.unlock_status NOT NULL,
    price_per_month numeric(10,2) DEFAULT 100.00 NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    auto_renew boolean DEFAULT true NOT NULL,
    renewal_reminder_sent boolean DEFAULT false NOT NULL,
    billing_start_date timestamp with time zone,
    next_billing_date timestamp with time zone,
    last_billed_date timestamp with time zone,
    is_override boolean DEFAULT false NOT NULL,
    override_reason text,
    override_by integer,
    override_expires_at timestamp with time zone,
    unlocked_by integer NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
    disabled_at timestamp with time zone,
    disabled_by integer,
    disable_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenant_feature_unlocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_feature_unlocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_feature_unlocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_feature_unlocks_id_seq OWNED BY public.tenant_feature_unlocks.id;


--
-- Name: tenant_plan_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_plan_assignments (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id integer NOT NULL,
    custom_overrides jsonb DEFAULT '{}'::jsonb,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    billing_day integer DEFAULT 1 NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    previous_plan_id integer,
    changed_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer
);


--
-- Name: tenant_plan_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_plan_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_plan_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_plan_assignments_id_seq OWNED BY public.tenant_plan_assignments.id;


--
-- Name: tenant_quota_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_quota_overrides (
    id integer NOT NULL,
    tenant_id character varying(50) NOT NULL,
    api_calls_per_minute integer,
    api_calls_per_day integer,
    storage_limit_bytes bigint,
    reason text,
    approved_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tenant_quota_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_quota_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_quota_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_quota_overrides_id_seq OWNED BY public.tenant_quota_overrides.id;


--
-- Name: tenant_spend_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_spend_limits (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    monthly_cap_amount numeric(12,2) DEFAULT 5000.00 NOT NULL,
    current_month_spend numeric(12,2) DEFAULT 0.00 NOT NULL,
    billing_month character varying(7) NOT NULL,
    alert_threshold_pct integer DEFAULT 80 NOT NULL,
    alert_sent_at timestamp with time zone,
    cap_reached_at timestamp with time zone,
    set_by integer,
    set_at timestamp with time zone DEFAULT now() NOT NULL,
    previous_cap numeric(12,2),
    cap_change_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenant_spend_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_spend_limits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_spend_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_spend_limits_id_seq OWNED BY public.tenant_spend_limits.id;


--
-- Name: tenant_subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_subscription (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id integer,
    billing_cycle character varying(20) DEFAULT 'MONTHLY'::character varying NOT NULL,
    billing_day integer DEFAULT 1 NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    payment_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    last_payment_date timestamp with time zone,
    next_payment_date timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer
);


--
-- Name: tenant_subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_subscription_id_seq OWNED BY public.tenant_subscription.id;


--
-- Name: tenant_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_usage (
    id integer NOT NULL,
    tenant_id character varying(50) NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    api_calls integer DEFAULT 0 NOT NULL,
    storage_bytes bigint DEFAULT 0 NOT NULL,
    active_users integer DEFAULT 0 NOT NULL,
    feature_usage jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tenant_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_usage_id_seq OWNED BY public.tenant_usage.id;


--
-- Name: tenant_usage_monthly; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.tenant_usage_monthly AS
 SELECT tenant_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    sum(api_calls) AS total_api_calls,
    max(storage_bytes) AS max_storage_bytes,
    avg(active_users) AS avg_active_users,
    count(*) AS days_active
   FROM public.tenant_usage
  GROUP BY tenant_id, (date_trunc('month'::text, (date)::timestamp with time zone));


--
-- Name: thread_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_members (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "userId" integer NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    "joinedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leftAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: thread_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp(6) without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(6) without time zone,
    "readBy" jsonb,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: thread_messages_partitioned; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_partitioned (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE ("createdAt");


--
-- Name: thread_messages_p2025_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2025_09 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2025_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2025_10 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2025_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2025_11 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2025_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2025_12 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_01 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_02 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_03 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_04 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_05 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_06 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_07 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_08 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_09 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_10 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p2026_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p2026_11 (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_messages_p_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages_p_default (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    attachments jsonb,
    "replyToId" text,
    reactions jsonb,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone,
    "readBy" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threads (
    id text NOT NULL,
    title character varying(200),
    "createdById" integer NOT NULL,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usage_block_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_block_log (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    user_id integer NOT NULL,
    feature_key character varying(100) NOT NULL,
    usage_count_at_block integer NOT NULL,
    usage_limit integer NOT NULL,
    blocked_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolution_type character varying(30),
    block_date date DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: usage_block_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usage_block_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usage_block_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usage_block_log_id_seq OWNED BY public.usage_block_log.id;


--
-- Name: usage_counters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usage_counters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usage_counters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usage_counters_id_seq OWNED BY public.usage_counters.id;


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    achievement_date date NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: user_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_achievements_id_seq OWNED BY public.user_achievements.id;


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_addresses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type public."AddressType" NOT NULL,
    line1 character varying(255) NOT NULL,
    line2 character varying(255),
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    postal_code character varying(20) NOT NULL,
    country character varying(100) DEFAULT 'India'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: user_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_addresses_id_seq OWNED BY public.user_addresses.id;


--
-- Name: user_bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_bank_accounts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    account_holder_name character varying(255) NOT NULL,
    bank_name character varying(255) NOT NULL,
    branch_name character varying(255) NOT NULL,
    account_number character varying(50) NOT NULL,
    ifsc_code character varying(20) NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    cancelled_cheque_document_url text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    account_number_encrypted bytea,
    account_number_iv bytea,
    account_number_last4 character varying(4),
    encryption_version integer DEFAULT 1
);


--
-- Name: TABLE user_bank_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_bank_accounts IS 'Bank accounts. Account numbers encrypted at rest.';


--
-- Name: COLUMN user_bank_accounts.account_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bank_accounts.account_number IS 'DEPRECATED: Use account_number_encrypted. Will be removed.';


--
-- Name: COLUMN user_bank_accounts.account_number_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bank_accounts.account_number_encrypted IS 'AES-256-GCM encrypted account number';


--
-- Name: COLUMN user_bank_accounts.account_number_iv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bank_accounts.account_number_iv IS 'Initialization vector for encryption';


--
-- Name: COLUMN user_bank_accounts.account_number_last4; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bank_accounts.account_number_last4 IS 'Last 4 digits for display';


--
-- Name: COLUMN user_bank_accounts.encryption_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bank_accounts.encryption_version IS 'Encryption algorithm version';


--
-- Name: user_bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_bank_accounts_id_seq OWNED BY public.user_bank_accounts.id;


--
-- Name: user_branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_branches (
    id integer NOT NULL,
    user_id integer NOT NULL,
    branch_id integer NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: user_branches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_branches_id_seq OWNED BY public.user_branches.id;


--
-- Name: user_education; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_education (
    id integer NOT NULL,
    user_id integer NOT NULL,
    degree character varying(255) NOT NULL,
    institution_name character varying(255) NOT NULL,
    year_of_passing integer NOT NULL,
    grade_or_percentage character varying(50) NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: user_education_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_education_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_education_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_education_id_seq OWNED BY public.user_education.id;


--
-- Name: user_emergency_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_emergency_contacts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    relationship character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    alternate_phone character varying(20),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: user_emergency_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_emergency_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_emergency_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_emergency_contacts_id_seq OWNED BY public.user_emergency_contacts.id;


--
-- Name: user_kyc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_kyc (
    id integer NOT NULL,
    user_id integer NOT NULL,
    pan_number character varying(20),
    aadhaar_number character varying(20),
    kyc_status public."KYCStatus" DEFAULT 'PENDING'::public."KYCStatus" NOT NULL,
    pan_document_url text,
    aadhaar_document_url text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    pan_encrypted bytea,
    pan_iv bytea,
    pan_last4 character varying(4),
    aadhaar_encrypted bytea,
    aadhaar_iv bytea,
    aadhaar_last4 character varying(4),
    encryption_version integer DEFAULT 1
);


--
-- Name: TABLE user_kyc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_kyc IS 'KYC documents. Sensitive data (PAN/Aadhaar) encrypted at rest.';


--
-- Name: COLUMN user_kyc.pan_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.pan_number IS 'DEPRECATED: Use pan_encrypted. Will be removed.';


--
-- Name: COLUMN user_kyc.aadhaar_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.aadhaar_number IS 'DEPRECATED: Use aadhaar_encrypted. Will be removed.';


--
-- Name: COLUMN user_kyc.pan_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.pan_encrypted IS 'AES-256-GCM encrypted PAN number';


--
-- Name: COLUMN user_kyc.pan_iv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.pan_iv IS 'Initialization vector for PAN encryption';


--
-- Name: COLUMN user_kyc.pan_last4; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.pan_last4 IS 'Last 4 characters for display/verification';


--
-- Name: COLUMN user_kyc.aadhaar_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.aadhaar_encrypted IS 'AES-256-GCM encrypted Aadhaar number';


--
-- Name: COLUMN user_kyc.aadhaar_iv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.aadhaar_iv IS 'Initialization vector for Aadhaar encryption';


--
-- Name: COLUMN user_kyc.aadhaar_last4; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.aadhaar_last4 IS 'Last 4 digits for display/verification';


--
-- Name: COLUMN user_kyc.encryption_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_kyc.encryption_version IS 'Encryption algorithm version for key rotation';


--
-- Name: user_kyc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_kyc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_kyc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_kyc_id_seq OWNED BY public.user_kyc.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    full_name character varying(255),
    employee_code character varying(50),
    phone character varying(20),
    alternate_phone character varying(20),
    date_of_birth date,
    gender public."Gender",
    blood_group character varying(10),
    profile_pic_url text,
    father_name character varying(255),
    mother_name character varying(255),
    marital_status public."MaritalStatus",
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_token character varying(255) NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(6) without time zone NOT NULL,
    last_activity_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    token_hash character varying(64),
    token_prefix character varying(8)
);


--
-- Name: TABLE user_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_sessions IS 'Active user sessions. Tokens stored as SHA-256 hashes.';


--
-- Name: COLUMN user_sessions.session_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_sessions.session_token IS 'DEPRECATED: Use token_hash for lookups. Will be removed.';


--
-- Name: COLUMN user_sessions.token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_sessions.token_hash IS 'SHA-256 hash of session token for lookup';


--
-- Name: COLUMN user_sessions.token_prefix; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_sessions.token_prefix IS 'First 8 chars of token for debugging (non-sensitive)';


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: user_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_skills (
    id integer NOT NULL,
    user_id integer NOT NULL,
    skill_name character varying(255) NOT NULL,
    proficiency_level public."ProficiencyLevel" NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: user_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_skills_id_seq OWNED BY public.user_skills.id;


--
-- Name: users_enhanced; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_enhanced (
    id uuid NOT NULL,
    legacy_id integer,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    salt character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(20),
    role_id uuid,
    legacy_role character varying(50),
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    phone_verified boolean DEFAULT false,
    last_login timestamp with time zone,
    login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    password_changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    profile_data jsonb DEFAULT '{}'::jsonb,
    preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid,
    super_admin_id integer,
    role character varying(100),
    product_type character varying(50) DEFAULT 'BUSINESS_ERP'::character varying,
    assigned_modules jsonb DEFAULT '[]'::jsonb,
    page_permissions jsonb DEFAULT '{}'::jsonb,
    profile_pic_url text,
    theme_preference character varying(50) DEFAULT 'bisman-default'::character varying,
    unique_id character varying(50),
    business_level integer DEFAULT 1,
    CONSTRAINT chk_users_email_format CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT chk_users_login_attempts CHECK (((login_attempts >= 0) AND (login_attempts <= 10))),
    CONSTRAINT chk_users_username_length CHECK (((length((username)::text) >= 3) AND (length((username)::text) <= 50)))
);


--
-- Name: users; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.users AS
 SELECT legacy_id AS id,
    username,
    email,
    password_hash,
    role,
    is_active,
    product_type AS "productType",
    tenant_id,
    super_admin_id,
    created_at,
    profile_pic_url,
    updated_at,
    assigned_modules AS "assignedModules",
    page_permissions AS "pagePermissions",
    theme_preference,
    id AS uuid_id,
    first_name,
    last_name,
    phone,
    email_verified,
    phone_verified,
    last_login,
    login_attempts,
    locked_until
   FROM public.users_enhanced;


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'Bcrypt/Argon2 hashed password. Never store plaintext.';


--
-- Name: users_legacy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_legacy_id_seq
    START WITH 100
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: v_audit_summary_24h; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_audit_summary_24h AS
 SELECT table_name,
    action,
    count(*) AS operation_count,
    count(DISTINCT user_id) AS unique_users,
    count(DISTINCT service_name) AS unique_services,
    min(created_at) AS first_at,
    max(created_at) AS last_at
   FROM public.audit_logs
  WHERE (created_at > (now() - '24:00:00'::interval))
  GROUP BY table_name, action
  ORDER BY (count(*)) DESC;


--
-- Name: v_entity_id_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_entity_id_summary AS
 SELECT entity_type,
    count(*) AS total_ids,
    min(created_at) AS first_created,
    max(created_at) AS last_created,
    date(max(created_at)) AS last_activity_date
   FROM public.entity_id_registry
  GROUP BY entity_type
  ORDER BY entity_type;


--
-- Name: v_pending_requests_inbox; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_pending_requests_inbox AS
 SELECT r.id,
    r.request_number,
    r.title,
    r.description,
    r.priority,
    r.suggested_due_date,
    r.requested_by,
    r.requested_to,
    r.requester_role_level,
    r.requester_role_name,
    r.target_role_level,
    r.target_role_name,
    r.status,
    r.resolved_at,
    r.resolved_by,
    r.resolution_action,
    r.resolution_reason,
    r.converted_task_id,
    r.delegated_to,
    r.deferred_until,
    r.clarification_count,
    r.last_clarification_at,
    r.watcher_ids,
    r.tags,
    r.metadata,
    r.tenant_id,
    r.created_at,
    r.updated_at,
    requester.username AS requester_name,
    requester.email AS requester_email,
    target.username AS target_name,
    target.email AS target_email,
    ( SELECT count(*) AS count
           FROM public.task_request_messages
          WHERE (task_request_messages.request_id = r.id)) AS message_count
   FROM ((public.task_requests r
     LEFT JOIN public.users requester ON ((r.requested_by = requester.uuid_id)))
     LEFT JOIN public.users target ON ((r.requested_to = target.uuid_id)))
  WHERE ((r.status)::text = ANY (ARRAY[('REQUESTED'::character varying)::text, ('NEED_INFO'::character varying)::text]))
  ORDER BY
        CASE r.priority
            WHEN 'CRITICAL'::text THEN 1
            WHEN 'URGENT'::text THEN 2
            WHEN 'HIGH'::text THEN 3
            WHEN 'MEDIUM'::text THEN 4
            ELSE 5
        END, r.created_at;


--
-- Name: v_security_events_24h; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_security_events_24h AS
 SELECT event_type,
    severity,
    count(*) AS event_count,
    count(DISTINCT user_id) AS unique_users,
    count(DISTINCT ip_address) AS unique_ips,
    max(created_at) AS last_occurred
   FROM public.security_events
  WHERE (created_at > (now() - '24:00:00'::interval))
  GROUP BY event_type, severity
  ORDER BY
        CASE severity
            WHEN 'CRITICAL'::text THEN 1
            WHEN 'ERROR'::text THEN 2
            WHEN 'WARNING'::text THEN 3
            ELSE 4
        END, (count(*)) DESC;


--
-- Name: v_sent_requests_outbox; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sent_requests_outbox AS
 SELECT r.id,
    r.request_number,
    r.title,
    r.description,
    r.priority,
    r.suggested_due_date,
    r.requested_by,
    r.requested_to,
    r.requester_role_level,
    r.requester_role_name,
    r.target_role_level,
    r.target_role_name,
    r.status,
    r.resolved_at,
    r.resolved_by,
    r.resolution_action,
    r.resolution_reason,
    r.converted_task_id,
    r.delegated_to,
    r.deferred_until,
    r.clarification_count,
    r.last_clarification_at,
    r.watcher_ids,
    r.tags,
    r.metadata,
    r.tenant_id,
    r.created_at,
    r.updated_at,
    requester.username AS requester_name,
    target.username AS target_name,
    ( SELECT count(*) AS count
           FROM public.task_request_messages
          WHERE (task_request_messages.request_id = r.id)) AS message_count
   FROM ((public.task_requests r
     LEFT JOIN public.users requester ON ((r.requested_by = requester.uuid_id)))
     LEFT JOIN public.users target ON ((r.requested_to = target.uuid_id)))
  WHERE ((r.status)::text <> ALL (ARRAY[('ACCEPTED'::character varying)::text, ('DELEGATED'::character varying)::text, ('REJECTED'::character varying)::text, ('CANCELLED'::character varying)::text]))
  ORDER BY r.created_at DESC;


--
-- Name: v_table_activity_heatmap; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_table_activity_heatmap AS
 SELECT table_name,
    date_trunc('hour'::text, created_at) AS hour,
    action,
    count(*) AS count
   FROM public.audit_logs
  WHERE (created_at > (now() - '7 days'::interval))
  GROUP BY table_name, (date_trunc('hour'::text, created_at)), action
  ORDER BY (date_trunc('hour'::text, created_at)) DESC, (count(*)) DESC;


--
-- Name: workflow_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_tasks (
    id integer NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'MEDIUM'::character varying,
    creator_id integer NOT NULL,
    assignee_id integer,
    approver_id integer,
    requires_approval boolean DEFAULT false,
    approval_status character varying(50) DEFAULT 'NOT_REQUIRED'::character varying,
    approved_at timestamp without time zone,
    approved_by integer,
    due_date timestamp without time zone,
    completed_at timestamp without time zone,
    progress integer DEFAULT 0,
    estimated_hours numeric(10,2),
    actual_hours numeric(10,2),
    organization_id integer,
    department_id integer,
    tenant_id uuid,
    serial_number character varying(50),
    "position" integer DEFAULT 0,
    is_archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    tags text[] DEFAULT '{}'::text[],
    parent_task_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wf_approval_status CHECK (((approval_status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'NOT_REQUIRED'::character varying])::text[]))),
    CONSTRAINT chk_wf_progress CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT chk_wf_task_priority CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'URGENT'::character varying, 'CRITICAL'::character varying])::text[]))),
    CONSTRAINT chk_wf_task_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'OPEN'::character varying, 'IN_PROGRESS'::character varying, 'IN_REVIEW'::character varying, 'BLOCKED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'ARCHIVED'::character varying])::text[]))),
    CONSTRAINT chk_workflow_tasks_priority CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying, 'URGENT'::character varying, 'low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT chk_workflow_tasks_status CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'todo'::character varying, 'IN_PROGRESS'::character varying, 'pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'on_hold'::character varying, 'cancelled'::character varying, 'blocked'::character varying, 'review'::character varying, 'done'::character varying, 'DONE'::character varying, 'CLOSED'::character varying])::text[])))
);


--
-- Name: v_task_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_task_summary AS
 SELECT id,
    title,
    description,
    status,
    priority,
    progress,
    due_date,
    tenant_id,
    created_at,
    updated_at,
    creator_id,
    assignee_id,
    ( SELECT count(*) AS count
           FROM public.task_messages
          WHERE (task_messages.task_id = t.id)) AS message_count,
    ( SELECT count(*) AS count
           FROM public.task_attachments
          WHERE (task_attachments.task_id = t.id)) AS attachment_count,
    ( SELECT count(*) AS count
           FROM public.task_participants
          WHERE (task_participants.task_id = t.id)) AS participant_count
   FROM public.workflow_tasks t
  WHERE ((is_archived = false) OR (is_archived IS NULL));


--
-- Name: vehicle_contract_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_contract_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    vehicle_type character varying(50) NOT NULL,
    vehicle_number character varying(30) NOT NULL,
    vehicle_model character varying(100),
    vehicle_make character varying(100),
    fuel_type character varying(30),
    per_km_rate numeric(10,2) DEFAULT 0 NOT NULL,
    included_km_monthly integer DEFAULT 0,
    excess_km_rate numeric(10,2) DEFAULT 0 NOT NULL,
    driver_included boolean DEFAULT false NOT NULL,
    driver_name character varying(255),
    driver_phone character varying(30),
    insurance_expiry date,
    fitness_expiry date,
    permit_expiry date,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: vendor_contract_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_contract_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    service_category character varying(100) NOT NULL,
    service_description text,
    payment_model character varying(50) NOT NULL,
    sla_level character varying(30),
    sla_response_hours integer,
    sla_resolution_hours integer,
    penalty_clause text,
    penalty_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    kpi_metrics jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    code character varying(50),
    name character varying(200) NOT NULL,
    vendor_type character varying(30) DEFAULT 'distributor'::character varying NOT NULL,
    email character varying(255),
    phone character varying(20),
    alternate_phone character varying(20),
    website character varying(255),
    contact_person character varying(100),
    gstin character varying(15),
    pan character varying(10),
    tan character varying(10),
    is_msme boolean DEFAULT false,
    msme_number character varying(30),
    payment_terms character varying(20) DEFAULT 'net_30'::character varying,
    credit_days integer DEFAULT 30,
    bank_details jsonb DEFAULT '{}'::jsonb,
    billing_address jsonb DEFAULT '{}'::jsonb NOT NULL,
    shipping_address jsonb DEFAULT '{}'::jsonb,
    tds_applicable boolean DEFAULT false,
    tds_section character varying(20),
    tds_rate numeric(5,2) DEFAULT 0,
    notes text,
    tags text[] DEFAULT '{}'::text[],
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    CONSTRAINT vendors_credit_days_check CHECK (((credit_days >= 0) AND (credit_days <= 365))),
    CONSTRAINT vendors_gstin_check CHECK (((gstin IS NULL) OR ((gstin)::text ~ '^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'::text))),
    CONSTRAINT vendors_pan_check CHECK (((pan IS NULL) OR ((pan)::text ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'::text))),
    CONSTRAINT vendors_payment_terms_check CHECK (((payment_terms)::text = ANY ((ARRAY['immediate'::character varying, 'net_7'::character varying, 'net_15'::character varying, 'net_30'::character varying, 'net_45'::character varying, 'net_60'::character varying, 'net_90'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT vendors_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'blocked'::character varying, 'pending'::character varying])::text[]))),
    CONSTRAINT vendors_tan_check CHECK (((tan IS NULL) OR ((tan)::text ~ '^[A-Z]{4}[0-9]{5}[A-Z]$'::text))),
    CONSTRAINT vendors_tds_rate_check CHECK (((tds_rate >= (0)::numeric) AND (tds_rate <= (100)::numeric))),
    CONSTRAINT vendors_vendor_type_check CHECK (((vendor_type)::text = ANY ((ARRAY['manufacturer'::character varying, 'distributor'::character varying, 'wholesaler'::character varying, 'retailer'::character varying, 'service_provider'::character varying])::text[])))
);


--
-- Name: TABLE vendors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vendors IS 'Vendor/Supplier master data with Indian compliance (GSTIN, PAN, TAN, MSME, TDS)';


--
-- Name: COLUMN vendors.tan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.tan IS '10-character Tax Deduction Account Number';


--
-- Name: COLUMN vendors.is_msme; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.is_msme IS 'Whether vendor is registered under MSME Act';


--
-- Name: COLUMN vendors.tds_applicable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.tds_applicable IS 'Whether TDS should be deducted on payments';


--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: workflow_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_audit (
    id integer NOT NULL,
    user_id integer,
    workflow_id integer,
    user_role text,
    query text,
    resolved boolean DEFAULT true,
    response text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_audit_id_seq OWNED BY public.workflow_audit.id;


--
-- Name: workflow_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_feedback (
    id integer NOT NULL,
    workflow_id integer,
    user_id integer,
    helpful boolean,
    comment text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_feedback_id_seq OWNED BY public.workflow_feedback.id;


--
-- Name: workflow_permission_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_permission_map (
    id integer NOT NULL,
    workflow_id integer,
    permission_key text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_permission_map_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_permission_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_permission_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_permission_map_id_seq OWNED BY public.workflow_permission_map.id;


--
-- Name: workflow_role_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_role_map (
    id integer NOT NULL,
    workflow_id integer,
    role_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_role_map_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_role_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_role_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_role_map_id_seq OWNED BY public.workflow_role_map.id;


--
-- Name: workflow_task_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_task_history (
    id integer NOT NULL,
    task_id integer NOT NULL,
    from_status character varying(50),
    to_status character varying(50),
    action character varying(100) NOT NULL,
    actor_id uuid,
    actor_type character varying(50) DEFAULT 'USER'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_task_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_task_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_task_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_task_history_id_seq OWNED BY public.workflow_task_history.id;


--
-- Name: workflow_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_tasks_id_seq OWNED BY public.workflow_tasks.id;


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflows (
    id integer NOT NULL,
    slug text NOT NULL,
    module text NOT NULL,
    title text NOT NULL,
    description text,
    ui_path text,
    ui_path_mobile text,
    ui_steps jsonb DEFAULT '[]'::jsonb,
    required_roles jsonb DEFAULT '[]'::jsonb,
    required_permissions jsonb DEFAULT '[]'::jsonb,
    frontend_route text,
    can_view_expr text,
    examples jsonb DEFAULT '[]'::jsonb,
    tags text[] DEFAULT '{}'::text[],
    keywords text[] DEFAULT '{}'::text[],
    priority integer DEFAULT 50,
    is_active boolean DEFAULT true,
    version integer DEFAULT 1,
    screenshot_url text,
    video_url text,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;


--
-- Name: audit_logs_p2025_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned ATTACH PARTITION public.audit_logs_p2025_12 FOR VALUES FROM ('2025-12-01 00:00:00') TO ('2026-01-01 00:00:00');


--
-- Name: audit_logs_p2026_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned ATTACH PARTITION public.audit_logs_p2026_01 FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');


--
-- Name: audit_logs_p2026_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned ATTACH PARTITION public.audit_logs_p2026_02 FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-03-01 00:00:00');


--
-- Name: audit_logs_p2026_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned ATTACH PARTITION public.audit_logs_p2026_03 FOR VALUES FROM ('2026-03-01 00:00:00') TO ('2026-04-01 00:00:00');


--
-- Name: audit_logs_p2026_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned ATTACH PARTITION public.audit_logs_p2026_04 FOR VALUES FROM ('2026-04-01 00:00:00') TO ('2026-05-01 00:00:00');


--
-- Name: audit_logs_p2026_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned ATTACH PARTITION public.audit_logs_p2026_05 FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');


--
-- Name: audit_logs_p_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned ATTACH PARTITION public.audit_logs_p_default DEFAULT;


--
-- Name: client_usage_events_p2025_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2025_09 FOR VALUES FROM ('2025-09-01 00:00:00') TO ('2025-10-01 00:00:00');


--
-- Name: client_usage_events_p2025_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2025_10 FOR VALUES FROM ('2025-10-01 00:00:00') TO ('2025-11-01 00:00:00');


--
-- Name: client_usage_events_p2025_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2025_11 FOR VALUES FROM ('2025-11-01 00:00:00') TO ('2025-12-01 00:00:00');


--
-- Name: client_usage_events_p2025_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2025_12 FOR VALUES FROM ('2025-12-01 00:00:00') TO ('2026-01-01 00:00:00');


--
-- Name: client_usage_events_p2026_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_01 FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');


--
-- Name: client_usage_events_p2026_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_02 FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-03-01 00:00:00');


--
-- Name: client_usage_events_p2026_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_03 FOR VALUES FROM ('2026-03-01 00:00:00') TO ('2026-04-01 00:00:00');


--
-- Name: client_usage_events_p2026_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_04 FOR VALUES FROM ('2026-04-01 00:00:00') TO ('2026-05-01 00:00:00');


--
-- Name: client_usage_events_p2026_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_05 FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');


--
-- Name: client_usage_events_p2026_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_06 FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');


--
-- Name: client_usage_events_p2026_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_07 FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-08-01 00:00:00');


--
-- Name: client_usage_events_p2026_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_08 FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-09-01 00:00:00');


--
-- Name: client_usage_events_p2026_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_09 FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00');


--
-- Name: client_usage_events_p2026_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_10 FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2026-11-01 00:00:00');


--
-- Name: client_usage_events_p2026_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p2026_11 FOR VALUES FROM ('2026-11-01 00:00:00') TO ('2026-12-01 00:00:00');


--
-- Name: client_usage_events_p_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ATTACH PARTITION public.client_usage_events_p_default DEFAULT;


--
-- Name: thread_messages_p2025_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2025_09 FOR VALUES FROM ('2025-09-01 00:00:00') TO ('2025-10-01 00:00:00');


--
-- Name: thread_messages_p2025_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2025_10 FOR VALUES FROM ('2025-10-01 00:00:00') TO ('2025-11-01 00:00:00');


--
-- Name: thread_messages_p2025_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2025_11 FOR VALUES FROM ('2025-11-01 00:00:00') TO ('2025-12-01 00:00:00');


--
-- Name: thread_messages_p2025_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2025_12 FOR VALUES FROM ('2025-12-01 00:00:00') TO ('2026-01-01 00:00:00');


--
-- Name: thread_messages_p2026_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_01 FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');


--
-- Name: thread_messages_p2026_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_02 FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-03-01 00:00:00');


--
-- Name: thread_messages_p2026_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_03 FOR VALUES FROM ('2026-03-01 00:00:00') TO ('2026-04-01 00:00:00');


--
-- Name: thread_messages_p2026_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_04 FOR VALUES FROM ('2026-04-01 00:00:00') TO ('2026-05-01 00:00:00');


--
-- Name: thread_messages_p2026_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_05 FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');


--
-- Name: thread_messages_p2026_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_06 FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');


--
-- Name: thread_messages_p2026_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_07 FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-08-01 00:00:00');


--
-- Name: thread_messages_p2026_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_08 FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-09-01 00:00:00');


--
-- Name: thread_messages_p2026_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_09 FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00');


--
-- Name: thread_messages_p2026_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_10 FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2026-11-01 00:00:00');


--
-- Name: thread_messages_p2026_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p2026_11 FOR VALUES FROM ('2026-11-01 00:00:00') TO ('2026-12-01 00:00:00');


--
-- Name: thread_messages_p_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned ATTACH PARTITION public.thread_messages_p_default DEFAULT;


--
-- Name: _schema_info id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._schema_info ALTER COLUMN id SET DEFAULT nextval('public._schema_info_id_seq'::regclass);


--
-- Name: admin_role_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_role_assignments ALTER COLUMN id SET DEFAULT nextval('public.admin_role_assignments_id_seq'::regclass);


--
-- Name: ai_usage_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_usage_logs_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: approval_levels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_levels ALTER COLUMN id SET DEFAULT nextval('public.approval_levels_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: audit_logs_dml id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_dml ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_dml_id_seq'::regclass);


--
-- Name: audit_logs_partitioned id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_partitioned_id_seq'::regclass);


--
-- Name: billing_invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_invoice_items ALTER COLUMN id SET DEFAULT nextval('public.billing_invoice_items_id_seq'::regclass);


--
-- Name: billing_overrides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_overrides ALTER COLUMN id SET DEFAULT nextval('public.billing_overrides_id_seq'::regclass);


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: chat_analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_analytics ALTER COLUMN id SET DEFAULT nextval('public.chat_analytics_id_seq'::regclass);


--
-- Name: chat_common_mistakes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_common_mistakes ALTER COLUMN id SET DEFAULT nextval('public.chat_common_mistakes_id_seq'::regclass);


--
-- Name: chat_context_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_context_slots ALTER COLUMN id SET DEFAULT nextval('public.chat_context_slots_id_seq'::regclass);


--
-- Name: chat_conversation_context id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversation_context ALTER COLUMN id SET DEFAULT nextval('public.chat_conversation_context_id_seq'::regclass);


--
-- Name: chat_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations ALTER COLUMN id SET DEFAULT nextval('public.chat_conversations_id_seq'::regclass);


--
-- Name: chat_entity_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_entity_types ALTER COLUMN id SET DEFAULT nextval('public.chat_entity_types_id_seq'::regclass);


--
-- Name: chat_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback ALTER COLUMN id SET DEFAULT nextval('public.chat_feedback_id_seq'::regclass);


--
-- Name: chat_intent_flows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_intent_flows ALTER COLUMN id SET DEFAULT nextval('public.chat_intent_flows_id_seq'::regclass);


--
-- Name: chat_interactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_interactions ALTER COLUMN id SET DEFAULT nextval('public.chat_interactions_id_seq'::regclass);


--
-- Name: chat_learning_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_learning_queue ALTER COLUMN id SET DEFAULT nextval('public.chat_learning_queue_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: chat_response_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_response_variants ALTER COLUMN id SET DEFAULT nextval('public.chat_response_variants_id_seq'::regclass);


--
-- Name: chat_semantic_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_semantic_cache ALTER COLUMN id SET DEFAULT nextval('public.chat_semantic_cache_id_seq'::regclass);


--
-- Name: chat_training_analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_training_analytics ALTER COLUMN id SET DEFAULT nextval('public.chat_training_analytics_id_seq'::regclass);


--
-- Name: chat_training_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_training_data ALTER COLUMN id SET DEFAULT nextval('public.chat_training_data_id_seq'::regclass);


--
-- Name: chat_user_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_user_preferences ALTER COLUMN id SET DEFAULT nextval('public.chat_user_preferences_id_seq'::regclass);


--
-- Name: clarification_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clarification_audit ALTER COLUMN id SET DEFAULT nextval('public.clarification_audit_id_seq'::regclass);


--
-- Name: client_feature_overrides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_feature_overrides ALTER COLUMN id SET DEFAULT nextval('public.client_feature_overrides_id_seq'::regclass);


--
-- Name: client_module_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_module_permissions ALTER COLUMN id SET DEFAULT nextval('public.client_module_permissions_id_seq'::regclass);


--
-- Name: client_role_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_role_assignments ALTER COLUMN id SET DEFAULT nextval('public.client_role_assignments_id_seq'::regclass);


--
-- Name: client_sequences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_sequences ALTER COLUMN id SET DEFAULT nextval('public.client_sequences_id_seq'::regclass);


--
-- Name: client_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.client_subscriptions_id_seq'::regclass);


--
-- Name: client_usage_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events ALTER COLUMN id SET DEFAULT nextval('public.client_usage_events_id_seq'::regclass);


--
-- Name: client_usage_events_partitioned id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned ALTER COLUMN id SET DEFAULT nextval('public.client_usage_events_partitioned_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: enforcement_decision_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enforcement_decision_log ALTER COLUMN id SET DEFAULT nextval('public.enforcement_decision_log_id_seq'::regclass);


--
-- Name: enterprise_admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enterprise_admins ALTER COLUMN id SET DEFAULT nextval('public.enterprise_admins_id_seq'::regclass);


--
-- Name: entity_id_registry id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_id_registry ALTER COLUMN id SET DEFAULT nextval('public.entity_id_registry_id_seq'::regclass);


--
-- Name: entity_id_sequences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_id_sequences ALTER COLUMN id SET DEFAULT nextval('public.entity_id_sequences_id_seq'::regclass);


--
-- Name: error_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs ALTER COLUMN id SET DEFAULT nextval('public.error_logs_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: failed_login_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_login_attempts ALTER COLUMN id SET DEFAULT nextval('public.failed_login_attempts_id_seq'::regclass);


--
-- Name: fallback_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fallback_logs ALTER COLUMN id SET DEFAULT nextval('public.fallback_logs_id_seq'::regclass);


--
-- Name: feature_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_catalog ALTER COLUMN id SET DEFAULT nextval('public.feature_catalog_id_seq'::regclass);


--
-- Name: feature_flag_definitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag_definitions ALTER COLUMN id SET DEFAULT nextval('public.feature_flag_definitions_id_seq'::regclass);


--
-- Name: feature_grace_periods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_grace_periods ALTER COLUMN id SET DEFAULT nextval('public.feature_grace_periods_id_seq'::regclass);


--
-- Name: feature_micro_unlocks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_micro_unlocks ALTER COLUMN id SET DEFAULT nextval('public.feature_micro_unlocks_id_seq'::regclass);


--
-- Name: feature_usage_counters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_counters ALTER COLUMN id SET DEFAULT nextval('public.feature_usage_counters_id_seq'::regclass);


--
-- Name: infrastructure_billing_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infrastructure_billing_rates ALTER COLUMN id SET DEFAULT nextval('public.infrastructure_billing_rates_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Name: load_test_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.load_test_reports ALTER COLUMN id SET DEFAULT nextval('public.load_test_reports_id_seq'::regclass);


--
-- Name: master_feature_definitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_feature_definitions ALTER COLUMN id SET DEFAULT nextval('public.master_feature_definitions_id_seq'::regclass);


--
-- Name: master_subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.master_subscription_plans_id_seq'::regclass);


--
-- Name: message_reactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions ALTER COLUMN id SET DEFAULT nextval('public.message_reactions_id_seq'::regclass);


--
-- Name: message_reads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads ALTER COLUMN id SET DEFAULT nextval('public.message_reads_id_seq'::regclass);


--
-- Name: micro_subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.micro_subscription_plans_id_seq'::regclass);


--
-- Name: micro_unlock_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_unlock_audit_log ALTER COLUMN id SET DEFAULT nextval('public.micro_unlock_audit_log_id_seq'::regclass);


--
-- Name: micro_unlock_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_unlock_invoices ALTER COLUMN id SET DEFAULT nextval('public.micro_unlock_invoices_id_seq'::regclass);


--
-- Name: migration_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_history ALTER COLUMN id SET DEFAULT nextval('public.migration_history_id_seq'::regclass);


--
-- Name: module_approval_flows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_approval_flows ALTER COLUMN id SET DEFAULT nextval('public.module_approval_flows_id_seq'::regclass);


--
-- Name: module_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_assignments ALTER COLUMN id SET DEFAULT nextval('public.module_assignments_id_seq'::regclass);


--
-- Name: modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules ALTER COLUMN id SET DEFAULT nextval('public.modules_id_seq'::regclass);


--
-- Name: password_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history ALTER COLUMN id SET DEFAULT nextval('public.password_history_id_seq'::regclass);


--
-- Name: payment_activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.payment_activity_logs_id_seq'::regclass);


--
-- Name: payment_request_line_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_request_line_items ALTER COLUMN id SET DEFAULT nextval('public.payment_request_line_items_id_seq'::regclass);


--
-- Name: permission_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_cache ALTER COLUMN id SET DEFAULT nextval('public.permission_cache_id_seq'::regclass);


--
-- Name: personal_user_dictionary id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_user_dictionary ALTER COLUMN id SET DEFAULT nextval('public.personal_user_dictionary_id_seq'::regclass);


--
-- Name: plan_change_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_change_audit_log ALTER COLUMN id SET DEFAULT nextval('public.plan_change_audit_log_id_seq'::regclass);


--
-- Name: plan_feature_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_feature_controls ALTER COLUMN id SET DEFAULT nextval('public.plan_feature_controls_id_seq'::regclass);


--
-- Name: preprocessing_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprocessing_settings ALTER COLUMN id SET DEFAULT nextval('public.preprocessing_settings_id_seq'::regclass);


--
-- Name: preprocessor_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprocessor_audit ALTER COLUMN id SET DEFAULT nextval('public.preprocessor_audit_id_seq'::regclass);


--
-- Name: protected_spans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protected_spans ALTER COLUMN id SET DEFAULT nextval('public.protected_spans_id_seq'::regclass);


--
-- Name: qa_issue_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issue_comments ALTER COLUMN id SET DEFAULT nextval('public.qa_issue_comments_id_seq'::regclass);


--
-- Name: qa_issue_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issue_history ALTER COLUMN id SET DEFAULT nextval('public.qa_issue_history_id_seq'::regclass);


--
-- Name: qa_issues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issues ALTER COLUMN id SET DEFAULT nextval('public.qa_issues_id_seq'::regclass);


--
-- Name: qa_test_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_test_tasks ALTER COLUMN id SET DEFAULT nextval('public.qa_test_tasks_id_seq'::regclass);


--
-- Name: rate_limit_violations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_violations ALTER COLUMN id SET DEFAULT nextval('public.rate_limit_violations_id_seq'::regclass);


--
-- Name: rbac_actions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_actions ALTER COLUMN id SET DEFAULT nextval('public.rbac_actions_id_seq'::regclass);


--
-- Name: rbac_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_permissions ALTER COLUMN id SET DEFAULT nextval('public.rbac_permissions_id_seq'::regclass);


--
-- Name: rbac_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_roles ALTER COLUMN id SET DEFAULT nextval('public.rbac_roles_id_seq'::regclass);


--
-- Name: rbac_routes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_routes ALTER COLUMN id SET DEFAULT nextval('public.rbac_routes_id_seq'::regclass);


--
-- Name: rbac_user_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_user_permissions ALTER COLUMN id SET DEFAULT nextval('public.rbac_user_permissions_id_seq'::regclass);


--
-- Name: rbac_user_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_user_roles ALTER COLUMN id SET DEFAULT nextval('public.rbac_user_roles_id_seq'::regclass);


--
-- Name: resource_consumption id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_consumption ALTER COLUMN id SET DEFAULT nextval('public.resource_consumption_id_seq'::regclass);


--
-- Name: review_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_audit ALTER COLUMN id SET DEFAULT nextval('public.review_audit_id_seq'::regclass);


--
-- Name: security_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events ALTER COLUMN id SET DEFAULT nextval('public.security_events_id_seq'::regclass);


--
-- Name: spelling_dictionary id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spelling_dictionary ALTER COLUMN id SET DEFAULT nextval('public.spelling_dictionary_id_seq'::regclass);


--
-- Name: subscription_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_audit_log ALTER COLUMN id SET DEFAULT nextval('public.subscription_audit_log_id_seq'::regclass);


--
-- Name: subscription_billing_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_billing_ledger ALTER COLUMN id SET DEFAULT nextval('public.subscription_billing_ledger_id_seq'::regclass);


--
-- Name: subscription_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices ALTER COLUMN id SET DEFAULT nextval('public.subscription_invoices_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: super_admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admins ALTER COLUMN id SET DEFAULT nextval('public.super_admins_id_seq'::regclass);


--
-- Name: support_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_sessions ALTER COLUMN id SET DEFAULT nextval('public.support_sessions_id_seq'::regclass);


--
-- Name: support_ticket_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_comments ALTER COLUMN id SET DEFAULT nextval('public.support_ticket_comments_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: system_health_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_config ALTER COLUMN id SET DEFAULT nextval('public.system_health_config_id_seq'::regclass);


--
-- Name: system_health_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_metrics ALTER COLUMN id SET DEFAULT nextval('public.system_health_metrics_id_seq'::regclass);


--
-- Name: system_metric_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metric_daily ALTER COLUMN id SET DEFAULT nextval('public.system_metric_daily_id_seq'::regclass);


--
-- Name: system_metric_samples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metric_samples ALTER COLUMN id SET DEFAULT nextval('public.system_metric_samples_id_seq'::regclass);


--
-- Name: task_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments ALTER COLUMN id SET DEFAULT nextval('public.task_attachments_id_seq'::regclass);


--
-- Name: task_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_audit ALTER COLUMN id SET DEFAULT nextval('public.task_audit_id_seq'::regclass);


--
-- Name: task_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.task_audit_logs_id_seq'::regclass);


--
-- Name: task_labels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_labels ALTER COLUMN id SET DEFAULT nextval('public.task_labels_id_seq'::regclass);


--
-- Name: task_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_messages ALTER COLUMN id SET DEFAULT nextval('public.task_messages_id_seq'::regclass);


--
-- Name: task_participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_participants ALTER COLUMN id SET DEFAULT nextval('public.task_participants_id_seq'::regclass);


--
-- Name: task_request_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_request_history ALTER COLUMN id SET DEFAULT nextval('public.task_request_history_id_seq'::regclass);


--
-- Name: task_request_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_request_messages ALTER COLUMN id SET DEFAULT nextval('public.task_request_messages_id_seq'::regclass);


--
-- Name: task_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests ALTER COLUMN id SET DEFAULT nextval('public.task_requests_id_seq'::regclass);


--
-- Name: task_time_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_time_entries ALTER COLUMN id SET DEFAULT nextval('public.task_time_entries_id_seq'::regclass);


--
-- Name: tenant_feature_unlocks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_feature_unlocks ALTER COLUMN id SET DEFAULT nextval('public.tenant_feature_unlocks_id_seq'::regclass);


--
-- Name: tenant_plan_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_plan_assignments ALTER COLUMN id SET DEFAULT nextval('public.tenant_plan_assignments_id_seq'::regclass);


--
-- Name: tenant_quota_overrides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_quota_overrides ALTER COLUMN id SET DEFAULT nextval('public.tenant_quota_overrides_id_seq'::regclass);


--
-- Name: tenant_spend_limits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_spend_limits ALTER COLUMN id SET DEFAULT nextval('public.tenant_spend_limits_id_seq'::regclass);


--
-- Name: tenant_subscription id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscription ALTER COLUMN id SET DEFAULT nextval('public.tenant_subscription_id_seq'::regclass);


--
-- Name: tenant_usage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage ALTER COLUMN id SET DEFAULT nextval('public.tenant_usage_id_seq'::regclass);


--
-- Name: usage_block_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_block_log ALTER COLUMN id SET DEFAULT nextval('public.usage_block_log_id_seq'::regclass);


--
-- Name: usage_counters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters ALTER COLUMN id SET DEFAULT nextval('public.usage_counters_id_seq'::regclass);


--
-- Name: user_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements ALTER COLUMN id SET DEFAULT nextval('public.user_achievements_id_seq'::regclass);


--
-- Name: user_addresses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses ALTER COLUMN id SET DEFAULT nextval('public.user_addresses_id_seq'::regclass);


--
-- Name: user_bank_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.user_bank_accounts_id_seq'::regclass);


--
-- Name: user_branches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branches ALTER COLUMN id SET DEFAULT nextval('public.user_branches_id_seq'::regclass);


--
-- Name: user_education id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_education ALTER COLUMN id SET DEFAULT nextval('public.user_education_id_seq'::regclass);


--
-- Name: user_emergency_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_emergency_contacts ALTER COLUMN id SET DEFAULT nextval('public.user_emergency_contacts_id_seq'::regclass);


--
-- Name: user_kyc id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_kyc ALTER COLUMN id SET DEFAULT nextval('public.user_kyc_id_seq'::regclass);


--
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: user_skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills ALTER COLUMN id SET DEFAULT nextval('public.user_skills_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Name: workflow_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_audit ALTER COLUMN id SET DEFAULT nextval('public.workflow_audit_id_seq'::regclass);


--
-- Name: workflow_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_feedback ALTER COLUMN id SET DEFAULT nextval('public.workflow_feedback_id_seq'::regclass);


--
-- Name: workflow_permission_map id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_permission_map ALTER COLUMN id SET DEFAULT nextval('public.workflow_permission_map_id_seq'::regclass);


--
-- Name: workflow_role_map id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_role_map ALTER COLUMN id SET DEFAULT nextval('public.workflow_role_map_id_seq'::regclass);


--
-- Name: workflow_task_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_task_history ALTER COLUMN id SET DEFAULT nextval('public.workflow_task_history_id_seq'::regclass);


--
-- Name: workflow_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_tasks ALTER COLUMN id SET DEFAULT nextval('public.workflow_tasks_id_seq'::regclass);


--
-- Name: workflows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows ALTER COLUMN id SET DEFAULT nextval('public.workflows_id_seq'::regclass);


--
-- Name: _ClientToClientSequence _ClientToClientSequence_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ClientToClientSequence"
    ADD CONSTRAINT "_ClientToClientSequence_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: _schema_info _schema_info_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._schema_info
    ADD CONSTRAINT _schema_info_key_unique UNIQUE (key);


--
-- Name: _schema_info _schema_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._schema_info
    ADD CONSTRAINT _schema_info_pkey PRIMARY KEY (id);


--
-- Name: admin_role_assignments admin_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT admin_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_logs ai_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: approval_audit_log approval_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_log
    ADD CONSTRAINT approval_audit_log_pkey PRIMARY KEY (id);


--
-- Name: approval_instances approval_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_instances
    ADD CONSTRAINT approval_instances_pkey PRIMARY KEY (id);


--
-- Name: approval_levels approval_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_levels
    ADD CONSTRAINT approval_levels_pkey PRIMARY KEY (id);


--
-- Name: approval_stage_instances approval_stage_instances_approval_instance_id_workflow_stag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_stage_instances
    ADD CONSTRAINT approval_stage_instances_approval_instance_id_workflow_stag_key UNIQUE (approval_instance_id, workflow_stage_id, attempt_number);


--
-- Name: approval_stage_instances approval_stage_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_stage_instances
    ADD CONSTRAINT approval_stage_instances_pkey PRIMARY KEY (id);


--
-- Name: approval_workflow_stages approval_workflow_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_stages
    ADD CONSTRAINT approval_workflow_stages_pkey PRIMARY KEY (id);


--
-- Name: approval_workflow_stages approval_workflow_stages_workflow_template_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_stages
    ADD CONSTRAINT approval_workflow_stages_workflow_template_id_code_key UNIQUE (workflow_template_id, code);


--
-- Name: approval_workflow_stages approval_workflow_stages_workflow_template_id_stage_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_stages
    ADD CONSTRAINT approval_workflow_stages_workflow_template_id_stage_order_key UNIQUE (workflow_template_id, stage_order);


--
-- Name: approval_workflow_templates approval_workflow_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_templates
    ADD CONSTRAINT approval_workflow_templates_pkey PRIMARY KEY (id);


--
-- Name: approval_workflow_templates approval_workflow_templates_tenant_id_code_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_templates
    ADD CONSTRAINT approval_workflow_templates_tenant_id_code_version_key UNIQUE (tenant_id, code, version);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: approver_configurations approver_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_configurations
    ADD CONSTRAINT approver_configurations_pkey PRIMARY KEY (id);


--
-- Name: approver_selection_logs approver_selection_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_selection_logs
    ADD CONSTRAINT approver_selection_logs_pkey PRIMARY KEY (id);


--
-- Name: assistant_memory assistant_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistant_memory
    ADD CONSTRAINT assistant_memory_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_dml audit_logs_dml_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_dml
    ADD CONSTRAINT audit_logs_dml_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_partitioned audit_logs_partitioned_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_partitioned
    ADD CONSTRAINT audit_logs_partitioned_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_p2025_12 audit_logs_p2025_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_p2025_12
    ADD CONSTRAINT audit_logs_p2025_12_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_p2026_01 audit_logs_p2026_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_p2026_01
    ADD CONSTRAINT audit_logs_p2026_01_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_p2026_02 audit_logs_p2026_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_p2026_02
    ADD CONSTRAINT audit_logs_p2026_02_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_p2026_03 audit_logs_p2026_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_p2026_03
    ADD CONSTRAINT audit_logs_p2026_03_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_p2026_04 audit_logs_p2026_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_p2026_04
    ADD CONSTRAINT audit_logs_p2026_04_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_p2026_05 audit_logs_p2026_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_p2026_05
    ADD CONSTRAINT audit_logs_p2026_05_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_p_default audit_logs_p_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_p_default
    ADD CONSTRAINT audit_logs_p_default_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_statement_lines bank_statement_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_lines
    ADD CONSTRAINT bank_statement_lines_pkey PRIMARY KEY (id);


--
-- Name: bank_statements bank_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements
    ADD CONSTRAINT bank_statements_pkey PRIMARY KEY (id);


--
-- Name: bank_templates bank_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_templates
    ADD CONSTRAINT bank_templates_pkey PRIMARY KEY (id);


--
-- Name: billing_invoice_items billing_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_invoice_items
    ADD CONSTRAINT billing_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: billing_overrides billing_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_overrides
    ADD CONSTRAINT billing_overrides_pkey PRIMARY KEY (id);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: chat_analytics chat_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_analytics
    ADD CONSTRAINT chat_analytics_pkey PRIMARY KEY (id);


--
-- Name: chat_common_mistakes chat_common_mistakes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_common_mistakes
    ADD CONSTRAINT chat_common_mistakes_pkey PRIMARY KEY (id);


--
-- Name: chat_context_slots chat_context_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_context_slots
    ADD CONSTRAINT chat_context_slots_pkey PRIMARY KEY (id);


--
-- Name: chat_conversation_context chat_conversation_context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversation_context
    ADD CONSTRAINT chat_conversation_context_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_entity_types chat_entity_types_entity_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_entity_types
    ADD CONSTRAINT chat_entity_types_entity_name_key UNIQUE (entity_name);


--
-- Name: chat_entity_types chat_entity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_entity_types
    ADD CONSTRAINT chat_entity_types_pkey PRIMARY KEY (id);


--
-- Name: chat_feedback chat_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback
    ADD CONSTRAINT chat_feedback_pkey PRIMARY KEY (id);


--
-- Name: chat_intent_flows chat_intent_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_intent_flows
    ADD CONSTRAINT chat_intent_flows_pkey PRIMARY KEY (id);


--
-- Name: chat_interactions chat_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_interactions
    ADD CONSTRAINT chat_interactions_pkey PRIMARY KEY (id);


--
-- Name: chat_learning_queue chat_learning_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_learning_queue
    ADD CONSTRAINT chat_learning_queue_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_response_variants chat_response_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_response_variants
    ADD CONSTRAINT chat_response_variants_pkey PRIMARY KEY (id);


--
-- Name: chat_semantic_cache chat_semantic_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_semantic_cache
    ADD CONSTRAINT chat_semantic_cache_pkey PRIMARY KEY (id);


--
-- Name: chat_training_analytics chat_training_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_training_analytics
    ADD CONSTRAINT chat_training_analytics_pkey PRIMARY KEY (id);


--
-- Name: chat_training_data chat_training_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_training_data
    ADD CONSTRAINT chat_training_data_pkey PRIMARY KEY (id);


--
-- Name: chat_user_preferences chat_user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_user_preferences
    ADD CONSTRAINT chat_user_preferences_pkey PRIMARY KEY (id);


--
-- Name: chat_user_preferences chat_user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_user_preferences
    ADD CONSTRAINT chat_user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: clarification_audit clarification_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clarification_audit
    ADD CONSTRAINT clarification_audit_pkey PRIMARY KEY (id);


--
-- Name: client_daily_usage client_daily_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_daily_usage
    ADD CONSTRAINT client_daily_usage_pkey PRIMARY KEY (date, client_id, module_id);


--
-- Name: client_feature_overrides client_feature_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_feature_overrides
    ADD CONSTRAINT client_feature_overrides_pkey PRIMARY KEY (id);


--
-- Name: client_module_permissions client_module_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_module_permissions
    ADD CONSTRAINT client_module_permissions_pkey PRIMARY KEY (id);


--
-- Name: client_onboarding_activity client_onboarding_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_onboarding_activity
    ADD CONSTRAINT client_onboarding_activity_pkey PRIMARY KEY (id);


--
-- Name: client_role_assignments client_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_role_assignments
    ADD CONSTRAINT client_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: client_sequences client_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_sequences
    ADD CONSTRAINT client_sequences_pkey PRIMARY KEY (id);


--
-- Name: client_subscriptions client_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: client_usage_events_partitioned client_usage_events_partitioned_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_partitioned
    ADD CONSTRAINT client_usage_events_partitioned_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2025_09 client_usage_events_p2025_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2025_09
    ADD CONSTRAINT client_usage_events_p2025_09_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2025_10 client_usage_events_p2025_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2025_10
    ADD CONSTRAINT client_usage_events_p2025_10_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2025_11 client_usage_events_p2025_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2025_11
    ADD CONSTRAINT client_usage_events_p2025_11_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2025_12 client_usage_events_p2025_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2025_12
    ADD CONSTRAINT client_usage_events_p2025_12_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_01 client_usage_events_p2026_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_01
    ADD CONSTRAINT client_usage_events_p2026_01_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_02 client_usage_events_p2026_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_02
    ADD CONSTRAINT client_usage_events_p2026_02_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_03 client_usage_events_p2026_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_03
    ADD CONSTRAINT client_usage_events_p2026_03_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_04 client_usage_events_p2026_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_04
    ADD CONSTRAINT client_usage_events_p2026_04_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_05 client_usage_events_p2026_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_05
    ADD CONSTRAINT client_usage_events_p2026_05_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_06 client_usage_events_p2026_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_06
    ADD CONSTRAINT client_usage_events_p2026_06_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_07 client_usage_events_p2026_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_07
    ADD CONSTRAINT client_usage_events_p2026_07_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_08 client_usage_events_p2026_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_08
    ADD CONSTRAINT client_usage_events_p2026_08_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_09 client_usage_events_p2026_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_09
    ADD CONSTRAINT client_usage_events_p2026_09_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_10 client_usage_events_p2026_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_10
    ADD CONSTRAINT client_usage_events_p2026_10_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p2026_11 client_usage_events_p2026_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p2026_11
    ADD CONSTRAINT client_usage_events_p2026_11_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events_p_default client_usage_events_p_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events_p_default
    ADD CONSTRAINT client_usage_events_p_default_pkey PRIMARY KEY (id, occurred_at);


--
-- Name: client_usage_events client_usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events
    ADD CONSTRAINT client_usage_events_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: contract_accounting_maps contract_accounting_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_accounting_maps
    ADD CONSTRAINT contract_accounting_maps_pkey PRIMARY KEY (id);


--
-- Name: contract_audit_logs contract_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_audit_logs
    ADD CONSTRAINT contract_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: contract_documents contract_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_pkey PRIMARY KEY (id);


--
-- Name: contract_financials contract_financials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_financials
    ADD CONSTRAINT contract_financials_pkey PRIMARY KEY (id);


--
-- Name: contract_reminders contract_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_reminders
    ADD CONSTRAINT contract_reminders_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: enforcement_decision_log enforcement_decision_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enforcement_decision_log
    ADD CONSTRAINT enforcement_decision_log_pkey PRIMARY KEY (id);


--
-- Name: enterprise_admins enterprise_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enterprise_admins
    ADD CONSTRAINT enterprise_admins_pkey PRIMARY KEY (id);


--
-- Name: entity_id_registry entity_id_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_id_registry
    ADD CONSTRAINT entity_id_registry_pkey PRIMARY KEY (id);


--
-- Name: entity_id_sequences entity_id_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_id_sequences
    ADD CONSTRAINT entity_id_sequences_pkey PRIMARY KEY (id);


--
-- Name: users_enhanced erp_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_enhanced
    ADD CONSTRAINT erp_users_email_unique UNIQUE (email);


--
-- Name: users_enhanced erp_users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_enhanced
    ADD CONSTRAINT erp_users_username_unique UNIQUE (username);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: failed_login_attempts failed_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_login_attempts
    ADD CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: fallback_logs fallback_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fallback_logs
    ADD CONSTRAINT fallback_logs_pkey PRIMARY KEY (id);


--
-- Name: feature_catalog feature_catalog_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_catalog
    ADD CONSTRAINT feature_catalog_feature_key_key UNIQUE (feature_key);


--
-- Name: feature_catalog feature_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_catalog
    ADD CONSTRAINT feature_catalog_pkey PRIMARY KEY (id);


--
-- Name: feature_flag_definitions feature_flag_definitions_flag_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag_definitions
    ADD CONSTRAINT feature_flag_definitions_flag_code_key UNIQUE (flag_code);


--
-- Name: feature_flag_definitions feature_flag_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag_definitions
    ADD CONSTRAINT feature_flag_definitions_pkey PRIMARY KEY (id);


--
-- Name: feature_grace_periods feature_grace_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_grace_periods
    ADD CONSTRAINT feature_grace_periods_pkey PRIMARY KEY (id);


--
-- Name: feature_micro_unlocks feature_micro_unlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_micro_unlocks
    ADD CONSTRAINT feature_micro_unlocks_pkey PRIMARY KEY (id);


--
-- Name: feature_usage_counters feature_usage_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_counters
    ADD CONSTRAINT feature_usage_counters_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_key_key UNIQUE (key);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: infrastructure_billing_rates infrastructure_billing_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infrastructure_billing_rates
    ADD CONSTRAINT infrastructure_billing_rates_pkey PRIMARY KEY (id);


--
-- Name: infrastructure_billing_rates infrastructure_billing_rates_resource_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infrastructure_billing_rates
    ADD CONSTRAINT infrastructure_billing_rates_resource_type_key UNIQUE (resource_type);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_lines journal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: ledgers ledgers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledgers
    ADD CONSTRAINT ledgers_pkey PRIMARY KEY (id);


--
-- Name: load_test_reports load_test_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.load_test_reports
    ADD CONSTRAINT load_test_reports_pkey PRIMARY KEY (id);


--
-- Name: master_feature_definitions master_feature_definitions_feature_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_feature_definitions
    ADD CONSTRAINT master_feature_definitions_feature_code_key UNIQUE (feature_code);


--
-- Name: master_feature_definitions master_feature_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_feature_definitions
    ADD CONSTRAINT master_feature_definitions_pkey PRIMARY KEY (id);


--
-- Name: master_subscription_plans master_subscription_plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_subscription_plans
    ADD CONSTRAINT master_subscription_plans_code_key UNIQUE (code);


--
-- Name: master_subscription_plans master_subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_subscription_plans
    ADD CONSTRAINT master_subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_message_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: message_reads message_reads_message_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- Name: message_reads message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_pkey PRIMARY KEY (id);


--
-- Name: micro_subscription_plans micro_subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_subscription_plans
    ADD CONSTRAINT micro_subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: micro_subscription_plans micro_subscription_plans_plan_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_subscription_plans
    ADD CONSTRAINT micro_subscription_plans_plan_code_key UNIQUE (plan_code);


--
-- Name: micro_unlock_audit_log micro_unlock_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_unlock_audit_log
    ADD CONSTRAINT micro_unlock_audit_log_pkey PRIMARY KEY (id);


--
-- Name: micro_unlock_invoices micro_unlock_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_unlock_invoices
    ADD CONSTRAINT micro_unlock_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: micro_unlock_invoices micro_unlock_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_unlock_invoices
    ADD CONSTRAINT micro_unlock_invoices_pkey PRIMARY KEY (id);


--
-- Name: migration_history migration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_history
    ADD CONSTRAINT migration_history_pkey PRIMARY KEY (id);


--
-- Name: module_approval_flows module_approval_flows_module_id_approval_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_approval_flows
    ADD CONSTRAINT module_approval_flows_module_id_approval_level_key UNIQUE (module_id, approval_level);


--
-- Name: module_approval_flows module_approval_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_approval_flows
    ADD CONSTRAINT module_approval_flows_pkey PRIMARY KEY (id);


--
-- Name: module_assignments module_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT module_assignments_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: onboarding_magic_links onboarding_magic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_magic_links
    ADD CONSTRAINT onboarding_magic_links_pkey PRIMARY KEY (id);


--
-- Name: otp_tokens otp_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_tokens
    ADD CONSTRAINT otp_tokens_pkey PRIMARY KEY (id);


--
-- Name: partial_payment_disallow partial_payment_disallow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partial_payment_disallow
    ADD CONSTRAINT partial_payment_disallow_pkey PRIMARY KEY (id);


--
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- Name: payment_activity_logs payment_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_activity_logs
    ADD CONSTRAINT payment_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: payment_records payment_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_records
    ADD CONSTRAINT payment_records_pkey PRIMARY KEY (id);


--
-- Name: payment_request_line_items payment_request_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_request_line_items
    ADD CONSTRAINT payment_request_line_items_pkey PRIMARY KEY (id);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (id);


--
-- Name: payment_settlement_batches payment_settlement_batches_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_settlement_batches
    ADD CONSTRAINT payment_settlement_batches_batch_number_key UNIQUE (batch_number);


--
-- Name: payment_settlement_batches payment_settlement_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_settlement_batches
    ADD CONSTRAINT payment_settlement_batches_pkey PRIMARY KEY (id);


--
-- Name: permission_cache permission_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_cache
    ADD CONSTRAINT permission_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: permission_cache permission_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_cache
    ADD CONSTRAINT permission_cache_pkey PRIMARY KEY (id);


--
-- Name: permission_keys permission_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_keys
    ADD CONSTRAINT permission_keys_pkey PRIMARY KEY (permission_key);


--
-- Name: personal_user_dictionary personal_user_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_user_dictionary
    ADD CONSTRAINT personal_user_dictionary_pkey PRIMARY KEY (id);


--
-- Name: personal_user_dictionary personal_user_dictionary_user_id_term_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_user_dictionary
    ADD CONSTRAINT personal_user_dictionary_user_id_term_key UNIQUE (user_id, term);


--
-- Name: plan_change_audit_log plan_change_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_change_audit_log
    ADD CONSTRAINT plan_change_audit_log_pkey PRIMARY KEY (id);


--
-- Name: plan_feature_controls plan_feature_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_feature_controls
    ADD CONSTRAINT plan_feature_controls_pkey PRIMARY KEY (id);


--
-- Name: preprocessing_settings preprocessing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprocessing_settings
    ADD CONSTRAINT preprocessing_settings_pkey PRIMARY KEY (id);


--
-- Name: preprocessing_settings preprocessing_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprocessing_settings
    ADD CONSTRAINT preprocessing_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: preprocessor_audit preprocessor_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprocessor_audit
    ADD CONSTRAINT preprocessor_audit_pkey PRIMARY KEY (id);


--
-- Name: protected_spans protected_spans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protected_spans
    ADD CONSTRAINT protected_spans_pkey PRIMARY KEY (id);


--
-- Name: qa_issue_comments qa_issue_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issue_comments
    ADD CONSTRAINT qa_issue_comments_pkey PRIMARY KEY (id);


--
-- Name: qa_issue_history qa_issue_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issue_history
    ADD CONSTRAINT qa_issue_history_pkey PRIMARY KEY (id);


--
-- Name: qa_issues qa_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issues
    ADD CONSTRAINT qa_issues_pkey PRIMARY KEY (id);


--
-- Name: qa_test_tasks qa_test_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_test_tasks
    ADD CONSTRAINT qa_test_tasks_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_violations rate_limit_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_violations
    ADD CONSTRAINT rate_limit_violations_pkey PRIMARY KEY (id);


--
-- Name: rbac_actions rbac_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_actions
    ADD CONSTRAINT rbac_actions_pkey PRIMARY KEY (id);


--
-- Name: rbac_permissions rbac_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_pkey PRIMARY KEY (id);


--
-- Name: rbac_roles rbac_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_roles
    ADD CONSTRAINT rbac_roles_pkey PRIMARY KEY (id);


--
-- Name: rbac_routes rbac_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_routes
    ADD CONSTRAINT rbac_routes_pkey PRIMARY KEY (id);


--
-- Name: rbac_user_permissions rbac_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_user_permissions
    ADD CONSTRAINT rbac_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: rbac_user_roles rbac_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_user_roles
    ADD CONSTRAINT rbac_user_roles_pkey PRIMARY KEY (id);


--
-- Name: recent_activity recent_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recent_activity
    ADD CONSTRAINT recent_activity_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_audit_log reconciliation_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_audit_log
    ADD CONSTRAINT reconciliation_audit_log_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_batches reconciliation_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_batches
    ADD CONSTRAINT reconciliation_batches_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_exceptions reconciliation_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_exceptions
    ADD CONSTRAINT reconciliation_exceptions_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_matches reconciliation_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_matches
    ADD CONSTRAINT reconciliation_matches_pkey PRIMARY KEY (id);


--
-- Name: rent_contract_details rent_contract_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_contract_details
    ADD CONSTRAINT rent_contract_details_pkey PRIMARY KEY (id);


--
-- Name: resource_consumption resource_consumption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_consumption
    ADD CONSTRAINT resource_consumption_pkey PRIMARY KEY (id);


--
-- Name: review_audit review_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_audit
    ADD CONSTRAINT review_audit_pkey PRIMARY KEY (id);


--
-- Name: review_comments review_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_pkey PRIMARY KEY (id);


--
-- Name: scheduled_payables scheduled_payables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_payables
    ADD CONSTRAINT scheduled_payables_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: settlement_audit_log settlement_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_audit_log
    ADD CONSTRAINT settlement_audit_log_pkey PRIMARY KEY (id);


--
-- Name: settlement_line_items settlement_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_line_items
    ADD CONSTRAINT settlement_line_items_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_settlement_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_settlement_number_key UNIQUE (settlement_number);


--
-- Name: spelling_dictionary spelling_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spelling_dictionary
    ADD CONSTRAINT spelling_dictionary_pkey PRIMARY KEY (id);


--
-- Name: spelling_dictionary spelling_dictionary_term_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spelling_dictionary
    ADD CONSTRAINT spelling_dictionary_term_key UNIQUE (term);


--
-- Name: subscription_audit_log subscription_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_audit_log
    ADD CONSTRAINT subscription_audit_log_pkey PRIMARY KEY (id);


--
-- Name: subscription_billing_ledger subscription_billing_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_billing_ledger
    ADD CONSTRAINT subscription_billing_ledger_pkey PRIMARY KEY (id);


--
-- Name: subscription_invoices subscription_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: subscription_invoices subscription_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_plan_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_plan_code_key UNIQUE (plan_code);


--
-- Name: super_admins super_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_pkey PRIMARY KEY (id);


--
-- Name: support_sessions support_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_sessions
    ADD CONSTRAINT support_sessions_pkey PRIMARY KEY (id);


--
-- Name: support_sessions support_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_sessions
    ADD CONSTRAINT support_sessions_session_token_key UNIQUE (session_token);


--
-- Name: support_ticket_comments support_ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_comments
    ADD CONSTRAINT support_ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: system_health_config system_health_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_config
    ADD CONSTRAINT system_health_config_pkey PRIMARY KEY (id);


--
-- Name: system_health_metrics system_health_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_metrics
    ADD CONSTRAINT system_health_metrics_pkey PRIMARY KEY (id);


--
-- Name: system_metric_daily system_metric_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metric_daily
    ADD CONSTRAINT system_metric_daily_pkey PRIMARY KEY (id);


--
-- Name: system_metric_samples system_metric_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metric_samples
    ADD CONSTRAINT system_metric_samples_pkey PRIMARY KEY (id);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_audit_logs task_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_audit_logs
    ADD CONSTRAINT task_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: task_audit task_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_audit
    ADD CONSTRAINT task_audit_pkey PRIMARY KEY (id);


--
-- Name: task_clarifications task_clarifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_clarifications
    ADD CONSTRAINT task_clarifications_pkey PRIMARY KEY (id);


--
-- Name: task_label_assignments task_label_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_label_assignments
    ADD CONSTRAINT task_label_assignments_pkey PRIMARY KEY (task_id, label_id);


--
-- Name: task_labels task_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_pkey PRIMARY KEY (id);


--
-- Name: task_messages task_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_messages
    ADD CONSTRAINT task_messages_pkey PRIMARY KEY (id);


--
-- Name: task_participants task_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_participants
    ADD CONSTRAINT task_participants_pkey PRIMARY KEY (id);


--
-- Name: task_participants task_participants_task_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_participants
    ADD CONSTRAINT task_participants_task_id_user_id_key UNIQUE (task_id, user_id);


--
-- Name: task_request_history task_request_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_request_history
    ADD CONSTRAINT task_request_history_pkey PRIMARY KEY (id);


--
-- Name: task_request_messages task_request_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_request_messages
    ADD CONSTRAINT task_request_messages_pkey PRIMARY KEY (id);


--
-- Name: task_requests task_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_pkey PRIMARY KEY (id);


--
-- Name: task_requests task_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_request_number_key UNIQUE (request_number);


--
-- Name: task_reviews task_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reviews
    ADD CONSTRAINT task_reviews_pkey PRIMARY KEY (id);


--
-- Name: task_time_entries task_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_time_entries
    ADD CONSTRAINT task_time_entries_pkey PRIMARY KEY (id);


--
-- Name: task_watchers task_watchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_watchers
    ADD CONSTRAINT task_watchers_pkey PRIMARY KEY (task_id, user_id);


--
-- Name: tenant_feature_unlocks tenant_feature_unlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_feature_unlocks
    ADD CONSTRAINT tenant_feature_unlocks_pkey PRIMARY KEY (id);


--
-- Name: tenant_plan_assignments tenant_plan_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_plan_assignments
    ADD CONSTRAINT tenant_plan_assignments_pkey PRIMARY KEY (id);


--
-- Name: tenant_quota_overrides tenant_quota_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_quota_overrides
    ADD CONSTRAINT tenant_quota_overrides_pkey PRIMARY KEY (id);


--
-- Name: tenant_quota_overrides tenant_quota_overrides_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_quota_overrides
    ADD CONSTRAINT tenant_quota_overrides_tenant_id_key UNIQUE (tenant_id);


--
-- Name: tenant_spend_limits tenant_spend_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_spend_limits
    ADD CONSTRAINT tenant_spend_limits_pkey PRIMARY KEY (id);


--
-- Name: tenant_spend_limits tenant_spend_limits_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_spend_limits
    ADD CONSTRAINT tenant_spend_limits_tenant_id_key UNIQUE (tenant_id);


--
-- Name: tenant_subscription tenant_subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscription
    ADD CONSTRAINT tenant_subscription_pkey PRIMARY KEY (id);


--
-- Name: tenant_subscription tenant_subscription_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscription
    ADD CONSTRAINT tenant_subscription_tenant_id_key UNIQUE (tenant_id);


--
-- Name: tenant_usage tenant_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage
    ADD CONSTRAINT tenant_usage_pkey PRIMARY KEY (id);


--
-- Name: tenant_usage tenant_usage_tenant_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage
    ADD CONSTRAINT tenant_usage_tenant_date_unique UNIQUE (tenant_id, date);


--
-- Name: thread_members thread_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_members
    ADD CONSTRAINT thread_members_pkey PRIMARY KEY (id);


--
-- Name: thread_messages_partitioned thread_messages_partitioned_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_partitioned
    ADD CONSTRAINT thread_messages_partitioned_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2025_09 thread_messages_p2025_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2025_09
    ADD CONSTRAINT thread_messages_p2025_09_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2025_10 thread_messages_p2025_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2025_10
    ADD CONSTRAINT thread_messages_p2025_10_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2025_11 thread_messages_p2025_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2025_11
    ADD CONSTRAINT thread_messages_p2025_11_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2025_12 thread_messages_p2025_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2025_12
    ADD CONSTRAINT thread_messages_p2025_12_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_01 thread_messages_p2026_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_01
    ADD CONSTRAINT thread_messages_p2026_01_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_02 thread_messages_p2026_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_02
    ADD CONSTRAINT thread_messages_p2026_02_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_03 thread_messages_p2026_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_03
    ADD CONSTRAINT thread_messages_p2026_03_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_04 thread_messages_p2026_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_04
    ADD CONSTRAINT thread_messages_p2026_04_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_05 thread_messages_p2026_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_05
    ADD CONSTRAINT thread_messages_p2026_05_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_06 thread_messages_p2026_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_06
    ADD CONSTRAINT thread_messages_p2026_06_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_07 thread_messages_p2026_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_07
    ADD CONSTRAINT thread_messages_p2026_07_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_08 thread_messages_p2026_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_08
    ADD CONSTRAINT thread_messages_p2026_08_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_09 thread_messages_p2026_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_09
    ADD CONSTRAINT thread_messages_p2026_09_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_10 thread_messages_p2026_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_10
    ADD CONSTRAINT thread_messages_p2026_10_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p2026_11 thread_messages_p2026_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p2026_11
    ADD CONSTRAINT thread_messages_p2026_11_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages_p_default thread_messages_p_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages_p_default
    ADD CONSTRAINT thread_messages_p_default_pkey PRIMARY KEY (id, "createdAt");


--
-- Name: thread_messages thread_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_pkey PRIMARY KEY (id);


--
-- Name: threads threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threads
    ADD CONSTRAINT threads_pkey PRIMARY KEY (id);


--
-- Name: customers uk_customers_tenant_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT uk_customers_tenant_code UNIQUE (tenant_id, code);


--
-- Name: customers uk_customers_tenant_gstin; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT uk_customers_tenant_gstin UNIQUE (tenant_id, gstin);


--
-- Name: items uk_items_tenant_barcode; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT uk_items_tenant_barcode UNIQUE (tenant_id, barcode);


--
-- Name: items uk_items_tenant_sku; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT uk_items_tenant_sku UNIQUE (tenant_id, sku);


--
-- Name: task_labels uk_task_labels_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT uk_task_labels_name UNIQUE (tenant_id, name);


--
-- Name: task_participants uk_task_participants; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_participants
    ADD CONSTRAINT uk_task_participants UNIQUE (task_id, user_id);


--
-- Name: vendors uk_vendors_tenant_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT uk_vendors_tenant_code UNIQUE (tenant_id, code);


--
-- Name: vendors uk_vendors_tenant_gstin; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT uk_vendors_tenant_gstin UNIQUE (tenant_id, gstin);


--
-- Name: client_subscriptions unique_active_subscription; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT unique_active_subscription UNIQUE (client_id);


--
-- Name: tenant_plan_assignments unique_active_tenant_plan; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_plan_assignments
    ADD CONSTRAINT unique_active_tenant_plan UNIQUE (tenant_id);


--
-- Name: reconciliation_matches unique_bank_line_match; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_matches
    ADD CONSTRAINT unique_bank_line_match UNIQUE (batch_id, bank_line_id);


--
-- Name: reconciliation_batches unique_batch_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_batches
    ADD CONSTRAINT unique_batch_number UNIQUE (tenant_id, batch_number);


--
-- Name: client_feature_overrides unique_client_flag_override; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_feature_overrides
    ADD CONSTRAINT unique_client_flag_override UNIQUE (client_id, flag_code);


--
-- Name: partial_payment_disallow unique_disallow_per_request; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partial_payment_disallow
    ADD CONSTRAINT unique_disallow_per_request UNIQUE (payment_request_id);


--
-- Name: feature_grace_periods unique_grace_period; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_grace_periods
    ADD CONSTRAINT unique_grace_period UNIQUE (tenant_id, feature_key, invoice_id);


--
-- Name: qa_issues unique_issue_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issues
    ADD CONSTRAINT unique_issue_code UNIQUE (tenant_id, issue_code);


--
-- Name: settlement_line_items unique_payment_in_settlement; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_line_items
    ADD CONSTRAINT unique_payment_in_settlement UNIQUE (settlement_id, payment_request_id, partial_sequence);


--
-- Name: plan_feature_controls unique_plan_feature; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_feature_controls
    ADD CONSTRAINT unique_plan_feature UNIQUE (plan_id, feature_code);


--
-- Name: bank_statements unique_statement_hash; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements
    ADD CONSTRAINT unique_statement_hash UNIQUE (tenant_id, file_hash);


--
-- Name: bank_templates unique_template_name_per_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_templates
    ADD CONSTRAINT unique_template_name_per_tenant UNIQUE (tenant_id, name);


--
-- Name: tenant_feature_unlocks unique_tenant_feature; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_feature_unlocks
    ADD CONSTRAINT unique_tenant_feature UNIQUE (tenant_id, feature_key);


--
-- Name: feature_usage_counters unique_tenant_feature_period; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_counters
    ADD CONSTRAINT unique_tenant_feature_period UNIQUE (tenant_id, feature_code, period_type, period_start);


--
-- Name: resource_consumption unique_tenant_snapshot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_consumption
    ADD CONSTRAINT unique_tenant_snapshot UNIQUE (tenant_id, snapshot_date);


--
-- Name: usage_counters unique_usage_counter; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT unique_usage_counter UNIQUE (tenant_id, user_id, feature_key, period, period_start);


--
-- Name: usage_block_log unique_user_feature_block; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_block_log
    ADD CONSTRAINT unique_user_feature_block UNIQUE (tenant_id, user_id, feature_key, block_date);


--
-- Name: branches uq_branches_tenant_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT uq_branches_tenant_code UNIQUE (tenant_id, branch_code);


--
-- Name: clients uq_clients_client_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT uq_clients_client_code UNIQUE (client_code);


--
-- Name: entity_id_registry uq_entity_registry_unique_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_id_registry
    ADD CONSTRAINT uq_entity_registry_unique_id UNIQUE (unique_id);


--
-- Name: entity_id_sequences uq_entity_sequences_type_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_id_sequences
    ADD CONSTRAINT uq_entity_sequences_type_date UNIQUE (entity_type, date_prefix);


--
-- Name: module_assignments uq_module_assignments_super_admin_module; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT uq_module_assignments_super_admin_module UNIQUE (super_admin_id, module_id);


--
-- Name: usage_block_log usage_block_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_block_log
    ADD CONSTRAINT usage_block_log_pkey PRIMARY KEY (id);


--
-- Name: usage_counters usage_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: user_bank_accounts user_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_bank_accounts
    ADD CONSTRAINT user_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: user_branches user_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_pkey PRIMARY KEY (id);


--
-- Name: user_education user_education_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_education
    ADD CONSTRAINT user_education_pkey PRIMARY KEY (id);


--
-- Name: user_emergency_contacts user_emergency_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_emergency_contacts
    ADD CONSTRAINT user_emergency_contacts_pkey PRIMARY KEY (id);


--
-- Name: user_kyc user_kyc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (id);


--
-- Name: users_enhanced users_enhanced_legacy_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_enhanced
    ADD CONSTRAINT users_enhanced_legacy_id_unique UNIQUE (legacy_id);


--
-- Name: users_enhanced users_enhanced_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_enhanced
    ADD CONSTRAINT users_enhanced_pkey PRIMARY KEY (id);


--
-- Name: vehicle_contract_details vehicle_contract_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_contract_details
    ADD CONSTRAINT vehicle_contract_details_pkey PRIMARY KEY (id);


--
-- Name: vendor_contract_details vendor_contract_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contract_details
    ADD CONSTRAINT vendor_contract_details_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: workflow_audit workflow_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_audit
    ADD CONSTRAINT workflow_audit_pkey PRIMARY KEY (id);


--
-- Name: workflow_feedback workflow_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_feedback
    ADD CONSTRAINT workflow_feedback_pkey PRIMARY KEY (id);


--
-- Name: workflow_permission_map workflow_permission_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_permission_map
    ADD CONSTRAINT workflow_permission_map_pkey PRIMARY KEY (id);


--
-- Name: workflow_permission_map workflow_permission_map_workflow_id_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_permission_map
    ADD CONSTRAINT workflow_permission_map_workflow_id_permission_key_key UNIQUE (workflow_id, permission_key);


--
-- Name: workflow_role_map workflow_role_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_role_map
    ADD CONSTRAINT workflow_role_map_pkey PRIMARY KEY (id);


--
-- Name: workflow_role_map workflow_role_map_workflow_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_role_map
    ADD CONSTRAINT workflow_role_map_workflow_id_role_id_key UNIQUE (workflow_id, role_id);


--
-- Name: workflow_task_history workflow_task_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_task_history
    ADD CONSTRAINT workflow_task_history_pkey PRIMARY KEY (id);


--
-- Name: workflow_tasks workflow_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_tasks
    ADD CONSTRAINT workflow_tasks_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_slug_key UNIQUE (slug);


--
-- Name: _ClientToClientSequence_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_ClientToClientSequence_B_index" ON public."_ClientToClientSequence" USING btree ("B");


--
-- Name: ai_usage_logs_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_usage_logs_client_id_idx ON public.ai_usage_logs USING btree (client_id);


--
-- Name: ai_usage_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_usage_logs_created_at_idx ON public.ai_usage_logs USING btree (created_at DESC);


--
-- Name: approval_levels_level_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX approval_levels_level_key ON public.approval_levels USING btree (level);


--
-- Name: approver_configurations_userId_level_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "approver_configurations_userId_level_key" ON public.approver_configurations USING btree ("userId", level);


--
-- Name: assistant_memory_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "assistant_memory_userId_key" ON public.assistant_memory USING btree ("userId");


--
-- Name: idx_audit_logs_part_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_part_created ON ONLY public.audit_logs_partitioned USING btree (created_at DESC);


--
-- Name: audit_logs_p2025_12_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2025_12_created_at_idx ON public.audit_logs_p2025_12 USING btree (created_at DESC);


--
-- Name: idx_audit_logs_part_table_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_part_table_action ON ONLY public.audit_logs_partitioned USING btree (table_name, action);


--
-- Name: audit_logs_p2025_12_table_name_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2025_12_table_name_action_idx ON public.audit_logs_p2025_12 USING btree (table_name, action);


--
-- Name: audit_logs_p2026_01_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_01_created_at_idx ON public.audit_logs_p2026_01 USING btree (created_at DESC);


--
-- Name: audit_logs_p2026_01_table_name_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_01_table_name_action_idx ON public.audit_logs_p2026_01 USING btree (table_name, action);


--
-- Name: audit_logs_p2026_02_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_02_created_at_idx ON public.audit_logs_p2026_02 USING btree (created_at DESC);


--
-- Name: audit_logs_p2026_02_table_name_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_02_table_name_action_idx ON public.audit_logs_p2026_02 USING btree (table_name, action);


--
-- Name: audit_logs_p2026_03_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_03_created_at_idx ON public.audit_logs_p2026_03 USING btree (created_at DESC);


--
-- Name: audit_logs_p2026_03_table_name_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_03_table_name_action_idx ON public.audit_logs_p2026_03 USING btree (table_name, action);


--
-- Name: audit_logs_p2026_04_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_04_created_at_idx ON public.audit_logs_p2026_04 USING btree (created_at DESC);


--
-- Name: audit_logs_p2026_04_table_name_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_04_table_name_action_idx ON public.audit_logs_p2026_04 USING btree (table_name, action);


--
-- Name: audit_logs_p2026_05_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_05_created_at_idx ON public.audit_logs_p2026_05 USING btree (created_at DESC);


--
-- Name: audit_logs_p2026_05_table_name_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p2026_05_table_name_action_idx ON public.audit_logs_p2026_05 USING btree (table_name, action);


--
-- Name: audit_logs_p_default_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p_default_created_at_idx ON public.audit_logs_p_default USING btree (created_at DESC);


--
-- Name: audit_logs_p_default_table_name_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_p_default_table_name_action_idx ON public.audit_logs_p_default USING btree (table_name, action);


--
-- Name: billing_overrides_is_active_valid_until_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX billing_overrides_is_active_valid_until_idx ON public.billing_overrides USING btree (is_active, valid_until);


--
-- Name: bills_taskId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "bills_taskId_key" ON public.bills USING btree ("taskId");


--
-- Name: branches_branch_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_branch_code_idx ON public.branches USING btree (branch_code);


--
-- Name: branches_branch_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX branches_branch_code_key ON public.branches USING btree (branch_code);


--
-- Name: branches_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_tenant_id_idx ON public.branches USING btree (tenant_id);


--
-- Name: clarification_audit_actor_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clarification_audit_actor_id_index ON public.clarification_audit USING btree (actor_id);


--
-- Name: clarification_audit_clarification_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clarification_audit_clarification_id_index ON public.clarification_audit USING btree (clarification_id);


--
-- Name: clarification_audit_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clarification_audit_created_at_index ON public.clarification_audit USING btree (created_at);


--
-- Name: clarification_audit_task_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clarification_audit_task_id_index ON public.clarification_audit USING btree (task_id);


--
-- Name: client_feature_overrides_client_id_flag_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX client_feature_overrides_client_id_flag_code_key ON public.client_feature_overrides USING btree (client_id, flag_code);


--
-- Name: client_feature_overrides_flag_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_feature_overrides_flag_code_idx ON public.client_feature_overrides USING btree (flag_code);


--
-- Name: client_module_permissions_client_id_module_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX client_module_permissions_client_id_module_id_key ON public.client_module_permissions USING btree (client_id, module_id);


--
-- Name: client_role_assignments_client_id_role_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX client_role_assignments_client_id_role_id_key ON public.client_role_assignments USING btree (client_id, role_id);


--
-- Name: client_sequences_client_type_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX client_sequences_client_type_year_key ON public.client_sequences USING btree (client_type, year);


--
-- Name: client_subscriptions_client_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX client_subscriptions_client_id_key ON public.client_subscriptions USING btree (client_id);


--
-- Name: client_subscriptions_next_billing_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_subscriptions_next_billing_date_idx ON public.client_subscriptions USING btree (next_billing_date);


--
-- Name: client_subscriptions_plan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_subscriptions_plan_id_idx ON public.client_subscriptions USING btree (plan_id);


--
-- Name: client_subscriptions_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_subscriptions_state_idx ON public.client_subscriptions USING btree (state);


--
-- Name: idx_client_usage_part_client_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_part_client_date ON ONLY public.client_usage_events_partitioned USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2025_09_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2025_09_client_id_occurred_at_idx ON public.client_usage_events_p2025_09 USING btree (client_id, occurred_at DESC);


--
-- Name: idx_client_usage_part_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_part_type ON ONLY public.client_usage_events_partitioned USING btree (event_type);


--
-- Name: client_usage_events_p2025_09_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2025_09_event_type_idx ON public.client_usage_events_p2025_09 USING btree (event_type);


--
-- Name: client_usage_events_p2025_10_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2025_10_client_id_occurred_at_idx ON public.client_usage_events_p2025_10 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2025_10_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2025_10_event_type_idx ON public.client_usage_events_p2025_10 USING btree (event_type);


--
-- Name: client_usage_events_p2025_11_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2025_11_client_id_occurred_at_idx ON public.client_usage_events_p2025_11 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2025_11_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2025_11_event_type_idx ON public.client_usage_events_p2025_11 USING btree (event_type);


--
-- Name: client_usage_events_p2025_12_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2025_12_client_id_occurred_at_idx ON public.client_usage_events_p2025_12 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2025_12_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2025_12_event_type_idx ON public.client_usage_events_p2025_12 USING btree (event_type);


--
-- Name: client_usage_events_p2026_01_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_01_client_id_occurred_at_idx ON public.client_usage_events_p2026_01 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_01_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_01_event_type_idx ON public.client_usage_events_p2026_01 USING btree (event_type);


--
-- Name: client_usage_events_p2026_02_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_02_client_id_occurred_at_idx ON public.client_usage_events_p2026_02 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_02_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_02_event_type_idx ON public.client_usage_events_p2026_02 USING btree (event_type);


--
-- Name: client_usage_events_p2026_03_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_03_client_id_occurred_at_idx ON public.client_usage_events_p2026_03 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_03_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_03_event_type_idx ON public.client_usage_events_p2026_03 USING btree (event_type);


--
-- Name: client_usage_events_p2026_04_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_04_client_id_occurred_at_idx ON public.client_usage_events_p2026_04 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_04_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_04_event_type_idx ON public.client_usage_events_p2026_04 USING btree (event_type);


--
-- Name: client_usage_events_p2026_05_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_05_client_id_occurred_at_idx ON public.client_usage_events_p2026_05 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_05_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_05_event_type_idx ON public.client_usage_events_p2026_05 USING btree (event_type);


--
-- Name: client_usage_events_p2026_06_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_06_client_id_occurred_at_idx ON public.client_usage_events_p2026_06 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_06_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_06_event_type_idx ON public.client_usage_events_p2026_06 USING btree (event_type);


--
-- Name: client_usage_events_p2026_07_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_07_client_id_occurred_at_idx ON public.client_usage_events_p2026_07 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_07_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_07_event_type_idx ON public.client_usage_events_p2026_07 USING btree (event_type);


--
-- Name: client_usage_events_p2026_08_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_08_client_id_occurred_at_idx ON public.client_usage_events_p2026_08 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_08_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_08_event_type_idx ON public.client_usage_events_p2026_08 USING btree (event_type);


--
-- Name: client_usage_events_p2026_09_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_09_client_id_occurred_at_idx ON public.client_usage_events_p2026_09 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_09_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_09_event_type_idx ON public.client_usage_events_p2026_09 USING btree (event_type);


--
-- Name: client_usage_events_p2026_10_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_10_client_id_occurred_at_idx ON public.client_usage_events_p2026_10 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_10_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_10_event_type_idx ON public.client_usage_events_p2026_10 USING btree (event_type);


--
-- Name: client_usage_events_p2026_11_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_11_client_id_occurred_at_idx ON public.client_usage_events_p2026_11 USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p2026_11_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p2026_11_event_type_idx ON public.client_usage_events_p2026_11 USING btree (event_type);


--
-- Name: client_usage_events_p_default_client_id_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p_default_client_id_occurred_at_idx ON public.client_usage_events_p_default USING btree (client_id, occurred_at DESC);


--
-- Name: client_usage_events_p_default_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_usage_events_p_default_event_type_idx ON public.client_usage_events_p_default USING btree (event_type);


--
-- Name: clients_client_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clients_client_code_key ON public.clients USING btree (client_code);


--
-- Name: clients_client_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clients_client_number_key ON public.clients USING btree (client_number);


--
-- Name: clients_public_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clients_public_code_key ON public.clients USING btree (public_code);


--
-- Name: contract_accounting_maps_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_accounting_maps_contract_id_idx ON public.contract_accounting_maps USING btree (contract_id);


--
-- Name: contract_accounting_maps_contract_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contract_accounting_maps_contract_id_key ON public.contract_accounting_maps USING btree (contract_id);


--
-- Name: contract_accounting_maps_expense_ledger_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_accounting_maps_expense_ledger_id_idx ON public.contract_accounting_maps USING btree (expense_ledger_id);


--
-- Name: contract_audit_logs_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_audit_logs_contract_id_idx ON public.contract_audit_logs USING btree (contract_id);


--
-- Name: contract_audit_logs_performed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_audit_logs_performed_at_idx ON public.contract_audit_logs USING btree (performed_at DESC);


--
-- Name: contract_documents_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_documents_contract_id_idx ON public.contract_documents USING btree (contract_id);


--
-- Name: contract_documents_document_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_documents_document_type_idx ON public.contract_documents USING btree (document_type);


--
-- Name: contract_financials_contract_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contract_financials_contract_id_key ON public.contract_financials USING btree (contract_id);


--
-- Name: contract_reminders_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_reminders_contract_id_idx ON public.contract_reminders USING btree (contract_id);


--
-- Name: contract_reminders_is_sent_reminder_days_before_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_reminders_is_sent_reminder_days_before_idx ON public.contract_reminders USING btree (is_sent, reminder_days_before);


--
-- Name: contracts_contract_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contracts_contract_number_key ON public.contracts USING btree (contract_number);


--
-- Name: contracts_contract_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_contract_type_idx ON public.contracts USING btree (contract_type);


--
-- Name: contracts_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_created_at_idx ON public.contracts USING btree (created_at DESC);


--
-- Name: contracts_end_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_end_date_idx ON public.contracts USING btree (end_date);


--
-- Name: contracts_party_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_party_name_idx ON public.contracts USING btree (party_name);


--
-- Name: contracts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_status_idx ON public.contracts USING btree (status);


--
-- Name: contracts_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_tenant_id_idx ON public.contracts USING btree (tenant_id);


--
-- Name: enterprise_admins_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX enterprise_admins_email_key ON public.enterprise_admins USING btree (email);


--
-- Name: expenses_paymentRequestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "expenses_paymentRequestId_key" ON public.expenses USING btree ("paymentRequestId");


--
-- Name: expenses_requestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "expenses_requestId_key" ON public.expenses USING btree ("requestId");


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_action ON public.payment_activity_logs USING btree (action);


--
-- Name: idx_activity_logs_payment_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_payment_request ON public.payment_activity_logs USING btree ("paymentRequestId");


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user ON public.payment_activity_logs USING btree ("userId");


--
-- Name: idx_admin_role_assign_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_role_assign_active ON public.admin_role_assignments USING btree (is_active);


--
-- Name: idx_admin_role_assign_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_role_assign_assignee ON public.admin_role_assignments USING btree (assignee_id);


--
-- Name: idx_admin_role_assign_assigner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_role_assign_assigner ON public.admin_role_assignments USING btree (assigner_type, assigner_id);


--
-- Name: idx_admin_role_assign_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_role_assign_role ON public.admin_role_assignments USING btree (role_id);


--
-- Name: idx_analytics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_analytics_date ON public.chat_training_analytics USING btree (date);


--
-- Name: idx_api_keys_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_client_id ON public.api_keys USING btree (client_id);


--
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_approval_instances_current_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_instances_current_stage ON public.approval_instances USING btree (current_stage_id);


--
-- Name: idx_approval_instances_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_instances_entity ON public.approval_instances USING btree (entity_type, entity_id);


--
-- Name: idx_approval_instances_initiated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_instances_initiated_by ON public.approval_instances USING btree (initiated_by);


--
-- Name: idx_approval_instances_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_instances_status ON public.approval_instances USING btree (status);


--
-- Name: idx_approval_instances_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_instances_tenant ON public.approval_instances USING btree (tenant_id);


--
-- Name: idx_approval_levels_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_levels_level ON public.approval_levels USING btree (level);


--
-- Name: idx_approvals_approver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_approver ON public.approvals USING btree ("approverId");


--
-- Name: idx_approvals_approver_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_approver_pending ON public.approvals USING btree ("approverId") WHERE ((action)::text = 'PENDING'::text);


--
-- Name: idx_approvals_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_level ON public.approvals USING btree (level);


--
-- Name: idx_approvals_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_task ON public.approvals USING btree ("taskId");


--
-- Name: idx_approver_config_availability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approver_config_availability ON public.approver_configurations USING btree ("isActive", "isAvailable");


--
-- Name: idx_approver_config_level_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approver_config_level_active ON public.approver_configurations USING btree (level, "isActive");


--
-- Name: idx_approver_config_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approver_config_user ON public.approver_configurations USING btree ("userId");


--
-- Name: idx_assistant_memory_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assistant_memory_module ON public.assistant_memory USING btree ("lastModule");


--
-- Name: idx_assistant_memory_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assistant_memory_user ON public.assistant_memory USING btree ("userId");


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_action ON public.micro_unlock_audit_log USING btree (action);


--
-- Name: idx_audit_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_category ON public.micro_unlock_audit_log USING btree (action_category);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.micro_unlock_audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_action ON public.approval_audit_log USING btree (action);


--
-- Name: idx_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_actor ON public.approval_audit_log USING btree (performed_by);


--
-- Name: idx_audit_log_instance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_instance ON public.approval_audit_log USING btree (approval_instance_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_composite ON public.audit_logs USING btree (table_name, action, created_at DESC);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_dml_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_dml_changed_at ON public.audit_logs_dml USING btree (changed_at);


--
-- Name: idx_audit_logs_dml_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_dml_changed_by ON public.audit_logs_dml USING btree (changed_by);


--
-- Name: idx_audit_logs_dml_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_dml_table ON public.audit_logs_dml USING btree (table_name);


--
-- Name: idx_audit_logs_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_request ON public.audit_logs USING btree (request_id);


--
-- Name: idx_audit_logs_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_service ON public.audit_logs USING btree (service_name);


--
-- Name: idx_audit_logs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_session_id ON public.audit_logs USING btree (session_id);


--
-- Name: idx_audit_logs_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_table ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_tenant ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_tenant ON public.micro_unlock_audit_log USING btree (tenant_id);


--
-- Name: idx_bank_statements_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statements_account ON public.bank_statements USING btree (bank_account_id);


--
-- Name: idx_bank_statements_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statements_hash ON public.bank_statements USING btree (file_hash);


--
-- Name: idx_bank_statements_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statements_period ON public.bank_statements USING btree (period_start, period_end);


--
-- Name: idx_bank_statements_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statements_tenant ON public.bank_statements USING btree (tenant_id);


--
-- Name: idx_bank_templates_bank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_templates_bank ON public.bank_templates USING btree (bank_name) WHERE (is_active = true);


--
-- Name: idx_bank_templates_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_templates_default ON public.bank_templates USING btree (tenant_id, bank_name, is_default) WHERE ((is_default = true) AND (is_active = true));


--
-- Name: idx_bank_templates_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_templates_tenant ON public.bank_templates USING btree (tenant_id) WHERE (is_active = true);


--
-- Name: idx_billing_overrides_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_overrides_active ON public.billing_overrides USING btree (is_active, valid_until);


--
-- Name: idx_billing_overrides_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_overrides_client ON public.billing_overrides USING btree (client_id);


--
-- Name: idx_billing_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_period ON public.subscription_billing_ledger USING btree (billing_period_start, billing_period_end);


--
-- Name: idx_billing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_status ON public.subscription_billing_ledger USING btree (status);


--
-- Name: idx_billing_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_tenant ON public.subscription_billing_ledger USING btree (tenant_id);


--
-- Name: idx_bills_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_created ON public.bills USING btree ("createdAt" DESC);


--
-- Name: idx_bills_ocr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_ocr_status ON public.bills USING btree ("ocrStatus");


--
-- Name: idx_bills_task_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_task_created ON public.bills USING btree ("taskCreated");


--
-- Name: idx_bills_uploader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_uploader ON public.bills USING btree ("uploadedById");


--
-- Name: idx_block_log_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_block_log_date ON public.usage_block_log USING btree (block_date DESC);


--
-- Name: idx_block_log_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_block_log_feature ON public.usage_block_log USING btree (feature_key);


--
-- Name: idx_block_log_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_block_log_tenant ON public.usage_block_log USING btree (tenant_id);


--
-- Name: idx_block_log_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_block_log_unresolved ON public.usage_block_log USING btree (tenant_id, resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_branches_tenant_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_tenant_active ON public.branches USING btree (tenant_id) WHERE (is_active = true);


--
-- Name: idx_bsl_amount; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsl_amount ON public.bank_statement_lines USING btree (amount, direction);


--
-- Name: idx_bsl_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsl_date ON public.bank_statement_lines USING btree (txn_date);


--
-- Name: idx_bsl_match_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsl_match_query ON public.bank_statement_lines USING btree (tenant_id, direction, amount, txn_date, utr) WHERE ((is_matched = false) AND (direction = 'CREDIT'::public.txn_direction));


--
-- Name: idx_bsl_matching; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsl_matching ON public.bank_statement_lines USING btree (tenant_id, utr, amount, txn_date) WHERE (is_matched = false);


--
-- Name: idx_bsl_statement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsl_statement ON public.bank_statement_lines USING btree (statement_id);


--
-- Name: idx_bsl_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsl_tenant ON public.bank_statement_lines USING btree (tenant_id);


--
-- Name: idx_bsl_unmatched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsl_unmatched ON public.bank_statement_lines USING btree (statement_id, is_matched) WHERE (is_matched = false);


--
-- Name: idx_bsl_utr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsl_utr ON public.bank_statement_lines USING btree (utr) WHERE (utr IS NOT NULL);


--
-- Name: idx_call_logs_initiator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_logs_initiator ON public.call_logs USING btree (initiator_id);


--
-- Name: idx_call_logs_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_logs_room ON public.call_logs USING btree (room_name);


--
-- Name: idx_call_logs_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_logs_started ON public.call_logs USING btree (started_at);


--
-- Name: idx_call_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_logs_status ON public.call_logs USING btree (status);


--
-- Name: idx_call_logs_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_logs_thread ON public.call_logs USING btree (thread_id);


--
-- Name: idx_chat_analytics_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_analytics_intent ON public.chat_analytics USING btree (intent);


--
-- Name: idx_chat_analytics_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_analytics_user ON public.chat_analytics USING btree (user_id);


--
-- Name: idx_chat_context_conv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_context_conv ON public.chat_conversation_context USING btree (conversation_id);


--
-- Name: idx_chat_context_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_context_user ON public.chat_conversation_context USING btree (user_id);


--
-- Name: idx_chat_conv_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conv_active ON public.chat_conversations USING btree (is_active);


--
-- Name: idx_chat_conv_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conv_context ON public.chat_conversations USING btree (context_type);


--
-- Name: idx_chat_conv_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conv_updated ON public.chat_conversations USING btree (last_message_at DESC);


--
-- Name: idx_chat_conv_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conv_user ON public.chat_conversations USING btree (user_id);


--
-- Name: idx_chat_feedback_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_feedback_processed ON public.chat_feedback USING btree (processed);


--
-- Name: idx_chat_feedback_training; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_feedback_training ON public.chat_feedback USING btree (training_data_id);


--
-- Name: idx_chat_interactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_interactions_user ON public.chat_interactions USING btree (user_id);


--
-- Name: idx_chat_mistakes_freq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_mistakes_freq ON public.chat_common_mistakes USING btree (frequency DESC);


--
-- Name: idx_chat_mistakes_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_chat_mistakes_unique ON public.chat_common_mistakes USING btree (incorrect_word, correct_word);


--
-- Name: idx_chat_msg_conv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_msg_conv ON public.chat_messages USING btree (conversation_id);


--
-- Name: idx_chat_msg_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_msg_created ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_chat_msg_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_msg_intent ON public.chat_messages USING btree (intent);


--
-- Name: idx_chat_msg_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_msg_user ON public.chat_messages USING btree (user_id);


--
-- Name: idx_chat_pref_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_pref_user ON public.chat_user_preferences USING btree (user_id);


--
-- Name: idx_chat_semantic_cache_matched_training_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_semantic_cache_matched_training_id ON public.chat_semantic_cache USING btree (matched_training_id);


--
-- Name: idx_chat_training_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_training_active ON public.chat_training_data USING btree (is_active);


--
-- Name: idx_chat_training_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_training_category ON public.chat_training_data USING btree (category);


--
-- Name: idx_chat_training_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_training_intent ON public.chat_training_data USING btree (intent);


--
-- Name: idx_client_daily_usage_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_daily_usage_client ON public.client_daily_usage USING btree (client_id);


--
-- Name: idx_client_daily_usage_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_daily_usage_module ON public.client_daily_usage USING btree (module_id);


--
-- Name: idx_client_module_permissions_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_module_permissions_client ON public.client_module_permissions USING btree (client_id);


--
-- Name: idx_client_module_permissions_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_module_permissions_module ON public.client_module_permissions USING btree (module_id);


--
-- Name: idx_client_role_assignments_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_role_assignments_client ON public.client_role_assignments USING btree (client_id);


--
-- Name: idx_client_role_assignments_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_role_assignments_role ON public.client_role_assignments USING btree (role_id);


--
-- Name: idx_client_subscriptions_billing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_subscriptions_billing ON public.client_subscriptions USING btree (next_billing_date);


--
-- Name: idx_client_subscriptions_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_subscriptions_client ON public.client_subscriptions USING btree (client_id);


--
-- Name: idx_client_subscriptions_grace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_subscriptions_grace ON public.client_subscriptions USING btree (grace_period_end) WHERE (grace_period_end IS NOT NULL);


--
-- Name: idx_client_subscriptions_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_subscriptions_plan ON public.client_subscriptions USING btree (plan_id);


--
-- Name: idx_client_subscriptions_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_subscriptions_state ON public.client_subscriptions USING btree (state);


--
-- Name: idx_client_usage_events_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_events_client ON public.client_usage_events USING btree (client_id);


--
-- Name: idx_client_usage_events_client_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_events_client_date ON public.client_usage_events USING btree (client_id, occurred_at DESC);


--
-- Name: idx_client_usage_events_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_events_composite ON public.client_usage_events USING btree (client_id, module_id, occurred_at DESC);


--
-- Name: idx_client_usage_events_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_events_module ON public.client_usage_events USING btree (module_id);


--
-- Name: idx_client_usage_events_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_events_time ON public.client_usage_events USING btree (occurred_at);


--
-- Name: idx_client_usage_events_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_events_type_date ON public.client_usage_events USING btree (event_type, occurred_at DESC);


--
-- Name: idx_client_usage_events_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_usage_events_user_date ON public.client_usage_events USING btree (user_id, occurred_at DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_clients_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_code ON public.clients USING btree (client_code);


--
-- Name: idx_clients_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_created_by ON public.clients USING btree (created_by);


--
-- Name: idx_clients_product_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_product_type ON public.clients USING btree ("productType");


--
-- Name: idx_clients_stripe_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_stripe_customer ON public.clients USING btree (stripe_customer_id);


--
-- Name: idx_clients_stripe_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_stripe_subscription ON public.clients USING btree (stripe_subscription_id);


--
-- Name: idx_clients_super_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_super_admin ON public.clients USING btree (super_admin_id);


--
-- Name: idx_clients_super_admin_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_super_admin_active ON public.clients USING btree (super_admin_id) WHERE (is_active = true);


--
-- Name: idx_clients_trial_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_trial_expires ON public.clients USING btree (trial_end_date) WHERE (trial_expired = false);


--
-- Name: idx_clients_unique_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_unique_id ON public.clients USING btree (unique_id);


--
-- Name: idx_context_slots_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_context_slots_unique ON public.chat_context_slots USING btree (intent, slot_name);


--
-- Name: idx_customers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_active ON public.customers USING btree (tenant_id, is_active);


--
-- Name: idx_customers_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_created ON public.customers USING btree (tenant_id, created_at DESC);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_email ON public.customers USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_customers_gstin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_gstin ON public.customers USING btree (gstin) WHERE (gstin IS NOT NULL);


--
-- Name: idx_customers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_name ON public.customers USING btree (tenant_id, name);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: idx_customers_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_search ON public.customers USING gin (to_tsvector('english'::regconfig, (((((COALESCE(name, ''::character varying))::text || ' '::text) || (COALESCE(code, ''::character varying))::text) || ' '::text) || (COALESCE(email, ''::character varying))::text)));


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_status ON public.customers USING btree (tenant_id, status);


--
-- Name: idx_customers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_tenant ON public.customers USING btree (tenant_id);


--
-- Name: idx_customers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_type ON public.customers USING btree (tenant_id, customer_type);


--
-- Name: idx_enforcement_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enforcement_decision ON public.enforcement_decision_log USING btree (decision);


--
-- Name: idx_enforcement_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enforcement_feature ON public.enforcement_decision_log USING btree (feature_code);


--
-- Name: idx_enforcement_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enforcement_tenant ON public.enforcement_decision_log USING btree (tenant_id);


--
-- Name: idx_enforcement_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enforcement_time ON public.enforcement_decision_log USING btree (decided_at DESC);


--
-- Name: idx_entity_registry_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_registry_created_at ON public.entity_id_registry USING btree (created_at DESC);


--
-- Name: idx_entity_registry_db_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_registry_db_id ON public.entity_id_registry USING btree (entity_db_id);


--
-- Name: idx_entity_registry_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_registry_type ON public.entity_id_registry USING btree (entity_type);


--
-- Name: idx_entity_registry_type_db_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_registry_type_db_id ON public.entity_id_registry USING btree (entity_type, entity_db_id);


--
-- Name: idx_entity_sequences_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_sequences_date ON public.entity_id_sequences USING btree (date_prefix);


--
-- Name: idx_entity_sequences_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_sequences_type ON public.entity_id_sequences USING btree (entity_type);


--
-- Name: idx_erp_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_erp_users_is_active ON public.users_enhanced USING btree (is_active);


--
-- Name: idx_erp_users_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_erp_users_legacy_id ON public.users_enhanced USING btree (legacy_id);


--
-- Name: idx_erp_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_erp_users_role ON public.users_enhanced USING btree (role);


--
-- Name: idx_erp_users_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_erp_users_tenant_id ON public.users_enhanced USING btree (tenant_id);


--
-- Name: idx_erp_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_erp_users_username ON public.users_enhanced USING btree (username);


--
-- Name: idx_error_logs_error_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_error_code ON public.error_logs USING btree (error_code);


--
-- Name: idx_error_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_timestamp ON public.error_logs USING btree ("timestamp" DESC);


--
-- Name: idx_events_api_requests; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_api_requests ON public.events USING btree (client_id, created_at) WHERE ((event_type)::text = 'api_request'::text);


--
-- Name: idx_events_client_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_client_created ON public.events USING btree (client_id, created_at);


--
-- Name: idx_events_client_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_client_type ON public.events USING btree (client_id, event_type);


--
-- Name: idx_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_created ON public.events USING btree (created_at);


--
-- Name: idx_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_type ON public.events USING btree (event_type);


--
-- Name: idx_expenses_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_client ON public.expenses USING btree ("clientId");


--
-- Name: idx_expenses_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_creator ON public.expenses USING btree ("createdById");


--
-- Name: idx_expenses_payment_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_payment_request ON public.expenses USING btree ("paymentRequestId");


--
-- Name: idx_expenses_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_request_id ON public.expenses USING btree ("requestId");


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_failed_login_attempted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_failed_login_attempted_at ON public.failed_login_attempts USING btree (attempted_at);


--
-- Name: idx_failed_login_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_failed_login_ip ON public.failed_login_attempts USING btree (ip_address);


--
-- Name: idx_failed_login_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_failed_login_user_id ON public.failed_login_attempts USING btree (user_id);


--
-- Name: idx_fallback_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fallback_logs_module ON public.fallback_logs USING btree (module_name);


--
-- Name: idx_fallback_logs_module_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fallback_logs_module_operation ON public.fallback_logs USING btree (module_name, operation_name);


--
-- Name: idx_fallback_logs_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fallback_logs_operation ON public.fallback_logs USING btree (operation_name);


--
-- Name: idx_fallback_logs_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fallback_logs_resolved ON public.fallback_logs USING btree (resolved);


--
-- Name: idx_fallback_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fallback_logs_severity ON public.fallback_logs USING btree (severity);


--
-- Name: idx_fallback_logs_severity_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fallback_logs_severity_time ON public.fallback_logs USING btree (severity, fallback_triggered_at DESC);


--
-- Name: idx_fallback_logs_triggered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fallback_logs_triggered_at ON public.fallback_logs USING btree (fallback_triggered_at DESC);


--
-- Name: idx_fallback_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fallback_logs_user ON public.fallback_logs USING btree (user_id);


--
-- Name: idx_feature_catalog_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_catalog_active ON public.feature_catalog USING btree (is_active, category);


--
-- Name: idx_feature_catalog_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_catalog_key ON public.feature_catalog USING btree (feature_key);


--
-- Name: idx_feature_defs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_defs_category ON public.master_feature_definitions USING btree (category);


--
-- Name: idx_feature_defs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_defs_code ON public.master_feature_definitions USING btree (feature_code);


--
-- Name: idx_feature_overrides_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_overrides_client ON public.client_feature_overrides USING btree (client_id);


--
-- Name: idx_feature_overrides_flag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_overrides_flag ON public.client_feature_overrides USING btree (flag_code);


--
-- Name: idx_grace_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grace_end ON public.feature_grace_periods USING btree (grace_end) WHERE ((status)::text = 'ACTIVE'::text);


--
-- Name: idx_grace_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grace_status ON public.feature_grace_periods USING btree (status) WHERE ((status)::text = 'ACTIVE'::text);


--
-- Name: idx_grace_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grace_tenant ON public.feature_grace_periods USING btree (tenant_id);


--
-- Name: idx_idempotency_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_expires ON public.idempotency_keys USING btree (expires_at);


--
-- Name: idx_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_key ON public.idempotency_keys USING btree (key);


--
-- Name: idx_idempotency_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_tenant ON public.idempotency_keys USING btree (tenant_id);


--
-- Name: idx_intent_flow_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_intent_flow_unique ON public.chat_intent_flows USING btree (from_intent, to_intent);


--
-- Name: idx_invoice_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_due ON public.micro_unlock_invoices USING btree (due_date) WHERE (status = ANY (ARRAY['PENDING'::public.micro_invoice_status, 'GENERATED'::public.micro_invoice_status, 'SENT'::public.micro_invoice_status]));


--
-- Name: idx_invoice_items_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_feature ON public.billing_invoice_items USING btree (feature_key);


--
-- Name: idx_invoice_items_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_invoice ON public.billing_invoice_items USING btree (invoice_id);


--
-- Name: idx_invoice_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_status ON public.micro_unlock_invoices USING btree (status);


--
-- Name: idx_invoice_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_tenant ON public.micro_unlock_invoices USING btree (tenant_id);


--
-- Name: idx_items_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_active ON public.items USING btree (tenant_id, is_active);


--
-- Name: idx_items_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_barcode ON public.items USING btree (barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_category ON public.items USING btree (tenant_id, category_id) WHERE (category_id IS NOT NULL);


--
-- Name: idx_items_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_created ON public.items USING btree (tenant_id, created_at DESC);


--
-- Name: idx_items_hsn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_hsn ON public.items USING btree (hsn_code) WHERE (hsn_code IS NOT NULL);


--
-- Name: idx_items_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_name ON public.items USING btree (tenant_id, name);


--
-- Name: idx_items_reorder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_reorder ON public.items USING btree (tenant_id) WHERE ((current_stock <= reorder_level) AND (track_inventory = true));


--
-- Name: idx_items_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_search ON public.items USING gin (to_tsvector('english'::regconfig, (((((COALESCE(name, ''::character varying))::text || ' '::text) || (COALESCE(sku, ''::character varying))::text) || ' '::text) || (COALESCE(short_description, ''::character varying))::text)));


--
-- Name: idx_items_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_sku ON public.items USING btree (tenant_id, sku);


--
-- Name: idx_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_status ON public.items USING btree (tenant_id, status);


--
-- Name: idx_items_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_tenant ON public.items USING btree (tenant_id);


--
-- Name: idx_items_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_type ON public.items USING btree (tenant_id, item_type);


--
-- Name: idx_learning_queue_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_queue_source ON public.chat_learning_queue USING btree (source);


--
-- Name: idx_learning_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_queue_status ON public.chat_learning_queue USING btree (status);


--
-- Name: idx_learning_queue_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_queue_trgm ON public.chat_learning_queue USING gin (user_message public.gin_trgm_ops);


--
-- Name: idx_line_items_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_payment ON public.settlement_line_items USING btree (payment_request_id);


--
-- Name: idx_line_items_payment_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_payment_request ON public.payment_request_line_items USING btree ("paymentRequestId");


--
-- Name: idx_line_items_settlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_settlement ON public.settlement_line_items USING btree (settlement_id);


--
-- Name: idx_line_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_status ON public.settlement_line_items USING btree (status);


--
-- Name: idx_load_test_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_load_test_source ON public.load_test_reports USING btree (source);


--
-- Name: idx_load_test_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_load_test_timestamp ON public.load_test_reports USING btree ("timestamp");


--
-- Name: idx_master_plans_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_plans_code ON public.master_subscription_plans USING btree (code);


--
-- Name: idx_master_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_plans_status ON public.master_subscription_plans USING btree (status);


--
-- Name: idx_message_reactions_emoji; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_emoji ON public.message_reactions USING btree (emoji);


--
-- Name: idx_message_reactions_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_message ON public.message_reactions USING btree (message_id);


--
-- Name: idx_message_reactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_user ON public.message_reactions USING btree (user_id);


--
-- Name: idx_message_reads_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reads_message ON public.message_reads USING btree (message_id);


--
-- Name: idx_message_reads_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reads_user ON public.message_reads USING btree (user_id);


--
-- Name: idx_message_reads_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reads_user_date ON public.message_reads USING btree (user_id, read_at DESC);


--
-- Name: idx_metric_daily_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_metric_daily_day ON public.system_metric_daily USING btree (day);


--
-- Name: idx_metric_sample_collected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_metric_sample_collected ON public.system_metric_samples USING btree (collected_at);


--
-- Name: idx_module_approval_flows_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_module_approval_flows_active ON public.module_approval_flows USING btree (is_active);


--
-- Name: idx_module_approval_flows_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_module_approval_flows_module ON public.module_approval_flows USING btree (module_id);


--
-- Name: idx_module_assignments_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_module_assignments_module ON public.module_assignments USING btree (module_id);


--
-- Name: idx_module_assignments_super_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_module_assignments_super_admin ON public.module_assignments USING btree (super_admin_id);


--
-- Name: idx_modules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modules_active ON public.modules USING btree (is_active);


--
-- Name: idx_modules_product_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modules_product_type ON public.modules USING btree ("productType");


--
-- Name: idx_onboarding_activity_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_activity_client ON public.client_onboarding_activity USING btree (client_id);


--
-- Name: idx_onboarding_activity_step; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_activity_step ON public.client_onboarding_activity USING btree (step_key);


--
-- Name: idx_onboarding_magic_link_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_magic_link_client ON public.onboarding_magic_links USING btree (client_id);


--
-- Name: idx_onboarding_magic_link_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_magic_link_expires ON public.onboarding_magic_links USING btree (expires_at);


--
-- Name: idx_otp_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_created ON public.otp_tokens USING btree (created_at);


--
-- Name: idx_otp_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_email ON public.otp_tokens USING btree (email);


--
-- Name: idx_otp_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_expires ON public.otp_tokens USING btree (expires_at);


--
-- Name: idx_otp_purpose; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_purpose ON public.otp_tokens USING btree (purpose);


--
-- Name: idx_partial_disallow_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partial_disallow_request ON public.partial_payment_disallow USING btree (payment_request_id);


--
-- Name: idx_password_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_history_user_id ON public.password_history USING btree (user_id);


--
-- Name: idx_payment_records_paid_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_records_paid_by ON public.payment_records USING btree ("paidById");


--
-- Name: idx_payment_records_payment_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_records_payment_request ON public.payment_records USING btree ("paymentRequestId");


--
-- Name: idx_payment_records_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_records_task ON public.payment_records USING btree ("taskId");


--
-- Name: idx_payment_records_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_records_transaction ON public.payment_records USING btree ("transactionId");


--
-- Name: idx_payment_requests_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_requests_client ON public.payment_requests USING btree ("clientId");


--
-- Name: idx_payment_requests_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_requests_creator ON public.payment_requests USING btree ("createdById");


--
-- Name: idx_payment_requests_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_requests_request_id ON public.payment_requests USING btree ("requestId");


--
-- Name: idx_payment_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_requests_status ON public.payment_requests USING btree (status);


--
-- Name: idx_payment_requests_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_requests_token ON public.payment_requests USING btree ("paymentToken");


--
-- Name: idx_permission_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_cache_expires ON public.permission_cache USING btree (expires_at);


--
-- Name: idx_permission_cache_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_cache_key ON public.permission_cache USING btree (cache_key);


--
-- Name: idx_permission_cache_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_cache_user ON public.permission_cache USING btree (user_id);


--
-- Name: idx_plan_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_audit_actor ON public.plan_change_audit_log USING btree (changed_by);


--
-- Name: idx_plan_audit_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_audit_target ON public.plan_change_audit_log USING btree (target_type, target_id);


--
-- Name: idx_plan_audit_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_audit_time ON public.plan_change_audit_log USING btree (changed_at DESC);


--
-- Name: idx_plan_features_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_features_feature ON public.plan_feature_controls USING btree (feature_code);


--
-- Name: idx_plan_features_lock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_features_lock ON public.plan_feature_controls USING btree (lock_mode) WHERE (lock_mode <> 'none'::public.lock_mode_type);


--
-- Name: idx_plan_features_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_features_plan ON public.plan_feature_controls USING btree (plan_id);


--
-- Name: idx_qa_issue_comments_issue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issue_comments_issue ON public.qa_issue_comments USING btree (issue_id);


--
-- Name: idx_qa_issue_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issue_history_changed_at ON public.qa_issue_history USING btree (changed_at DESC);


--
-- Name: idx_qa_issue_history_issue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issue_history_issue ON public.qa_issue_history USING btree (issue_id);


--
-- Name: idx_qa_issues_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issues_assigned ON public.qa_issues USING btree (assigned_to);


--
-- Name: idx_qa_issues_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issues_code ON public.qa_issues USING btree (issue_code);


--
-- Name: idx_qa_issues_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issues_created ON public.qa_issues USING btree (created_at DESC);


--
-- Name: idx_qa_issues_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issues_module ON public.qa_issues USING btree (module);


--
-- Name: idx_qa_issues_related_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issues_related_task_id ON public.qa_issues USING btree (related_task_id);


--
-- Name: idx_qa_issues_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issues_severity ON public.qa_issues USING btree (severity);


--
-- Name: idx_qa_issues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issues_status ON public.qa_issues USING btree (status);


--
-- Name: idx_qa_issues_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_issues_tenant ON public.qa_issues USING btree (tenant_id);


--
-- Name: idx_qa_test_tasks_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_test_tasks_assigned ON public.qa_test_tasks USING btree (assigned_to);


--
-- Name: idx_qa_test_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_test_tasks_due_date ON public.qa_test_tasks USING btree (due_date);


--
-- Name: idx_qa_test_tasks_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_test_tasks_module ON public.qa_test_tasks USING btree (module);


--
-- Name: idx_qa_test_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_test_tasks_status ON public.qa_test_tasks USING btree (status);


--
-- Name: idx_qa_test_tasks_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_test_tasks_tenant ON public.qa_test_tasks USING btree (tenant_id);


--
-- Name: idx_rbac_permissions_action_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_permissions_action_id ON public.rbac_permissions USING btree (action_id);


--
-- Name: idx_rbac_permissions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_permissions_active ON public.rbac_permissions USING btree (is_active);


--
-- Name: idx_rbac_permissions_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_permissions_name ON public.rbac_permissions USING btree (name);


--
-- Name: idx_rbac_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_permissions_role_id ON public.rbac_permissions USING btree (role_id);


--
-- Name: idx_rbac_permissions_route_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_permissions_route_id ON public.rbac_permissions USING btree (route_id);


--
-- Name: idx_rbac_routes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_routes_active ON public.rbac_routes USING btree (is_active);


--
-- Name: idx_rbac_routes_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_routes_menu ON public.rbac_routes USING btree (is_menu_item);


--
-- Name: idx_rbac_user_roles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_user_roles_active ON public.rbac_user_roles USING btree (is_active);


--
-- Name: idx_rbac_user_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_user_roles_role_id ON public.rbac_user_roles USING btree (role_id);


--
-- Name: idx_rbac_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_user_roles_user_id ON public.rbac_user_roles USING btree (user_id);


--
-- Name: idx_recent_activity_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recent_activity_created_at ON public.recent_activity USING btree (created_at DESC);


--
-- Name: idx_recent_activity_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recent_activity_entity ON public.recent_activity USING btree (entity);


--
-- Name: idx_recent_activity_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recent_activity_user_id ON public.recent_activity USING btree (user_id);


--
-- Name: idx_recon_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_audit_action ON public.reconciliation_audit_log USING btree (action);


--
-- Name: idx_recon_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_audit_actor ON public.reconciliation_audit_log USING btree (actor_id);


--
-- Name: idx_recon_audit_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_audit_batch ON public.reconciliation_audit_log USING btree (batch_id);


--
-- Name: idx_recon_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_audit_entity ON public.reconciliation_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_recon_audit_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_audit_tenant ON public.reconciliation_audit_log USING btree (tenant_id);


--
-- Name: idx_recon_audit_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_audit_time ON public.reconciliation_audit_log USING btree (created_at DESC);


--
-- Name: idx_recon_audit_trace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_audit_trace ON public.reconciliation_audit_log USING btree (tenant_id, entity_type, entity_id, created_at DESC);


--
-- Name: idx_recon_batch_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_batch_period ON public.reconciliation_batches USING btree (recon_period_start, recon_period_end);


--
-- Name: idx_recon_batch_statement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_batch_statement ON public.reconciliation_batches USING btree (statement_id);


--
-- Name: idx_recon_batch_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_batch_status ON public.reconciliation_batches USING btree (status);


--
-- Name: idx_recon_batch_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_batch_tenant ON public.reconciliation_batches USING btree (tenant_id);


--
-- Name: idx_recon_exception_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_exception_batch ON public.reconciliation_exceptions USING btree (batch_id);


--
-- Name: idx_recon_exception_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_exception_type ON public.reconciliation_exceptions USING btree (exception_type);


--
-- Name: idx_recon_exception_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_exception_unresolved ON public.reconciliation_exceptions USING btree (batch_id, is_resolved) WHERE (is_resolved = false);


--
-- Name: idx_recon_match_bank_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_match_bank_line ON public.reconciliation_matches USING btree (bank_line_id);


--
-- Name: idx_recon_match_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_match_batch ON public.reconciliation_matches USING btree (batch_id);


--
-- Name: idx_recon_match_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_match_entity ON public.reconciliation_matches USING btree (matched_entity_type, matched_entity_id);


--
-- Name: idx_recon_match_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_match_type ON public.reconciliation_matches USING btree (match_type);


--
-- Name: idx_recon_match_unconfirmed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_match_unconfirmed ON public.reconciliation_matches USING btree (batch_id, is_confirmed) WHERE (is_confirmed = false);


--
-- Name: idx_request_history_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_history_action ON public.task_request_history USING btree (action);


--
-- Name: idx_request_history_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_history_actor ON public.task_request_history USING btree (actor_id);


--
-- Name: idx_request_history_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_history_created ON public.task_request_history USING btree (created_at DESC);


--
-- Name: idx_request_history_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_history_request ON public.task_request_history USING btree (request_id);


--
-- Name: idx_request_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_messages_created ON public.task_request_messages USING btree (created_at);


--
-- Name: idx_request_messages_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_messages_request ON public.task_request_messages USING btree (request_id);


--
-- Name: idx_request_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_messages_sender ON public.task_request_messages USING btree (sender_id);


--
-- Name: idx_resource_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_date ON public.resource_consumption USING btree (snapshot_date DESC);


--
-- Name: idx_resource_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_tenant ON public.resource_consumption USING btree (tenant_id);


--
-- Name: idx_response_variants_training; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_variants_training ON public.chat_response_variants USING btree (training_data_id);


--
-- Name: idx_review_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_audit_action ON public.review_audit USING btree (action);


--
-- Name: idx_review_audit_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_audit_actor_id ON public.review_audit USING btree (actor_id);


--
-- Name: idx_review_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_audit_created_at ON public.review_audit USING btree (created_at);


--
-- Name: idx_review_audit_review_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_audit_review_id ON public.review_audit USING btree (review_id);


--
-- Name: idx_review_audit_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_audit_tenant ON public.review_audit USING btree (tenant_id);


--
-- Name: idx_review_comments_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_comments_author_id ON public.review_comments USING btree (author_id);


--
-- Name: idx_review_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_comments_parent_id ON public.review_comments USING btree (parent_id);


--
-- Name: idx_review_comments_review_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_comments_review_id ON public.review_comments USING btree (review_id);


--
-- Name: idx_review_comments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_comments_tenant ON public.review_comments USING btree (tenant_id);


--
-- Name: idx_security_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_created ON public.security_events USING btree (created_at DESC);


--
-- Name: idx_security_events_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_ip ON public.security_events USING btree (ip_address);


--
-- Name: idx_security_events_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_severity ON public.security_events USING btree (severity, created_at DESC);


--
-- Name: idx_security_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type, created_at DESC);


--
-- Name: idx_security_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_user ON public.security_events USING btree (user_id, created_at DESC);


--
-- Name: idx_selection_log_approver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selection_log_approver ON public.approver_selection_logs USING btree ("selectedApproverId");


--
-- Name: idx_selection_log_level_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selection_log_level_created ON public.approver_selection_logs USING btree (level, "createdAt");


--
-- Name: idx_selection_log_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selection_log_task ON public.approver_selection_logs USING btree ("taskId");


--
-- Name: idx_semantic_cache_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_semantic_cache_hash ON public.chat_semantic_cache USING btree (query_hash);


--
-- Name: idx_settlement_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlement_audit_action ON public.settlement_audit_log USING btree (action);


--
-- Name: idx_settlement_audit_performed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlement_audit_performed_at ON public.settlement_audit_log USING btree (performed_at);


--
-- Name: idx_settlement_audit_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlement_audit_performed_by ON public.settlement_audit_log USING btree (performed_by);


--
-- Name: idx_settlement_audit_settlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlement_audit_settlement ON public.settlement_audit_log USING btree (settlement_id);


--
-- Name: idx_settlement_batches_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlement_batches_date ON public.payment_settlement_batches USING btree (settlement_date);


--
-- Name: idx_settlement_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlement_batches_status ON public.payment_settlement_batches USING btree (status);


--
-- Name: idx_settlement_batches_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlement_batches_tenant ON public.payment_settlement_batches USING btree (tenant_id);


--
-- Name: idx_settlements_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_created_by ON public.settlements USING btree (created_by);


--
-- Name: idx_settlements_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_date ON public.settlements USING btree (settlement_date);


--
-- Name: idx_settlements_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_number ON public.settlements USING btree (settlement_number);


--
-- Name: idx_settlements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_status ON public.settlements USING btree (status);


--
-- Name: idx_settlements_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_tenant ON public.settlements USING btree (tenant_id);


--
-- Name: idx_spend_limits_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spend_limits_month ON public.tenant_spend_limits USING btree (billing_month);


--
-- Name: idx_spend_limits_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spend_limits_tenant ON public.tenant_spend_limits USING btree (tenant_id);


--
-- Name: idx_stage_instances_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_instances_approval ON public.approval_stage_instances USING btree (approval_instance_id);


--
-- Name: idx_stage_instances_approver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_instances_approver ON public.approval_stage_instances USING btree (resolved_approver_id);


--
-- Name: idx_stage_instances_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_instances_due ON public.approval_stage_instances USING btree (due_at) WHERE (status = 'active'::public.approval_stage_status);


--
-- Name: idx_stage_instances_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_instances_status ON public.approval_stage_instances USING btree (status);


--
-- Name: idx_subscription_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_audit_action ON public.subscription_audit_log USING btree (action);


--
-- Name: idx_subscription_audit_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_audit_client ON public.subscription_audit_log USING btree (client_id);


--
-- Name: idx_subscription_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_audit_created ON public.subscription_audit_log USING btree (created_at DESC);


--
-- Name: idx_subscription_invoices_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_invoices_client ON public.subscription_invoices USING btree (client_id);


--
-- Name: idx_subscription_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_invoices_status ON public.subscription_invoices USING btree (status);


--
-- Name: idx_subscription_plans_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_active ON public.subscription_plans USING btree (is_active, is_public);


--
-- Name: idx_subscription_plans_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_sort ON public.subscription_plans USING btree (sort_order);


--
-- Name: idx_super_admins_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_super_admins_created_by ON public.super_admins USING btree (created_by);


--
-- Name: idx_super_admins_product_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_super_admins_product_type ON public.super_admins USING btree ("productType");


--
-- Name: idx_support_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_sessions_active ON public.support_sessions USING btree (is_active, expires_at);


--
-- Name: idx_support_sessions_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_sessions_client ON public.support_sessions USING btree (target_client_id);


--
-- Name: idx_support_sessions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_sessions_created ON public.support_sessions USING btree (created_at DESC);


--
-- Name: idx_support_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_sessions_user ON public.support_sessions USING btree (support_user_id);


--
-- Name: idx_task_attachments_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_message_id ON public.task_attachments USING btree (message_id);


--
-- Name: idx_task_attachments_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_task ON public.task_attachments USING btree (task_id);


--
-- Name: idx_task_attachments_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments USING btree (task_id);


--
-- Name: idx_task_attachments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_tenant ON public.task_attachments USING btree (tenant_id);


--
-- Name: idx_task_attachments_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_tenant_id ON public.task_attachments USING btree (tenant_id);


--
-- Name: idx_task_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_audit_action ON public.task_audit USING btree (action);


--
-- Name: idx_task_audit_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_audit_actor_id ON public.task_audit USING btree (actor_id);


--
-- Name: idx_task_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_audit_created_at ON public.task_audit_logs USING btree (created_at);


--
-- Name: idx_task_audit_resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_audit_resource_id ON public.task_audit_logs USING btree (resource, resource_id);


--
-- Name: idx_task_audit_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_audit_task_id ON public.task_audit USING btree (task_id);


--
-- Name: idx_task_audit_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_audit_tenant ON public.task_audit_logs USING btree (tenant_id);


--
-- Name: idx_task_clarifications_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_clarifications_pending ON public.task_clarifications USING btree (status) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_task_clarifications_responder_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_clarifications_responder_pending ON public.task_clarifications USING btree (responder_id, status) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_task_clarifications_task_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_clarifications_task_status ON public.task_clarifications USING btree (task_id, status);


--
-- Name: idx_task_labels_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_labels_tenant ON public.task_labels USING btree (tenant_id);


--
-- Name: idx_task_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_messages_created ON public.task_messages USING btree (created_at DESC);


--
-- Name: idx_task_messages_reply_to_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_messages_reply_to_id ON public.task_messages USING btree (reply_to_id);


--
-- Name: idx_task_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_messages_sender ON public.task_messages USING btree (sender_id);


--
-- Name: idx_task_messages_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_messages_task ON public.task_messages USING btree (task_id);


--
-- Name: idx_task_messages_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_messages_task_id ON public.task_messages USING btree (task_id);


--
-- Name: idx_task_messages_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_messages_tenant ON public.task_messages USING btree (tenant_id);


--
-- Name: idx_task_messages_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_messages_tenant_id ON public.task_messages USING btree (tenant_id);


--
-- Name: idx_task_participants_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_participants_task ON public.task_participants USING btree (task_id);


--
-- Name: idx_task_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_participants_user ON public.task_participants USING btree (user_id);


--
-- Name: idx_task_requests_composite_status_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_composite_status_by ON public.task_requests USING btree (status, requested_by);


--
-- Name: idx_task_requests_composite_status_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_composite_status_to ON public.task_requests USING btree (status, requested_to);


--
-- Name: idx_task_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_created_at ON public.task_requests USING btree (created_at DESC);


--
-- Name: idx_task_requests_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_requested_by ON public.task_requests USING btree (requested_by);


--
-- Name: idx_task_requests_requested_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_requested_to ON public.task_requests USING btree (requested_to);


--
-- Name: idx_task_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_status ON public.task_requests USING btree (status);


--
-- Name: idx_task_requests_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_tenant ON public.task_requests USING btree (tenant_id);


--
-- Name: idx_task_reviews_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_expires_at ON public.task_reviews USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_task_reviews_pending_by_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_pending_by_reviewer ON public.task_reviews USING btree (reviewer_id, status) WHERE (status = 'PENDING'::public.review_status);


--
-- Name: idx_task_reviews_purpose; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_purpose ON public.task_reviews USING btree (purpose);


--
-- Name: idx_task_reviews_reviewer_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_reviewer_department ON public.task_reviews USING btree (reviewer_department_id);


--
-- Name: idx_task_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_reviewer_id ON public.task_reviews USING btree (reviewer_id);


--
-- Name: idx_task_reviews_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_sender_id ON public.task_reviews USING btree (sender_id);


--
-- Name: idx_task_reviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_status ON public.task_reviews USING btree (status);


--
-- Name: idx_task_reviews_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_task_id ON public.task_reviews USING btree (task_id);


--
-- Name: idx_task_reviews_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reviews_tenant ON public.task_reviews USING btree (tenant_id);


--
-- Name: idx_task_time_entries_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_time_entries_task ON public.task_time_entries USING btree (task_id);


--
-- Name: idx_task_time_entries_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_time_entries_user ON public.task_time_entries USING btree (user_id);


--
-- Name: idx_task_watchers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_watchers_user ON public.task_watchers USING btree (user_id);


--
-- Name: idx_tenant_plans_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_plans_active ON public.tenant_plan_assignments USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_tenant_plans_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_plans_plan ON public.tenant_plan_assignments USING btree (plan_id);


--
-- Name: idx_tenant_plans_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_plans_tenant ON public.tenant_plan_assignments USING btree (tenant_id);


--
-- Name: idx_tenant_quota_overrides_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_quota_overrides_tenant_id ON public.tenant_quota_overrides USING btree (tenant_id);


--
-- Name: idx_tenant_unlocks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_unlocks_active ON public.tenant_feature_unlocks USING btree (tenant_id, status) WHERE (status = 'UNLOCKED'::public.unlock_status);


--
-- Name: idx_tenant_unlocks_billing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_unlocks_billing ON public.tenant_feature_unlocks USING btree (next_billing_date);


--
-- Name: idx_tenant_unlocks_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_unlocks_feature ON public.tenant_feature_unlocks USING btree (feature_key);


--
-- Name: idx_tenant_unlocks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_unlocks_status ON public.tenant_feature_unlocks USING btree (status);


--
-- Name: idx_tenant_unlocks_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_unlocks_tenant ON public.tenant_feature_unlocks USING btree (tenant_id);


--
-- Name: idx_tenant_usage_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_usage_date ON public.tenant_usage USING btree (date);


--
-- Name: idx_tenant_usage_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_usage_tenant_date ON public.tenant_usage USING btree (tenant_id, date);


--
-- Name: idx_tenant_usage_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_usage_tenant_id ON public.tenant_usage USING btree (tenant_id);


--
-- Name: idx_thread_members_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_members_role ON public.thread_members USING btree (role);


--
-- Name: idx_thread_members_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_members_thread ON public.thread_members USING btree ("threadId");


--
-- Name: idx_thread_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_members_user ON public.thread_members USING btree ("userId");


--
-- Name: idx_thread_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_created ON public.thread_messages USING btree ("createdAt");


--
-- Name: idx_thread_messages_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_deleted ON public.thread_messages USING btree ("isDeleted");


--
-- Name: idx_thread_messages_part_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_part_sender ON ONLY public.thread_messages_partitioned USING btree ("senderId");


--
-- Name: idx_thread_messages_part_thread_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_part_thread_created ON ONLY public.thread_messages_partitioned USING btree ("threadId", "createdAt" DESC);


--
-- Name: idx_thread_messages_reactions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_reactions_gin ON public.thread_messages USING gin (reactions);


--
-- Name: idx_thread_messages_readby_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_readby_gin ON public.thread_messages USING gin ("readBy");


--
-- Name: idx_thread_messages_reply_to_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_reply_to_id ON public.thread_messages USING btree ("replyToId");


--
-- Name: idx_thread_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_sender ON public.thread_messages USING btree ("senderId");


--
-- Name: idx_thread_messages_sender_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_sender_created ON public.thread_messages USING btree ("senderId", "createdAt" DESC);


--
-- Name: idx_thread_messages_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_thread ON public.thread_messages USING btree ("threadId");


--
-- Name: idx_thread_messages_thread_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_thread_created ON public.thread_messages USING btree ("threadId", "createdAt" DESC);


--
-- Name: idx_thread_messages_thread_not_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_thread_not_deleted ON public.thread_messages USING btree ("threadId", "createdAt" DESC) WHERE ("isDeleted" = false);


--
-- Name: idx_thread_messages_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_messages_type ON public.thread_messages USING btree (type);


--
-- Name: idx_threads_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_threads_creator ON public.threads USING btree ("createdById");


--
-- Name: idx_training_pattern_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_pattern_trgm ON public.chat_training_data USING gin (pattern public.gin_trgm_ops);


--
-- Name: idx_unlocks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unlocks_active ON public.feature_micro_unlocks USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_unlocks_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unlocks_tenant ON public.feature_micro_unlocks USING btree (tenant_id);


--
-- Name: idx_usage_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_feature ON public.usage_counters USING btree (feature_key);


--
-- Name: idx_usage_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_lookup ON public.usage_counters USING btree (tenant_id, feature_key, period);


--
-- Name: idx_usage_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_period ON public.feature_usage_counters USING btree (period_end);


--
-- Name: idx_usage_reset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_reset ON public.usage_counters USING btree (reset_at);


--
-- Name: idx_usage_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_tenant ON public.usage_counters USING btree (tenant_id);


--
-- Name: idx_user_permissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_permissions_user_id ON public.rbac_user_permissions USING btree (user_id);


--
-- Name: idx_user_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expires ON public.user_sessions USING btree (expires_at) WHERE (is_active = true);


--
-- Name: idx_user_sessions_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_token_hash ON public.user_sessions USING btree (token_hash);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_user_sessions_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_active ON public.user_sessions USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_users_enhanced_business_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_enhanced_business_level ON public.users_enhanced USING btree (business_level);


--
-- Name: idx_users_enhanced_unique_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_enhanced_unique_id ON public.users_enhanced USING btree (unique_id);


--
-- Name: idx_vendors_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_active ON public.vendors USING btree (tenant_id, is_active);


--
-- Name: idx_vendors_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_created ON public.vendors USING btree (tenant_id, created_at DESC);


--
-- Name: idx_vendors_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_email ON public.vendors USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_vendors_gstin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_gstin ON public.vendors USING btree (gstin) WHERE (gstin IS NOT NULL);


--
-- Name: idx_vendors_msme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_msme ON public.vendors USING btree (tenant_id, is_msme) WHERE (is_msme = true);


--
-- Name: idx_vendors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_name ON public.vendors USING btree (tenant_id, name);


--
-- Name: idx_vendors_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_phone ON public.vendors USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: idx_vendors_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_search ON public.vendors USING gin (to_tsvector('english'::regconfig, (((((COALESCE(name, ''::character varying))::text || ' '::text) || (COALESCE(code, ''::character varying))::text) || ' '::text) || (COALESCE(email, ''::character varying))::text)));


--
-- Name: idx_vendors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_status ON public.vendors USING btree (tenant_id, status);


--
-- Name: idx_vendors_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_tenant ON public.vendors USING btree (tenant_id);


--
-- Name: idx_vendors_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_type ON public.vendors USING btree (tenant_id, vendor_type);


--
-- Name: idx_violations_endpoint_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violations_endpoint_timestamp ON public.rate_limit_violations USING btree (endpoint, "timestamp");


--
-- Name: idx_violations_ip_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violations_ip_timestamp ON public.rate_limit_violations USING btree (ip_address, "timestamp");


--
-- Name: idx_violations_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violations_timestamp ON public.rate_limit_violations USING btree ("timestamp" DESC);


--
-- Name: idx_violations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violations_type ON public.rate_limit_violations USING btree (violation_type);


--
-- Name: idx_workflow_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_audit_user ON public.workflow_audit USING btree (user_id);


--
-- Name: idx_workflow_audit_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_audit_workflow ON public.workflow_audit USING btree (workflow_id);


--
-- Name: idx_workflow_feedback_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_feedback_workflow_id ON public.workflow_feedback USING btree (workflow_id);


--
-- Name: idx_workflow_role_map_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_role_map_role ON public.workflow_role_map USING btree (role_id);


--
-- Name: idx_workflow_stages_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_stages_order ON public.approval_workflow_stages USING btree (workflow_template_id, stage_order);


--
-- Name: idx_workflow_stages_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_stages_template ON public.approval_workflow_stages USING btree (workflow_template_id);


--
-- Name: idx_workflow_task_history_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_task_history_task_id ON public.workflow_task_history USING btree (task_id);


--
-- Name: idx_workflow_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_assigned_to ON public.workflow_tasks USING btree (assignee_id);


--
-- Name: idx_workflow_tasks_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_assignee ON public.workflow_tasks USING btree (assignee_id);


--
-- Name: idx_workflow_tasks_assignee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_assignee_id ON public.workflow_tasks USING btree (assignee_id);


--
-- Name: idx_workflow_tasks_assignee_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_assignee_status ON public.workflow_tasks USING btree (assignee_id, status);


--
-- Name: idx_workflow_tasks_creator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_creator_id ON public.workflow_tasks USING btree (creator_id);


--
-- Name: idx_workflow_tasks_creator_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_creator_status ON public.workflow_tasks USING btree (creator_id, status);


--
-- Name: idx_workflow_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_due_date ON public.workflow_tasks USING btree (due_date);


--
-- Name: idx_workflow_tasks_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_parent ON public.workflow_tasks USING btree (parent_task_id);


--
-- Name: idx_workflow_tasks_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_position ON public.workflow_tasks USING btree ("position");


--
-- Name: idx_workflow_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_priority ON public.workflow_tasks USING btree (priority);


--
-- Name: idx_workflow_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_status ON public.workflow_tasks USING btree (status);


--
-- Name: idx_workflow_tasks_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_tenant ON public.workflow_tasks USING btree (tenant_id);


--
-- Name: idx_workflow_tasks_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_tenant_id ON public.workflow_tasks USING btree (tenant_id);


--
-- Name: idx_workflow_tasks_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_tasks_tenant_status ON public.workflow_tasks USING btree (tenant_id, status);


--
-- Name: idx_workflow_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_templates_active ON public.approval_workflow_templates USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_workflow_templates_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_templates_entity ON public.approval_workflow_templates USING btree (entity_type);


--
-- Name: idx_workflow_templates_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_templates_tenant ON public.approval_workflow_templates USING btree (tenant_id);


--
-- Name: idx_workflows_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_active ON public.workflows USING btree (is_active);


--
-- Name: idx_workflows_keywords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_keywords ON public.workflows USING gin (keywords);


--
-- Name: idx_workflows_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_module ON public.workflows USING btree (module);


--
-- Name: idx_workflows_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_slug ON public.workflows USING btree (slug);


--
-- Name: idx_workflows_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_tags ON public.workflows USING gin (tags);


--
-- Name: journal_entries_entry_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_entry_date_idx ON public.journal_entries USING btree (entry_date);


--
-- Name: journal_entries_reference_type_reference_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_reference_type_reference_id_idx ON public.journal_entries USING btree (reference_type, reference_id);


--
-- Name: journal_entries_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_status_idx ON public.journal_entries USING btree (status);


--
-- Name: journal_entries_tenant_id_entry_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX journal_entries_tenant_id_entry_number_key ON public.journal_entries USING btree (tenant_id, entry_number);


--
-- Name: journal_entries_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_tenant_id_idx ON public.journal_entries USING btree (tenant_id);


--
-- Name: journal_lines_journal_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_lines_journal_id_idx ON public.journal_lines USING btree (journal_id);


--
-- Name: journal_lines_ledger_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_lines_ledger_id_idx ON public.journal_lines USING btree (ledger_id);


--
-- Name: ledgers_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledgers_is_active_idx ON public.ledgers USING btree (is_active);


--
-- Name: ledgers_ledger_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledgers_ledger_type_idx ON public.ledgers USING btree (ledger_type);


--
-- Name: ledgers_tenant_id_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ledgers_tenant_id_code_key ON public.ledgers USING btree (tenant_id, code);


--
-- Name: ledgers_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledgers_tenant_id_idx ON public.ledgers USING btree (tenant_id);


--
-- Name: migration_history_migration_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX migration_history_migration_name_key ON public.migration_history USING btree (migration_name);


--
-- Name: module_assignments_super_admin_id_module_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX module_assignments_super_admin_id_module_id_key ON public.module_assignments USING btree (super_admin_id, module_id);


--
-- Name: modules_module_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX modules_module_name_key ON public.modules USING btree (module_name);


--
-- Name: payment_requests_paymentToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_requests_paymentToken_key" ON public.payment_requests USING btree ("paymentToken");


--
-- Name: payment_requests_requestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_requests_requestId_key" ON public.payment_requests USING btree ("requestId");


--
-- Name: rbac_actions_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rbac_actions_name_key ON public.rbac_actions USING btree (name);


--
-- Name: rbac_permissions_role_id_action_id_route_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rbac_permissions_role_id_action_id_route_id_key ON public.rbac_permissions USING btree (role_id, action_id, route_id);


--
-- Name: rbac_roles_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rbac_roles_name_key ON public.rbac_roles USING btree (name);


--
-- Name: rbac_routes_path_method_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rbac_routes_path_method_key ON public.rbac_routes USING btree (path, method);


--
-- Name: rbac_user_permissions_user_id_page_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rbac_user_permissions_user_id_page_key_key ON public.rbac_user_permissions USING btree (user_id, page_key);


--
-- Name: rbac_user_roles_user_id_role_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rbac_user_roles_user_id_role_id_key ON public.rbac_user_roles USING btree (user_id, role_id);


--
-- Name: rent_contract_details_contract_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rent_contract_details_contract_id_key ON public.rent_contract_details USING btree (contract_id);


--
-- Name: scheduled_payables_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_payables_contract_id_idx ON public.scheduled_payables USING btree (contract_id);


--
-- Name: scheduled_payables_due_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_payables_due_date_idx ON public.scheduled_payables USING btree (due_date);


--
-- Name: scheduled_payables_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_payables_status_idx ON public.scheduled_payables USING btree (status);


--
-- Name: scheduled_payables_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_payables_tenant_id_idx ON public.scheduled_payables USING btree (tenant_id);


--
-- Name: subscription_audit_log_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_audit_log_action_idx ON public.subscription_audit_log USING btree (action);


--
-- Name: subscription_audit_log_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_audit_log_client_id_idx ON public.subscription_audit_log USING btree (client_id);


--
-- Name: subscription_audit_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_audit_log_created_at_idx ON public.subscription_audit_log USING btree (created_at DESC);


--
-- Name: subscription_invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_invoices_status_idx ON public.subscription_invoices USING btree (status);


--
-- Name: subscription_plans_is_active_is_public_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_plans_is_active_is_public_idx ON public.subscription_plans USING btree (is_active, is_public);


--
-- Name: subscription_plans_sort_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_plans_sort_order_idx ON public.subscription_plans USING btree (sort_order);


--
-- Name: super_admins_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX super_admins_email_key ON public.super_admins USING btree (email);


--
-- Name: support_ticket_comments_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_ticket_comments_ticket_id_idx ON public.support_ticket_comments USING btree (ticket_id);


--
-- Name: support_tickets_assigned_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_assigned_to_idx ON public.support_tickets USING btree (assigned_to);


--
-- Name: support_tickets_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_client_id_idx ON public.support_tickets USING btree (client_id);


--
-- Name: support_tickets_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_created_at_idx ON public.support_tickets USING btree (created_at DESC);


--
-- Name: support_tickets_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_priority_idx ON public.support_tickets USING btree (priority);


--
-- Name: support_tickets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_status_idx ON public.support_tickets USING btree (status);


--
-- Name: support_tickets_ticket_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX support_tickets_ticket_number_key ON public.support_tickets USING btree (ticket_number);


--
-- Name: system_health_metrics_metric_type_metric_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_health_metrics_metric_type_metric_name_idx ON public.system_health_metrics USING btree (metric_type, metric_name);


--
-- Name: system_health_metrics_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_health_metrics_recorded_at_idx ON public.system_health_metrics USING btree (recorded_at DESC);


--
-- Name: system_metric_daily_day_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX system_metric_daily_day_key ON public.system_metric_daily USING btree (day);


--
-- Name: task_clarifications_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_clarifications_created_at_index ON public.task_clarifications USING btree (created_at);


--
-- Name: task_clarifications_requester_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_clarifications_requester_id_index ON public.task_clarifications USING btree (requester_id);


--
-- Name: task_clarifications_responder_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_clarifications_responder_id_index ON public.task_clarifications USING btree (responder_id);


--
-- Name: task_clarifications_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_clarifications_status_index ON public.task_clarifications USING btree (status);


--
-- Name: task_clarifications_task_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_clarifications_task_id_index ON public.task_clarifications USING btree (task_id);


--
-- Name: task_clarifications_tenant_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_clarifications_tenant_id_index ON public.task_clarifications USING btree (tenant_id);


--
-- Name: thread_members_threadId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "thread_members_threadId_userId_key" ON public.thread_members USING btree ("threadId", "userId");


--
-- Name: thread_messages_p2025_09_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2025_09_senderId_idx" ON public.thread_messages_p2025_09 USING btree ("senderId");


--
-- Name: thread_messages_p2025_09_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2025_09_threadId_createdAt_idx" ON public.thread_messages_p2025_09 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2025_10_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2025_10_senderId_idx" ON public.thread_messages_p2025_10 USING btree ("senderId");


--
-- Name: thread_messages_p2025_10_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2025_10_threadId_createdAt_idx" ON public.thread_messages_p2025_10 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2025_11_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2025_11_senderId_idx" ON public.thread_messages_p2025_11 USING btree ("senderId");


--
-- Name: thread_messages_p2025_11_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2025_11_threadId_createdAt_idx" ON public.thread_messages_p2025_11 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2025_12_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2025_12_senderId_idx" ON public.thread_messages_p2025_12 USING btree ("senderId");


--
-- Name: thread_messages_p2025_12_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2025_12_threadId_createdAt_idx" ON public.thread_messages_p2025_12 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_01_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_01_senderId_idx" ON public.thread_messages_p2026_01 USING btree ("senderId");


--
-- Name: thread_messages_p2026_01_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_01_threadId_createdAt_idx" ON public.thread_messages_p2026_01 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_02_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_02_senderId_idx" ON public.thread_messages_p2026_02 USING btree ("senderId");


--
-- Name: thread_messages_p2026_02_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_02_threadId_createdAt_idx" ON public.thread_messages_p2026_02 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_03_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_03_senderId_idx" ON public.thread_messages_p2026_03 USING btree ("senderId");


--
-- Name: thread_messages_p2026_03_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_03_threadId_createdAt_idx" ON public.thread_messages_p2026_03 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_04_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_04_senderId_idx" ON public.thread_messages_p2026_04 USING btree ("senderId");


--
-- Name: thread_messages_p2026_04_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_04_threadId_createdAt_idx" ON public.thread_messages_p2026_04 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_05_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_05_senderId_idx" ON public.thread_messages_p2026_05 USING btree ("senderId");


--
-- Name: thread_messages_p2026_05_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_05_threadId_createdAt_idx" ON public.thread_messages_p2026_05 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_06_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_06_senderId_idx" ON public.thread_messages_p2026_06 USING btree ("senderId");


--
-- Name: thread_messages_p2026_06_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_06_threadId_createdAt_idx" ON public.thread_messages_p2026_06 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_07_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_07_senderId_idx" ON public.thread_messages_p2026_07 USING btree ("senderId");


--
-- Name: thread_messages_p2026_07_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_07_threadId_createdAt_idx" ON public.thread_messages_p2026_07 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_08_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_08_senderId_idx" ON public.thread_messages_p2026_08 USING btree ("senderId");


--
-- Name: thread_messages_p2026_08_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_08_threadId_createdAt_idx" ON public.thread_messages_p2026_08 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_09_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_09_senderId_idx" ON public.thread_messages_p2026_09 USING btree ("senderId");


--
-- Name: thread_messages_p2026_09_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_09_threadId_createdAt_idx" ON public.thread_messages_p2026_09 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_10_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_10_senderId_idx" ON public.thread_messages_p2026_10 USING btree ("senderId");


--
-- Name: thread_messages_p2026_10_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_10_threadId_createdAt_idx" ON public.thread_messages_p2026_10 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p2026_11_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_11_senderId_idx" ON public.thread_messages_p2026_11 USING btree ("senderId");


--
-- Name: thread_messages_p2026_11_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p2026_11_threadId_createdAt_idx" ON public.thread_messages_p2026_11 USING btree ("threadId", "createdAt" DESC);


--
-- Name: thread_messages_p_default_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p_default_senderId_idx" ON public.thread_messages_p_default USING btree ("senderId");


--
-- Name: thread_messages_p_default_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thread_messages_p_default_threadId_createdAt_idx" ON public.thread_messages_p_default USING btree ("threadId", "createdAt" DESC);


--
-- Name: user_achievements_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_achievements_user_id_idx ON public.user_achievements USING btree (user_id);


--
-- Name: user_addresses_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_addresses_type_idx ON public.user_addresses USING btree (type);


--
-- Name: user_addresses_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_addresses_user_id_idx ON public.user_addresses USING btree (user_id);


--
-- Name: user_bank_accounts_is_primary_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_bank_accounts_is_primary_idx ON public.user_bank_accounts USING btree (is_primary);


--
-- Name: user_bank_accounts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_bank_accounts_user_id_idx ON public.user_bank_accounts USING btree (user_id);


--
-- Name: user_branches_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_branches_branch_id_idx ON public.user_branches USING btree (branch_id);


--
-- Name: user_branches_user_id_branch_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_branches_user_id_branch_id_key ON public.user_branches USING btree (user_id, branch_id);


--
-- Name: user_branches_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_branches_user_id_idx ON public.user_branches USING btree (user_id);


--
-- Name: user_education_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_education_user_id_idx ON public.user_education USING btree (user_id);


--
-- Name: user_emergency_contacts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_emergency_contacts_user_id_idx ON public.user_emergency_contacts USING btree (user_id);


--
-- Name: user_kyc_kyc_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_kyc_kyc_status_idx ON public.user_kyc USING btree (kyc_status);


--
-- Name: user_kyc_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_kyc_user_id_idx ON public.user_kyc USING btree (user_id);


--
-- Name: user_kyc_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_kyc_user_id_key ON public.user_kyc USING btree (user_id);


--
-- Name: user_profiles_employee_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_profiles_employee_code_idx ON public.user_profiles USING btree (employee_code);


--
-- Name: user_profiles_employee_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_employee_code_key ON public.user_profiles USING btree (employee_code);


--
-- Name: user_profiles_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_profiles_user_id_idx ON public.user_profiles USING btree (user_id);


--
-- Name: user_profiles_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);


--
-- Name: user_sessions_session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_sessions_session_token_key ON public.user_sessions USING btree (session_token);


--
-- Name: user_skills_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_skills_user_id_idx ON public.user_skills USING btree (user_id);


--
-- Name: vehicle_contract_details_contract_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vehicle_contract_details_contract_id_key ON public.vehicle_contract_details USING btree (contract_id);


--
-- Name: vendor_contract_details_contract_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_contract_details_contract_id_key ON public.vendor_contract_details USING btree (contract_id);


--
-- Name: audit_logs_p2025_12_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_created ATTACH PARTITION public.audit_logs_p2025_12_created_at_idx;


--
-- Name: audit_logs_p2025_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_partitioned_pkey ATTACH PARTITION public.audit_logs_p2025_12_pkey;


--
-- Name: audit_logs_p2025_12_table_name_action_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_table_action ATTACH PARTITION public.audit_logs_p2025_12_table_name_action_idx;


--
-- Name: audit_logs_p2026_01_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_created ATTACH PARTITION public.audit_logs_p2026_01_created_at_idx;


--
-- Name: audit_logs_p2026_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_partitioned_pkey ATTACH PARTITION public.audit_logs_p2026_01_pkey;


--
-- Name: audit_logs_p2026_01_table_name_action_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_table_action ATTACH PARTITION public.audit_logs_p2026_01_table_name_action_idx;


--
-- Name: audit_logs_p2026_02_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_created ATTACH PARTITION public.audit_logs_p2026_02_created_at_idx;


--
-- Name: audit_logs_p2026_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_partitioned_pkey ATTACH PARTITION public.audit_logs_p2026_02_pkey;


--
-- Name: audit_logs_p2026_02_table_name_action_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_table_action ATTACH PARTITION public.audit_logs_p2026_02_table_name_action_idx;


--
-- Name: audit_logs_p2026_03_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_created ATTACH PARTITION public.audit_logs_p2026_03_created_at_idx;


--
-- Name: audit_logs_p2026_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_partitioned_pkey ATTACH PARTITION public.audit_logs_p2026_03_pkey;


--
-- Name: audit_logs_p2026_03_table_name_action_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_table_action ATTACH PARTITION public.audit_logs_p2026_03_table_name_action_idx;


--
-- Name: audit_logs_p2026_04_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_created ATTACH PARTITION public.audit_logs_p2026_04_created_at_idx;


--
-- Name: audit_logs_p2026_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_partitioned_pkey ATTACH PARTITION public.audit_logs_p2026_04_pkey;


--
-- Name: audit_logs_p2026_04_table_name_action_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_table_action ATTACH PARTITION public.audit_logs_p2026_04_table_name_action_idx;


--
-- Name: audit_logs_p2026_05_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_created ATTACH PARTITION public.audit_logs_p2026_05_created_at_idx;


--
-- Name: audit_logs_p2026_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_partitioned_pkey ATTACH PARTITION public.audit_logs_p2026_05_pkey;


--
-- Name: audit_logs_p2026_05_table_name_action_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_table_action ATTACH PARTITION public.audit_logs_p2026_05_table_name_action_idx;


--
-- Name: audit_logs_p_default_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_created ATTACH PARTITION public.audit_logs_p_default_created_at_idx;


--
-- Name: audit_logs_p_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_partitioned_pkey ATTACH PARTITION public.audit_logs_p_default_pkey;


--
-- Name: audit_logs_p_default_table_name_action_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_logs_part_table_action ATTACH PARTITION public.audit_logs_p_default_table_name_action_idx;


--
-- Name: client_usage_events_p2025_09_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2025_09_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2025_09_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2025_09_event_type_idx;


--
-- Name: client_usage_events_p2025_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2025_09_pkey;


--
-- Name: client_usage_events_p2025_10_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2025_10_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2025_10_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2025_10_event_type_idx;


--
-- Name: client_usage_events_p2025_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2025_10_pkey;


--
-- Name: client_usage_events_p2025_11_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2025_11_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2025_11_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2025_11_event_type_idx;


--
-- Name: client_usage_events_p2025_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2025_11_pkey;


--
-- Name: client_usage_events_p2025_12_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2025_12_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2025_12_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2025_12_event_type_idx;


--
-- Name: client_usage_events_p2025_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2025_12_pkey;


--
-- Name: client_usage_events_p2026_01_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_01_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_01_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_01_event_type_idx;


--
-- Name: client_usage_events_p2026_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_01_pkey;


--
-- Name: client_usage_events_p2026_02_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_02_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_02_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_02_event_type_idx;


--
-- Name: client_usage_events_p2026_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_02_pkey;


--
-- Name: client_usage_events_p2026_03_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_03_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_03_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_03_event_type_idx;


--
-- Name: client_usage_events_p2026_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_03_pkey;


--
-- Name: client_usage_events_p2026_04_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_04_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_04_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_04_event_type_idx;


--
-- Name: client_usage_events_p2026_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_04_pkey;


--
-- Name: client_usage_events_p2026_05_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_05_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_05_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_05_event_type_idx;


--
-- Name: client_usage_events_p2026_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_05_pkey;


--
-- Name: client_usage_events_p2026_06_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_06_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_06_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_06_event_type_idx;


--
-- Name: client_usage_events_p2026_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_06_pkey;


--
-- Name: client_usage_events_p2026_07_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_07_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_07_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_07_event_type_idx;


--
-- Name: client_usage_events_p2026_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_07_pkey;


--
-- Name: client_usage_events_p2026_08_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_08_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_08_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_08_event_type_idx;


--
-- Name: client_usage_events_p2026_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_08_pkey;


--
-- Name: client_usage_events_p2026_09_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_09_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_09_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_09_event_type_idx;


--
-- Name: client_usage_events_p2026_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_09_pkey;


--
-- Name: client_usage_events_p2026_10_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_10_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_10_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_10_event_type_idx;


--
-- Name: client_usage_events_p2026_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_10_pkey;


--
-- Name: client_usage_events_p2026_11_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p2026_11_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p2026_11_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p2026_11_event_type_idx;


--
-- Name: client_usage_events_p2026_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p2026_11_pkey;


--
-- Name: client_usage_events_p_default_client_id_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_client_date ATTACH PARTITION public.client_usage_events_p_default_client_id_occurred_at_idx;


--
-- Name: client_usage_events_p_default_event_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_client_usage_part_type ATTACH PARTITION public.client_usage_events_p_default_event_type_idx;


--
-- Name: client_usage_events_p_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.client_usage_events_partitioned_pkey ATTACH PARTITION public.client_usage_events_p_default_pkey;


--
-- Name: thread_messages_p2025_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2025_09_pkey;


--
-- Name: thread_messages_p2025_09_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2025_09_senderId_idx";


--
-- Name: thread_messages_p2025_09_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2025_09_threadId_createdAt_idx";


--
-- Name: thread_messages_p2025_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2025_10_pkey;


--
-- Name: thread_messages_p2025_10_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2025_10_senderId_idx";


--
-- Name: thread_messages_p2025_10_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2025_10_threadId_createdAt_idx";


--
-- Name: thread_messages_p2025_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2025_11_pkey;


--
-- Name: thread_messages_p2025_11_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2025_11_senderId_idx";


--
-- Name: thread_messages_p2025_11_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2025_11_threadId_createdAt_idx";


--
-- Name: thread_messages_p2025_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2025_12_pkey;


--
-- Name: thread_messages_p2025_12_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2025_12_senderId_idx";


--
-- Name: thread_messages_p2025_12_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2025_12_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_01_pkey;


--
-- Name: thread_messages_p2026_01_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_01_senderId_idx";


--
-- Name: thread_messages_p2026_01_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_01_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_02_pkey;


--
-- Name: thread_messages_p2026_02_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_02_senderId_idx";


--
-- Name: thread_messages_p2026_02_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_02_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_03_pkey;


--
-- Name: thread_messages_p2026_03_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_03_senderId_idx";


--
-- Name: thread_messages_p2026_03_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_03_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_04_pkey;


--
-- Name: thread_messages_p2026_04_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_04_senderId_idx";


--
-- Name: thread_messages_p2026_04_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_04_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_05_pkey;


--
-- Name: thread_messages_p2026_05_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_05_senderId_idx";


--
-- Name: thread_messages_p2026_05_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_05_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_06_pkey;


--
-- Name: thread_messages_p2026_06_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_06_senderId_idx";


--
-- Name: thread_messages_p2026_06_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_06_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_07_pkey;


--
-- Name: thread_messages_p2026_07_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_07_senderId_idx";


--
-- Name: thread_messages_p2026_07_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_07_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_08_pkey;


--
-- Name: thread_messages_p2026_08_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_08_senderId_idx";


--
-- Name: thread_messages_p2026_08_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_08_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_09_pkey;


--
-- Name: thread_messages_p2026_09_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_09_senderId_idx";


--
-- Name: thread_messages_p2026_09_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_09_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_10_pkey;


--
-- Name: thread_messages_p2026_10_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_10_senderId_idx";


--
-- Name: thread_messages_p2026_10_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_10_threadId_createdAt_idx";


--
-- Name: thread_messages_p2026_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p2026_11_pkey;


--
-- Name: thread_messages_p2026_11_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p2026_11_senderId_idx";


--
-- Name: thread_messages_p2026_11_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p2026_11_threadId_createdAt_idx";


--
-- Name: thread_messages_p_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.thread_messages_partitioned_pkey ATTACH PARTITION public.thread_messages_p_default_pkey;


--
-- Name: thread_messages_p_default_senderId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_sender ATTACH PARTITION public."thread_messages_p_default_senderId_idx";


--
-- Name: thread_messages_p_default_threadId_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_thread_messages_part_thread_created ATTACH PARTITION public."thread_messages_p_default_threadId_createdAt_idx";


--
-- Name: admin_role_assignments audit_admin_role_assignments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_admin_role_assignments AFTER INSERT OR DELETE OR UPDATE ON public.admin_role_assignments FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: approvals audit_approvals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_approvals AFTER INSERT OR DELETE OR UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: branches audit_branches; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_branches AFTER INSERT OR DELETE OR UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: client_module_permissions audit_client_module_permissions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_client_module_permissions AFTER INSERT OR DELETE OR UPDATE ON public.client_module_permissions FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: clients audit_clients; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_clients AFTER INSERT OR DELETE OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: enterprise_admins audit_enterprise_admins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_enterprise_admins AFTER INSERT OR DELETE OR UPDATE ON public.enterprise_admins FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: expenses audit_expenses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_expenses AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: module_assignments audit_module_assignments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_module_assignments AFTER INSERT OR DELETE OR UPDATE ON public.module_assignments FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: payment_requests audit_payment_requests; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_payment_requests AFTER INSERT OR DELETE OR UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: rbac_permissions audit_rbac_permissions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_rbac_permissions AFTER INSERT OR DELETE OR UPDATE ON public.rbac_permissions FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: rbac_roles audit_rbac_roles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_rbac_roles AFTER INSERT OR DELETE OR UPDATE ON public.rbac_roles FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: super_admins audit_super_admins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_super_admins AFTER INSERT OR DELETE OR UPDATE ON public.super_admins FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: user_bank_accounts audit_user_bank_accounts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_user_bank_accounts AFTER INSERT OR DELETE OR UPDATE ON public.user_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: user_kyc audit_user_kyc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_user_kyc AFTER INSERT OR DELETE OR UPDATE ON public.user_kyc FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: user_sessions audit_user_sessions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_user_sessions AFTER INSERT OR DELETE OR UPDATE ON public.user_sessions FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: users_enhanced audit_users_enhanced; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_users_enhanced AFTER INSERT OR DELETE OR UPDATE ON public.users_enhanced FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger_func();


--
-- Name: qa_issue_comments qa_issue_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER qa_issue_comments_updated_at BEFORE UPDATE ON public.qa_issue_comments FOR EACH ROW EXECUTE FUNCTION public.trigger_qa_updated_at();


--
-- Name: qa_issues qa_issues_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER qa_issues_updated_at BEFORE UPDATE ON public.qa_issues FOR EACH ROW EXECUTE FUNCTION public.trigger_qa_updated_at();


--
-- Name: qa_test_tasks qa_test_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER qa_test_tasks_updated_at BEFORE UPDATE ON public.qa_test_tasks FOR EACH ROW EXECUTE FUNCTION public.trigger_qa_updated_at();


--
-- Name: qa_issues set_issue_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_issue_code_trigger BEFORE INSERT ON public.qa_issues FOR EACH ROW EXECUTE FUNCTION public.trigger_set_issue_code();


--
-- Name: support_sessions trg_auto_expire_support_sessions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_expire_support_sessions BEFORE UPDATE ON public.support_sessions FOR EACH ROW EXECUTE FUNCTION public.auto_expire_support_sessions();


--
-- Name: customers trg_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_id_sequences trg_entity_sequences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_entity_sequences_updated_at BEFORE UPDATE ON public.entity_id_sequences FOR EACH ROW EXECUTE FUNCTION public.update_entity_sequences_updated_at();


--
-- Name: items trg_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_requests trg_task_request_log_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_task_request_log_changes AFTER UPDATE ON public.task_requests FOR EACH ROW EXECUTE FUNCTION public.log_task_request_status_changes();


--
-- Name: task_requests trg_task_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_task_requests_updated_at BEFORE UPDATE ON public.task_requests FOR EACH ROW EXECUTE FUNCTION public.update_task_request_updated_at();


--
-- Name: workflow_tasks trg_task_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_task_status_change AFTER UPDATE ON public.workflow_tasks FOR EACH ROW EXECUTE FUNCTION public.log_task_status_change();


--
-- Name: vendors trg_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_tasks trg_workflow_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workflow_tasks_updated_at BEFORE UPDATE ON public.workflow_tasks FOR EACH ROW EXECUTE FUNCTION public.update_workflow_tasks_timestamp();


--
-- Name: tenant_feature_unlocks trigger_audit_feature_unlock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_feature_unlock AFTER INSERT OR UPDATE ON public.tenant_feature_unlocks FOR EACH ROW EXECUTE FUNCTION public.audit_feature_unlock_change();


--
-- Name: feature_catalog trigger_feature_catalog_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_feature_catalog_updated BEFORE UPDATE ON public.feature_catalog FOR EACH ROW EXECUTE FUNCTION public.update_micro_unlock_timestamp();


--
-- Name: users_enhanced trigger_log_business_level_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_business_level_change AFTER UPDATE ON public.users_enhanced FOR EACH ROW WHEN ((old.business_level IS DISTINCT FROM new.business_level)) EXECUTE FUNCTION public.log_business_level_change();


--
-- Name: master_subscription_plans trigger_master_plans_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_master_plans_updated BEFORE UPDATE ON public.master_subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_subscription_timestamp();


--
-- Name: plan_feature_controls trigger_plan_features_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_plan_features_updated BEFORE UPDATE ON public.plan_feature_controls FOR EACH ROW EXECUTE FUNCTION public.update_subscription_timestamp();


--
-- Name: reconciliation_batches trigger_prevent_finalized_batch_modification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_prevent_finalized_batch_modification BEFORE UPDATE ON public.reconciliation_batches FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_batch_modification();


--
-- Name: client_subscriptions trigger_subscription_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_subscription_audit AFTER UPDATE ON public.client_subscriptions FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_state_change();


--
-- Name: client_subscriptions trigger_subscription_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_subscription_updated BEFORE UPDATE ON public.client_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_subscription_timestamp();


--
-- Name: tenant_plan_assignments trigger_tenant_plans_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_tenant_plans_updated BEFORE UPDATE ON public.tenant_plan_assignments FOR EACH ROW EXECUTE FUNCTION public.update_subscription_timestamp();


--
-- Name: tenant_feature_unlocks trigger_tenant_unlocks_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_tenant_unlocks_updated BEFORE UPDATE ON public.tenant_feature_unlocks FOR EACH ROW EXECUTE FUNCTION public.update_micro_unlock_timestamp();


--
-- Name: reconciliation_exceptions trigger_update_batch_stats_on_exception; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_batch_stats_on_exception AFTER INSERT OR DELETE OR UPDATE ON public.reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_batch_statistics();


--
-- Name: reconciliation_matches trigger_update_batch_stats_on_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_batch_stats_on_match AFTER INSERT OR DELETE OR UPDATE ON public.reconciliation_matches FOR EACH ROW EXECUTE FUNCTION public.update_batch_statistics();


--
-- Name: chat_feedback trigger_update_success_rate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_success_rate AFTER INSERT ON public.chat_feedback FOR EACH ROW WHEN ((new.training_data_id IS NOT NULL)) EXECUTE FUNCTION public.update_training_success_rate();


--
-- Name: workflows trigger_update_workflow; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_workflow BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_workflow_timestamp();


--
-- Name: usage_counters trigger_usage_counters_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_usage_counters_updated BEFORE UPDATE ON public.usage_counters FOR EACH ROW EXECUTE FUNCTION public.update_micro_unlock_timestamp();


--
-- Name: task_clarifications update_task_clarifications_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_clarifications_updated_at_trigger BEFORE UPDATE ON public.task_clarifications FOR EACH ROW EXECUTE FUNCTION public.update_task_clarifications_updated_at();


--
-- Name: tenant_quota_overrides update_tenant_quota_overrides_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenant_quota_overrides_updated_at BEFORE UPDATE ON public.tenant_quota_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenant_usage update_tenant_usage_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenant_usage_updated_at BEFORE UPDATE ON public.tenant_usage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users users_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_delete_trigger INSTEAD OF DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.users_delete_fn();


--
-- Name: users users_insert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_insert_trigger INSTEAD OF INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.users_insert_fn();


--
-- Name: users users_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_update_trigger INSTEAD OF UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.users_update_fn();


--
-- Name: _ClientToClientSequence _ClientToClientSequence_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ClientToClientSequence"
    ADD CONSTRAINT "_ClientToClientSequence_A_fkey" FOREIGN KEY ("A") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ClientToClientSequence _ClientToClientSequence_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ClientToClientSequence"
    ADD CONSTRAINT "_ClientToClientSequence_B_fkey" FOREIGN KEY ("B") REFERENCES public.client_sequences(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: approval_audit_log approval_audit_log_approval_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_log
    ADD CONSTRAINT approval_audit_log_approval_instance_id_fkey FOREIGN KEY (approval_instance_id) REFERENCES public.approval_instances(id) ON DELETE CASCADE;


--
-- Name: approval_instances approval_instances_current_stage_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_instances
    ADD CONSTRAINT approval_instances_current_stage_fkey FOREIGN KEY (current_stage_id) REFERENCES public.approval_workflow_stages(id);


--
-- Name: approval_instances approval_instances_workflow_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_instances
    ADD CONSTRAINT approval_instances_workflow_template_id_fkey FOREIGN KEY (workflow_template_id) REFERENCES public.approval_workflow_templates(id);


--
-- Name: approval_stage_instances approval_stage_instances_approval_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_stage_instances
    ADD CONSTRAINT approval_stage_instances_approval_instance_id_fkey FOREIGN KEY (approval_instance_id) REFERENCES public.approval_instances(id) ON DELETE CASCADE;


--
-- Name: approval_stage_instances approval_stage_instances_workflow_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_stage_instances
    ADD CONSTRAINT approval_stage_instances_workflow_stage_id_fkey FOREIGN KEY (workflow_stage_id) REFERENCES public.approval_workflow_stages(id);


--
-- Name: approval_workflow_stages approval_workflow_stages_workflow_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflow_stages
    ADD CONSTRAINT approval_workflow_stages_workflow_template_id_fkey FOREIGN KEY (workflow_template_id) REFERENCES public.approval_workflow_templates(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(id);


--
-- Name: bank_statement_lines bank_statement_lines_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_lines
    ADD CONSTRAINT bank_statement_lines_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.bank_statements(id) ON DELETE CASCADE;


--
-- Name: bank_statements bank_statements_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements
    ADD CONSTRAINT bank_statements_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.bank_templates(id);


--
-- Name: billing_invoice_items billing_invoice_items_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_invoice_items
    ADD CONSTRAINT billing_invoice_items_feature_key_fkey FOREIGN KEY (feature_key) REFERENCES public.feature_catalog(feature_key);


--
-- Name: billing_invoice_items billing_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_invoice_items
    ADD CONSTRAINT billing_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.micro_unlock_invoices(id) ON DELETE CASCADE;


--
-- Name: billing_overrides billing_overrides_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_overrides
    ADD CONSTRAINT billing_overrides_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: branches branches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: call_logs call_logs_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_feedback chat_feedback_training_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback
    ADD CONSTRAINT chat_feedback_training_data_id_fkey FOREIGN KEY (training_data_id) REFERENCES public.chat_training_data(id);


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_response_variants chat_response_variants_training_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_response_variants
    ADD CONSTRAINT chat_response_variants_training_data_id_fkey FOREIGN KEY (training_data_id) REFERENCES public.chat_training_data(id);


--
-- Name: chat_semantic_cache chat_semantic_cache_matched_training_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_semantic_cache
    ADD CONSTRAINT chat_semantic_cache_matched_training_id_fkey FOREIGN KEY (matched_training_id) REFERENCES public.chat_training_data(id);


--
-- Name: clarification_audit clarification_audit_clarification_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clarification_audit
    ADD CONSTRAINT clarification_audit_clarification_id_foreign FOREIGN KEY (clarification_id) REFERENCES public.task_clarifications(id) ON DELETE CASCADE;


--
-- Name: client_daily_usage client_daily_usage_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_daily_usage
    ADD CONSTRAINT client_daily_usage_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_daily_usage client_daily_usage_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_daily_usage
    ADD CONSTRAINT client_daily_usage_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_feature_overrides client_feature_overrides_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_feature_overrides
    ADD CONSTRAINT client_feature_overrides_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_module_permissions client_module_permissions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_module_permissions
    ADD CONSTRAINT client_module_permissions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_module_permissions client_module_permissions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_module_permissions
    ADD CONSTRAINT client_module_permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_onboarding_activity client_onboarding_activity_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_onboarding_activity
    ADD CONSTRAINT client_onboarding_activity_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_role_assignments client_role_assignments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_role_assignments
    ADD CONSTRAINT client_role_assignments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_role_assignments client_role_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_role_assignments
    ADD CONSTRAINT client_role_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.rbac_roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_subscriptions client_subscriptions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_subscriptions client_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: client_subscriptions client_subscriptions_scheduled_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_scheduled_plan_id_fkey FOREIGN KEY (scheduled_plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: client_usage_events client_usage_events_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events
    ADD CONSTRAINT client_usage_events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: client_usage_events client_usage_events_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_usage_events
    ADD CONSTRAINT client_usage_events_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_accounting_maps contract_accounting_maps_advance_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_accounting_maps
    ADD CONSTRAINT contract_accounting_maps_advance_ledger_id_fkey FOREIGN KEY (advance_ledger_id) REFERENCES public.ledgers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contract_accounting_maps contract_accounting_maps_expense_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_accounting_maps
    ADD CONSTRAINT contract_accounting_maps_expense_ledger_id_fkey FOREIGN KEY (expense_ledger_id) REFERENCES public.ledgers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contract_audit_logs contract_audit_logs_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_audit_logs
    ADD CONSTRAINT contract_audit_logs_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_documents contract_documents_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_financials contract_financials_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_financials
    ADD CONSTRAINT contract_financials_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_reminders contract_reminders_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_reminders
    ADD CONSTRAINT contract_reminders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customers customers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: enforcement_decision_log enforcement_decision_log_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enforcement_decision_log
    ADD CONSTRAINT enforcement_decision_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_paymentRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES public.payment_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: feature_grace_periods feature_grace_periods_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_grace_periods
    ADD CONSTRAINT feature_grace_periods_feature_key_fkey FOREIGN KEY (feature_key) REFERENCES public.feature_catalog(feature_key);


--
-- Name: feature_grace_periods feature_grace_periods_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_grace_periods
    ADD CONSTRAINT feature_grace_periods_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.micro_unlock_invoices(id);


--
-- Name: feature_grace_periods feature_grace_periods_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_grace_periods
    ADD CONSTRAINT feature_grace_periods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: feature_grace_periods feature_grace_periods_unlock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_grace_periods
    ADD CONSTRAINT feature_grace_periods_unlock_id_fkey FOREIGN KEY (unlock_id) REFERENCES public.tenant_feature_unlocks(id);


--
-- Name: feature_micro_unlocks feature_micro_unlocks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_micro_unlocks
    ADD CONSTRAINT feature_micro_unlocks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: feature_usage_counters feature_usage_counters_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_counters
    ADD CONSTRAINT feature_usage_counters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: admin_role_assignments fk_admin_role_assignments_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT fk_admin_role_assignments_role FOREIGN KEY (role_id) REFERENCES public.rbac_roles(id) ON DELETE CASCADE;


--
-- Name: branches fk_branches_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT fk_branches_client FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_module_permissions fk_client_module_permissions_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_module_permissions
    ADD CONSTRAINT fk_client_module_permissions_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_module_permissions fk_client_module_permissions_module; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_module_permissions
    ADD CONSTRAINT fk_client_module_permissions_module FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: clients fk_clients_super_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT fk_clients_super_admin FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON DELETE CASCADE;


--
-- Name: events fk_events_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT fk_events_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: task_label_assignments fk_label_label; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_label_assignments
    ADD CONSTRAINT fk_label_label FOREIGN KEY (label_id) REFERENCES public.task_labels(id) ON DELETE CASCADE;


--
-- Name: task_label_assignments fk_label_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_label_assignments
    ADD CONSTRAINT fk_label_task FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: module_assignments fk_module_assignments_module; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT fk_module_assignments_module FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: module_assignments fk_module_assignments_super_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT fk_module_assignments_super_admin FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON DELETE CASCADE;


--
-- Name: payment_activity_logs fk_payment_activity_logs_request; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_activity_logs
    ADD CONSTRAINT fk_payment_activity_logs_request FOREIGN KEY ("paymentRequestId") REFERENCES public.payment_requests(id) ON DELETE CASCADE;


--
-- Name: support_sessions fk_support_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_sessions
    ADD CONSTRAINT fk_support_user FOREIGN KEY (support_user_id) REFERENCES public.users_enhanced(id) ON DELETE CASCADE;


--
-- Name: support_sessions fk_target_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_sessions
    ADD CONSTRAINT fk_target_client FOREIGN KEY (target_client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: task_attachments fk_task_attachments_message; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT fk_task_attachments_message FOREIGN KEY (message_id) REFERENCES public.task_messages(id) ON DELETE SET NULL;


--
-- Name: task_attachments fk_task_attachments_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT fk_task_attachments_task FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: workflow_task_history fk_task_history_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_task_history
    ADD CONSTRAINT fk_task_history_task FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: task_messages fk_task_messages_reply; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_messages
    ADD CONSTRAINT fk_task_messages_reply FOREIGN KEY (reply_to_id) REFERENCES public.task_messages(id) ON DELETE SET NULL;


--
-- Name: task_messages fk_task_messages_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_messages
    ADD CONSTRAINT fk_task_messages_task FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: task_participants fk_task_participants_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_participants
    ADD CONSTRAINT fk_task_participants_task FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: task_time_entries fk_time_entry_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_time_entries
    ADD CONSTRAINT fk_time_entry_task FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: task_watchers fk_watcher_task; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_watchers
    ADD CONSTRAINT fk_watcher_task FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: items items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: journal_lines journal_lines_journal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: journal_lines journal_lines_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_ledger_id_fkey FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ledgers ledgers_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledgers
    ADD CONSTRAINT ledgers_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.ledgers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.thread_messages(id) ON DELETE CASCADE;


--
-- Name: message_reads message_reads_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.thread_messages(id) ON DELETE CASCADE;


--
-- Name: micro_unlock_audit_log micro_unlock_audit_log_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_unlock_audit_log
    ADD CONSTRAINT micro_unlock_audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: micro_unlock_invoices micro_unlock_invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.micro_unlock_invoices
    ADD CONSTRAINT micro_unlock_invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: module_approval_flows module_approval_flows_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_approval_flows
    ADD CONSTRAINT module_approval_flows_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: module_assignments module_assignments_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT module_assignments_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: module_assignments module_assignments_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT module_assignments_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_magic_links onboarding_magic_links_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_magic_links
    ADD CONSTRAINT onboarding_magic_links_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_activity_logs payment_activity_logs_paymentRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_activity_logs
    ADD CONSTRAINT "payment_activity_logs_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES public.payment_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_request_line_items payment_request_line_items_paymentRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_request_line_items
    ADD CONSTRAINT "payment_request_line_items_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES public.payment_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT "payment_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: plan_feature_controls plan_feature_controls_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_feature_controls
    ADD CONSTRAINT plan_feature_controls_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.master_subscription_plans(id) ON DELETE CASCADE;


--
-- Name: qa_issue_comments qa_issue_comments_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issue_comments
    ADD CONSTRAINT qa_issue_comments_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.qa_issues(id) ON DELETE CASCADE;


--
-- Name: qa_issue_history qa_issue_history_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issue_history
    ADD CONSTRAINT qa_issue_history_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.qa_issues(id) ON DELETE CASCADE;


--
-- Name: qa_issues qa_issues_related_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_issues
    ADD CONSTRAINT qa_issues_related_task_id_fkey FOREIGN KEY (related_task_id) REFERENCES public.qa_test_tasks(id) ON DELETE SET NULL;


--
-- Name: rbac_permissions rbac_permissions_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.rbac_actions(id) ON DELETE CASCADE;


--
-- Name: rbac_permissions rbac_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.rbac_roles(id) ON DELETE CASCADE;


--
-- Name: rbac_permissions rbac_permissions_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.rbac_routes(id) ON DELETE CASCADE;


--
-- Name: rbac_user_roles rbac_user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_user_roles
    ADD CONSTRAINT rbac_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.rbac_roles(id) ON DELETE CASCADE;


--
-- Name: reconciliation_audit_log reconciliation_audit_log_bank_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_audit_log
    ADD CONSTRAINT reconciliation_audit_log_bank_line_id_fkey FOREIGN KEY (bank_line_id) REFERENCES public.bank_statement_lines(id);


--
-- Name: reconciliation_audit_log reconciliation_audit_log_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_audit_log
    ADD CONSTRAINT reconciliation_audit_log_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.reconciliation_batches(id);


--
-- Name: reconciliation_batches reconciliation_batches_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_batches
    ADD CONSTRAINT reconciliation_batches_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.bank_statements(id);


--
-- Name: reconciliation_exceptions reconciliation_exceptions_bank_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_exceptions
    ADD CONSTRAINT reconciliation_exceptions_bank_line_id_fkey FOREIGN KEY (bank_line_id) REFERENCES public.bank_statement_lines(id);


--
-- Name: reconciliation_exceptions reconciliation_exceptions_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_exceptions
    ADD CONSTRAINT reconciliation_exceptions_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.reconciliation_batches(id) ON DELETE CASCADE;


--
-- Name: reconciliation_matches reconciliation_matches_bank_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_matches
    ADD CONSTRAINT reconciliation_matches_bank_line_id_fkey FOREIGN KEY (bank_line_id) REFERENCES public.bank_statement_lines(id);


--
-- Name: reconciliation_matches reconciliation_matches_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_matches
    ADD CONSTRAINT reconciliation_matches_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.reconciliation_batches(id) ON DELETE CASCADE;


--
-- Name: rent_contract_details rent_contract_details_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_contract_details
    ADD CONSTRAINT rent_contract_details_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_consumption resource_consumption_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_consumption
    ADD CONSTRAINT resource_consumption_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: review_audit review_audit_review_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_audit
    ADD CONSTRAINT review_audit_review_id_foreign FOREIGN KEY (review_id) REFERENCES public.task_reviews(id) ON DELETE CASCADE;


--
-- Name: review_comments review_comments_parent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES public.review_comments(id) ON DELETE CASCADE;


--
-- Name: review_comments review_comments_review_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_review_id_foreign FOREIGN KEY (review_id) REFERENCES public.task_reviews(id) ON DELETE CASCADE;


--
-- Name: scheduled_payables scheduled_payables_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_payables
    ADD CONSTRAINT scheduled_payables_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: scheduled_payables scheduled_payables_payment_journal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_payables
    ADD CONSTRAINT scheduled_payables_payment_journal_id_fkey FOREIGN KEY (payment_journal_id) REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: settlement_audit_log settlement_audit_log_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_audit_log
    ADD CONSTRAINT settlement_audit_log_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE CASCADE;


--
-- Name: settlement_line_items settlement_line_items_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_line_items
    ADD CONSTRAINT settlement_line_items_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE CASCADE;


--
-- Name: subscription_audit_log subscription_audit_log_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_audit_log
    ADD CONSTRAINT subscription_audit_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: subscription_audit_log subscription_audit_log_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_audit_log
    ADD CONSTRAINT subscription_audit_log_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.client_subscriptions(id) ON DELETE SET NULL;


--
-- Name: subscription_billing_ledger subscription_billing_ledger_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_billing_ledger
    ADD CONSTRAINT subscription_billing_ledger_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: subscription_invoices subscription_invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: subscription_invoices subscription_invoices_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.client_subscriptions(id) ON DELETE SET NULL;


--
-- Name: super_admins super_admins_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.enterprise_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_ticket_comments support_ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_comments
    ADD CONSTRAINT support_ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_audit task_audit_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_audit
    ADD CONSTRAINT task_audit_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: task_clarifications task_clarifications_task_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_clarifications
    ADD CONSTRAINT task_clarifications_task_id_foreign FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: task_request_history task_request_history_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_request_history
    ADD CONSTRAINT task_request_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.task_requests(id) ON DELETE CASCADE;


--
-- Name: task_request_messages task_request_messages_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_request_messages
    ADD CONSTRAINT task_request_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.task_requests(id) ON DELETE CASCADE;


--
-- Name: task_reviews task_reviews_task_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reviews
    ADD CONSTRAINT task_reviews_task_id_foreign FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(id) ON DELETE CASCADE;


--
-- Name: tenant_feature_unlocks tenant_feature_unlocks_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_feature_unlocks
    ADD CONSTRAINT tenant_feature_unlocks_feature_key_fkey FOREIGN KEY (feature_key) REFERENCES public.feature_catalog(feature_key) ON DELETE CASCADE;


--
-- Name: tenant_feature_unlocks tenant_feature_unlocks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_feature_unlocks
    ADD CONSTRAINT tenant_feature_unlocks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: tenant_plan_assignments tenant_plan_assignments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_plan_assignments
    ADD CONSTRAINT tenant_plan_assignments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.master_subscription_plans(id);


--
-- Name: tenant_plan_assignments tenant_plan_assignments_previous_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_plan_assignments
    ADD CONSTRAINT tenant_plan_assignments_previous_plan_id_fkey FOREIGN KEY (previous_plan_id) REFERENCES public.master_subscription_plans(id);


--
-- Name: tenant_plan_assignments tenant_plan_assignments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_plan_assignments
    ADD CONSTRAINT tenant_plan_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: tenant_spend_limits tenant_spend_limits_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_spend_limits
    ADD CONSTRAINT tenant_spend_limits_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: tenant_subscription tenant_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscription
    ADD CONSTRAINT tenant_subscription_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.micro_subscription_plans(id);


--
-- Name: tenant_subscription tenant_subscription_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscription
    ADD CONSTRAINT tenant_subscription_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: thread_members thread_members_threadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_members
    ADD CONSTRAINT "thread_members_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES public.threads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: thread_messages thread_messages_replyToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT "thread_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES public.thread_messages(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: thread_messages thread_messages_threadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT "thread_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES public.threads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usage_block_log usage_block_log_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_block_log
    ADD CONSTRAINT usage_block_log_feature_key_fkey FOREIGN KEY (feature_key) REFERENCES public.feature_catalog(feature_key);


--
-- Name: usage_block_log usage_block_log_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_block_log
    ADD CONSTRAINT usage_block_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: usage_counters usage_counters_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_feature_key_fkey FOREIGN KEY (feature_key) REFERENCES public.feature_catalog(feature_key) ON DELETE CASCADE;


--
-- Name: usage_counters usage_counters_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: user_branches user_branches_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vehicle_contract_details vehicle_contract_details_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_contract_details
    ADD CONSTRAINT vehicle_contract_details_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_contract_details vendor_contract_details_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contract_details
    ADD CONSTRAINT vendor_contract_details_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendors vendors_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: workflow_audit workflow_audit_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_audit
    ADD CONSTRAINT workflow_audit_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


--
-- Name: workflow_feedback workflow_feedback_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_feedback
    ADD CONSTRAINT workflow_feedback_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


--
-- Name: workflow_permission_map workflow_permission_map_permission_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_permission_map
    ADD CONSTRAINT workflow_permission_map_permission_key_fkey FOREIGN KEY (permission_key) REFERENCES public.permission_keys(permission_key) ON DELETE CASCADE;


--
-- Name: workflow_permission_map workflow_permission_map_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_permission_map
    ADD CONSTRAINT workflow_permission_map_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_role_map workflow_role_map_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_role_map
    ADD CONSTRAINT workflow_role_map_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: branches branches_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branches_tenant_isolation ON public.branches USING ((public.is_platform_admin() OR (tenant_id = public.current_tenant_id()) OR (tenant_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id()))))) WITH CHECK ((public.is_platform_admin() OR (tenant_id = public.current_tenant_id()) OR (tenant_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id())))));


--
-- Name: client_daily_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_daily_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: client_daily_usage client_daily_usage_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_daily_usage_tenant_isolation ON public.client_daily_usage USING ((public.is_platform_admin() OR (client_id = public.current_tenant_id()) OR (client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id())))));


--
-- Name: client_module_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_module_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: client_module_permissions client_module_permissions_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_module_permissions_tenant_isolation ON public.client_module_permissions USING ((public.is_platform_admin() OR (client_id = public.current_tenant_id()) OR (client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id())))));


--
-- Name: client_onboarding_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_onboarding_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: client_onboarding_activity client_onboarding_activity_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_onboarding_activity_tenant_isolation ON public.client_onboarding_activity USING ((public.is_platform_admin() OR (client_id = public.current_tenant_id()) OR (client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id())))));


--
-- Name: client_usage_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_usage_events ENABLE ROW LEVEL SECURITY;

--
-- Name: client_usage_events client_usage_events_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY client_usage_events_tenant_isolation ON public.client_usage_events USING ((public.is_platform_admin() OR (client_id = public.current_tenant_id()) OR (client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id())))));


--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: clients clients_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_tenant_isolation ON public.clients USING ((public.is_platform_admin() OR (super_admin_id = public.current_super_admin_id()))) WITH CHECK ((public.is_platform_admin() OR (super_admin_id = public.current_super_admin_id())));


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: customers customers_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_tenant_isolation ON public.customers USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses expenses_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_tenant_isolation ON public.expenses USING ((public.is_platform_admin() OR ("clientId" = public.current_tenant_id()) OR ("clientId" IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id()))))) WITH CHECK ((public.is_platform_admin() OR ("clientId" = public.current_tenant_id()) OR ("clientId" IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id())))));


--
-- Name: items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

--
-- Name: items items_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_tenant_isolation ON public.items USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: payment_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_requests payment_requests_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_requests_tenant_isolation ON public.payment_requests USING ((public.is_platform_admin() OR ("clientId" = public.current_tenant_id()) OR ("clientId" IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id()))))) WITH CHECK ((public.is_platform_admin() OR ("clientId" = public.current_tenant_id()) OR ("clientId" IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.super_admin_id = public.current_super_admin_id())))));


--
-- Name: qa_issue_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_issue_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_issue_comments qa_issue_comments_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_issue_comments_tenant_isolation ON public.qa_issue_comments USING ((EXISTS ( SELECT 1
   FROM public.qa_issues
  WHERE ((qa_issues.id = qa_issue_comments.issue_id) AND (public.is_platform_admin() OR (qa_issues.tenant_id = public.current_tenant_id())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.qa_issues
  WHERE ((qa_issues.id = qa_issue_comments.issue_id) AND (public.is_platform_admin() OR (qa_issues.tenant_id = public.current_tenant_id()))))));


--
-- Name: qa_issue_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_issue_history ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_issue_history qa_issue_history_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_issue_history_tenant_isolation ON public.qa_issue_history USING ((EXISTS ( SELECT 1
   FROM public.qa_issues
  WHERE ((qa_issues.id = qa_issue_history.issue_id) AND (public.is_platform_admin() OR (qa_issues.tenant_id = public.current_tenant_id())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.qa_issues
  WHERE ((qa_issues.id = qa_issue_history.issue_id) AND (public.is_platform_admin() OR (qa_issues.tenant_id = public.current_tenant_id()))))));


--
-- Name: qa_issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_issues ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_issues qa_issues_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_issues_tenant_isolation ON public.qa_issues USING ((public.is_platform_admin() OR (tenant_id = public.current_tenant_id()))) WITH CHECK ((public.is_platform_admin() OR (tenant_id = public.current_tenant_id())));


--
-- Name: qa_test_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_test_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_test_tasks qa_test_tasks_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_test_tasks_tenant_isolation ON public.qa_test_tasks USING ((public.is_platform_admin() OR (tenant_id = public.current_tenant_id()))) WITH CHECK ((public.is_platform_admin() OR (tenant_id = public.current_tenant_id())));


--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors vendors_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_tenant_isolation ON public.vendors USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- PostgreSQL database dump complete
--

\unrestrict 3iObDrn7KtdbEZhxUDAEpsJa1EBrhuuibwJ0spZu86hwpd41PWC7ExZyVGGewqL

