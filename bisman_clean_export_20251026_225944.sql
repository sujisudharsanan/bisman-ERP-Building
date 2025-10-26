--
-- PostgreSQL database dump
--

\restrict 9nsn7a1nKdGh1qDba4dmkasADDehaVc7tjn0NoD7Rq02J8BOOkUjAFCFllXQ4f6

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
    tenant_id uuid
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
-- Name: actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actions ALTER COLUMN id SET DEFAULT nextval('public.actions_id_seq'::regclass);


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
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, created_at) FROM stdin;
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
1	Enterprise Administrator	enterprise@bisman.erp	$2a$10$FmD77WuHo/lDPu4Y3RyOvODgqzE17Ay./88TmuNa.6nGh0/ppIeSm	\N	t	2025-10-26 04:56:59.114	2025-10-26 04:56:59.114
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
9	2	9	2025-10-26 04:56:59.435	\N
10	2	10	2025-10-26 04:56:59.438	\N
11	2	11	2025-10-26 04:56:59.442	\N
12	2	12	2025-10-26 04:56:59.447	\N
13	2	13	2025-10-26 04:56:59.452	\N
14	2	14	2025-10-26 04:56:59.456	\N
8	1	8	2025-10-26 13:43:55.115	["about-me", "change-password", "security-settings", "notifications", "messages", "help-center", "documentation", "user-settings"]
33	1	10	2025-10-26 14:10:42.327	["hub-incharge"]
34	1	3	2025-10-26 14:15:31.882	["users", "dashboard", "common-user-creation"]
35	1	17	2025-10-26 14:43:50.53	["dashboard", "user-management", "user-creation", "roles-users", "pages-roles", "permission-manager", "company-setup", "system-settings", "master-data", "integration-settings", "api-config", "system-health", "scheduler", "deployment", "backup-restore", "audit-logs", "error-logs", "server-logs", "about-me"]
36	1	18	2025-10-26 15:07:48.385	["dashboard", "security", "system", "orders"]
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
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, role, created_at, profile_pic_url, updated_at, "assignedModules", "pagePermissions", "productType", super_admin_id, tenant_id) FROM stdin;
34	demo_super_admin	demo_super_admin@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	SUPER_ADMIN	2025-10-26 04:11:21.746	\N	2025-10-26 04:11:21.746	[]	{}	BUSINESS_ERP	\N	\N
35	demo_it_admin	demo_it_admin@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	IT_ADMIN	2025-10-26 04:11:21.788	\N	2025-10-26 04:11:21.788	[]	{}	BUSINESS_ERP	\N	\N
36	demo_cfo	demo_cfo@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	CFO	2025-10-26 04:11:21.793	\N	2025-10-26 04:11:21.793	[]	{}	BUSINESS_ERP	\N	\N
37	demo_finance_controller	demo_finance_controller@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	FINANCE_CONTROLLER	2025-10-26 04:11:21.796	\N	2025-10-26 04:11:21.796	[]	{}	BUSINESS_ERP	\N	\N
38	demo_treasury	demo_treasury@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	TREASURY	2025-10-26 04:11:21.799	\N	2025-10-26 04:11:21.799	[]	{}	BUSINESS_ERP	\N	\N
39	demo_accounts	demo_accounts@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	ACCOUNTS	2025-10-26 04:11:21.804	\N	2025-10-26 04:11:21.804	[]	{}	BUSINESS_ERP	\N	\N
40	demo_accounts_payable	demo_accounts_payable@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	ACCOUNTS_PAYABLE	2025-10-26 04:11:21.81	\N	2025-10-26 04:11:21.81	[]	{}	BUSINESS_ERP	\N	\N
41	demo_banker	demo_banker@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	BANKER	2025-10-26 04:11:21.813	\N	2025-10-26 04:11:21.813	[]	{}	BUSINESS_ERP	\N	\N
42	demo_procurement_officer	demo_procurement_officer@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	PROCUREMENT_OFFICER	2025-10-26 04:11:21.816	\N	2025-10-26 04:11:21.816	[]	{}	BUSINESS_ERP	\N	\N
43	demo_store_incharge	demo_store_incharge@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	STORE_INCHARGE	2025-10-26 04:11:21.82	\N	2025-10-26 04:11:21.82	[]	{}	BUSINESS_ERP	\N	\N
44	demo_compliance	demo_compliance@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	COMPLIANCE	2025-10-26 04:11:21.825	\N	2025-10-26 04:11:21.825	[]	{}	BUSINESS_ERP	\N	\N
45	demo_legal	demo_legal@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	LEGAL	2025-10-26 04:11:21.828	\N	2025-10-26 04:11:21.828	[]	{}	BUSINESS_ERP	\N	\N
46	demo_admin	demo_admin@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	ADMIN	2025-10-26 04:11:21.831	\N	2025-10-26 04:11:21.831	[]	{}	BUSINESS_ERP	\N	\N
47	demo_operations_manager	demo_operations_manager@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	MANAGER	2025-10-26 04:11:21.836	\N	2025-10-26 04:11:21.836	[]	{}	BUSINESS_ERP	\N	\N
48	demo_hub_incharge	demo_hub_incharge@bisman.demo	$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m	HUB_INCHARGE	2025-10-26 04:11:21.839	\N	2025-10-26 04:11:21.839	[]	{}	BUSINESS_ERP	\N	\N
33	enterprise_admin	enterprise@bisman.erp	$2a$10$y0/.qsBGnFua.gO67bnlxuZRzK8TjAx/LfCDIYvuyohm521L/HPUy	ENTERPRISE_ADMIN	2025-10-26 04:11:21.696	\N	2025-10-26 04:57:00.512	[]	{}	ALL	\N	\N
49	pump_superadmin	pump_superadmin@bisman.demo	$2a$10$L3O6JTJn5.nNXeWs2/9CAOkH.3SWgN2ixvUHtATJNygh.U3ZgQB7e	SUPER_ADMIN	2025-10-26 04:19:23.111	\N	2025-10-26 05:41:29.977	{"push": "common"}	{"common": ["settings", "profile"], "operations": ["dashboard", "overview"], "pump-management": ["dashboard", "pumps", "fuel", "sales", "inventory", "reports"]}	PUMP_ERP	\N	\N
\.


--
-- Name: actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.actions_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: enterprise_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enterprise_admins_id_seq', 1, true);


--
-- Name: migration_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migration_history_id_seq', 1, false);


--
-- Name: module_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_assignments_id_seq', 36, true);


--
-- Name: modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modules_id_seq', 19, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 112, true);


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

SELECT pg_catalog.setval('public.user_sessions_id_seq', 23, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 49, true);


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
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


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
-- Name: actions_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX actions_name_key ON public.actions USING btree (name);


--
-- Name: enterprise_admins_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX enterprise_admins_email_key ON public.enterprise_admins USING btree (email);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_clients_product_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_product_type ON public.clients USING btree ("productType");


--
-- Name: idx_clients_super_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_super_admin ON public.clients USING btree (super_admin_id);


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
-- Name: idx_super_admins_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admins_created_by ON public.super_admins USING btree (created_by);


--
-- Name: idx_super_admins_product_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admins_product_type ON public.super_admins USING btree ("productType");


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
-- Name: user_sessions_session_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_sessions_session_token_key ON public.user_sessions USING btree (session_token);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


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
-- Name: clients clients_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


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

\unrestrict 9nsn7a1nKdGh1qDba4dmkasADDehaVc7tjn0NoD7Rq02J8BOOkUjAFCFllXQ4f6

