--
-- PostgreSQL database dump
--

\restrict wl3lKRhxs1hykIAmMIfEhuZuuSiLeaQmkizEQX30cZi9eLMMcIW79uDhjLsOA6V

-- Dumped from database version 17.6 (Postgres.app)
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
-- Name: erp; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA erp;


ALTER SCHEMA erp OWNER TO postgres;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AddressType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AddressType" AS ENUM (
    'PERMANENT',
    'OFFICE',
    'HOME',
    'CORRESPONDENCE'
);


ALTER TYPE public."AddressType" OWNER TO postgres;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);


ALTER TYPE public."Gender" OWNER TO postgres;

--
-- Name: KYCStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."KYCStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED'
);


ALTER TYPE public."KYCStatus" OWNER TO postgres;

--
-- Name: MaritalStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MaritalStatus" AS ENUM (
    'SINGLE',
    'MARRIED',
    'DIVORCED',
    'WIDOWED'
);


ALTER TYPE public."MaritalStatus" OWNER TO postgres;

--
-- Name: OcrStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OcrStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'DONE',
    'FAILED'
);


ALTER TYPE public."OcrStatus" OWNER TO postgres;

--
-- Name: ProficiencyLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProficiencyLevel" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT'
);


ALTER TYPE public."ProficiencyLevel" OWNER TO postgres;

--
-- Name: approval_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.approval_action AS ENUM (
    'APPROVED',
    'REJECTED',
    'RETURNED',
    'ESCALATED',
    'PENDING'
);


ALTER TYPE public.approval_action OWNER TO postgres;

--
-- Name: billing_cycle_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.billing_cycle_type AS ENUM (
    'MONTHLY',
    'YEARLY',
    'CUSTOM'
);


ALTER TYPE public.billing_cycle_type OWNER TO postgres;

--
-- Name: call_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.call_status AS ENUM (
    'ringing',
    'ongoing',
    'ended',
    'missed',
    'declined',
    'failed'
);


ALTER TYPE public.call_status OWNER TO postgres;

--
-- Name: client_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.client_status AS ENUM (
    'Active',
    'Inactive',
    'Suspended',
    'Pending',
    'Archived'
);


ALTER TYPE public.client_status OWNER TO postgres;

--
-- Name: feature_flag_value; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.feature_flag_value AS ENUM (
    'DISABLED',
    'ENABLED',
    'LIMITED',
    'UNLIMITED'
);


ALTER TYPE public.feature_flag_value OWNER TO postgres;

--
-- Name: message_type; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.message_type OWNER TO postgres;

--
-- Name: onboarding_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.onboarding_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE public.onboarding_status OWNER TO postgres;

--
-- Name: payment_request_status; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.payment_request_status OWNER TO postgres;

--
-- Name: subscription_plan; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_plan AS ENUM (
    'free',
    'starter',
    'professional',
    'enterprise',
    'custom'
);


ALTER TYPE public.subscription_plan OWNER TO postgres;

--
-- Name: subscription_plan_tier; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_plan_tier AS ENUM (
    'STARTER',
    'PROFESSIONAL',
    'BUSINESS',
    'ENTERPRISE',
    'CUSTOM'
);


ALTER TYPE public.subscription_plan_tier OWNER TO postgres;

--
-- Name: subscription_state; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.subscription_state OWNER TO postgres;

--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'suspended',
    'cancelled',
    'expired',
    'trial'
);


ALTER TYPE public.subscription_status OWNER TO postgres;

--
-- Name: task_status; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.task_status OWNER TO postgres;

--
-- Name: user_role_type; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.user_role_type OWNER TO postgres;

--
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.audit_trigger_function() OWNER TO postgres;

--
-- Name: decrypt_sensitive_data(text, text); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.decrypt_sensitive_data(encrypted_data text, key text) OWNER TO postgres;

--
-- Name: encrypt_sensitive_data(text, text); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.encrypt_sensitive_data(data text, key text) OWNER TO postgres;

--
-- Name: get_current_user_company_id(); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.get_current_user_company_id() OWNER TO postgres;

--
-- Name: get_current_user_id(); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.get_current_user_id() OWNER TO postgres;

--
-- Name: get_current_user_role(); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.get_current_user_role() OWNER TO postgres;

--
-- Name: hash_password(text, text); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.hash_password(password text, salt text) OWNER TO postgres;

--
-- Name: log_security_event(text, uuid, jsonb, inet, text); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.log_security_event(event_type text, user_id_param uuid, details jsonb, ip_address_param inet, user_agent_param text) OWNER TO postgres;

--
-- Name: password_change_trigger(); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.password_change_trigger() OWNER TO postgres;

--
-- Name: secure_login(text, text, inet, text); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.secure_login(user_email text, password text, ip_address inet, user_agent text) OWNER TO postgres;

--
-- Name: update_timestamp_function(); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.update_timestamp_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION erp.update_timestamp_function() OWNER TO postgres;

--
-- Name: validate_session(text); Type: FUNCTION; Schema: erp; Owner: postgres
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


ALTER FUNCTION erp.validate_session(token text) OWNER TO postgres;

