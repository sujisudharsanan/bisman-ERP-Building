--
-- PostgreSQL database dump
--

\restrict NtjvT93SKbTNsUcMwZxvpmh6oAg1TEZT89d5KPexldQTbNfBFw86bpm4wDIbj9H

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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
-- Name: billing_invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_invoice_items ALTER COLUMN id SET DEFAULT nextval('public.billing_invoice_items_id_seq'::regclass);


--
-- Name: clarification_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clarification_audit ALTER COLUMN id SET DEFAULT nextval('public.clarification_audit_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: enforcement_decision_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enforcement_decision_log ALTER COLUMN id SET DEFAULT nextval('public.enforcement_decision_log_id_seq'::regclass);


--
-- Name: feature_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_catalog ALTER COLUMN id SET DEFAULT nextval('public.feature_catalog_id_seq'::regclass);


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
-- Name: master_feature_definitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_feature_definitions ALTER COLUMN id SET DEFAULT nextval('public.master_feature_definitions_id_seq'::regclass);


--
-- Name: master_subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.master_subscription_plans_id_seq'::regclass);


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
-- Name: plan_change_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_change_audit_log ALTER COLUMN id SET DEFAULT nextval('public.plan_change_audit_log_id_seq'::regclass);


--
-- Name: plan_feature_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_feature_controls ALTER COLUMN id SET DEFAULT nextval('public.plan_feature_controls_id_seq'::regclass);


--
-- Name: resource_consumption id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_consumption ALTER COLUMN id SET DEFAULT nextval('public.resource_consumption_id_seq'::regclass);


--
-- Name: review_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_audit ALTER COLUMN id SET DEFAULT nextval('public.review_audit_id_seq'::regclass);


--
-- Name: subscription_billing_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_billing_ledger ALTER COLUMN id SET DEFAULT nextval('public.subscription_billing_ledger_id_seq'::regclass);


--
-- Name: task_request_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_request_history ALTER COLUMN id SET DEFAULT nextval('public.task_request_history_id_seq'::regclass);


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
-- Name: clarification_audit clarification_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clarification_audit
    ADD CONSTRAINT clarification_audit_pkey PRIMARY KEY (id);


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
-- Name: partial_payment_disallow partial_payment_disallow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partial_payment_disallow
    ADD CONSTRAINT partial_payment_disallow_pkey PRIMARY KEY (id);


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
-- Name: subscription_billing_ledger subscription_billing_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_billing_ledger
    ADD CONSTRAINT subscription_billing_ledger_pkey PRIMARY KEY (id);


--
-- Name: task_clarifications task_clarifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_clarifications
    ADD CONSTRAINT task_clarifications_pkey PRIMARY KEY (id);


--
-- Name: task_request_history task_request_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_request_history
    ADD CONSTRAINT task_request_history_pkey PRIMARY KEY (id);


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
-- Name: idx_line_items_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_payment ON public.settlement_line_items USING btree (payment_request_id);


--
-- Name: idx_line_items_settlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_settlement ON public.settlement_line_items USING btree (settlement_id);


--
-- Name: idx_line_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_status ON public.settlement_line_items USING btree (status);


--
-- Name: idx_master_plans_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_plans_code ON public.master_subscription_plans USING btree (code);


--
-- Name: idx_master_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_plans_status ON public.master_subscription_plans USING btree (status);


--
-- Name: idx_partial_disallow_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partial_disallow_request ON public.partial_payment_disallow USING btree (payment_request_id);


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
-- Name: idx_resource_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_date ON public.resource_consumption USING btree (snapshot_date DESC);


--
-- Name: idx_resource_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_tenant ON public.resource_consumption USING btree (tenant_id);


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
-- Name: idx_unlocks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unlocks_active ON public.feature_micro_unlocks USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_unlocks_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unlocks_tenant ON public.feature_micro_unlocks USING btree (tenant_id);


--
-- Name: idx_usage_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_period ON public.feature_usage_counters USING btree (period_end);


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
-- Name: customers trg_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: items trg_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feature_catalog trigger_feature_catalog_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_feature_catalog_updated BEFORE UPDATE ON public.feature_catalog FOR EACH ROW EXECUTE FUNCTION public.update_micro_unlock_timestamp();


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
-- Name: reconciliation_exceptions trigger_update_batch_stats_on_exception; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_batch_stats_on_exception AFTER INSERT OR DELETE OR UPDATE ON public.reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_batch_statistics();


--
-- Name: reconciliation_matches trigger_update_batch_stats_on_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_batch_stats_on_match AFTER INSERT OR DELETE OR UPDATE ON public.reconciliation_matches FOR EACH ROW EXECUTE FUNCTION public.update_batch_statistics();


--
-- Name: task_clarifications update_task_clarifications_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_clarifications_updated_at_trigger BEFORE UPDATE ON public.task_clarifications FOR EACH ROW EXECUTE FUNCTION public.update_task_clarifications_updated_at();


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
-- Name: clarification_audit clarification_audit_clarification_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clarification_audit
    ADD CONSTRAINT clarification_audit_clarification_id_foreign FOREIGN KEY (clarification_id) REFERENCES public.task_clarifications(id) ON DELETE CASCADE;


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
-- Name: items items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


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
-- Name: plan_feature_controls plan_feature_controls_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_feature_controls
    ADD CONSTRAINT plan_feature_controls_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.master_subscription_plans(id) ON DELETE CASCADE;


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
-- Name: subscription_billing_ledger subscription_billing_ledger_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_billing_ledger
    ADD CONSTRAINT subscription_billing_ledger_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.clients(id) ON DELETE CASCADE;


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
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: customers customers_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_tenant_isolation ON public.customers USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

--
-- Name: items items_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_tenant_isolation ON public.items USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- PostgreSQL database dump complete
--

\unrestrict NtjvT93SKbTNsUcMwZxvpmh6oAg1TEZT89d5KPexldQTbNfBFw86bpm4wDIbj9H

