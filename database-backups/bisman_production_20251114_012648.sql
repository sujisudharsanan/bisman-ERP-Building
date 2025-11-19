--
-- PostgreSQL database dump
--

\restrict rqeMzMJ5liDp8SRNNH5hQrYu38pXlPHXWTsxUBK0Y8Xc42RVBYCXyeguhcTWaFG

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
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
69775631-3b70-491d-bdbd-57478d970a51	78907df1fdc11173e2486c3787ea97255d624faa89215693f1b7b0993ba8429c	\N	20250926_add_roles_table	\N	2025-10-25 23:21:04.87668+05:30	2025-10-25 23:19:44.627261+05:30	0
21d274a8-5178-480c-a781-8744914f7653	78907df1fdc11173e2486c3787ea97255d624faa89215693f1b7b0993ba8429c	2025-10-25 23:21:04.88118+05:30	20250926_add_roles_table		\N	2025-10-25 23:21:04.88118+05:30	0
\.


--
-- Data for Name: actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.actions (id, name, description, created_at) FROM stdin;
\.


--
-- Data for Name: alarms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alarms (id, user_id, label, time_at, repeat_rule, status, created_at) FROM stdin;
\.


--
-- Data for Name: approval_levels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_levels (id, level, "levelName", "roleName", "sortOrder", "isActive", "createdAt", "updatedAt", "approvalLimit") FROM stdin;
\.


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approvals (id, "taskId", level, "levelName", "approverId", action, comment, attachments, "createdAt") FROM stdin;
\.