--
-- Name: verify_password(text, text); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.verify_password(password text, hash text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$;


ALTER FUNCTION erp.verify_password(password text, hash text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: erp; Owner: postgres
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


ALTER TABLE erp.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_2025_10; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.audit_logs_2025_10 OWNER TO erp_admin;

--
-- Name: audit_logs_2025_11; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.audit_logs_2025_11 OWNER TO erp_admin;

--
-- Name: audit_logs_2025_12; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.audit_logs_2025_12 OWNER TO erp_admin;

--
-- Name: audit_logs_new; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.audit_logs_new OWNER TO erp_admin;

--
-- Name: chart_of_accounts; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.chart_of_accounts OWNER TO erp_admin;

--
-- Name: companies; Type: TABLE; Schema: erp; Owner: postgres
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


ALTER TABLE erp.companies OWNER TO postgres;

--
-- Name: currency; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.currency OWNER TO erp_admin;

--
-- Name: customers; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.customers OWNER TO erp_admin;

--
-- Name: departments; Type: TABLE; Schema: erp; Owner: postgres
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


ALTER TABLE erp.departments OWNER TO postgres;

--
-- Name: exchange_rates; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.exchange_rates OWNER TO erp_admin;

--
-- Name: fuel_types; Type: TABLE; Schema: erp; Owner: postgres
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


ALTER TABLE erp.fuel_types OWNER TO postgres;

--
-- Name: inventory_movements; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.inventory_movements OWNER TO erp_admin;

--
-- Name: inventory_movements_2025_10; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.inventory_movements_2025_10 OWNER TO erp_admin;

--
-- Name: inventory_movements_2025_11; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.inventory_movements_2025_11 OWNER TO erp_admin;

--
-- Name: inventory_movements_2025_12; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.inventory_movements_2025_12 OWNER TO erp_admin;

--
-- Name: product_categories; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.product_categories OWNER TO erp_admin;

--
-- Name: products; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.products OWNER TO erp_admin;

--
-- Name: pumps; Type: TABLE; Schema: erp; Owner: postgres
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


ALTER TABLE erp.pumps OWNER TO postgres;

--
-- Name: purchase_order_details; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.purchase_order_details OWNER TO erp_admin;

--
-- Name: purchase_orders; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.purchase_orders OWNER TO erp_admin;

--
-- Name: roles; Type: TABLE; Schema: erp; Owner: postgres
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


ALTER TABLE erp.roles OWNER TO postgres;

--
-- Name: sales_order_details; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.sales_order_details OWNER TO erp_admin;

--
-- Name: sales_orders; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.sales_orders OWNER TO erp_admin;

--
-- Name: tanks; Type: TABLE; Schema: erp; Owner: postgres
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


ALTER TABLE erp.tanks OWNER TO postgres;

--
-- Name: vendors; Type: TABLE; Schema: erp; Owner: erp_admin
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


ALTER TABLE erp.vendors OWNER TO erp_admin;

--
-- Name: _ClientToClientSequence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_ClientToClientSequence" (
    "A" uuid NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE public."_ClientToClientSequence" OWNER TO postgres;

--
-- Name: admin_role_assignments; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.admin_role_assignments OWNER TO postgres;

--
-- Name: admin_role_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_role_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_role_assignments_id_seq OWNER TO postgres;

--
-- Name: admin_role_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_role_assignments_id_seq OWNED BY public.admin_role_assignments.id;


--
-- Name: approval_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    approval_instance_id uuid NOT NULL,
    stage_instance_id uuid,
    action character varying(50) NOT NULL,
    action_category character varying(30) NOT NULL,
    performed_by uuid,
    performed_by_name character varying(200),
    performed_by_role character varying(50),
    is_system_action boolean DEFAULT false NOT NULL,
    previous_status character varying(50),
    new_status character varying(50),
    comment text,
    metadata jsonb,
    performed_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.approval_audit_log OWNER TO postgres;

--
-- Name: approval_delegation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_delegation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    delegator_id uuid NOT NULL,
    delegate_id uuid NOT NULL,
    workflow_template_id uuid,
    stage_id uuid,
    entity_type character varying(50),
    max_amount numeric(15,2),
    valid_from timestamp(6) with time zone NOT NULL,
    valid_until timestamp(6) with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    reason text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid NOT NULL,
    revoked_at timestamp(6) with time zone,
    revoked_by uuid
);


ALTER TABLE public.approval_delegation OWNER TO postgres;

--
-- Name: approval_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    workflow_template_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    entity_reference character varying(100),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    current_stage_id uuid,
    current_stage_order integer DEFAULT 0 NOT NULL,
    requested_amount numeric(15,2),
    request_metadata jsonb,
    initiated_by uuid NOT NULL,
    initiated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(6) with time zone,
    completed_by uuid,
    rejection_count integer DEFAULT 0 NOT NULL,
    last_rejection_reason text,
    last_rejected_by uuid,
    last_rejected_at timestamp(6) with time zone,
    expires_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone
);


ALTER TABLE public.approval_instances OWNER TO postgres;

--
-- Name: approval_levels; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.approval_levels OWNER TO postgres;

--
-- Name: approval_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_levels_id_seq OWNER TO postgres;

