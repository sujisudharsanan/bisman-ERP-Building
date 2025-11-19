--
-- PostgreSQL database dump
--

\restrict 4o7u5WzmxfLl9IuG6vc49LuKBCiAvb1438CIGg4mwFSfPx9eDf4GjL5U0tJZxvd

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
-- Name: cleanup_ai_cache(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_ai_cache() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_analytics_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_ai_cache() OWNER TO postgres;

--
-- Name: FUNCTION cleanup_ai_cache(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.cleanup_ai_cache() IS 'Remove expired cache entries';


--
-- Name: cleanup_old_ai_conversations(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_ai_conversations(days_to_keep integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_conversations
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_old_ai_conversations(days_to_keep integer) OWNER TO postgres;

--
-- Name: FUNCTION cleanup_old_ai_conversations(days_to_keep integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.cleanup_old_ai_conversations(days_to_keep integer) IS 'Cleanup AI conversations older than specified days (default 90)';


--
-- Name: get_best_approver_for_level(integer, numeric, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_best_approver_for_level(p_level integer, p_amount numeric DEFAULT NULL::numeric, p_requested_user_ids text[] DEFAULT NULL::text[]) RETURNS TABLE(user_id text, username text, email text, pending_tasks integer, approval_limit numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u."id",
        u."username",
        u."email",
        COALESCE(COUNT(t."id"), 0)::INTEGER AS pending_tasks,
        ac."approvalLimit"
    FROM "User" u
    LEFT JOIN "ApproverConfiguration" ac ON ac."userId" = u."id" AND ac."level" = p_level AND ac."isActive" = true
    LEFT JOIN "ApprovalLevel" al ON al."level" = p_level AND al."isActive" = true
    LEFT JOIN "Task" t ON t."assigneeId" = u."id" AND t."status" = 'PENDING'
    WHERE u."role" = al."roleName"
      AND u."is_active" = true
      AND (ac."isAvailable" = true OR ac."isAvailable" IS NULL)
      AND (ac."autoAssign" = true OR ac."autoAssign" IS NULL)
      AND (p_amount IS NULL OR ac."approvalLimit" IS NULL OR ac."approvalLimit" >= p_amount)
      AND (p_requested_user_ids IS NULL OR u."id" = ANY(p_requested_user_ids))
    GROUP BY u."id", u."username", u."email", ac."approvalLimit", ac."priority"
    ORDER BY 
        -- Requested users first
        CASE WHEN p_requested_user_ids IS NOT NULL AND u."id" = ANY(p_requested_user_ids) THEN 0 ELSE 1 END,
        -- Then by priority (if configured)
        COALESCE(ac."priority", 0) DESC,
        -- Then by workload (least busy)
        COUNT(t."id") ASC,
        -- Finally by username (for deterministic results)
        u."username" ASC
    LIMIT 1;
END;
$$;


ALTER FUNCTION public.get_best_approver_for_level(p_level integer, p_amount numeric, p_requested_user_ids text[]) OWNER TO postgres;

--
-- Name: update_calendar_items_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_calendar_items_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_calendar_items_timestamp() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.actions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.actions OWNER TO postgres;

--
-- Name: actions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.actions_id_seq OWNER TO postgres;

--
-- Name: actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.actions_id_seq OWNED BY public.actions.id;


--
-- Name: alarms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alarms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    label text,
    time_at timestamp with time zone,
    repeat_rule text,
    status text DEFAULT 'active'::text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.alarms OWNER TO postgres;

--
-- Name: TABLE alarms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.alarms IS 'User alarms and reminders';


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
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalLimit" numeric(15,2)
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
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
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
-- Name: calendar_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by integer,
    title text NOT NULL,
    description text,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    timezone text DEFAULT 'Asia/Kolkata'::text,
    participants jsonb,
    location text,
    reminders jsonb,
    source_page_id uuid,
    external_id text,
    status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.calendar_items OWNER TO postgres;

--
-- Name: TABLE calendar_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.calendar_items IS 'Calendar events, meetings, and tasks';


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    "productType" character varying(50) NOT NULL,
    super_admin_id integer NOT NULL,
    "subscriptionPlan" character varying(50) DEFAULT 'free'::character varying NOT NULL,
    "subscriptionStatus" character varying(50) DEFAULT 'active'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    settings jsonb,
    logo text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: enterprise_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enterprise_admins (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
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
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "senderId" integer NOT NULL,
    body text,
    attachments jsonb,
    type character varying(50) DEFAULT 'TEXT'::character varying NOT NULL,
    meta jsonb,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

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
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
-- Name: page_audit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_audit (
    id integer NOT NULL,
    user_id integer,
    action text,
    meta jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.page_audit OWNER TO postgres;

--
-- Name: TABLE page_audit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.page_audit IS 'Audit log for page fetching and calendar operations';


--
-- Name: page_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.page_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.page_audit_id_seq OWNER TO postgres;

--
-- Name: page_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.page_audit_id_seq OWNED BY public.page_audit.id;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text NOT NULL,
    title text,
    description text,
    h1 text,
    h2 text,
    contacts jsonb,
    structured jsonb,
    raw_html text,
    fetched_by integer,
    fetched_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.pages OWNER TO postgres;

--
-- Name: TABLE pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pages IS 'Stores fetched web pages for meeting/event creation';


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
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payment_requests OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    role character varying(50) NOT NULL,
    module_id integer NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


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
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: routes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routes (
    id integer NOT NULL,
    path character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    method character varying(10) DEFAULT 'GET'::character varying,
    module character varying(50),
    is_protected boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.routes OWNER TO postgres;

--
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.routes_id_seq OWNER TO postgres;

--
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- Name: super_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admins (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
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
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id text NOT NULL,
    "expenseId" text NOT NULL,
    "paymentRequestId" text NOT NULL,
    title character varying(300) NOT NULL,
    description text,
    "currentLevel" integer DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    "createdById" integer NOT NULL,
    "assigneeId" integer,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.tasks OWNER TO postgres;

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
    is_active boolean DEFAULT true
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
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    profile_pic_url text,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    "assignedModules" jsonb,
    "pagePermissions" jsonb,
    "productType" character varying(50) DEFAULT 'BUSINESS_ERP'::character varying,
    super_admin_id integer,
    tenant_id uuid,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vocab; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vocab (
    id integer NOT NULL,
    term text NOT NULL,
    definition text NOT NULL,
    normalized_term text NOT NULL,
    user_id text NOT NULL,
    visibility text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vocab_visibility_check CHECK ((visibility = ANY (ARRAY['personal'::text, 'public'::text])))
);


ALTER TABLE public.vocab OWNER TO postgres;

--
-- Name: vocab_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vocab_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vocab_id_seq OWNER TO postgres;

--
-- Name: vocab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vocab_id_seq OWNED BY public.vocab.id;


--
-- Name: vocab_pending; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vocab_pending (
    id integer NOT NULL,
    term text NOT NULL,
    normalized_term text NOT NULL,
    user_id text NOT NULL,
    suggestions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.vocab_pending OWNER TO postgres;

--
-- Name: vocab_pending_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vocab_pending_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vocab_pending_id_seq OWNER TO postgres;

--
-- Name: vocab_pending_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vocab_pending_id_seq OWNED BY public.vocab_pending.id;


--
-- Name: actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actions ALTER COLUMN id SET DEFAULT nextval('public.actions_id_seq'::regclass);


--
-- Name: approval_levels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_levels ALTER COLUMN id SET DEFAULT nextval('public.approval_levels_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: enterprise_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enterprise_admins ALTER COLUMN id SET DEFAULT nextval('public.enterprise_admins_id_seq'::regclass);


--
-- Name: migration_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migration_history ALTER COLUMN id SET DEFAULT nextval('public.migration_history_id_seq'::regclass);


--
-- Name: module_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_assignments ALTER COLUMN id SET DEFAULT nextval('public.module_assignments_id_seq'::regclass);


--
-- Name: modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules ALTER COLUMN id SET DEFAULT nextval('public.modules_id_seq'::regclass);


--
-- Name: page_audit id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_audit ALTER COLUMN id SET DEFAULT nextval('public.page_audit_id_seq'::regclass);


--
-- Name: payment_activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.payment_activity_logs_id_seq'::regclass);


--
-- Name: payment_request_line_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_request_line_items ALTER COLUMN id SET DEFAULT nextval('public.payment_request_line_items_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


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
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- Name: super_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins ALTER COLUMN id SET DEFAULT nextval('public.super_admins_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vocab id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vocab ALTER COLUMN id SET DEFAULT nextval('public.vocab_id_seq'::regclass);


--
-- Name: vocab_pending id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vocab_pending ALTER COLUMN id SET DEFAULT nextval('public.vocab_pending_id_seq'::regclass);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: actions actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_pkey PRIMARY KEY (id);


--
-- Name: alarms alarms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alarms
    ADD CONSTRAINT alarms_pkey PRIMARY KEY (id);


--
-- Name: approval_levels approval_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_levels
    ADD CONSTRAINT approval_levels_pkey PRIMARY KEY (id);


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
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: calendar_items calendar_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_items
    ADD CONSTRAINT calendar_items_pkey PRIMARY KEY (id);


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
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: migration_history migration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migration_history
    ADD CONSTRAINT migration_history_pkey PRIMARY KEY (id);


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
-- Name: page_audit page_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_audit
    ADD CONSTRAINT page_audit_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: payment_activity_logs payment_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_activity_logs
    ADD CONSTRAINT payment_activity_logs_pkey PRIMARY KEY (id);


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
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


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
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: super_admins super_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vocab_pending vocab_pending_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vocab_pending
    ADD CONSTRAINT vocab_pending_pkey PRIMARY KEY (id);


--
-- Name: vocab vocab_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vocab
    ADD CONSTRAINT vocab_pkey PRIMARY KEY (id);


--
-- Name: actions_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX actions_name_key ON public.actions USING btree (name);


--
-- Name: approval_levels_level_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX approval_levels_level_key ON public.approval_levels USING btree (level);


--
-- Name: approver_configurations_userId_level_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "approver_configurations_userId_level_key" ON public.approver_configurations USING btree ("userId", level);


--
-- Name: enterprise_admins_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX enterprise_admins_email_key ON public.enterprise_admins USING btree (email);


--
-- Name: expenses_paymentRequestId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "expenses_paymentRequestId_key" ON public.expenses USING btree ("paymentRequestId");


--
-- Name: expenses_requestId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "expenses_requestId_key" ON public.expenses USING btree ("requestId");


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_action ON public.payment_activity_logs USING btree (action);


--
-- Name: idx_activity_logs_payment_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_payment_request ON public.payment_activity_logs USING btree ("paymentRequestId");


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_user ON public.payment_activity_logs USING btree ("userId");


--
-- Name: idx_alarms_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alarms_time ON public.alarms USING btree (time_at);


--
-- Name: idx_alarms_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alarms_user ON public.alarms USING btree (user_id);


--
-- Name: idx_approval_levels_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_levels_level ON public.approval_levels USING btree (level);


--
-- Name: idx_approvals_approver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_approver ON public.approvals USING btree ("approverId");


--
-- Name: idx_approvals_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_level ON public.approvals USING btree (level);


--
-- Name: idx_approvals_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_task ON public.approvals USING btree ("taskId");


--
-- Name: idx_approver_config_availability; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approver_config_availability ON public.approver_configurations USING btree ("isActive", "isAvailable");


--
-- Name: idx_approver_config_level_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approver_config_level_active ON public.approver_configurations USING btree (level, "isActive");


--
-- Name: idx_approver_config_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approver_config_user ON public.approver_configurations USING btree ("userId");


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_calendar_items_start; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_items_start ON public.calendar_items USING btree (start_at);


--
-- Name: idx_calendar_items_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_items_user ON public.calendar_items USING btree (created_by);


--
-- Name: idx_clients_product_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_product_type ON public.clients USING btree ("productType");


--
-- Name: idx_clients_super_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_super_admin ON public.clients USING btree (super_admin_id);


--
-- Name: idx_expenses_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_creator ON public.expenses USING btree ("createdById");


--
-- Name: idx_expenses_payment_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_payment_request ON public.expenses USING btree ("paymentRequestId");


--
-- Name: idx_expenses_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_request_id ON public.expenses USING btree ("requestId");


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_line_items_payment_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_line_items_payment_request ON public.payment_request_line_items USING btree ("paymentRequestId");


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender ON public.messages USING btree ("senderId");


--
-- Name: idx_messages_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_task ON public.messages USING btree ("taskId");


--
-- Name: idx_messages_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_type ON public.messages USING btree (type);


--
-- Name: idx_module_assignments_module; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_assignments_module ON public.module_assignments USING btree (module_id);


--
-- Name: idx_module_assignments_super_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_assignments_super_admin ON public.module_assignments USING btree (super_admin_id);


--
-- Name: idx_modules_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_modules_active ON public.modules USING btree (is_active);


--
-- Name: idx_modules_product_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_modules_product_type ON public.modules USING btree ("productType");


--
-- Name: idx_pages_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_url ON public.pages USING btree (url);


--
-- Name: idx_payment_records_paid_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_records_paid_by ON public.payment_records USING btree ("paidById");


--
-- Name: idx_payment_records_payment_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_records_payment_request ON public.payment_records USING btree ("paymentRequestId");


--
-- Name: idx_payment_records_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_records_task ON public.payment_records USING btree ("taskId");


--
-- Name: idx_payment_records_transaction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_records_transaction ON public.payment_records USING btree ("transactionId");


--
-- Name: idx_payment_requests_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_client ON public.payment_requests USING btree ("clientId");


--
-- Name: idx_payment_requests_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_creator ON public.payment_requests USING btree ("createdById");


--
-- Name: idx_payment_requests_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_request_id ON public.payment_requests USING btree ("requestId");


--
-- Name: idx_payment_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_status ON public.payment_requests USING btree (status);


--
-- Name: idx_payment_requests_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_token ON public.payment_requests USING btree ("paymentToken");


--
-- Name: idx_permissions_module; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permissions_module ON public.permissions USING btree (module_id);


--
-- Name: idx_permissions_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permissions_role ON public.permissions USING btree (role);


--
-- Name: idx_rbac_permissions_action_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_permissions_action_id ON public.rbac_permissions USING btree (action_id);


--
-- Name: idx_rbac_permissions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_permissions_active ON public.rbac_permissions USING btree (is_active);


--
-- Name: idx_rbac_permissions_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_permissions_name ON public.rbac_permissions USING btree (name);


--
-- Name: idx_rbac_permissions_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_permissions_role_id ON public.rbac_permissions USING btree (role_id);


--
-- Name: idx_rbac_permissions_route_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_permissions_route_id ON public.rbac_permissions USING btree (route_id);


--
-- Name: idx_rbac_routes_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_routes_active ON public.rbac_routes USING btree (is_active);


--
-- Name: idx_rbac_routes_menu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_routes_menu ON public.rbac_routes USING btree (is_menu_item);


--
-- Name: idx_rbac_user_roles_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_user_roles_active ON public.rbac_user_roles USING btree (is_active);


--
-- Name: idx_rbac_user_roles_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_user_roles_role_id ON public.rbac_user_roles USING btree (role_id);


--
-- Name: idx_rbac_user_roles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rbac_user_roles_user_id ON public.rbac_user_roles USING btree (user_id);


--
-- Name: idx_recent_activity_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recent_activity_created_at ON public.recent_activity USING btree (created_at DESC);


--
-- Name: idx_recent_activity_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recent_activity_entity ON public.recent_activity USING btree (entity);


--
-- Name: idx_recent_activity_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recent_activity_user_id ON public.recent_activity USING btree (user_id);


--
-- Name: idx_selection_log_approver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_selection_log_approver ON public.approver_selection_logs USING btree ("selectedApproverId");


--
-- Name: idx_selection_log_level_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_selection_log_level_created ON public.approver_selection_logs USING btree (level, "createdAt");


--
-- Name: idx_selection_log_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_selection_log_task ON public.approver_selection_logs USING btree ("taskId");


--
-- Name: idx_super_admins_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admins_created_by ON public.super_admins USING btree (created_by);


--
-- Name: idx_super_admins_product_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admins_product_type ON public.super_admins USING btree ("productType");


--
-- Name: idx_tasks_assignee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_assignee ON public.tasks USING btree ("assigneeId");


--
-- Name: idx_tasks_expense; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_expense ON public.tasks USING btree ("expenseId");


--
-- Name: idx_tasks_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_level ON public.tasks USING btree ("currentLevel");


--
-- Name: idx_tasks_payment_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_payment_request ON public.tasks USING btree ("paymentRequestId");


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_user_permissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_user_id ON public.rbac_user_permissions USING btree (user_id);


--
-- Name: idx_user_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (session_token);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);


--
-- Name: idx_users_product_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_product_type ON public.users USING btree ("productType");


--
-- Name: idx_users_super_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_super_admin ON public.users USING btree (super_admin_id);


--
-- Name: idx_users_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_tenant ON public.users USING btree (tenant_id);


--
-- Name: migration_history_migration_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX migration_history_migration_name_key ON public.migration_history USING btree (migration_name);


--
-- Name: module_assignments_super_admin_id_module_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX module_assignments_super_admin_id_module_id_key ON public.module_assignments USING btree (super_admin_id, module_id);


--
-- Name: modules_module_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX modules_module_name_key ON public.modules USING btree (module_name);


--
-- Name: payment_requests_paymentToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "payment_requests_paymentToken_key" ON public.payment_requests USING btree ("paymentToken");


--
-- Name: payment_requests_requestId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "payment_requests_requestId_key" ON public.payment_requests USING btree ("requestId");


--
-- Name: permissions_role_module_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX permissions_role_module_id_key ON public.permissions USING btree (role, module_id);


--
-- Name: rbac_actions_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX rbac_actions_name_key ON public.rbac_actions USING btree (name);


--
-- Name: rbac_permissions_role_id_action_id_route_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX rbac_permissions_role_id_action_id_route_id_key ON public.rbac_permissions USING btree (role_id, action_id, route_id);


--
-- Name: rbac_roles_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX rbac_roles_name_key ON public.rbac_roles USING btree (name);


--
-- Name: rbac_routes_path_method_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX rbac_routes_path_method_key ON public.rbac_routes USING btree (path, method);


--
-- Name: rbac_user_permissions_user_id_page_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX rbac_user_permissions_user_id_page_key_key ON public.rbac_user_permissions USING btree (user_id, page_key);


--
-- Name: rbac_user_roles_user_id_role_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX rbac_user_roles_user_id_role_id_key ON public.rbac_user_roles USING btree (user_id, role_id);


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: routes_path_method_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX routes_path_method_key ON public.routes USING btree (path, method);


--
-- Name: super_admins_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX super_admins_email_key ON public.super_admins USING btree (email);


--
-- Name: tasks_expenseId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tasks_expenseId_key" ON public.tasks USING btree ("expenseId");


--
-- Name: tasks_paymentRequestId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tasks_paymentRequestId_key" ON public.tasks USING btree ("paymentRequestId");


--
-- Name: user_sessions_session_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_sessions_session_token_key ON public.user_sessions USING btree (session_token);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: calendar_items calendar_items_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER calendar_items_updated BEFORE UPDATE ON public.calendar_items FOR EACH ROW EXECUTE FUNCTION public.update_calendar_items_timestamp();


--
-- Name: alarms alarms_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alarms
    ADD CONSTRAINT alarms_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: approvals approvals_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: approvals approvals_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "approvals_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: approver_configurations approver_configurations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approver_configurations
    ADD CONSTRAINT "approver_configurations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: approver_selection_logs approver_selection_logs_selectedApproverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approver_selection_logs
    ADD CONSTRAINT "approver_selection_logs_selectedApproverId_fkey" FOREIGN KEY ("selectedApproverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: approver_selection_logs approver_selection_logs_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approver_selection_logs
    ADD CONSTRAINT "approver_selection_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: calendar_items calendar_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_items
    ADD CONSTRAINT calendar_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: calendar_items calendar_items_source_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_items
    ADD CONSTRAINT calendar_items_source_page_id_fkey FOREIGN KEY (source_page_id) REFERENCES public.pages(id);


--
-- Name: clients clients_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_paymentRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES public.payment_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: messages messages_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: module_assignments module_assignments_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT module_assignments_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: module_assignments module_assignments_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_assignments
    ADD CONSTRAINT module_assignments_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: page_audit page_audit_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_audit
    ADD CONSTRAINT page_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: pages pages_fetched_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_fetched_by_fkey FOREIGN KEY (fetched_by) REFERENCES public.users(id);


--
-- Name: payment_activity_logs payment_activity_logs_paymentRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_activity_logs
    ADD CONSTRAINT "payment_activity_logs_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES public.payment_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_activity_logs payment_activity_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_activity_logs
    ADD CONSTRAINT "payment_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_records payment_records_paidById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_records
    ADD CONSTRAINT "payment_records_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_records payment_records_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_records
    ADD CONSTRAINT "payment_records_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_request_line_items payment_request_line_items_paymentRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_request_line_items
    ADD CONSTRAINT "payment_request_line_items_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES public.payment_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT "payment_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_requests payment_requests_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT "payment_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: permissions permissions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rbac_permissions rbac_permissions_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.rbac_actions(id) ON DELETE CASCADE;


--
-- Name: rbac_permissions rbac_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.rbac_roles(id) ON DELETE CASCADE;


--
-- Name: rbac_permissions rbac_permissions_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_permissions
    ADD CONSTRAINT rbac_permissions_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.rbac_routes(id) ON DELETE CASCADE;


--
-- Name: rbac_user_roles rbac_user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rbac_user_roles
    ADD CONSTRAINT rbac_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.rbac_roles(id) ON DELETE CASCADE;


--
-- Name: super_admins super_admins_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.enterprise_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tasks tasks_assigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasks tasks_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tasks tasks_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "tasks_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tasks tasks_paymentRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "tasks_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES public.payment_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 4o7u5WzmxfLl9IuG6vc49LuKBCiAvb1438CIGg4mwFSfPx9eDf4GjL5U0tJZxvd