--
-- Data for Name: approver_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approver_configurations (id, "userId", level, "approvalLimit", "isActive", "isAvailable", "autoAssign", priority, "maxConcurrentTasks", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: approver_selection_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approver_selection_logs (id, "taskId", "paymentRequestId", level, "selectedApproverId", "requestedApprovers", "availableApprovers", "selectionMethod", "paymentAmount", "approverWorkload", metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, created_at) FROM stdin;
\.


--
-- Data for Name: calendar_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendar_items (id, created_by, title, description, start_at, end_at, timezone, participants, location, reminders, source_page_id, external_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, name, "productType", super_admin_id, "subscriptionPlan", "subscriptionStatus", is_active, settings, logo, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440001	ABC Manufacturing Ltd	BUSINESS_ERP	1	premium	active	t	\N	\N	2025-10-26 04:56:59.46	2025-10-26 04:56:59.46
550e8400-e29b-41d4-a716-446655440002	XYZ Industries Pvt Ltd	BUSINESS_ERP	1	basic	active	t	\N	\N	2025-10-26 04:56:59.469	2025-10-26 04:56:59.469
550e8400-e29b-41d4-a716-446655440003	HP Petrol Pump - Station A	PUMP_ERP	2	premium	active	t	\N	\N	2025-10-26 04:56:59.473	2025-10-26 04:56:59.473
550e8400-e29b-41d4-a716-446655440004	Shell Fuel Station - Highway	PUMP_ERP	2	basic	active	t	\N	\N	2025-10-26 04:56:59.477	2025-10-26 04:56:59.477
\.


--
-- Data for Name: enterprise_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enterprise_admins (id, name, email, password, profile_pic_url, is_active, created_at, updated_at) FROM stdin;
1	Enterprise Administrator	enterprise@bisman.erp	$2a$10$gegpBoNZzsv0LSKwZbYkke4EDY.K3SWLKzgjQKvDNOVyEXClBEC96	\N	t	2025-10-26 04:56:59.114	2025-10-29 17:54:03.184
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, "requestId", "paymentRequestId", "createdById", "clientId", description, amount, currency, "dueDate", status, attachments, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, "taskId", "senderId", body, attachments, type, meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: migration_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migration_history (id, migration_name, applied_at, applied_by, backup_file, checksum) FROM stdin;
\.


--
-- Data for Name: module_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.module_assignments (id, super_admin_id, module_id, assigned_at, page_permissions) FROM stdin;
34	1	3	2025-11-03 17:02:55.833	["dashboard"]
48	1	1	2025-11-13 15:05:10.276	["dashboard", "accounts", "accounts-payable", "accounts-receivable", "accounts-payable-summary", "general-ledger", "executive-dashboard", "cfo-dashboard", "finance-controller", "treasury", "banker"]
9	2	9	2025-10-26 04:56:59.435	\N
10	2	10	2025-10-26 04:56:59.438	\N
11	2	11	2025-10-26 04:56:59.442	\N
12	2	12	2025-10-26 04:56:59.447	\N
13	2	13	2025-10-26 04:56:59.452	\N
14	2	14	2025-10-26 04:56:59.456	\N
33	1	10	2025-10-26 14:10:42.327	["hub-incharge"]
35	1	17	2025-10-26 14:43:50.53	["dashboard", "user-management", "user-creation", "roles-users", "pages-roles", "permission-manager", "company-setup", "system-settings", "master-data", "integration-settings", "api-config", "system-health", "scheduler", "deployment", "backup-restore", "audit-logs", "error-logs", "server-logs", "about-me"]
42	1	5	2025-11-02 08:22:19.456	\N
44	1	7	2025-11-02 08:22:19.466	\N
46	1	19	2025-11-02 08:22:19.479	\N
47	1	18	2025-11-02 09:40:28.715	["dashboard", "security", "system", "orders"]
45	1	8	2025-11-03 16:51:34.427	["about-me"]
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modules (id, module_name, display_name, description, route, icon, "productType", is_active, sort_order, created_at, updated_at) FROM stdin;
1	finance	Finance	\N	/finance	Banknote	BUSINESS_ERP	t	1	2025-10-26 04:56:59.128	2025-10-26 04:56:59.128
2	hr	Human Resources	\N	/hr	Users	BUSINESS_ERP	t	2	2025-10-26 04:56:59.137	2025-10-26 04:56:59.137
3	admin	Administration	\N	/admin	Shield	BUSINESS_ERP	t	3	2025-10-26 04:56:59.142	2025-10-26 04:56:59.142
4	procurement	Procurement	\N	/procurement	ShoppingCart	BUSINESS_ERP	t	4	2025-10-26 04:56:59.151	2025-10-26 04:56:59.151
5	inventory	Inventory	\N	/inventory	Boxes	BUSINESS_ERP	t	5	2025-10-26 04:56:59.16	2025-10-26 04:56:59.16
6	compliance	Compliance	\N	/compliance	ClipboardCheck	BUSINESS_ERP	t	6	2025-10-26 04:56:59.167	2025-10-26 04:56:59.167
7	legal	Legal	\N	/legal	Scale	BUSINESS_ERP	t	7	2025-10-26 04:56:59.174	2025-10-26 04:56:59.174
8	common	Common	\N	/common	Settings	BUSINESS_ERP	t	99	2025-10-26 04:56:59.181	2025-10-26 04:56:59.181
9	pump-management	Pump Management	\N	/pump-management	Fuel	PUMP_ERP	t	1	2025-10-26 04:56:59.187	2025-10-26 04:56:59.187
10	operations	Operations	\N	/operations	Briefcase	PUMP_ERP	t	2	2025-10-26 04:56:59.191	2025-10-26 04:56:59.191
11	fuel-management	Fuel Management	\N	/fuel-management	Droplet	PUMP_ERP	t	3	2025-10-26 04:56:59.198	2025-10-26 04:56:59.198
12	pump-sales	Sales & POS	\N	/pump-sales	DollarSign	PUMP_ERP	t	4	2025-10-26 04:56:59.205	2025-10-26 04:56:59.205
13	pump-inventory	Pump Inventory	\N	/pump-inventory	Package	PUMP_ERP	t	5	2025-10-26 04:56:59.211	2025-10-26 04:56:59.211
14	pump-reports	Reports & Analytics	\N	/pump-reports	BarChart	PUMP_ERP	t	6	2025-10-26 04:56:59.22	2025-10-26 04:56:59.22
15	analytics	Analytics	\N	/analytics	TrendingUp	ALL	t	1	2025-10-26 04:56:59.226	2025-10-26 04:56:59.226
16	subscriptions	Subscriptions	\N	/subscriptions	CreditCard	ALL	t	2	2025-10-26 04:56:59.232	2025-10-26 04:56:59.232
17	system	System Administration	System settings, users, and configuration	/system	\N	BUSINESS_ERP	t	0	2025-10-26 14:38:59.942	2025-10-26 14:38:59.942
18	super-admin	Super Admin	Super Admin specific functionality	/super-admin	shield	BUSINESS_ERP	t	18	2025-10-26 15:06:13.03	2025-10-26 15:06:13.03
19	task-management	Task Management	Task and workflow management system	/tasks	tasks	BUSINESS_ERP	t	19	2025-10-26 15:06:13.157	2025-10-26 15:06:13.157
\.


--
-- Data for Name: page_audit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.page_audit (id, user_id, action, meta, created_at) FROM stdin;
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pages (id, url, title, description, h1, h2, contacts, structured, raw_html, fetched_by, fetched_at) FROM stdin;
\.


--
-- Data for Name: payment_activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_activity_logs (id, "paymentRequestId", "userId", action, "oldStatus", "newStatus", comment, metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: payment_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_records (id, "taskId", "paymentRequestId", "paidById", "paymentMode", "paymentGateway", "transactionId", details, amount, currency, "paidAt", "receiptUrl", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: payment_request_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_request_line_items (id, "paymentRequestId", description, quantity, unit, rate, "taxRate", "discountRate", "lineTotal", "sortOrder") FROM stdin;
\.


--
-- Data for Name: payment_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_requests (id, "requestId", "clientId", "clientName", "clientEmail", "clientPhone", subtotal, "taxAmount", "discountAmount", "totalAmount", currency, description, notes, "dueDate", "invoiceNumber", status, attachments, "paymentToken", "paymentLinkSentAt", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, role, module_id, can_view, can_create, can_edit, can_delete, created_at, updated_at) FROM stdin;
1	SUPER_ADMIN	1	t	t	t	t	2025-10-26 04:56:59.485	2025-10-26 04:56:59.485
2	SUPER_ADMIN	2	t	t	t	t	2025-10-26 04:56:59.491	2025-10-26 04:56:59.491
3	SUPER_ADMIN	3	t	t	t	t	2025-10-26 04:56:59.496	2025-10-26 04:56:59.496
4	SUPER_ADMIN	4	t	t	t	t	2025-10-26 04:56:59.541	2025-10-26 04:56:59.541
5	SUPER_ADMIN	5	t	t	t	t	2025-10-26 04:56:59.545	2025-10-26 04:56:59.545
6	SUPER_ADMIN	6	t	t	t	t	2025-10-26 04:56:59.557	2025-10-26 04:56:59.557
7	SUPER_ADMIN	7	t	t	t	t	2025-10-26 04:56:59.561	2025-10-26 04:56:59.561
8	SUPER_ADMIN	8	t	t	t	t	2025-10-26 04:56:59.567	2025-10-26 04:56:59.567
9	SUPER_ADMIN	9	t	t	t	t	2025-10-26 04:56:59.578	2025-10-26 04:56:59.578
10	SUPER_ADMIN	10	t	t	t	t	2025-10-26 04:56:59.583	2025-10-26 04:56:59.583
11	SUPER_ADMIN	11	t	t	t	t	2025-10-26 04:56:59.587	2025-10-26 04:56:59.587
12	SUPER_ADMIN	12	t	t	t	t	2025-10-26 04:56:59.591	2025-10-26 04:56:59.591
13	SUPER_ADMIN	13	t	t	t	t	2025-10-26 04:56:59.594	2025-10-26 04:56:59.594
14	SUPER_ADMIN	14	t	t	t	t	2025-10-26 04:56:59.6	2025-10-26 04:56:59.6
15	SUPER_ADMIN	15	t	t	t	t	2025-10-26 04:56:59.606	2025-10-26 04:56:59.606
16	SUPER_ADMIN	16	t	t	t	t	2025-10-26 04:56:59.609	2025-10-26 04:56:59.609
17	ADMIN	1	t	t	t	t	2025-10-26 04:56:59.615	2025-10-26 04:56:59.615
18	ADMIN	2	t	t	t	t	2025-10-26 04:56:59.62	2025-10-26 04:56:59.62
19	ADMIN	3	t	t	t	t	2025-10-26 04:56:59.623	2025-10-26 04:56:59.623
20	ADMIN	4	t	t	t	t	2025-10-26 04:56:59.627	2025-10-26 04:56:59.627
21	ADMIN	5	t	t	t	t	2025-10-26 04:56:59.632	2025-10-26 04:56:59.632
22	ADMIN	6	t	t	t	t	2025-10-26 04:56:59.637	2025-10-26 04:56:59.637
23	ADMIN	7	t	t	t	t	2025-10-26 04:56:59.641	2025-10-26 04:56:59.641
24	ADMIN	8	t	t	t	t	2025-10-26 04:56:59.811	2025-10-26 04:56:59.811
25	ADMIN	9	t	t	t	t	2025-10-26 04:56:59.816	2025-10-26 04:56:59.816
26	ADMIN	10	t	t	t	t	2025-10-26 04:56:59.827	2025-10-26 04:56:59.827
27	ADMIN	11	t	t	t	t	2025-10-26 04:56:59.831	2025-10-26 04:56:59.831
28	ADMIN	12	t	t	t	t	2025-10-26 04:56:59.835	2025-10-26 04:56:59.835
29	ADMIN	13	t	t	t	t	2025-10-26 04:56:59.843	2025-10-26 04:56:59.843
30	ADMIN	14	t	t	t	t	2025-10-26 04:56:59.85	2025-10-26 04:56:59.85
31	ADMIN	15	t	t	t	t	2025-10-26 04:56:59.859	2025-10-26 04:56:59.859
32	ADMIN	16	t	t	t	t	2025-10-26 04:56:59.865	2025-10-26 04:56:59.865
33	MANAGER	1	t	f	f	f	2025-10-26 04:56:59.869	2025-10-26 04:56:59.869
34	MANAGER	2	t	f	f	f	2025-10-26 04:56:59.876	2025-10-26 04:56:59.876
35	MANAGER	3	t	f	f	f	2025-10-26 04:56:59.881	2025-10-26 04:56:59.881
36	MANAGER	4	t	f	f	f	2025-10-26 04:56:59.886	2025-10-26 04:56:59.886
37	MANAGER	5	t	f	f	f	2025-10-26 04:56:59.892	2025-10-26 04:56:59.892
38	MANAGER	6	t	f	f	f	2025-10-26 04:56:59.896	2025-10-26 04:56:59.896
39	MANAGER	7	t	f	f	f	2025-10-26 04:56:59.911	2025-10-26 04:56:59.911
40	MANAGER	8	t	f	f	f	2025-10-26 04:56:59.943	2025-10-26 04:56:59.943
41	MANAGER	9	t	f	f	f	2025-10-26 04:56:59.951	2025-10-26 04:56:59.951
42	MANAGER	10	t	f	f	f	2025-10-26 04:56:59.959	2025-10-26 04:56:59.959
43	MANAGER	11	t	f	f	f	2025-10-26 04:56:59.97	2025-10-26 04:56:59.97
44	MANAGER	12	t	f	f	f	2025-10-26 04:56:59.977	2025-10-26 04:56:59.977
45	MANAGER	13	t	f	f	f	2025-10-26 04:56:59.992	2025-10-26 04:56:59.992
46	MANAGER	14	t	f	f	f	2025-10-26 04:56:59.998	2025-10-26 04:56:59.998
47	MANAGER	15	t	f	f	f	2025-10-26 04:57:00.007	2025-10-26 04:57:00.007
48	MANAGER	16	t	f	f	f	2025-10-26 04:57:00.012	2025-10-26 04:57:00.012
49	STAFF	1	t	f	f	f	2025-10-26 04:57:00.018	2025-10-26 04:57:00.018
50	STAFF	2	t	f	f	f	2025-10-26 04:57:00.024	2025-10-26 04:57:00.024
51	STAFF	3	t	f	f	f	2025-10-26 04:57:00.029	2025-10-26 04:57:00.029
52	STAFF	4	t	f	f	f	2025-10-26 04:57:00.034	2025-10-26 04:57:00.034
53	STAFF	5	t	f	f	f	2025-10-26 04:57:00.061	2025-10-26 04:57:00.061
54	STAFF	6	t	f	f	f	2025-10-26 04:57:00.076	2025-10-26 04:57:00.076
55	STAFF	7	t	f	f	f	2025-10-26 04:57:00.08	2025-10-26 04:57:00.08
56	STAFF	8	t	f	f	f	2025-10-26 04:57:00.084	2025-10-26 04:57:00.084
57	STAFF	9	t	f	f	f	2025-10-26 04:57:00.09	2025-10-26 04:57:00.09
58	STAFF	10	t	f	f	f	2025-10-26 04:57:00.097	2025-10-26 04:57:00.097
59	STAFF	11	t	f	f	f	2025-10-26 04:57:00.101	2025-10-26 04:57:00.101
60	STAFF	12	t	f	f	f	2025-10-26 04:57:00.108	2025-10-26 04:57:00.108
61	STAFF	13	t	f	f	f	2025-10-26 04:57:00.114	2025-10-26 04:57:00.114
62	STAFF	14	t	f	f	f	2025-10-26 04:57:00.121	2025-10-26 04:57:00.121
63	STAFF	15	t	f	f	f	2025-10-26 04:57:00.125	2025-10-26 04:57:00.125
64	STAFF	16	t	f	f	f	2025-10-26 04:57:00.129	2025-10-26 04:57:00.129
65	CFO	1	t	f	f	f	2025-10-26 04:57:00.133	2025-10-26 04:57:00.133
66	CFO	2	t	f	f	f	2025-10-26 04:57:00.138	2025-10-26 04:57:00.138
67	CFO	3	t	f	f	f	2025-10-26 04:57:00.141	2025-10-26 04:57:00.141
68	CFO	4	t	f	f	f	2025-10-26 04:57:00.145	2025-10-26 04:57:00.145
69	CFO	5	t	f	f	f	2025-10-26 04:57:00.15	2025-10-26 04:57:00.15
70	CFO	6	t	f	f	f	2025-10-26 04:57:00.157	2025-10-26 04:57:00.157
71	CFO	7	t	f	f	f	2025-10-26 04:57:00.161	2025-10-26 04:57:00.161
72	CFO	8	t	f	f	f	2025-10-26 04:57:00.167	2025-10-26 04:57:00.167
73	CFO	9	t	f	f	f	2025-10-26 04:57:00.173	2025-10-26 04:57:00.173
74	CFO	10	t	f	f	f	2025-10-26 04:57:00.177	2025-10-26 04:57:00.177
75	CFO	11	t	f	f	f	2025-10-26 04:57:00.183	2025-10-26 04:57:00.183
76	CFO	12	t	f	f	f	2025-10-26 04:57:00.188	2025-10-26 04:57:00.188
77	CFO	13	t	f	f	f	2025-10-26 04:57:00.192	2025-10-26 04:57:00.192
78	CFO	14	t	f	f	f	2025-10-26 04:57:00.198	2025-10-26 04:57:00.198
79	CFO	15	t	f	f	f	2025-10-26 04:57:00.204	2025-10-26 04:57:00.204
80	CFO	16	t	f	f	f	2025-10-26 04:57:00.365	2025-10-26 04:57:00.365
81	FINANCE_CONTROLLER	1	t	f	f	f	2025-10-26 04:57:00.371	2025-10-26 04:57:00.371
82	FINANCE_CONTROLLER	2	t	f	f	f	2025-10-26 04:57:00.375	2025-10-26 04:57:00.375
83	FINANCE_CONTROLLER	3	t	f	f	f	2025-10-26 04:57:00.379	2025-10-26 04:57:00.379
84	FINANCE_CONTROLLER	4	t	f	f	f	2025-10-26 04:57:00.385	2025-10-26 04:57:00.385
85	FINANCE_CONTROLLER	5	t	f	f	f	2025-10-26 04:57:00.39	2025-10-26 04:57:00.39
86	FINANCE_CONTROLLER	6	t	f	f	f	2025-10-26 04:57:00.394	2025-10-26 04:57:00.394
87	FINANCE_CONTROLLER	7	t	f	f	f	2025-10-26 04:57:00.398	2025-10-26 04:57:00.398
88	FINANCE_CONTROLLER	8	t	f	f	f	2025-10-26 04:57:00.402	2025-10-26 04:57:00.402
89	FINANCE_CONTROLLER	9	t	f	f	f	2025-10-26 04:57:00.406	2025-10-26 04:57:00.406
90	FINANCE_CONTROLLER	10	t	f	f	f	2025-10-26 04:57:00.409	2025-10-26 04:57:00.409
91	FINANCE_CONTROLLER	11	t	f	f	f	2025-10-26 04:57:00.414	2025-10-26 04:57:00.414
92	FINANCE_CONTROLLER	12	t	f	f	f	2025-10-26 04:57:00.418	2025-10-26 04:57:00.418
93	FINANCE_CONTROLLER	13	t	f	f	f	2025-10-26 04:57:00.425	2025-10-26 04:57:00.425
94	FINANCE_CONTROLLER	14	t	f	f	f	2025-10-26 04:57:00.429	2025-10-26 04:57:00.429
95	FINANCE_CONTROLLER	15	t	f	f	f	2025-10-26 04:57:00.434	2025-10-26 04:57:00.434
96	FINANCE_CONTROLLER	16	t	f	f	f	2025-10-26 04:57:00.438	2025-10-26 04:57:00.438
97	HUB_INCHARGE	1	t	f	f	f	2025-10-26 04:57:00.441	2025-10-26 04:57:00.441
98	HUB_INCHARGE	2	t	f	f	f	2025-10-26 04:57:00.445	2025-10-26 04:57:00.445
99	HUB_INCHARGE	3	t	f	f	f	2025-10-26 04:57:00.452	2025-10-26 04:57:00.452
100	HUB_INCHARGE	4	t	f	f	f	2025-10-26 04:57:00.456	2025-10-26 04:57:00.456
101	HUB_INCHARGE	5	t	f	f	f	2025-10-26 04:57:00.46	2025-10-26 04:57:00.46
102	HUB_INCHARGE	6	t	f	f	f	2025-10-26 04:57:00.466	2025-10-26 04:57:00.466
103	HUB_INCHARGE	7	t	f	f	f	2025-10-26 04:57:00.471	2025-10-26 04:57:00.471
104	HUB_INCHARGE	8	t	f	f	f	2025-10-26 04:57:00.475	2025-10-26 04:57:00.475
105	HUB_INCHARGE	9	t	f	f	f	2025-10-26 04:57:00.479	2025-10-26 04:57:00.479
106	HUB_INCHARGE	10	t	f	f	f	2025-10-26 04:57:00.484	2025-10-26 04:57:00.484
107	HUB_INCHARGE	11	t	f	f	f	2025-10-26 04:57:00.488	2025-10-26 04:57:00.488
108	HUB_INCHARGE	12	t	f	f	f	2025-10-26 04:57:00.492	2025-10-26 04:57:00.492
109	HUB_INCHARGE	13	t	f	f	f	2025-10-26 04:57:00.495	2025-10-26 04:57:00.495
110	HUB_INCHARGE	14	t	f	f	f	2025-10-26 04:57:00.5	2025-10-26 04:57:00.5
111	HUB_INCHARGE	15	t	f	f	f	2025-10-26 04:57:00.504	2025-10-26 04:57:00.504
112	HUB_INCHARGE	16	t	f	f	f	2025-10-26 04:57:00.508	2025-10-26 04:57:00.508
113	SUPER_ADMIN	17	t	t	t	t	2025-11-02 08:22:19.612	2025-11-02 08:22:19.612
114	SUPER_ADMIN	18	t	t	t	t	2025-11-02 08:22:19.62	2025-11-02 08:22:19.62
115	SUPER_ADMIN	19	t	t	t	t	2025-11-02 08:22:19.624	2025-11-02 08:22:19.624
116	ADMIN	17	t	t	t	t	2025-11-02 08:22:19.677	2025-11-02 08:22:19.677
117	ADMIN	18	t	t	t	t	2025-11-02 08:22:19.682	2025-11-02 08:22:19.682
118	ADMIN	19	t	t	t	t	2025-11-02 08:22:19.686	2025-11-02 08:22:19.686
119	MANAGER	17	t	f	f	f	2025-11-02 08:22:19.741	2025-11-02 08:22:19.741
120	MANAGER	18	t	f	f	f	2025-11-02 08:22:19.749	2025-11-02 08:22:19.749
121	MANAGER	19	t	f	f	f	2025-11-02 08:22:19.753	2025-11-02 08:22:19.753
122	STAFF	17	t	f	f	f	2025-11-02 08:22:19.808	2025-11-02 08:22:19.808
123	STAFF	18	t	f	f	f	2025-11-02 08:22:19.812	2025-11-02 08:22:19.812
124	STAFF	19	t	f	f	f	2025-11-02 08:22:19.817	2025-11-02 08:22:19.817
125	CFO	17	t	f	f	f	2025-11-02 08:22:19.867	2025-11-02 08:22:19.867
126	CFO	18	t	f	f	f	2025-11-02 08:22:19.87	2025-11-02 08:22:19.87
127	CFO	19	t	f	f	f	2025-11-02 08:22:19.875	2025-11-02 08:22:19.875
128	FINANCE_CONTROLLER	17	t	f	f	f	2025-11-02 08:22:19.932	2025-11-02 08:22:19.932
129	FINANCE_CONTROLLER	18	t	f	f	f	2025-11-02 08:22:19.936	2025-11-02 08:22:19.936
130	FINANCE_CONTROLLER	19	t	f	f	f	2025-11-02 08:22:19.94	2025-11-02 08:22:19.94
131	HUB_INCHARGE	17	t	f	f	f	2025-11-02 08:22:19.987	2025-11-02 08:22:19.987
132	HUB_INCHARGE	18	t	f	f	f	2025-11-02 08:22:19.99	2025-11-02 08:22:19.99
133	HUB_INCHARGE	19	t	f	f	f	2025-11-02 08:22:19.994	2025-11-02 08:22:19.994
\.


--
-- Data for Name: rbac_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rbac_actions (id, name, description, created_at, display_name, is_active) FROM stdin;
\.


--
-- Data for Name: rbac_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rbac_permissions (id, role_id, action_id, route_id, granted, created_at, updated_at, name, display_name, is_active) FROM stdin;
\.


--
-- Data for Name: rbac_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rbac_roles (id, name, description, level, created_at, updated_at, display_name, status) FROM stdin;
\.


--
-- Data for Name: rbac_routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rbac_routes (id, path, name, description, method, module, is_protected, created_at, display_name, is_active, is_menu_item, icon, sort_order) FROM stdin;
\.


--
-- Data for Name: rbac_user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rbac_user_permissions (id, user_id, page_key, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rbac_user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rbac_user_roles (id, user_id, role_id, assigned_at, assigned_by, is_active, expires_at) FROM stdin;
\.


--
-- Data for Name: recent_activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recent_activity (id, user_id, username, action, entity, entity_id, details, created_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name) FROM stdin;
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routes (id, path, name, description, method, module, is_protected, created_at) FROM stdin;
\.


--
-- Data for Name: super_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.super_admins (id, name, email, password, "productType", profile_pic_url, is_active, created_at, updated_at, created_by) FROM stdin;
1	Business Super Admin	business_superadmin@bisman.demo	$2a$10$iSosrNLFJO7R/n1a7di6VOjrClyOSOTQAf.KJeI7CXHf1.BM8eu.u	BUSINESS_ERP	\N	t	2025-10-26 04:56:59.378	2025-10-26 04:56:59.378	1
2	Pump Super Admin	pump_superadmin@bisman.demo	$2a$10$iSosrNLFJO7R/n1a7di6VOjrClyOSOTQAf.KJeI7CXHf1.BM8eu.u	PUMP_ERP	\N	t	2025-10-26 04:56:59.389	2025-10-26 04:56:59.389	1
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, "expenseId", "paymentRequestId", title, description, "currentLevel", status, "createdById", "assigneeId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, session_token, ip_address, user_agent, created_at, expires_at, last_activity_at, is_active) FROM stdin;
8	33	328bf376ea4f7b7a265d379615c87120f426cc22fab147897994b240e0c5105c	\N	\N	2025-10-26 04:15:21.742	2025-11-02 04:15:21.742	2025-10-26 04:15:21.744	t
9	33	5f374003c4df84cd7d9c0a6d1b2717ef26b93a51ccaffe347465f85b52560bb4	\N	\N	2025-10-26 04:15:55.59	2025-11-02 04:15:55.59	2025-10-26 04:15:55.591	t
10	33	da37fa6aa35c1a0d038df8e14d5a3544c9639d4c8175ba2f1b9f9d85acda2f3b	\N	\N	2025-10-26 05:41:08.215	2025-11-02 05:41:08.214	2025-10-26 05:41:08.218	t
12	34	511c790bb59f624df9ea02c0bf467efcfc1e2a8c34d0aa2be57111a6a879c7c3	\N	\N	2025-10-26 07:33:50.064	2025-11-02 07:33:50.064	2025-10-26 07:33:50.065	t
15	34	08e6a7880e443cf42727927b4740f64b72a230b814b2ea5dd5aa20447afd622b	\N	\N	2025-10-26 08:10:45.762	2025-11-02 08:10:45.762	2025-10-26 08:10:45.762	t
16	35	7a08a68de41aaf9f52b9107679fa7e6e87befbcdc262134a12115cedaddda836	\N	\N	2025-10-26 08:10:58.879	2025-11-02 08:10:58.879	2025-10-26 08:10:58.88	t
17	48	6104a713eeded35a84fbba239e6cac61f07fc504b71fed4f9fd17b9bb7ca01cf	\N	\N	2025-10-26 08:11:11.106	2025-11-02 08:11:11.106	2025-10-26 08:11:11.107	t
18	49	a67bd0f6c275eb03e02278f88e7b82e551ddf4c23673a7b4aabb227eed6f03b1	\N	\N	2025-10-26 08:11:53.979	2025-11-02 08:11:53.979	2025-10-26 08:11:53.98	t
19	34	58e5855efcf331176d0f49c64a203b1437f37e69be4606add4024c680a5c23bf	\N	\N	2025-10-26 08:18:04.871	2025-11-02 08:18:04.871	2025-10-26 08:18:04.872	t
20	48	e96e3f5d44a0d7a99330d41ccf62f33086265a4f6d4a75d50dacc0423c3c4b4d	\N	\N	2025-10-26 09:14:23.954	2025-11-02 09:14:23.954	2025-10-26 09:14:23.958	t
21	48	8a350141f7f08a19f1945c8c519a26037c7698ee62dc38b6255160b3ac6241e0	\N	\N	2025-10-26 09:14:58.56	2025-11-02 09:14:58.56	2025-10-26 09:14:58.561	t
22	48	83681d6621fd6802b5c789a1102989fc704787a17ebdfd053a668d29c6cb8a3b	\N	\N	2025-10-26 13:08:07.728	2025-11-02 13:08:07.728	2025-10-26 13:08:07.73	t
24	33	d83bceff35f2ef8c50e0831d02c7e750c64436fe6543980b5021c5e68554cf8c	\N	\N	2025-10-27 06:29:02.1	2025-11-03 06:29:02.098	2025-10-27 06:29:02.102	t
25	33	a8b428223146dcd7735d15a577eb17c2a5d17cb0a99c20685601e92a2d6c3541	\N	\N	2025-10-27 06:29:09.05	2025-11-03 06:29:09.05	2025-10-27 06:29:09.051	t
26	33	871f9054d3581dd52dea7ff370ef753d60805af8207bea0e1b0800c0da0bbd7c	\N	\N	2025-10-27 06:43:25.137	2025-11-03 06:43:25.136	2025-10-27 06:43:25.138	t
27	33	e4f18ecdfcb715c63b8905e7299ad22b609601e6986517062438f3b2aeceffa8	\N	\N	2025-10-27 06:47:57.23	2025-11-03 06:47:57.23	2025-10-27 06:47:57.25	t
28	33	7a52d77d8008321cc5ff5703934cf8d89842a942c063cf1ad5c83399197ce1ec	\N	\N	2025-10-27 06:48:11.256	2025-11-03 06:48:11.256	2025-10-27 06:48:11.257	t
29	33	32db55d7db90b8a195af9faf598e843ec3a7acdcc1d6f276ff21dfcab5b64183	\N	\N	2025-10-27 06:52:47.076	2025-11-03 06:52:47.076	2025-10-27 06:52:47.077	t
30	33	53203a228cc0be3bfee0483a12a7786fdb74a370c7e0ea1f33c8b91a0f8bdd42	\N	\N	2025-10-27 06:57:41.544	2025-11-03 06:57:41.544	2025-10-27 06:57:41.546	t
31	33	4ef6fc671d5fd7d04b2ceb88ce28962401ebaa10663848c174a2551022eb39f3	\N	\N	2025-10-27 06:57:56.278	2025-11-03 06:57:56.278	2025-10-27 06:57:56.279	t
32	33	75e2773faee5be746b5d7fd1286a29c54f170857eaa1c6ce660b362cd9387a21	\N	\N	2025-10-27 06:58:02.554	2025-11-03 06:58:02.554	2025-10-27 06:58:02.555	t
33	33	e7492538af3655638e765de8c537c0e39dc35ad8987be85134b65f915ece6497	\N	\N	2025-10-27 06:58:07.944	2025-11-03 06:58:07.944	2025-10-27 06:58:07.944	t
34	33	15c6adeea4dc433c7aa8c0382ce84f226c008df9b5120277f97a59569e5f2be4	\N	\N	2025-10-27 07:09:20.156	2025-11-03 07:09:20.155	2025-10-27 07:09:20.157	t
35	33	3a61000a74754f0dfb28ec45511079a016353da86b98f7f1083b11adf2c30504	\N	\N	2025-10-27 07:09:38.346	2025-11-03 07:09:38.346	2025-10-27 07:09:38.347	t
36	33	f196aaf2812f380541bfd8aadd7ff5b4751ff2ab3eb148db49fe938e5486306a	\N	\N	2025-10-27 07:09:46.302	2025-11-03 07:09:46.302	2025-10-27 07:09:46.303	t
37	33	54e102c216e29fc87ec6083c2643dc4d306b47a7dc18bfab143ae7dd1ae547eb	\N	\N	2025-10-27 07:09:53.411	2025-11-03 07:09:53.411	2025-10-27 07:09:53.411	t
38	33	93fc535ceba28234fbab6d454987a57f238353ae31ab9fbc5416c604592a4597	\N	\N	2025-10-27 07:28:59.864	2025-11-03 07:28:59.864	2025-10-27 07:28:59.867	t
39	33	7d974b7a9358a9458badfc530b8bc5a79983dbfbfd2460babae5149e03b8918a	\N	\N	2025-10-27 07:29:13.175	2025-11-03 07:29:13.175	2025-10-27 07:29:13.176	t
40	33	b0b29c34559779128eb6cae63e21d15fd9bba1526b73079a0dd90885ab6355b7	\N	\N	2025-10-27 07:29:20.325	2025-11-03 07:29:20.325	2025-10-27 07:29:20.326	t
41	33	39c62389475fb9086a03d20e3ec4da15f618edbd4509c1bbf3e220cbd090c90f	\N	\N	2025-10-27 07:31:10.311	2025-11-03 07:31:10.311	2025-10-27 07:31:10.312	t
42	33	60f3692bb4b543e565a2c6584bd77ee1151b7794c26df6a5617e690a6855b77b	\N	\N	2025-10-27 07:58:41.615	2025-11-03 07:58:41.615	2025-10-27 07:58:41.616	t
43	33	29f1375c0c6cbc2583734e929513687e2603020ab52f528db8c946715484cca2	\N	\N	2025-10-27 07:58:58.015	2025-11-03 07:58:58.015	2025-10-27 07:58:58.016	t
44	33	1acaaa7488499ba1e9ef93e427ed11c3453d72334997b5ff9817b114f5965a45	\N	\N	2025-10-27 07:59:05.562	2025-11-03 07:59:05.562	2025-10-27 07:59:05.567	t
45	33	41cc4d3ff4d919e77e8f8b66cf08f6f2c58af6330a7049a9d81a5a9bcf3a46ff	\N	\N	2025-10-27 07:59:17.731	2025-11-03 07:59:17.731	2025-10-27 07:59:17.732	t
46	33	9b146ab3885c45ea32bbdb7c308410dea491e7cb266c85419cab65445a4fd362	\N	\N	2025-10-27 08:11:16.907	2025-11-03 08:11:16.907	2025-10-27 08:11:16.908	t
47	33	b08848f8f4dd6ef7fffff901e878eadfa484e84a3d4421417b29d83d2729b1d2	\N	\N	2025-10-27 08:11:31.39	2025-11-03 08:11:31.39	2025-10-27 08:11:31.391	t
48	33	496aa76a93e501f2b9a82c7d84c289532c8596cbc2bed463c77a8238d31fed30	\N	\N	2025-10-27 08:11:49.844	2025-11-03 08:11:49.844	2025-10-27 08:11:49.845	t
49	33	ab7af161ae3c8087c062fdc37bcfcfa57540bc0501a89352ab208656d5e30546	\N	\N	2025-10-27 10:01:14.137	2025-11-03 10:01:14.137	2025-10-27 10:01:14.141	t
50	33	7a825d7b67274e0825701cd47e4ef223fa2b126a72b91fb3236f225b57a8ffc9	\N	\N	2025-10-27 10:01:32.879	2025-11-03 10:01:32.879	2025-10-27 10:01:32.88	t
51	33	95da459a2b73194a0a307edefee7282e60fbdfd14dde7d67b748887e1633d5c8	\N	\N	2025-10-27 10:01:51.703	2025-11-03 10:01:51.703	2025-10-27 10:01:51.704	t
52	33	14ffa1fc0f5e04aa4d23760162065d8ee09efd2ce5fef44335e551d6efdab30f	\N	\N	2025-10-27 10:22:06.589	2025-11-03 10:22:06.589	2025-10-27 10:22:06.59	t
53	33	c85f4f1943418714f90c3fb1eb50eec814d8b487cd88ecc88b959f4109e3695d	\N	\N	2025-10-27 10:22:38.715	2025-11-03 10:22:38.715	2025-10-27 10:22:38.716	t
54	33	c0fa718fa9ef87980b1e11edd3ca65d0b09399db0b8c67b7158e94013fe675b6	\N	\N	2025-10-27 10:22:56.107	2025-11-03 10:22:56.107	2025-10-27 10:22:56.108	t
55	33	9a01942b80535c20ae526e3f08c16345f61bed13dfdd4d4298daf00061f0aae4	\N	\N	2025-10-27 11:21:00.013	2025-11-03 11:21:00.01	2025-10-27 11:21:00.017	t
56	33	937fc1385fd2aff6077962e072b4cbb96cf1b7fb1622cf3e9fe8c326a8e5ec1d	\N	\N	2025-10-27 12:01:39.513	2025-11-03 12:01:39.513	2025-10-27 12:01:39.514	t
57	33	b7fec879624fc1ab66d4eacf616c6726cfbaa35de58a30b57182fce081cea631	\N	\N	2025-10-27 13:03:40.11	2025-11-03 13:03:40.108	2025-10-27 13:03:40.112	t
58	33	271ec03c8bc5fcf474cd71d909c480e00d84fd9e99b0558ba59312deb2af275c	\N	\N	2025-10-27 13:30:17.228	2025-11-03 13:30:17.228	2025-10-27 13:30:17.229	t
59	33	d4f21bce36befb994944096c0b73a8c2bedc9be2e2e9299da84240ed923f9aaf	\N	\N	2025-10-27 13:43:03.165	2025-11-03 13:43:03.164	2025-10-27 13:43:03.165	t
60	33	63a1a70fc8b7cbb59ee4e023231ff612720b1fec7d517962b74bbd4480323bf4	\N	\N	2025-10-27 13:49:16.485	2025-11-03 13:49:16.485	2025-10-27 13:49:16.488	t
61	33	93d004cda4781746c76c958f3b6bbf22647a7e4639b9bdb304c1878c89ff6887	\N	\N	2025-10-27 13:59:34.402	2025-11-03 13:59:34.402	2025-10-27 13:59:34.403	t
62	33	f79f5ff36a7ba2ca8df0107b26d807d72e68c978c4d869781e6e3b2ccf6339a7	\N	\N	2025-10-28 04:37:35.089	2025-11-04 04:37:35.089	2025-10-28 04:37:35.092	t
63	33	2329c0e74c37192ec0056d3ee8d7daf2e7394df630f16dfc048df386cfb67d23	\N	\N	2025-10-28 04:38:05.231	2025-11-04 04:38:05.231	2025-10-28 04:38:05.232	t
64	33	27ac0d592be0a69d32c6467a8fb76ec4566260599b6e4f7308dbf6deade21e35	\N	\N	2025-10-28 04:41:21.306	2025-11-04 04:41:21.306	2025-10-28 04:41:21.307	t
65	33	83e793599b944ee5a1c35ad24f37818bec26876bb330ee46d5db1cfac31504e3	\N	\N	2025-10-28 05:15:11.249	2025-11-04 05:15:11.249	2025-10-28 05:15:11.25	t
66	33	f347d6c8a8c1448b3a187e413c3d6e14f3574bfd1e03f9497dd49ec82126f9ea	\N	\N	2025-10-28 05:23:02.576	2025-11-04 05:23:02.576	2025-10-28 05:23:02.577	t
67	33	fc54df1f0b41b343b168575580193d79e973d437f52435bbbcdb63f264b87af1	\N	\N	2025-10-28 06:22:19.961	2025-11-04 06:22:19.961	2025-10-28 06:22:19.962	t
68	33	a487c00a2901a0cecd8f8a59f3fbc386fc64ba3b008ddca36a6eca13f3e6d29a	\N	\N	2025-10-28 15:56:28.529	2025-11-04 15:56:28.529	2025-10-28 15:56:28.53	t
69	33	787f1699bb72636455a5c1632ff653f586546079ccc2aec6b333b16c88ee8ee2	\N	\N	2025-10-28 15:57:02.108	2025-11-04 15:57:02.108	2025-10-28 15:57:02.11	t
70	33	c9ffba2ab4ce0408b21cdcacb0961bc075f28eaae92b9b74188c6e7007f0777c	\N	\N	2025-10-28 16:24:40.325	2025-11-04 16:24:40.324	2025-10-28 16:24:40.326	t
71	33	b515e6c07ef51d25f857c496b10f00f9b28b11a00465b625db67416520c3d96f	\N	\N	2025-10-29 02:43:46.638	2025-11-05 02:43:46.638	2025-10-29 02:43:46.64	t
72	33	ddac4b407a741b6fbed5e90b5e560144016080439d152723f4e5e3fc53740703	\N	\N	2025-10-29 02:44:08.93	2025-11-05 02:44:08.93	2025-10-29 02:44:08.932	t
73	33	c728d01e134ee70a9596196f81aa9ee2a5c638f54347598e4dd950f3c73f27da	\N	\N	2025-10-29 03:41:32.261	2025-11-05 03:41:32.261	2025-10-29 03:41:32.262	t
74	33	e14445cb3df2affae4644b8af471c4435610ef2160ffc2cea1260808e17bafb6	\N	\N	2025-10-29 03:42:19.345	2025-11-05 03:42:19.345	2025-10-29 03:42:19.378	t
75	33	72943e8b9e00293f8cf3283b39919f1100f44dbaeb3f2f53aecb89ed20340552	\N	\N	2025-10-29 04:29:10.66	2025-11-05 04:29:10.66	2025-10-29 04:29:10.661	t
76	33	87b7db1cfe0ebc8bb3ef969b37f8a878263e9a67ac6fd333a641e7db70a050e4	\N	\N	2025-10-29 04:34:00.334	2025-11-05 04:34:00.334	2025-10-29 04:34:00.335	t
77	33	2bab9b254ccb060cd600e5fe0669e538198490376b84cd3095e8e36508ef8572	\N	\N	2025-10-29 04:34:52.404	2025-11-05 04:34:52.404	2025-10-29 04:34:52.406	t
78	33	740e9eef4b3a310ae36cd9c0a335760b472f095800e27a2e83c9f9d58c3fc77c	\N	\N	2025-10-29 04:42:35.394	2025-11-05 04:42:35.394	2025-10-29 04:42:35.396	t
79	33	c95d73a4dc5e4ef95b8ba261ff02d5a89b53abef2c4b57036abc6a927f0d4d7f	\N	\N	2025-10-29 04:42:50.943	2025-11-05 04:42:50.943	2025-10-29 04:42:50.944	t
80	33	696ef68930693512072df730353d7a79246d69ba2ad4d0fe10ff32a9012a692a	\N	\N	2025-10-29 06:28:01.397	2025-11-05 06:28:01.397	2025-10-29 06:28:01.399	t
81	33	c581d24f7bd93e4faf48d9f4bf1d3de85e906c6f313858135f2ebacd7824e1c9	\N	\N	2025-10-29 07:19:49.048	2025-11-05 07:19:49.048	2025-10-29 07:19:49.05	t
82	48	f2d8071ea32a82dc648425b888420e14086329fe62b789e66620b45ffcdb5c59	\N	\N	2025-10-29 07:42:58.749	2025-11-05 07:42:58.749	2025-10-29 07:42:58.75	t
84	33	4b5a38ff13ff051342de273c859e3413fda43cc87ff11b0ee1c399ecd859d203	\N	\N	2025-10-29 07:43:50.04	2025-11-05 07:43:50.04	2025-10-29 07:43:50.041	t
85	33	d73022a8d62b49e50db4a5cbfdaaf3c3e60cf1c2bd9eb1f2a1323c0e6d7ac8ff	\N	\N	2025-10-29 14:35:26.372	2025-11-05 14:35:26.369	2025-10-29 14:35:26.374	t
86	33	3f96c90ff133df77c44eca5440d5cb1d2b657c5b6ffc0768b522102258d3e2a4	\N	\N	2025-10-29 14:35:50.076	2025-11-05 14:35:50.076	2025-10-29 14:35:50.077	t
88	33	61e9e9e07dd83076aa29dab3671a6e9c21d09ccd9a90ab132d04ec3c68d8b0be	\N	\N	2025-10-29 15:53:22.101	2025-11-05 15:53:22.101	2025-10-29 15:53:22.102	t
89	33	7a81b4fe56353113b6635c7ea57f57ee18b978c61d2b9456701bb3fbedd395a5	\N	\N	2025-10-29 16:23:01.912	2025-11-05 16:23:01.912	2025-10-29 16:23:01.913	t
90	33	e10cc77af4e015b722fdf40353de608bf16f70bddaf8c0829314a86cbce8d910	\N	\N	2025-10-29 16:56:10.592	2025-11-05 16:56:10.592	2025-10-29 16:56:10.596	t
91	33	edfaf5dd62ff5ce9017bb71ae5b688ca52c85d43d3f336c5f44f69fbc4984b6b	\N	\N	2025-10-29 16:56:38.115	2025-11-05 16:56:38.115	2025-10-29 16:56:38.116	t
92	33	a4690d61e23e00895011881d0a09afd8e9ae33a97d5bbc963f5b84967a9096e2	\N	\N	2025-10-29 16:57:08.49	2025-11-05 16:57:08.49	2025-10-29 16:57:08.491	t
93	33	aaeae024a03b6466cd44eb5559a2da53561347a7250147fae4117ead180f6b71	\N	\N	2025-10-29 17:33:59.109	2025-11-05 17:33:59.109	2025-10-29 17:33:59.112	t
94	33	3738aceda7a83712bf67ac9b5566b6b2c7d6656348b15152c297076d6c5c9f05	\N	\N	2025-10-29 17:34:20.997	2025-11-05 17:34:20.997	2025-10-29 17:34:20.998	t
95	33	030dd8b786024c920fd1ab2b4a9c480d669ac222652b2dadbd8fa753f6f3fcaf	\N	\N	2025-10-29 17:48:31.25	2025-11-05 17:48:31.25	2025-10-29 17:48:31.252	t
96	33	d7924ff5167f276bc0778d6e7061dcdadd8bb76bdc58043eda736b36a69a516f	\N	\N	2025-10-29 17:52:02.416	2025-11-05 17:52:02.414	2025-10-29 17:52:02.417	t
97	48	dd2bf429e95e8dbe8f95bf7b9e4a8f986910ccc8843a1b77ee0680e248d18751	\N	\N	2025-11-01 04:11:55.738	2025-11-08 04:11:55.736	2025-11-01 04:11:55.743	t
100	48	8e384feca9dbdb8d10add11e2f10b52be968e844cb6c4ec816589595a0689633	\N	\N	2025-11-01 04:41:52.168	2025-11-08 04:41:52.168	2025-11-01 04:41:52.169	t
102	48	897d3fd6b675ea44e9d85026ab054a2d4419e39398668916e23a6267c5698440	\N	\N	2025-11-08 14:58:41.46	2025-11-15 14:58:41.46	2025-11-08 14:58:41.461	t
104	48	293e664c3eee5860cab7592084638ac1a5c7138fee5b07428bd1b86367779fca	\N	\N	2025-11-10 03:39:19.548	2025-11-17 03:39:19.548	2025-11-10 03:39:19.559	t
106	48	c534f0fa7e4fb2d122b6c7d71c0c833d8c7f04217bb4ed10b7c4045f24980dc8	\N	\N	2025-11-10 18:58:05.923	2025-11-17 18:58:05.923	2025-11-10 18:58:05.926	t
107	48	04d93dde666ef152e89ff78fc4bb04d7f2dcba69f59c0305c2b4a3c35c0451e3	\N	\N	2025-11-12 15:44:10.678	2025-11-19 15:44:10.677	2025-11-12 15:44:10.681	t
108	48	dd256d668ad13ecae8806ef90b21090c1df46bb5e79de5f54090fc00033b400e	\N	\N	2025-11-12 15:45:48.672	2025-11-19 15:45:48.671	2025-11-12 15:45:48.673	t
109	48	b9008bd851ba833c1a52ede810146a5c7ac35bfda9de9bd5b3616b221eb14814	\N	\N	2025-11-12 15:46:05.837	2025-11-19 15:46:05.837	2025-11-12 15:46:05.838	t
110	48	9855c4c8beea90be746c97b0f98e21ad11532b681e4435e2ef3e159b35674695	\N	\N	2025-11-12 16:47:32.471	2025-11-19 16:47:32.471	2025-11-12 16:47:32.472	t
111	48	459d5df7d29fa864e36976a97b6771ea5399785d8918d8ec60cbd9b7b7d528a8	\N	\N	2025-11-12 18:15:19.992	2025-11-19 18:15:19.992	2025-11-12 18:15:19.993	t
112	48	2d5340b1213d77511d7a4cc125e911797abc9dd76f3e33eca152fa7494cb8f7d	\N	\N	2025-11-13 04:08:08.974	2025-11-20 04:08:08.974	2025-11-13 04:08:08.975	t
113	48	44a38f2f6e0aa3e2f14f14aae1424bc0f0738f64e5d113d40ed07f8094a67bad	\N	\N	2025-11-13 04:08:32.211	2025-11-20 04:08:32.209	2025-11-13 04:08:32.212	t
114	48	0ce95bbd0e7ef7afc98f8085a751098ccf046b3601b20f176cb1d07643ca23eb	\N	\N	2025-11-13 05:23:27.026	2025-11-20 05:23:27.025	2025-11-13 05:23:27.035	t
116	48	e9dd0e38b7c94cbfa64b526c9bf96ba396e34a3001cc31b5f648937f20218a0b	\N	\N	2025-11-13 06:34:34.387	2025-11-20 06:34:34.387	2025-11-13 06:34:34.389	t
117	48	6d76fa2d5d15b86ace2ea29b65f2419752c212f2f071c7ec4244e1bf8f567092	\N	\N	2025-11-13 09:10:27.371	2025-11-20 09:10:27.371	2025-11-13 09:10:27.375	t
118	48	c041c06f60d1f4746522e3712e0d5825593193cb4f0294d204c81f5579c5f07f	\N	\N	2025-11-13 10:24:05.773	2025-11-20 10:24:05.773	2025-11-13 10:24:05.775	t
119	48	03155f0ba9a366c1f74e2a9281cb4542115c6be29d2fa90e79d4d71662aba690	\N	\N	2025-11-13 10:24:13.053	2025-11-20 10:24:13.053	2025-11-13 10:24:13.054	t
120	48	7fc5b975eadd3c5cd9c6fd6de58145247d1669060ac969d9d102ff4f49fba24f	\N	\N	2025-11-13 12:01:47.829	2025-11-20 12:01:47.829	2025-11-13 12:01:47.833	t
121	48	31d3f45127745ad7dd71c01927c6656508acf7f6d27c51dfe48f02629cc06e28	\N	\N	2025-11-13 12:01:58.163	2025-11-20 12:01:58.163	2025-11-13 12:01:58.164	t
122	48	6d43d66b3013e87cd82c87afa6d4658e20ec2cc53d978618c658818297fedf3f	\N	\N	2025-11-13 12:45:26.577	2025-11-20 12:45:26.577	2025-11-13 12:45:26.58	t
123	48	702abcdc53c7027a46aba96095ac2f899b7fd811e46400d6001b4e2bb74b44ea	\N	\N	2025-11-13 12:45:38.835	2025-11-20 12:45:38.835	2025-11-13 12:45:38.836	t
125	48	68b324cad9ca35561eeb992f2c43837ea999ec33dc9b11dc7947915c16e64be7	\N	\N	2025-11-13 15:16:08.362	2025-11-20 15:16:08.362	2025-11-13 15:16:08.369	t
126	48	7692d668b902cf5f650dbc2af8e470903f70e1af0cb75b275712ac3775475937	\N	\N	2025-11-13 15:21:08.464	2025-11-20 15:21:08.464	2025-11-13 15:21:08.465	t
127	48	0a8204eaa098a88cdc19695d6f4c2abda578ad42babf307100605f15bba00f3b	\N	\N	2025-11-13 15:21:25.936	2025-11-20 15:21:25.935	2025-11-13 15:21:25.936	t
128	48	f879ad89e1fcd0fe84f150c481603ec5101b5e93121a0c7a9022bfb535aa16b2	\N	\N	2025-11-13 15:26:17.015	2025-11-20 15:26:17.015	2025-11-13 15:26:17.024	t
129	48	bf46aeaf824118eaf3eb1a8af93f03cdc317f2d8e2c45ec82cba729690b7ec40	\N	\N	2025-11-13 15:29:05.724	2025-11-20 15:29:05.724	2025-11-13 15:29:05.732	t
130	48	561ff82d2e5aabeea1a5665c31d38dfffe42abce02a56599095f815608fe0703	\N	\N	2025-11-13 15:35:37.198	2025-11-20 15:35:37.197	2025-11-13 15:35:37.199	t
131	48	41b2b06087591215af23e32ba642d35a6a9be7a6fa35a1f254d3a28571d97f88	\N	\N	2025-11-13 15:36:57.718	2025-11-20 15:36:57.718	2025-11-13 15:36:57.721	t
132	48	93a230e1ee7247e01fd07c8e5ab94d444f2d790262aeb77093323131a6ab7192	\N	\N	2025-11-13 15:44:28.33	2025-11-20 15:44:28.33	2025-11-13 15:44:28.331	t
133	48	52f08a7cd2e1be606c4be25a628eb59cc2ae19490f9203e4a0159453348c69f7	\N	\N	2025-11-13 15:55:23.187	2025-11-20 15:55:23.187	2025-11-13 15:55:23.191	t
134	48	54012f5bda18383e3b6dd8aabeba856f7b75971a200358740cea947f915bb074	\N	\N	2025-11-13 16:04:52.945	2025-11-20 16:04:52.945	2025-11-13 16:04:52.946	t
135	48	4ff550e245972f05fc37845c4026450a7ee14745d18bf834aaaa041692efde28	\N	\N	2025-11-13 16:25:40.847	2025-11-20 16:25:40.847	2025-11-13 16:25:40.848	t
136	48	8e1f0f7de9b1bec51345e9f19f3e8c70412f09f66e1a2daf5efb1a14266e5673	\N	\N	2025-11-13 16:27:18.324	2025-11-20 16:27:18.323	2025-11-13 16:27:18.325	t
137	48	eee0d7daecb922cb64d4df27bfd5fa20a457955819bc229d70e422ed5979d0fe	\N	\N	2025-11-13 16:34:20.852	2025-11-20 16:34:20.852	2025-11-13 16:34:20.853	t
138	48	ad7a4db10f1b51d0b244238aa55909ed0ed00fb425d0a5f358ded8ef30e6d025	\N	\N	2025-11-13 16:48:08.603	2025-11-20 16:48:08.603	2025-11-13 16:48:08.604	t
139	48	6d04a56cd87344c770211f647e04cec319e14beca83b332dc54cb306325b3b05	\N	\N	2025-11-13 16:49:15.131	2025-11-20 16:49:15.131	2025-11-13 16:49:15.132	t
140	48	8fc81e2fd07043271a6696966da60eefc4e2c8238edf6deaf90a275d10a3eb1a	\N	\N	2025-11-13 16:49:29.608	2025-11-20 16:49:29.608	2025-11-13 16:49:29.609	t
141	48	a5ba93a419feff31b6a195c514bd15ffedf7b47239bb6699f6287ed7ad1e83fb	\N	\N	2025-11-13 16:50:07.974	2025-11-20 16:50:07.974	2025-11-13 16:50:07.975	t
142	48	e58eb8aed401fa629ca0c41f011fa1a526bdc154b9fd92e15d0e571256f99df8	\N	\N	2025-11-13 16:51:31.355	2025-11-20 16:51:31.355	2025-11-13 16:51:31.356	t
143	48	eae610a57e46231123546367d4aaaa40081c436f68fd57eda9f95dd6e1a0351c	\N	\N	2025-11-13 16:57:18.508	2025-11-20 16:57:18.508	2025-11-13 16:57:18.51	t
144	48	5f2818b87c2f643dd748cf6b8638ac829b846256949e06ab4495370b4f2a9c40	\N	\N	2025-11-13 16:59:14.879	2025-11-20 16:59:14.879	2025-11-13 16:59:14.888	t
145	48	01a552baab9467053dd23d2bc47fcae24f445d620ded167dd6731105c32142ac	\N	\N	2025-11-13 17:00:06.801	2025-11-20 17:00:06.801	2025-11-13 17:00:06.802	t
146	48	4c91aafc638ccd547852e2404ce2f511f3fde35452c45dade0bc3c45e4b01d33	\N	\N	2025-11-13 17:04:27.333	2025-11-20 17:04:27.333	2025-11-13 17:04:27.335	t
148	47	c4a2d789578073e149f7490a0f93041e3b5f21246aed27bf69d679ffebc75923	\N	\N	2025-11-13 17:30:41.275	2025-11-20 17:30:41.275	2025-11-13 17:30:41.277	t
150	48	e2e6a14eab504da16b46e7d9852b5a5930975017319db7aeb59db714c0ac04cb	\N	\N	2025-11-13 17:32:42.102	2025-11-20 17:32:42.102	2025-11-13 17:32:42.103	t
151	48	88c7bb11cc0105f0c6684e584bc1f3092b85f0af8b1afb6b56c156bcf98db15c	\N	\N	2025-11-13 17:34:26.044	2025-11-20 17:34:26.043	2025-11-13 17:34:26.045	t
152	48	0aa458b2edffbdf9db83db0b6888a864bf1e6078539a35bbb3b632ac05acc2f2	\N	\N	2025-11-13 17:44:59.962	2025-11-20 17:44:59.962	2025-11-13 17:44:59.963	t
154	48	0427ee960021ac2eb842b590d1ee7c12ef61c196ca759d434998dd8a35573ce3	\N	\N	2025-11-13 18:19:19.47	2025-11-20 18:19:19.47	2025-11-13 18:19:19.48	t
156	48	5d27f6f2f25d355637bff66c6ede07bf124222f9db672cfefc73848d47c890d3	\N	\N	2025-11-13 18:55:34.841	2025-11-20 18:55:34.835	2025-11-13 18:55:34.846	t
157	48	723ae9e318353717d6b4010828ffc534bb81f6b0059a84b5560910cc30a5054c	\N	\N	2025-11-13 18:55:53.725	2025-11-20 18:55:53.725	2025-11-13 18:55:53.726	t
158	48	3d047393e66a828819e45280dd93fd358d40ef55a5ddddf1d6c8f4a8da5cb517	\N	\N	2025-11-13 19:12:21.897	2025-11-20 19:12:21.896	2025-11-13 19:12:21.903	t
159	48	0834596bdd10b3aac423cfd690702d976b461467977df88d41b44f43a1208e7c	\N	\N	2025-11-13 19:29:46.769	2025-11-20 19:29:46.769	2025-11-13 19:29:46.775	t
160	48	7f0bbb8b747b1e45ad84738e479201d46262c26097e31ff2817313f52002b1c8	\N	\N	2025-11-13 19:30:26.242	2025-11-20 19:30:26.242	2025-11-13 19:30:26.243	t
161	48	6de388a2bac80e11e50550a06308a1f9f3f70fd17be516074cec50c638acb931	\N	\N	2025-11-13 19:39:52.946	2025-11-20 19:39:52.946	2025-11-13 19:39:52.948	t
162	48	73155edd5aa9e86da41217ddd4c09ed448f5cd0cc76fc57a771cdcbc21cd187e	\N	\N	2025-11-13 19:45:18.502	2025-11-20 19:45:18.502	2025-11-13 19:45:18.503	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, role, created_at, profile_pic_url, updated_at, "assignedModules", "pagePermissions", "productType", super_admin_id, tenant_id, is_active) FROM stdin;
34	demo_super_admin	demo_super_admin@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	SUPER_ADMIN	2025-10-26 04:11:21.746	\N	2025-10-26 04:11:21.746	[]	{}	BUSINESS_ERP	\N	\N	t
35	demo_it_admin	demo_it_admin@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	IT_ADMIN	2025-10-26 04:11:21.788	\N	2025-10-26 04:11:21.788	[]	{}	BUSINESS_ERP	\N	\N	t
36	demo_cfo	demo_cfo@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	CFO	2025-10-26 04:11:21.793	\N	2025-10-26 04:11:21.793	[]	{}	BUSINESS_ERP	\N	\N	t
37	demo_finance_controller	demo_finance_controller@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	FINANCE_CONTROLLER	2025-10-26 04:11:21.796	\N	2025-10-26 04:11:21.796	[]	{}	BUSINESS_ERP	\N	\N	t
38	demo_treasury	demo_treasury@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	TREASURY	2025-10-26 04:11:21.799	\N	2025-10-26 04:11:21.799	[]	{}	BUSINESS_ERP	\N	\N	t
39	demo_accounts	demo_accounts@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	ACCOUNTS	2025-10-26 04:11:21.804	\N	2025-10-26 04:11:21.804	[]	{}	BUSINESS_ERP	\N	\N	t
40	demo_accounts_payable	demo_accounts_payable@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	ACCOUNTS_PAYABLE	2025-10-26 04:11:21.81	\N	2025-10-26 04:11:21.81	[]	{}	BUSINESS_ERP	\N	\N	t
41	demo_banker	demo_banker@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	BANKER	2025-10-26 04:11:21.813	\N	2025-10-26 04:11:21.813	[]	{}	BUSINESS_ERP	\N	\N	t
42	demo_procurement_officer	demo_procurement_officer@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	PROCUREMENT_OFFICER	2025-10-26 04:11:21.816	\N	2025-10-26 04:11:21.816	[]	{}	BUSINESS_ERP	\N	\N	t
43	demo_store_incharge	demo_store_incharge@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	STORE_INCHARGE	2025-10-26 04:11:21.82	\N	2025-10-26 04:11:21.82	[]	{}	BUSINESS_ERP	\N	\N	t
44	demo_compliance	demo_compliance@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	COMPLIANCE	2025-10-26 04:11:21.825	\N	2025-10-26 04:11:21.825	[]	{}	BUSINESS_ERP	\N	\N	t
45	demo_legal	demo_legal@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	LEGAL	2025-10-26 04:11:21.828	\N	2025-10-26 04:11:21.828	[]	{}	BUSINESS_ERP	\N	\N	t
46	demo_admin	demo_admin@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	ADMIN	2025-10-26 04:11:21.831	\N	2025-10-26 04:11:21.831	[]	{}	BUSINESS_ERP	\N	\N	t
47	demo_operations_manager	demo_operations_manager@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	MANAGER	2025-10-26 04:11:21.836	\N	2025-10-26 04:11:21.836	[]	{}	BUSINESS_ERP	\N	\N	t
33	enterprise_admin	enterprise@bisman.erp	$2a$10$9dqIzgjAAXJgs0XmT/UmFuODYVcb8H8LvlAbBdAiItf16IvV5oUhy	ENTERPRISE_ADMIN	2025-10-26 04:11:21.696	\N	2025-11-02 08:22:20	[]	{}	ALL	\N	\N	t
49	pump_superadmin	pump_superadmin@bisman.demo	$2a$10$L3O6JTJn5.nNXeWs2/9CAOkH.3SWgN2ixvUHtATJNygh.U3ZgQB7e	SUPER_ADMIN	2025-10-26 04:19:23.111	\N	2025-11-02 08:22:20.058	["pump-management", "operations", "fuel-management", "pump-sales", "pump-inventory", "pump-reports"]	{"common": ["settings", "profile"], "operations": ["dashboard", "overview"], "pump-management": ["dashboard", "pumps", "fuel", "sales", "inventory", "reports"]}	PUMP_ERP	\N	\N	t
51	manager_abc	manager@abc.com	$2a$10$JM0XFLeDwtAOGabEiUH7/evTg/spcAEdAvwWVzAQDq0HcS2E9Vbu2	MANAGER	2025-11-02 08:43:57.553	\N	2025-11-02 08:43:57.553	\N	\N	BUSINESS_ERP	\N	550e8400-e29b-41d4-a716-446655440001	t
52	admin_abc	admin@abc.com	$2a$10$CsLY6IQDo5Mf5rva1DEppOHfqmTExsqXmMP7Xcdqv/Dgv7m5DFf/q	ADMIN	2025-11-02 08:43:57.81	\N	2025-11-02 08:43:57.81	\N	\N	BUSINESS_ERP	\N	550e8400-e29b-41d4-a716-446655440001	t
53	manager_xyz	manager@xyz.com	$2a$10$JM0XFLeDwtAOGabEiUH7/evTg/spcAEdAvwWVzAQDq0HcS2E9Vbu2	MANAGER	2025-11-02 08:43:57.822	\N	2025-11-02 08:43:57.822	\N	\N	BUSINESS_ERP	\N	550e8400-e29b-41d4-a716-446655440002	t
54	admin_xyz	admin@xyz.com	$2a$10$CsLY6IQDo5Mf5rva1DEppOHfqmTExsqXmMP7Xcdqv/Dgv7m5DFf/q	ADMIN	2025-11-02 08:43:57.831	\N	2025-11-02 08:43:57.831	\N	\N	BUSINESS_ERP	\N	550e8400-e29b-41d4-a716-446655440002	t
48	demo_hub_incharge	demo_hub_incharge@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	HUB_INCHARGE	2025-10-26 04:11:21.839	/uploads/profile_pics/profile_1763049472314-839936665.webp	2025-11-13 16:47:32.969	[]	{}	BUSINESS_ERP	\N	\N	t
\.


--
-- Data for Name: vocab; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vocab (id, term, definition, normalized_term, user_id, visibility, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vocab_pending; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vocab_pending (id, term, normalized_term, user_id, suggestions, created_at) FROM stdin;
\.


--
-- Name: actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.actions_id_seq', 1, false);


--
-- Name: approval_levels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_levels_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: enterprise_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enterprise_admins_id_seq', 2, true);


--
-- Name: migration_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migration_history_id_seq', 1, false);


--
-- Name: module_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_assignments_id_seq', 48, true);


--
-- Name: modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modules_id_seq', 19, true);


--
-- Name: page_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.page_audit_id_seq', 1, false);


--
-- Name: payment_activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_activity_logs_id_seq', 1, false);


--
-- Name: payment_request_line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_request_line_items_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 133, true);


--
-- Name: rbac_actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rbac_actions_id_seq', 1, false);


--
-- Name: rbac_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rbac_permissions_id_seq', 1, false);


--
-- Name: rbac_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rbac_roles_id_seq', 1, false);


--
-- Name: rbac_routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rbac_routes_id_seq', 1, false);


--
-- Name: rbac_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rbac_user_permissions_id_seq', 1, false);


--
-- Name: rbac_user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rbac_user_roles_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 1, false);


--
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.routes_id_seq', 1, false);


--
-- Name: super_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.super_admins_id_seq', 3, true);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 162, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 54, true);


--
-- Name: vocab_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vocab_id_seq', 1, false);


--
-- Name: vocab_pending_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vocab_pending_id_seq', 1, false);


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

\unrestrict rqeMzMJ5liDp8SRNNH5hQrYu38pXlPHXWTsxUBK0Y8Xc42RVBYCXyeguhcTWaFG