--
-- Name: approval_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_levels_id_seq OWNED BY public.approval_levels.id;


--
-- Name: approval_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    approval_instance_id uuid NOT NULL,
    stage_instance_id uuid,
    notification_type character varying(50) NOT NULL,
    recipient_id uuid NOT NULL,
    recipient_email character varying(255),
    title character varying(255) NOT NULL,
    message text NOT NULL,
    action_url character varying(500),
    channel character varying(30) DEFAULT 'in_app'::character varying NOT NULL,
    sent_at timestamp(6) with time zone,
    read_at timestamp(6) with time zone,
    delivery_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.approval_notifications OWNER TO postgres;

--
-- Name: approval_stage_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_stage_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_instance_id uuid NOT NULL,
    workflow_stage_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    stage_order integer NOT NULL,
    resolved_approver_id uuid,
    resolved_via character varying(30),
    fallback_applied character varying(30),
    fallback_reason text,
    actioned_by uuid,
    actioned_at timestamp(6) with time zone,
    action_comment text,
    activated_at timestamp(6) with time zone,
    due_at timestamp(6) with time zone,
    escalated_at timestamp(6) with time zone,
    escalated_to uuid,
    attempt_number integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone
);


ALTER TABLE public.approval_stage_instances OWNER TO postgres;

--
-- Name: approval_workflow_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_workflow_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_template_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    stage_order integer NOT NULL,
    assignee_type character varying(30) NOT NULL,
    assigned_user_id uuid,
    assigned_role character varying(50),
    assignment_condition jsonb,
    fallback_strategy character varying(30) DEFAULT 'auto_assign_admin'::character varying NOT NULL,
    fallback_user_id uuid,
    fallback_role character varying(50),
    secondary_fallback character varying(30),
    is_optional boolean DEFAULT false NOT NULL,
    is_conditional boolean DEFAULT false NOT NULL,
    condition_expression jsonb,
    allow_self_approval boolean DEFAULT false NOT NULL,
    require_comment boolean DEFAULT false NOT NULL,
    min_amount numeric(15,2),
    max_amount numeric(15,2),
    sla_hours integer DEFAULT 24 NOT NULL,
    escalation_hours integer DEFAULT 48 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone
);


ALTER TABLE public.approval_workflow_stages OWNER TO postgres;

--
-- Name: approval_workflow_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_workflow_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    entity_type character varying(50) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    allow_parallel_stages boolean DEFAULT false NOT NULL,
    require_all_approvals boolean DEFAULT true NOT NULL,
    max_rejection_count integer DEFAULT 3 NOT NULL,
    expiry_days integer DEFAULT 30 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by uuid,
    updated_at timestamp(6) with time zone
);


ALTER TABLE public.approval_workflow_templates OWNER TO postgres;

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.approvals OWNER TO postgres;

--
-- Name: approver_configurations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.approver_configurations OWNER TO postgres;

--
-- Name: approver_selection_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.approver_selection_logs OWNER TO postgres;

--
-- Name: assistant_memory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assistant_memory (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    "lastBranchId" integer,
    "lastModule" character varying(100),
    preferences jsonb,
    "lastSummary" text,
    "conversationCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.assistant_memory OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bills; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.bills OWNER TO postgres;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branches_id_seq OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_logs (
    id text NOT NULL,
    room_name character varying(255) NOT NULL,
    thread_id text NOT NULL,
    initiator_id uuid,
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


ALTER TABLE public.call_logs OWNER TO postgres;

--
-- Name: client_daily_usage; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.client_daily_usage OWNER TO postgres;

--
-- Name: client_module_permissions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.client_module_permissions OWNER TO postgres;

--
-- Name: client_module_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_module_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_module_permissions_id_seq OWNER TO postgres;

--
-- Name: client_module_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_module_permissions_id_seq OWNED BY public.client_module_permissions.id;


--
-- Name: client_onboarding_activity; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.client_onboarding_activity OWNER TO postgres;

--
-- Name: client_role_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_role_assignments (
    id integer NOT NULL,
    client_id uuid NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer
);


ALTER TABLE public.client_role_assignments OWNER TO postgres;

--
-- Name: client_role_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_role_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_role_assignments_id_seq OWNER TO postgres;

--
-- Name: client_role_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_role_assignments_id_seq OWNED BY public.client_role_assignments.id;


--
-- Name: client_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_sequences (
    id integer NOT NULL,
    client_type character varying(50) NOT NULL,
    year integer NOT NULL,
    last_number bigint DEFAULT 0 NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.client_sequences OWNER TO postgres;

--
-- Name: client_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_sequences_id_seq OWNER TO postgres;

--
-- Name: client_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_sequences_id_seq OWNED BY public.client_sequences.id;


--
-- Name: client_usage_events; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.client_usage_events OWNER TO postgres;

--
-- Name: client_usage_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_usage_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_usage_events_id_seq OWNER TO postgres;

--
-- Name: client_usage_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_usage_events_id_seq OWNED BY public.client_usage_events.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
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
    current_period_end timestamp(6) with time zone,
    cancel_at_period_end boolean DEFAULT false,
    trial_expired boolean DEFAULT false,
    payment_failed boolean DEFAULT false,
    payment_failed_at timestamp(6) with time zone,
    last_payment_at timestamp(6) with time zone,
    unique_id character varying(50)
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: enterprise_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enterprise_admins (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    profile_pic_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.enterprise_admins OWNER TO postgres;

--
-- Name: enterprise_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enterprise_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enterprise_admins_id_seq OWNER TO postgres;

--
-- Name: enterprise_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enterprise_admins_id_seq OWNED BY public.enterprise_admins.id;


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.error_logs OWNER TO postgres;

--
-- Name: error_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.error_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.error_logs_id_seq OWNER TO postgres;

--
-- Name: error_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.error_logs_id_seq OWNED BY public.error_logs.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    client_id uuid,
    user_id integer,
    event_type character varying(100) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: load_test_reports; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.load_test_reports OWNER TO postgres;

--
-- Name: load_test_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.load_test_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.load_test_reports_id_seq OWNER TO postgres;

--
-- Name: load_test_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.load_test_reports_id_seq OWNED BY public.load_test_reports.id;


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reactions (
    id bigint NOT NULL,
    message_id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    emoji character varying(20) NOT NULL,
    created_at timestamp(6) without time zone DEFAULT now()
);


ALTER TABLE public.message_reactions OWNER TO postgres;

--
-- Name: message_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_reactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_reactions_id_seq OWNER TO postgres;

--
-- Name: message_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_reactions_id_seq OWNED BY public.message_reactions.id;


--
-- Name: message_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reads (
    id bigint NOT NULL,
    message_id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp(6) without time zone DEFAULT now()
);


ALTER TABLE public.message_reads OWNER TO postgres;

--
-- Name: message_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_reads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_reads_id_seq OWNER TO postgres;

--
-- Name: message_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_reads_id_seq OWNED BY public.message_reads.id;


--
-- Name: migration_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migration_history (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    applied_by character varying(100) DEFAULT CURRENT_USER,
    backup_file text,
    checksum text
);


ALTER TABLE public.migration_history OWNER TO postgres;

--
-- Name: migration_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migration_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migration_history_id_seq OWNER TO postgres;

--
-- Name: migration_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migration_history_id_seq OWNED BY public.migration_history.id;


--
-- Name: module_approval_flows; Type: TABLE; Schema: public; Owner: postgres
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
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.module_approval_flows OWNER TO postgres;

--
-- Name: module_approval_flows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_approval_flows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_approval_flows_id_seq OWNER TO postgres;

--
-- Name: module_approval_flows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_approval_flows_id_seq OWNED BY public.module_approval_flows.id;


--
-- Name: module_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_assignments (
    id integer NOT NULL,
    super_admin_id integer NOT NULL,
    module_id integer NOT NULL,
    assigned_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    page_permissions jsonb
);


ALTER TABLE public.module_assignments OWNER TO postgres;

--
-- Name: module_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_assignments_id_seq OWNER TO postgres;

--
-- Name: module_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_assignments_id_seq OWNED BY public.module_assignments.id;


--
-- Name: modules; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.modules OWNER TO postgres;

--
-- Name: modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.modules_id_seq OWNER TO postgres;

--
-- Name: modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modules_id_seq OWNED BY public.modules.id;


--
-- Name: onboarding_magic_links; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.onboarding_magic_links OWNER TO postgres;

--
-- Name: otp_tokens; Type: TABLE; Schema: public; Owner: postgres
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
    blocked_until timestamp(3) without time zone
);


ALTER TABLE public.otp_tokens OWNER TO postgres;

--
-- Name: payment_activity_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.payment_activity_logs OWNER TO postgres;

--
-- Name: payment_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_activity_logs_id_seq OWNER TO postgres;

--
-- Name: payment_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_activity_logs_id_seq OWNED BY public.payment_activity_logs.id;


--
-- Name: payment_execution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_execution (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_instance_id uuid NOT NULL,
    transaction_number character varying(100) NOT NULL,
    payment_method character varying(50),
    payment_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    executed_by uuid NOT NULL,
    executed_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    verified_by uuid,
    verified_at timestamp(6) with time zone,
    bank_reference character varying(100),
    receipt_url character varying(500),
    notes text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone
);


ALTER TABLE public.payment_execution OWNER TO postgres;

--
-- Name: payment_records; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.payment_records OWNER TO postgres;

--
-- Name: payment_request_line_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.payment_request_line_items OWNER TO postgres;

--
-- Name: payment_request_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_request_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_request_line_items_id_seq OWNER TO postgres;

--
-- Name: payment_request_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_request_line_items_id_seq OWNED BY public.payment_request_line_items.id;


--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.payment_requests OWNER TO postgres;

--
-- Name: rate_limit_violations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.rate_limit_violations OWNER TO postgres;

--
-- Name: rate_limit_violations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rate_limit_violations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rate_limit_violations_id_seq OWNER TO postgres;

--
-- Name: rate_limit_violations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rate_limit_violations_id_seq OWNED BY public.rate_limit_violations.id;


--
-- Name: rbac_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rbac_actions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    display_name character varying(100),
    is_active boolean DEFAULT true
);


ALTER TABLE public.rbac_actions OWNER TO postgres;

--
-- Name: rbac_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rbac_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rbac_actions_id_seq OWNER TO postgres;

--
-- Name: rbac_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rbac_actions_id_seq OWNED BY public.rbac_actions.id;


--
-- Name: rbac_permissions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.rbac_permissions OWNER TO postgres;

--
-- Name: rbac_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rbac_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rbac_permissions_id_seq OWNER TO postgres;

--
-- Name: rbac_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rbac_permissions_id_seq OWNED BY public.rbac_permissions.id;


--
-- Name: rbac_roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.rbac_roles OWNER TO postgres;

--
-- Name: rbac_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rbac_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rbac_roles_id_seq OWNER TO postgres;

--
-- Name: rbac_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rbac_roles_id_seq OWNED BY public.rbac_roles.id;


--
-- Name: rbac_routes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.rbac_routes OWNER TO postgres;

--
-- Name: rbac_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rbac_routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rbac_routes_id_seq OWNER TO postgres;

--
-- Name: rbac_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rbac_routes_id_seq OWNED BY public.rbac_routes.id;


--
-- Name: rbac_user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rbac_user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    page_key character varying(255) NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.rbac_user_permissions OWNER TO postgres;

--
-- Name: rbac_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rbac_user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rbac_user_permissions_id_seq OWNER TO postgres;

--
-- Name: rbac_user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rbac_user_permissions_id_seq OWNED BY public.rbac_user_permissions.id;


--
-- Name: rbac_user_roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.rbac_user_roles OWNER TO postgres;

--
-- Name: rbac_user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rbac_user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rbac_user_roles_id_seq OWNER TO postgres;

--
-- Name: rbac_user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rbac_user_roles_id_seq OWNED BY public.rbac_user_roles.id;


--
-- Name: recent_activity; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.recent_activity OWNER TO postgres;

--
-- Name: super_admins; Type: TABLE; Schema: public; Owner: postgres
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
    created_by integer NOT NULL
);


ALTER TABLE public.super_admins OWNER TO postgres;

--
-- Name: super_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.super_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.super_admins_id_seq OWNER TO postgres;

--
-- Name: super_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.super_admins_id_seq OWNED BY public.super_admins.id;


--
-- Name: system_health_config; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.system_health_config OWNER TO postgres;

--
-- Name: system_health_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_health_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_health_config_id_seq OWNER TO postgres;

--
-- Name: system_health_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_health_config_id_seq OWNED BY public.system_health_config.id;


--
-- Name: system_metric_daily; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.system_metric_daily OWNER TO postgres;

--
-- Name: system_metric_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_metric_daily_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_metric_daily_id_seq OWNER TO postgres;

--
-- Name: system_metric_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_metric_daily_id_seq OWNED BY public.system_metric_daily.id;


--
-- Name: system_metric_samples; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_metric_samples (
    id integer NOT NULL,
    "latencyMs" integer NOT NULL,
    "errorRatePct" double precision NOT NULL,
    "reqCount" integer DEFAULT 0 NOT NULL,
    "errCount" integer DEFAULT 0 NOT NULL,
    collected_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.system_metric_samples OWNER TO postgres;

--
-- Name: system_metric_samples_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_metric_samples_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_metric_samples_id_seq OWNER TO postgres;

--
-- Name: system_metric_samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_metric_samples_id_seq OWNED BY public.system_metric_samples.id;


--
-- Name: tenant_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_usage (
    id integer NOT NULL,
    tenant_id character varying(50) NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    api_calls integer DEFAULT 0 NOT NULL,
    storage_bytes bigint DEFAULT 0 NOT NULL,
    active_users integer DEFAULT 0 NOT NULL,
    feature_usage jsonb DEFAULT '{}'::jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tenant_usage OWNER TO postgres;

--
-- Name: tenant_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenant_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenant_usage_id_seq OWNER TO postgres;

--
-- Name: tenant_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenant_usage_id_seq OWNED BY public.tenant_usage.id;


--
-- Name: thread_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.thread_members (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "userId" uuid,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    "joinedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leftAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.thread_members OWNER TO postgres;

--
-- Name: thread_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.thread_messages (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" uuid NOT NULL,
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


ALTER TABLE public.thread_messages OWNER TO postgres;

--
-- Name: threads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.threads (
    id text NOT NULL,
    title character varying(200),
    "createdById" uuid,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.threads OWNER TO postgres;

--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_achievements OWNER TO postgres;

--
-- Name: user_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_achievements_id_seq OWNER TO postgres;

--
-- Name: user_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_achievements_id_seq OWNED BY public.user_achievements.id;


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_addresses OWNER TO postgres;

--
-- Name: user_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_addresses_id_seq OWNER TO postgres;

--
-- Name: user_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_addresses_id_seq OWNED BY public.user_addresses.id;


--
-- Name: user_bank_accounts; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_bank_accounts OWNER TO postgres;

--
-- Name: user_bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_bank_accounts_id_seq OWNER TO postgres;

--
-- Name: user_bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_bank_accounts_id_seq OWNED BY public.user_bank_accounts.id;


--
-- Name: user_branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_branches (
    id integer NOT NULL,
    user_id integer NOT NULL,
    branch_id integer NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.user_branches OWNER TO postgres;

--
-- Name: user_branches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_branches_id_seq OWNER TO postgres;

--
-- Name: user_branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_branches_id_seq OWNED BY public.user_branches.id;


--
-- Name: user_education; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_education OWNER TO postgres;

--
-- Name: user_education_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_education_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_education_id_seq OWNER TO postgres;

--
-- Name: user_education_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_education_id_seq OWNED BY public.user_education.id;


--
-- Name: user_emergency_contacts; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_emergency_contacts OWNER TO postgres;

--
-- Name: user_emergency_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_emergency_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_emergency_contacts_id_seq OWNER TO postgres;

--
-- Name: user_emergency_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_emergency_contacts_id_seq OWNED BY public.user_emergency_contacts.id;


--
-- Name: user_kyc; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_kyc OWNER TO postgres;

--
-- Name: user_kyc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_kyc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_kyc_id_seq OWNER TO postgres;

--
-- Name: user_kyc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_kyc_id_seq OWNED BY public.user_kyc.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_profiles_id_seq OWNER TO postgres;

--
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_sessions_id_seq OWNER TO postgres;

--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: user_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_skills (
    id integer NOT NULL,
    user_id integer NOT NULL,
    skill_name character varying(255) NOT NULL,
    proficiency_level public."ProficiencyLevel" NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.user_skills OWNER TO postgres;

--
-- Name: user_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_skills_id_seq OWNER TO postgres;

--
-- Name: user_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_skills_id_seq OWNED BY public.user_skills.id;


--
-- Name: admin_role_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_role_assignments ALTER COLUMN id SET DEFAULT nextval('public.admin_role_assignments_id_seq'::regclass);


--
-- Name: approval_levels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_levels ALTER COLUMN id SET DEFAULT nextval('public.approval_levels_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: client_module_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_module_permissions ALTER COLUMN id SET DEFAULT nextval('public.client_module_permissions_id_seq'::regclass);


--
-- Name: client_role_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_role_assignments ALTER COLUMN id SET DEFAULT nextval('public.client_role_assignments_id_seq'::regclass);


--
-- Name: client_sequences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sequences ALTER COLUMN id SET DEFAULT nextval('public.client_sequences_id_seq'::regclass);


--
-- Name: client_usage_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_usage_events ALTER COLUMN id SET DEFAULT nextval('public.client_usage_events_id_seq'::regclass);


--
-- Name: enterprise_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enterprise_admins ALTER COLUMN id SET DEFAULT nextval('public.enterprise_admins_id_seq'::regclass);


--
-- Name: error_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_logs ALTER COLUMN id SET DEFAULT nextval('public.error_logs_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: load_test_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.load_test_reports ALTER COLUMN id SET DEFAULT nextval('public.load_test_reports_id_seq'::regclass);


--
-- Name: message_reactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions ALTER COLUMN id SET DEFAULT nextval('public.message_reactions_id_seq'::regclass);


--
-- Name: message_reads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reads ALTER COLUMN id SET DEFAULT nextval('public.message_reads_id_seq'::regclass);


--
-- Name: migration_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migration_history ALTER COLUMN id SET DEFAULT nextval('public.migration_history_id_seq'::regclass);


--
-- Name: module_approval_flows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_approval_flows ALTER COLUMN id SET DEFAULT nextval('public.module_approval_flows_id_seq'::regclass);


--
-- Name: module_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_assignments ALTER COLUMN id SET DEFAULT nextval('public.module_assignments_id_seq'::regclass);


--
-- Name: modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules ALTER COLUMN id SET DEFAULT nextval('public.modules_id_seq'::regclass);


--
-- Name: payment_activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.payment_activity_logs_id_seq'::regclass);


--
-- Name: payment_request_line_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_request_line_items ALTER COLUMN id SET DEFAULT nextval('public.payment_request_line_items_id_seq'::regclass);


--
-- Name: rate_limit_violations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate_limit_violations ALTER COLUMN id SET DEFAULT nextval('public.rate_limit_violations_id_seq'::regclass);


--
-- Name: rbac_actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_actions ALTER COLUMN id SET DEFAULT nextval('public.rbac_actions_id_seq'::regclass);


--
-- Name: rbac_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_permissions ALTER COLUMN id SET DEFAULT nextval('public.rbac_permissions_id_seq'::regclass);


--
-- Name: rbac_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_roles ALTER COLUMN id SET DEFAULT nextval('public.rbac_roles_id_seq'::regclass);


--
-- Name: rbac_routes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_routes ALTER COLUMN id SET DEFAULT nextval('public.rbac_routes_id_seq'::regclass);


--
-- Name: rbac_user_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_user_permissions ALTER COLUMN id SET DEFAULT nextval('public.rbac_user_permissions_id_seq'::regclass);


--
-- Name: rbac_user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_user_roles ALTER COLUMN id SET DEFAULT nextval('public.rbac_user_roles_id_seq'::regclass);


--
-- Name: super_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins ALTER COLUMN id SET DEFAULT nextval('public.super_admins_id_seq'::regclass);


--
-- Name: system_health_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_health_config ALTER COLUMN id SET DEFAULT nextval('public.system_health_config_id_seq'::regclass);


--
-- Name: system_metric_daily id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_metric_daily ALTER COLUMN id SET DEFAULT nextval('public.system_metric_daily_id_seq'::regclass);


--
-- Name: system_metric_samples id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_metric_samples ALTER COLUMN id SET DEFAULT nextval('public.system_metric_samples_id_seq'::regclass);


--
-- Name: tenant_usage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_usage ALTER COLUMN id SET DEFAULT nextval('public.tenant_usage_id_seq'::regclass);


--
-- Name: user_achievements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements ALTER COLUMN id SET DEFAULT nextval('public.user_achievements_id_seq'::regclass);


--
-- Name: user_addresses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses ALTER COLUMN id SET DEFAULT nextval('public.user_addresses_id_seq'::regclass);


--
-- Name: user_bank_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.user_bank_accounts_id_seq'::regclass);


--
-- Name: user_branches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_branches ALTER COLUMN id SET DEFAULT nextval('public.user_branches_id_seq'::regclass);


--
-- Name: user_education id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_education ALTER COLUMN id SET DEFAULT nextval('public.user_education_id_seq'::regclass);


--
-- Name: user_emergency_contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_emergency_contacts ALTER COLUMN id SET DEFAULT nextval('public.user_emergency_contacts_id_seq'::regclass);


--
-- Name: user_kyc id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc ALTER COLUMN id SET DEFAULT nextval('public.user_kyc_id_seq'::regclass);


--
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: user_skills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills ALTER COLUMN id SET DEFAULT nextval('public.user_skills_id_seq'::regclass);


--
-- Name: _ClientToClientSequence _ClientToClientSequence_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_ClientToClientSequence"
    ADD CONSTRAINT "_ClientToClientSequence_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: admin_role_assignments admin_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT admin_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: approval_audit_log approval_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_audit_log
    ADD CONSTRAINT approval_audit_log_pkey PRIMARY KEY (id);


--
-- Name: approval_delegation approval_delegation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_delegation
    ADD CONSTRAINT approval_delegation_pkey PRIMARY KEY (id);


--
-- Name: approval_instances approval_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_instances
    ADD CONSTRAINT approval_instances_pkey PRIMARY KEY (id);


--
-- Name: approval_levels approval_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_levels
    ADD CONSTRAINT approval_levels_pkey PRIMARY KEY (id);


--
-- Name: approval_notifications approval_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_notifications
    ADD CONSTRAINT approval_notifications_pkey PRIMARY KEY (id);


--
-- Name: approval_stage_instances approval_stage_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_stage_instances
    ADD CONSTRAINT approval_stage_instances_pkey PRIMARY KEY (id);


--
-- Name: approval_workflow_stages approval_workflow_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_workflow_stages
    ADD CONSTRAINT approval_workflow_stages_pkey PRIMARY KEY (id);


--
-- Name: approval_workflow_templates approval_workflow_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_workflow_templates
    ADD CONSTRAINT approval_workflow_templates_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: approver_configurations approver_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approver_configurations
    ADD CONSTRAINT approver_configurations_pkey PRIMARY KEY (id);


--
-- Name: approver_selection_logs approver_selection_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approver_selection_logs
    ADD CONSTRAINT approver_selection_logs_pkey PRIMARY KEY (id);


--
-- Name: assistant_memory assistant_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assistant_memory
    ADD CONSTRAINT assistant_memory_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: client_daily_usage client_daily_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_daily_usage
    ADD CONSTRAINT client_daily_usage_pkey PRIMARY KEY (date, client_id, module_id);


--
-- Name: client_module_permissions client_module_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_module_permissions
    ADD CONSTRAINT client_module_permissions_pkey PRIMARY KEY (id);


--
-- Name: client_onboarding_activity client_onboarding_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_onboarding_activity
    ADD CONSTRAINT client_onboarding_activity_pkey PRIMARY KEY (id);


--
-- Name: client_role_assignments client_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_role_assignments
    ADD CONSTRAINT client_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: client_sequences client_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sequences
    ADD CONSTRAINT client_sequences_pkey PRIMARY KEY (id);


--
-- Name: client_usage_events client_usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_usage_events
    ADD CONSTRAINT client_usage_events_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: enterprise_admins enterprise_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enterprise_admins
    ADD CONSTRAINT enterprise_admins_pkey PRIMARY KEY (id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: load_test_reports load_test_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.load_test_reports
    ADD CONSTRAINT load_test_reports_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: message_reads message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_pkey PRIMARY KEY (id);


--
-- Name: migration_history migration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migration_history
    ADD CONSTRAINT migration_history_pkey PRIMARY KEY (id);


--
-- Name: module_approval_flows module_approval_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_approval_flows
    ADD CONSTRAINT module_approval_flows_pkey PRIMARY KEY (id);


--
-- Name: module_assignments module_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT module_assignments_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: onboarding_magic_links onboarding_magic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_magic_links
    ADD CONSTRAINT onboarding_magic_links_pkey PRIMARY KEY (id);


--
-- Name: otp_tokens otp_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_tokens
    ADD CONSTRAINT otp_tokens_pkey PRIMARY KEY (id);


--
-- Name: payment_activity_logs payment_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_activity_logs
    ADD CONSTRAINT payment_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: payment_execution payment_execution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_execution
    ADD CONSTRAINT payment_execution_pkey PRIMARY KEY (id);


--
-- Name: payment_records payment_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_records
    ADD CONSTRAINT payment_records_pkey PRIMARY KEY (id);


--
-- Name: payment_request_line_items payment_request_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_request_line_items
    ADD CONSTRAINT payment_request_line_items_pkey PRIMARY KEY (id);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_violations rate_limit_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate_limit_violations
    ADD CONSTRAINT rate_limit_violations_pkey PRIMARY KEY (id);


--
-- Name: rbac_actions rbac_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_actions
    ADD CONSTRAINT rbac_actions_pkey PRIMARY KEY (id);


--
-- Name: rbac_permissions rbac_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_pkey PRIMARY KEY (id);


--
-- Name: rbac_roles rbac_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_roles
    ADD CONSTRAINT rbac_roles_pkey PRIMARY KEY (id);


--
-- Name: rbac_routes rbac_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_routes
    ADD CONSTRAINT rbac_routes_pkey PRIMARY KEY (id);


--
-- Name: rbac_user_permissions rbac_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_user_permissions
    ADD CONSTRAINT rbac_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: rbac_user_roles rbac_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_user_roles
    ADD CONSTRAINT rbac_user_roles_pkey PRIMARY KEY (id);


--
-- Name: recent_activity recent_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recent_activity
    ADD CONSTRAINT recent_activity_pkey PRIMARY KEY (id);


--
-- Name: super_admins super_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_pkey PRIMARY KEY (id);


--
-- Name: system_health_config system_health_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_health_config
    ADD CONSTRAINT system_health_config_pkey PRIMARY KEY (id);


--
-- Name: system_metric_daily system_metric_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_metric_daily
    ADD CONSTRAINT system_metric_daily_pkey PRIMARY KEY (id);


--
-- Name: system_metric_samples system_metric_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_metric_samples
    ADD CONSTRAINT system_metric_samples_pkey PRIMARY KEY (id);


--
-- Name: tenant_usage tenant_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_usage
    ADD CONSTRAINT tenant_usage_pkey PRIMARY KEY (id);


--
-- Name: thread_members thread_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.thread_members
    ADD CONSTRAINT thread_members_pkey PRIMARY KEY (id);


--
-- Name: thread_messages thread_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_pkey PRIMARY KEY (id);


--
-- Name: threads threads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threads
    ADD CONSTRAINT threads_pkey PRIMARY KEY (id);


--
-- Name: message_reactions uq_message_reactions_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT uq_message_reactions_unique UNIQUE (message_id, user_id, emoji);


--
-- Name: message_reads uq_message_reads_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT uq_message_reads_unique UNIQUE (message_id, user_id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: user_bank_accounts user_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_bank_accounts
    ADD CONSTRAINT user_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: user_branches user_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_pkey PRIMARY KEY (id);


--
-- Name: user_education user_education_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_education
    ADD CONSTRAINT user_education_pkey PRIMARY KEY (id);


--
-- Name: user_emergency_contacts user_emergency_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_emergency_contacts
    ADD CONSTRAINT user_emergency_contacts_pkey PRIMARY KEY (id);


--
-- Name: user_kyc user_kyc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (id);


--
-- Name: idx_assistant_memory_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assistant_memory_user ON public.assistant_memory USING btree ("userId");


--
-- Name: idx_call_logs_initiator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_initiator ON public.call_logs USING btree (initiator_id);


--
-- Name: idx_error_logs_error_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_logs_error_code ON public.error_logs USING btree (error_code);


--
-- Name: idx_error_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_logs_timestamp ON public.error_logs USING btree ("timestamp" DESC);


--
-- Name: idx_message_reactions_emoji; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reactions_emoji ON public.message_reactions USING btree (emoji);


--
-- Name: idx_message_reactions_message; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reactions_message ON public.message_reactions USING btree (message_id);


--
-- Name: idx_message_reactions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reactions_user ON public.message_reactions USING btree (user_id);


--
-- Name: idx_message_reads_message; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reads_message ON public.message_reads USING btree (message_id);


--
-- Name: idx_message_reads_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reads_user ON public.message_reads USING btree (user_id);


--
-- Name: idx_message_reads_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reads_user_date ON public.message_reads USING btree (user_id, read_at DESC);


--
-- Name: idx_thread_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_thread_messages_sender ON public.thread_messages USING btree ("senderId");


--
-- Name: idx_thread_messages_sender_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_thread_messages_sender_created ON public.thread_messages USING btree ("senderId", "createdAt" DESC);


--
-- Name: message_reactions fk_message_reactions_message; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT fk_message_reactions_message FOREIGN KEY (message_id) REFERENCES public.thread_messages(id) ON DELETE CASCADE;


--
-- Name: message_reads fk_message_reads_message; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT fk_message_reads_message FOREIGN KEY (message_id) REFERENCES public.thread_messages(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict wl3lKRhxs1hykIAmMIfEhuZuuSiLeaQmkizEQX30cZi9eLMMcIW79uDhjLsOA6V

