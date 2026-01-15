--
-- PostgreSQL database dump
--

\restrict UAkqcZfOlrRheEgYPpNgNKA3arPNahkmmNaXTrzhJkUwQbHdEaR4JzJaQ5LbQYM

-- Dumped from database version 16.11 (f45eb12)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _system; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA _system;


ALTER SCHEMA _system OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: replit_database_migrations_v1; Type: TABLE; Schema: _system; Owner: neondb_owner
--

CREATE TABLE _system.replit_database_migrations_v1 (
    id bigint NOT NULL,
    build_id text NOT NULL,
    deployment_id text NOT NULL,
    statement_count bigint NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE _system.replit_database_migrations_v1 OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE; Schema: _system; Owner: neondb_owner
--

CREATE SEQUENCE _system.replit_database_migrations_v1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE OWNED BY; Schema: _system; Owner: neondb_owner
--

ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNED BY _system.replit_database_migrations_v1.id;


--
-- Name: admin_activity_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.admin_activity_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    actor_id character varying NOT NULL,
    target_user_id character varying,
    action_type text NOT NULL,
    before_state jsonb,
    after_state jsonb,
    reason text,
    ip_address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_activity_logs OWNER TO neondb_owner;

--
-- Name: audit_change_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_change_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    audit_id character varying,
    user_id character varying NOT NULL,
    client_id character varying,
    department_id character varying,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id character varying,
    before_state jsonb,
    after_state jsonb,
    reason text,
    ip_address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_change_log OWNER TO neondb_owner;

--
-- Name: audit_contexts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_contexts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    client_id character varying NOT NULL,
    department_id character varying,
    period text DEFAULT 'daily'::text NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_active_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_contexts OWNER TO neondb_owner;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    action text NOT NULL,
    entity text NOT NULL,
    details text,
    ip_address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    entity_id character varying
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: audit_reissue_permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_reissue_permissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    audit_id character varying NOT NULL,
    granted_to character varying NOT NULL,
    granted_by character varying NOT NULL,
    granted_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone,
    scope text DEFAULT 'edit_after_submission'::text NOT NULL,
    reason text,
    active boolean DEFAULT true
);


ALTER TABLE public.audit_reissue_permissions OWNER TO neondb_owner;

--
-- Name: audits; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audits (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    department_id character varying NOT NULL,
    period text DEFAULT 'daily'::text NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_by character varying,
    submitted_at timestamp without time zone,
    locked_by character varying,
    locked_at timestamp without time zone,
    notes text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audits OWNER TO neondb_owner;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by character varying
);


ALTER TABLE public.categories OWNER TO neondb_owner;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clients (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    risk_score integer DEFAULT 0,
    variance_threshold numeric(5,2) DEFAULT 5.00,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    organization_id character varying
);


ALTER TABLE public.clients OWNER TO neondb_owner;

--
-- Name: data_exports; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.data_exports (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    organization_id character varying NOT NULL,
    created_by character varying NOT NULL,
    format text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    filename text,
    file_path text,
    file_size integer,
    data_types text[] NOT NULL,
    date_range_start date,
    date_range_end date,
    record_count integer,
    error text,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


ALTER TABLE public.data_exports OWNER TO neondb_owner;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.departments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    client_id character varying NOT NULL,
    category_id character varying,
    suspend_reason text,
    created_by character varying
);


ALTER TABLE public.departments OWNER TO neondb_owner;

--
-- Name: exception_activity; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exception_activity (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    exception_id character varying NOT NULL,
    activity_type text DEFAULT 'note'::text NOT NULL,
    message text NOT NULL,
    previous_value text,
    new_value text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exception_activity OWNER TO neondb_owner;

--
-- Name: exception_comments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exception_comments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    exception_id character varying NOT NULL,
    comment text NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exception_comments OWNER TO neondb_owner;

--
-- Name: exceptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exceptions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    case_number text NOT NULL,
    outlet_id character varying,
    department_id character varying,
    summary text NOT NULL,
    description text,
    impact text,
    severity text DEFAULT 'medium'::text,
    status text DEFAULT 'open'::text,
    evidence_urls text[],
    assigned_to character varying,
    resolved_at timestamp without time zone,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id character varying,
    date text DEFAULT (CURRENT_DATE)::text NOT NULL,
    outcome text DEFAULT 'pending'::text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by character varying,
    delete_reason text
);


ALTER TABLE public.exceptions OWNER TO neondb_owner;

--
-- Name: goods_received_notes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.goods_received_notes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    supplier_id character varying,
    supplier_name text NOT NULL,
    date timestamp without time zone NOT NULL,
    invoice_ref text NOT NULL,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    evidence_url text,
    evidence_file_name text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.goods_received_notes OWNER TO neondb_owner;

--
-- Name: inventory_department_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_department_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    inventory_department_id character varying NOT NULL,
    category_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_department_categories OWNER TO neondb_owner;

--
-- Name: inventory_departments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_departments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    store_name_id character varying NOT NULL,
    inventory_type text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    department_id character varying
);


ALTER TABLE public.inventory_departments OWNER TO neondb_owner;

--
-- Name: item_serial_events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.item_serial_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    srd_id character varying NOT NULL,
    item_id character varying NOT NULL,
    event_type text NOT NULL,
    ref_id character varying,
    serial_number text NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.item_serial_events OWNER TO neondb_owner;

--
-- Name: items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    name text NOT NULL,
    sku text,
    category text DEFAULT 'general'::text NOT NULL,
    unit text DEFAULT 'pcs'::text NOT NULL,
    cost_price numeric(12,2) DEFAULT 0.00,
    selling_price numeric(12,2) DEFAULT 0.00,
    reorder_level integer DEFAULT 10,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    category_id character varying,
    serial_tracking text DEFAULT 'none'::text NOT NULL,
    serial_notes text,
    supplier_id character varying,
    wholesale_price numeric(12,2),
    retail_price numeric(12,2),
    vip_price numeric(12,2),
    custom_price numeric(12,2)
);


ALTER TABLE public.items OWNER TO neondb_owner;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    organization_id character varying NOT NULL,
    user_id character varying,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    ref_type text,
    ref_id character varying,
    is_read boolean DEFAULT false NOT NULL,
    email_sent boolean DEFAULT false NOT NULL,
    email_sent_at timestamp without time zone,
    email_error text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: organization_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organization_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_name text,
    address text,
    email text,
    phone text,
    currency text DEFAULT 'NGN'::text NOT NULL,
    updated_by character varying,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    organization_id character varying,
    logo_url text,
    report_footer_note text
);


ALTER TABLE public.organization_settings OWNER TO neondb_owner;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organizations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'company'::text NOT NULL,
    email text,
    phone text,
    address text,
    currency_code text DEFAULT 'NGN'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_suspended boolean DEFAULT false,
    suspended_at timestamp without time zone,
    suspended_reason text
);


ALTER TABLE public.organizations OWNER TO neondb_owner;

--
-- Name: payment_declarations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_declarations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    reported_cash numeric(12,2) DEFAULT 0.00,
    reported_pos_settlement numeric(12,2) DEFAULT 0.00,
    reported_transfers numeric(12,2) DEFAULT 0.00,
    total_reported numeric(12,2) DEFAULT 0.00,
    notes text,
    supporting_documents jsonb,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    department_id character varying NOT NULL
);


ALTER TABLE public.payment_declarations OWNER TO neondb_owner;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    organization_id character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'NGN'::text NOT NULL,
    period_covered_start timestamp without time zone NOT NULL,
    period_covered_end timestamp without time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reference text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: platform_admin_audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.platform_admin_audit_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    admin_id character varying NOT NULL,
    action_type text NOT NULL,
    target_type text NOT NULL,
    target_id character varying,
    before_json jsonb,
    after_json jsonb,
    notes text,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.platform_admin_audit_log OWNER TO neondb_owner;

--
-- Name: platform_admin_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.platform_admin_users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'readonly_admin'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.platform_admin_users OWNER TO neondb_owner;

--
-- Name: purchase_item_events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_item_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    srd_id character varying,
    item_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    qty numeric(10,2) NOT NULL,
    unit_cost_at_purchase numeric(12,2) NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    supplier_name text,
    invoice_no text,
    notes text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchase_item_events OWNER TO neondb_owner;

--
-- Name: purchase_lines; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_lines (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    purchase_id character varying NOT NULL,
    item_id character varying NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchase_lines OWNER TO neondb_owner;

--
-- Name: purchases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchases (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    supplier_name text NOT NULL,
    invoice_ref text NOT NULL,
    invoice_date timestamp without time zone NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    status text DEFAULT 'draft'::text,
    evidence_url text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id character varying NOT NULL,
    department_id character varying NOT NULL
);


ALTER TABLE public.purchases OWNER TO neondb_owner;

--
-- Name: receivable_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.receivable_history (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    receivable_id character varying NOT NULL,
    action text NOT NULL,
    previous_status text,
    new_status text,
    amount_paid numeric(12,2),
    notes text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.receivable_history OWNER TO neondb_owner;

--
-- Name: receivables; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.receivables (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    department_id character varying NOT NULL,
    audit_date timestamp without time zone NOT NULL,
    variance_amount numeric(12,2) NOT NULL,
    amount_paid numeric(12,2) DEFAULT 0.00,
    balance_remaining numeric(12,2) NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    comments text,
    evidence_url text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.receivables OWNER TO neondb_owner;

--
-- Name: reconciliations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reconciliations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    department_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    opening_stock jsonb NOT NULL,
    additions jsonb NOT NULL,
    expected_usage jsonb NOT NULL,
    physical_count jsonb NOT NULL,
    variance_qty numeric(10,2) DEFAULT 0.00,
    variance_value numeric(12,2) DEFAULT 0.00,
    status text DEFAULT 'pending'::text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    approved_by character varying,
    approved_at timestamp without time zone,
    client_id character varying NOT NULL
);


ALTER TABLE public.reconciliations OWNER TO neondb_owner;

--
-- Name: sales_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_entries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    department_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    shift text DEFAULT 'full'::text,
    cash_amount numeric(12,2) DEFAULT 0.00,
    pos_amount numeric(12,2) DEFAULT 0.00,
    transfer_amount numeric(12,2) DEFAULT 0.00,
    voids_amount numeric(12,2) DEFAULT 0.00,
    discounts_amount numeric(12,2) DEFAULT 0.00,
    total_sales numeric(12,2) NOT NULL,
    mode text DEFAULT 'summary'::text,
    evidence_url text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id character varying NOT NULL,
    amount numeric(12,2) DEFAULT 0.00,
    complimentary_amount numeric(12,2) DEFAULT 0.00,
    vouchers_amount numeric(12,2) DEFAULT 0.00,
    others_amount numeric(12,2) DEFAULT 0.00
);


ALTER TABLE public.sales_entries OWNER TO neondb_owner;

--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: srd_ledger_daily; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.srd_ledger_daily (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    srd_id character varying NOT NULL,
    srd_type text NOT NULL,
    item_id character varying NOT NULL,
    ledger_date date NOT NULL,
    opening_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    closing_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    purchase_added_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    returns_in_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    req_dep_total_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    from_main_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    inter_in_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    inter_out_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    returns_out_to_main numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    sold_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    waste_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    write_off_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    adjustment_qty numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.srd_ledger_daily OWNER TO neondb_owner;

--
-- Name: srd_stock_movements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.srd_stock_movements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    movement_date date NOT NULL,
    event_type text NOT NULL,
    from_srd_id character varying,
    to_srd_id character varying,
    item_id character varying NOT NULL,
    qty numeric(18,2) NOT NULL,
    description text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.srd_stock_movements OWNER TO neondb_owner;

--
-- Name: srd_transfers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.srd_transfers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ref_id character varying NOT NULL,
    client_id character varying NOT NULL,
    from_srd_id character varying NOT NULL,
    to_srd_id character varying NOT NULL,
    item_id character varying NOT NULL,
    qty numeric(10,2) NOT NULL,
    transfer_date timestamp without time zone NOT NULL,
    transfer_type text DEFAULT 'transfer'::text NOT NULL,
    notes text,
    status text DEFAULT 'posted'::text NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.srd_transfers OWNER TO neondb_owner;

--
-- Name: stock_counts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stock_counts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    department_id character varying NOT NULL,
    item_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    opening_qty numeric(10,2) DEFAULT 0.00,
    received_qty numeric(10,2) DEFAULT 0.00,
    sold_qty numeric(10,2) DEFAULT 0.00,
    expected_closing_qty numeric(10,2) DEFAULT 0.00,
    actual_closing_qty numeric(10,2),
    variance_qty numeric(10,2) DEFAULT 0.00,
    variance_value numeric(12,2) DEFAULT 0.00,
    notes text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id character varying NOT NULL,
    added_qty numeric(10,2) DEFAULT 0.00,
    cost_price_snapshot numeric(12,2) DEFAULT 0.00,
    selling_price_snapshot numeric(12,2) DEFAULT 0.00,
    store_department_id character varying
);


ALTER TABLE public.stock_counts OWNER TO neondb_owner;

--
-- Name: stock_movement_lines; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stock_movement_lines (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    movement_id character varying NOT NULL,
    item_id character varying NOT NULL,
    qty numeric(10,2) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    line_value numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stock_movement_lines OWNER TO neondb_owner;

--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stock_movements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    outlet_id character varying,
    movement_type text NOT NULL,
    source_location text,
    destination_location text,
    items_description text,
    total_value numeric(12,2) DEFAULT 0.00,
    authorized_by text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id character varying NOT NULL,
    department_id character varying NOT NULL,
    from_srd_id character varying,
    to_srd_id character varying,
    date timestamp without time zone DEFAULT now() NOT NULL,
    adjustment_direction text,
    total_qty numeric(10,2) DEFAULT 0.00,
    notes text,
    approved_by character varying,
    approved_at timestamp without time zone,
    idempotency_key character varying,
    source_ref character varying
);


ALTER TABLE public.stock_movements OWNER TO neondb_owner;

--
-- Name: store_issue_lines; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.store_issue_lines (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    store_issue_id character varying NOT NULL,
    item_id character varying NOT NULL,
    qty_issued numeric(10,2) NOT NULL,
    cost_price_snapshot numeric(12,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.store_issue_lines OWNER TO neondb_owner;

--
-- Name: store_issues; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.store_issues (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    issue_date timestamp without time zone NOT NULL,
    from_department_id character varying NOT NULL,
    to_department_id character varying NOT NULL,
    notes text,
    status text DEFAULT 'posted'::text NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.store_issues OWNER TO neondb_owner;

--
-- Name: store_names; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.store_names (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id character varying NOT NULL,
    created_by character varying
);


ALTER TABLE public.store_names OWNER TO neondb_owner;

--
-- Name: store_stock; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.store_stock (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    store_department_id character varying NOT NULL,
    item_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    opening_qty numeric(10,2) DEFAULT 0.00,
    added_qty numeric(10,2) DEFAULT 0.00,
    issued_qty numeric(10,2) DEFAULT 0.00,
    closing_qty numeric(10,2) DEFAULT 0.00,
    physical_closing_qty numeric(10,2),
    variance_qty numeric(10,2) DEFAULT 0.00,
    cost_price_snapshot numeric(12,2) DEFAULT 0.00,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    transfers_in_qty numeric(10,2) DEFAULT 0.00,
    transfers_out_qty numeric(10,2) DEFAULT 0.00,
    inter_dept_in_qty numeric(10,2) DEFAULT 0.00,
    inter_dept_out_qty numeric(10,2) DEFAULT 0.00,
    waste_qty numeric(10,2) DEFAULT 0.00,
    write_off_qty numeric(10,2) DEFAULT 0.00,
    adjustment_qty numeric(10,2) DEFAULT 0.00,
    sold_qty numeric(10,2) DEFAULT 0.00,
    return_in_qty numeric(10,2) DEFAULT 0.00
);


ALTER TABLE public.store_stock OWNER TO neondb_owner;

--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subscription_plans (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    monthly_price numeric(12,2) DEFAULT 0 NOT NULL,
    quarterly_price numeric(12,2) DEFAULT 0 NOT NULL,
    yearly_price numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'NGN'::text NOT NULL,
    max_clients integer DEFAULT 1 NOT NULL,
    max_srd_departments_per_client integer DEFAULT 4 NOT NULL,
    max_main_store_per_client integer DEFAULT 1 NOT NULL,
    max_seats integer DEFAULT 2 NOT NULL,
    retention_days integer DEFAULT 30 NOT NULL,
    can_view_reports boolean DEFAULT true NOT NULL,
    can_download_reports boolean DEFAULT false NOT NULL,
    can_print_reports boolean DEFAULT false NOT NULL,
    can_access_purchases_register_page boolean DEFAULT false NOT NULL,
    can_access_second_hit_page boolean DEFAULT false NOT NULL,
    can_download_second_hit_full_table boolean DEFAULT false NOT NULL,
    can_download_main_store_ledger_summary boolean DEFAULT false NOT NULL,
    can_use_beta_features boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscription_plans OWNER TO neondb_owner;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subscriptions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    plan_name text DEFAULT 'starter'::text NOT NULL,
    billing_period text DEFAULT 'monthly'::text NOT NULL,
    slots_purchased integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'trial'::text NOT NULL,
    start_date timestamp without time zone DEFAULT now() NOT NULL,
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    organization_id character varying NOT NULL,
    provider text DEFAULT 'manual'::text,
    next_billing_date timestamp without time zone,
    expires_at timestamp without time zone,
    notes text,
    updated_by character varying,
    max_clients_override integer,
    max_srd_departments_override integer,
    max_main_store_override integer,
    max_seats_override integer,
    retention_days_override integer,
    paystack_customer_code text,
    paystack_subscription_code text,
    paystack_plan_code text,
    paystack_email_token text,
    last_payment_date timestamp without time zone,
    last_payment_amount numeric(12,2),
    last_payment_reference text
);


ALTER TABLE public.subscriptions OWNER TO neondb_owner;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.suppliers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppliers OWNER TO neondb_owner;

--
-- Name: surplus_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.surplus_history (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    surplus_id character varying NOT NULL,
    action text NOT NULL,
    previous_status text,
    new_status text,
    notes text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.surplus_history OWNER TO neondb_owner;

--
-- Name: surpluses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.surpluses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    department_id character varying NOT NULL,
    audit_date timestamp without time zone NOT NULL,
    surplus_amount numeric(12,2) NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    classification text,
    comments text,
    evidence_url text,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.surpluses OWNER TO neondb_owner;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.system_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_by character varying,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO neondb_owner;

--
-- Name: user_client_access; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_client_access (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    client_id character varying NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    assigned_by character varying NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    suspend_reason text,
    notes text
);


ALTER TABLE public.user_client_access OWNER TO neondb_owner;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    theme text DEFAULT 'light'::text NOT NULL,
    auto_save_enabled boolean DEFAULT true NOT NULL,
    auto_save_interval_seconds integer DEFAULT 60 NOT NULL,
    variance_threshold_percent numeric(5,2) DEFAULT 5.00 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    email_notifications_enabled boolean DEFAULT true NOT NULL,
    exception_alerts_enabled boolean DEFAULT true NOT NULL,
    variance_alerts_enabled boolean DEFAULT true NOT NULL,
    daily_digest_enabled boolean DEFAULT false NOT NULL
);


ALTER TABLE public.user_settings OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'auditor'::text NOT NULL,
    phone text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    must_change_password boolean DEFAULT false,
    password_reset_token text,
    password_reset_expiry timestamp without time zone,
    login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    last_login_at timestamp without time zone,
    access_scope jsonb,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    organization_id character varying,
    organization_role text DEFAULT 'member'::text,
    email_verified boolean DEFAULT false,
    verification_token text,
    verification_expiry timestamp without time zone,
    is_locked boolean DEFAULT false,
    locked_reason text
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1 id; Type: DEFAULT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1 ALTER COLUMN id SET DEFAULT nextval('_system.replit_database_migrations_v1_id_seq'::regclass);


--
-- Data for Name: replit_database_migrations_v1; Type: TABLE DATA; Schema: _system; Owner: neondb_owner
--

COPY _system.replit_database_migrations_v1 (id, build_id, deployment_id, statement_count, applied_at) FROM stdin;
1	0692b1f7-72ab-4095-b0e1-e7fe6664915e	f55e019f-22f2-4892-91a4-5805dd9aeb55	15	2026-01-03 08:21:54.04963+00
2	e9d6e162-9d23-432b-89d2-ee4d9a7f43b1	f55e019f-22f2-4892-91a4-5805dd9aeb55	16	2026-01-03 21:29:29.484196+00
3	17f21e7e-9b71-4abc-a922-ea53e55ef92f	f55e019f-22f2-4892-91a4-5805dd9aeb55	13	2026-01-04 11:14:29.319154+00
4	59227e1b-952a-409f-9152-e7519f264278	f55e019f-22f2-4892-91a4-5805dd9aeb55	1	2026-01-04 12:20:21.597437+00
5	512982b9-0cee-4ea3-9f4f-64225d7e6aa4	f55e019f-22f2-4892-91a4-5805dd9aeb55	8	2026-01-04 16:09:06.149112+00
6	2f71f7bd-4b53-4375-b25c-31c9a7150086	f55e019f-22f2-4892-91a4-5805dd9aeb55	14	2026-01-05 02:42:05.516044+00
\.


--
-- Data for Name: admin_activity_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.admin_activity_logs (id, actor_id, target_user_id, action_type, before_state, after_state, reason, ip_address, created_at) FROM stdin;
5c0d3639-d8d2-45ed-9271-650caeaf9857	5ed0ccee-d55a-4700-b092-efa7e84a1907	5ed0ccee-d55a-4700-b092-efa7e84a1907	bootstrap_admin_created	\N	{"role": "super_admin", "email": "miemploya@gmail.com", "fullName": "Ighodaro Nosa Ogiemwanye"}	\N	172.31.65.226	2025-12-26 07:40:10.564459
5747bce3-2c75-40fd-8361-4067769623e3	5ed0ccee-d55a-4700-b092-efa7e84a1907	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	user_created	\N	{"role": "auditor", "email": "ighodaro.algadg@gmail.com", "fullName": "Victory"}	\N	172.31.68.226	2025-12-30 12:24:37.823334
2273848b-6428-4b09-887a-fd164022ede5	5ed0ccee-d55a-4700-b092-efa7e84a1907	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	password_reset	\N	\N	\N	172.31.68.226	2025-12-30 12:25:30.366707
72c2916c-eac3-46a7-814a-4a9c75123d84	5ed0ccee-d55a-4700-b092-efa7e84a1907	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	password_reset	\N	\N	\N	172.31.68.226	2025-12-30 12:27:24.600464
0116957f-3f42-44af-94a9-22699b79a073	5ed0ccee-d55a-4700-b092-efa7e84a1907	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	password_reset	\N	\N	\N	172.31.68.226	2025-12-30 12:31:20.635644
99be2fe6-89b3-4aa0-b979-0561536f2197	dbd700e5-b8d8-4ccf-8535-e67067f4804a	dbd700e5-b8d8-4ccf-8535-e67067f4804a	user_registered	\N	{"role": "super_admin", "email": "test2@example.com", "fullName": "Test User", "organizationId": "597b39e0-c81b-4465-8b07-0f70ce9cb0a6"}	\N	127.0.0.1	2026-01-01 19:29:22.526673
e79726ee-0cc7-40e3-8898-0fa885d9eb79	7e0fef88-1873-4099-bc02-ade3309d4817	7e0fef88-1873-4099-bc02-ade3309d4817	user_registered	\N	{"role": "super_admin", "email": "test3@example.com", "fullName": "Test User 3", "organizationId": "d18379c6-217e-4d60-8705-a5cae16986b0"}	\N	127.0.0.1	2026-01-01 21:26:05.544638
d7afd6a5-71b3-4151-b4f4-cbdd3aab72f5	49650644-8e70-488e-8597-16cb4254d906	49650644-8e70-488e-8597-16cb4254d906	user_registered	\N	{"role": "super_admin", "email": "test4@example.com", "fullName": "Test User 4", "organizationId": "ee24b79f-7e0a-48bc-9642-d2d9603a36ab"}	\N	127.0.0.1	2026-01-01 21:27:06.27429
65e79f04-4742-4795-865f-7199ad44cb02	d4d4bbe7-b72b-4349-ba5b-ccdcad87dd4e	d4d4bbe7-b72b-4349-ba5b-ccdcad87dd4e	user_registered	\N	{"role": "super_admin", "email": "test5@example.com", "fullName": "Test User 5", "organizationId": "9696e18f-d53b-45cf-adae-616376d18ad2"}	\N	127.0.0.1	2026-01-01 21:29:56.351086
d397a520-a56e-4916-97f5-63b8ca0577a1	27debef5-907c-463a-97e8-c70cd012dfd7	27debef5-907c-463a-97e8-c70cd012dfd7	user_registered	\N	{"role": "super_admin", "email": "newtest123@gmail.com", "fullName": "New Test User", "organizationId": "9f06a02a-93b2-4044-9f37-b174f537e82a"}	\N	127.0.0.1	2026-01-01 22:10:25.652232
7c0469ca-c3c6-482f-9188-c51714b74070	08cae6ca-1bda-42e0-8cee-bdb28d071529	08cae6ca-1bda-42e0-8cee-bdb28d071529	user_registered	\N	{"role": "super_admin", "email": "algadginternationalltd@gmail.com", "fullName": "Ighodaro Nosa Ogiemwanye", "organizationId": "62b4d151-7e74-4012-84fd-d44acedfb8d5"}	\N	35.243.160.31	2026-01-02 01:33:31.035155
b55b5fcc-597f-4734-9580-d18a80e97c52	6419147a-44c1-4f3c-bbcb-51a46a91d1be	6419147a-44c1-4f3c-bbcb-51a46a91d1be	user_registered	\N	{"role": "super_admin", "email": "openclax@gmail.com", "fullName": "Ighodaro Nosa Ogiemwanye", "organizationId": "d09a34a2-4e1d-4048-be05-faa10238aae7"}	\N	34.139.219.171	2026-01-03 03:56:22.602491
a86d4419-3ff4-42d5-b3d0-aa9f92df51ba	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	user_registered	\N	{"role": "super_admin", "email": "ighodaro.efeandassociates@gmail.com", "fullName": "Ighodaro Nosa Ogiemwanye", "organizationId": "4144bb32-2cbb-46df-a2e7-ef96f9acebab"}	\N	102.89.83.161	2026-01-07 10:50:43.484902
\.


--
-- Data for Name: audit_change_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_change_log (id, audit_id, user_id, client_id, department_id, action_type, entity_type, entity_id, before_state, after_state, reason, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: audit_contexts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_contexts (id, user_id, client_id, department_id, period, start_date, end_date, status, created_at, last_active_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, user_id, action, entity, details, ip_address, created_at, entity_id) FROM stdin;
a7d77e61-c128-41f6-a7c7-f2f6af1fd15a	\N	Login Failed	Session	Failed login attempt for username: john.doe	172.31.65.226	2025-12-26 07:34:01.307372	\N
586bb1d2-dc8f-4dd5-b7cf-3b6d6c563a8b	\N	Login Failed	Session	Failed login attempt for username: miemploya@gmail.com	172.31.65.226	2025-12-26 07:36:51.457041	\N
f7eec6e9-b54c-4252-8f52-afe05bcde865	\N	Login Failed	Session	Failed login attempt for username: miemploya@gmail.com	172.31.65.226	2025-12-26 07:37:04.552846	\N
7abb6a63-a4f2-4b0f-830b-d1b7a6cd2c95	\N	Login Failed	Session	Failed login attempt for username: miemploya@gmail.com	172.31.65.226	2025-12-26 07:37:12.061751	\N
abbdd8e8-35f4-4a98-9f2a-f5df43b7b740	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.65.226	2025-12-26 07:40:37.03389	\N
fb970301-f8b7-4df7-98fa-6b53fc45b6d1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.65.226	2025-12-26 07:46:19.396746	\N
77122575-b32e-4c7c-b506-da64d431f37f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (2/5)	172.31.65.226	2025-12-26 07:46:31.512346	\N
64b74d13-9552-4852-9ffb-8a4ebece5c2a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.65.226	2025-12-26 07:46:51.772971	\N
c85cceb6-4a7d-4fea-a771-0f0b88d84c6e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.65.226	2025-12-26 07:53:10.798328	\N
a6dcb14a-ef29-4fbb-9b1b-edaaac98b40d	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	Seed	System	Database seeded with sample data	127.0.0.1	2025-12-26 08:34:06.814042	\N
97bc85de-b2c3-46b9-bd3b-8cceca1ff1ed	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.65.226	2025-12-26 08:41:14.816449	\N
c3dab224-f7fe-4267-a3c0-0752a61e9d4f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Client	Openclax Limited	New client added: Openclax Limited	172.31.65.226	2025-12-26 08:51:02.794607	23495184-997f-4b6d-b432-033aa0276a76
855351dc-8084-465f-967a-1721a71349c3	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.65.226	2025-12-26 09:00:30.251403	\N
acc84fa5-bf8a-45c6-8873-c452dd7c459e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.65.226	2025-12-26 09:11:06.903654	\N
ab8523ba-231d-4cf1-80de-6ba86a35b8f4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.65.226	2025-12-26 09:27:51.137275	\N
849ef0f0-a848-4c86-844f-ab1240dbdd6d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.65.226	2025-12-26 10:07:01.976624	\N
06c887e2-74d4-4ff8-908a-694d93caa166	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Client	Openclax Limited	New client added: Openclax Limited	172.31.65.226	2025-12-26 10:08:03.340091	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
82eb2830-bb20-4896-b82a-e95691b72255	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Client	Client	Client deleted	172.31.65.226	2025-12-26 10:08:11.560738	23495184-997f-4b6d-b432-033aa0276a76
3289627c-2611-4216-8710-f1996196c13e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.89.98	2025-12-26 22:53:34.545867	\N
349311dd-5381-4dbf-87f3-2e35674f2715	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.89.98	2025-12-26 23:33:12.430119	\N
07503d32-56c2-4af4-909b-fbf52f58a34c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.89.98	2025-12-27 00:15:09.587293	\N
8f5a509f-7165-4943-bd33-e0f807a63513	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Client	igh	New client added: igh	172.31.89.98	2025-12-27 00:15:25.456464	fb428d91-bacb-44ed-b4cd-310c87c5a8de
8be3b72e-a9a0-4337-b536-7ceb5b76bfde	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.89.98	2025-12-27 00:52:54.273282	\N
3263c6e1-4461-45b5-9e12-5c9b0b8b3f74	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.89.98	2025-12-27 01:37:23.018584	\N
7b7994bc-e40c-43af-822d-c31d47c2eff8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Client Department	Department	New client-level department added: Store	172.31.89.98	2025-12-27 01:37:57.887501	8ef0f287-556b-4228-b49e-db98218b8295
8f4f4ef7-04f8-46d6-8187-3776d86f9042	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 8ef0f287-556b-4228-b49e-db98218b8295 disabled for outlet 30e7c959-e001-45df-8a8b-c160c354fcca	172.31.89.98	2025-12-27 01:39:02.586514	30e7c959-e001-45df-8a8b-c160c354fcca:8ef0f287-556b-4228-b49e-db98218b8295
28724133-43cd-4f48-9d04-74a30a7ac064	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 8ef0f287-556b-4228-b49e-db98218b8295 disabled for outlet ff377523-7022-4bf4-969c-3781c0cf5000	172.31.89.98	2025-12-27 01:39:25.530765	ff377523-7022-4bf4-969c-3781c0cf5000:8ef0f287-556b-4228-b49e-db98218b8295
bfe9eb14-a43c-4749-bda5-4c066d30b9f7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 8ef0f287-556b-4228-b49e-db98218b8295 disabled for outlet c3091f91-dcec-4cee-b3ba-ab7c04ff5657	172.31.89.98	2025-12-27 01:41:09.247676	c3091f91-dcec-4cee-b3ba-ab7c04ff5657:8ef0f287-556b-4228-b49e-db98218b8295
f9d1e689-ef50-4706-9923-048353486d25	5ed0ccee-d55a-4700-b092-efa7e84a1907	Enabled Department for Outlet	OutletDepartmentLink	Department 8ef0f287-556b-4228-b49e-db98218b8295 enabled for outlet 30e7c959-e001-45df-8a8b-c160c354fcca	172.31.89.98	2025-12-27 01:41:56.392757	30e7c959-e001-45df-8a8b-c160c354fcca:8ef0f287-556b-4228-b49e-db98218b8295
9dfe64fb-2090-4bf3-ad70-7ccf37eca298	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 8ef0f287-556b-4228-b49e-db98218b8295 disabled for outlet 30e7c959-e001-45df-8a8b-c160c354fcca	172.31.89.98	2025-12-27 01:41:58.704247	30e7c959-e001-45df-8a8b-c160c354fcca:8ef0f287-556b-4228-b49e-db98218b8295
7096bf6a-4229-4cd8-8798-32c13cb9deef	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Client Department	Department	New client-level department added: Pool Bar	172.31.89.98	2025-12-27 01:42:37.697734	295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
e4a2068c-232c-402b-8091-68689e043d9a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f disabled for outlet bd279946-8a56-4e2f-8a40-714bdb2574c9	172.31.89.98	2025-12-27 01:43:26.169794	bd279946-8a56-4e2f-8a40-714bdb2574c9:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
1cd1c0bd-67b7-465d-a168-5a70fb5f84c6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f disabled for outlet c3091f91-dcec-4cee-b3ba-ab7c04ff5657	172.31.89.98	2025-12-27 01:43:34.146282	c3091f91-dcec-4cee-b3ba-ab7c04ff5657:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
54b2febd-5703-4bd4-9adc-c80e4ffb33ac	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f disabled for outlet ff377523-7022-4bf4-969c-3781c0cf5000	172.31.89.98	2025-12-27 01:43:38.401828	ff377523-7022-4bf4-969c-3781c0cf5000:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
ada8d2e9-4d23-4356-bb51-41f15cb3b3f3	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deactivated Department	Department	Department deactivated: Bar. Reason: Not specified	172.31.89.98	2025-12-27 01:44:08.724795	295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
856c3e99-5900-4bd5-b6d4-e9922dc48918	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.89.98	2025-12-27 06:21:31.129788	\N
719e9f29-0c46-46fb-98c4-95a55168dd70	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 8ef0f287-556b-4228-b49e-db98218b8295 disabled for outlet bd279946-8a56-4e2f-8a40-714bdb2574c9	172.31.89.98	2025-12-27 01:46:01.301914	bd279946-8a56-4e2f-8a40-714bdb2574c9:8ef0f287-556b-4228-b49e-db98218b8295
98ae7a47-6f4e-4830-aa98-105a09aaa3b7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f disabled for outlet 30e7c959-e001-45df-8a8b-c160c354fcca	172.31.89.98	2025-12-27 01:49:19.882536	30e7c959-e001-45df-8a8b-c160c354fcca:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
7c34e285-2b5f-4cab-a560-4de893c0d053	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Outlet Department	Department	New outlet department added: Store	172.31.89.98	2025-12-27 01:55:22.25744	b78119c2-f83d-455c-905c-0b430ce7906a
3aa289f9-9991-49d1-b1a8-90b48f77d85f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Outlet Department	Department	New outlet department added: o.Store	172.31.89.98	2025-12-27 01:56:31.613223	860ceafd-3b5b-426d-bd4e-298e20d3e601
270367e4-3f51-4619-8481-e529fd969b60	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Outlet Department	Department	New outlet department added: o.Store	172.31.89.98	2025-12-27 01:58:07.016518	662ab128-3231-42ce-8d59-9445495abf49
81f1c94e-1038-428f-b919-57b01caf18d7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Enabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f enabled for outlet ff377523-7022-4bf4-969c-3781c0cf5000	172.31.89.98	2025-12-27 02:16:40.289724	ff377523-7022-4bf4-969c-3781c0cf5000:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
519bdfc7-5a84-4bd4-8ea3-e4bb61092d1c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.89.98	2025-12-27 02:52:35.189896	\N
5b8a55a5-771f-47f4-a9b8-7e2f656c174d	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.89.98	2025-12-27 02:55:50.023954	209f8105-ffc2-480e-86f5-106f52415ae7
7ee88a55-465c-48d7-8f21-3086b8ccab38	5ed0ccee-d55a-4700-b092-efa7e84a1907	Enabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f enabled for outlet bd279946-8a56-4e2f-8a40-714bdb2574c9	172.31.89.98	2025-12-27 03:03:22.726683	bd279946-8a56-4e2f-8a40-714bdb2574c9:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
427b6f8f-9c71-410f-bb65-15d33aae3fc4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Department	Department	Department deleted	172.31.89.98	2025-12-27 03:17:58.58378	8ef0f287-556b-4228-b49e-db98218b8295
4ded2d96-7ede-4a24-a42e-4a014c8bff4d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Enabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f enabled for outlet 30e7c959-e001-45df-8a8b-c160c354fcca	172.31.89.98	2025-12-27 03:18:36.543918	30e7c959-e001-45df-8a8b-c160c354fcca:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
302b7e5e-e504-4beb-b627-043fdfd32ccb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f disabled for outlet 30e7c959-e001-45df-8a8b-c160c354fcca	172.31.89.98	2025-12-27 03:18:37.583045	30e7c959-e001-45df-8a8b-c160c354fcca:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
51d2fffa-6cdb-4e81-a043-2a84304ea1f4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Enabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f enabled for outlet 30e7c959-e001-45df-8a8b-c160c354fcca	172.31.89.98	2025-12-27 03:18:40.596632	30e7c959-e001-45df-8a8b-c160c354fcca:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
94499567-e5c7-415a-ab55-3c1de5adb3dd	5ed0ccee-d55a-4700-b092-efa7e84a1907	Enabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f enabled for outlet c3091f91-dcec-4cee-b3ba-ab7c04ff5657	172.31.89.98	2025-12-27 03:18:46.210139	c3091f91-dcec-4cee-b3ba-ab7c04ff5657:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
29466ed2-b1da-4ab9-adc9-5e118ac3dace	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Client Department	Department	New client-level department added: FRONT DESK	172.31.89.98	2025-12-27 03:22:33.161088	1b2a1e08-a1e9-4a4d-addf-b5bed4e3bd1c
0ce24c70-e4d6-4ad3-8cca-3dcd875df947	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 1b2a1e08-a1e9-4a4d-addf-b5bed4e3bd1c disabled for outlet 30e7c959-e001-45df-8a8b-c160c354fcca	172.31.89.98	2025-12-27 03:23:18.572095	30e7c959-e001-45df-8a8b-c160c354fcca:1b2a1e08-a1e9-4a4d-addf-b5bed4e3bd1c
7e070710-e0ea-4248-83df-bb29736970de	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 295ef96f-f7bb-4ed8-9026-6ad28c70cf0f disabled for outlet bd279946-8a56-4e2f-8a40-714bdb2574c9	172.31.89.98	2025-12-27 03:24:34.719516	bd279946-8a56-4e2f-8a40-714bdb2574c9:295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
58ec8fbb-8026-454b-8aa7-f35ec925db7c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 1b2a1e08-a1e9-4a4d-addf-b5bed4e3bd1c disabled for outlet bd279946-8a56-4e2f-8a40-714bdb2574c9	172.31.89.98	2025-12-27 03:24:36.871682	bd279946-8a56-4e2f-8a40-714bdb2574c9:1b2a1e08-a1e9-4a4d-addf-b5bed4e3bd1c
5e5a180e-a498-4559-9831-21f4b9b341fa	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Outlet	Outlet	New outlet added: Grilling	172.31.89.98	2025-12-27 03:25:09.911976	caa9c065-f185-45af-bd53-4dc98fad932a
650207aa-1800-4f8c-90c0-6c524d99db7b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Disabled Department for Outlet	OutletDepartmentLink	Department 1b2a1e08-a1e9-4a4d-addf-b5bed4e3bd1c disabled for outlet caa9c065-f185-45af-bd53-4dc98fad932a	172.31.89.98	2025-12-27 03:25:53.364351	caa9c065-f185-45af-bd53-4dc98fad932a:1b2a1e08-a1e9-4a4d-addf-b5bed4e3bd1c
d9b44ed9-013f-470a-b649-20ce7e61bfc8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.89.98	2025-12-27 04:53:23.171895	\N
b361014a-6b71-41d4-81f7-3d1e635f2e32	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Department	Department	Department deleted	172.31.89.98	2025-12-27 04:56:54.463878	295ef96f-f7bb-4ed8-9026-6ad28c70cf0f
b07e57fa-6af8-42bc-9dc9-c1d21e793761	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Department	Department	Department deleted	172.31.89.98	2025-12-27 04:56:59.966954	1b2a1e08-a1e9-4a4d-addf-b5bed4e3bd1c
8790e589-f9d4-472d-b950-25bf0c690d46	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Category	Category	New category added: F&B	172.31.89.98	2025-12-27 04:57:27.962655	a6787752-fac5-43a1-8f72-039e4105a57a
3fdd2bd6-8c49-47c2-b294-c7cfcc3517d5	\N	Login Failed	Session	Failed login attempt for: Admin	172.31.89.98	2025-12-27 05:02:11.545088	\N
788afb6b-52a5-4017-863d-615e69d0f000	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.89.98	2025-12-27 05:02:23.009627	\N
b849bd4a-94ed-4daa-a09b-d9d32a9029ea	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.89.98	2025-12-27 05:03:37.739035	\N
717486a0-431d-40d6-bd80-afa8784e971e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.89.98	2025-12-27 05:03:48.800783	\N
7c052c01-1751-4506-beab-f3c51e3eae07	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.89.98	2025-12-27 05:03:56.193119	\N
a927300d-2382-405d-8118-6fe9d56b38ce	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.89.98	2025-12-27 05:53:59.984246	f5284b4a-d7e5-4312-8893-7c5cbd29de49
35c2a700-2441-4559-a789-28305634776b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.89.98	2025-12-27 06:21:47.585328	\N
eacd8b71-7df6-4c7c-b31e-8baa75e05e7d	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.89.98	2025-12-27 06:22:25.718598	8f82d3c8-8574-469a-9425-f57d5c669aca
f0a7ba8e-14b5-4e92-b205-36f668bde78a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 06:48:17.761438	\N
6a16eb34-bec1-4d04-adf1-4ab5e0398be4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 07:39:16.216483	\N
7faeb395-5b63-4195-b67e-11ba91b86bb2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.90.2	2025-12-27 07:42:01.385423	\N
5dec2c0b-39f2-4ede-bdd1-91842e59191e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 07:42:04.354178	\N
f4d2dfd1-d21e-437e-aa82-457fc4e5f4a5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 07:55:50.917373	\N
b2ee56ce-46fe-4af9-b49d-97e888497305	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 08:07:06.964115	\N
dda308eb-4059-4666-b42e-ed1e05bf5f77	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 08:14:29.539605	\N
9db93d11-459a-410b-a4c4-cd7c7ab9ec8d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 08:23:16.328011	\N
16f21e26-f0bc-4b02-9525-8985f2e1db3c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 08:44:47.353238	\N
56c4b691-b6a4-493e-881f-65659051b291	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.90.2	2025-12-27 08:46:43.554545	e9e7138a-1c94-4802-95ec-18e19652badd
0bcbc422-2178-4c0f-b7e9-67b2d4d15f47	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.90.2	2025-12-27 08:47:28.859257	b6b8a01f-ae2c-4227-a36a-e51c963d9ff3
60f582c4-9755-4328-9c87-b123cb84c0e4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.90.2	2025-12-27 08:55:27.963037	2444e8cd-71de-4718-ad1a-c14615b7027d
39964db0-9ac6-470d-bbc2-89df13b7f726	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Chicken	172.31.90.2	2025-12-27 08:57:49.528405	a776527f-6866-48f6-81d5-14083d945edb
ec066338-4203-47d5-acb6-2faad02afef0	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 09:06:28.714824	\N
8f609044-f4d0-4fda-8690-51dca63f2b8c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 09:12:45.282268	\N
913a70b9-623a-4341-b7be-bf09a73eab06	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.90.2	2025-12-27 09:20:41.673732	\N
97f3d6f3-f851-4096-a15a-bd75d21a275f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Supplier	Supplier	New supplier added: Store	172.31.90.2	2025-12-27 09:22:46.633969	ea1b27ba-f514-4963-8f6a-21c43afd4a60
e448493d-866f-46de-8bc6-7db1061967b6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.91.34	2025-12-27 11:29:14.407906	\N
897d9634-963e-4bcd-bc2d-d87d224d6734	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.91.34	2025-12-27 12:42:49.108814	\N
fa27bcde-4b3f-4baf-8158-52807dff475a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.75.162	2025-12-27 17:44:42.902606	\N
e169c900-6faf-4dd5-8bf1-a5fcaa8eef58	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.75.162	2025-12-27 18:05:33.445159	\N
3cad2ad6-ca08-4b97-a5dc-c219032d4d12	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.75.162	2025-12-27 18:05:37.773536	\N
c13c6a3c-9bae-4ebb-8b5a-3b1555e7c552	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 18:07:23.40827	d14aeef2-d941-46a0-83aa-60323131bcaf
fb6e5edb-7d42-4122-9794-29ce3e46f087	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 18:07:48.674583	d14aeef2-d941-46a0-83aa-60323131bcaf
d29f4a42-269a-4695-9730-d7f584239946	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 18:08:01.657767	d14aeef2-d941-46a0-83aa-60323131bcaf
3bfbe9fe-3b2f-4116-a0ae-817be853f02b	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 18:08:25.961763	1a25be9b-3ffe-486e-a09c-a0a5d7c76f5a
a27f996a-c023-46d9-8b6c-a31ea1350016	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 18:08:37.564676	1a25be9b-3ffe-486e-a09c-a0a5d7c76f5a
7595d0a0-1597-4ad3-a741-d8e53b4af971	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 18:09:03.127691	d14aeef2-d941-46a0-83aa-60323131bcaf
d9813c61-51fe-4602-b2d9-10f3a937083b	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 18:09:24.833245	1a25be9b-3ffe-486e-a09c-a0a5d7c76f5a
05a50b4c-34c1-4a53-808f-732a33cfa994	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 18:09:44.609669	d14aeef2-d941-46a0-83aa-60323131bcaf
209da595-196f-40ed-999c-00a212b695c9	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.75.162	2025-12-27 18:15:55.393099	\N
eb7ba320-22db-48b4-a755-8cb7e515571a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.75.162	2025-12-27 18:16:36.548228	25ac3569-f934-40a4-af80-5adca69fd03a
6c5af8f8-3345-4592-944d-e0a674ce2e73	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.75.162	2025-12-27 18:58:30.263496	\N
f708fbef-428c-4669-8aba-77604a90e193	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.75.162	2025-12-27 19:01:07.305252	\N
6366401b-bd12-4cb9-b4f7-fc86841006a7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.75.162	2025-12-27 19:02:53.181648	bf8bc256-4187-442a-84b8-aabfc7cfdf03
8df8397d-1aba-45d5-a952-352c0b48be13	5ed0ccee-d55a-4700-b092-efa7e84a1907	Updated Exception	EXC-20251226-002	Exception status: resolved	172.31.75.162	2025-12-27 19:20:02.282859	ac867377-b1be-4924-b6a3-57fde4529d70
2e8ac26c-e473-4635-95fa-fbdc98a09db3	5ed0ccee-d55a-4700-b092-efa7e84a1907	Updated Exception	EXC-20251226-002	Exception status: investigating	172.31.75.162	2025-12-27 19:20:06.533775	ac867377-b1be-4924-b6a3-57fde4529d70
cba28058-8ba0-474c-9acd-1e195450e432	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Cocoa	172.31.75.162	2025-12-27 19:21:51.617515	0eaccea0-5812-4969-a816-bda98bc7f1a8
7f19ba19-2584-49b1-a601-58c5550a0d6a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: fanta	172.31.75.162	2025-12-27 19:29:37.477322	452e403d-ba81-4c79-934a-aa2f4102fc04
98066b8b-552d-43b8-83d8-6776826d42c7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Spirite	172.31.75.162	2025-12-27 19:30:24.362431	4d2e8487-24cd-4808-8599-ea3ab578ea82
83468326-7f79-4e0b-a8a9-419378108970	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Beef	172.31.75.162	2025-12-27 19:36:18.471261	a287c5f7-986d-46da-b030-addf085012c2
782200a1-f274-44a5-bf79-aa1d7804debb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Turkey	172.31.75.162	2025-12-27 19:36:55.949563	9131ca60-2d11-4d1b-bd8e-6be75a6a51c0
3a933d19-cbc6-4d59-9793-8a4155a9c336	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.75.162	2025-12-27 19:46:03.277038	\N
4983600d-8683-4c7e-9bce-7fdc2e79e43f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.75.162	2025-12-27 20:12:19.165614	\N
6a1300df-1f33-4011-92c7-444893571665	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 20:12:55.4902	d14aeef2-d941-46a0-83aa-60323131bcaf
6ecf11d0-277c-46d9-9b12-4bbc054c7fbd	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.75.162	2025-12-27 20:22:45.300219	\N
da766943-06aa-4bc5-a4ee-90b8172733c2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Store issue created for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 20:24:58.03277	1c28b670-dd9d-4e4a-aa48-f786855bd5bb
9618e877-3c18-4c6e-9413-ce550f413ba2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Store issue created for Sat Dec 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.75.162	2025-12-27 20:29:31.465093	8dbe2313-59f3-4952-863b-0d201a53a4fd
eb4a0be9-eade-4685-aa1c-cf62a8bbcdd9	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.75.162	2025-12-27 21:04:45.473151	\N
76ad1ac6-cae2-4cb3-aff0-6a15041e2385	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.75.162	2025-12-27 22:04:49.1169	\N
b0b41b08-04ce-4111-b44a-2c652e8a5b87	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.75.162	2025-12-27 23:11:42.232758	5f92ccdb-b14e-47d5-b89c-6f07c507e7db
0fa24ccb-c122-45a1-aaa5-bb76dd0fab26	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-28 02:58:05.705512	\N
04ca81d9-0250-4247-94c1-78d78ad68c0c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-28 03:31:03.276982	\N
530202f5-39be-434d-9a82-d72ee3c42fd8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Supplier	Supplier	New supplier added: Edmond Global resources Ltd	172.31.68.226	2025-12-28 04:45:35.239359	3b37bf2b-9563-456a-950b-a2453c851f3a
096d5199-fac1-4542-bc5a-ec1eda1ea854	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Cirok	172.31.68.226	2025-12-28 05:45:03.748022	34df2f81-dc5e-4e72-983a-2fe1465305ce
3892fa36-bd28-43e7-a98e-b70fa92bda86	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 06:26:03.834861	\N
f06ed962-3964-4d4a-bcf7-15211e94ebd1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 06:40:23.915213	\N
527a977d-ead0-4eb1-809e-2a185af29c3b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Rice	172.31.88.194	2025-12-28 06:42:21.211768	76f50a81-f36f-4108-b97d-b00f62a29f20
eeafb2e4-8c84-47de-af58-bba7d76e85de	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 07:02:46.681594	\N
a9d5c6d4-d9d3-42f3-a1bc-78982f2928ea	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 07:23:43.898301	\N
b44e7574-477a-42a8-9d25-a8bef28956dc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created GRN	GoodsReceivedNote	Invoice: Ed246, Amount: 120000.00	172.31.88.194	2025-12-28 07:28:04.548943	e2d8fd86-1613-443e-9d50-d841d0024a45
b68de33b-d197-4437-83bf-73b655c5e4b0	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created GRN	GoodsReceivedNote	Invoice: WSG234, Amount: 200000.00	172.31.88.194	2025-12-28 07:29:04.948384	f7388c2b-b8e5-49fa-9500-c758e35af098
ab2eb677-2d57-4cfe-aca7-1800da8ebe44	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 07:40:15.673388	\N
d91b9bd3-4286-4d1a-b8ad-b886a718b6a2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created GRN	GoodsReceivedNote	Invoice: Ed246, Amount: 30000.00	172.31.88.194	2025-12-28 07:41:10.093111	99658a47-7573-4ceb-bf0f-eba833221987
98afac73-e2f5-48fa-934f-ab0415dcc0e0	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Sun Dec 28 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.88.194	2025-12-28 07:42:10.72269	c0c38588-b255-46bb-b99a-277ebfa337f2
c669fa1a-08e1-4985-b4e7-003e155f7055	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 07:54:12.314794	\N
87b13e3d-6904-4d83-8425-bf42e67feef4	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Sun Dec 28 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.88.194	2025-12-28 07:54:41.963616	06d8c079-2398-488d-ac02-5f039094e1ac
76f01b57-e342-445a-b8eb-b6e2d8cc6f91	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.88.194	2025-12-28 08:52:54.586406	\N
745f852a-5718-431c-95a9-b6f8f6bfd8af	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 08:53:01.869298	\N
555afb19-3a04-46c4-b949-318cc5aa263f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 09:05:26.788781	\N
6e1bb4b4-30de-43c1-8b2c-003a9125420b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 09:26:24.695391	\N
1a72885e-7e86-4ee3-aa6a-7a476fb71d91	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: fanta	172.31.88.194	2025-12-28 09:31:10.012217	a6ca6bae-d6ad-488d-9a85-8f9c3eabe7dd
e635fa9d-0677-4158-8e12-ff5a57902fc0	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 09:52:55.425685	\N
040b5c8d-a5b0-45c4-8c9d-bdf0c5490c15	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 10:03:46.634874	\N
c5bac268-33ff-461c-8df7-3988ce51f1e5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: fanta	172.31.88.194	2025-12-28 10:04:27.878897	2f5b7a18-9345-43b9-a90a-b72b50d68205
8d4b7a6e-b33a-49e5-987b-bdd8bdc02a21	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 10:10:44.151303	\N
b40b9195-4103-4368-933c-8a6421bb3e5a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 50 25 captured for 1 store(s)	172.31.88.194	2025-12-28 10:11:55.554842	a6ca6bae-d6ad-488d-9a85-8f9c3eabe7dd
db21c202-95e4-46cc-9b61-d9deb7cdb56c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: malt	172.31.88.194	2025-12-28 10:12:48.74832	526f1f1f-7d83-4776-a496-e758c5bd09d8
faebf4f4-718f-4095-865c-571c618a8479	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 80 60 captured for 1 store(s)	172.31.88.194	2025-12-28 10:13:50.372307	526f1f1f-7d83-4776-a496-e758c5bd09d8
9e0cbdce-4c1c-4358-b9d4-2777c7472618	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 10:24:48.375457	\N
ea1d3b00-6dfd-4cb7-8569-a4f9e397b9da	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 100 60 posted to: Main Store	172.31.88.194	2025-12-28 10:25:16.982274	526f1f1f-7d83-4776-a496-e758c5bd09d8
a56fbbf5-f216-488d-bfd3-dc7d7eb73d77	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 10:52:06.96235	\N
beeb659c-8d86-4ac8-86e4-c0b490aeb8df	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 11:09:55.928258	\N
2d8fb7dd-a3fa-4919-a2c1-f9dfd432854f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.88.194	2025-12-28 11:15:46.568809	\N
cf47e0f1-db29-4f00-9962-7cb51ebf871e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.77.34	2025-12-28 11:17:31.857841	\N
8aa2b380-2ae1-4016-8436-9fc314769597	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 11:18:40.702468	\N
33c28e61-6d12-418d-94c4-1e816dce0b80	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 200 60 posted to Main Store SRD	172.31.77.34	2025-12-28 11:19:00.402097	526f1f1f-7d83-4776-a496-e758c5bd09d8
b227fdde-8212-4ed6-90b1-f584cca83979	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 70 60 posted to Main Store SRD	172.31.77.34	2025-12-28 11:45:24.44013	526f1f1f-7d83-4776-a496-e758c5bd09d8
c273541c-a268-4a39-a1e3-8f72c1c3763b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 12:30:49.170941	\N
2904fe9b-beae-49d1-b793-c1d20e843db8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.77.34	2025-12-28 13:53:41.383979	1548a178-3eab-4f71-9ea1-d1e2ec1f9f46
7135acc1-1795-4b21-a9b4-06be96ba8930	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.77.34	2025-12-28 13:55:35.665504	7a18bbeb-2b08-441d-888c-3d3adb02ec82
fc60e0bb-fb1a-41ab-b935-119624dccb10	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 13:58:38.820116	\N
5dd6ecf9-2d47-4a86-a1c9-702135eef8f6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 14:26:05.430778	\N
95b5bc55-891a-4fd7-8668-0f76a597f4ba	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 14:55:25.472715	\N
a740d5f2-4ca2-4a56-bc47-702c953b28e5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 15:05:51.742439	\N
d66e560f-d388-40a9-97c2-0ad5370aaf5f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.77.34	2025-12-28 15:06:46.109545	7645c3a3-6d2a-4de3-a4b5-abdbc79b3d61
c89cd46f-d3f0-4564-a9cd-4f45e9809eed	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.77.34	2025-12-28 15:07:31.488206	1ef13c31-c5aa-4942-9bb6-2bb68c6e55b3
a36ca938-776f-41a3-8c0a-bd1016378026	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.77.34	2025-12-28 15:19:29.018468	d48fe5dc-086e-404d-96dc-594130293089
527ac118-168b-4633-82bc-c2b2a615a796	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 15:21:22.8584	\N
c875fa1c-bd1f-411c-8fdd-db44fd0e639d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to fd666e2e-2de8-4b34-8687-9d45c75a85c3, 1 item(s)	172.31.77.34	2025-12-28 15:36:00.575202	40ba1cd5-aeee-4456-9ee5-eae07651b255
f7bfa00f-069f-4220-a168-9f71eb94cffa	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 78721483-0a9f-4e27-9e4f-30fc9f848485, 1 item(s)	172.31.77.34	2025-12-28 15:37:17.954752	8dac7909-9086-4961-8a4f-1ec935c4ce5b
d6c691ae-9707-43b4-b297-361d8ed3bed9	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.77.34	2025-12-28 16:00:15.527995	\N
d3766494-4932-4108-a834-7a11d6f2a439	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 16:11:31.271641	\N
57024d3d-b57b-4988-8079-59b5b5a1a2ff	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to fd666e2e-2de8-4b34-8687-9d45c75a85c3, 1 item(s)	172.31.77.34	2025-12-28 16:20:37.277346	f6b5587c-e192-4417-8ce6-4cfdd1034265
11b8830b-9b66-475f-9dcb-06628f876d7c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 78721483-0a9f-4e27-9e4f-30fc9f848485, 1 item(s)	172.31.77.34	2025-12-28 16:20:51.002997	eec8334e-84b3-4729-bebe-6fa697510c93
3be0d6f3-dac5-4270-888c-6a65d45eff35	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 78721483-0a9f-4e27-9e4f-30fc9f848485, 1 item(s)	172.31.77.34	2025-12-28 16:29:08.489709	3c2c0d4b-a8dd-49e1-b48f-394cfccc6408
3f2bc640-9ad4-4bcb-90de-f3b11ef760f2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 17:25:37.034186	\N
41db0f5d-51dd-4491-b890-bcf33d24fd40	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 17:41:15.94187	\N
25952cbf-8b01-4e71-97a9-d493fc6c2be6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.77.34	2025-12-28 17:57:18.699551	\N
dfb1b2c9-cc60-43ce-b445-e8d9eb1c6b17	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.77.34	2025-12-28 17:59:24.45813	27b2edb8-b118-45c3-85f1-66c979aaaf5a
b64a4036-b464-4823-a834-83b349be311d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.77.34	2025-12-28 18:01:20.627395	f8176081-c330-444e-960b-50545caa83da
d5c941cd-36c6-4215-95de-1d8366b06306	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.107.130	2025-12-29 01:35:30.020461	\N
4dbdfa80-3525-45f4-8822-769cce35b8b8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.107.130	2025-12-29 01:36:11.159053	\N
0c9bfaf0-dabd-4337-91cb-68a87bbbcce7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.107.130	2025-12-29 02:25:27.224146	\N
53401699-ae7f-49fc-994d-44a2e661b36d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.107.130	2025-12-29 02:38:36.53571	\N
56862bd0-ce63-48e8-a007-b305237fdcc3	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 02:44:41.797918	3d5ce852-ff48-4a04-9b8a-22d552c139e0
f8bb387e-9dc0-441a-953a-186d08553d55	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sun Dec 28 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.107.130	2025-12-29 04:22:20.659659	06d8c079-2398-488d-ac02-5f039094e1ac
5de1c709-46b5-4cce-9f41-600e1a756bf9	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Sun Dec 28 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.107.130	2025-12-29 04:22:38.605416	06d8c079-2398-488d-ac02-5f039094e1ac
be61e477-6653-493e-bdb0-52dd9d385db8	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Sun Dec 28 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.107.130	2025-12-29 04:25:02.817967	59fdad1a-0087-44af-b85f-f4290b26eb08
46d75eb9-d0bd-47be-bbc6-6f53121aedad	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.107.130	2025-12-29 04:30:28.430735	648763c6-dad2-4295-92b1-b35f8beaeebf
4bb07a0c-bdda-4e84-937d-e6f7b36fbc47	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Mon Dec 29 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.107.130	2025-12-29 04:41:59.19698	fbf40bfe-6f76-4b06-b9c7-36ceebebbac8
8f9a3172-cb8b-4223-959c-4bc51f1560fc	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Mon Dec 29 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.107.130	2025-12-29 05:22:08.0029	fbf40bfe-6f76-4b06-b9c7-36ceebebbac8
014aa655-dd0d-4143-878f-5f9dfc0634a4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 05:29:33.794703	6551fdd3-5b8a-4b35-906b-8ef7d139dbb5
5bd83418-3d10-4318-a57c-2ce331b56ba6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.107.130	2025-12-29 05:46:01.267033	\N
62093ec2-3eaa-486a-a52f-d0963ddea104	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 05:47:06.964577	6551fdd3-5b8a-4b35-906b-8ef7d139dbb5
9cc740bd-0c5d-447f-a9af-62823a21dfd7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 05:50:30.21247	acdc1c49-fa98-4ce1-aaa1-9b4be3e67fa7
77662f4e-6f7a-4a55-b6e9-66fbe69ceaac	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 05:50:43.181614	acdc1c49-fa98-4ce1-aaa1-9b4be3e67fa7
30f92892-4b33-4f1b-8f2e-157e0e84017e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 05:50:55.950342	d414bd2a-5b07-41db-a243-c844bb1b8b08
16839cb0-0677-4391-9e82-4a4472dfc51d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 05:51:06.149884	d414bd2a-5b07-41db-a243-c844bb1b8b08
6f98bef1-cbc1-4709-930e-0db7cab35351	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 05:51:18.082518	12c6ce7e-4820-4e2b-972c-3cb96956837e
55cb3357-7e09-48aa-a2ab-7305a40f8092	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 05:52:24.631074	2eaf6c79-5750-4f6a-bf93-c57897517d6d
72708319-f512-4e2a-88c1-7db7db79e44c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:53:53.286327	2f5b7a18-9345-43b9-a90a-b72b50d68205
cd95034d-9101-4276-871d-08a5535cf9dc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:53:56.73086	34df2f81-dc5e-4e72-983a-2fe1465305ce
21f9d86c-a034-493b-8617-4f3f4e4ab81e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:01.626697	9131ca60-2d11-4d1b-bd8e-6be75a6a51c0
c63852c9-6d66-4de8-b2ee-eb22f415b8c7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:07.254851	a287c5f7-986d-46da-b030-addf085012c2
00b72464-cfa9-421e-bffd-a27a80c18195	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:13.498603	4d2e8487-24cd-4808-8599-ea3ab578ea82
1aec8925-97e3-4100-8f02-815e4587e627	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:17.152598	452e403d-ba81-4c79-934a-aa2f4102fc04
d9aeac7e-06ac-44c2-8de9-5e6b879ecdec	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:22.202615	0eaccea0-5812-4969-a816-bda98bc7f1a8
bd148f77-fdf8-4cab-854e-4b24872db3e4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:26.678219	a776527f-6866-48f6-81d5-14083d945edb
7975df74-a604-4c7b-91c1-58cb6b795c41	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:32.881982	526f1f1f-7d83-4776-a496-e758c5bd09d8
88109259-6cdb-4868-af7b-dc83828f07d8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:36.433457	a6ca6bae-d6ad-488d-9a85-8f9c3eabe7dd
f867b20c-5d77-4730-a500-877d923b7b27	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.107.130	2025-12-29 05:54:39.929558	76f50a81-f36f-4108-b97d-b00f62a29f20
e5275c66-4266-4528-95a9-5e0ad99aac6d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Rice	172.31.107.130	2025-12-29 05:55:27.046788	70692a6e-cc23-4529-9d05-cdebacb4c7de
0d025a57-f002-47c6-91b8-58ddf093d66e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 05:58:18.30757	c0bac2e0-0db1-4402-8c62-7081a649ee12
c52fc031-56c0-471a-9b0a-cf388eaa0c99	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 05:58:49.613754	fbc19936-de49-42fe-b977-b00515de60a8
fc04294a-080b-45fc-be19-ca7e3b67aafc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 05:59:28.40332	60abffa1-385c-4902-bc8d-29f0482eb2b2
cdbfa16a-a4f3-474f-a6fc-048373f02b4e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.107.130	2025-12-29 06:01:02.419911	150b643f-07db-46c5-81d6-c8f68a6a2b97
94e2e029-7957-4537-a725-31d30a745a7d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:02:11.022724	2eaf6c79-5750-4f6a-bf93-c57897517d6d
65542cb2-ab28-44cf-802f-65ab71945845	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:02:17.620857	12c6ce7e-4820-4e2b-972c-3cb96956837e
30a7b96a-fc4a-4a30-abf7-51b1eeb60acb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:02:22.393748	c0bac2e0-0db1-4402-8c62-7081a649ee12
bdfbbb64-616b-4e8f-8671-69b989bbc630	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 78721483-0a9f-4e27-9e4f-30fc9f848485 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:02:52.132167	8dac7909-9086-4961-8a4f-1ec935c4ce5b
1839f17d-bcb9-4bcd-ab5e-9195b4fa655f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from fd666e2e-2de8-4b34-8687-9d45c75a85c3 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:02:53.632993	40ba1cd5-aeee-4456-9ee5-eae07651b255
7718300f-e4ed-4081-961a-f2f6f44696de	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:02:55.367083	d48fe5dc-086e-404d-96dc-594130293089
17b6e950-c640-4921-adc2-8f0a161da6c5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:02:57.473662	fbc19936-de49-42fe-b977-b00515de60a8
51aa6d21-fbf4-4276-945c-57b86feadaf6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:02:59.828612	1ef13c31-c5aa-4942-9bb6-2bb68c6e55b3
cca362a5-1206-433f-81cd-27022148dd2f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:03:00.888183	7645c3a3-6d2a-4de3-a4b5-abdbc79b3d61
fec9f2f7-90a3-4eb5-af22-3888414defe6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.107.130	2025-12-29 06:03:03.843726	1548a178-3eab-4f71-9ea1-d1e2ec1f9f46
91be7879-b307-4f85-91e0-5363b71f3389	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.72.226	2025-12-29 08:42:59.954333	\N
42d8b046-7324-4798-a91d-acf2d3af6972	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 12:40:32.171356	\N
b347ced1-5643-416e-a224-bd84708047f2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 78721483-0a9f-4e27-9e4f-30fc9f848485 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 12:42:25.058707	3c2c0d4b-a8dd-49e1-b48f-394cfccc6408
ed0007c4-4d3e-4f46-ab0f-f658235e92e2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 78721483-0a9f-4e27-9e4f-30fc9f848485 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 12:42:27.418797	eec8334e-84b3-4729-bebe-6fa697510c93
cd3b7416-ea6f-4f11-a713-250180602e88	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from fd666e2e-2de8-4b34-8687-9d45c75a85c3 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 12:42:29.203307	f6b5587c-e192-4417-8ce6-4cfdd1034265
452b9d72-f801-4c9b-9c95-4c11aa405a49	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 12:42:31.457977	3d5ce852-ff48-4a04-9b8a-22d552c139e0
2b4c1b1d-ddc4-4c6d-b87e-4747ddef3d70	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 12:42:34.990312	7a18bbeb-2b08-441d-888c-3d3adb02ec82
338b7776-ef1d-414a-8df6-40600232d4b2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 12:53:22.586041	60abffa1-385c-4902-bc8d-29f0482eb2b2
66ae9c33-4026-4b19-a5c6-6c92abbbec7b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 12:54:28.035264	150b643f-07db-46c5-81d6-c8f68a6a2b97
a2ec3e11-c74c-45f6-8997-92f47f11011c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.76.194	2025-12-29 12:55:54.681666	70692a6e-cc23-4529-9d05-cdebacb4c7de
a79e3b3c-dfed-4f14-8ec6-4be3bba43cf9	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Rice	172.31.76.194	2025-12-29 12:56:29.510401	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7
91fed221-4a99-4554-87a4-a8cbf8658bd6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.76.194	2025-12-29 12:58:03.730397	3bb92c6d-6604-42ac-91e7-1747de843774
ef62f2a3-7c22-4cbb-a2e0-69b0b5b76c87	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 12:59:13.745259	3bb92c6d-6604-42ac-91e7-1747de843774
99258265-4b9b-4ec4-8ac8-9b79928782bd	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.76.194	2025-12-29 12:59:47.671518	41136898-7ad4-433d-a280-2d4e2a665506
04fc0e13-30d0-48cc-b6f5-2556f639c3ce	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 13:00:37.555186	41136898-7ad4-433d-a280-2d4e2a665506
2cf3cf35-1bf2-46e4-9c62-bffebad555d5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.76.194	2025-12-29 13:01:00.592391	a058b216-ed37-4b51-b70a-53b204fffa66
95aecfe3-4852-483d-930e-27f3c58a2d2c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.76.194	2025-12-29 13:01:16.237972	1179cc57-fad0-4be5-95d7-1aee500f3efd
1842d6ad-b6eb-4413-a233-cf0ae556a4c3	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.76.194	2025-12-29 13:01:36.062808	d2c1fd7d-33b4-4c9c-904d-d1c566c20885
1c594ef3-528f-43d0-b00f-56831d5b5e7e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 13:02:39.090119	1179cc57-fad0-4be5-95d7-1aee500f3efd
7f9917fa-d899-4745-8d71-63909da0e284	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.76.194	2025-12-29 13:03:18.498465	78dc80ea-423d-4e17-8ade-fcde6f1715da
a7bc13ad-3527-4444-9c7a-a6ea92f5776c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.76.194	2025-12-29 13:05:07.903875	\N
22943d88-3417-44e2-85a8-4789a78e3fa8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (2/5)	172.31.76.194	2025-12-29 13:06:26.226889	\N
57c1c4ad-f0e5-4564-aa27-3d23d489ed6f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 13:06:40.49785	\N
3baad93f-a9ab-4aa9-a68a-9c666b1c7aa4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.76.194	2025-12-29 13:10:53.799284	59e18f7c-c0a1-4d29-914c-be972ad5d3d8
d887f947-7115-495c-a328-5be885b99c55	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from 2ce2d797-64c0-48a4-9e3b-03fd62786195 back to bd22d458-81ba-414f-bcdb-4e047e7ab1c6	172.31.76.194	2025-12-29 13:11:26.1816	78dc80ea-423d-4e17-8ade-fcde6f1715da
d551a1b0-ea86-4d4e-934a-c2f2914f9b03	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.76.194	2025-12-29 13:35:39.310057	\N
ffb80887-8c95-4189-b5e0-68df1cdc404a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 13:35:44.073775	\N
15f9b03f-8ef6-4c8d-966d-fa3e2652c1a1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created GRN	GoodsReceivedNote	Invoice: wws32, Amount: 20000.00	172.31.76.194	2025-12-29 13:38:18.431718	57b71438-9d0c-413c-b645-977f30bb39a4
1c6c64e5-52a8-41f2-bc68-4e2fda143b08	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to 2ce2d797-64c0-48a4-9e3b-03fd62786195, 1 item(s)	172.31.76.194	2025-12-29 14:42:14.047796	7fbbd59b-59e6-4984-8a7a-937a2cbbb191
f518af02-6972-4607-811a-209bbfbf4b93	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.76.194	2025-12-29 14:46:50.29253	d54b4d95-41e1-4a98-8869-7846e9953898
ee550352-21fa-462b-83e0-2360d0a53293	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 15:00:41.161221	\N
5bd1f654-8614-4fe5-be5d-61de44795004	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.76.194	2025-12-29 15:12:46.372366	76871c03-37b1-459b-988d-cbcd4342b1f4
bd8a2d4e-62d1-4199-9204-1f97a1afd9b5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 15:34:29.939004	\N
fc0bedf2-5fa6-433b-9bc5-0b5e3fad8c7a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 15:45:40.328612	\N
8ddf2c90-b885-4037-887b-6c3c9f4672cc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 15:53:54.658812	\N
a44be8a0-38f2-456b-9f70-bd5ed4b25698	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 15:58:24.205224	\N
536348ff-77f3-4ac4-b9ba-4fb438358c82	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Mon Dec 29 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.76.194	2025-12-29 15:59:47.501626	fbf40bfe-6f76-4b06-b9c7-36ceebebbac8
e2982c29-2663-45d6-b657-949933b148d0	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Chicken	172.31.76.194	2025-12-29 16:02:41.641549	d24028d5-7172-4fa4-a16a-e96a21e92c62
73bb0a71-5839-4d01-9725-76318456311b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: malt	172.31.76.194	2025-12-29 16:03:39.545968	4f95bc96-08b8-4aad-9f1a-b88a0b211f33
615c1219-f198-4123-a134-3c71fe6b50df	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to fd666e2e-2de8-4b34-8687-9d45c75a85c3, 1 item(s)	172.31.76.194	2025-12-29 16:05:50.300163	82bf0ca4-5cd6-4098-99ff-e2a5c9733158
cca89d3b-2257-40c7-a60e-36ba1f5fc4a0	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to fd666e2e-2de8-4b34-8687-9d45c75a85c3, 1 item(s)	172.31.76.194	2025-12-29 16:06:47.629583	373f6b80-cd24-4bda-8dbb-c4687117193b
ab331812-7755-4ee5-9a81-7910ec34acea	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 16:24:28.671357	\N
a5e3d622-5406-4039-86c8-0277bc5fa27c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.76.194	2025-12-29 16:27:36.348104	3bb3b0b3-c632-430d-83b7-a38797798526
923952e6-3572-40af-b4f7-7bca2736f28a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.76.194	2025-12-29 16:36:17.769906	e29fb675-1cda-4212-8830-beab067b980f
b95d9153-55cd-4f5c-b31e-2985e219d576	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.76.194	2025-12-29 17:08:34.211157	\N
c5d7360d-76b1-4e27-92fc-7c388b07b892	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.194	2025-12-29 17:56:26.911804	\N
ea7c5604-7ea4-4350-94a3-e9b341c10077	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.194	2025-12-29 18:07:23.598248	\N
383c074e-4c24-4eb8-a20e-6901924d8b44	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 5000 4 posted to Main Store SRD for 2025-12-29	172.31.98.194	2025-12-29 18:08:00.481405	d24028d5-7172-4fa4-a16a-e96a21e92c62
c8ebfaa0-9b4a-46f7-bb9c-25429bd89cbc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 200 12 posted to Main Store SRD for 2025-12-29	172.31.98.194	2025-12-29 18:13:54.420041	4f95bc96-08b8-4aad-9f1a-b88a0b211f33
8e71e00f-96fa-4884-a2f3-774b2ea7ef84	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.98.194	2025-12-29 18:48:32.214057	\N
3fb7e661-e393-46f2-8f9e-33b5cb28de97	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.98.194	2025-12-29 18:48:50.769857	\N
cbb4e98b-3687-4a6f-a129-4723d7086caf	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Category	Category	New category added: FRESH FRUIT	172.31.98.194	2025-12-29 18:53:29.272807	44cbb924-2bb5-4c2e-8c86-79f9eb1bb29a
2131a13c-9729-489a-a19d-4125a90a7058	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Category	Category	New category added: COCKTAILS	172.31.98.194	2025-12-29 18:56:35.138541	dd190707-edc4-45b9-b48a-dc9cf2e9bc68
5149d3b8-3d57-4716-a11c-69be24f976b9	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Mon Dec 29 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.98.194	2025-12-29 18:59:17.068925	fbf40bfe-6f76-4b06-b9c7-36ceebebbac8
27719956-a9f4-48d9-b13a-2d90f01d3b56	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from bd22d458-81ba-414f-bcdb-4e047e7ab1c6 to fd666e2e-2de8-4b34-8687-9d45c75a85c3, 1 item(s)	172.31.98.194	2025-12-29 19:03:15.239426	a6dad280-a186-4cff-969e-4c9c7a19e3b8
30b91901-b4a1-48c3-beff-a9a10acc2e7d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.194	2025-12-29 19:29:34.947462	\N
d6a645d0-7cbd-464b-8ae7-b0f4011e413c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.194	2025-12-29 19:31:29.139742	\N
9e893036-a743-454f-b20d-b7d21616f633	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.194	2025-12-29 19:38:34.718135	\N
d254bf97-6a53-495e-8f89-00b95d70a911	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.194	2025-12-29 19:43:05.108067	\N
307f9a1d-fbde-4f35-8f52-3666963a9dc3	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.194	2025-12-29 19:45:16.771192	\N
bddca2ed-4a11-4a3d-85f6-67ddd060fd23	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.194	2025-12-29 19:58:14.458561	\N
4784fac9-64e9-4cfc-b3f3-dbaeef466a0e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.105.66	2025-12-29 21:14:23.363772	\N
2b7bf5d7-10c1-426b-b40e-94cad7ad7eec	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.105.66	2025-12-29 21:27:09.379838	\N
0c64f614-d793-4818-b95d-bd19b274f3ce	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.105.66	2025-12-29 21:38:25.214227	\N
d6c25d82-fa5e-4bf8-a340-b1f6e9d15eeb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (2/5)	172.31.105.66	2025-12-29 21:38:32.604325	\N
09400632-cc6b-485e-8484-53dd885a21da	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.105.66	2025-12-29 21:39:02.860313	\N
47488239-cb3e-446b-a959-d59cd9f0abf6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Orange Juice	172.31.105.66	2025-12-29 21:48:11.477215	9742f35a-ea63-4dff-b74a-a27746417dce
47c3e169-09e0-44c2-a1a2-aa58b391c013	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Water Melon Juice	172.31.105.66	2025-12-29 21:49:26.408396	3315d410-2302-4ff8-8a38-6af5f1bee4ee
03a9fbe4-2103-4401-96af-ad66e091630c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 300 4 posted to Main Store SRD for 2025-12-29	172.31.105.66	2025-12-29 21:54:50.373627	9742f35a-ea63-4dff-b74a-a27746417dce
979b2d72-c679-47bc-9ada-b9020e5e4958	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 250 4 pc posted to Main Store SRD for 2025-12-28	172.31.105.66	2025-12-29 21:55:01.520335	3315d410-2302-4ff8-8a38-6af5f1bee4ee
ae8cfb90-34d8-4d47-b203-56d8d86a401a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: PINIPPLE JUICE	172.31.105.66	2025-12-29 21:56:12.377179	e55abe0b-52ac-487b-9a47-3a83ee61a95d
cb97e147-88e6-4052-a0b5-54fba09be4cc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 300 4 pc posted to Main Store SRD for 2025-12-29	172.31.105.66	2025-12-29 21:56:26.942447	e55abe0b-52ac-487b-9a47-3a83ee61a95d
c0f9fd53-c191-42e5-8119-2ebaaa10d0fe	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 300 4 posted to Main Store SRD for 2025-12-29	172.31.105.66	2025-12-29 22:01:46.092243	9742f35a-ea63-4dff-b74a-a27746417dce
f4b296bd-6208-4617-9ce7-9ce8d8fc8881	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.105.66	2025-12-29 22:11:00.612031	\N
61b5a6f0-1e51-4f88-b51f-5969fb69d197	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 400 4 pc posted to Main Store SRD for 2025-12-29	172.31.105.66	2025-12-29 22:14:56.776714	e55abe0b-52ac-487b-9a47-3a83ee61a95d
54070c76-6292-48c8-91cb-116ddbd07c38	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 200 4 pc posted to Main Store SRD for 2025-12-28	172.31.105.66	2025-12-29 22:15:09.761903	3315d410-2302-4ff8-8a38-6af5f1bee4ee
52174274-5cce-4a5d-af23-c39913f62688	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 250 4 posted to Main Store SRD for 2025-12-29	172.31.105.66	2025-12-29 22:15:19.902631	9742f35a-ea63-4dff-b74a-a27746417dce
e5996c34-6946-44c7-9cb6-73efb2bd6b32	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from 43d27fe4-d8e1-4319-9f6b-7657ce33be4a to b30e98ff-9e99-4f22-b814-cd976d2c9c71, 1 item(s)	172.31.105.66	2025-12-29 22:15:57.893324	62d418e9-e867-44a6-9a8b-1dc0abafdb6f
a34b9c06-efec-4bde-a839-a1ab5a3995f7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from b30e98ff-9e99-4f22-b814-cd976d2c9c71 back to 43d27fe4-d8e1-4319-9f6b-7657ce33be4a	172.31.105.66	2025-12-29 22:16:20.288627	62d418e9-e867-44a6-9a8b-1dc0abafdb6f
3724d780-408f-4d18-8860-88aa6e9d492e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from 43d27fe4-d8e1-4319-9f6b-7657ce33be4a to b30e98ff-9e99-4f22-b814-cd976d2c9c71, 1 item(s)	172.31.105.66	2025-12-29 22:16:38.317625	2ed25f77-486b-42ce-91ae-45b525a47de1
a19c4ea2-99aa-464c-bb66-f741eb16f9cc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from 43d27fe4-d8e1-4319-9f6b-7657ce33be4a to b30e98ff-9e99-4f22-b814-cd976d2c9c71, 1 item(s)	172.31.105.66	2025-12-29 22:17:25.020751	a3734fcd-4e19-4664-8de1-d5fdb514e8f7
2cdc5938-0ba4-48db-9763-314d284c0559	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from 43d27fe4-d8e1-4319-9f6b-7657ce33be4a to b30e98ff-9e99-4f22-b814-cd976d2c9c71, 1 item(s)	172.31.105.66	2025-12-29 22:17:49.841303	5181fe31-ced4-4507-8247-2f245f3e7584
ec2bd66e-7782-4f86-9325-07dae903e530	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created GRN	GoodsReceivedNote	Invoice: WSG234, Amount: 100000.00	172.31.105.66	2025-12-29 22:25:09.706174	72794fb2-15fb-4fd8-a330-813f000adee4
6671b1cb-ed8d-418a-86d7-5d696154faad	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Supplier	Supplier	New supplier added: Samson Enterprise	172.31.105.66	2025-12-29 22:26:12.767922	c765549f-5294-489b-bd2e-5a71595bae99
fcd4f3c2-3d2e-4f3f-aadd-ce6049203242	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Supplier	Supplier	Supplier deleted	172.31.105.66	2025-12-29 22:26:26.719072	c765549f-5294-489b-bd2e-5a71595bae99
5c0772f4-a19b-4113-a364-520fa10a24a2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Supplier	Supplier	New supplier added: Samson Enterprise	172.31.105.66	2025-12-29 22:26:46.317499	bd9a5a84-6231-4101-900a-f5fa11af393b
ea7f1353-fadb-48ce-93bf-b8a109a65055	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.105.66	2025-12-29 22:43:36.40448	\N
f6ec09c1-4ccf-4526-bd19-7f58129ddc9c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Updated GRN	GoodsReceivedNote	Invoice: WSG234	172.31.105.66	2025-12-29 22:47:48.955109	72794fb2-15fb-4fd8-a330-813f000adee4
20d9f194-8b3b-4068-aac9-fa0f5b565987	5ed0ccee-d55a-4700-b092-efa7e84a1907	Updated GRN	GoodsReceivedNote	Invoice: WSG234	172.31.105.66	2025-12-29 22:48:15.409919	72794fb2-15fb-4fd8-a330-813f000adee4
647107ee-8ee3-4605-8b10-28d07c125a60	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.105.66	2025-12-29 23:04:45.94458	\N
df89afd6-0884-426f-8a16-1e15d1d59190	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.105.66	2025-12-29 23:12:20.198732	\N
ac494c62-34b1-4872-b101-400698055814	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department 11744f70-511a-4909-b546-7ab652b34471	172.31.105.66	2025-12-29 23:31:31.475592	050a27e9-8207-4cd3-8670-76f62513fb43
953556c2-202c-48ed-8461-be342ff10dae	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.105.66	2025-12-29 23:37:08.407181	223fcb77-419f-478c-b90e-ddb59f322c5a
4f5685f1-5828-4398-ba2f-627704eca310	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.105.66	2025-12-29 23:52:17.844726	\N
b2d77c64-27e8-401d-9e3b-d8c689ab25a4	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Surplus	Surplus	Amount: 1000.00	172.31.105.66	2025-12-29 23:53:31.101025	43c9b6ae-4b92-46e0-843f-9cb84dad0eac
15433f1f-1a63-4495-adf6-5a0b1178bdf6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department dbcba58f-0564-4996-8405-a35573f74989	172.31.105.66	2025-12-29 23:53:44.151712	40bfd930-ac9d-4a99-836c-ff33d898c608
0f25aca9-cb22-4321-a572-fd56ff5ab836	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 04:09:30.42662	\N
0303dfa4-3c67-435f-b84b-92f17904cc9e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 04:19:39.811221	\N
f8b3f09c-0daf-45c7-b317-289ab99904b1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Stock Count	StockCount	Stock count deleted	172.31.114.98	2025-12-30 04:24:20.647574	e29fb675-1cda-4212-8830-beab067b980f
06c4cfdb-2cd1-4365-80a6-e4d709b4ed0d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 04:31:54.270571	\N
8bf3c55b-e622-4a04-9dc6-4ff9259e72b1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Stock Count	StockCount	Stock count deleted	172.31.114.98	2025-12-30 04:37:41.650207	223fcb77-419f-478c-b90e-ddb59f322c5a
6a01498f-ac2d-4964-b78d-cbd1040ca068	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.114.98	2025-12-30 04:38:10.993686	8f1a0af9-7199-4c31-bda9-ceb62c6e01aa
17de5917-ce01-4952-8e2d-58341ae85220	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.114.98	2025-12-30 04:44:02.207016	9cdcb5f1-0b6b-484c-9817-5b64fb7812a4
fd7511d7-bf99-45c6-a731-d4d022276054	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Stock Count	StockCount	Stock count deleted	172.31.114.98	2025-12-30 04:44:50.84719	8f1a0af9-7199-4c31-bda9-ceb62c6e01aa
0ee4cb64-a426-41c6-a652-299a51b9316a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.114.98	2025-12-30 04:45:22.916678	26e6b1d1-90c8-45df-8934-a3db428f8c66
b6ee199c-ce18-41cf-9830-0b4b8d9e4de0	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Tue Dec 30 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.114.98	2025-12-30 04:46:53.805976	2ac0cb5d-1b9e-4539-ab57-940e53174583
5660ec4f-6cd0-4e71-be8f-5ca8e2b75040	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Tue Dec 30 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.114.98	2025-12-30 04:47:16.097543	c046e4e7-a073-4ad1-bfdb-f1a870b0934a
ec89a3ef-311c-4d1b-8f2c-acdb47f4db84	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Tue Dec 30 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.114.98	2025-12-30 04:59:03.832771	2ac0cb5d-1b9e-4539-ab57-940e53174583
c961ac11-566c-4db4-8cef-d2725b736a86	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Tue Dec 30 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.114.98	2025-12-30 04:59:38.600765	2ac0cb5d-1b9e-4539-ab57-940e53174583
fa5a3cd4-9ed4-4d35-9d71-931b9b8af6c6	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Tue Dec 30 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.114.98	2025-12-30 05:00:25.382208	2ac0cb5d-1b9e-4539-ab57-940e53174583
e258e107-6e4c-471b-80c2-e0cafebdfa2f	5ed0ccee-d55a-4700-b092-efa7e84a1907	update	payment_declaration	Updated payment declaration for Tue Dec 30 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.114.98	2025-12-30 05:03:57.00037	c046e4e7-a073-4ad1-bfdb-f1a870b0934a
883beb5f-d026-4d6a-94e2-34408aa70274	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 07:07:11.042757	\N
ae2c7516-fdbc-4c13-adbb-4ee7d2db030d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.114.98	2025-12-30 07:08:11.063486	1fe06033-c5ce-45bc-8d06-9c1fa691d113
dd442925-6de9-4111-bc2d-adaa3dd94090	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 07:40:11.987946	\N
1e24585c-1dfa-4b36-a570-70da3b22b371	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.114.98	2025-12-30 07:48:48.454554	\N
24897ff2-441c-405f-944e-c949029c5c24	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (2/5)	172.31.114.98	2025-12-30 07:49:00.40744	\N
31cc36a7-4ade-4a92-9d64-5ad91127fddb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (3/5)	172.31.114.98	2025-12-30 07:49:06.504488	\N
06077645-3f40-4a33-8357-541f86668c0d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 07:49:19.143635	\N
9d148192-5083-4f35-9837-9c8b7ce82286	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.114.98	2025-12-30 08:01:30.323327	\N
0472791e-a7e4-40f1-88cb-1582129af011	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Category	Category	New category added: F&B	172.31.114.98	2025-12-30 08:03:38.980751	11dcadfe-cee7-42df-8653-716e9036b103
db6db83a-9351-4af5-a58b-6d80f016e598	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Malt	172.31.114.98	2025-12-30 08:04:27.129887	0685f443-471a-4a34-927e-f5e41fbeb2d3
2844094c-5926-480e-bd4b-18530273feb5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Item	Item	Item deleted	172.31.68.226	2025-12-30 13:56:39.306732	9742f35a-ea63-4dff-b74a-a27746417dce
5b11be7a-0eb9-45c8-a577-7b78f79023ec	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 50 12 pc posted to Main Store SRD for 2025-12-30	172.31.114.98	2025-12-30 08:04:45.513537	0685f443-471a-4a34-927e-f5e41fbeb2d3
dac7d4cd-d9a9-449e-ad68-b6400773bf7c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 08:22:19.511488	\N
e83de6f3-59c5-49ba-b68c-b2460b7ae95a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 400 12 pc posted to Main Store SRD for 2025-12-30	172.31.114.98	2025-12-30 08:22:53.321927	0685f443-471a-4a34-927e-f5e41fbeb2d3
909c6563-376b-43ba-8a22-309b5da46dfa	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from 43d27fe4-d8e1-4319-9f6b-7657ce33be4a to c47d93b1-4801-445b-a77e-8362ebb25442, 1 item(s)	172.31.114.98	2025-12-30 08:26:15.898808	cfc2d219-0286-4e4a-9c92-a1737b8698d5
52c5af98-df0e-4510-96b9-afdfa60813bb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.114.98	2025-12-30 08:30:22.169517	e30d675d-b78e-46a5-9a49-664a0248e68f
f56184ae-cafa-47dd-996a-69b4d3dc1a9b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Sales Entry	Sales	Sales entry deleted	172.31.114.98	2025-12-30 08:30:57.180046	e30d675d-b78e-46a5-9a49-664a0248e68f
2ccbf605-5dcf-465d-ab42-5d557e2cf278	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 08:41:41.039277	\N
e6e37641-2b61-4eda-9798-479b26b224f2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 09:05:25.532604	\N
1754917c-ae0d-4006-8de2-51ce926b5c7f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Updated GRN	GoodsReceivedNote	Invoice: WSG234	172.31.114.98	2025-12-30 09:06:20.731427	72794fb2-15fb-4fd8-a330-813f000adee4
3bee734f-08c8-43db-992a-00e272c7e2a1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created GRN	GoodsReceivedNote	Invoice: wws32, Amount: 90000.00	172.31.114.98	2025-12-30 09:08:57.627462	0aee6b24-1abb-4fc8-ab26-02e811ba6350
f078311a-066b-4ed8-8114-f141942d27b5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 09:35:34.503968	\N
ec04651b-cf47-4bc9-95dd-805c009072bf	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 09:47:57.361073	\N
0bde6d9d-98b0-43d6-95fb-d5df5e7e1952	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Client	wisdom publishing	New client added: wisdom publishing	172.31.114.98	2025-12-30 09:48:30.53279	aef0682a-41f1-440f-b6ba-b3136200f023
8effb51d-f33b-4a56-83c7-96a7411b90f5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.114.98	2025-12-30 09:49:08.7703	\N
f6797ac5-3f67-4196-bef9-61ee93e0d288	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Category	Category	New category added: DESK	172.31.114.98	2025-12-30 09:49:36.612811	5ee629fd-477d-4ad5-824b-b564dd653660
ae1f2e64-6838-4502-9e76-80b3a405ad31	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Department	Department	Department deleted	172.31.114.98	2025-12-30 09:52:54.490343	36c6f038-be85-49e2-a6e8-a5209ef33fe4
149ff6cf-d9be-4f07-b6ed-9c64ec7d3271	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 09:54:13.061141	\N
c3987e1f-afd6-4981-a322-79d838eeed8d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 10:06:50.014868	\N
434f0bb8-0b8c-4125-8a65-25ee99a25df8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 10:20:01.584844	\N
cf9dbe45-7163-4ad0-9c8a-8a4deff048b6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.114.98	2025-12-30 10:29:06.523687	\N
97f18b30-6328-4d29-924b-ceebe0e2fbe9	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-30 11:52:31.108984	\N
e6cf7d68-2b2e-4d27-9bca-3d6edb68f0a7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-30 12:10:45.203951	\N
51fe4ff4-19cf-43e1-8687-4e3b6d5fb3e8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-30 12:15:01.701091	\N
2c37b505-ff4d-4250-bc50-ccd74c7de3dc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Coca Cola	172.31.68.226	2025-12-30 12:15:51.663584	d3a42547-ff64-4772-923c-4a8a112f6be9
198a82c3-41dd-41d2-96f2-c38c3024892f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Fanta	172.31.68.226	2025-12-30 12:16:50.772561	2f64a260-d98d-40cc-bd44-346f94737415
25d71f0e-ddb8-43f6-a808-48fc46938577	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	172.31.68.226	2025-12-30 12:26:25.385858	\N
242446f9-c09f-49da-9c03-2f15484ef2a9	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	172.31.68.226	2025-12-30 12:26:37.198925	\N
c12832dc-2cbf-41f8-b31c-d61b8b30a8ef	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	Login Failed	Session	Invalid password attempt (1/5)	172.31.68.226	2025-12-30 12:26:54.53847	\N
bf7ab87a-c452-46c3-90ec-a27a54be25d7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-30 12:27:14.364865	\N
93ea3ffa-c84a-4ba4-b62b-9a1d2a765339	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	172.31.68.226	2025-12-30 12:27:48.543586	\N
822b72ee-cb6c-420e-8a46-954ecb215465	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	172.31.68.226	2025-12-30 12:27:59.273963	\N
35c2707a-32db-4660-a830-1d2c2bdbe5bf	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	172.31.68.226	2025-12-30 12:28:03.051743	\N
a756faad-3647-4fcf-9bdc-90caf79a38c5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-30 12:28:26.040066	\N
6eeb5da7-04a1-4f17-be0d-97236cc8aebe	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-30 12:36:19.999148	\N
57231a07-49e9-4841-8e2c-1a114e946ae1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Exception	EXC-20251230-001	1 MISSING FANTA BOTTLE	172.31.68.226	2025-12-30 13:26:00.195217	5204d46d-1c82-4949-8e4d-a31998f32693
20f9f230-8947-41f5-8993-6f65b9f65a66	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Exception	EXC-20251230-002	1 MISSING FANTA BOTTLE	172.31.68.226	2025-12-30 13:26:15.47617	fb643f20-a2ee-414a-9e9f-a486b147b1f2
552e2f90-00be-4d53-bb3d-5c669b4b6ac8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Updated Exception	EXC-20251230-001	Exception status: investigating	172.31.68.226	2025-12-30 13:26:23.821367	5204d46d-1c82-4949-8e4d-a31998f32693
e718d728-4693-46b9-9cc2-cf3bf57444df	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 200 4 posted to Main Store SRD for 2025-12-25	172.31.68.226	2025-12-30 13:49:47.034841	9742f35a-ea63-4dff-b74a-a27746417dce
0779286a-ad05-4bb8-8965-9d44cc978388	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 300 4 posted to Main Store SRD for 2025-12-25	172.31.68.226	2025-12-30 13:54:35.819414	9742f35a-ea63-4dff-b74a-a27746417dce
14594e1a-260c-4b99-a7c3-71597ea7cade	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Item	Item	New item added: Orange Juice	172.31.68.226	2025-12-30 13:57:16.078465	29070060-0461-41bc-afaa-d58281cef2bb
5b140d1c-0fd8-4637-89dd-56e9d3325a39	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 300 4 pc posted to Main Store SRD for 2025-12-20	172.31.68.226	2025-12-30 13:59:10.875824	29070060-0461-41bc-afaa-d58281cef2bb
1ba26934-ceec-41b0-b391-f953ddabcef0	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-30 14:05:06.792789	\N
d9b923ca-3bfe-4aef-81f0-75740c5d640a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 500 4 pc posted to Main Store SRD for 2025-12-20	172.31.68.226	2025-12-30 14:15:38.310849	3315d410-2302-4ff8-8a38-6af5f1bee4ee
d80f044c-d978-4e2d-8468-3feeb01cfcea	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.68.226	2025-12-30 14:49:33.872099	\N
168d0aa2-16d4-4ee1-8673-b834da3e4623	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.68.226	2025-12-30 14:52:51.289484	581076af-af41-47cf-b925-0dd2cf497632
d130399f-b323-4daf-82a7-2330c560815e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.68.226	2025-12-30 14:58:42.168219	a4fa5a7b-3619-4fa6-9d0e-3bbbb2a5d484
3513f4a8-1e5f-4e53-8d19-9f51af086486	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.94.2	2025-12-30 16:49:04.217764	\N
5ace1d7c-9c8b-4f54-8147-ace5d2096b6f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 400 4 pc posted to Main Store SRD for 2025-12-15	172.31.94.2	2025-12-30 16:53:31.358672	29070060-0461-41bc-afaa-d58281cef2bb
5ccb96f7-1c3b-472a-bdec-e1f5368ef3af	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.66.226	2025-12-30 18:07:10.837845	\N
7e7eee6c-4a22-42bf-87ed-3053fa3b39fd	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 300 4 pc posted to Main Store SRD for 2025-12-25	172.31.66.226	2025-12-30 18:08:09.331399	3315d410-2302-4ff8-8a38-6af5f1bee4ee
28a88306-d550-4b29-ac7e-f3524b2e9778	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.66.226	2025-12-30 18:14:49.990841	\N
436e9655-f8b6-4f3e-8881-c103d20ca85a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 500 4 pc posted to Main Store SRD for 2025-12-01	172.31.66.226	2025-12-30 18:15:45.947086	29070060-0461-41bc-afaa-d58281cef2bb
9c40e0a3-e9cf-4a5d-965c-5aed021b89c7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 300 4 pc posted to Main Store SRD for 2025-12-06	172.31.66.226	2025-12-30 18:16:10.040932	29070060-0461-41bc-afaa-d58281cef2bb
7915f87e-4035-414f-a63e-f81cc82b2dd1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from 43d27fe4-d8e1-4319-9f6b-7657ce33be4a to b30e98ff-9e99-4f22-b814-cd976d2c9c71, 1 item(s)	172.31.66.226	2025-12-30 18:21:34.907774	80377e8e-b095-4ac4-bbbd-d05cca8a68fb
440a6424-b890-408b-901b-3c5469cbddcf	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from b30e98ff-9e99-4f22-b814-cd976d2c9c71 back to 43d27fe4-d8e1-4319-9f6b-7657ce33be4a	172.31.66.226	2025-12-30 18:22:55.760311	80377e8e-b095-4ac4-bbbd-d05cca8a68fb
54a92c92-ee6e-4785-bea1-5316b72bc146	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from 43d27fe4-d8e1-4319-9f6b-7657ce33be4a to b30e98ff-9e99-4f22-b814-cd976d2c9c71, 1 item(s)	172.31.66.226	2025-12-30 18:23:47.822067	db4b91ab-4a55-4852-859e-b4a825fc2095
a6699f7b-205c-438c-90c4-44cc45c8a4e2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Store Issue	StoreIssue	Issue from 43d27fe4-d8e1-4319-9f6b-7657ce33be4a to b30e98ff-9e99-4f22-b814-cd976d2c9c71, 1 item(s)	172.31.66.226	2025-12-30 18:24:14.051392	f8d24b14-91dd-403d-9147-eb145538ce2b
2e01e41a-848e-4fc7-9312-061be01fbd6c	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.66.226	2025-12-30 18:58:07.42259	\N
bdfb7b0d-3422-475e-94d4-a2d0619e99ef	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 1	172.31.66.226	2025-12-30 18:58:52.25694	5193c7ce-f7e1-4758-81c4-fece4579dc70
58ba41d6-bca9-4336-a2d0-7f7e9e4480d6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 1	172.31.66.226	2025-12-30 19:01:56.620892	4a8094c8-1def-473b-bf9d-4d1d9b3f6f4f
d847ee00-fec7-4dbc-a005-ceae4ae606a0	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.66.226	2025-12-30 19:42:25.517319	\N
fb2a42db-68f6-4b23-8ab5-fc6768502659	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 1	172.31.66.226	2025-12-30 19:44:54.255309	ae785a7c-ab1e-4453-af39-e3e430f35008
11c95b43-5174-4be4-85e2-90f68f5741e1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Movement	StockMovement	Created adjustment movement with 1 items, total qty: 1	172.31.66.226	2025-12-30 19:47:58.801607	65a1d143-e58f-42cc-b9fa-f06e4e91ad2c
1293f189-f0ff-47d0-983e-cc59a181ca69	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 1	172.31.66.226	2025-12-30 19:49:32.912838	051832b3-c353-4820-b471-d9f6dc237099
7f71e619-613e-4580-87fa-fdf52396a4d5	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.66.226	2025-12-30 20:01:12.314784	\N
4ddceac0-7423-4ae3-abc7-0eddd58df89b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from b30e98ff-9e99-4f22-b814-cd976d2c9c71 back to 43d27fe4-d8e1-4319-9f6b-7657ce33be4a	172.31.66.226	2025-12-30 20:05:21.46635	db4b91ab-4a55-4852-859e-b4a825fc2095
34c2705a-e8be-449e-9dc8-23314b1d3a95	5ed0ccee-d55a-4700-b092-efa7e84a1907	Recalled Store Issue	StoreIssue	Issue recalled from b30e98ff-9e99-4f22-b814-cd976d2c9c71 back to 43d27fe4-d8e1-4319-9f6b-7657ce33be4a	172.31.66.226	2025-12-30 20:06:21.338263	f8d24b14-91dd-403d-9147-eb145538ce2b
f6827ea4-58d2-4c85-8013-aa6f99573038	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 20:43:31.690148	7851c8be-f2dc-41c0-8f2d-4e2e470dc034
6c79535c-4282-4e81-8f1d-6c86e20dc212	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Stock Count	StockCount	Stock count deleted	172.31.66.226	2025-12-30 20:48:06.843474	7851c8be-f2dc-41c0-8f2d-4e2e470dc034
07a25b23-c226-49b7-be2e-67ee8f257615	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.66.226	2025-12-30 21:15:28.899093	\N
3ee5eddc-36fc-47f0-b157-0e780b2e07c8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:16:39.751355	f0a6b7c7-3362-47ef-8a80-dc418fdaa0f8
5a9b745e-75f0-42bd-8884-1856a0a4aad9	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Stock Count	StockCount	Stock count deleted and SRD ledger reversed	172.31.66.226	2025-12-30 21:17:08.328814	a4fa5a7b-3619-4fa6-9d0e-3bbbb2a5d484
79530efe-0c4d-4f27-8871-1d427fc8e631	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:17:44.476168	429e83d8-5308-455c-8b53-19aa7c48e2d3
8fd52ddb-aa5f-4748-b11b-78bad9778766	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:18:21.297436	0bdcd282-4089-4893-9aeb-1d21316ef2a1
115a88b9-4723-4cf6-b7c2-7d07d268e00f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:19:25.473342	29a6e591-6087-404a-9e4e-b34151feb014
e50d8a8f-0d91-44d0-b4a2-c0ac957caeb8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:20:18.26404	956fd86d-6c87-48d3-9d9d-f7344e5b6544
543bd2bb-65bd-4ae8-a4f8-c6df75cd1ecb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:21:31.797601	09379f6b-8356-4e1c-b245-f63ff799ab30
6e6b186e-3755-4886-bad0-fa16b5c3c783	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:25:04.487309	47b1e85e-ad5e-477f-919c-1c05247b3ef9
6d85250c-e31d-4c42-bbbf-89d5b713c06b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:26:06.303434	1fdb6571-d1cf-4484-83db-e54de64d5fc2
b1792150-b9c1-46b7-901a-4f1b9796cecd	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.66.226	2025-12-30 21:26:40.100382	203b2e68-37fb-44d7-b53a-22c3ee3b3335
14c05ff0-5342-47dd-9de6-8550f5a74b2b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Stock Count	StockCount	Stock count deleted and SRD ledger reversed	172.31.66.226	2025-12-30 21:27:53.358476	203b2e68-37fb-44d7-b53a-22c3ee3b3335
805a84b5-5c58-4ba4-96e8-c2ec539ba3a2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.98.34	2025-12-30 21:47:34.83496	\N
703e5b9b-153b-4238-ba9b-dcec7f3aa943	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.103.162	2025-12-31 04:03:53.650184	\N
34cfa303-f48d-462e-8b31-ca59be48c830	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.103.162	2025-12-31 04:10:11.834415	7bfdfef1-5b8a-4699-be3c-a0cbf362e91b
312afc66-f69f-4460-a477-605a9ae54d68	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 500 12 pc posted to Main Store SRD for 2025-12-21	172.31.103.162	2025-12-31 04:14:46.33017	2f64a260-d98d-40cc-bd44-346f94737415
f2e760e0-e7ba-425f-a62a-d91a8ab341ad	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 400 12 posted to Main Store SRD for 2025-12-21	172.31.103.162	2025-12-31 04:15:04.256405	d3a42547-ff64-4772-923c-4a8a112f6be9
f62e865c-aa1b-4944-b20c-c3c94955f483	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 500 12 pc posted to Main Store SRD for 2025-12-21	172.31.103.162	2025-12-31 04:15:15.047689	0685f443-471a-4a34-927e-f5e41fbeb2d3
9ac15080-6755-4ce5-a622-1ee3d5a1e188	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 400 12 pc posted to Main Store SRD for 2025-12-21	172.31.103.162	2025-12-31 04:17:16.035255	0685f443-471a-4a34-927e-f5e41fbeb2d3
7658ab83-11ba-4567-986d-5b5a4dd6458b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 200 12 pc posted to Main Store SRD for 2025-12-31	172.31.103.162	2025-12-31 04:18:58.23595	2f64a260-d98d-40cc-bd44-346f94737415
fcfe30b6-429b-462d-8443-7a3c74fb5a44	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 400 4 pc posted to Main Store SRD for 2025-12-31	172.31.103.162	2025-12-31 04:46:49.448516	3315d410-2302-4ff8-8a38-6af5f1bee4ee
b16c4e40-d9e6-49d4-9526-868cd6ccb584	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 1000 12 pc posted to Main Store SRD for 2025-12-01	172.31.103.162	2025-12-31 04:56:06.252745	2f64a260-d98d-40cc-bd44-346f94737415
ec7dd9b9-bb86-4233-a0b5-8d19852199ba	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 1000 12 posted to Main Store SRD for 2025-12-01	172.31.103.162	2025-12-31 04:56:18.997649	d3a42547-ff64-4772-923c-4a8a112f6be9
e741451b-3031-4d93-9c77-676f6e1a418b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 1000 12 pc posted to Main Store SRD for 2025-12-01	172.31.103.162	2025-12-31 04:56:29.740576	0685f443-471a-4a34-927e-f5e41fbeb2d3
541c74d4-9d92-45ec-bc42-270c3615169d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 2000 12 pc posted to Main Store SRD for 2025-12-02	172.31.103.162	2025-12-31 04:57:56.055097	2f64a260-d98d-40cc-bd44-346f94737415
4ef56082-283f-41cd-aa3a-7e263f1769a7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 2000 12 posted to Main Store SRD for 2025-12-02	172.31.103.162	2025-12-31 04:58:07.281945	d3a42547-ff64-4772-923c-4a8a112f6be9
f9b5a239-81d7-440c-8b94-9c7c07110779	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 2000 12 pc posted to Main Store SRD for 2025-12-02	172.31.103.162	2025-12-31 04:58:16.536982	0685f443-471a-4a34-927e-f5e41fbeb2d3
7dc1fbb3-d00b-412a-9dd4-b7cf390f6332	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.103.162	2025-12-31 05:19:08.856151	bbb857b6-cf43-4e1a-9460-e71ed8938907
df498851-5ea2-47da-b544-ef54f4cd6844	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.103.162	2025-12-31 05:20:56.868784	68b124ce-f52c-4273-8370-a7ab3aad84de
b8e41dd8-1f7f-4063-8032-c1419083dd91	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.103.162	2025-12-31 05:21:19.338275	b4ed9eb0-796e-4f83-bb89-1594b3a0a72a
87e7a9bd-48e6-4c10-9e0a-d3ea5e2e4aea	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Stock Count	StockCount	Stock count deleted and SRD ledger reversed	172.31.103.162	2025-12-31 05:23:00.94314	bbb857b6-cf43-4e1a-9460-e71ed8938907
0c2b611b-ab49-4e2d-9622-3a6bb5c308cc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 2	172.31.103.162	2025-12-31 05:24:49.766004	d561c2f7-9264-429f-9d30-802471a5392e
53213178-c9e1-4121-94a3-cfdade088b43	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.103.162	2025-12-31 05:33:04.993656	8818ca92-6fa1-494b-a334-44baffa03842
456ec326-b652-4636-83d4-604b4837c135	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Movement	StockMovement	Created adjustment movement with 1 items, total qty: 2	172.31.103.162	2025-12-31 05:34:51.785078	6e88cd27-04ab-4ed1-9faa-3cdb89feedf8
67390617-d380-400b-bc38-217b9c3c5d76	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 3	172.31.103.162	2025-12-31 05:38:47.825848	9228ed43-10a6-47cc-9779-f7cb7b7ea4f7
b41e967b-324c-4016-bb74-d97b9e575044	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 5000 4 pc posted to Main Store SRD for 2025-12-01	172.31.103.162	2025-12-31 05:56:56.959983	e55abe0b-52ac-487b-9a47-3a83ee61a95d
b7d50465-880d-4817-8567-ce35b3826bf6	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 1000 12 pc posted to Main Store SRD for 2025-12-01	172.31.103.162	2025-12-31 05:58:19.119116	0685f443-471a-4a34-927e-f5e41fbeb2d3
2b576561-8409-4064-90fd-3ecc55b9613e	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 1000 4 pc posted to Main Store SRD for 2025-12-01	172.31.103.162	2025-12-31 05:58:38.086201	3315d410-2302-4ff8-8a38-6af5f1bee4ee
f75652bb-8bdc-46ce-bb22-aa3fe0d17e05	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 3000 12 pc posted to Main Store SRD for 2025-12-02	172.31.103.162	2025-12-31 06:00:36.411781	0685f443-471a-4a34-927e-f5e41fbeb2d3
d81c690c-0488-4abe-9ef3-8f84b65ee914	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 20000 4 pc posted to Main Store SRD for 2025-12-02	172.31.103.162	2025-12-31 06:02:56.839052	3315d410-2302-4ff8-8a38-6af5f1bee4ee
d7372228-913a-4f07-8985-bf75f9f4c7f2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 5000 12 pc posted to Main Store SRD for 2025-12-05	172.31.103.162	2025-12-31 06:04:13.515266	0685f443-471a-4a34-927e-f5e41fbeb2d3
bebfc612-8d09-487d-9c74-18c78563d950	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 3000 12 pc posted to Main Store SRD for 2025-12-13	172.31.103.162	2025-12-31 06:16:09.150356	2f64a260-d98d-40cc-bd44-346f94737415
16f005d4-3188-4a02-99db-16b66837f699	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 3000 12 posted to Main Store SRD for 2025-12-13	172.31.103.162	2025-12-31 06:16:19.633547	d3a42547-ff64-4772-923c-4a8a112f6be9
0b40cfee-e1fb-419d-ab6b-59a91fc21c8d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.103.162	2025-12-31 06:41:37.206082	\N
6125c8a6-bc8e-4ca4-a708-c50421439220	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 2500 4 pc posted to Main Store SRD for 2025-12-15	172.31.103.162	2025-12-31 06:42:15.037983	29070060-0461-41bc-afaa-d58281cef2bb
62fd45f2-9861-42a7-b9b5-14f57eafc9c7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 2500 4 pc posted to Main Store SRD for 2025-12-15	172.31.103.162	2025-12-31 06:42:28.410304	e55abe0b-52ac-487b-9a47-3a83ee61a95d
c2ec834a-49d4-485e-85cb-f3753d274a28	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.103.162	2025-12-31 08:04:03.624737	f122c893-304a-4231-a6df-b2dabe0788c0
be6355b2-69eb-44e4-8f00-3d7f0ff02328	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.103.162	2025-12-31 08:17:20.882579	\N
97009ad1-383a-44b4-87ae-557f4803055b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.103.162	2025-12-31 08:17:57.978462	\N
10b15ab6-4dfe-4955-90c7-a3d280a189dc	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.103.162	2025-12-31 08:17:59.205365	\N
9c600416-56d2-496a-b2b7-2751339f98c3	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.103.162	2025-12-31 08:24:37.485784	\N
b4cd28bb-2e51-48dc-a280-d176b704e83b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.103.162	2025-12-31 09:51:08.422203	\N
fc71ce54-b249-4011-b5c1-ab1b6df8b2a7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Reversed Stock Movement	StockMovement	Reversed transfer movement. Reversal ID: e5b05c0e-8245-4045-9469-da37badac16e. Reason: rss	172.31.103.162	2025-12-31 10:00:31.014311	d561c2f7-9264-429f-9d30-802471a5392e
427feeb9-0cd6-4368-892a-66fc995c1781	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.103.162	2025-12-31 10:33:20.122766	\N
95edf080-3f31-4c88-b06d-027e1f7abc0b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.126.98	2025-12-31 13:19:23.213664	\N
5e61d866-fe29-49ec-809b-baf94d5736a2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.126.98	2025-12-31 13:20:12.861528	\N
f14eeedc-cab7-43d0-84b0-97bd659adf4a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	Unknown	2025-12-31 13:21:13.139754	\N
02b1578d-c616-4541-a105-07c70137eb32	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.106.130	2025-12-31 19:26:19.182391	\N
73dcc0d9-df34-4ded-980d-8517a28cbac7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Sales Entry	Sales	Sales entry for full shift	172.31.106.130	2025-12-31 19:52:36.196882	ff642961-04b1-4350-acc8-1bc364736bf6
f65e73b5-94db-4ae7-8b37-51acbb258a9e	5ed0ccee-d55a-4700-b092-efa7e84a1907	create	payment_declaration	Created payment declaration for Wed Dec 31 2025 00:00:00 GMT+0000 (Coordinated Universal Time)	172.31.106.130	2025-12-31 19:53:33.621409	752f36b0-7434-422f-afe1-0d9532ee016d
670e9619-1116-4b61-bc96-04a4e30f78a1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Updated Exception	EXC-20251230-002	Exception status: open, outcome: true	172.31.106.130	2025-12-31 20:38:52.682873	fb643f20-a2ee-414a-9e9f-a486b147b1f2
73cd476b-5db7-4d4f-bfe7-d86d49733c95	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	172.31.83.162	2025-12-31 20:52:00.876257	\N
e2573c32-2c59-4aaa-aacf-4ad1d5cc21c2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.83.162	2025-12-31 20:52:13.572589	\N
b56967bd-6149-4b4e-bdcf-eabea9631773	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.83.162	2025-12-31 21:27:18.670204	\N
ef603540-62d7-4c8f-9492-8bf4c4f2f33f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.83.162	2025-12-31 23:28:43.22968	\N
177ed742-0e93-4779-aaf2-7633b6755811	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.83.162	2025-12-31 23:32:22.949376	\N
04e651fa-6e71-4b31-8cad-370325c79273	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Client	Client	Client deleted	172.31.83.162	2025-12-31 23:33:24.023638	aef0682a-41f1-440f-b6ba-b3136200f023
9231153c-92a6-4d62-8263-9dff702a6845	5ed0ccee-d55a-4700-b092-efa7e84a1907	Deleted Client	Client	Client deleted	172.31.83.162	2025-12-31 23:33:34.879599	317f6249-67f9-4d29-ab92-9744b16fc737
9374a02d-64eb-4f66-a109-2663c8807684	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	172.31.83.162	2025-12-31 23:47:53.996933	f834436a-a97b-4bc5-a840-ba5621be5720
9c32ffe5-3e7f-4fde-a101-976d5967ea2b	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	172.31.83.162	2025-12-31 23:50:55.118566	d47a2792-4a52-4e7b-8ed0-1b752f7fb97b
d4048111-6920-48e3-a826-0c8d03715b96	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	172.31.83.162	2025-12-31 23:51:27.031665	b4ef0d0d-1011-4d93-9e4a-d298420d7bcf
ede1e5fd-29dc-49e4-8681-fab699a201a8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	172.31.83.162	2025-12-31 23:57:14.077832	18e6cf63-d924-4a62-bc02-27d1896145df
062d9556-dc2a-492f-a35a-3acaf8213b3d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Exception	EXC-20251231-001	sss	172.31.83.162	2025-12-31 23:59:06.253358	a025afb3-3586-444a-a4fa-cb6e1dc22427
1280df39-c72c-4d9f-bea8-a5cf49d38fad	5ed0ccee-d55a-4700-b092-efa7e84a1907	Updated Exception	EXC-20251231-001	Exception status: investigating, outcome: pending	172.31.83.162	2025-12-31 23:59:25.737518	a025afb3-3586-444a-a4fa-cb6e1dc22427
0fce9b1f-6f81-4219-b973-102164fe1632	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Exception	EXC-20251231-002	how	172.31.83.162	2025-12-31 23:59:57.848345	43d82652-79c5-41b9-8046-0c977a16fb5f
555cfe56-0e1e-4907-a72d-ce9bcba959f2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Exception	EXC-20260101-001	asde	172.31.83.162	2026-01-01 00:00:46.947049	0a59e7ac-c299-44f2-afec-5a652bb0fef0
217bc064-d05b-4082-8a17-0dbf7a1d1067	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department f0dd0739-ff38-4819-b311-c6c9992bd79d	172.31.83.162	2026-01-01 00:03:11.77897	e2678f90-1fa2-4241-bf19-3834588815c3
4e04de92-847d-4c84-bebb-c6c766206a72	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department dbcba58f-0564-4996-8405-a35573f74989	172.31.83.162	2026-01-01 00:03:24.350616	bb04123d-1275-48ce-a8f1-ebed84584f18
686f7fec-d3f3-4150-bb06-935a423981e1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department dbcba58f-0564-4996-8405-a35573f74989	172.31.83.162	2026-01-01 00:03:39.043914	6b2d31f2-4fcb-44b5-adec-d7ad88dabe45
3bb852f8-afac-4293-99b4-363ea553ef76	5ed0ccee-d55a-4700-b092-efa7e84a1907	Submitted Reconciliation	Reconciliation	Audit submitted for department c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	172.31.83.162	2026-01-01 00:03:46.025579	a7a9f73a-30d7-4dbb-b7e1-fad227022bcd
902e7cff-9087-41af-9dbd-c258b8b0fb8a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Stock Count	StockCount	Stock count recorded (SRD updated)	172.31.83.162	2026-01-01 00:06:33.98664	5e70b345-d3a0-4927-b1e5-a30bf1863204
6b0d1e87-846d-4e19-ae15-7fead20670cb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.83.162	2026-01-01 01:12:52.629113	\N
9ef2346a-60c3-4e78-b72a-56840cf48133	5ed0ccee-d55a-4700-b092-efa7e84a1907	Bulk Created Departments	Department	Bulk created 1 departments	172.31.83.162	2026-01-01 01:13:25.97688	\N
329e79d7-7c41-4efc-9e7a-a99a4e363250	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Category	Category	New category added: PROTEIN	172.31.83.162	2026-01-01 01:16:14.976362	13d27efb-f0c5-4fee-b346-c0b4f1855718
9171a25a-4823-47b9-b996-a6cc8c99049a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Created Receivable	Receivable	Amount: 5000.00	172.31.83.162	2026-01-01 04:42:57.414053	eb1e3b28-7660-4f68-8f91-8785e9ebbabf
617cfc6a-4fe3-4351-82c4-c46125cb2b9d	5ed0ccee-d55a-4700-b092-efa7e84a1907	Item Purchase Captured	Item	Purchase of 2000 4 pc posted to Main Store SRD for 2026-01-01	172.31.110.162	2026-01-01 05:21:53.301602	e55abe0b-52ac-487b-9a47-3a83ee61a95d
e824c327-4c10-459f-9a86-7a9a5d70e40a	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.110.162	2026-01-01 07:25:29.677929	\N
edaec39d-7b76-487c-a3c8-9d16da6abf31	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.85.66	2026-01-01 12:21:53.081973	\N
5c724280-eade-4c54-aa4a-f06c0636f7cb	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.101.66	2026-01-01 13:06:26.416983	\N
bc1c3afe-827c-4d4d-bc91-c18dcdf0479e	\N	Login Failed	Session	Failed login attempt for: ighodaro	127.0.0.1	2026-01-01 22:00:58.699186	\N
21ba0fa8-ba23-42a3-a2d6-3a96207e29ea	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	Login Failed	Session	Invalid password attempt (1/5)	127.0.0.1	2026-01-01 22:01:57.85461	\N
41ba02f5-b430-4570-99cc-4607ec5d0eb4	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	Login Failed	Session	Invalid password attempt (2/5)	127.0.0.1	2026-01-01 22:09:44.751297	\N
9b28336e-ae82-4968-9fbc-a72bf6fbd19f	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	Login	Session	Successful login via web	127.0.0.1	2026-01-01 22:11:18.00055	\N
bded7861-d30c-4e22-a960-87ed09150645	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	Login	Session	Successful login via web	172.31.70.130	2026-01-01 22:13:35.011017	\N
b2356053-fb5c-4ef5-b946-85b09a559210	5ed0ccee-d55a-4700-b092-efa7e84a1907	Email Verified	User	User verified their email address	172.31.70.130	2026-01-01 22:29:42.67347	5ed0ccee-d55a-4700-b092-efa7e84a1907
f4a564d9-ff1e-459c-a988-3f64ba217009	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.70.130	2026-01-01 22:30:32.965824	\N
f57c7ce3-da8d-4d9c-a854-00929fc2568c	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	172.31.70.130	2026-01-01 22:36:49.640575	\N
0b13cb14-0655-4f45-b49d-ff3f51393537	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	172.31.70.130	2026-01-01 22:36:58.027922	\N
ef6967f4-0c66-493a-80ff-e8219f2056a7	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.70.130	2026-01-02 00:00:42.934249	\N
aa6836fa-5fb2-49ed-95b9-2bd82ad9138f	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	172.31.70.130	2026-01-02 00:25:17.079696	\N
d9ae45d0-b8d5-4d3e-ab6a-3246b38fe0b1	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	Password Reset	User	Password reset via email link	35.227.15.160	2026-01-02 01:55:20.419841	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4
d618873d-f262-47b8-95eb-12d14b63dc5a	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	35.243.129.130	2026-01-02 01:55:45.330832	\N
bacfa7df-e070-444a-bd9e-b1a851420c24	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	34.74.106.240	2026-01-02 01:56:00.821707	\N
5f0e5460-5ee4-4950-9e2c-eb3f0b5add7b	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	35.243.129.130	2026-01-02 01:56:13.691573	\N
e035d9aa-7cb6-46fb-ab3a-edb3b988c253	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	34.139.219.171	2026-01-02 07:16:29.916965	\N
3ea1b3aa-2310-435c-a526-4d5208bf055d	\N	Login Failed	Session	Failed login attempt for: Ighodaro.algadg@gmail.com	35.243.129.130	2026-01-02 07:16:48.991407	\N
006bd3de-925b-4031-904c-9bec7b62990f	\N	Login Failed	Session	Failed login attempt for: openclax@gmail.com	34.23.182.216	2026-01-02 07:23:21.562426	\N
19aa901d-3e27-44f3-b10d-49c13f0b391e	08cae6ca-1bda-42e0-8cee-bdb28d071529	Password Reset	User	Password reset via email link	34.75.119.55	2026-01-02 20:44:27.39448	08cae6ca-1bda-42e0-8cee-bdb28d071529
a8985322-3439-44b1-858b-9e74c574fd74	\N	Login Failed	Session	Failed login attempt for: openclax@gmail.com	34.23.182.216	2026-01-02 20:46:06.566164	\N
5a7a50c0-e121-49a4-ac1e-19eb75da4ddf	\N	Login Failed	Session	Failed login attempt for: openclax@gmail.com	35.243.160.31	2026-01-02 20:46:17.446891	\N
8cb332a0-8d69-473d-95e0-f101ab850477	08cae6ca-1bda-42e0-8cee-bdb28d071529	Password Reset	User	Password reset via email link	34.26.99.240	2026-01-02 22:09:43.743115	08cae6ca-1bda-42e0-8cee-bdb28d071529
008fdf65-03e2-4edd-9f5c-6db68d5bdf6a	08cae6ca-1bda-42e0-8cee-bdb28d071529	Email Verified	User	User verified their email address	34.74.106.240	2026-01-02 22:10:45.695637	08cae6ca-1bda-42e0-8cee-bdb28d071529
36e35803-7b41-44b6-9230-4dbb51563998	08cae6ca-1bda-42e0-8cee-bdb28d071529	Login	Session	Successful login via web	34.74.106.240	2026-01-02 22:10:52.356153	\N
66bd1218-c2ed-45f9-a5a1-7f6b175f3b62	08cae6ca-1bda-42e0-8cee-bdb28d071529	Login Failed	Session	Invalid password attempt (1/5)	34.75.119.55	2026-01-02 22:13:27.759157	\N
5fc5457a-b5d1-4d75-ac95-9202b00f434a	08cae6ca-1bda-42e0-8cee-bdb28d071529	Login Failed	Session	Invalid password attempt (2/5)	35.231.177.91	2026-01-02 22:13:45.162326	\N
1415f2f4-af9e-4839-a7b4-6d01b952cf95	08cae6ca-1bda-42e0-8cee-bdb28d071529	Login Failed	Session	Invalid password attempt (3/5)	35.231.177.91	2026-01-02 22:14:04.846977	\N
d10f6757-6e52-4330-bb3c-3982afa71b97	08cae6ca-1bda-42e0-8cee-bdb28d071529	Login	Session	Successful login via web	34.75.119.55	2026-01-02 22:14:31.146216	\N
8004cec7-12d4-43be-a227-b8d9b95da192	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	34.23.182.216	2026-01-03 03:41:33.68284	\N
a079a983-8bdf-4b92-afe2-9339892b0389	08cae6ca-1bda-42e0-8cee-bdb28d071529	Login	Session	Successful login via web	35.243.160.31	2026-01-03 03:41:56.439134	\N
a5ee3092-2608-4c55-a1f4-5996f8705242	08cae6ca-1bda-42e0-8cee-bdb28d071529	Login	Session	Successful login via web	34.139.219.171	2026-01-03 03:54:12.010331	\N
a544af78-17a0-494a-9b2c-1c8d57cc210a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Email Verified	User	User verified their email address	35.231.177.91	2026-01-03 03:57:12.128485	6419147a-44c1-4f3c-bbcb-51a46a91d1be
c6fbcbb5-970f-4bbf-ac31-9654f110ec17	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.227.15.160	2026-01-03 03:57:30.216386	\N
c4b4480c-15ea-4dc6-8fd7-36aab388cf8a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.243.129.130	2026-01-03 08:24:27.666433	\N
08492c1b-24d2-425c-83dd-4bc472bb321b	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Client	DASCO ENTERPRISE LTD	New client added: DASCO ENTERPRISE LTD	34.74.106.240	2026-01-03 08:25:06.737583	22de3178-67d0-4b2b-b8ac-d275ae848796
f2d8e0dd-c15e-45dd-9784-5ddb251eb85c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	34.26.99.240	2026-01-03 11:25:49.079198	\N
f1d5ff5d-4b09-4849-ac1b-e9d5cdc2342e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Deleted Client	Client	Client deleted: DASCO ENTERPRISE INT'L LIMITED	35.231.177.91	2026-01-03 11:26:54.651835	22de3178-67d0-4b2b-b8ac-d275ae848796
4ca5302e-e44b-4329-bf18-980bd3ca4994	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Client	YOURS HOSPITALITY - JUST PECKISH	New client added: YOURS HOSPITALITY - JUST PECKISH	34.26.99.240	2026-01-03 11:27:02.817912	5bcdde2d-535f-4d52-b0c0-d4cd945ab107
41d88563-4d4f-418e-b035-df8a611e3a35	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Bulk Created Departments	Department	Bulk created 1 departments	34.139.219.171	2026-01-03 18:11:54.290501	\N
08014622-a079-424b-96c1-dc714c0b4cc3	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.227.15.160	2026-01-03 21:36:39.704906	\N
a06461b0-e1b7-48e1-8ce3-1f138fe48b79	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.227.15.160	2026-01-03 21:36:51.560045	\N
0b6b1574-1ebe-48a1-908c-1f0ae4c1a5cb	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	34.74.106.240	2026-01-03 21:36:58.357996	\N
af407456-1093-4705-804c-9ba677d24b30	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.243.129.130	2026-01-03 21:37:05.824035	\N
a3c4dc26-5a1f-40c7-82a5-12a855cd4abf	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.227.47.41	2026-01-03 21:41:11.970028	\N
b235b5d2-0ba2-48f6-a431-2171b1c79270	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.243.160.31	2026-01-03 22:18:30.468292	\N
1576b1fc-482b-48b6-842c-6a9370fdc13d	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.227.47.41	2026-01-03 22:18:51.580065	\N
a769098d-9fd5-4bb7-927f-c05cb02a2106	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	34.23.182.216	2026-01-03 22:19:10.549267	\N
3f8432cc-f035-4bc0-8fc6-c209df574c77	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.243.160.31	2026-01-03 22:20:20.774365	\N
23ef4b9f-5406-45a9-8ee9-d2cdcf85140c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	34.74.106.240	2026-01-03 22:22:20.008602	\N
6b1d9060-7ea5-4ce1-b03e-89c26e097660	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	34.74.106.240	2026-01-03 22:27:54.464318	\N
3d5249f5-1753-4179-91c8-58ef3f2e82b4	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	34.26.99.240	2026-01-03 22:30:51.087108	\N
a458bf36-3d2f-45da-b442-5e625862cec0	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	35.243.160.31	2026-01-03 22:33:13.649322	\N
691d470a-4ec0-4688-bf98-05e097e42a38	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	34.74.106.240	2026-01-03 22:36:22.626178	\N
d5e9d5b5-3ac8-4722-8d88-b26936d12c24	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-03 22:46:34.623127	\N
9da1c8ac-b412-4e2f-aaa9-6ef1a4acfccf	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-03 22:47:06.111624	\N
9f5b8fc4-ba99-4245-b6b5-d9455bb29070	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-03 22:58:03.241707	\N
49243cd6-7407-4293-9781-f293add40535	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-03 22:58:16.373945	\N
9a18c620-8994-4b13-ba51-a6c37a509ccd	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-03 23:28:32.048895	\N
b851dcbf-8289-43a4-9e9e-abd60a707b8e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-03 23:31:59.753646	\N
28bd59b5-5200-45fe-9744-41864b786353	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-03 23:43:37.353796	\N
215f979f-bfd9-417b-a38c-93ec107b2b49	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 00:00:40.187435	\N
1afc6dab-6e37-4363-8901-c7aaed116b89	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 00:09:06.644316	\N
3dec5914-b2f9-43af-a58d-e71b8f34cc0c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 00:09:30.38753	\N
8f5baba0-5146-48e4-acc1-7e54fdd5666c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 00:12:14.01426	\N
417d9e9c-30c1-44a1-80e8-1b5e222c65aa	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 00:25:14.066659	\N
bd17616c-c338-4a4d-8fd0-ef01ce9db415	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 00:25:18.790544	\N
9359ea37-a0b1-4f07-ae7a-6f6decc62cfc	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 00:36:05.726963	\N
2a1d7952-cc65-4f04-864d-df92c71345f4	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 01:20:36.649628	\N
d5f86876-e290-4259-aacd-933f97a7ee23	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 01:40:37.971911	\N
7e81a5e8-2f0b-4224-a873-b072310392b5	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 01:43:15.537839	\N
429cc4df-7dc5-4051-a2f8-20d211d71c39	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 01:58:49.21976	\N
828f6c68-0f47-4555-9ed9-982062cbc3f4	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 02:17:29.947954	\N
0caa3547-49a7-4a24-a704-266106c52720	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.45	2026-01-04 02:35:02.960431	\N
ce3849ff-7989-47ee-9f70-5f47e597db1c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	185.177.124.194	2026-01-04 06:50:09.45913	\N
04d0eaa2-79dd-41c7-963c-7fcbd9bff562	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	185.177.124.194	2026-01-04 06:50:15.533564	\N
f8b0cfcb-ea4e-4142-a085-79dc58ac7a8e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	185.177.124.194	2026-01-04 06:50:20.794236	\N
fddf2b91-8918-496b-8838-64d2da80b0f3	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.134	2026-01-04 07:05:36.729869	\N
c545cd0f-908b-4022-ad9e-e3b040350313	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.134	2026-01-04 07:06:03.587306	\N
3049338d-cbeb-4fe3-a475-02530bca51bb	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.134	2026-01-04 07:06:07.092077	\N
0cf9da81-69df-45d6-8d8b-cba7d10f493a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.134	2026-01-04 07:06:10.003185	\N
172a02a0-7014-4fd0-b3b4-8f99c49aa363	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.134	2026-01-04 07:06:13.232341	\N
0cef9459-4608-4ec9-86d4-e40cbcd3214e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.134	2026-01-04 07:22:21.74433	\N
0524e3e4-67be-4792-acad-2191b73bab09	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.134	2026-01-04 07:28:39.969527	\N
3d855c31-cdde-4d3c-91ac-7e9bb349c37a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Bulk Created Departments	Department	Bulk created 1 departments	102.89.85.134	2026-01-04 07:30:03.685025	\N
d4bb41bf-d876-4f5a-90ac-ea38ff97b42d	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Bulk Created Departments	Department	Bulk created 1 departments	102.89.85.134	2026-01-04 07:30:18.277999	\N
6e753d8a-2197-41e5-9227-f92ec4ccea10	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Category	Category	New category added: F&B	102.89.85.134	2026-01-04 07:30:30.35095	5a2bd99a-47c9-4cf0-a2c2-3ffb9e8b746c
13fa9191-b249-43a0-b0a3-006c74a4c6ea	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Category	Category	New category added: FRESH FRUIT	102.89.85.134	2026-01-04 07:30:51.209365	413dbe0c-c852-4c73-ad07-d38ff8cb935a
d50b089b-b6fa-4d4e-8cd4-89ee90a2ace3	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Orange Juice	102.89.85.63	2026-01-04 07:55:39.915881	1d1862f8-de7b-4abb-a66d-9be145fd8508
b40a6eac-5c18-4e36-8587-a56152e74669	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Water Melon Juice	102.89.85.63	2026-01-04 07:56:56.618003	309643db-83a3-46de-b573-959bf1bb7a54
13cf5f53-5935-478d-aef2-9f66a9eb64ba	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.63	2026-01-04 11:15:55.281941	\N
22bcfc03-5de3-42cb-ad7b-bafd2f9162ce	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Pinipple Juice	102.89.85.63	2026-01-04 11:16:39.139405	c9eb20d9-d8a3-4062-8d22-3421499b0b33
34376646-2b1d-4954-a367-572de308b8ba	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.63	2026-01-04 12:21:33.190081	\N
1f04ef46-3c62-41e9-b3d6-2581836ecfe8	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Chicken Fries	102.89.85.63	2026-01-04 12:22:31.661037	dc910b55-20de-499f-9c3a-7432d308293d
654ed550-8c34-46ba-97a9-a4390e6295f9	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2025-12-30	102.89.85.63	2026-01-04 12:24:12.967805	c9eb20d9-d8a3-4062-8d22-3421499b0b33
44955490-9437-4cdb-99e4-abe387350e1f	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.85.63	2026-01-04 13:34:11.784315	\N
95cee67d-113a-4a39-a528-7d78f568fcf8	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.68.19	2026-01-04 14:47:27.464895	\N
a72accb4-421d-4d23-9242-ed439b569151	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.68.19	2026-01-04 14:51:39.650097	\N
f7bbe801-24ef-44b0-8a2d-94a4e94d0deb	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Fanta	102.89.68.19	2026-01-04 14:57:47.342779	9607428c-e0dc-4fc1-8d3a-09a6c824f393
40cf7648-9e75-4d89-8ece-101a291f7201	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.68.19	2026-01-04 14:59:32.264681	\N
3734124e-35ea-4bd9-881d-279b32f14ce5	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-04 16:09:45.850613	\N
7b056534-e516-461f-b83b-da0e1187ffee	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 2000 4 posted to Main Store SRD for 2025-12-25	102.89.83.161	2026-01-04 16:11:52.035087	c9eb20d9-d8a3-4062-8d22-3421499b0b33
f15a8b20-7879-4d6d-b39b-cd980d8d2ea2	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-04 16:38:51.651982	\N
35b41e5c-b191-43de-93cd-5e1cf9184015	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-04 16:57:03.091475	\N
cf671f90-0368-44b2-9d7e-fb2bf26a376b	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Deleted Item	Item	Item deleted	102.89.83.161	2026-01-04 16:58:20.341911	c9eb20d9-d8a3-4062-8d22-3421499b0b33
8885b380-ccb0-486a-8d73-0c7ffd32bbff	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Pinipple Juice	102.89.83.161	2026-01-04 16:58:38.009998	9690d9bd-79a9-4a79-af02-c48450c3b162
297b8b48-2f5f-4d83-87ad-0f186b54052a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 500 4 posted to Main Store SRD for 2025-12-30	102.89.83.161	2026-01-04 16:58:58.950421	9690d9bd-79a9-4a79-af02-c48450c3b162
41a17299-1422-4811-a88c-c601b9c0e9d8	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2025-12-25	102.89.83.161	2026-01-04 16:59:27.933975	9690d9bd-79a9-4a79-af02-c48450c3b162
919f7cc7-0309-42c4-9752-300caa79bb03	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Deleted Item	Item	Item deleted	102.89.83.161	2026-01-04 17:17:09.874386	9690d9bd-79a9-4a79-af02-c48450c3b162
12ca658a-43aa-4bfc-ba4a-7319833c4323	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-04 17:17:24.89851	\N
4b35a300-fb0c-42dd-bf3a-109e2e5722f9	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Pinipple Juice	102.89.83.161	2026-01-04 17:17:57.696778	e32b0092-be1a-4fe8-bfad-9e346f693401
99033084-0bd3-4c0d-b999-1832c0fd67b0	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Deleted Item	Item	Item deleted	102.89.83.161	2026-01-04 17:18:20.633832	e32b0092-be1a-4fe8-bfad-9e346f693401
d17cf304-2343-428c-b359-a8b01c4be766	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-04 17:18:39.942891	\N
353e2a35-a608-427e-8ab1-405c1e0594b0	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Pinipple Juice	102.89.83.161	2026-01-04 17:19:16.168924	b8415479-cf10-43de-95ce-33735638826e
b9e190d3-cf60-42d2-b009-c2e990629e57	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-04 17:19:26.816096	\N
7415d4b5-29ef-47f2-a88c-35ce9e41f9af	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Pinipple Juice	102.89.83.161	2026-01-04 17:20:49.038492	4cb68d68-635b-49cb-a6a4-0453de898b48
2ee515fe-e64a-4e7a-a75a-6c58af586f82	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Deleted Item	Item	Item deleted	102.89.83.161	2026-01-04 17:21:17.236711	b8415479-cf10-43de-95ce-33735638826e
775c3436-7aef-472e-bb77-706c1cdaf927	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2025-12-30	102.89.83.161	2026-01-04 17:21:34.024759	4cb68d68-635b-49cb-a6a4-0453de898b48
2c4e2daa-6a2f-4919-bac9-3bcddfc427e3	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 500 4 posted to Main Store SRD for 2025-12-25	102.89.83.161	2026-01-04 17:24:27.788162	4cb68d68-635b-49cb-a6a4-0453de898b48
150afd62-7ff6-4265-9634-628996d6753f	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-04 18:30:51.936694	\N
df33cc49-1a85-44ee-ad22-c376af32e39e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 500 4 posted to Main Store SRD for 2026-01-03	102.89.83.161	2026-01-04 18:36:53.36048	4cb68d68-635b-49cb-a6a4-0453de898b48
0315546c-a659-4947-bb7c-ecace4e34353	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-04 20:01:24.747843	\N
c1e22eba-436d-41a8-acbe-7e0a109f51f6	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Sales Entry	Sales	Sales entry for full shift	102.89.83.161	2026-01-04 20:01:50.081035	4da1fe5f-7bde-4bde-a61b-9a5a5781785f
d56331c7-0006-4592-a312-03566ffc05d4	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.72	2026-01-05 02:47:38.557783	\N
4f3e3c47-6b14-4e45-bfa9-3a3e797a9f12	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.72	2026-01-05 03:25:52.226901	\N
0dbed823-695b-4c9c-b17e-d73472bcbe06	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Deleted Client	Client	Client deleted: YOURS HOSPITALITY-JP	102.89.82.72	2026-01-05 03:28:41.53185	5bcdde2d-535f-4d52-b0c0-d4cd945ab107
4cf60324-4b5f-405a-9ce8-48958b6dd314	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Client	YOURS HOSPITALITY	New client added: YOURS HOSPITALITY	102.89.82.72	2026-01-05 03:29:05.453684	d40fe583-f75d-4714-b3b5-9d83a9a332a9
a3c935d6-a164-42a4-b2e9-a20da80b42ea	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Category	Category	New category added: JUICES	102.89.82.72	2026-01-05 03:29:56.825596	b205ea14-19c3-4ae2-ad72-345740062053
0fe24bc1-af93-4ff7-8764-d0d82eea6673	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Category	Category	New category added: FOOD	102.89.82.72	2026-01-05 03:30:25.846848	c936f77b-91cc-432c-9d15-7b7cccd3b83b
473898f3-293b-406d-b004-9b70a5856541	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Bulk Created Departments	Department	Bulk created 1 departments	102.89.82.72	2026-01-05 03:30:56.81843	\N
05ce3e13-383b-4732-84d4-67f93cdc4b4b	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Bulk Created Departments	Department	Bulk created 1 departments	102.89.82.72	2026-01-05 03:31:16.86405	\N
cedbf467-60e2-4a1c-b23f-1b37d9077229	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Pinipple Juice	102.89.82.72	2026-01-05 03:34:49.406165	3d9cba8b-22ba-4785-9afc-e2e6842eee5a
5da6a898-4c92-452f-a1e1-8140a206a740	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	102.89.82.72	2026-01-05 03:35:43.87696	\N
2f139e92-02b9-4fc2-bfd1-9f773fb2443d	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.72	2026-01-05 03:45:07.202898	\N
56f56049-0e15-4db6-9986-5ad5948a2a49	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.72	2026-01-05 03:45:30.744802	\N
0b65d0f1-50ed-4201-bdcf-ad581321501b	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Orange Juice	102.89.82.72	2026-01-05 03:46:05.903048	097eadbb-cad3-4ef9-aab3-21ac8d02e143
2f5a98eb-2b8d-4759-b126-e6715204e12c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2026-01-01	102.89.82.72	2026-01-05 03:48:46.479425	097eadbb-cad3-4ef9-aab3-21ac8d02e143
02d8ea78-3b94-438e-93ed-2c75b2b63fa7	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 500 4 posted to Main Store SRD for 2025-12-25	102.89.82.72	2026-01-05 03:49:04.051573	097eadbb-cad3-4ef9-aab3-21ac8d02e143
4ffa51c5-aecf-42f5-9947-12b768ec5352	5ed0ccee-d55a-4700-b092-efa7e84a1907	Super Admin Credentials Updated	User	Super admin email/password updated via bootstrap (dev=true)	127.0.0.1	2026-01-05 03:49:32.643664	5ed0ccee-d55a-4700-b092-efa7e84a1907
d187f666-0339-46de-a377-2b75c567b0d5	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 1200 4 posted to Main Store SRD for 2025-12-15	102.89.82.72	2026-01-05 03:50:19.68771	097eadbb-cad3-4ef9-aab3-21ac8d02e143
d887c428-a505-4586-b1cc-3026af955355	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Water Melon Juice	102.89.82.72	2026-01-05 03:51:43.306945	595eed6e-8595-413c-a0e0-f78b3e8b0279
f2574928-f3e2-4d1a-bec8-010745f9856f	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2026-01-05	102.89.82.72	2026-01-05 03:52:06.752451	595eed6e-8595-413c-a0e0-f78b3e8b0279
821d67e4-e3e9-4b78-91cc-1f9c10ae8dc2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	102.89.82.72	2026-01-05 04:19:43.860406	\N
e4991ac1-ad4e-46cc-a093-9cf93ae8aac1	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (2/5)	102.89.82.72	2026-01-05 04:20:09.540171	\N
1c13755f-af5d-4f20-8ecc-2b67106bb966	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.72	2026-01-05 04:20:18.352828	\N
c7b20f86-e86a-4114-bcdc-7f1192dc7bd2	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (3/5)	102.89.82.72	2026-01-05 04:20:30.190428	\N
01ed5638-f263-43ad-bc6b-6e867bd65709	0ff460ab-5b96-4b2d-b85f-d04c54faf25f	Demo Login	Session	Demo account login for development preview	102.89.82.72	2026-01-05 04:20:46.227285	\N
890cee0d-295b-4f83-8bf7-41c15721d102	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.72	2026-01-05 04:49:40.544346	\N
4a11af8d-a7cc-4beb-9060-d72f6e287178	5ed0ccee-d55a-4700-b092-efa7e84a1907	Super Admin Credentials Updated	User	Super admin email/password updated via bootstrap (dev=true)	102.89.82.72	2026-01-05 05:11:53.050035	5ed0ccee-d55a-4700-b092-efa7e84a1907
af6bef98-6ea9-4940-8e81-8b62f63a98ec	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	102.89.82.72	2026-01-05 05:12:22.329854	\N
ab99ed3f-371d-4bda-8936-573d1ec2c080	5ed0ccee-d55a-4700-b092-efa7e84a1907	Super Admin Credentials Updated	User	Super admin email/password updated via bootstrap (dev=true)	102.89.82.72	2026-01-05 05:17:43.214225	5ed0ccee-d55a-4700-b092-efa7e84a1907
4a62fb89-bcd6-4ddc-a432-cebc5809d444	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	102.89.82.72	2026-01-05 05:17:58.213796	\N
69d7c0c8-9893-4c24-99e8-355534282893	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.72	2026-01-05 05:40:54.924465	\N
d3909022-d90f-477e-8efa-924ff55d1119	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Sales Entry	Sales	Sales entry for full shift	102.89.82.72	2026-01-05 05:48:23.194035	9ebc56d2-e5e2-48e8-831a-9db3025e2c17
ccc3f4ec-82ad-49e3-bd96-e6013dff5eb4	6419147a-44c1-4f3c-bbcb-51a46a91d1be	create	payment_declaration	Created payment declaration for Mon Jan 05 2026 00:00:00 GMT+0000 (Coordinated Universal Time)	102.89.82.72	2026-01-05 05:48:43.257835	81a3cc7e-8d84-4b4a-a98b-5a73dd306b5c
77945994-0206-4e56-ad73-55db49970c41	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	102.89.82.72	2026-01-05 05:52:14.78238	\N
8606d023-7139-4304-8ad0-ea526537269c	0ff460ab-5b96-4b2d-b85f-d04c54faf25f	Demo Login	Session	Demo account login for development preview	102.89.82.72	2026-01-05 05:53:07.084244	\N
f6111744-67d3-4b0f-9b05-096b5b2625b4	0ff460ab-5b96-4b2d-b85f-d04c54faf25f	Data Export	Export	Exported data in xlsx format. Date range: 2025-12-06 to 2026-01-05	102.89.82.72	2026-01-05 05:53:37.303113	\N
32ab34e5-cb5e-4eee-9a37-82374a723c36	0ff460ab-5b96-4b2d-b85f-d04c54faf25f	Created Category	Category	New category added: PINIPPLE JUICE	102.89.82.72	2026-01-05 05:54:28.851958	cd56eec5-413d-42c2-897d-db44b8cdae32
ad91b4de-f135-42f0-97f6-a00310e8d349	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	102.89.82.72	2026-01-05 06:00:21.3174	\N
65f5a087-f224-4e45-88cd-b73f68824d71	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.91.93.139	2026-01-05 15:39:03.465133	\N
c864f01a-2936-438f-a6a3-1973db0cdbcc	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Supplier	Supplier	New supplier added: Ighodaro Nosa Ogiemwanye	102.91.93.139	2026-01-05 15:40:10.21699	367823f0-2197-40bd-9bc9-1847d653f8b0
a7c0f36b-907b-4f2d-9f3d-0cb832044771	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created GRN	GoodsReceivedNote	Invoice: WSG234, Amount: 20000.00	102.91.93.139	2026-01-05 15:41:29.304503	c617523a-929c-4180-b5fa-69ba34d069df
1f30e144-4ca1-4bb9-8162-60363a006ad7	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 300 4 posted to Main Store SRD for 2026-01-01	102.91.93.139	2026-01-05 15:46:41.331996	595eed6e-8595-413c-a0e0-f78b3e8b0279
683a521d-d392-4990-8a48-95e7e0f15114	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.91.93.139	2026-01-05 16:38:53.161442	\N
049e8cb0-cb5c-4426-8f57-99f92b74e5bd	5ed0ccee-d55a-4700-b092-efa7e84a1907	Super Admin Credentials Updated	User	Super admin email/password updated via bootstrap (dev=false)	102.91.93.139	2026-01-05 16:43:47.641824	5ed0ccee-d55a-4700-b092-efa7e84a1907
d2fbc967-da2c-4a62-8327-3933e2c69d99	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	102.91.93.139	2026-01-05 16:43:54.278181	\N
755b7502-3163-40f0-81bb-4c79463f248d	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.91.93.139	2026-01-05 16:48:34.441944	\N
1918cd67-6c1b-4241-89ea-8a60cd0fdd9c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.91.93.139	2026-01-05 17:13:36.228269	\N
1c6ecd1e-6176-4794-b926-f1116bd2d0f8	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 1	102.91.93.139	2026-01-05 17:15:57.389232	70891294-eb84-417f-ac12-e0f8f17ddd93
9051c08f-d03f-4fe4-b8f5-30612ce918e6	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 1	102.91.93.139	2026-01-05 17:22:05.881218	710b649d-1f25-4e27-a9a1-cb68044c91b4
34f436f5-767f-4675-b085-8ba76276a9fb	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created waste movement with 1 items, total qty: 1	102.91.93.139	2026-01-05 17:22:20.752784	660479a1-6078-4469-90a8-663be16a03e7
8eeae6aa-24d3-4ca7-825d-35c0aa65cd2a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.91.93.139	2026-01-05 17:23:20.190143	17394d2b-3d23-4918-a012-d85b0d0a6251
693036fd-2fe1-40b7-aa79-89671163d286	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 03:40:54.969666	\N
7c436672-5a65-4e08-8816-fe8bb40dee25	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 5	102.89.83.161	2026-01-07 04:27:43.903682	880427cb-b287-4d75-9d89-0765941eefeb
ad3b3dec-2471-4f57-a1c8-4e79f2532501	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 100	102.89.83.161	2026-01-07 05:27:31.990429	863910f1-ecf7-4a04-9824-4c37fe928ee1
9fd1f423-3b41-4113-86df-db257d7a00cb	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 50	102.89.83.161	2026-01-07 05:28:58.657736	bf881fb4-f51c-4bc0-8fe8-211227e3e623
5a9a2c86-332a-47b0-9c25-d2f216c49859	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 20	102.89.83.161	2026-01-07 05:33:15.458251	18b7fa41-d173-464d-870b-9931c73b2a49
1cae5ea7-fb13-490e-976b-0f5e41187e94	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 06:12:24.22402	\N
1277c738-0e9f-4612-9567-4951c0926b16	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (1/5)	102.89.83.161	2026-01-07 06:14:40.344015	\N
1da010f2-b005-4140-a7f1-6be516bd0944	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login Failed	Session	Invalid password attempt (2/5)	102.89.83.161	2026-01-07 06:14:51.702241	\N
58621580-8af8-4643-a1f3-80bca1449b78	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 06:15:07.883493	\N
7211ef63-ad1e-47fc-afce-7515c277dbc6	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 06:19:37.93564	\N
4df49163-7cab-4e5f-972f-86e3de82d7d7	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 06:26:28.107646	\N
237e571d-6356-466e-93e0-1d7f5e3cee2d	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 06:28:35.250183	\N
89be98a2-d282-48f6-9ec8-519d0e24f10e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login Failed	Session	Invalid password attempt (1/5)	102.89.83.161	2026-01-07 06:37:46.600536	\N
cd124ab5-4c91-4b75-a8c3-2ee63c352df9	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 06:37:56.321246	\N
b088a525-993b-4efd-9783-407937bb6bc0	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 07:04:49.749881	\N
36f6bc87-1ff2-45ca-a587-27e968889278	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Deleted Item	Item	Item deleted	102.89.83.161	2026-01-07 07:10:09.589329	595eed6e-8595-413c-a0e0-f78b3e8b0279
889e2b67-92be-49c0-be0c-eef370b0b796	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Item	Item	New item added: Water Melon Juice	102.89.83.161	2026-01-07 07:10:34.27792	a8606352-f7d1-40e6-8500-8ffcbcc12924
33ef03d6-5428-4cc0-b025-5ccb01108f66	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2026-01-01	102.89.83.161	2026-01-07 07:10:53.377218	a8606352-f7d1-40e6-8500-8ffcbcc12924
1cf9d2ae-f328-44c1-91b8-7ad037854ec4	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 07:43:57.485406	\N
eb8b6d7e-f0a0-43f5-ade6-3193cd2f4c24	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 1	102.89.83.161	2026-01-07 07:50:07.010429	83a3b8e2-6703-462d-b924-315cc28f138a
b2d7bbef-0f07-49dd-8c32-cc7e1fe8cda6	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 07:55:50.990042	\N
99df1781-3c6a-44f4-acff-3f873c399e14	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Reversed Stock Movement	StockMovement	Reversed issue movement. Reversal ID: 96db7e1e-0213-45f1-ba37-05e340992f2e. Reason: td	102.89.83.161	2026-01-07 07:57:49.534749	72243d47-1c20-4ad7-9465-28f601b6aede
2cf1dfa2-9265-4607-ae9b-6a040ed6ef9e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 5	102.89.83.161	2026-01-07 08:02:21.344984	2a4f4c47-414a-432a-9c67-91fbae34e9dd
6a24c372-97d7-4b45-a684-6f1d275b90bd	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 5	102.89.83.161	2026-01-07 08:02:38.887542	d8f7944c-37f4-46a3-b14a-2f78a0c7f4a1
3d7e35bc-797a-4a98-9aef-43394b51efcb	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 09:32:26.148442	\N
3d5bc23c-ee5c-4c84-8c85-e42508a4a85e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 100	102.89.83.161	2026-01-07 09:55:02.626877	32fca88d-1327-461a-958c-f3bc21d6f1cb
80405d54-11ca-440b-96ce-f17ea3ddfd29	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.161	2026-01-07 10:45:39.781588	\N
2d7f204c-53c5-47b7-b197-ff3c55494786	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2026-01-01	102.89.83.161	2026-01-07 10:47:38.86134	097eadbb-cad3-4ef9-aab3-21ac8d02e143
7df3a59f-b367-4db2-9980-c81d8712e5c2	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Email Verified	User	User verified their email address	102.89.83.161	2026-01-07 10:51:41.712411	a62196b8-c91c-465d-9f3d-35e82bb6d0d2
ae556ac1-672b-4d64-8442-0222e94f21c2	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 10:52:17.841188	\N
9c92c6bf-436d-45b4-9570-91d18810d4f1	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 11:00:07.3753	\N
a0e707b4-3f8d-4742-9a85-a526319465dc	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Client	JAMSON SON'S LTD	New client added: JAMSON SON'S LTD	102.89.83.161	2026-01-07 11:00:46.502738	362dc0ec-8ece-472a-adf9-7724cf6aa3fa
2621341c-30ed-4ce7-aeab-b2517504756e	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Category	Category	New category added: WHISKY	102.89.83.161	2026-01-07 11:01:05.087473	710e6847-d3f6-4ed8-b4ea-06793a24dbcc
e07894f5-908a-4fd2-817a-26288b197ac7	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Category	Category	New category added: SOFT DRINK	102.89.83.161	2026-01-07 11:01:22.532779	43f2e95f-b9b4-46c4-a54c-eaa21c713b5f
40257829-e773-44e1-9e10-e79af94e8bdc	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 23:31:51.432115	\N
a5fb02dd-9354-497d-84fa-af3d612102bf	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Category	Category	New category added: WINE	102.89.83.161	2026-01-07 11:01:31.378475	35028502-f1bd-41c8-8d46-cc46dab821f5
2cbddef3-376b-445d-b149-b43e59e7c91f	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Category	Category	New category added: BRANDY	102.89.83.161	2026-01-07 11:01:43.634153	9e2cb610-3453-4fbf-9d8f-b37471d534bf
100759fe-fbfe-42d5-9d28-0d878873f2de	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Bulk Created Departments	Department	Bulk created 1 departments	102.89.83.161	2026-01-07 11:01:55.737095	\N
85174c49-a85f-48c1-9a9f-8b82023d3b98	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Bulk Created Departments	Department	Bulk created 1 departments	102.89.83.161	2026-01-07 11:02:06.805379	\N
e86637a1-8c14-4ba5-89e2-9a6a0e3aae09	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Deleted Department	Department	Department deleted	102.89.83.161	2026-01-07 11:02:21.600001	60fa0879-33c1-4ee6-83bf-3913bddb3d13
dd83ff07-258d-4fe4-bec2-c262b2ded0bc	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Deleted Department	Department	Department deleted	102.89.83.161	2026-01-07 11:02:26.961984	a03c66a1-6ea5-4af7-8b01-f203ee89ca38
7f1ec6ed-66a2-44a7-84b4-4ac7ceb925d2	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Bulk Created Departments	Department	Bulk created 1 departments	102.89.83.161	2026-01-07 11:02:51.746224	\N
edc21b2d-67d9-47e2-89a4-0104deac5982	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Bulk Created Departments	Department	Bulk created 1 departments	102.89.83.161	2026-01-07 11:03:03.584518	\N
0f705d4e-c0ec-4ce6-9cf1-f7f0230174f7	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Fanta	102.89.83.161	2026-01-07 11:03:37.391092	81e95ddd-7cab-4b5a-9d73-df0392dab3f1
ff191625-090f-4301-9ed4-4459a3596d4b	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Coke	102.89.83.161	2026-01-07 11:04:12.806206	25dd45e4-bede-42db-9202-5596d0b6119e
1676346a-b2fe-49a7-9073-6be168bd2fbe	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 11:12:15.49427	\N
aeb91792-a9b7-4dce-adb6-ea6cc7e0e64d	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Malt	102.89.83.161	2026-01-07 11:13:16.857282	7035af8f-5550-4120-b3d7-6dae1eab3e91
662af0fb-59ba-49fb-8b80-177835d41ce4	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Henessy	102.89.83.161	2026-01-07 11:13:47.786864	9bfb31d9-776c-4e4e-a70b-463afbaf8943
8da87b29-261b-497b-8247-9ea57ede25d1	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Deleted Department	Department	Department deleted	102.89.83.161	2026-01-07 11:15:52.981926	5c0cc6c6-6ff9-4bbe-9969-2fcdcb958b11
6414ff7f-c1f5-4d2d-99cb-5967156eb606	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Bulk Created Departments	Department	Bulk created 1 departments	102.89.83.161	2026-01-07 11:16:05.103368	\N
fd80b098-08bd-4c11-b873-75c4ac4c5186	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 1000 12 posted to Main Store SRD for 2026-01-03	102.89.83.161	2026-01-07 11:22:11.694907	7035af8f-5550-4120-b3d7-6dae1eab3e91
79a663f5-6664-4370-845b-4566e3e35c2d	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 1000 12 posted to Main Store SRD for 2026-01-05	102.89.83.161	2026-01-07 11:33:33.482901	25dd45e4-bede-42db-9202-5596d0b6119e
2d2a3636-ae25-4039-987d-395d80075bd4	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Sales Entry	Sales	Sales entry for full shift	102.89.83.161	2026-01-07 11:34:20.344228	e56b6510-d5ca-486d-9e4c-9e55b8ac29dc
e92219f9-45d6-4820-884b-6510c7e35a9e	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	create	payment_declaration	Created payment declaration for Wed Jan 07 2026 00:00:00 GMT+0000 (Coordinated Universal Time)	102.89.83.161	2026-01-07 11:34:59.852016	e65a8450-bf7c-429c-bdd9-49b6b09b1dc8
11c319fc-9b4f-4690-bb59-00c35f99930b	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Supplier	Supplier	New supplier added: ZOE LOGISTICS	102.89.83.161	2026-01-07 11:35:43.069797	c30c0615-39d3-4c39-bdac-c14052cd131a
2b0d3c30-d745-4550-a964-6793e69afc12	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created GRN	GoodsReceivedNote	Invoice: WSG234, Amount: 100000.00	102.89.83.161	2026-01-07 11:36:36.338704	2e7e0539-40d2-4986-aaeb-6d2f2e60a93f
c01de26c-9695-4b57-890f-021ef466566e	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 10	102.89.83.161	2026-01-07 11:40:37.379932	267132cb-8cfd-4b77-a18d-e4499cb6be97
797aca81-af4a-40ff-a11a-3dcef54a0384	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.83.161	2026-01-07 11:43:30.481386	108f1157-e6f9-4de0-8d8b-8d6b74774304
8d197567-15e2-4ffd-be74-c31003b993f0	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Reversed Stock Movement	StockMovement	Reversed transfer movement. Reversal ID: 011078e8-71c4-4637-8e51-b84d421a049f. Reason: un	102.89.83.161	2026-01-07 11:44:07.51163	267132cb-8cfd-4b77-a18d-e4499cb6be97
3605a455-ba12-4bde-96ae-e6e8a435813c	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 50	102.89.83.161	2026-01-07 11:51:49.823531	0d56ca50-68a6-4774-95f8-69902361c8cb
aa298819-984b-415e-863f-21014f3115a2	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 50	102.89.83.161	2026-01-07 11:52:39.60231	ec429552-0750-4098-8a85-8932449db531
57044fde-c57a-42d4-b176-05923354578e	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 5	102.89.83.161	2026-01-07 12:01:56.928068	f3bb1383-c39c-44b0-9ca4-4135d12d598c
d8c1d107-df09-4815-b372-677526f36d25	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 10	102.89.83.161	2026-01-07 12:03:58.625351	57eecad0-a625-4d4b-8fc0-3a30cf8d1fa2
c1bcbf03-23b8-4737-a72a-933807cd2da5	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 20	102.89.83.161	2026-01-07 12:05:06.784766	11530418-854d-4327-8193-de884f14e3d1
1153e80c-7ff9-4509-b71f-7a359944ff7b	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 12:14:31.056593	\N
805f12a1-6727-430b-ae4b-b70847e0aae3	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 5	102.89.83.161	2026-01-07 12:18:09.319458	02577f64-0fbb-4913-a933-c39ed62987c4
82e47ff7-9211-49b9-85e4-e91492619c0e	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created waste movement with 1 items, total qty: 5	102.89.83.161	2026-01-07 12:18:27.434045	4643091b-cfac-4800-8fef-6bd3c16331c2
97846c5e-b7af-4943-8ed5-45f0a9674971	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	Login Failed	Session	Invalid password attempt (1/5)	102.89.83.161	2026-01-07 12:36:59.617796	\N
fc5dd704-fd71-4ab3-be1d-53231c1c4523	f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	Login Failed	Session	Invalid password attempt (2/5)	102.89.83.161	2026-01-07 12:37:00.566735	\N
22c9e5f7-977f-478b-9fcd-3da942d0be27	\N	Login Failed	Session	Failed login attempt for: ighodaro.efeamdassociates@gmail.com	102.89.83.161	2026-01-07 12:37:24.21492	\N
002bbea6-2869-4f29-9037-d2770ea00c1b	\N	Login Failed	Session	Failed login attempt for: ighodaro.efeamdassociates@gmail.com	102.89.83.161	2026-01-07 12:37:24.793729	\N
f5d85965-4862-4743-82aa-2a14339d1955	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 12:37:36.443978	\N
a3dccbab-cdd8-4b74-ab85-dc99fe645c5c	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Reversed Stock Movement	StockMovement	Reversed waste movement. Reversal ID: 56639b9d-45d9-4853-955e-b6b79c100c08. Reason: u	102.89.83.161	2026-01-07 12:38:45.006577	4643091b-cfac-4800-8fef-6bd3c16331c2
17d4a95f-e8fc-490c-afdb-fc511c149222	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 20	102.89.83.161	2026-01-07 12:56:24.564377	fb6c8e6e-f90d-4bf2-92c6-63c7945be3bb
a9a6bb25-02a1-491b-826e-09423ffd36a5	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 20	102.89.83.161	2026-01-07 12:57:49.166543	171f5a80-ffbf-4a04-810c-d59aff091d6b
55138dc8-6070-4251-bab4-baed6ac333e9	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 20	102.89.83.161	2026-01-07 12:58:10.824016	9074920b-c050-4cf8-a581-221a47aa9592
5fdff129-bb5e-4a02-8fa3-c77c1588c504	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 100	102.89.83.161	2026-01-07 13:04:53.61447	fd0abc9f-583b-4c19-8953-63f3dc715523
26ae38b0-093e-41a6-a41d-7baaefb8d395	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 100	102.89.83.161	2026-01-07 13:05:15.514522	fdb4167e-cd2d-4907-8ff3-f507719b1c33
0c6adc6b-ada7-4e70-9271-7956d4061960	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Reversed Stock Movement	StockMovement	Reversed transfer movement. Reversal ID: 688c2a02-b1d0-488f-9a34-8baa08e7a4ad. Reason: k	102.89.83.161	2026-01-07 13:16:53.280493	fd0abc9f-583b-4c19-8953-63f3dc715523
fe3b786f-4905-461b-b6dd-b96f65600b46	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.83.161	2026-01-07 13:25:11.838547	63402487-9ba9-4d77-ae17-e85113509721
2036be8a-d487-4cae-a6cf-6ffbb73d8626	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login Failed	Session	Invalid password attempt (1/5)	102.89.83.161	2026-01-07 14:34:41.549853	\N
18f8ecf4-e18c-4116-bcce-44dd78afede2	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 14:34:50.641311	\N
fcd73682-e8b0-4b73-9844-1164eb3f73d6	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Deleted Client	Client	Client deleted: JAMSON SON'S LTD	102.89.83.161	2026-01-07 14:35:04.391466	362dc0ec-8ece-472a-adf9-7724cf6aa3fa
5ae62b4c-8617-4ed8-918b-40730907ebdb	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Client	ZOE ENTERPRISE LTD	New client added: ZOE ENTERPRISE LTD	102.89.83.161	2026-01-07 14:35:21.271193	0d947773-28ee-4e02-b5b6-40455566817d
a084b6aa-c5d1-472c-86d4-ecb70a3277e4	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Category	Category	New category added: F&B	102.89.83.161	2026-01-07 14:35:48.189841	b098cb17-0f0b-4dfe-9552-71be8a493d35
cceeea31-7aa0-488d-996e-1832e3f5314f	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Category	Category	New category added: BAR	102.89.83.161	2026-01-07 14:36:34.033101	85d266e6-3ef8-4434-b5f1-b234ecd1eace
768e1055-f785-437f-9ad4-f05d911fa70f	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Bulk Created Departments	Department	Bulk created 1 departments	102.89.83.161	2026-01-07 14:36:56.048322	\N
280cca94-cdc3-4f33-b520-af246759a7d4	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Deleted Category	Category	Category soft-deleted: BAR	102.89.83.161	2026-01-07 14:37:24.907895	85d266e6-3ef8-4434-b5f1-b234ecd1eace
563e3e67-5e73-4359-9c65-7b0d5215e314	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Category	Category	New category added: DRINKS	102.89.83.161	2026-01-07 14:37:36.888768	7518184e-b0f3-48b8-93fb-901a1eccd71d
f984fa01-6cc9-4fe9-91a8-45bb85d72ae4	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Bulk Created Departments	Department	Bulk created 1 departments	102.89.83.161	2026-01-07 14:37:55.100575	\N
f3aa34a7-988c-48f8-8528-6d08c69e8270	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 14:41:09.663413	\N
a96d84e5-4751-4f29-8389-5daff42c1bdd	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 14:45:07.361542	\N
2c3ecb5d-e78c-4f3e-afff-827a4cd32fbd	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 14:51:20.779701	\N
1e2858db-f5ea-42c1-939f-29a1df2ab1ab	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Supplier	Supplier	New supplier added: Edmond Global resources Ltd	102.89.83.161	2026-01-07 14:52:06.129567	2de7ad8b-1394-4cc1-93a4-947f38c88c77
092b449a-93bf-4ae6-a4a9-602097a5ce78	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created GRN	GoodsReceivedNote	Invoice: WSG234, Amount: 100000.00	102.89.83.161	2026-01-07 14:52:46.746753	e61a5994-d67f-4191-901a-9a00749f0527
a3b6d7f2-a9f1-4e84-8374-d38045e41118	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Malt	102.89.83.161	2026-01-07 14:55:03.737735	2329f86b-aabd-4aac-b4f2-8e572f51588b
05716d99-bf90-401e-a6bc-00e78d25fe89	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Fanta	102.89.83.161	2026-01-07 14:55:34.985454	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c
6b4b793c-edd0-4edf-a38f-490b27be3792	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Chicken Fries	102.89.83.161	2026-01-07 14:56:35.615763	2a1eaab7-56a8-40d9-8fc3-d379beec67b2
71ecc308-0bbd-4e40-b8f2-4ddca9dc678c	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 1000 12 posted to Main Store SRD for 2026-01-07	102.89.83.161	2026-01-07 14:57:19.145381	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c
2c23b6d3-014d-4d10-ba60-068ccfb39a85	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 999.96 12 posted to Main Store SRD for 2026-01-07	102.89.83.161	2026-01-07 14:57:30.677777	2329f86b-aabd-4aac-b4f2-8e572f51588b
a1cf933f-6908-4730-bb2a-7147a3a0202f	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2026-01-07	102.89.83.161	2026-01-07 14:57:38.20306	2a1eaab7-56a8-40d9-8fc3-d379beec67b2
eccfd341-4c17-44eb-bd06-fb0d155fb271	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 17:37:51.628879	\N
708b8ac0-dd3b-42cf-b2bd-6af581ebeb17	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Sales Entry	Sales	Sales entry for full shift	102.89.83.161	2026-01-07 15:02:51.997731	3c96041f-2ae0-4804-87b3-7d81d823e0bc
567016e7-b93e-43f9-8594-a3064e30849b	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Sales Entry	Sales	Sales entry for full shift	102.89.83.161	2026-01-07 15:03:19.833196	ed80e1cf-b4b7-4cf2-a48a-1c9bd6d04c6f
4483ebf3-e2fe-402a-a1a9-9f9b97b0b1ad	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	create	payment_declaration	Created payment declaration for Wed Jan 07 2026 00:00:00 GMT+0000 (Coordinated Universal Time)	102.89.83.161	2026-01-07 15:04:34.796556	db268c84-4a2a-4608-833c-3a3b7b66cca9
edac6d72-e91a-4af0-9f52-fb316a18dc5e	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Reversed Stock Movement	StockMovement	Reversed issue movement. Reversal ID: 6cd216a8-d8ec-4137-8161-d20b56ad1099. Reason: z	102.89.83.161	2026-01-07 15:14:15.439349	beb7ebf8-e0e9-4841-bffc-ddfb166d2ed2
bf18500f-7d26-442b-a0fe-62989d5617ab	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 10	102.89.83.161	2026-01-07 15:19:15.286984	ea693a34-10dd-45b4-aadb-a01e402b3b3d
59688228-5322-4f72-908f-5c120e567d76	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 10	102.89.83.161	2026-01-07 15:21:06.864862	93ea492b-2b76-480c-996b-56f25b9c32fe
b030fade-0fdb-449d-a943-7795507ca729	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.83.161	2026-01-07 15:33:54.504627	\N
1469556e-9668-4713-9945-d36040bdd34c	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.75.77	2026-01-08 01:50:20.180251	\N
295ed179-d7bd-4756-9f32-68a23c34b71b	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Updated Purchase Event	PurchaseItemEvent	Updated fields: qty, unitCostAtPurchase, totalCost, supplierName, invoiceNo, notes	102.89.75.77	2026-01-08 01:51:47.062183	ef7830b1-0fa7-4fa1-b3f6-4d76fc01679d
8e3a3ff4-7a6a-440b-82c8-2d75e343d2cb	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Reversed Stock Movement	StockMovement	Reversed transfer movement. Reversal ID: 9f4babe7-a763-486d-bbfa-5983a9a60202. Reason: fd	102.89.75.77	2026-01-08 02:03:52.111737	93ea492b-2b76-480c-996b-56f25b9c32fe
a7f8ee89-7b45-4740-83ad-afaadc20774b	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.75.77	2026-01-08 02:06:33.078988	40d96b6e-d1c7-414c-92ba-5f128b15bac7
02bd7b91-3b8e-4e4f-9df7-521e8740d3f3	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Edited Stock Count	StockCount	Stock count updated (ledger recalculated)	102.89.75.77	2026-01-08 02:09:32.556599	40d96b6e-d1c7-414c-92ba-5f128b15bac7
aa9fd48c-ee4b-4893-90db-71620c12eb77	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created waste movement with 1 items, total qty: 5	102.89.75.77	2026-01-08 02:17:27.549972	98817a96-61fd-47b7-a753-668b16f07a05
98198682-66ce-4d82-936c-44566163d743	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 50	102.89.75.77	2026-01-08 02:22:58.771485	e1a4f183-875d-4bf5-a8c7-4b536293af14
94b3c235-6d64-4c2e-8450-38972b135142	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.75.77	2026-01-08 02:36:35.59452	\N
f183214a-67cd-4e16-b2b1-14571eed4566	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.75.77	2026-01-08 04:13:22.340962	\N
40da9ca9-96cc-4aba-b7b7-b7e2efab6637	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.83.204	2026-01-08 13:17:20.259622	\N
8ed854d8-dcca-40f4-a249-44e9e6ae2c84	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	146.70.246.168	2026-01-08 20:05:53.589519	\N
434c44df-d1f0-48d8-868b-3caf8fd3fd0a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Item Purchase Captured	Item	Purchase of 2000 4 posted to Main Store SRD for 2026-01-08	146.70.246.168	2026-01-08 20:10:59.06999	a8606352-f7d1-40e6-8500-8ffcbcc12924
07df9f2c-2ef7-4c82-8a58-5b2723056fa8	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Edited Stock Count	StockCount	Stock count updated (ledger recalculated)	146.70.246.168	2026-01-08 20:29:12.810543	17394d2b-3d23-4918-a012-d85b0d0a6251
5e7fadfd-b832-4b84-b7d8-325d286e9ff4	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Count	StockCount	Stock count recorded (SRD updated)	146.70.246.168	2026-01-08 20:35:31.553641	665640df-edaa-46c9-8dd4-5588f065c08f
579215a0-8786-471e-8153-411539252618	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Count	StockCount	Stock count recorded (SRD updated)	146.70.246.168	2026-01-08 20:38:45.650618	fb87ee82-b333-43db-9bc9-7ef97d43eb05
eaf0e32e-0b01-4057-b1b5-719bd6a81ac2	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	146.70.246.168	2026-01-08 20:50:41.903315	\N
dded496e-68ce-40b5-8880-da3e252e17a9	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	146.70.246.168	2026-01-08 20:53:33.518066	\N
83d788c0-f0f5-40d5-a4a7-a7f3035f880a	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	146.70.246.168	2026-01-08 20:57:31.714571	e8a99023-6736-4c45-a528-7853a19787f8
c72f9d0f-f173-489d-addf-2898f6cfec2a	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	146.70.246.168	2026-01-08 21:00:13.02942	462e7fcb-0c3d-4441-af2c-5616b7fa1428
3e61ef63-5273-4f95-afc0-1bb1a6eced10	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Edited Stock Count	StockCount	Stock count updated (ledger recalculated)	146.70.246.168	2026-01-08 21:01:24.954699	462e7fcb-0c3d-4441-af2c-5616b7fa1428
3c78730f-2c13-4813-b8fe-60c64a7be9f1	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Count	StockCount	Stock count recorded (SRD updated)	146.70.246.168	2026-01-08 21:04:45.191393	bb587932-f58d-4c65-afa1-1d929d7205b3
b0cbaa39-2a83-4c03-8bb4-443311e4677a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 25	146.70.246.168	2026-01-08 21:09:54.514352	d76127d5-fc17-47d1-b28a-74c392bf0ab3
c99b6908-440f-4cbe-b332-06732898b1be	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Count	StockCount	Stock count recorded (SRD updated)	146.70.246.168	2026-01-08 21:13:16.226437	81d0d4b6-0629-4d81-bf93-da2ee7bb396f
85b2dad4-73bd-47f0-b33d-bb476cbfc4ab	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 1	146.70.246.168	2026-01-08 21:23:51.457673	a917f81e-0da3-46fb-8826-2bf3570ae2e4
2f9081f3-6255-47f0-85ba-7a70df473677	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Reversed Stock Movement	StockMovement	Reversed transfer movement. Reversal ID: aba8eae0-5db8-4246-a614-0fe6f9508299. Reason: x	146.70.246.168	2026-01-08 21:24:02.410318	a917f81e-0da3-46fb-8826-2bf3570ae2e4
82f04921-7a37-4151-8577-e0d6a34ce835	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 1	146.70.246.168	2026-01-08 21:24:28.746896	77c79a18-54b1-407e-a9c9-08bc844622c0
297be727-4fe5-4efb-9a3c-79a62852e765	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.10	2026-01-09 09:35:03.808517	\N
c616f9b6-bff4-4afb-8058-1c74bca01431	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 50	102.89.76.10	2026-01-09 09:45:53.33655	a8fdf9a4-9914-46ab-a110-c4d4a3633c72
8edc6631-c5e2-419c-9829-1a3a30640e11	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 20	102.89.76.10	2026-01-09 09:49:20.516888	4a0349fe-d1c8-4455-81f3-f8377f686d3d
d67ac8fa-a7b4-46c3-a59a-c2d089222693	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 20	102.89.76.10	2026-01-09 09:50:27.482826	8562da61-56a0-44dd-8ea8-0be885924dfc
0b3b5447-cea0-423d-94fd-63ba1efccc92	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 5	102.89.76.10	2026-01-09 09:52:24.205725	44d11d1b-93fd-4f7a-9902-0dda499662a7
da2b1b3a-e79a-444e-972b-bcce511cde27	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created waste movement with 1 items, total qty: 5	102.89.76.10	2026-01-09 09:52:44.151418	5a5c950e-b0fb-43bc-91aa-7a0ac21c449f
b8914c51-ceeb-4b9d-82ac-8b8444fc3c73	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.76.10	2026-01-09 09:54:04.248398	5c6c57fe-5d52-4df9-b672-a0a58d0ac86d
5cba5a68-bc2d-4ddd-9501-92c4a46f870e	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.76.10	2026-01-09 09:56:08.051946	816ed2bb-f572-4dc9-8132-ece2aa4d28d6
0e017884-e541-4304-9e6a-4438ca511dbc	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.76.10	2026-01-09 10:20:59.019181	\N
91d2bb96-9e17-4936-ae94-a9b133732541	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 30	102.89.76.10	2026-01-09 10:41:54.621723	7cf2b513-ae89-4135-9b57-92fe96fd1a05
60c52224-3823-4443-ad08-0f81fff32254	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created waste movement with 1 items, total qty: 20	102.89.76.10	2026-01-09 10:42:18.612132	0c69c65f-f4ca-431e-a2a7-b0ad62d9cef5
133e13cb-58fd-495e-b738-3f1f810de72b	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 20	102.89.76.10	2026-01-09 10:47:03.756009	725967e6-83de-41f9-83a1-b297884b49f8
eb76ab49-5e54-4cd9-bf9f-178597913e30	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 30	102.89.76.10	2026-01-09 10:47:23.66819	49dfba4c-67e4-4d83-8af0-075e105dc797
b124022a-1c54-40a1-be1e-1a63d074125b	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 30	102.89.76.10	2026-01-09 10:50:03.823096	fdd4835b-b036-4d76-b2b3-70a07e1fd4e4
b57627cf-8c1e-4f47-be97-6ce092f14094	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login Failed	Session	Invalid password attempt (1/5)	102.89.76.10	2026-01-09 12:22:56.887507	\N
30ec77b5-c3ef-41a8-ac0a-9b57500b28fc	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login Failed	Session	Invalid password attempt (2/5)	102.89.76.10	2026-01-09 12:23:12.913528	\N
a46f0264-32e9-4337-aee2-4737bc83d399	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login Failed	Session	Invalid password attempt (3/5)	102.89.76.161	2026-01-09 18:31:13.288217	\N
eaa66b13-1a8c-4c0a-83f4-0e3ac25aa8f3	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.76.161	2026-01-09 18:31:49.863087	\N
7fc68e1f-0c4a-413f-a7ec-197529d34d66	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.76.161	2026-01-09 18:47:08.984826	\N
0d93ef90-55bb-4590-840f-bc4b19f90d84	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login Failed	Session	Invalid password attempt (4/5)	102.89.76.161	2026-01-09 19:16:02.716428	\N
25dd8be1-95df-4473-9456-597a40e23e46	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 19:16:18.425775	\N
a7e768e5-86ab-475f-a2b8-48afcef857a5	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login Failed	Session	Invalid password attempt (1/5)	102.89.76.161	2026-01-09 19:29:55.010817	\N
14869f49-e308-418e-8c96-17be7ca31bc3	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login Failed	Session	Invalid password attempt (2/5)	102.89.76.161	2026-01-09 19:30:27.348296	\N
5013621e-e408-4acf-bef6-3723e0fc218c	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 19:30:55.515273	\N
732188c5-c275-4de5-a3b5-a439b264d46a	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 19:51:39.332946	\N
5046a2bb-d840-435e-865c-8d00f24a8bbf	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Fried Fish	102.89.76.161	2026-01-09 19:54:15.562764	a09560f4-54bc-4640-9efa-295f4b665032
bc82be62-08f8-407c-bcc4-797de188a6fa	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2026-01-09	102.89.76.161	2026-01-09 19:54:36.147494	a09560f4-54bc-4640-9efa-295f4b665032
5b9b139d-893b-41c9-9e1d-13d612202e52	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Deleted Purchase Event	PurchaseItemEvent		102.89.76.161	2026-01-09 19:54:58.087097	f812c03f-d6df-476b-b110-fecf22fa267d
506f4b35-69ec-4653-ae0d-71a983d36a52	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 2000 4 posted to Main Store SRD for 2026-01-09	102.89.76.161	2026-01-09 19:55:31.2623	a09560f4-54bc-4640-9efa-295f4b665032
85f3722d-4932-4ec6-b18f-e7c0010594be	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Updated Purchase Event	PurchaseItemEvent	Updated fields: qty, unitCostAtPurchase, totalCost, supplierName, invoiceNo, notes	102.89.76.161	2026-01-09 19:56:10.330359	40f596ed-c2a5-4220-a15e-b25c9525535a
4f7dec19-f024-4d40-8a1e-2d71fdb6a5e8	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Deleted Purchase Event	PurchaseItemEvent		102.89.76.161	2026-01-09 19:56:41.895336	40f596ed-c2a5-4220-a15e-b25c9525535a
6f1469ad-bf9f-426e-b7cb-13012a668328	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 1000 4 posted to Main Store SRD for 2026-01-06	102.89.76.161	2026-01-09 19:57:11.732978	a09560f4-54bc-4640-9efa-295f4b665032
5058261c-2097-42e1-85c8-618d65889e61	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.76.161	2026-01-09 19:58:53.647777	9f188f04-a985-459d-97a0-d46e2e769264
855294d4-373e-4395-84f3-2eaea9cf8f14	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 20:06:25.587202	\N
e8df769f-cc64-43b8-810f-321be5bc6611	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 20:07:57.56882	\N
fe57b787-6738-4496-8655-b6b513af8c4e	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login Failed	Session	Invalid password attempt (1/5)	102.89.76.161	2026-01-09 21:09:12.773833	\N
778ec442-d48e-4b45-9ccf-a354383b1609	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 21:09:24.687595	\N
b52cc0cd-e8d8-422f-afa7-6ad5d243b4a6	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 23:13:50.045284	\N
ec4b84e9-e78f-407b-bbf5-c060f224261b	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 1300 4 posted to Main Store SRD for 2026-01-06	102.89.76.161	2026-01-09 23:17:22.270545	2a1eaab7-56a8-40d9-8fc3-d379beec67b2
f69aac32-9d24-4575-bc1c-ff19fa952870	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Bulk Created Departments	Department	Bulk created 1 departments	102.89.76.161	2026-01-09 23:35:37.583947	\N
57da8952-7328-4474-a9d5-6f0194dc3ba4	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 20	102.89.76.161	2026-01-09 23:36:11.07757	7be969c7-5d2b-4273-8193-9a8112215a4a
f9329a0a-7ac0-43b1-b5a0-9eca0d0fb09f	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-09 23:45:48.551472	\N
eef75321-7fe5-4641-83dc-67ff2166aabb	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 40	102.89.76.161	2026-01-09 23:47:04.861503	73304b63-7645-439f-893f-4ed7fd7c2424
e597cbf3-6ef8-4f01-bab7-4ff1ff348bd6	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.76.161	2026-01-10 00:09:50.237617	\N
fcbbaa3c-c45f-4ca6-b736-e1a0f5e8f6fd	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Bulk Created Departments	Department	Bulk created 1 departments	102.89.76.161	2026-01-10 00:17:18.172243	\N
3bff4beb-f2f3-4773-b40f-bb8dfbf09814	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 50	102.89.76.161	2026-01-10 00:23:40.354536	e060d5d8-5bd9-44ff-8e43-23153ee6a934
54e702da-dc6d-49bd-9de1-1f2432f836f0	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.76.161	2026-01-10 00:26:06.574746	a7d4ae82-a1fe-4c1b-ba19-9d908e3a6f66
f3d9812b-167c-42e3-9d37-383ac4da2bec	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 30	102.89.76.161	2026-01-10 00:27:35.47212	8b064346-355c-48f1-88b3-6febbe82c6a2
9bde0071-d13e-4dad-8d1f-56c49058784c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created waste movement with 1 items, total qty: 20	102.89.76.161	2026-01-10 00:27:56.812667	3b4bcfce-7744-4468-9c37-83f0c325ccbb
6a75ba28-023f-4468-bf43-228bbc08cc86	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 10	102.89.76.161	2026-01-10 00:33:40.002472	8af73a32-46f7-413d-ab25-6ba41054a2da
d398e6ff-a389-4bcd-873a-7b49a39d99d4	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.76.161	2026-01-10 00:38:39.14765	5f32a321-a7ec-4e0d-9e5d-1344e2188fe2
0e3aa934-e492-4e31-9454-6626c1394a5e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.76.161	2026-01-10 00:50:29.602486	\N
6ea232a2-46e4-4bce-936d-7e4a56626ec9	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.76.161	2026-01-10 01:14:07.707079	\N
590590c9-d021-47c7-89f2-5f06a3aa675d	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Item	Item	New item added: Spirite	102.89.76.161	2026-01-10 01:15:39.424734	f051da21-7909-458e-9c63-d176f6106a0a
3b426614-008d-46b5-b0a1-d5d71c52e696	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Item Purchase Captured	Item	Purchase of 2000 12 posted to Main Store SRD for 2026-01-10	102.89.76.161	2026-01-10 01:16:55.996343	f051da21-7909-458e-9c63-d176f6106a0a
0ffadc71-7c7c-428c-8942-f8c8f6676f31	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.69.19	2026-01-10 04:39:31.370471	\N
ef1390f8-73fe-40df-87b4-048d35286d2e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.69.19	2026-01-10 04:47:47.374464	\N
63aea1f4-ca7c-4a45-9b58-a7e86615e95a	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.69.19	2026-01-10 06:44:35.475174	\N
4c8c5849-cdac-4125-b048-0da9dbfe02be	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.69.19	2026-01-10 08:46:17.114075	\N
5062d205-4797-4528-a95e-c15a480ca448	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.69.19	2026-01-10 08:52:11.23482	\N
c99291f8-4af3-45f3-a2f9-af773abfdb93	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Login	Session	Successful login via web	102.89.69.19	2026-01-10 09:36:13.402877	\N
b811d33f-a178-42ce-b36a-e3a74b2fac2f	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 15	102.89.69.19	2026-01-10 09:47:33.189132	258af520-c6b7-42d4-b688-eb58d67457bb
01e33a4c-1507-4b9c-9758-d14e8edb3874	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created waste movement with 1 items, total qty: 15	102.89.69.19	2026-01-10 09:47:56.018043	e963e8f4-6060-466f-ac7c-6fdb1a5a8dad
0e23247b-46be-4116-885c-0b030998b5a2	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 10	102.89.69.19	2026-01-10 09:48:29.261114	4f4bab0b-b839-4812-a940-4804f3671baa
7a600051-8268-4f34-888d-eda781e0ba98	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Count	StockCount	Stock count recorded (SRD updated)	102.89.69.19	2026-01-10 09:51:43.308914	3d85aa03-0784-4dbd-9953-de6bbd9d3ba0
d843ed28-4671-47fb-ab67-fef05338bcb7	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created write_off movement with 1 items, total qty: 2	102.89.69.19	2026-01-10 09:52:16.009062	9ec44d94-5120-45fa-aaae-e0987f709a60
21dccbac-4ef3-48dd-ae0d-baeab8f366dd	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created waste movement with 1 items, total qty: 2	102.89.69.19	2026-01-10 09:52:36.676982	f0bd16b1-d66c-4501-90ae-904c3f5eb17c
f234e3cb-cd64-4fd4-a320-fe22922813e4	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created transfer movement with 1 items, total qty: 1	102.89.69.19	2026-01-10 09:52:58.275434	41ed03d3-c3ea-4480-896c-39e8d0f10e94
f5bdb9c9-cccf-4cde-b8b0-fb0ac13d613b	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Created Stock Movement	StockMovement	Created adjustment movement with 1 items, total qty: 1	102.89.69.19	2026-01-10 09:53:42.080138	d3da4dc2-cc30-411e-b864-1f1302a54617
d854ada4-6b3f-45f1-b91b-058bc6b90341	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Reversed Stock Movement	StockMovement	Reversed adjustment movement. Reversal ID: e2ab3a87-bd6d-4c84-8130-bb131b0eed7b. Reason: u	102.89.69.19	2026-01-10 09:57:28.632967	d3da4dc2-cc30-411e-b864-1f1302a54617
feeb5c41-3933-45d6-ae55-2eebbc0f7b21	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	Edited Stock Count	StockCount	Stock count updated (ledger recalculated)	102.89.69.19	2026-01-10 10:03:30.607093	3d85aa03-0784-4dbd-9953-de6bbd9d3ba0
1f063e96-7d0c-4bd6-be27-25802ea76192	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 13:55:49.665174	\N
d9d2c102-8e7d-4d14-960f-cabde1f6a64b	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 14:25:25.000689	\N
aaea159f-5426-4945-b222-c81e71cc6b27	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 16:46:41.346952	\N
f96911dc-148f-44d7-a708-67cb2522406e	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 17:35:51.305021	\N
72aca6d7-26d4-44db-afe0-5db47a42cbe2	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 17:37:43.952254	\N
a4ff702a-6245-4088-b8a2-f80d7389fed5	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 17:37:59.536233	\N
80a27119-a9ff-44fe-931f-33e519820468	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 20:06:58.831126	\N
6ccb6e0b-b13d-4b2e-a465-526c6f3e7387	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 20:12:01.513435	\N
12db4c02-7c7c-4a4a-8604-f213e9580d85	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	102.89.82.84	2026-01-11 20:25:41.503528	\N
fbadfdea-c632-4c27-9586-53a5c9c35530	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 07:56:26.86428	\N
f54b0afe-2a14-4998-a07e-608f0e1cb0fc	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 08:10:18.775092	\N
5a070c86-540c-421a-9b53-3d8f82fe694c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 08:10:23.597492	\N
cb76d762-e239-46f0-b154-2837e44c1a44	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 08:10:28.291602	\N
011519bf-05b7-4008-9559-259d8ef025c7	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 08:10:33.557812	\N
c0cea1bf-e7ef-4821-810e-70f5b2f406d9	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 08:35:05.266684	\N
1438f065-a248-4d74-a3cc-c94f2d6649c6	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 08:35:42.787246	\N
5f162bdb-62dc-4a79-b13c-e1b7ff9b24d2	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login Failed	Session	Invalid password attempt (1/5)	89.105.214.120	2026-01-12 08:35:53.001109	\N
82e796cf-1880-4f33-8211-c1c2a7611756	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 08:36:06.550956	\N
628afe36-fe09-43d8-800f-7d4007f58732	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	89.105.214.120	2026-01-12 08:36:13.856217	\N
ded4bac3-0d96-47b2-98c1-8fee3f252c3b	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	93.190.140.104	2026-01-12 11:23:17.458976	\N
b4bd9256-4446-4ca8-8ae1-a7ee7947481c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	185.107.56.156	2026-01-12 13:58:13.5861	\N
6a0dfb38-5f0e-400d-97c4-7f7f126d7c6c	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	185.107.56.156	2026-01-12 13:58:32.711006	\N
47d6fd81-b586-478a-84e2-1680261f1995	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	185.107.56.156	2026-01-12 13:58:39.556426	\N
54343792-8956-4dd2-8ffd-a3541af961fe	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	185.107.56.156	2026-01-12 13:58:45.033884	\N
3e3fb3d2-8479-4cb0-b53f-903d9bcb2f43	6419147a-44c1-4f3c-bbcb-51a46a91d1be	Login	Session	Successful login via web	185.107.56.156	2026-01-12 14:00:27.125737	\N
ed9445ba-0168-4c5d-815b-c5c2828e13c3	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	185.107.56.156	2026-01-12 14:04:13.534386	\N
f942fb2c-7b45-432d-9b43-7eb4ba63cfd8	5ed0ccee-d55a-4700-b092-efa7e84a1907	Login	Session	Successful login via web	185.107.56.156	2026-01-12 14:06:43.483442	\N
\.


--
-- Data for Name: audit_reissue_permissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_reissue_permissions (id, audit_id, granted_to, granted_by, granted_at, expires_at, scope, reason, active) FROM stdin;
\.


--
-- Data for Name: audits; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audits (id, client_id, department_id, period, start_date, end_date, status, submitted_by, submitted_at, locked_by, locked_at, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.categories (id, client_id, name, status, created_by, created_at, deleted_at, deleted_by) FROM stdin;
a6787752-fac5-43a1-8f72-039e4105a57a	fb428d91-bacb-44ed-b4cd-310c87c5a8de	F&B	active	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 04:57:27.941388	\N	\N
44cbb924-2bb5-4c2e-8c86-79f9eb1bb29a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	FRESH FRUIT	active	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 18:53:29.247874	\N	\N
dd190707-edc4-45b9-b48a-dc9cf2e9bc68	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	COCKTAILS	active	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 18:56:35.130292	\N	\N
11dcadfe-cee7-42df-8653-716e9036b103	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	F&B	active	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 08:03:38.947504	\N	\N
13d27efb-f0c5-4fee-b346-c0b4f1855718	0fe14fe2-9f3c-4b9d-bc58-931893e699f4	PROTEIN	active	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:16:14.956526	\N	\N
b205ea14-19c3-4ae2-ad72-345740062053	d40fe583-f75d-4714-b3b5-9d83a9a332a9	JUICES	active	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 03:29:56.790073	\N	\N
c936f77b-91cc-432c-9d15-7b7cccd3b83b	d40fe583-f75d-4714-b3b5-9d83a9a332a9	FOOD	active	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 03:30:25.814853	\N	\N
cd56eec5-413d-42c2-897d-db44b8cdae32	5a1e6387-ad7a-4e58-9ac4-5136ef242c4a	PINIPPLE JUICE	active	0ff460ab-5b96-4b2d-b85f-d04c54faf25f	2026-01-05 05:54:28.822488	\N	\N
b098cb17-0f0b-4dfe-9552-71be8a493d35	0d947773-28ee-4e02-b5b6-40455566817d	F&B	active	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 14:35:48.160683	\N	\N
85d266e6-3ef8-4434-b5f1-b234ecd1eace	0d947773-28ee-4e02-b5b6-40455566817d	BAR	active	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 14:36:34.006263	2026-01-07 14:37:24.875	a62196b8-c91c-465d-9f3d-35e82bb6d0d2
7518184e-b0f3-48b8-93fb-901a1eccd71d	0d947773-28ee-4e02-b5b6-40455566817d	DRINKS	active	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 14:37:36.867353	\N	\N
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clients (id, name, status, risk_score, variance_threshold, created_at, organization_id) FROM stdin;
cd88a504-b3b8-47c8-95be-9cee691f82e1	The Grand Lounge	active	85	5.00	2025-12-26 06:18:46.74325	\N
e7d7adab-4fbb-46bf-9ada-5490d7667872	Ocean View Restaurant	active	45	7.00	2025-12-26 06:18:46.748885	\N
fb428d91-bacb-44ed-b4cd-310c87c5a8de	igh	active	0	5.00	2025-12-27 00:15:25.45034	\N
30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	JUST PECKISH	active	0	5.00	2025-12-26 10:08:03.313163	\N
0fe14fe2-9f3c-4b9d-bc58-931893e699f4	DESMOND BEST LIMITED	warning	92	3.00	2025-12-26 06:18:46.753145	\N
d40fe583-f75d-4714-b3b5-9d83a9a332a9	YOURS HOSPITALITY	active	0	5.00	2026-01-05 03:29:05.416601	d09a34a2-4e1d-4048-be05-faa10238aae7
5a1e6387-ad7a-4e58-9ac4-5136ef242c4a	Demo Restaurant	active	0	5.00	2026-01-05 04:20:46.179402	81586752-9ad1-4ba7-92e0-2021626f9412
0d947773-28ee-4e02-b5b6-40455566817d	ZOE ENTERPRISE LTD	active	0	5.00	2026-01-07 14:35:21.245	4144bb32-2cbb-46df-a2e7-ef96f9acebab
\.


--
-- Data for Name: data_exports; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.data_exports (id, organization_id, created_by, format, status, filename, file_path, file_size, data_types, date_range_start, date_range_end, record_count, error, expires_at, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.departments (id, name, created_at, status, client_id, category_id, suspend_reason, created_by) FROM stdin;
d2622c15-96da-4602-b5ee-6d3cef69f3bc	Grill	2025-12-27 05:03:37.733713	active	fb428d91-bacb-44ed-b4cd-310c87c5a8de	a6787752-fac5-43a1-8f72-039e4105a57a	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
f23dde76-2b40-440d-a610-3fabca314d0b	Kitchen	2025-12-27 05:03:48.794532	active	fb428d91-bacb-44ed-b4cd-310c87c5a8de	a6787752-fac5-43a1-8f72-039e4105a57a	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
cbb1ab77-ffdb-4276-837b-56ca8d580a6c	Restaurant	2025-12-27 18:15:55.384368	active	fb428d91-bacb-44ed-b4cd-310c87c5a8de	a6787752-fac5-43a1-8f72-039e4105a57a	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
fc802764-22a2-48f0-b98d-6138aae4998c	Grill 2 Pool Side	2025-12-27 19:01:07.292208	active	fb428d91-bacb-44ed-b4cd-310c87c5a8de	a6787752-fac5-43a1-8f72-039e4105a57a	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
216e8522-9f23-46ca-b00e-d936ebaaf0c4	Main Store	2025-12-27 19:46:03.256751	active	fb428d91-bacb-44ed-b4cd-310c87c5a8de	a6787752-fac5-43a1-8f72-039e4105a57a	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
dbcba58f-0564-4996-8405-a35573f74989	GRILL OUTLET	2025-12-29 18:48:50.766002	active	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	BAR OUTLET	2025-12-30 08:01:30.301788	active	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
32c1d1ba-45fd-445a-8071-27b853982d96	RESTAURANT OUTLET	2026-01-01 01:12:52.620645	active	0fe14fe2-9f3c-4b9d-bc58-931893e699f4	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
750a0e04-b36c-4186-8b72-e6c161c768af	BAR 1 POOL SIDE OUTLET	2026-01-01 01:13:25.955897	active	0fe14fe2-9f3c-4b9d-bc58-931893e699f4	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
11744f70-511a-4909-b546-7ab652b34471	Bar	2025-12-27 05:03:56.188964	active	fb428d91-bacb-44ed-b4cd-310c87c5a8de	a6787752-fac5-43a1-8f72-039e4105a57a	hh	5ed0ccee-d55a-4700-b092-efa7e84a1907
f0dd0739-ff38-4819-b311-c6c9992bd79d	JUICES OUTLET	2025-12-29 18:48:32.189116	active	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907
a0d2bfcc-32ac-405b-82b8-4ed93c92bf17	Beverage	2025-12-26 06:18:46.771046	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
6821b3f9-deac-4c7a-a21e-c865e01b15a6	Food	2025-12-26 06:18:46.774522	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
ed852d83-1eb2-4bb2-a4b0-8b16ca7cb178	Tobacco	2025-12-26 06:18:46.778078	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
69debcb5-7367-4a88-ab30-e03a623099e1	Main Bar	2025-12-26 08:34:06.651384	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
98cf9a3f-4e15-49d8-abbc-6a80789d36e6	Kitchen	2025-12-26 08:34:06.654855	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
9197d0f0-9a61-42fe-a42e-115e3b4d8324	VIP Lounge	2025-12-26 08:34:06.658364	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
b78119c2-f83d-455c-905c-0b430ce7906a	Store	2025-12-27 01:55:22.235772	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
860ceafd-3b5b-426d-bd4e-298e20d3e601	o.Store	2025-12-27 01:56:31.609145	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
662ab128-3231-42ce-8d59-9445495abf49	o.Store	2025-12-27 01:58:07.010313	active	cd88a504-b3b8-47c8-95be-9cee691f82e1	\N	\N	\N
c844b11d-6c6c-41ba-a0da-c21646eea96b	BAR/MIXOLOGIST OUTLET	2026-01-05 03:30:56.783159	active	d40fe583-f75d-4714-b3b5-9d83a9a332a9	b205ea14-19c3-4ae2-ad72-345740062053	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be
f84e43d1-856c-4d02-b8ed-5d8f7ec04700	RESTAURANT/GRILL OUTLET	2026-01-05 03:31:16.831615	active	d40fe583-f75d-4714-b3b5-9d83a9a332a9	b205ea14-19c3-4ae2-ad72-345740062053	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be
85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	RESTAURANT OUTLET	2026-01-07 14:36:56.018334	active	0d947773-28ee-4e02-b5b6-40455566817d	b098cb17-0f0b-4dfe-9552-71be8a493d35	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2
657079ba-c71c-40b4-9f66-debfa0a9b109	BAR OUTLET	2026-01-07 14:37:55.078899	active	0d947773-28ee-4e02-b5b6-40455566817d	7518184e-b0f3-48b8-93fb-901a1eccd71d	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2
b3a2d778-a444-452e-b3dc-5300715abc5b	MAIN STORE OUTLET	2026-01-09 23:35:37.556127	active	0d947773-28ee-4e02-b5b6-40455566817d	\N	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2
02249257-b3e4-4c5e-a5e7-6025888df409	MAIN STORE OUTLET	2026-01-10 00:17:18.134745	active	d40fe583-f75d-4714-b3b5-9d83a9a332a9	\N	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be
\.


--
-- Data for Name: exception_activity; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.exception_activity (id, exception_id, activity_type, message, previous_value, new_value, created_by, created_at) FROM stdin;
2cfcc50f-9736-4136-8512-d6763ae608d1	fb643f20-a2ee-414a-9e9f-a486b147b1f2	outcome_change	Outcome set to "TRUE"	pending	true	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 20:38:52.678516
d5a37f75-8b72-4b33-b76a-abc30f50db73	a025afb3-3586-444a-a4fa-cb6e1dc22427	system	Exception created with status "open" and severity "medium"	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:59:06.247795
1695c896-e944-40a1-8641-6418b79abb15	a025afb3-3586-444a-a4fa-cb6e1dc22427	status_change	Status changed from "open" to "investigating"	open	investigating	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:59:25.728601
84fbbd4d-394c-4c86-85c4-61da80cb6610	43d82652-79c5-41b9-8046-0c977a16fb5f	system	Exception created with status "open" and severity "low"	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:59:57.844233
b24aa28d-0100-4d4e-9b84-574a179f780c	0a59e7ac-c299-44f2-afec-5a652bb0fef0	system	Exception created with status "open" and severity "high"	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 00:00:46.937785
\.


--
-- Data for Name: exception_comments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.exception_comments (id, exception_id, comment, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: exceptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.exceptions (id, case_number, outlet_id, department_id, summary, description, impact, severity, status, evidence_urls, assigned_to, resolved_at, created_by, created_at, client_id, date, outcome, updated_at, deleted_at, deleted_by, delete_reason) FROM stdin;
5204d46d-1c82-4949-8e4d-a31998f32693	EXC-20251230-001	\N	f0dd0739-ff38-4819-b311-c6c9992bd79d	1 MISSING FANTA BOTTLE	fanta missing at ewan shift	\N	medium	investigating	\N	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 13:26:00.172396	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-30	pending	2025-12-31 20:30:20.260409	\N	\N	\N
fb643f20-a2ee-414a-9e9f-a486b147b1f2	EXC-20251230-002	\N	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	1 MISSING FANTA BOTTLE	fanta missing at ewan shift	\N	medium	open	\N	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 13:26:15.46913	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-30	true	2025-12-31 20:38:52.673	\N	\N	\N
a025afb3-3586-444a-a4fa-cb6e1dc22427	EXC-20251231-001	\N	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	sss	gggggggggggg	\N	medium	investigating	\N	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:59:06.236035	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-31	pending	2025-12-31 23:59:25.724	\N	\N	\N
43d82652-79c5-41b9-8046-0c977a16fb5f	EXC-20251231-002	\N	dbcba58f-0564-4996-8405-a35573f74989	how	how	\N	low	open	\N	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:59:57.825674	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-31	pending	2025-12-31 23:59:57.825674	\N	\N	\N
0a59e7ac-c299-44f2-afec-5a652bb0fef0	EXC-20260101-001	\N	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	asde	asde	\N	high	open	\N	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 00:00:46.919827	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2026-01-01	pending	2026-01-01 00:00:46.919827	\N	\N	\N
fc0de406-469e-4db7-8222-31ff255c125e	EXC-20251226-001	bd279946-8a56-4e2f-8a40-714bdb2574c9	69debcb5-7367-4a88-ab30-e03a623099e1	Stock variance detected in Main Bar	1 bottle of Johnny Walker Black missing from physical count vs expected.	Potential loss of $45	medium	open	\N	\N	\N	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.804755	cd88a504-b3b8-47c8-95be-9cee691f82e1	2025-12-30	pending	2025-12-31 20:30:20.260409	\N	\N	\N
ac867377-b1be-4924-b6a3-57fde4529d70	EXC-20251226-002	bd279946-8a56-4e2f-8a40-714bdb2574c9	69debcb5-7367-4a88-ab30-e03a623099e1	High void rate during evening shift	Void rate of 3.2% exceeds threshold of 2%. 14 void transactions recorded.	Revenue concern - $65 in voids	low	investigating	\N	\N	2025-12-27 19:20:02.275	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.809735	cd88a504-b3b8-47c8-95be-9cee691f82e1	2025-12-30	pending	2025-12-31 20:30:20.260409	\N	\N	\N
\.


--
-- Data for Name: goods_received_notes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.goods_received_notes (id, client_id, supplier_id, supplier_name, date, invoice_ref, amount, status, evidence_url, evidence_file_name, created_by, created_at, updated_at) FROM stdin;
e2d8fd86-1613-443e-9d50-d841d0024a45	fb428d91-bacb-44ed-b4cd-310c87c5a8de	3b37bf2b-9563-456a-950b-a2453c851f3a	Edmond Global resources Ltd	2025-12-28 00:00:00	Ed246	120000.00	received	/uploads/grn/1766906883871-744397038-Black and Yellow Modern Leadership Training Workshop Poster.png	Black and Yellow Modern Leadership Training Workshop Poster.png	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 07:28:04.532923	2025-12-28 07:28:04.532923
f7388c2b-b8e5-49fa-9500-c758e35af098	fb428d91-bacb-44ed-b4cd-310c87c5a8de	\N	Osasco resources enterprise	2025-12-28 00:00:00	WSG234	200000.00	pending	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 07:29:04.934301	2025-12-28 07:29:04.934301
99658a47-7573-4ceb-bf0f-eba833221987	fb428d91-bacb-44ed-b4cd-310c87c5a8de	3b37bf2b-9563-456a-950b-a2453c851f3a	Edmond Global resources Ltd	2025-12-28 00:00:00	Ed246	30000.00	received	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 07:41:10.081551	2025-12-28 07:41:10.081551
57b71438-9d0c-413c-b645-977f30bb39a4	fb428d91-bacb-44ed-b4cd-310c87c5a8de	3b37bf2b-9563-456a-950b-a2453c851f3a	Edmond Global resources Ltd	2025-12-29 00:00:00	wws32	20000.00	pending	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:38:18.407002	2025-12-29 13:38:18.407002
72794fb2-15fb-4fd8-a330-813f000adee4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	\N	Edmond Global resources Ltd	2025-12-29 00:00:00	WSG234	100000.00	received	/uploads/grn/1767048495151-941087134-acknowlegmentReciept (2).pdf	acknowlegmentReciept (2).pdf	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 22:25:09.682223	2025-12-30 09:06:20.713
0aee6b24-1abb-4fc8-ab26-02e811ba6350	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	\N	JOHN Baker	2025-12-30 00:00:00	wws32	90000.00	pending	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 09:08:57.612568	2025-12-30 09:08:57.612568
c617523a-929c-4180-b5fa-69ba34d069df	d40fe583-f75d-4714-b3b5-9d83a9a332a9	367823f0-2197-40bd-9bc9-1847d653f8b0	Edmond son ltd	2026-01-05 00:00:00	WSG234	20000.00	received	\N	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 15:41:29.281134	2026-01-05 15:41:29.281134
e61a5994-d67f-4191-901a-9a00749f0527	0d947773-28ee-4e02-b5b6-40455566817d	2de7ad8b-1394-4cc1-93a4-947f38c88c77	Edmond global resources ltd	2026-01-07 00:00:00	WSG234	100000.00	received	/uploads/grn/1767797563447-460163905-Black and Yellow Modern Leadership Training Workshop Poster (1).png	Black and Yellow Modern Leadership Training Workshop Poster (1).png	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 14:52:46.720046	2026-01-07 14:52:46.720046
\.


--
-- Data for Name: inventory_department_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_department_categories (id, client_id, inventory_department_id, category_id, created_at) FROM stdin;
9cf20cd7-58bd-4a4f-9eed-5c36d4fffaf5	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	44cbb924-2bb5-4c2e-8c86-79f9eb1bb29a	2025-12-29 22:44:15.97215
9463b3d5-25ac-4189-a266-2d6d00e745f3	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	dd190707-edc4-45b9-b48a-dc9cf2e9bc68	2025-12-29 22:44:15.97215
1730c921-cf68-43e1-b92f-f13bf2084582	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	ad4368c1-69b1-4173-8e0d-b4deed391f20	dd190707-edc4-45b9-b48a-dc9cf2e9bc68	2025-12-29 22:46:03.545078
a1ca2356-3708-4a0b-a325-3a609e8f487e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	dd190707-edc4-45b9-b48a-dc9cf2e9bc68	2025-12-30 08:24:18.17857
cbfda6e6-f2a6-4de1-884a-e4388b2b6204	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	44cbb924-2bb5-4c2e-8c86-79f9eb1bb29a	2025-12-30 08:24:18.17857
a30bc5f4-0868-4a14-8009-0c8e01eaf576	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	11dcadfe-cee7-42df-8653-716e9036b103	2025-12-30 08:24:18.17857
9c343ba0-1a01-41d7-80a2-22815bef3793	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	dd190707-edc4-45b9-b48a-dc9cf2e9bc68	2025-12-30 08:28:43.080629
81c896a1-b7c9-4bb1-8caf-b47c4f17102f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	11dcadfe-cee7-42df-8653-716e9036b103	2025-12-30 08:28:43.080629
b1fc796d-6814-465d-9cc0-402eb4aaa8e1	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	b205ea14-19c3-4ae2-ad72-345740062053	2026-01-05 05:47:41.234498
b0ed3b0d-ac62-4c12-8144-6a95e3c6cbdb	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	b205ea14-19c3-4ae2-ad72-345740062053	2026-01-07 03:52:52.161058
64c72b15-2ade-4412-ae48-cbe63fab9f63	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	c936f77b-91cc-432c-9d15-7b7cccd3b83b	2026-01-07 03:52:52.161058
1da337ad-4dd2-4023-8a2e-a8e0363957cd	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	7518184e-b0f3-48b8-93fb-901a1eccd71d	2026-01-07 15:01:32.172652
585ef0f5-ce0a-41d2-a2d1-474e1b8b06af	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	b098cb17-0f0b-4dfe-9552-71be8a493d35	2026-01-07 15:01:32.172652
226111e5-32b8-4ca8-a42e-58f58ea2512e	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	7518184e-b0f3-48b8-93fb-901a1eccd71d	2026-01-09 09:42:56.780748
20403d17-7c48-4f87-956f-0f2ca68d3d5a	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	b098cb17-0f0b-4dfe-9552-71be8a493d35	2026-01-09 09:42:56.780748
101646c3-5002-40e8-a3f8-d03bc49df3a4	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	c936f77b-91cc-432c-9d15-7b7cccd3b83b	2026-01-10 00:20:46.895212
6dd83a54-0ce2-4a3a-99f8-2050419a2828	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	b205ea14-19c3-4ae2-ad72-345740062053	2026-01-10 00:20:46.895212
\.


--
-- Data for Name: inventory_departments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_departments (id, client_id, store_name_id, inventory_type, status, created_at, department_id) FROM stdin;
2ce2d797-64c0-48a4-9e3b-03fd62786195	fb428d91-bacb-44ed-b4cd-310c87c5a8de	32f33217-fe1c-43a8-adf4-8ba3a898dc5a	DEPARTMENT_STORE	active	2025-12-28 03:05:47.696337	\N
78721483-0a9f-4e27-9e4f-30fc9f848485	fb428d91-bacb-44ed-b4cd-310c87c5a8de	30b18cac-f24b-469e-837d-3184f0a731d2	DEPARTMENT_STORE	active	2025-12-28 04:06:08.306547	\N
bd22d458-81ba-414f-bcdb-4e047e7ab1c6	fb428d91-bacb-44ed-b4cd-310c87c5a8de	73e5c291-544b-493d-aaf9-b0255991fefc	MAIN_STORE	active	2025-12-27 23:02:17.337712	216e8522-9f23-46ca-b00e-d936ebaaf0c4
fd666e2e-2de8-4b34-8687-9d45c75a85c3	fb428d91-bacb-44ed-b4cd-310c87c5a8de	e44ffc4f-8a9a-4379-b5b0-274bbe8a8834	DEPARTMENT_STORE	active	2025-12-28 03:06:27.382213	d2622c15-96da-4602-b5ee-6d3cef69f3bc
b30e98ff-9e99-4f22-b814-cd976d2c9c71	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	13fd1c0e-3e9c-4fa2-b798-1d8ff611bb87	DEPARTMENT_STORE	active	2025-12-29 21:32:32.983637	f0dd0739-ff38-4819-b311-c6c9992bd79d
ad4368c1-69b1-4173-8e0d-b4deed391f20	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	e457ac14-65c9-4719-b437-d16eefc11a6b	DEPARTMENT_STORE	active	2025-12-29 21:31:49.275781	dbcba58f-0564-4996-8405-a35573f74989
43d27fe4-d8e1-4319-9f6b-7657ce33be4a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	db93ae9e-caba-448a-92d1-6d9f2adcb91c	MAIN_STORE	active	2025-12-29 21:53:27.887701	f0dd0739-ff38-4819-b311-c6c9992bd79d
c47d93b1-4801-445b-a77e-8362ebb25442	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	560316e1-a80d-4a4a-97ae-13ffd1ee37a5	DEPARTMENT_STORE	active	2025-12-30 08:24:50.225211	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482
4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	d40fe583-f75d-4714-b3b5-9d83a9a332a9	3a3bce42-ba0c-4d5e-8f4f-7f264cb46357	DEPARTMENT_STORE	active	2026-01-05 03:47:31.633523	c844b11d-6c6c-41ba-a0da-c21646eea96b
c8a17169-727d-4c3f-b026-00059fdf32a5	d40fe583-f75d-4714-b3b5-9d83a9a332a9	34bc8c21-57a3-4832-98c1-5a15b01505d9	DEPARTMENT_STORE	active	2026-01-05 04:55:41.016639	f84e43d1-856c-4d02-b8ed-5d8f7ec04700
e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0d947773-28ee-4e02-b5b6-40455566817d	1dd5c2ea-942b-4a49-8aee-f558918600f0	MAIN_STORE	active	2026-01-07 14:54:01.249635	\N
1e134a24-908d-4535-8443-28fa83f30a6a	0d947773-28ee-4e02-b5b6-40455566817d	47696449-9f87-42da-b36d-9f27031e6489	DEPARTMENT_STORE	active	2026-01-07 14:54:13.336261	657079ba-c71c-40b4-9f66-debfa0a9b109
0f33a311-9974-4c6d-bd95-8f3ebf172282	0d947773-28ee-4e02-b5b6-40455566817d	3f8213b0-26ff-403d-a7a9-acd4a599d92f	DEPARTMENT_STORE	active	2026-01-07 14:54:24.685364	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4
f3129970-a2fc-4d98-9f25-70598db1a740	d40fe583-f75d-4714-b3b5-9d83a9a332a9	0c86d91d-cbae-4b44-b431-e2d4745f52c5	MAIN_STORE	active	2026-01-05 03:48:16.42573	02249257-b3e4-4c5e-a5e7-6025888df409
\.


--
-- Data for Name: item_serial_events; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.item_serial_events (id, client_id, date, srd_id, item_id, event_type, ref_id, serial_number, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.items (id, client_id, name, sku, category, unit, cost_price, selling_price, reorder_level, status, created_at, category_id, serial_tracking, serial_notes, supplier_id, wholesale_price, retail_price, vip_price, custom_price) FROM stdin;
1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	fb428d91-bacb-44ed-b4cd-310c87c5a8de	Rice	I-F&B-0001	F&B	84	1000.00	1500.00	10	active	2025-12-29 12:56:29.447063	\N	none	\N	\N	\N	\N	\N	\N
d24028d5-7172-4fa4-a16a-e96a21e92c62	fb428d91-bacb-44ed-b4cd-310c87c5a8de	Chicken	I-FOO-0002	FOOD	4	1000.00	1500.00	10	active	2025-12-29 16:02:41.580605	\N	none	\N	\N	\N	\N	\N	\N
4f95bc96-08b8-4aad-9f1a-b88a0b211f33	fb428d91-bacb-44ed-b4cd-310c87c5a8de	malt	I-FOO-0003	FOOD	12	500.00	1000.00	10	active	2025-12-29 16:03:39.526614	\N	none	\N	\N	\N	\N	\N	\N
2f64a260-d98d-40cc-bd44-346f94737415	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	Fanta	JP-F&B-0006	F&B	12 pc	500.00	1000.00	10	active	2025-12-30 12:16:50.742437	11dcadfe-cee7-42df-8653-716e9036b103	none	\N	\N	\N	\N	\N	\N
d3a42547-ff64-4772-923c-4a8a112f6be9	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	Coca Cola	JP-F&B-0005	F&B	12	500.00	1000.00	10	active	2025-12-30 12:15:51.577382	11dcadfe-cee7-42df-8653-716e9036b103	none	\N	\N	\N	\N	\N	\N
e55abe0b-52ac-487b-9a47-3a83ee61a95d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	Pinipple Juice	JP-FRE-0003	FRESH FRUIT	4 pc	600.00	1000.00	10	active	2025-12-29 21:56:12.352834	44cbb924-2bb5-4c2e-8c86-79f9eb1bb29a	none	\N	\N	\N	\N	\N	\N
29070060-0461-41bc-afaa-d58281cef2bb	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	Orange Juice	JP-FRE-0007	FRESH FRUIT	4 pc	400.00	1000.00	10	active	2025-12-30 13:57:15.997391	44cbb924-2bb5-4c2e-8c86-79f9eb1bb29a	serial	SDR56789	\N	\N	\N	\N	\N
3315d410-2302-4ff8-8a38-6af5f1bee4ee	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	Water Melon Juice	JP-FRE-0002	FRESH FRUIT	4 pc	600.00	1000.00	10	active	2025-12-29 21:49:26.325436	44cbb924-2bb5-4c2e-8c86-79f9eb1bb29a	none	\N	\N	\N	\N	\N	\N
0685f443-471a-4a34-927e-f5e41fbeb2d3	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	Malt	JP-F&B-0004	F&B	12 pc	500.00	1000.00	10	active	2025-12-30 08:04:27.069665	11dcadfe-cee7-42df-8653-716e9036b103	none	\N	\N	\N	\N	\N	\N
2a1eaab7-56a8-40d9-8fc3-d379beec67b2	0d947773-28ee-4e02-b5b6-40455566817d	Chicken Fries	ZEL-F&B-0003	F&B	4	500.00	1000.00	10	active	2026-01-07 14:56:35.410467	b098cb17-0f0b-4dfe-9552-71be8a493d35	none	\N	2de7ad8b-1394-4cc1-93a4-947f38c88c77	\N	\N	\N	\N
097eadbb-cad3-4ef9-aab3-21ac8d02e143	d40fe583-f75d-4714-b3b5-9d83a9a332a9	Orange Juice	YH-JUI-0002	JUICES	4	500.00	1000.00	10	active	2026-01-05 03:46:05.833978	b205ea14-19c3-4ae2-ad72-345740062053	none	\N	\N	\N	\N	\N	\N
3d9cba8b-22ba-4785-9afc-e2e6842eee5a	d40fe583-f75d-4714-b3b5-9d83a9a332a9	Pinipple Juice	YH-JUI-0001	JUICES	4	500.00	1000.00	10	active	2026-01-05 03:34:49.323175	b205ea14-19c3-4ae2-ad72-345740062053	none	\N	\N	\N	\N	\N	\N
f051da21-7909-458e-9c63-d176f6106a0a	0d947773-28ee-4e02-b5b6-40455566817d	Spirite	ZEL-DRI-0005	DRINKS	12	500.00	1000.00	10	active	2026-01-10 01:15:39.167245	7518184e-b0f3-48b8-93fb-901a1eccd71d	none	\N	2de7ad8b-1394-4cc1-93a4-947f38c88c77	500.01	800.00	2000.00	1200.00
f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	0d947773-28ee-4e02-b5b6-40455566817d	Fanta	ZEL-DRI-0002	DRINKS	12	500.00	1000.00	10	active	2026-01-07 14:55:34.811379	7518184e-b0f3-48b8-93fb-901a1eccd71d	none	\N	\N	\N	\N	\N	\N
2329f86b-aabd-4aac-b4f2-8e572f51588b	0d947773-28ee-4e02-b5b6-40455566817d	Malt	ZEL-DRI-0001	DRINKS	12	500.00	1000.00	10	active	2026-01-07 14:55:03.507578	7518184e-b0f3-48b8-93fb-901a1eccd71d	none	\N	2de7ad8b-1394-4cc1-93a4-947f38c88c77	\N	\N	\N	\N
a8606352-f7d1-40e6-8500-8ffcbcc12924	d40fe583-f75d-4714-b3b5-9d83a9a332a9	Water Melon Juice	YH-JUI-0003	JUICES	4	500.00	1000.00	10	active	2026-01-07 07:10:34.194964	b205ea14-19c3-4ae2-ad72-345740062053	none	\N	\N	\N	\N	\N	\N
a09560f4-54bc-4640-9efa-295f4b665032	0d947773-28ee-4e02-b5b6-40455566817d	Fried Fish	ZEL-F&B-0004	F&B	4	500.00	1000.00	10	active	2026-01-09 19:54:15.302519	b098cb17-0f0b-4dfe-9552-71be8a493d35	none	\N	2de7ad8b-1394-4cc1-93a4-947f38c88c77	\N	\N	\N	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, organization_id, user_id, type, title, message, ref_type, ref_id, is_read, email_sent, email_sent_at, email_error, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: organization_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organization_settings (id, company_name, address, email, phone, currency, updated_by, updated_at, organization_id, logo_url, report_footer_note) FROM stdin;
35141bd1-6a0a-4a01-9490-45f7fc73815b	HAighodar limited	8 Herald Of Christ Close	as@gmail.com	23480000000	NGN	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 04:27:09.696	\N	\N	\N
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organizations (id, name, type, email, phone, address, currency_code, created_at, updated_at, is_suspended, suspended_at, suspended_reason) FROM stdin;
597b39e0-c81b-4465-8b07-0f70ce9cb0a6	Test Org 2	company	test2@example.com	\N	\N	NGN	2026-01-01 19:29:22.229646	2026-01-01 19:29:22.229646	f	\N	\N
d18379c6-217e-4d60-8705-a5cae16986b0	Test Org 3	company	test3@example.com	\N	\N	NGN	2026-01-01 21:26:05.273994	2026-01-01 21:26:05.273994	f	\N	\N
ee24b79f-7e0a-48bc-9642-d2d9603a36ab	Test Org 4	company	test4@example.com	\N	\N	NGN	2026-01-01 21:27:06.014502	2026-01-01 21:27:06.014502	f	\N	\N
9696e18f-d53b-45cf-adae-616376d18ad2	Test Org 5	company	test5@example.com	\N	\N	NGN	2026-01-01 21:29:55.996511	2026-01-01 21:29:55.996511	f	\N	\N
9f06a02a-93b2-4044-9f37-b174f537e82a	New Test Org	company	newtest123@gmail.com	\N	\N	NGN	2026-01-01 22:10:25.384797	2026-01-01 22:10:25.384797	f	\N	\N
d09a34a2-4e1d-4048-be05-faa10238aae7	ESL	company	openclax@gmail.com	\N	\N	NGN	2026-01-03 03:56:22.143593	2026-01-03 03:56:22.143593	f	\N	\N
81586752-9ad1-4ba7-92e0-2021626f9412	Demo Organization	demo	demo@miauditops.com	\N	\N	NGN	2026-01-05 04:20:46.065448	2026-01-05 04:20:46.065448	f	\N	\N
4144bb32-2cbb-46df-a2e7-ef96f9acebab	ESL	company	ighodaro.efeandassociates@gmail.com	\N	\N	NGN	2026-01-07 10:50:43.047446	2026-01-07 10:50:43.047446	f	\N	\N
62b4d151-7e74-4012-84fd-d44acedfb8d5	openclax	company	algadginternationalltd@gmail.com	\N	\N	NGN	2026-01-02 01:33:30.587688	2026-01-10 10:13:00.025	t	2026-01-10 10:13:00.025	ss
\.


--
-- Data for Name: payment_declarations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_declarations (id, client_id, date, reported_cash, reported_pos_settlement, reported_transfers, total_reported, notes, supporting_documents, created_by, created_at, updated_at, department_id) FROM stdin;
8f82d3c8-8574-469a-9425-f57d5c669aca	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	40000.00	5000.00	3000.00	48000.00		[]	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 06:22:25.700616	2025-12-27 06:22:25.700616	f23dde76-2b40-440d-a610-3fabca314d0b
1a25be9b-3ffe-486e-a09c-a0a5d7c76f5a	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	0.00	600.00	57000.00	57600.00	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 18:08:25.956607	2025-12-27 18:09:24.805	d2622c15-96da-4602-b5ee-6d3cef69f3bc
d14aeef2-d941-46a0-83aa-60323131bcaf	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	0.00	30000.00	0.00	30000.00	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 18:07:23.387108	2025-12-27 20:12:55.47	11744f70-511a-4909-b546-7ab652b34471
c0c38588-b255-46bb-b99a-277ebfa337f2	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	30000.00	0.00	0.00	30000.00	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 07:42:10.707131	2025-12-28 07:42:10.707131	fc802764-22a2-48f0-b98d-6138aae4998c
06d8c079-2398-488d-ac02-5f039094e1ac	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	20000.00	0.00	40000.00	60000.00	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 07:54:41.934588	2025-12-29 04:22:38.598	11744f70-511a-4909-b546-7ab652b34471
59fdad1a-0087-44af-b85f-f4290b26eb08	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	70000.00	0.00	0.00	70000.00	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 04:25:02.79525	2025-12-29 04:25:02.79525	cbb1ab77-ffdb-4276-837b-56ca8d580a6c
fbf40bfe-6f76-4b06-b9c7-36ceebebbac8	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-29 00:00:00	170000.00	0.00	0.00	170000.00	3k for transport	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 04:41:59.172823	2025-12-29 18:59:17.052	11744f70-511a-4909-b546-7ab652b34471
2ac0cb5d-1b9e-4539-ab57-940e53174583	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-30 00:00:00	0.00	0.00	0.00	0.00	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 04:46:53.801074	2025-12-30 05:00:25.357	dbcba58f-0564-4996-8405-a35573f74989
c046e4e7-a073-4ad1-bfdb-f1a870b0934a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-30 00:00:00	2000.00	1000.00	0.00	3000.00	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 04:47:16.06581	2025-12-30 05:03:56.995	f0dd0739-ff38-4819-b311-c6c9992bd79d
752f36b0-7434-422f-afe1-0d9532ee016d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-31 00:00:00	0.00	7000.00	0.00	7000.00	\N	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 19:53:33.614327	2025-12-31 19:53:33.614327	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482
209f8105-ffc2-480e-86f5-106f52415ae7	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	0.00	0.00	0.00	0.00		[]	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 02:55:50.017554	2025-12-27 02:55:50.017554	a0d2bfcc-32ac-405b-82b8-4ed93c92bf17
81a3cc7e-8d84-4b4a-a98b-5a73dd306b5c	d40fe583-f75d-4714-b3b5-9d83a9a332a9	2026-01-05 00:00:00	0.00	5000.00	500.00	5500.00	\N	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 05:48:43.21889	2026-01-05 05:48:43.21889	c844b11d-6c6c-41ba-a0da-c21646eea96b
db268c84-4a2a-4608-833c-3a3b7b66cca9	0d947773-28ee-4e02-b5b6-40455566817d	2026-01-07 00:00:00	0.00	4000.00	5500.00	9500.00	\N	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:04:34.768913	2026-01-07 15:04:34.768913	657079ba-c71c-40b4-9f66-debfa0a9b109
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payments (id, organization_id, amount, currency, period_covered_start, period_covered_end, status, reference, notes, created_at) FROM stdin;
\.


--
-- Data for Name: platform_admin_audit_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.platform_admin_audit_log (id, admin_id, action_type, target_type, target_id, before_json, after_json, notes, ip_address, user_agent, created_at) FROM stdin;
504e8a7e-788e-4625-8dce-25efd701672f	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	127.0.0.1	curl/8.14.1	2026-01-08 03:16:05.489675
af0ec84b-63a3-4571-b1f7-7f95f951ffaa	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.75.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-08 04:02:22.184566
049d06f5-96f0-41d3-964d-b1f9c152695b	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	\N	\N	\N	102.89.75.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-08 04:02:48.513141
c4a7d53b-2fd2-4a77-9cf3-dca9ed5ad762	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	\N	\N	\N	102.89.75.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-08 04:02:50.036595
52779cea-3a09-4bac-96c9-624772fc9b73	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	logout	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.75.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-08 04:10:30.421952
c7fa851f-2d2a-4797-8153-526e970c0edd	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.75.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-08 04:11:29.071296
2c8da09e-7e1c-4b2c-8ecf-21a6f1ff0581	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	update_subscription	subscription	d09a34a2-4e1d-4048-be05-faa10238aae7	{"id": "ed19e4ef-d25c-48f6-bb15-763d827aa247", "notes": null, "status": "trial", "endDate": null, "planName": "starter", "provider": "manual", "createdAt": "2026-01-03T03:56:22.143Z", "expiresAt": null, "startDate": "2026-01-03T03:56:22.240Z", "updatedAt": "2026-01-03T03:56:22.143Z", "updatedBy": null, "billingPeriod": "monthly", "organizationId": "d09a34a2-4e1d-4048-be05-faa10238aae7", "slotsPurchased": 1, "nextBillingDate": null}	{"id": "ed19e4ef-d25c-48f6-bb15-763d827aa247", "notes": "", "status": "active", "endDate": null, "planName": "enterprise", "provider": "manual", "createdAt": "2026-01-03T03:56:22.143Z", "expiresAt": null, "startDate": "2026-01-03T03:56:22.240Z", "updatedAt": "2026-01-08T04:13:11.943Z", "updatedBy": "a32b98c5-cb4e-4c57-8637-f54baf9e74f6", "billingPeriod": "monthly", "organizationId": "d09a34a2-4e1d-4048-be05-faa10238aae7", "slotsPurchased": 1, "nextBillingDate": null}		102.89.75.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-08 04:13:11.99574
eea7998a-66d9-4838-b8f3-f45f5d594487	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.76.10	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-09 10:20:46.847824
24394c35-a237-4912-8bbc-a153a6c355b6	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.76.161	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-09 18:28:46.577439
5cb97a80-746f-45a8-9d0b-7606b6040226	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.76.161	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 00:06:25.909236
d848a610-ee6a-42c1-bb16-cd1d6adba19d	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:00:15.475717
e1d8be71-67f3-4ff0-b5b6-56bcef8e08eb	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:03:57.204533
10a91cd2-362b-4547-9258-910de5d2852d	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	resend_verification	user	27debef5-907c-463a-97e8-c70cd012dfd7	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:03:59.10668
58874266-3c53-4634-9789-9cc76e231a2b	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	lock_user	user	27debef5-907c-463a-97e8-c70cd012dfd7	{"isLocked": false}	{"reason": "h", "isLocked": true}	h	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:04:21.751622
0ca1ba7c-1e4f-4c3c-ae27-326c606c4612	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	resend_verification	user	27debef5-907c-463a-97e8-c70cd012dfd7	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:04:37.932715
06f55e1e-6c2d-4980-af30-396cd5ecc7f2	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	27debef5-907c-463a-97e8-c70cd012dfd7	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:04:42.976662
9abc9ea0-6c09-4d56-9b8f-c3935805ef47	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	lock_user	user	08cae6ca-1bda-42e0-8cee-bdb28d071529	{"isLocked": false}	{"reason": "hj", "isLocked": true}	hj	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:05:05.280591
1e034e5e-d6cc-47d1-bc53-3202971964ff	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	08cae6ca-1bda-42e0-8cee-bdb28d071529	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:05:17.182374
b6b16fb5-df8d-4801-913f-e18ce5c6f9cf	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	unlock_user	user	08cae6ca-1bda-42e0-8cee-bdb28d071529	{"isLocked": true}	{"isLocked": false}	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:05:18.866733
44ea353a-cf3c-4fd8-a0ea-8baada30a50d	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	08cae6ca-1bda-42e0-8cee-bdb28d071529	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:05:22.144687
e5c7d8fa-672b-473a-b774-f86f55cb09b4	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	08cae6ca-1bda-42e0-8cee-bdb28d071529	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:05:23.588003
0dd32e32-4b16-497e-bc5c-53ef08ced1cf	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	08cae6ca-1bda-42e0-8cee-bdb28d071529	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:05:25.111258
76975522-f722-46ab-956e-518f0b617f75	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	logout	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:22:11.151579
48fc0f9b-2f21-46ea-b054-552263fb142c	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 05:22:21.475392
8282fe8e-b757-4991-b5c2-77e4b8d166c7	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 05:52:48.245234
5b96decf-e50c-47db-b153-f99cab81561f	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	update_plan	subscription_plan	2654d29e-d5a8-4bd1-bf5a-14374f3da8be	{"id": "2654d29e-d5a8-4bd1-bf5a-14374f3da8be", "slug": "growth", "currency": "NGN", "isActive": true, "maxSeats": 5, "createdAt": "2026-01-10T05:32:40.238Z", "sortOrder": 2, "updatedAt": "2026-01-10T05:32:40.238Z", "maxClients": 3, "description": "For growing businesses with more needs", "displayName": "Growth", "yearlyPrice": "336000.00", "monthlyPrice": "35000.00", "retentionDays": 90, "canViewReports": true, "quarterlyPrice": "94500.00", "canPrintReports": true, "canDownloadReports": true, "canUseBetaFeatures": false, "maxMainStorePerClient": 1, "canAccessSecondHitPage": false, "maxSrdDepartmentsPerClient": 7, "canDownloadSecondHitFullTable": false, "canAccessPurchasesRegisterPage": true, "canDownloadMainStoreLedgerSummary": false}	{"id": "2654d29e-d5a8-4bd1-bf5a-14374f3da8be", "slug": "growth", "currency": "NGN", "isActive": true, "maxSeats": 5, "createdAt": "2026-01-10T05:32:40.238Z", "sortOrder": 2, "updatedAt": "2026-01-10T05:57:56.438Z", "maxClients": 3, "description": "For growing businesses with more needs", "displayName": "Growth", "yearlyPrice": "336000.00", "monthlyPrice": "35000.00", "retentionDays": 180, "canViewReports": true, "quarterlyPrice": "94500.00", "canPrintReports": true, "canDownloadReports": true, "canUseBetaFeatures": false, "maxMainStorePerClient": 1, "canAccessSecondHitPage": false, "maxSrdDepartmentsPerClient": 7, "canDownloadSecondHitFullTable": false, "canAccessPurchasesRegisterPage": true, "canDownloadMainStoreLedgerSummary": false}	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 05:57:56.48049
7550d985-a693-46f8-83cc-a2031713b26e	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	lock_user	user	0ff460ab-5b96-4b2d-b85f-d04c54faf25f	{"isLocked": false}	{"reason": "sd", "isLocked": true}	sd	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 06:18:32.006634
362d621f-5f6a-4e4c-8b5a-0292e22533b7	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	2026-01-10 06:29:50.831993
942ab4ce-2373-4482-b0af-0eb0f6c20d0c	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 09:36:41.634024
a1cc4e6b-2945-4718-9c49-24d0c67409b1	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	update_plan	subscription_plan	0021adbe-a63b-48ef-bd9b-8be125d2e378	{"id": "0021adbe-a63b-48ef-bd9b-8be125d2e378", "slug": "starter", "currency": "NGN", "isActive": true, "maxSeats": 2, "createdAt": "2026-01-10T05:32:40.238Z", "sortOrder": 1, "updatedAt": "2026-01-10T05:32:40.238Z", "maxClients": 1, "description": "Perfect for small businesses getting started", "displayName": "Starter", "yearlyPrice": "144000.00", "monthlyPrice": "15000.00", "retentionDays": 90, "canViewReports": true, "quarterlyPrice": "40500.00", "canPrintReports": false, "canDownloadReports": true, "canUseBetaFeatures": false, "maxMainStorePerClient": 1, "canAccessSecondHitPage": false, "maxSrdDepartmentsPerClient": 4, "canDownloadSecondHitFullTable": false, "canAccessPurchasesRegisterPage": false, "canDownloadMainStoreLedgerSummary": false}	{"id": "0021adbe-a63b-48ef-bd9b-8be125d2e378", "slug": "starter", "currency": "NGN", "isActive": true, "maxSeats": 2, "createdAt": "2026-01-10T05:32:40.238Z", "sortOrder": 1, "updatedAt": "2026-01-10T09:37:25.354Z", "maxClients": 1, "description": "Perfect for small businesses getting started", "displayName": "Starter", "yearlyPrice": "144000.00", "monthlyPrice": "45000.00", "retentionDays": 90, "canViewReports": true, "quarterlyPrice": "40500.00", "canPrintReports": false, "canDownloadReports": true, "canUseBetaFeatures": false, "maxMainStorePerClient": 1, "canAccessSecondHitPage": false, "maxSrdDepartmentsPerClient": 4, "canDownloadSecondHitFullTable": false, "canAccessPurchasesRegisterPage": false, "canDownloadMainStoreLedgerSummary": false}	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 09:37:25.409975
51eed701-3a6b-4e9f-ac05-c3a87ff33692	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	update_plan	subscription_plan	0021adbe-a63b-48ef-bd9b-8be125d2e378	{"id": "0021adbe-a63b-48ef-bd9b-8be125d2e378", "slug": "starter", "currency": "NGN", "isActive": true, "maxSeats": 2, "createdAt": "2026-01-10T05:32:40.238Z", "sortOrder": 1, "updatedAt": "2026-01-10T09:37:25.354Z", "maxClients": 1, "description": "Perfect for small businesses getting started", "displayName": "Starter", "yearlyPrice": "144000.00", "monthlyPrice": "45000.00", "retentionDays": 90, "canViewReports": true, "quarterlyPrice": "40500.00", "canPrintReports": false, "canDownloadReports": true, "canUseBetaFeatures": false, "maxMainStorePerClient": 1, "canAccessSecondHitPage": false, "maxSrdDepartmentsPerClient": 4, "canDownloadSecondHitFullTable": false, "canAccessPurchasesRegisterPage": false, "canDownloadMainStoreLedgerSummary": false}	{"id": "0021adbe-a63b-48ef-bd9b-8be125d2e378", "slug": "starter", "currency": "NGN", "isActive": true, "maxSeats": 2, "createdAt": "2026-01-10T05:32:40.238Z", "sortOrder": 1, "updatedAt": "2026-01-10T09:38:12.528Z", "maxClients": 1, "description": "Perfect for small businesses getting started", "displayName": "Starter", "yearlyPrice": "144000.00", "monthlyPrice": "1000.00", "retentionDays": 90, "canViewReports": true, "quarterlyPrice": "40500.00", "canPrintReports": false, "canDownloadReports": true, "canUseBetaFeatures": false, "maxMainStorePerClient": 1, "canAccessSecondHitPage": false, "maxSrdDepartmentsPerClient": 4, "canDownloadSecondHitFullTable": false, "canAccessPurchasesRegisterPage": false, "canDownloadMainStoreLedgerSummary": false}	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 09:38:12.585933
15e70057-5536-4c0e-91c1-090e8018aeb5	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	grant_free_access	subscription	4144bb32-2cbb-46df-a2e7-ef96f9acebab	{"id": "f129ca8c-5574-4cf4-a19d-baaf720c036c", "notes": "Upgraded to growth plan by admin request", "status": "active", "endDate": null, "planName": "growth", "provider": "manual", "createdAt": "2026-01-07T10:50:43.047Z", "expiresAt": null, "startDate": "2026-01-07T10:50:43.124Z", "updatedAt": "2026-01-07T10:59:18.550Z", "updatedBy": null, "billingPeriod": "monthly", "organizationId": "4144bb32-2cbb-46df-a2e7-ef96f9acebab", "slotsPurchased": 1, "lastPaymentDate": null, "nextBillingDate": null, "maxSeatsOverride": null, "paystackPlanCode": null, "lastPaymentAmount": null, "maxClientsOverride": null, "paystackEmailToken": null, "lastPaymentReference": null, "maxMainStoreOverride": null, "paystackCustomerCode": null, "retentionDaysOverride": null, "paystackSubscriptionCode": null, "maxSrdDepartmentsOverride": null}	{"id": "f129ca8c-5574-4cf4-a19d-baaf720c036c", "notes": "Free access granted by platform admin", "status": "active", "endDate": null, "planName": "starter", "provider": "manual_free", "createdAt": "2026-01-07T10:50:43.047Z", "expiresAt": "2026-01-11T00:00:00.000Z", "startDate": "2026-01-07T10:50:43.124Z", "updatedAt": "2026-01-10T09:40:04.338Z", "updatedBy": "a32b98c5-cb4e-4c57-8637-f54baf9e74f6", "billingPeriod": "monthly", "organizationId": "4144bb32-2cbb-46df-a2e7-ef96f9acebab", "slotsPurchased": 1, "lastPaymentDate": null, "nextBillingDate": null, "maxSeatsOverride": null, "paystackPlanCode": null, "lastPaymentAmount": null, "maxClientsOverride": null, "paystackEmailToken": null, "lastPaymentReference": null, "maxMainStoreOverride": null, "paystackCustomerCode": null, "retentionDaysOverride": null, "paystackSubscriptionCode": null, "maxSrdDepartmentsOverride": null}		102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 09:40:04.397303
bda1e4ef-2262-4dd3-9bc8-d6fcfe35411f	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	grant_free_access	subscription	4144bb32-2cbb-46df-a2e7-ef96f9acebab	{"id": "f129ca8c-5574-4cf4-a19d-baaf720c036c", "notes": "Free access granted by platform admin", "status": "active", "endDate": null, "planName": "starter", "provider": "manual_free", "createdAt": "2026-01-07T10:50:43.047Z", "expiresAt": "2026-01-11T00:00:00.000Z", "startDate": "2026-01-07T10:50:43.124Z", "updatedAt": "2026-01-10T09:40:04.338Z", "updatedBy": "a32b98c5-cb4e-4c57-8637-f54baf9e74f6", "billingPeriod": "monthly", "organizationId": "4144bb32-2cbb-46df-a2e7-ef96f9acebab", "slotsPurchased": 1, "lastPaymentDate": null, "nextBillingDate": null, "maxSeatsOverride": null, "paystackPlanCode": null, "lastPaymentAmount": null, "maxClientsOverride": null, "paystackEmailToken": null, "lastPaymentReference": null, "maxMainStoreOverride": null, "paystackCustomerCode": null, "retentionDaysOverride": null, "paystackSubscriptionCode": null, "maxSrdDepartmentsOverride": null}	{"id": "f129ca8c-5574-4cf4-a19d-baaf720c036c", "notes": "Free access granted by platform admin", "status": "active", "endDate": null, "planName": "starter", "provider": "manual_free", "createdAt": "2026-01-07T10:50:43.047Z", "expiresAt": "2026-02-10T00:00:00.000Z", "startDate": "2026-01-07T10:50:43.124Z", "updatedAt": "2026-01-10T09:40:36.666Z", "updatedBy": "a32b98c5-cb4e-4c57-8637-f54baf9e74f6", "billingPeriod": "monthly", "organizationId": "4144bb32-2cbb-46df-a2e7-ef96f9acebab", "slotsPurchased": 1, "lastPaymentDate": null, "nextBillingDate": null, "maxSeatsOverride": null, "paystackPlanCode": null, "lastPaymentAmount": null, "maxClientsOverride": null, "paystackEmailToken": null, "lastPaymentReference": null, "maxMainStoreOverride": null, "paystackCustomerCode": null, "retentionDaysOverride": null, "paystackSubscriptionCode": null, "maxSrdDepartmentsOverride": null}		102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 09:40:36.72023
7a6ffb8a-7469-417d-a964-62ea920d6ac0	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	grant_free_access	subscription	4144bb32-2cbb-46df-a2e7-ef96f9acebab	{"id": "f129ca8c-5574-4cf4-a19d-baaf720c036c", "notes": "Free access granted by platform admin", "status": "active", "endDate": null, "planName": "starter", "provider": "manual_free", "createdAt": "2026-01-07T10:50:43.047Z", "expiresAt": "2026-02-10T00:00:00.000Z", "startDate": "2026-01-07T10:50:43.124Z", "updatedAt": "2026-01-10T09:40:36.666Z", "updatedBy": "a32b98c5-cb4e-4c57-8637-f54baf9e74f6", "billingPeriod": "monthly", "organizationId": "4144bb32-2cbb-46df-a2e7-ef96f9acebab", "slotsPurchased": 1, "lastPaymentDate": null, "nextBillingDate": null, "maxSeatsOverride": null, "paystackPlanCode": null, "lastPaymentAmount": null, "maxClientsOverride": null, "paystackEmailToken": null, "lastPaymentReference": null, "maxMainStoreOverride": null, "paystackCustomerCode": null, "retentionDaysOverride": null, "paystackSubscriptionCode": null, "maxSrdDepartmentsOverride": null}	{"id": "f129ca8c-5574-4cf4-a19d-baaf720c036c", "notes": "Free access granted by platform admin", "status": "active", "endDate": null, "planName": "starter", "provider": "manual_free", "createdAt": "2026-01-07T10:50:43.047Z", "expiresAt": "2026-01-11T00:00:00.000Z", "startDate": "2026-01-07T10:50:43.124Z", "updatedAt": "2026-01-10T09:41:43.994Z", "updatedBy": "a32b98c5-cb4e-4c57-8637-f54baf9e74f6", "billingPeriod": "monthly", "organizationId": "4144bb32-2cbb-46df-a2e7-ef96f9acebab", "slotsPurchased": 1, "lastPaymentDate": null, "nextBillingDate": null, "maxSeatsOverride": null, "paystackPlanCode": null, "lastPaymentAmount": null, "maxClientsOverride": null, "paystackEmailToken": null, "lastPaymentReference": null, "maxMainStoreOverride": null, "paystackCustomerCode": null, "retentionDaysOverride": null, "paystackSubscriptionCode": null, "maxSrdDepartmentsOverride": null}		102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 09:41:44.051024
c9883688-f46c-448c-961c-6b238da7e595	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	suspend_org	organization	62b4d151-7e74-4012-84fd-d44acedfb8d5	{"id": "62b4d151-7e74-4012-84fd-d44acedfb8d5", "name": "openclax", "type": "company", "email": "algadginternationalltd@gmail.com", "phone": null, "users": [{"id": "08cae6ca-1bda-42e0-8cee-bdb28d071529", "role": "super_admin", "email": "algadginternationalltd@gmail.com", "status": "active", "fullName": "Ighodaro Nosa Ogiemwanye", "isLocked": false, "createdAt": "2026-01-02T01:33:30.587Z", "lastLoginAt": "2026-01-03T03:54:11.948Z", "emailVerified": true}], "address": null, "createdAt": "2026-01-02T01:33:30.587Z", "updatedAt": "2026-01-02T01:33:30.587Z", "userCount": 1, "clientCount": 0, "isSuspended": false, "suspendedAt": null, "currencyCode": "NGN", "subscription": {"id": "08511ffc-3d88-459f-9024-a497957f91fd", "notes": null, "status": "trial", "endDate": null, "planName": "starter", "provider": "manual", "createdAt": "2026-01-02T01:33:30.587Z", "expiresAt": null, "startDate": "2026-01-02T01:33:30.681Z", "updatedAt": "2026-01-02T01:33:30.587Z", "updatedBy": null, "billingPeriod": "monthly", "organizationId": "62b4d151-7e74-4012-84fd-d44acedfb8d5", "slotsPurchased": 1, "lastPaymentDate": null, "nextBillingDate": null, "maxSeatsOverride": null, "paystackPlanCode": null, "lastPaymentAmount": null, "maxClientsOverride": null, "paystackEmailToken": null, "lastPaymentReference": null, "maxMainStoreOverride": null, "paystackCustomerCode": null, "retentionDaysOverride": null, "paystackSubscriptionCode": null, "maxSrdDepartmentsOverride": null}, "suspendedReason": null}	{"id": "62b4d151-7e74-4012-84fd-d44acedfb8d5", "name": "openclax", "type": "company", "email": "algadginternationalltd@gmail.com", "phone": null, "users": [{"id": "08cae6ca-1bda-42e0-8cee-bdb28d071529", "role": "super_admin", "email": "algadginternationalltd@gmail.com", "status": "active", "fullName": "Ighodaro Nosa Ogiemwanye", "isLocked": false, "createdAt": "2026-01-02T01:33:30.587Z", "lastLoginAt": "2026-01-03T03:54:11.948Z", "emailVerified": true}], "address": null, "createdAt": "2026-01-02T01:33:30.587Z", "updatedAt": "2026-01-10T10:13:00.025Z", "userCount": 1, "clientCount": 0, "isSuspended": true, "suspendedAt": "2026-01-10T10:13:00.025Z", "currencyCode": "NGN", "subscription": {"id": "08511ffc-3d88-459f-9024-a497957f91fd", "notes": null, "status": "trial", "endDate": null, "planName": "starter", "provider": "manual", "createdAt": "2026-01-02T01:33:30.587Z", "expiresAt": null, "startDate": "2026-01-02T01:33:30.681Z", "updatedAt": "2026-01-02T01:33:30.587Z", "updatedBy": null, "billingPeriod": "monthly", "organizationId": "62b4d151-7e74-4012-84fd-d44acedfb8d5", "slotsPurchased": 1, "lastPaymentDate": null, "nextBillingDate": null, "maxSeatsOverride": null, "paystackPlanCode": null, "lastPaymentAmount": null, "maxClientsOverride": null, "paystackEmailToken": null, "lastPaymentReference": null, "maxMainStoreOverride": null, "paystackCustomerCode": null, "retentionDaysOverride": null, "paystackSubscriptionCode": null, "maxSrdDepartmentsOverride": null}, "suspendedReason": "ss"}	ss	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 10:13:00.267904
ea8b71b6-5e5b-4b83-876a-afd65cb73af1	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	force_logout	user	08cae6ca-1bda-42e0-8cee-bdb28d071529	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 10:14:19.620003
991d2977-6525-408c-9936-48f7422da1a6	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	send_password_reset	user	08cae6ca-1bda-42e0-8cee-bdb28d071529	\N	\N	\N	102.89.69.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-10 10:14:25.60063
37cad554-b844-45cb-a9c9-ac5ad0594bae	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	login	platform_admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	185.107.56.156	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-12 14:00:51.536179
\.


--
-- Data for Name: platform_admin_users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.platform_admin_users (id, email, password, name, role, is_active, last_login_at, login_attempts, locked_until, created_at, updated_at) FROM stdin;
a32b98c5-cb4e-4c57-8637-f54baf9e74f6	miemploya@gmail.com	$2b$12$cLaBgGo4k7VH1eWbVbHqEu5YdvLwiZQqZvOFb5kPd6KtH14E36b5O	Admin	platform_super_admin	t	2026-01-12 14:00:51.485	0	\N	2026-01-08 03:13:11.854841	2026-01-12 14:00:51.485
\.


--
-- Data for Name: purchase_item_events; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_item_events (id, client_id, srd_id, item_id, date, qty, unit_cost_at_purchase, total_cost, supplier_name, invoice_no, notes, created_by, created_at, updated_at) FROM stdin;
2c8a9076-cc90-42b5-b486-91be01128616	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2026-01-01 00:00:00	2000.00	600.00	1200000.00	\N	\N	Auto-logged from inventory purchase capture	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 05:21:53.29624	2026-01-01 05:21:53.29624
ce6a6b30-39c9-4241-a839-89eb37b234ec	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-01 00:00:00	1000.00	500.00	500000.00	\N	\N	Auto-logged from inventory purchase capture	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 03:48:45.580168	2026-01-05 03:48:45.580168
6146ca60-706d-419b-b169-52eb1141a3c0	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2025-12-25 00:00:00	500.00	500.00	250000.00	\N	\N	Auto-logged from inventory purchase capture	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 03:49:02.113842	2026-01-05 03:49:02.113842
f7230174-c9d0-4ed5-a9b6-f2cd8105ea16	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2025-12-15 00:00:00	1200.00	500.00	600000.00	\N	\N	Auto-logged from inventory purchase capture	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 03:50:15.92494	2026-01-05 03:50:15.92494
270366fa-65ed-41f0-9955-ac927553f85f	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-01 00:00:00	1000.00	500.00	500000.00	\N	\N	Auto-logged from inventory purchase capture	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:10:52.553743	2026-01-07 07:10:52.553743
5d4d288a-f1bc-402b-94cd-76188a655d6a	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-01 00:00:00	1000.00	500.00	500000.00	\N	\N	Auto-logged from inventory purchase capture	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 10:47:37.93466	2026-01-07 10:47:37.93466
cde61332-2b4c-427d-b643-68c7d8ab8630	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-07 00:00:00	1000.00	500.00	500000.00	\N	\N	Auto-logged from inventory purchase capture	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 14:57:18.934036	2026-01-07 14:57:18.934036
bd4531d0-74b3-46e0-927c-353054457cdd	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-07 00:00:00	1000.00	500.00	500000.00	\N	\N	Auto-logged from inventory purchase capture	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 14:57:38.015128	2026-01-07 14:57:38.015128
ef7830b1-0fa7-4fa1-b3f6-4d76fc01679d	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2329f86b-aabd-4aac-b4f2-8e572f51588b	2026-01-07 00:00:00	1000.00	500.00	500000.00	\N	\N	Auto-logged from inventory purchase capture	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 14:57:30.493818	2026-01-08 01:51:46.652
f8a53498-5c3e-4e1d-ac5b-f948e55edc83	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-08 00:00:00	2000.00	500.00	1000000.00	\N	\N	Auto-logged from inventory purchase capture	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 20:10:58.756412	2026-01-08 20:10:58.756412
6e3c2881-c0fe-4d4d-9ee4-26b5d9080c4d	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-06 00:00:00	1000.00	500.00	500000.00	\N	\N	Auto-logged from inventory purchase capture	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 19:57:11.130244	2026-01-09 19:57:11.130244
7d4d65c1-bc13-4253-9d29-7be17f12d88c	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-06 00:00:00	1300.00	500.00	650000.00	\N	\N	Auto-logged from inventory purchase capture	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 23:17:21.632038	2026-01-09 23:17:21.632038
e5d91e1e-5c6b-45f5-9bdb-6c6c01d20ebd	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	f051da21-7909-458e-9c63-d176f6106a0a	2026-01-10 00:00:00	2000.00	500.00	1000000.00	\N	\N	Auto-logged from inventory purchase capture	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 01:16:55.770976	2026-01-10 01:16:55.770976
\.


--
-- Data for Name: purchase_lines; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_lines (id, purchase_id, item_id, quantity, unit_price, total_price, created_at) FROM stdin;
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchases (id, supplier_name, invoice_ref, invoice_date, total_amount, status, evidence_url, created_by, created_at, client_id, department_id) FROM stdin;
49d47ec6-a65a-49a2-ae33-ae2776630ddf	Premium Beverages Ltd	INV-2025-001	2025-12-25 08:34:06.774	2450.00	received	\N	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.775407	cd88a504-b3b8-47c8-95be-9cee691f82e1	a0d2bfcc-32ac-405b-82b8-4ed93c92bf17
fe0f58e6-240f-42ee-948f-5f9d44ec3efb	Fresh Foods Co	INV-2025-002	2025-12-26 08:34:06.774	1280.00	pending	\N	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.778519	cd88a504-b3b8-47c8-95be-9cee691f82e1	a0d2bfcc-32ac-405b-82b8-4ed93c92bf17
\.


--
-- Data for Name: receivable_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.receivable_history (id, receivable_id, action, previous_status, new_status, amount_paid, notes, created_by, created_at) FROM stdin;
dd41f4e5-15d6-4a87-b38f-6c4c3babc192	eb1e3b28-7660-4f68-8f91-8785e9ebbabf	created	\N	open	\N	Initial receivable created	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 04:42:57.4057
\.


--
-- Data for Name: receivables; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.receivables (id, client_id, department_id, audit_date, variance_amount, amount_paid, balance_remaining, status, comments, evidence_url, created_by, created_at, updated_at) FROM stdin;
eb1e3b28-7660-4f68-8f91-8785e9ebbabf	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	f0dd0739-ff38-4819-b311-c6c9992bd79d	2025-12-28 00:00:00	5000.00	0.00	5000.00	open	missing sale	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 04:42:57.399299	2026-01-01 04:42:57.399299
\.


--
-- Data for Name: reconciliations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reconciliations (id, department_id, date, opening_stock, additions, expected_usage, physical_count, variance_qty, variance_value, status, created_by, created_at, approved_by, approved_at, client_id) FROM stdin;
050a27e9-8207-4cd3-8670-76f62513fb43	11744f70-511a-4909-b546-7ab652b34471	2025-12-30 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	0.00	0.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 23:31:31.460188	\N	\N	fb428d91-bacb-44ed-b4cd-310c87c5a8de
40bfd930-ac9d-4a99-836c-ff33d898c608	dbcba58f-0564-4996-8405-a35573f74989	2025-12-30 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	0.00	0.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 23:53:44.147304	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
f834436a-a97b-4bc5-a840-ba5621be5720	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	2026-01-01 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	0.00	0.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:47:53.987251	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
d47a2792-4a52-4e7b-8ed0-1b752f7fb97b	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	2026-01-01 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	0.00	0.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:50:55.103659	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
b4ef0d0d-1011-4d93-9e4a-d298420d7bcf	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	2025-12-31 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 7000, "quantity": 7000}	{"value": 0, "quantity": 0}	-8.00	-80.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:51:27.00889	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
18e6cf63-d924-4a62-bc02-27d1896145df	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	2025-12-30 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	0.00	0.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 23:57:14.022306	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
e2678f90-1fa2-4241-bf19-3834588815c3	f0dd0739-ff38-4819-b311-c6c9992bd79d	2026-01-01 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	0.00	0.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 00:03:11.77393	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
bb04123d-1275-48ce-a8f1-ebed84584f18	dbcba58f-0564-4996-8405-a35573f74989	2026-01-01 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	0.00	0.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 00:03:24.346791	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
6b2d31f2-4fcb-44b5-adec-d7ad88dabe45	dbcba58f-0564-4996-8405-a35573f74989	2025-12-29 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	0.00	0.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 00:03:39.016178	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
a7a9f73a-30d7-4dbb-b7e1-fad227022bcd	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	2025-12-29 00:00:00	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	{"value": 0, "quantity": 0}	-5.00	-50.00	submitted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 00:03:46.022808	\N	\N	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c
7eb069d7-485e-4152-923c-48d21ceb46c9	69debcb5-7367-4a88-ab30-e03a623099e1	2025-12-25 08:34:06.796	{"GG-750": 8, "HEI-330": 48, "JWB-750": 12}	{"GG-750": 24, "HEI-330": 48, "JWB-750": 24}	{"GG-750": 10, "HEI-330": 36, "JWB-750": 8}	{"GG-750": 22, "HEI-330": 58, "JWB-750": 27}	-3.00	-50.00	pending	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.797723	\N	\N	cd88a504-b3b8-47c8-95be-9cee691f82e1
\.


--
-- Data for Name: sales_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_entries (id, department_id, date, shift, cash_amount, pos_amount, transfer_amount, voids_amount, discounts_amount, total_sales, mode, evidence_url, created_by, created_at, client_id, amount, complimentary_amount, vouchers_amount, others_amount) FROM stdin;
b6b8a01f-ae2c-4227-a36a-e51c963d9ff3	d2622c15-96da-4602-b5ee-6d3cef69f3bc	2025-12-27 00:00:00	full	4000.00	30000.00	23600.00	100.00	0.00	57500.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 08:47:28.852462	fb428d91-bacb-44ed-b4cd-310c87c5a8de	0.00	0.00	0.00	0.00
2444e8cd-71de-4718-ad1a-c14615b7027d	11744f70-511a-4909-b546-7ab652b34471	2025-12-28 00:00:00	full	58000.00	0.00	2000.00	20000.00	0.00	40000.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 08:55:27.952736	fb428d91-bacb-44ed-b4cd-310c87c5a8de	0.00	0.00	0.00	0.00
f5284b4a-d7e5-4312-8893-7c5cbd29de49	f23dde76-2b40-440d-a610-3fabca314d0b	2025-12-27 00:00:00	full	0.00	0.00	25000.00	3000.00	0.00	22000.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 05:53:59.954944	fb428d91-bacb-44ed-b4cd-310c87c5a8de	0.00	0.00	0.00	0.00
e9e7138a-1c94-4802-95ec-18e19652badd	11744f70-511a-4909-b546-7ab652b34471	2025-12-27 00:00:00	full	30000.00	700.00	10000.00	0.00	0.00	40700.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 08:46:43.525697	fb428d91-bacb-44ed-b4cd-310c87c5a8de	0.00	0.00	0.00	0.00
bf8bc256-4187-442a-84b8-aabfc7cfdf03	fc802764-22a2-48f0-b98d-6138aae4998c	2025-12-27 00:00:00	full	20000.00	23000.00	5000.00	1000.00	0.00	47000.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 19:02:53.15921	fb428d91-bacb-44ed-b4cd-310c87c5a8de	0.00	0.00	0.00	0.00
25ac3569-f934-40a4-af80-5adca69fd03a	cbb1ab77-ffdb-4276-837b-56ca8d580a6c	2025-12-27 00:00:00	full	20000.00	5000.00	500.00	2000.00	0.00	23500.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 18:16:36.540477	fb428d91-bacb-44ed-b4cd-310c87c5a8de	0.00	0.00	0.00	0.00
5f92ccdb-b14e-47d5-b89c-6f07c507e7db	cbb1ab77-ffdb-4276-837b-56ca8d580a6c	2025-12-28 00:00:00	full	62800.00	0.00	20000.00	0.00	0.00	82800.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-27 23:11:42.228628	fb428d91-bacb-44ed-b4cd-310c87c5a8de	0.00	0.00	0.00	0.00
648763c6-dad2-4295-92b1-b35f8beaeebf	11744f70-511a-4909-b546-7ab652b34471	2025-12-29 00:00:00	full	100500.00	20000.00	30000.00	1000.00	0.00	174000.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 04:30:28.400861	fb428d91-bacb-44ed-b4cd-310c87c5a8de	180000.00	3000.00	1000.00	1000.00
3bb3b0b3-c632-430d-83b7-a38797798526	d2622c15-96da-4602-b5ee-6d3cef69f3bc	2025-12-29 00:00:00	full	0.00	0.00	0.00	0.00	0.00	40000.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 16:27:36.312561	fb428d91-bacb-44ed-b4cd-310c87c5a8de	40000.00	0.00	0.00	0.00
9cdcb5f1-0b6b-484c-9817-5b64fb7812a4	f0dd0739-ff38-4819-b311-c6c9992bd79d	2025-12-30 00:00:00	full	0.00	0.00	0.00	0.00	0.00	3000.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 04:44:02.197054	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	3000.00	0.00	0.00	0.00
1fe06033-c5ce-45bc-8d06-9c1fa691d113	dbcba58f-0564-4996-8405-a35573f74989	2025-12-30 00:00:00	full	0.00	0.00	0.00	0.00	0.00	5000.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 07:08:11.057696	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	5000.00	0.00	0.00	0.00
ff642961-04b1-4350-acc8-1bc364736bf6	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	2025-12-31 00:00:00	full	0.00	0.00	0.00	0.00	0.00	7000.00	summary	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 19:52:36.186987	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	7000.00	0.00	0.00	0.00
5d2a8f3c-3e09-4dc2-a3d3-d73111db9575	69debcb5-7367-4a88-ab30-e03a623099e1	2025-12-25 08:34:06.75	morning	1250.00	2340.00	560.00	45.00	120.00	3985.00	summary	\N	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.752755	cd88a504-b3b8-47c8-95be-9cee691f82e1	0.00	0.00	0.00	0.00
cf918e02-aaca-4fa4-8200-77b195064ab6	69debcb5-7367-4a88-ab30-e03a623099e1	2025-12-25 08:34:06.75	evening	2890.00	4520.00	980.00	65.00	250.00	8075.00	summary	\N	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.759846	cd88a504-b3b8-47c8-95be-9cee691f82e1	0.00	0.00	0.00	0.00
d28a67e4-62e7-4606-b81f-ef2b8a56bf8c	69debcb5-7367-4a88-ab30-e03a623099e1	2025-12-26 08:34:06.75	morning	980.00	1890.00	420.00	30.00	95.00	3165.00	summary	\N	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.763053	cd88a504-b3b8-47c8-95be-9cee691f82e1	0.00	0.00	0.00	0.00
2aaa4916-ae57-43ec-b099-e9916f6db87d	98cf9a3f-4e15-49d8-abbc-6a80789d36e6	2025-12-25 08:34:06.75	full	890.00	1560.00	340.00	25.00	80.00	2685.00	summary	\N	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.767621	cd88a504-b3b8-47c8-95be-9cee691f82e1	0.00	0.00	0.00	0.00
d45c5b8f-482c-40c4-add5-24eef6a9f36b	9197d0f0-9a61-42fe-a42e-115e3b4d8324	2025-12-26 08:34:06.75	full	1120.00	2100.00	380.00	40.00	110.00	3450.00	summary	\N	63ab12e8-e632-4c1a-919e-056eaf8cfe8a	2025-12-26 08:34:06.770814	cd88a504-b3b8-47c8-95be-9cee691f82e1	0.00	0.00	0.00	0.00
9ebc56d2-e5e2-48e8-831a-9db3025e2c17	c844b11d-6c6c-41ba-a0da-c21646eea96b	2026-01-05 00:00:00	full	0.00	0.00	0.00	0.00	0.00	6000.00	summary	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 05:48:23.1439	d40fe583-f75d-4714-b3b5-9d83a9a332a9	6000.00	0.00	0.00	0.00
3c96041f-2ae0-4804-87b3-7d81d823e0bc	657079ba-c71c-40b4-9f66-debfa0a9b109	2026-01-07 00:00:00	full	0.00	0.00	0.00	0.00	0.00	10000.00	summary	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:02:51.9694	0d947773-28ee-4e02-b5b6-40455566817d	10000.00	0.00	0.00	0.00
ed80e1cf-b4b7-4cf2-a48a-1c9bd6d04c6f	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	2026-01-07 00:00:00	full	0.00	0.00	0.00	1000.00	0.00	14000.00	summary	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:03:19.806761	0d947773-28ee-4e02-b5b6-40455566817d	15000.00	0.00	0.00	0.00
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
6_fuYlgjKHlv4eYZgk9n4fFqH2R6UQkw	{"cookie":{"originalMaxAge":7200000,"expires":"2026-01-12T16:53:54.516Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":"5ed0ccee-d55a-4700-b092-efa7e84a1907","role":"super_admin","createdAt":1768226803475}	2026-01-12 16:53:55
FDAHUKDxXRWekT4yj27UX3dJty8OKXoc	{"cookie":{"originalMaxAge":7200000,"expires":"2026-01-12T13:23:18.981Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":"6419147a-44c1-4f3c-bbcb-51a46a91d1be","role":"super_admin","createdAt":1768216997395}	2026-01-12 13:23:19
\.


--
-- Data for Name: srd_ledger_daily; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.srd_ledger_daily (id, client_id, srd_id, srd_type, item_id, ledger_date, opening_qty, closing_qty, purchase_added_qty, returns_in_qty, req_dep_total_qty, from_main_qty, inter_in_qty, inter_out_qty, returns_out_to_main, sold_qty, waste_qty, write_off_qty, adjustment_qty, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: srd_stock_movements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.srd_stock_movements (id, client_id, movement_date, event_type, from_srd_id, to_srd_id, item_id, qty, description, is_deleted, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: srd_transfers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.srd_transfers (id, ref_id, client_id, from_srd_id, to_srd_id, item_id, qty, transfer_date, transfer_type, notes, status, created_by, created_at) FROM stdin;
03568033-47e0-4868-9d3b-01714dd82191	TRF-20251231-001	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	400.00	2025-12-31 00:00:00	issue	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:49:40.948947
52cf57e1-aba4-40d3-b980-ad1f63d9ace6	TRF-20251202-001	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	2f64a260-d98d-40cc-bd44-346f94737415	150.00	2025-12-02 00:00:00	issue	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:40.457423
d5be6e7b-9126-4a9f-bb5e-6fe630d53e06	TRF-20251202-002	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	150.00	2025-12-02 00:00:00	issue	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:10:32.573048
48d5e469-ecc0-49ab-91cd-a3645549a38a	TRF-20251202-003	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	150.00	2025-12-02 00:00:00	issue	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:11:25.517446
981019fe-ae62-4f04-8102-84baeb644d99	TRF-20251202-004	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	150.00	2025-12-02 00:00:00	issue	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:11:43.096307
a0a23c2f-4bfc-4ba6-890f-989034ea79b2	TRF-20251203-001	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	200.00	2025-12-03 00:00:00	issue	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:17:24.401215
8d9cc871-5b21-4a34-8cc1-d65b3a1ca649	TRF-20260101-001	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	200.00	2026-01-01 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 03:53:57.281748
2b1f2bd9-9d92-4d10-b676-35e625edbc7e	TRF-20260104-001	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	100.00	2026-01-04 00:00:00	issue	\N	recalled	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 03:55:19.359536
9e46ae0f-7797-4007-bfc6-781fab0cf7dc	TRF-20260104-002	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	100.00	2026-01-04 00:00:00	issue	\N	recalled	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:19:00.326678
f620c642-864a-48d8-92bf-458e8812c2b3	TRF-20260105-001	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	500.00	2026-01-05 00:00:00	issue	\N	recalled	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 03:52:47.393356
39245146-f1e5-4070-b555-6c4c182b6dba	TRF-20260102-001	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	100.00	2026-01-02 00:00:00	issue	\N	recalled	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 04:53:44.619032
b608072f-c6ce-4905-b878-fc7eb37da5b1	TRF-20260105-002	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	300.00	2026-01-05 00:00:00	issue	\N	recalled	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:56:33.645784
053d99fc-5a52-4d98-b603-6e0022ef4d8e	TRF-20260105-003	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	250.00	2026-01-05 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 08:00:09.45637
265ea647-6768-4a7b-ba98-06b13334a069	TRF-20260107-002	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	300.00	2026-01-07 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:07:12.270836
045242a5-f8d0-4bab-baaf-99b9cccf6d53	TRF-20260103-001	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	300.00	2026-01-03 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:12:13.19929
1d87fab8-09e1-43b9-b6c3-40ae94985750	TRF-20260107-003	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	2329f86b-aabd-4aac-b4f2-8e572f51588b	500.00	2026-01-07 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:07:37.650019
4681d71d-e903-437a-aa44-cd388fee9ba0	TRF-20260107-005	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	500.00	2026-01-07 00:00:00	issue	\N	recalled	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:09:22.129495
aa75d081-bdd8-445f-b35b-e30ab97ba266	TRF-20260107-004	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2329f86b-aabd-4aac-b4f2-8e572f51588b	350.00	2026-01-07 00:00:00	issue	\N	recalled	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:07:52.076965
cfaa8b94-a703-4b2a-9e18-3ab7d6c7cb03	TRF-20260107-006	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	300.00	2026-01-07 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:11:34.894731
9b5135ad-b45d-4f3f-bf7e-7ffd9c1b6356	TRF-20260107-007	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2329f86b-aabd-4aac-b4f2-8e572f51588b	250.00	2026-01-07 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:12:11.644096
86308af0-41c1-4875-8332-1e1a65929a12	TRF-20260108-001	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	20.00	2026-01-08 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 02:19:56.445248
fe1987a8-5dc7-4dd6-8efc-c26ef1a9a792	TRF-20260107-001	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	500.00	2026-01-07 00:00:00	issue	\N	recalled	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:06:59.068854
98cbfd49-a971-40f2-92ab-75bbdfdc951d	TRF-20260107-001	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	100.00	2026-01-07 00:00:00	issue	\N	recalled	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 20:25:18.494088
f526e33a-7e45-4b38-9ffd-e18d74797b4d	TRF-20260107-008	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	200.00	2026-01-07 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 20:56:23.596577
eaf2c04f-0e60-4158-8fe3-2b29fccc9705	TRF-20260107-002	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	a8606352-f7d1-40e6-8500-8ffcbcc12924	300.00	2026-01-07 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 21:09:09.335028
9f9615f1-1e83-4914-9ee9-b97165c75a0f	TRF-20260107-009	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	400.00	2026-01-07 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:44:09.565845
6e754f08-c9f8-447f-8111-bc80fbaa2bc7	TRF-20260107-003	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	300.00	2026-01-07 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:39:41.678339
e7516dc0-750b-4500-8ed5-6dcc40ec2cb7	TRF-20260108-001	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	200.00	2026-01-08 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:41:06.93283
6d01de6f-d58f-47e5-8bdb-9f0ee68dd513	TRF-20260106-001	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	a09560f4-54bc-4640-9efa-295f4b665032	500.00	2026-01-06 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 19:57:53.472141
2ea0928e-ac18-48b3-bd56-db1c61c9a238	TRF-20260106-002	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	400.00	2026-01-06 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 23:18:50.488427
cbb488fb-1d15-4617-bf57-83ddbda7004d	TRF-20260107-010	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	100.00	2026-01-07 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 23:20:31.733742
8950dec3-bec2-46d3-9e64-55355ad0d94e	TRF-20260108-002	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	50.00	2026-01-08 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:15:09.214266
d86ad7e0-290a-4d96-bac4-ea7381003750	TRF-20260106-001	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	300.00	2026-01-06 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:25:18.219888
c638919b-d430-495e-9445-b293e5805826	TRF-20260106-002	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	1000.00	2026-01-06 00:00:00	issue	\N	posted	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:32:54.120532
5b64e181-6b93-4423-a597-05df96ec2050	TRF-20260108-002	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	100.00	2026-01-08 00:00:00	issue	\N	posted	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:46:30.15785
\.


--
-- Data for Name: stock_counts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.stock_counts (id, department_id, item_id, date, opening_qty, received_qty, sold_qty, expected_closing_qty, actual_closing_qty, variance_qty, variance_value, notes, created_by, created_at, client_id, added_qty, cost_price_snapshot, selling_price_snapshot, store_department_id) FROM stdin;
d54b4d95-41e1-4a98-8869-7846e9953898	11744f70-511a-4909-b546-7ab652b34471	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-29 00:00:00	40.00	0.00	113.00	140.00	27.00	-113.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 14:46:50.269181	fb428d91-bacb-44ed-b4cd-310c87c5a8de	100.00	0.00	0.00	\N
68b124ce-f52c-4273-8370-a7ab3aad84de	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-02 00:00:00	0.00	0.00	50.00	150.00	100.00	-50.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:20:56.856604	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	150.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
76871c03-37b1-459b-988d-cbcd4342b1f4	11744f70-511a-4909-b546-7ab652b34471	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-29 00:00:00	40.00	0.00	0.00	140.00	140.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 15:12:46.348858	fb428d91-bacb-44ed-b4cd-310c87c5a8de	100.00	0.00	0.00	\N
581076af-af41-47cf-b925-0dd2cf497632	f0dd0739-ff38-4819-b311-c6c9992bd79d	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-28 00:00:00	20.00	0.00	5.00	20.00	15.00	-5.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 14:52:51.27188	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	\N
26e6b1d1-90c8-45df-8934-a3db428f8c66	f0dd0739-ff38-4819-b311-c6c9992bd79d	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-30 00:00:00	700.00	0.00	3.00	700.00	697.00	-3.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 04:45:22.882046	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	\N
f0a6b7c7-3362-47ef-8a80-dc418fdaa0f8	f0dd0739-ff38-4819-b311-c6c9992bd79d	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:16:39.700911	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
429e83d8-5308-455c-8b53-19aa7c48e2d3	f0dd0739-ff38-4819-b311-c6c9992bd79d	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:17:44.444167	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
0bdcd282-4089-4893-9aeb-1d21316ef2a1	f0dd0739-ff38-4819-b311-c6c9992bd79d	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:18:21.249115	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
29a6e591-6087-404a-9e4e-b34151feb014	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:19:25.465127	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
956fd86d-6c87-48d3-9d9d-f7344e5b6544	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:20:18.229354	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
09379f6b-8356-4e1c-b245-f63ff799ab30	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:21:31.782559	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
47b1e85e-ad5e-477f-919c-1c05247b3ef9	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-29 00:00:00	10.00	0.00	0.00	10.00	10.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:25:04.365927	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	b30e98ff-9e99-4f22-b814-cd976d2c9c71
1fdb6571-d1cf-4484-83db-e54de64d5fc2	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-29 00:00:00	15.00	0.00	5.00	715.00	710.00	-5.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:26:06.287607	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	700.00	0.00	0.00	b30e98ff-9e99-4f22-b814-cd976d2c9c71
7bfdfef1-5b8a-4699-be3c-a0cbf362e91b	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-31 00:00:00	448.00	0.00	8.00	448.00	440.00	-8.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:10:11.79154	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
b4ed9eb0-796e-4f83-bb89-1594b3a0a72a	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-02 00:00:00	0.00	0.00	50.00	150.00	100.00	-50.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:21:19.304867	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	150.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
8818ca92-6fa1-494b-a334-44baffa03842	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-02 00:00:00	0.00	0.00	20.00	150.00	130.00	-20.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:33:04.958174	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	150.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
f122c893-304a-4231-a6df-b2dabe0788c0	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-31 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 08:04:03.5803	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	0.00	0.00	0.00	c47d93b1-4801-445b-a77e-8362ebb25442
5e70b345-d3a0-4927-b1e5-a30bf1863204	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-29 00:00:00	0.00	0.00	5.00	450.00	445.00	-5.00	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 00:06:33.962151	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	450.00	0.00	0.00	b30e98ff-9e99-4f22-b814-cd976d2c9c71
17394d2b-3d23-4918-a012-d85b0d0a6251	c844b11d-6c6c-41ba-a0da-c21646eea96b	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-05 00:00:00	100.00	0.00	10.00	100.00	90.00	-10.00	0.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 17:23:19.902497	d40fe583-f75d-4714-b3b5-9d83a9a332a9	0.00	0.00	0.00	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3
40d96b6e-d1c7-414c-92ba-5f128b15bac7	657079ba-c71c-40b4-9f66-debfa0a9b109	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-08 00:00:00	480.00	0.00	30.00	480.00	450.00	-30.00	0.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 02:06:32.739845	0d947773-28ee-4e02-b5b6-40455566817d	0.00	0.00	0.00	1e134a24-908d-4535-8443-28fa83f30a6a
665640df-edaa-46c9-8dd4-5588f065c08f	c844b11d-6c6c-41ba-a0da-c21646eea96b	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-05 00:00:00	300.00	0.00	50.00	550.00	500.00	-50.00	0.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 20:35:29.459595	d40fe583-f75d-4714-b3b5-9d83a9a332a9	250.00	0.00	0.00	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3
fb87ee82-b333-43db-9bc9-7ef97d43eb05	c844b11d-6c6c-41ba-a0da-c21646eea96b	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-06 00:00:00	550.00	0.00	50.00	550.00	500.00	-50.00	0.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 20:38:44.002969	d40fe583-f75d-4714-b3b5-9d83a9a332a9	0.00	0.00	0.00	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3
e8a99023-6736-4c45-a528-7853a19787f8	657079ba-c71c-40b4-9f66-debfa0a9b109	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-07 00:00:00	0.00	0.00	30.00	200.00	170.00	-30.00	0.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 20:57:31.001558	0d947773-28ee-4e02-b5b6-40455566817d	200.00	0.00	0.00	1e134a24-908d-4535-8443-28fa83f30a6a
462e7fcb-0c3d-4441-af2c-5616b7fa1428	657079ba-c71c-40b4-9f66-debfa0a9b109	2329f86b-aabd-4aac-b4f2-8e572f51588b	2026-01-07 00:00:00	0.00	0.00	50.00	1000.00	950.00	-50.00	0.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 21:00:12.468669	0d947773-28ee-4e02-b5b6-40455566817d	1000.00	0.00	0.00	1e134a24-908d-4535-8443-28fa83f30a6a
bb587932-f58d-4c65-afa1-1d929d7205b3	c844b11d-6c6c-41ba-a0da-c21646eea96b	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-07 00:00:00	550.00	0.00	50.00	950.00	900.00	-50.00	0.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 21:04:44.104599	d40fe583-f75d-4714-b3b5-9d83a9a332a9	400.00	0.00	0.00	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3
81d0d4b6-0629-4d81-bf93-da2ee7bb396f	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-07 00:00:00	0.00	0.00	30.00	300.00	270.00	-30.00	0.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 21:13:15.19762	d40fe583-f75d-4714-b3b5-9d83a9a332a9	300.00	0.00	0.00	c8a17169-727d-4c3f-b026-00059fdf32a5
5c6c57fe-5d52-4df9-b672-a0a58d0ac86d	657079ba-c71c-40b4-9f66-debfa0a9b109	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-07 00:00:00	0.00	0.00	20.00	400.00	380.00	-20.00	0.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:54:03.320637	0d947773-28ee-4e02-b5b6-40455566817d	400.00	0.00	0.00	1e134a24-908d-4535-8443-28fa83f30a6a
816ed2bb-f572-4dc9-8132-ece2aa4d28d6	657079ba-c71c-40b4-9f66-debfa0a9b109	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-08 00:00:00	400.00	0.00	50.00	400.00	350.00	-50.00	0.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:56:07.517648	0d947773-28ee-4e02-b5b6-40455566817d	0.00	0.00	0.00	1e134a24-908d-4535-8443-28fa83f30a6a
9f188f04-a985-459d-97a0-d46e2e769264	657079ba-c71c-40b4-9f66-debfa0a9b109	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-06 00:00:00	0.00	0.00	50.00	500.00	450.00	-50.00	0.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 19:58:52.627639	0d947773-28ee-4e02-b5b6-40455566817d	500.00	0.00	0.00	0f33a311-9974-4c6d-bd95-8f3ebf172282
a7d4ae82-a1fe-4c1b-ba19-9d908e3a6f66	02249257-b3e4-4c5e-a5e7-6025888df409	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-06 00:00:00	200.00	0.00	50.00	500.00	450.00	-50.00	0.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:26:04.1477	d40fe583-f75d-4714-b3b5-9d83a9a332a9	300.00	0.00	0.00	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3
5f32a321-a7ec-4e0d-9e5d-1344e2188fe2	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-07 00:00:00	400.00	0.00	100.00	800.00	700.00	-100.00	0.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 00:38:38.039264	0d947773-28ee-4e02-b5b6-40455566817d	400.00	0.00	0.00	0f33a311-9974-4c6d-bd95-8f3ebf172282
3d85aa03-0784-4dbd-9953-de6bbd9d3ba0	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-08 00:00:00	700.00	0.00	45.00	800.00	755.00	-45.00	0.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:51:41.940132	0d947773-28ee-4e02-b5b6-40455566817d	100.00	0.00	0.00	0f33a311-9974-4c6d-bd95-8f3ebf172282
\.


--
-- Data for Name: stock_movement_lines; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.stock_movement_lines (id, movement_id, item_id, qty, unit_cost, line_value, created_at) FROM stdin;
9739ac0f-8dbc-40dc-b751-ec5d4525e6d5	5193c7ce-f7e1-4758-81c4-fece4579dc70	e55abe0b-52ac-487b-9a47-3a83ee61a95d	1.00	600.00	600.00	2025-12-30 18:58:52.237295
ea48cdc0-23cd-4070-89d3-6ed6fb44084b	4a8094c8-1def-473b-bf9d-4d1d9b3f6f4f	e55abe0b-52ac-487b-9a47-3a83ee61a95d	1.00	600.00	600.00	2025-12-30 19:01:56.598327
d565c4b9-9182-4e11-89a2-a140b8c3844e	ae785a7c-ab1e-4453-af39-e3e430f35008	e55abe0b-52ac-487b-9a47-3a83ee61a95d	1.00	600.00	600.00	2025-12-30 19:44:54.233785
fde14c83-95a4-4c60-b16b-991244f96251	65a1d143-e58f-42cc-b9fa-f06e4e91ad2c	e55abe0b-52ac-487b-9a47-3a83ee61a95d	1.00	600.00	600.00	2025-12-30 19:47:58.79164
1ae8f580-0172-45f2-9a59-7bfc9432b9aa	051832b3-c353-4820-b471-d9f6dc237099	e55abe0b-52ac-487b-9a47-3a83ee61a95d	1.00	600.00	600.00	2025-12-30 19:49:32.897845
aec144c9-f3c5-4c12-ae1b-800502023900	d561c2f7-9264-429f-9d30-802471a5392e	0685f443-471a-4a34-927e-f5e41fbeb2d3	2.00	500.00	1000.00	2025-12-31 05:24:49.734629
438a2735-e05f-46bc-b8fd-8ddde26bb728	6e88cd27-04ab-4ed1-9faa-3cdb89feedf8	0685f443-471a-4a34-927e-f5e41fbeb2d3	2.00	500.00	1000.00	2025-12-31 05:34:51.767538
6f6cb0d5-6859-4461-8a99-d8113c34cb6f	9228ed43-10a6-47cc-9779-f7cb7b7ea4f7	0685f443-471a-4a34-927e-f5e41fbeb2d3	3.00	500.00	1500.00	2025-12-31 05:38:47.808446
2b4681ab-ad85-45ce-87c7-fd43d032423a	e5b05c0e-8245-4045-9469-da37badac16e	0685f443-471a-4a34-927e-f5e41fbeb2d3	2.00	500.00	1000.00	2025-12-31 10:00:30.992487
79d0efb6-67c9-4d37-8484-175e5307fec8	1005c74a-48c4-4e64-973e-6c5da1908f86	a8606352-f7d1-40e6-8500-8ffcbcc12924	300.00	500.00	150000.00	2026-01-07 07:12:13.27648
9a9e99fe-fee3-4d4c-b2ce-9a434fb64563	83d58656-5bc4-4e52-af2b-6cff34f0194f	a8606352-f7d1-40e6-8500-8ffcbcc12924	100.00	500.00	50000.00	2026-01-07 07:19:00.397098
56a0205a-a614-4520-9afe-c8f1b84b67d1	83a3b8e2-6703-462d-b924-315cc28f138a	a8606352-f7d1-40e6-8500-8ffcbcc12924	1.00	500.00	500.00	2026-01-07 07:50:06.58538
b87593fe-0d05-4a4c-8acd-c56a402cfdcd	72243d47-1c20-4ad7-9465-28f601b6aede	a8606352-f7d1-40e6-8500-8ffcbcc12924	300.00	500.00	150000.00	2026-01-07 07:56:33.722681
1ed3f25d-d45d-4954-aeea-cd22c60cd97e	96db7e1e-0213-45f1-ba37-05e340992f2e	a8606352-f7d1-40e6-8500-8ffcbcc12924	300.00	500.00	150000.00	2026-01-07 07:57:49.128275
a305856a-ee51-44dd-bb9b-02fda2e4f94b	4ffeb0f0-9a4e-4c5d-9926-b95a88af81f3	a8606352-f7d1-40e6-8500-8ffcbcc12924	250.00	500.00	125000.00	2026-01-07 08:00:09.527704
f5ce4781-5a8a-4301-9408-d4f102d3b6eb	2a4f4c47-414a-432a-9c67-91fbae34e9dd	a8606352-f7d1-40e6-8500-8ffcbcc12924	5.00	500.00	2500.00	2026-01-07 08:02:20.783584
45ee3d66-93b0-4741-9780-9012f55dee77	d8f7944c-37f4-46a3-b14a-2f78a0c7f4a1	a8606352-f7d1-40e6-8500-8ffcbcc12924	5.00	500.00	2500.00	2026-01-07 08:02:38.322625
117e2437-6147-4977-85da-460e563fe5e8	32fca88d-1327-461a-958c-f3bc21d6f1cb	a8606352-f7d1-40e6-8500-8ffcbcc12924	100.00	500.00	50000.00	2026-01-07 09:55:01.958754
8ba20392-567d-4406-8965-f2e0e5aec078	720575d1-30be-4add-b1a1-ceeed183f7e5	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	500.00	500.00	250000.00	2026-01-07 15:06:59.142585
6c9f4a5b-f83a-49b3-8b14-e256351b8f2c	cf44d785-cc9d-432c-99ba-0b56ca26d903	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	300.00	500.00	150000.00	2026-01-07 15:07:12.333822
4ee71a4b-1bf1-4390-ba26-2c60d28d849e	beb7ebf8-e0e9-4841-bffc-ddfb166d2ed2	2329f86b-aabd-4aac-b4f2-8e572f51588b	500.00	500.00	250000.00	2026-01-07 15:07:37.723537
2891a1cb-54bc-4071-9a1e-e465ac7e963f	f33b0f7d-15cd-40c3-9e4d-8442c3c9171e	2329f86b-aabd-4aac-b4f2-8e572f51588b	350.00	500.00	175000.00	2026-01-07 15:07:52.143316
d85aa8b7-eb6a-4264-bff3-0629eee466bf	2bea414d-92ba-4f10-8e05-03670a8c4edf	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	500.00	500.00	250000.00	2026-01-07 15:09:22.200959
054ed293-fb2d-418a-9dc9-068404cb5ae8	b13307a6-2432-4c8b-87e5-5c23df1bc6fb	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	300.00	500.00	150000.00	2026-01-07 15:11:34.964047
0b761304-4386-4635-9fa5-715f8b961ae6	1bf67e7b-508f-4e33-9d2b-3cf5df8b6e6f	2329f86b-aabd-4aac-b4f2-8e572f51588b	250.00	500.00	125000.00	2026-01-07 15:12:11.712542
49dcdcec-82e9-4a1e-bc1e-00dd7f9064ab	6cd216a8-d8ec-4137-8161-d20b56ad1099	2329f86b-aabd-4aac-b4f2-8e572f51588b	500.00	500.00	250000.00	2026-01-07 15:14:15.04228
d94d9e40-3448-46a3-a93d-9f66f353353a	ea693a34-10dd-45b4-aadb-a01e402b3b3d	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	10.00	500.00	5000.00	2026-01-07 15:19:14.81685
26a02769-f044-4945-b101-bca134b69589	93ea492b-2b76-480c-996b-56f25b9c32fe	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	10.00	500.00	5000.00	2026-01-07 15:21:06.356789
f345178f-0019-4076-9bf4-08ec8dc28c60	9f4babe7-a763-486d-bbfa-5983a9a60202	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	10.00	500.00	5000.00	2026-01-08 02:03:51.629589
001a472f-6682-4424-9dfd-56b3c8aa64a4	98817a96-61fd-47b7-a753-668b16f07a05	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	5.00	500.00	2500.00	2026-01-08 02:17:27.317527
9ca78159-1b6b-4f3b-ad42-d8381a6a0a95	87720f08-06a6-41b6-a8bf-8c00d4f0f888	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	20.00	500.00	10000.00	2026-01-08 02:19:56.515906
4d2f85d0-58b6-4f01-a551-50fecc6a41cb	e1a4f183-875d-4bf5-a8c7-4b536293af14	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	50.00	500.00	25000.00	2026-01-08 02:22:58.274273
5f2983f4-358b-41fc-908c-f8c466870049	5e600316-c413-4b11-a0f4-cf2534ef8c61	097eadbb-cad3-4ef9-aab3-21ac8d02e143	100.00	500.00	50000.00	2026-01-08 20:25:18.61278
c4dd78cd-a3f2-4c36-bb02-70929096ad88	af4eddc9-d170-4c55-80fb-4271aaed384f	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	200.00	500.00	100000.00	2026-01-08 20:56:23.686875
e9283511-1442-4ed0-a7b2-8a498393d236	8d1e76e8-880e-4afe-b44c-c7184fef05b7	a8606352-f7d1-40e6-8500-8ffcbcc12924	300.00	500.00	150000.00	2026-01-08 21:09:09.438053
ddeee71a-71a4-4951-b4c2-ee72e0888ce6	d76127d5-fc17-47d1-b28a-74c392bf0ab3	a8606352-f7d1-40e6-8500-8ffcbcc12924	25.00	500.00	12500.00	2026-01-08 21:09:53.13118
8d6b62e1-4bca-4a96-9a76-7cbf4eff181d	a917f81e-0da3-46fb-8826-2bf3570ae2e4	a8606352-f7d1-40e6-8500-8ffcbcc12924	1.00	500.00	500.00	2026-01-08 21:23:50.769075
88ff5a2f-89d5-4c57-bd27-4a19719fca81	aba8eae0-5db8-4246-a614-0fe6f9508299	a8606352-f7d1-40e6-8500-8ffcbcc12924	1.00	500.00	500.00	2026-01-08 21:24:01.610849
aba74c37-e1f0-4857-93cd-db0e225fc613	77c79a18-54b1-407e-a9c9-08bc844622c0	a8606352-f7d1-40e6-8500-8ffcbcc12924	1.00	500.00	500.00	2026-01-08 21:24:27.091893
9d1c1c23-b40a-4022-a970-9ec81279092e	147e19f5-5e3e-4ede-b375-dd232eba95e0	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	400.00	500.00	200000.00	2026-01-09 09:44:09.695975
b7bd2c76-638a-46de-a1a0-1a402260ad87	a8fdf9a4-9914-46ab-a110-c4d4a3633c72	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	50.00	500.00	25000.00	2026-01-09 09:45:52.357021
54286a4c-1d42-415e-9e6d-edef1c62bd50	4a0349fe-d1c8-4455-81f3-f8377f686d3d	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	20.00	500.00	10000.00	2026-01-09 09:49:19.441832
b338bbdf-45a1-46ce-a785-6b36f1be41e6	8562da61-56a0-44dd-8ea8-0be885924dfc	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	20.00	500.00	10000.00	2026-01-09 09:50:26.370244
a0990377-7ae0-4e3d-93d7-e9dd568f7edc	44d11d1b-93fd-4f7a-9902-0dda499662a7	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	5.00	500.00	2500.00	2026-01-09 09:52:23.628202
8a95ef7d-f1e5-4686-ab2a-8db2c319b72f	5a5c950e-b0fb-43bc-91aa-7a0ac21c449f	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	5.00	500.00	2500.00	2026-01-09 09:52:43.582472
aaac4b56-0ad5-4ba8-a0c6-75de233b9c16	8aad5023-d36c-4868-b4eb-bf3a871b5c9b	097eadbb-cad3-4ef9-aab3-21ac8d02e143	300.00	500.00	150000.00	2026-01-09 10:39:41.794299
e1d11c47-e517-4ce9-9613-340c3e1633cc	215c53fe-120d-45ff-901c-5d62348dacd1	097eadbb-cad3-4ef9-aab3-21ac8d02e143	200.00	500.00	100000.00	2026-01-09 10:41:07.027738
ee171381-0f8c-462c-9d2e-b4c07e31a838	7cf2b513-ae89-4135-9b57-92fe96fd1a05	097eadbb-cad3-4ef9-aab3-21ac8d02e143	30.00	500.00	15000.00	2026-01-09 10:41:54.100481
ea39ac96-f682-4dc6-ba52-eabc9c70ef8d	0c69c65f-f4ca-431e-a2a7-b0ad62d9cef5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	20.00	500.00	10000.00	2026-01-09 10:42:18.092124
ed8a564c-1454-4865-b63d-c6227f61cb3e	725967e6-83de-41f9-83a1-b297884b49f8	097eadbb-cad3-4ef9-aab3-21ac8d02e143	20.00	500.00	10000.00	2026-01-09 10:47:02.654169
8f13d2b2-a783-4363-bb43-49a7dbef150d	49dfba4c-67e4-4d83-8af0-075e105dc797	097eadbb-cad3-4ef9-aab3-21ac8d02e143	30.00	500.00	15000.00	2026-01-09 10:47:22.470664
e8e87428-2eb7-46ce-984e-93c62260cf46	fdd4835b-b036-4d76-b2b3-70a07e1fd4e4	097eadbb-cad3-4ef9-aab3-21ac8d02e143	30.00	500.00	15000.00	2026-01-09 10:50:02.540564
5735e1d3-9144-4b5c-937d-ac960ecaa9b9	a5772f89-3521-4b8d-bd37-de2d5543a2ce	a09560f4-54bc-4640-9efa-295f4b665032	500.00	500.00	250000.00	2026-01-09 19:57:53.551211
e7f26a77-6578-4ae2-9ab6-864fdab3d5dd	7636add9-81f1-44cb-b66c-0a1cb4f0b301	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	400.00	500.00	200000.00	2026-01-09 23:18:50.55933
1a004084-9b2d-42e7-a243-c481204d76aa	ab7c58bf-00eb-49ad-8bc8-b7e68216ae53	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	100.00	500.00	50000.00	2026-01-09 23:20:31.79937
fbf1681a-07db-4397-97d4-7e2a3681a47a	7be969c7-5d2b-4273-8193-9a8112215a4a	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	20.00	500.00	10000.00	2026-01-09 23:36:10.547562
0f438203-720a-448e-89e3-508a025d158d	73304b63-7645-439f-893f-4ed7fd7c2424	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	40.00	500.00	20000.00	2026-01-09 23:47:04.303333
0f808c96-3020-41ab-b21b-8c41874517c4	ac9fd5ef-4989-4fee-82b3-f4d43f956aaa	097eadbb-cad3-4ef9-aab3-21ac8d02e143	50.00	500.00	25000.00	2026-01-10 00:15:09.32795
5bac210d-f7f7-4c92-92bf-dcef6ebae63c	e060d5d8-5bd9-44ff-8e43-23153ee6a934	097eadbb-cad3-4ef9-aab3-21ac8d02e143	50.00	500.00	25000.00	2026-01-10 00:23:38.999944
2306d40f-ad3a-44ed-8dd8-601e82ca825b	07cef5e9-1488-4684-96a2-87cb33bc5f1c	097eadbb-cad3-4ef9-aab3-21ac8d02e143	300.00	500.00	150000.00	2026-01-10 00:25:18.325334
dfdb417e-6da2-4fd8-90e5-be94290f670e	8b064346-355c-48f1-88b3-6febbe82c6a2	097eadbb-cad3-4ef9-aab3-21ac8d02e143	30.00	500.00	15000.00	2026-01-10 00:27:34.110942
7ab5254c-6b0f-417d-b0bb-a99525e83dae	3b4bcfce-7744-4468-9c37-83f0c325ccbb	097eadbb-cad3-4ef9-aab3-21ac8d02e143	20.00	500.00	10000.00	2026-01-10 00:27:55.46226
a11d402e-4ca0-4326-a01e-67aaba86e71c	41fa8bc1-0669-43a8-9b0c-4dfd4f40946d	097eadbb-cad3-4ef9-aab3-21ac8d02e143	1000.00	500.00	500000.00	2026-01-10 00:32:54.223111
4eb15934-7f31-4504-8505-68acacf1093f	8af73a32-46f7-413d-ab25-6ba41054a2da	097eadbb-cad3-4ef9-aab3-21ac8d02e143	10.00	500.00	5000.00	2026-01-10 00:33:37.478724
95844d40-e3a5-402b-8f7c-f994ce287363	c1e36996-e66a-469d-902f-6e2a6e9b15a7	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	100.00	500.00	50000.00	2026-01-10 09:46:30.270789
08e50ba8-099e-40d0-a570-a1ed130e5207	258af520-c6b7-42d4-b688-eb58d67457bb	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	15.00	500.00	7500.00	2026-01-10 09:47:32.437204
5c014078-e62c-41ab-a84a-aa9f790acbaf	e963e8f4-6060-466f-ac7c-6fdb1a5a8dad	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	15.00	500.00	7500.00	2026-01-10 09:47:55.263884
fce92030-7205-455c-995f-662237809430	4f4bab0b-b839-4812-a940-4804f3671baa	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	10.00	500.00	5000.00	2026-01-10 09:48:27.668448
030cdaf4-8910-452c-a9e5-da08dee9cdae	9ec44d94-5120-45fa-aaae-e0987f709a60	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2.00	500.00	1000.00	2026-01-10 09:52:15.190115
88b063ca-aad8-4684-8d1e-1097540a0e35	f0bd16b1-d66c-4501-90ae-904c3f5eb17c	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2.00	500.00	1000.00	2026-01-10 09:52:35.887034
1620cca4-f885-401f-9a76-fe160b2bd8c7	41ed03d3-c3ea-4480-896c-39e8d0f10e94	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	1.00	500.00	500.00	2026-01-10 09:52:56.570051
f269859c-2369-4a14-af9e-77fb9e83c1e8	d3da4dc2-cc30-411e-b864-1f1302a54617	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	1.00	500.00	500.00	2026-01-10 09:53:41.217584
47c9924b-ab1a-43ef-a07f-7f66e15d3173	e2ab3a87-bd6d-4c84-8130-bb131b0eed7b	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	1.00	500.00	500.00	2026-01-10 09:57:28.239861
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.stock_movements (id, outlet_id, movement_type, source_location, destination_location, items_description, total_value, authorized_by, created_by, created_at, client_id, department_id, from_srd_id, to_srd_id, date, adjustment_direction, total_qty, notes, approved_by, approved_at, idempotency_key, source_ref) FROM stdin;
5193c7ce-f7e1-4758-81c4-fece4579dc70	\N	transfer	JUICES OUTLET SR-D	MAIN STORE SR-D	\N	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:58:52.227269	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	f0dd0739-ff38-4819-b311-c6c9992bd79d	b30e98ff-9e99-4f22-b814-cd976d2c9c71	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2025-12-30 18:58:52.223	\N	1.00	\N	\N	\N	\N	\N
4a8094c8-1def-473b-bf9d-4d1d9b3f6f4f	\N	transfer	JUICES OUTLET SR-D	MAIN STORE SR-D	\N	0.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 19:01:56.476614	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	f0dd0739-ff38-4819-b311-c6c9992bd79d	b30e98ff-9e99-4f22-b814-cd976d2c9c71	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2025-12-30 19:01:56.474	\N	1.00	yes	\N	\N	\N	\N
ae785a7c-ab1e-4453-af39-e3e430f35008	\N	transfer	JUICES OUTLET SR-D	MAIN STORE SR-D	PINIPPLE JUICE (1)	600.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 19:44:54.210671	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	f0dd0739-ff38-4819-b311-c6c9992bd79d	b30e98ff-9e99-4f22-b814-cd976d2c9c71	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2025-12-30 19:44:54.206	\N	1.00	Return inward	\N	\N	\N	\N
65a1d143-e58f-42cc-b9fa-f06e4e91ad2c	\N	adjustment	JUICES OUTLET SR-D	\N	PINIPPLE JUICE (1)	600.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 19:47:58.491473	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	f0dd0739-ff38-4819-b311-c6c9992bd79d	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	2025-12-30 19:47:58.488	decrease	1.00	Testing 	\N	\N	\N	\N
051832b3-c353-4820-b471-d9f6dc237099	\N	write_off	JUICES OUTLET SR-D	\N	PINIPPLE JUICE (1)	600.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 19:49:32.876777	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	f0dd0739-ff38-4819-b311-c6c9992bd79d	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	2025-12-30 19:49:32.874	\N	1.00	Damange	\N	\N	\N	\N
6e88cd27-04ab-4ed1-9faa-3cdb89feedf8	\N	adjustment	BAR OUTLET SR-D	\N	Malt (2)	1000.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:34:51.749972	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	c47d93b1-4801-445b-a77e-8362ebb25442	\N	2025-12-31 05:34:51.748	increase	2.00	\N	\N	\N	\N	\N
9228ed43-10a6-47cc-9779-f7cb7b7ea4f7	\N	write_off	BAR OUTLET SR-D	\N	Malt (3)	1500.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:38:47.626889	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	c47d93b1-4801-445b-a77e-8362ebb25442	\N	2025-12-31 05:38:47.624	\N	3.00	\N	\N	\N	\N	\N
e5b05c0e-8245-4045-9469-da37badac16e	\N	transfer	MAIN STORE SR-D	BAR OUTLET SR-D	[REVERSAL] Malt (2)	1000.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 10:00:30.986371	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	c47d93b1-4801-445b-a77e-8362ebb25442	2025-12-31 10:00:30.985	\N	2.00	REVERSAL of movement d561c2f7... Reason: rss	\N	\N	\N	\N
d561c2f7-9264-429f-9d30-802471a5392e	\N	transfer	BAR OUTLET SR-D	MAIN STORE SR-D	Malt (2)	1000.00	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:24:49.710679	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c3004de9-eac3-4ca7-a2f4-f51a9c8a6482	c47d93b1-4801-445b-a77e-8362ebb25442	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2025-12-31 05:24:49.708	\N	2.00	\n[REVERSED on 2025-12-31T10:00:30.985Z - Reversal ID: e5b05c0e]	\N	\N	\N	\N
70891294-eb84-417f-ac12-e0f8f17ddd93	\N	transfer	BAR/MIXOLOGIST OUTLET SR-D	MAIN STORE SR-D	Water Melon Juice (1)	500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 17:15:56.755615	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	f3129970-a2fc-4d98-9f25-70598db1a740	2026-01-05 17:15:56.718	\N	1.00	\N	\N	\N	\N	\N
710b649d-1f25-4e27-a9a1-cb68044c91b4	\N	write_off	BAR/MIXOLOGIST OUTLET SR-D	\N	Water Melon Juice (1)	500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 17:22:05.522298	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	\N	2026-01-05 17:22:05.486	\N	1.00	\N	\N	\N	\N	\N
660479a1-6078-4469-90a8-663be16a03e7	\N	waste	BAR/MIXOLOGIST OUTLET SR-D	\N	Water Melon Juice (1)	500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 17:22:20.400156	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	\N	2026-01-05 17:22:20.365	\N	1.00	\N	\N	\N	\N	\N
880427cb-b287-4d75-9d89-0765941eefeb	\N	transfer	Unknown	Unknown	Water Melon Juice (5)	2500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 04:27:43.164523	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-07 04:27:43.081	\N	5.00	\N	\N	\N	\N	\N
863910f1-ecf7-4a04-9824-4c37fe928ee1	\N	transfer	BAR/MIXOLOGIST OUTLET SR-D	RESTAURANT/GRILL OUTLET SR-D	Water Melon Juice (100)	50000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 05:27:31.118745	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-07 05:27:31.033	\N	100.00	\N	\N	\N	\N	\N
bf881fb4-f51c-4bc0-8fe8-211227e3e623	\N	transfer	MAIN STORE SR-D	RESTAURANT/GRILL OUTLET SR-D	Water Melon Juice (50)	25000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 05:28:57.781868	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-07 05:28:57.697	\N	50.00	\N	\N	\N	\N	\N
18b7fa41-d173-464d-870b-9931c73b2a49	\N	transfer	MAIN STORE SR-D	RESTAURANT/GRILL OUTLET SR-D	Water Melon Juice (20)	10000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 05:33:14.45543	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-07 05:33:14.373	\N	20.00	\N	\N	\N	\N	\N
a0c0574e-0279-44f0-9227-a07db78b8448	\N	issue	\N	\N	Water Melon Juice (200)	100000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 06:13:36.506942	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-05 00:00:00	\N	200.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-05:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:595eed6e-8595-413c-a0e0-f78b3e8b0279:200:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260105-010
715d18bd-dae2-4ef3-959b-52d07dfebc84	\N	issue	\N	\N	Water Melon Juice (300)	150000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 06:20:57.279002	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-05 00:00:00	\N	300.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-05:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:595eed6e-8595-413c-a0e0-f78b3e8b0279:300:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260105-011
06a7ff35-4751-4d20-8408-fb69b75cd3e4	\N	issue	\N	\N	Water Melon Juice (200)	100000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 06:30:33.110843	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-06 00:00:00	\N	200.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-06:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:595eed6e-8595-413c-a0e0-f78b3e8b0279:200:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260106-001
0ab7e420-af56-46ee-8e7c-8cd886a22ce6	\N	issue	\N	\N	Water Melon Juice (400)	200000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 06:38:38.916876	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-06 00:00:00	\N	400.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-06:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:595eed6e-8595-413c-a0e0-f78b3e8b0279:400:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260106-002
1005c74a-48c4-4e64-973e-6c5da1908f86	\N	issue	\N	\N	Water Melon Juice (300)	150000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:12:13.248381	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-03 00:00:00	\N	300.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-03:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:a8606352-f7d1-40e6-8500-8ffcbcc12924:300:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260103-001
83d58656-5bc4-4e52-af2b-6cff34f0194f	\N	issue	\N	\N	Water Melon Juice (100)	50000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:19:00.375728	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-04 00:00:00	\N	100.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-04:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:a8606352-f7d1-40e6-8500-8ffcbcc12924:100:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260104-002
83a3b8e2-6703-462d-b924-315cc28f138a	\N	transfer	BAR/MIXOLOGIST OUTLET SR-D	RESTAURANT/GRILL OUTLET SR-D	Water Melon Juice (1)	500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:50:06.537512	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-07 07:50:06.479	\N	1.00	\N	\N	\N	\N	\N
96db7e1e-0213-45f1-ba37-05e340992f2e	\N	issue	\N	\N	[REVERSAL] Water Melon Juice (300)	150000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:57:49.106878	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-07 07:57:49.093	\N	300.00	REVERSAL of movement 72243d47... Reason: td	\N	\N	\N	\N
72243d47-1c20-4ad7-9465-28f601b6aede	\N	issue	\N	\N	Water Melon Juice (300)	150000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:56:33.695323	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-05 00:00:00	\N	300.00	Issued from Main Store via ledger\n[REVERSED on 2026-01-07T07:57:49.093Z - Reversal ID: 96db7e1e]	\N	\N	issue:2026-01-05:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:a8606352-f7d1-40e6-8500-8ffcbcc12924:300:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260105-002
4ffeb0f0-9a4e-4c5d-9926-b95a88af81f3	\N	issue	\N	\N	Water Melon Juice (250)	125000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 08:00:09.505225	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-05 00:00:00	\N	250.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-05:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:a8606352-f7d1-40e6-8500-8ffcbcc12924:250:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260105-003
2a4f4c47-414a-432a-9c67-91fbae34e9dd	\N	transfer	BAR/MIXOLOGIST OUTLET SR-D	RESTAURANT/GRILL OUTLET SR-D	Water Melon Juice (5)	2500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 08:02:20.739553	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-07 08:02:20.702	\N	5.00	\N	\N	\N	\N	\N
d8f7944c-37f4-46a3-b14a-2f78a0c7f4a1	\N	transfer	BAR/MIXOLOGIST OUTLET SR-D	MAIN STORE SR-D	Water Melon Juice (5)	2500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 08:02:38.279257	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	f3129970-a2fc-4d98-9f25-70598db1a740	2026-01-07 08:02:38.243	\N	5.00	\N	\N	\N	\N	\N
32fca88d-1327-461a-958c-f3bc21d6f1cb	\N	transfer	MAIN STORE SR-D	BAR/MIXOLOGIST OUTLET SR-D	Water Melon Juice (100)	50000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 09:55:01.868747	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-07 09:55:01.834	\N	100.00	\N	\N	\N	\N	\N
f33b0f7d-15cd-40c3-9e4d-8442c3c9171e	\N	issue	\N	\N	Malt (350)	175000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:07:52.121003	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-07 00:00:00	\N	350.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:2329f86b-aabd-4aac-b4f2-8e572f51588b:350:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-004
2bea414d-92ba-4f10-8e05-03670a8c4edf	\N	issue	\N	\N	Chicken Fries (500)	250000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:09:22.178618	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-07 00:00:00	\N	500.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:2a1eaab7-56a8-40d9-8fc3-d379beec67b2:500:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-005
b13307a6-2432-4c8b-87e5-5c23df1bc6fb	\N	issue	\N	\N	Chicken Fries (300)	150000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:11:34.941196	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-07 00:00:00	\N	300.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:2a1eaab7-56a8-40d9-8fc3-d379beec67b2:300:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-006
1bf67e7b-508f-4e33-9d2b-3cf5df8b6e6f	\N	issue	\N	\N	Malt (250)	125000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:12:11.691122	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-07 00:00:00	\N	250.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:2329f86b-aabd-4aac-b4f2-8e572f51588b:250:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-007
6cd216a8-d8ec-4137-8161-d20b56ad1099	\N	issue	\N	\N	[REVERSAL] Malt (500)	250000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:14:15.019517	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	2026-01-07 15:14:15.008	\N	500.00	REVERSAL of movement beb7ebf8... Reason: z	\N	\N	\N	\N
beb7ebf8-e0e9-4841-bffc-ddfb166d2ed2	\N	issue	\N	\N	Malt (500)	250000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:07:37.699329	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	2026-01-07 00:00:00	\N	500.00	Issued from Main Store via ledger\n[REVERSED on 2026-01-07T15:14:15.008Z - Reversal ID: 6cd216a8]	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:1e134a24-908d-4535-8443-28fa83f30a6a:2329f86b-aabd-4aac-b4f2-8e572f51588b:500:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-003
ea693a34-10dd-45b4-aadb-a01e402b3b3d	\N	transfer	BAR OUTLET SR-D	MAIN STORE SR-D	Fanta (10)	5000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:19:14.774013	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	1e134a24-908d-4535-8443-28fa83f30a6a	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2026-01-07 00:00:00	\N	10.00	\N	\N	\N	\N	\N
720575d1-30be-4add-b1a1-ceeed183f7e5	\N	issue	\N	\N	Fanta (500)	250000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:06:59.117679	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	2026-01-07 00:00:00	\N	500.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:1e134a24-908d-4535-8443-28fa83f30a6a:f3b1dfbb-98df-4a52-ab1e-617c8e915a4c:500:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-001
cf44d785-cc9d-432c-99ba-0b56ca26d903	\N	issue	\N	\N	Fanta (300)	150000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:07:12.312356	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-07 00:00:00	\N	300.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:f3b1dfbb-98df-4a52-ab1e-617c8e915a4c:300:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-002
87720f08-06a6-41b6-a8bf-8c00d4f0f888	\N	issue	\N	\N	Fanta (20)	10000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 02:19:56.494105	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	2026-01-08 00:00:00	\N	20.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-08:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:1e134a24-908d-4535-8443-28fa83f30a6a:f3b1dfbb-98df-4a52-ab1e-617c8e915a4c:20:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260108-001
9f4babe7-a763-486d-bbfa-5983a9a60202	\N	transfer	RESTAURANT OUTLET SR-D	BAR OUTLET SR-D	[REVERSAL] Fanta (10)	5000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 02:03:51.547664	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	0f33a311-9974-4c6d-bd95-8f3ebf172282	1e134a24-908d-4535-8443-28fa83f30a6a	2026-01-08 02:03:51.533	\N	10.00	REVERSAL of movement 93ea492b... Reason: fd	\N	\N	\N	\N
93ea492b-2b76-480c-996b-56f25b9c32fe	\N	transfer	BAR OUTLET SR-D	RESTAURANT OUTLET SR-D	Fanta (10)	5000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-07 15:21:06.315167	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	1e134a24-908d-4535-8443-28fa83f30a6a	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-07 00:00:00	\N	10.00	\n[REVERSED on 2026-01-08T02:03:51.533Z - Reversal ID: 9f4babe7]	\N	\N	\N	\N
98817a96-61fd-47b7-a753-668b16f07a05	\N	waste	MAIN STORE SR-D	\N	Fanta (5)	2500.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 02:17:27.273777	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	\N	2026-01-08 00:00:00	\N	5.00	\N	\N	\N	\N	\N
e1a4f183-875d-4bf5-a8c7-4b536293af14	\N	transfer	RESTAURANT OUTLET SR-D	MAIN STORE SR-D	Fanta (50)	25000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 02:22:58.231826	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	0f33a311-9974-4c6d-bd95-8f3ebf172282	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2026-01-08 00:00:00	\N	50.00	\N	\N	\N	\N	\N
5e600316-c413-4b11-a0f4-cf2534ef8c61	\N	issue	\N	\N	Orange Juice (100)	50000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 20:25:18.568923	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-07 00:00:00	\N	100.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:097eadbb-cad3-4ef9-aab3-21ac8d02e143:100:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260107-001
af4eddc9-d170-4c55-80fb-4271aaed384f	\N	issue	\N	\N	Fanta (200)	100000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-08 20:56:23.650126	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	2026-01-07 00:00:00	\N	200.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:1e134a24-908d-4535-8443-28fa83f30a6a:f3b1dfbb-98df-4a52-ab1e-617c8e915a4c:200:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-008
d3da4dc2-cc30-411e-b864-1f1302a54617	\N	adjustment	RESTAURANT OUTLET SR-D	\N	Chicken Fries (1)	500.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:53:41.134277	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	0f33a311-9974-4c6d-bd95-8f3ebf172282	\N	2026-01-08 00:00:00	increase	1.00	\n[REVERSED on 2026-01-10T09:57:28.180Z - Reversal ID: e2ab3a87]	\N	\N	\N	\N
8d1e76e8-880e-4afe-b44c-c7184fef05b7	\N	issue	\N	\N	Water Melon Juice (300)	150000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 21:09:09.403242	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-07 00:00:00	\N	300.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:f3129970-a2fc-4d98-9f25-70598db1a740:c8a17169-727d-4c3f-b026-00059fdf32a5:a8606352-f7d1-40e6-8500-8ffcbcc12924:300:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260107-002
d76127d5-fc17-47d1-b28a-74c392bf0ab3	\N	transfer	RESTAURANT/GRILL OUTLET SR-D	MAIN STORE SR-D	Water Melon Juice (25)	12500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 21:09:53.066	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	c8a17169-727d-4c3f-b026-00059fdf32a5	f3129970-a2fc-4d98-9f25-70598db1a740	2026-01-07 00:00:00	\N	25.00	\N	\N	\N	\N	\N
8aad5023-d36c-4868-b4eb-bf3a871b5c9b	\N	issue	\N	\N	Orange Juice (300)	150000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:39:41.75193	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-07 00:00:00	\N	300.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:097eadbb-cad3-4ef9-aab3-21ac8d02e143:300:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260107-003
aba8eae0-5db8-4246-a614-0fe6f9508299	\N	transfer	MAIN STORE SR-D	RESTAURANT/GRILL OUTLET SR-D	[REVERSAL] Water Melon Juice (1)	500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 21:24:01.579922	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-08 21:24:01.562	\N	1.00	REVERSAL of movement a917f81e... Reason: x	\N	\N	\N	\N
a917f81e-0da3-46fb-8826-2bf3570ae2e4	\N	transfer	RESTAURANT/GRILL OUTLET SR-D	MAIN STORE SR-D	Water Melon Juice (1)	500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 21:23:50.705537	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	c8a17169-727d-4c3f-b026-00059fdf32a5	f3129970-a2fc-4d98-9f25-70598db1a740	2026-01-08 00:00:00	\N	1.00	\n[REVERSED on 2026-01-08T21:24:01.562Z - Reversal ID: aba8eae0]	\N	\N	\N	\N
77c79a18-54b1-407e-a9c9-08bc844622c0	\N	transfer	RESTAURANT/GRILL OUTLET SR-D	MAIN STORE SR-D	Water Melon Juice (1)	500.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-08 21:24:27.030916	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	c8a17169-727d-4c3f-b026-00059fdf32a5	f3129970-a2fc-4d98-9f25-70598db1a740	2026-01-07 00:00:00	\N	1.00	\N	\N	\N	\N	\N
147e19f5-5e3e-4ede-b375-dd232eba95e0	\N	issue	\N	\N	Chicken Fries (400)	200000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:44:09.669541	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	1e134a24-908d-4535-8443-28fa83f30a6a	2026-01-07 00:00:00	\N	400.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:1e134a24-908d-4535-8443-28fa83f30a6a:2a1eaab7-56a8-40d9-8fc3-d379beec67b2:400:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-009
a8fdf9a4-9914-46ab-a110-c4d4a3633c72	\N	transfer	RESTAURANT OUTLET SR-D	BAR OUTLET SR-D	Chicken Fries (50)	25000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:45:52.311574	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	0f33a311-9974-4c6d-bd95-8f3ebf172282	1e134a24-908d-4535-8443-28fa83f30a6a	2026-01-07 00:00:00	\N	50.00	\N	\N	\N	\N	\N
4a0349fe-d1c8-4455-81f3-f8377f686d3d	\N	transfer	BAR OUTLET SR-D	MAIN STORE SR-D	Chicken Fries (20)	10000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:49:19.397185	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	1e134a24-908d-4535-8443-28fa83f30a6a	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2026-01-07 00:00:00	\N	20.00	\N	\N	\N	\N	\N
8562da61-56a0-44dd-8ea8-0be885924dfc	\N	transfer	BAR OUTLET SR-D	RESTAURANT OUTLET SR-D	Chicken Fries (20)	10000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:50:26.32889	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	1e134a24-908d-4535-8443-28fa83f30a6a	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-07 00:00:00	\N	20.00	\N	\N	\N	\N	\N
44d11d1b-93fd-4f7a-9902-0dda499662a7	\N	write_off	BAR OUTLET SR-D	\N	Chicken Fries (5)	2500.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:52:23.585864	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	1e134a24-908d-4535-8443-28fa83f30a6a	\N	2026-01-07 00:00:00	\N	5.00	\N	\N	\N	\N	\N
5a5c950e-b0fb-43bc-91aa-7a0ac21c449f	\N	waste	BAR OUTLET SR-D	\N	Chicken Fries (5)	2500.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 09:52:43.541531	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	1e134a24-908d-4535-8443-28fa83f30a6a	\N	2026-01-07 00:00:00	\N	5.00	\N	\N	\N	\N	\N
215c53fe-120d-45ff-901c-5d62348dacd1	\N	issue	\N	\N	Orange Juice (200)	100000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:41:06.995427	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-08 00:00:00	\N	200.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-08:f3129970-a2fc-4d98-9f25-70598db1a740:c8a17169-727d-4c3f-b026-00059fdf32a5:097eadbb-cad3-4ef9-aab3-21ac8d02e143:200:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260108-001
7cf2b513-ae89-4135-9b57-92fe96fd1a05	\N	write_off	MAIN STORE SR-D	\N	Orange Juice (30)	15000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:41:54.036532	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	f3129970-a2fc-4d98-9f25-70598db1a740	\N	2026-01-08 00:00:00	\N	30.00	\N	\N	\N	\N	\N
0c69c65f-f4ca-431e-a2a7-b0ad62d9cef5	\N	waste	MAIN STORE SR-D	\N	Orange Juice (20)	10000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:42:18.028294	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	f3129970-a2fc-4d98-9f25-70598db1a740	\N	2026-01-08 00:00:00	\N	20.00	\N	\N	\N	\N	\N
725967e6-83de-41f9-83a1-b297884b49f8	\N	transfer	BAR/MIXOLOGIST OUTLET SR-D	MAIN STORE SR-D	Orange Juice (20)	10000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:47:02.588271	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	f3129970-a2fc-4d98-9f25-70598db1a740	2026-01-08 00:00:00	\N	20.00	\N	\N	\N	\N	\N
49dfba4c-67e4-4d83-8af0-075e105dc797	\N	transfer	RESTAURANT/GRILL OUTLET SR-D	MAIN STORE SR-D	Orange Juice (30)	15000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:47:22.396665	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	c8a17169-727d-4c3f-b026-00059fdf32a5	f3129970-a2fc-4d98-9f25-70598db1a740	2026-01-08 00:00:00	\N	30.00	\N	\N	\N	\N	\N
fdd4835b-b036-4d76-b2b3-70a07e1fd4e4	\N	transfer	BAR/MIXOLOGIST OUTLET SR-D	MAIN STORE SR-D	Orange Juice (30)	15000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:50:02.47438	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	f3129970-a2fc-4d98-9f25-70598db1a740	2026-01-08 00:00:00	\N	30.00	\N	\N	\N	\N	\N
a5772f89-3521-4b8d-bd37-de2d5543a2ce	\N	issue	\N	\N	Fried Fish (500)	250000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 19:57:53.52274	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-06 00:00:00	\N	500.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-06:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:a09560f4-54bc-4640-9efa-295f4b665032:500:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260106-001
7636add9-81f1-44cb-b66c-0a1cb4f0b301	\N	issue	\N	\N	Chicken Fries (400)	200000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 23:18:50.533144	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-06 00:00:00	\N	400.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-06:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:2a1eaab7-56a8-40d9-8fc3-d379beec67b2:400:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260106-002
ab7c58bf-00eb-49ad-8bc8-b7e68216ae53	\N	issue	\N	\N	Chicken Fries (100)	50000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 23:20:31.777238	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-07 00:00:00	\N	100.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-07:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:2a1eaab7-56a8-40d9-8fc3-d379beec67b2:100:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260107-010
7be969c7-5d2b-4273-8193-9a8112215a4a	\N	write_off	MAIN STORE SR-D	\N	Chicken Fries (20)	10000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 23:36:10.496306	0d947773-28ee-4e02-b5b6-40455566817d	b3a2d778-a444-452e-b3dc-5300715abc5b	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	\N	2026-01-07 00:00:00	\N	20.00	\N	\N	\N	\N	\N
73304b63-7645-439f-893f-4ed7fd7c2424	\N	write_off	MAIN STORE SR-D	\N	Chicken Fries (40)	20000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-09 23:47:04.248641	0d947773-28ee-4e02-b5b6-40455566817d	b3a2d778-a444-452e-b3dc-5300715abc5b	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	\N	2026-01-07 00:00:00	\N	40.00	\N	\N	\N	\N	\N
ac9fd5ef-4989-4fee-82b3-f4d43f956aaa	\N	issue	\N	\N	Orange Juice (50)	25000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:15:09.288028	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-08 00:00:00	\N	50.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-08:f3129970-a2fc-4d98-9f25-70598db1a740:c8a17169-727d-4c3f-b026-00059fdf32a5:097eadbb-cad3-4ef9-aab3-21ac8d02e143:50:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260108-002
e060d5d8-5bd9-44ff-8e43-23153ee6a934	\N	write_off	MAIN STORE SR-D	\N	Orange Juice (50)	25000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:23:38.929778	d40fe583-f75d-4714-b3b5-9d83a9a332a9	02249257-b3e4-4c5e-a5e7-6025888df409	f3129970-a2fc-4d98-9f25-70598db1a740	\N	2026-01-06 00:00:00	\N	50.00	\N	\N	\N	\N	\N
07cef5e9-1488-4684-96a2-87cb33bc5f1c	\N	issue	\N	\N	Orange Juice (300)	150000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:25:18.289878	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	f3129970-a2fc-4d98-9f25-70598db1a740	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-06 00:00:00	\N	300.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-06:f3129970-a2fc-4d98-9f25-70598db1a740:4aecd215-ec9e-402d-bc48-1ebc6f79dfc3:097eadbb-cad3-4ef9-aab3-21ac8d02e143:300:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260106-001
8b064346-355c-48f1-88b3-6febbe82c6a2	\N	write_off	BAR/MIXOLOGIST OUTLET SR-D	\N	Orange Juice (30)	15000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:27:34.038804	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	\N	2026-01-06 00:00:00	\N	30.00	\N	\N	\N	\N	\N
3b4bcfce-7744-4468-9c37-83f0c325ccbb	\N	waste	BAR/MIXOLOGIST OUTLET SR-D	\N	Orange Juice (20)	10000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:27:55.391946	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c844b11d-6c6c-41ba-a0da-c21646eea96b	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	\N	2026-01-06 00:00:00	\N	20.00	\N	\N	\N	\N	\N
41fa8bc1-0669-43a8-9b0c-4dfd4f40946d	\N	issue	\N	\N	Orange Juice (1000)	500000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:32:54.188586	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	f3129970-a2fc-4d98-9f25-70598db1a740	c8a17169-727d-4c3f-b026-00059fdf32a5	2026-01-06 00:00:00	\N	1000.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-06:f3129970-a2fc-4d98-9f25-70598db1a740:c8a17169-727d-4c3f-b026-00059fdf32a5:097eadbb-cad3-4ef9-aab3-21ac8d02e143:1000:6419147a-44c1-4f3c-bbcb-51a46a91d1be	TRF-20260106-002
8af73a32-46f7-413d-ab25-6ba41054a2da	\N	transfer	RESTAURANT/GRILL OUTLET SR-D	BAR/MIXOLOGIST OUTLET SR-D	Orange Juice (10)	5000.00	\N	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-10 00:33:37.412442	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f84e43d1-856c-4d02-b8ed-5d8f7ec04700	c8a17169-727d-4c3f-b026-00059fdf32a5	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	2026-01-06 00:00:00	\N	10.00	\N	\N	\N	\N	\N
c1e36996-e66a-469d-902f-6e2a6e9b15a7	\N	issue	\N	\N	Chicken Fries (100)	50000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:46:30.230721	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	0f33a311-9974-4c6d-bd95-8f3ebf172282	2026-01-08 00:00:00	\N	100.00	Issued from Main Store via ledger	\N	\N	issue:2026-01-08:e885756b-2d5d-4844-91ed-eeff5e2b5ae3:0f33a311-9974-4c6d-bd95-8f3ebf172282:2a1eaab7-56a8-40d9-8fc3-d379beec67b2:100:a62196b8-c91c-465d-9f3d-35e82bb6d0d2	TRF-20260108-002
258af520-c6b7-42d4-b688-eb58d67457bb	\N	write_off	MAIN STORE SR-D	\N	Chicken Fries (15)	7500.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:47:32.368177	0d947773-28ee-4e02-b5b6-40455566817d	b3a2d778-a444-452e-b3dc-5300715abc5b	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	\N	2026-01-08 00:00:00	\N	15.00	\N	\N	\N	\N	\N
e963e8f4-6060-466f-ac7c-6fdb1a5a8dad	\N	waste	MAIN STORE SR-D	\N	Chicken Fries (15)	7500.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:47:55.19571	0d947773-28ee-4e02-b5b6-40455566817d	b3a2d778-a444-452e-b3dc-5300715abc5b	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	\N	2026-01-08 00:00:00	\N	15.00	\N	\N	\N	\N	\N
4f4bab0b-b839-4812-a940-4804f3671baa	\N	transfer	BAR OUTLET SR-D	MAIN STORE SR-D	Chicken Fries (10)	5000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:48:27.599586	0d947773-28ee-4e02-b5b6-40455566817d	657079ba-c71c-40b4-9f66-debfa0a9b109	1e134a24-908d-4535-8443-28fa83f30a6a	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2026-01-08 00:00:00	\N	10.00	\N	\N	\N	\N	\N
9ec44d94-5120-45fa-aaae-e0987f709a60	\N	write_off	RESTAURANT OUTLET SR-D	\N	Chicken Fries (2)	1000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:52:15.117585	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	0f33a311-9974-4c6d-bd95-8f3ebf172282	\N	2026-01-08 00:00:00	\N	2.00	\N	\N	\N	\N	\N
f0bd16b1-d66c-4501-90ae-904c3f5eb17c	\N	waste	RESTAURANT OUTLET SR-D	\N	Chicken Fries (2)	1000.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:52:35.816349	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	0f33a311-9974-4c6d-bd95-8f3ebf172282	\N	2026-01-08 00:00:00	\N	2.00	\N	\N	\N	\N	\N
41ed03d3-c3ea-4480-896c-39e8d0f10e94	\N	transfer	RESTAURANT OUTLET SR-D	MAIN STORE SR-D	Chicken Fries (1)	500.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:52:56.49792	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	0f33a311-9974-4c6d-bd95-8f3ebf172282	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2026-01-08 00:00:00	\N	1.00	\N	\N	\N	\N	\N
e2ab3a87-bd6d-4c84-8130-bb131b0eed7b	\N	adjustment	RESTAURANT OUTLET SR-D	\N	[REVERSAL] Chicken Fries (1)	500.00	\N	a62196b8-c91c-465d-9f3d-35e82bb6d0d2	2026-01-10 09:57:28.200676	0d947773-28ee-4e02-b5b6-40455566817d	85a7e500-07f9-4f0c-9bec-4e65c6ad98d4	0f33a311-9974-4c6d-bd95-8f3ebf172282	\N	2026-01-10 09:57:28.18	decrease	1.00	REVERSAL of movement d3da4dc2... Reason: u	\N	\N	\N	\N
\.


--
-- Data for Name: store_issue_lines; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.store_issue_lines (id, store_issue_id, item_id, qty_issued, cost_price_snapshot, created_at) FROM stdin;
d44b9453-62a0-423f-aaae-704df5dbd6d4	3bb92c6d-6604-42ac-91e7-1747de843774	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	20.00	0.00	2025-12-29 12:58:03.711395
1a94afb3-a56a-4655-b154-f8251905135e	41136898-7ad4-433d-a280-2d4e2a665506	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	20.00	0.00	2025-12-29 12:59:47.648285
114dc5d4-6632-43be-87ab-f037bebd18bb	a058b216-ed37-4b51-b70a-53b204fffa66	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	20.00	0.00	2025-12-29 13:01:00.572687
62ce8199-977d-4a55-b3c5-b2c4856ca5a8	1179cc57-fad0-4be5-95d7-1aee500f3efd	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	10.00	0.00	2025-12-29 13:01:16.221508
f09561ec-d5fb-4a10-b1d3-d975012179cf	d2c1fd7d-33b4-4c9c-904d-d1c566c20885	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	-5.00	0.00	2025-12-29 13:01:36.048536
a842a6d6-d6d7-4dfe-b134-717f452ac687	78dc80ea-423d-4e17-8ade-fcde6f1715da	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	15.00	0.00	2025-12-29 13:03:18.482431
274d6332-161c-4b00-b3ed-965bd77f03d0	59e18f7c-c0a1-4d29-914c-be972ad5d3d8	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	10.00	0.00	2025-12-29 13:10:53.784445
33c02d3c-3ec9-4156-ad1d-75c98e6efc6f	7fbbd59b-59e6-4984-8a7a-937a2cbbb191	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	100.00	0.00	2025-12-29 14:42:14.015743
455f49ff-9aac-4004-bbc9-81c8fd7ac2ac	82bf0ca4-5cd6-4098-99ff-e2a5c9733158	4f95bc96-08b8-4aad-9f1a-b88a0b211f33	80.00	0.00	2025-12-29 16:05:50.284307
9b479d85-a8f5-40aa-9745-19a317ceb645	373f6b80-cd24-4bda-8dbb-c4687117193b	d24028d5-7172-4fa4-a16a-e96a21e92c62	70.00	0.00	2025-12-29 16:06:47.604744
29f4aaab-ef71-43fc-8ff7-f6597757c6bd	a6dad280-a186-4cff-969e-4c9c7a19e3b8	d24028d5-7172-4fa4-a16a-e96a21e92c62	1000.00	0.00	2025-12-29 19:03:15.221429
1f912eb1-7b4d-4b89-a5f9-29a4a5b84f90	62d418e9-e867-44a6-9a8b-1dc0abafdb6f	e55abe0b-52ac-487b-9a47-3a83ee61a95d	300.00	0.00	2025-12-29 22:15:57.866157
bc073b14-50e2-454f-a151-a3561d32be38	2ed25f77-486b-42ce-91ae-45b525a47de1	e55abe0b-52ac-487b-9a47-3a83ee61a95d	700.00	0.00	2025-12-29 22:16:38.290986
dd674df5-25a9-4db7-954d-8e9bb874e909	a3734fcd-4e19-4664-8de1-d5fdb514e8f7	3315d410-2302-4ff8-8a38-6af5f1bee4ee	450.00	0.00	2025-12-29 22:17:24.997715
22427ae5-1862-4ebe-8a00-338d0ed9453e	cfc2d219-0286-4e4a-9c92-a1737b8698d5	0685f443-471a-4a34-927e-f5e41fbeb2d3	450.00	0.00	2025-12-30 08:26:15.880825
c34a4a68-8de7-4963-92c9-80aec43fcc55	80377e8e-b095-4ac4-bbbd-d05cca8a68fb	29070060-0461-41bc-afaa-d58281cef2bb	30.00	0.00	2025-12-30 18:21:34.867983
b900b87b-0a65-42ba-9538-c2b689346635	db4b91ab-4a55-4852-859e-b4a825fc2095	29070060-0461-41bc-afaa-d58281cef2bb	40.00	0.00	2025-12-30 18:23:47.808478
12ed9b94-4c26-4c49-959f-ce91bdc65916	f8d24b14-91dd-403d-9147-eb145538ce2b	29070060-0461-41bc-afaa-d58281cef2bb	-10.00	0.00	2025-12-30 18:24:14.033016
\.


--
-- Data for Name: store_issues; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.store_issues (id, client_id, issue_date, from_department_id, to_department_id, notes, status, created_by, created_at) FROM stdin;
6551fdd3-5b8a-4b35-906b-8ef7d139dbb5	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-29 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 05:29:33.692423
acdc1c49-fa98-4ce1-aaa1-9b4be3e67fa7	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-26 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 05:50:30.185895
d414bd2a-5b07-41db-a243-c844bb1b8b08	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-26 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 05:50:55.930308
2eaf6c79-5750-4f6a-bf93-c57897517d6d	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-26 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 05:52:24.583015
12c6ce7e-4820-4e2b-972c-3cb96956837e	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-26 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 05:51:18.030853
c0bac2e0-0db1-4402-8c62-7081a649ee12	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-26 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 05:58:18.279758
8dac7909-9086-4961-8a4f-1ec935c4ce5b	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	78721483-0a9f-4e27-9e4f-30fc9f848485	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 15:37:17.895288
40ba1cd5-aeee-4456-9ee5-eae07651b255	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	fd666e2e-2de8-4b34-8687-9d45c75a85c3	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 15:36:00.512319
d48fe5dc-086e-404d-96dc-594130293089	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 15:19:28.953354
fbc19936-de49-42fe-b977-b00515de60a8	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 05:58:49.591158
1ef13c31-c5aa-4942-9bb6-2bb68c6e55b3	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 15:07:31.46484
7645c3a3-6d2a-4de3-a4b5-abdbc79b3d61	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 15:06:46.058764
1548a178-3eab-4f71-9ea1-d1e2ec1f9f46	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 13:53:41.340378
3c2c0d4b-a8dd-49e1-b48f-394cfccc6408	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	78721483-0a9f-4e27-9e4f-30fc9f848485	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 16:29:08.417536
eec8334e-84b3-4729-bebe-6fa697510c93	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	78721483-0a9f-4e27-9e4f-30fc9f848485	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 16:20:50.953599
f6b5587c-e192-4417-8ce6-4cfdd1034265	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	fd666e2e-2de8-4b34-8687-9d45c75a85c3	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 16:20:37.254967
3d5ce852-ff48-4a04-9b8a-22d552c139e0	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 02:44:41.75134
7a18bbeb-2b08-441d-888c-3d3adb02ec82	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-28 13:55:35.594793
60abffa1-385c-4902-bc8d-29f0482eb2b2	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 05:59:28.342434
150b643f-07db-46c5-81d6-c8f68a6a2b97	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-29 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 06:01:02.279596
3bb92c6d-6604-42ac-91e7-1747de843774	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-25 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 12:58:03.706945
41136898-7ad4-433d-a280-2d4e2a665506	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-25 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 12:59:47.620412
a058b216-ed37-4b51-b70a-53b204fffa66	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-26 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:01:00.566774
d2c1fd7d-33b4-4c9c-904d-d1c566c20885	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-26 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:01:36.043317
1179cc57-fad0-4be5-95d7-1aee500f3efd	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-26 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:01:16.171798
59e18f7c-c0a1-4d29-914c-be972ad5d3d8	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:10:53.775723
78dc80ea-423d-4e17-8ade-fcde6f1715da	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-27 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:03:18.477801
7fbbd59b-59e6-4984-8a7a-937a2cbbb191	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-29 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	2ce2d797-64c0-48a4-9e3b-03fd62786195	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 14:42:13.994502
82bf0ca4-5cd6-4098-99ff-e2a5c9733158	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	fd666e2e-2de8-4b34-8687-9d45c75a85c3	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 16:05:50.275654
373f6b80-cd24-4bda-8dbb-c4687117193b	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-28 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	fd666e2e-2de8-4b34-8687-9d45c75a85c3	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 16:06:47.598893
a6dad280-a186-4cff-969e-4c9c7a19e3b8	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2025-12-29 00:00:00	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	fd666e2e-2de8-4b34-8687-9d45c75a85c3	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 19:03:15.196095
62d418e9-e867-44a6-9a8b-1dc0abafdb6f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-29 00:00:00	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 22:15:57.855182
2ed25f77-486b-42ce-91ae-45b525a47de1	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-29 00:00:00	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 22:16:38.240461
a3734fcd-4e19-4664-8de1-d5fdb514e8f7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-29 00:00:00	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 22:17:24.970345
5181fe31-ced4-4507-8247-2f245f3e7584	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-29 00:00:00	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 22:17:49.82086
cfc2d219-0286-4e4a-9c92-a1737b8698d5	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-30 00:00:00	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	c47d93b1-4801-445b-a77e-8362ebb25442	ask by samuel	posted	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 08:26:15.867463
80377e8e-b095-4ac4-bbbd-d05cca8a68fb	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-28 00:00:00	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:21:34.768302
db4b91ab-4a55-4852-859e-b4a825fc2095	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-28 00:00:00	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:23:47.796767
f8d24b14-91dd-403d-9147-eb145538ce2b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	2025-12-28 00:00:00	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	b30e98ff-9e99-4f22-b814-cd976d2c9c71	\N	recalled	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:24:14.020761
\.


--
-- Data for Name: store_names; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.store_names (id, name, status, created_at, client_id, created_by) FROM stdin;
73e5c291-544b-493d-aaf9-b0255991fefc	Main Store 1 SR-D	active	2025-12-27 23:00:36.935172	fb428d91-bacb-44ed-b4cd-310c87c5a8de	\N
32f33217-fe1c-43a8-adf4-8ba3a898dc5a	Bar 1 SR-D	active	2025-12-28 03:04:46.703868	fb428d91-bacb-44ed-b4cd-310c87c5a8de	\N
e44ffc4f-8a9a-4379-b5b0-274bbe8a8834	Bar 2 pool SR-D	active	2025-12-28 03:05:05.451857	fb428d91-bacb-44ed-b4cd-310c87c5a8de	\N
30b18cac-f24b-469e-837d-3184f0a731d2	Grill 2 Pool Side SR-D	active	2025-12-28 04:04:41.929003	fb428d91-bacb-44ed-b4cd-310c87c5a8de	\N
e457ac14-65c9-4719-b437-d16eefc11a6b	GRILL OUTLET SR-D	active	2025-12-29 21:28:40.949707	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	5ed0ccee-d55a-4700-b092-efa7e84a1907
13fd1c0e-3e9c-4fa2-b798-1d8ff611bb87	JUICES OUTLET SR-D	active	2025-12-29 21:29:29.593398	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	5ed0ccee-d55a-4700-b092-efa7e84a1907
db93ae9e-caba-448a-92d1-6d9f2adcb91c	MAIN STORE SR-D	active	2025-12-29 21:52:04.016722	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	5ed0ccee-d55a-4700-b092-efa7e84a1907
560316e1-a80d-4a4a-97ae-13ffd1ee37a5	BAR OUTLET SR-D	active	2025-12-30 08:23:41.448259	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	5ed0ccee-d55a-4700-b092-efa7e84a1907
3a3bce42-ba0c-4d5e-8f4f-7f264cb46357	BAR/MIXOLOGIST OUTLET SR-D	active	2026-01-05 03:47:02.557718	d40fe583-f75d-4714-b3b5-9d83a9a332a9	6419147a-44c1-4f3c-bbcb-51a46a91d1be
34bc8c21-57a3-4832-98c1-5a15b01505d9	RESTAURANT/GRILL OUTLET SR-D	active	2026-01-05 03:47:10.654277	d40fe583-f75d-4714-b3b5-9d83a9a332a9	6419147a-44c1-4f3c-bbcb-51a46a91d1be
47696449-9f87-42da-b36d-9f27031e6489	BAR OUTLET SR-D	active	2026-01-07 14:52:59.842342	0d947773-28ee-4e02-b5b6-40455566817d	a62196b8-c91c-465d-9f3d-35e82bb6d0d2
3f8213b0-26ff-403d-a7a9-acd4a599d92f	RESTAURANT OUTLET SR-D	active	2026-01-07 14:53:05.932328	0d947773-28ee-4e02-b5b6-40455566817d	a62196b8-c91c-465d-9f3d-35e82bb6d0d2
1dd5c2ea-942b-4a49-8aee-f558918600f0	MAIN STORE SR-D	active	2026-01-07 14:53:20.053214	0d947773-28ee-4e02-b5b6-40455566817d	a62196b8-c91c-465d-9f3d-35e82bb6d0d2
e7631ce5-5c65-4d92-b7a5-d30afac8f0ba	MAIN STORE SR-D	active	2026-01-05 03:48:04.892318	d40fe583-f75d-4714-b3b5-9d83a9a332a9	6419147a-44c1-4f3c-bbcb-51a46a91d1be
0c86d91d-cbae-4b44-b431-e2d4745f52c5	MAIN STORE OUTLET SR-D	active	2026-01-10 00:18:26.376912	d40fe583-f75d-4714-b3b5-9d83a9a332a9	6419147a-44c1-4f3c-bbcb-51a46a91d1be
\.


--
-- Data for Name: store_stock; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.store_stock (id, client_id, store_department_id, item_id, date, opening_qty, added_qty, issued_qty, closing_qty, physical_closing_qty, variance_qty, cost_price_snapshot, created_by, created_at, updated_at, transfers_in_qty, transfers_out_qty, inter_dept_in_qty, inter_dept_out_qty, waste_qty, write_off_qty, adjustment_qty, sold_qty, return_in_qty) FROM stdin;
659959a5-9ffc-437b-bcdd-6a623366c3a6	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-25 00:00:00	10.00	90.00	0.00	100.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 12:57:39.307254	2025-12-29 13:00:37.519	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
33bcdf68-21fe-45df-81ab-943cfb319de0	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-25 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 12:58:03.727108	2025-12-29 13:00:37.547	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
63c0516e-d60a-4c02-a5f9-b34c83759f5b	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-29 00:00:00	75.00	120.00	100.00	95.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 14:42:14.027177	2025-12-29 18:13:41.443	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f3e80a35-9be4-4af6-9e92-ef675bab5a48	fb428d91-bacb-44ed-b4cd-310c87c5a8de	fd666e2e-2de8-4b34-8687-9d45c75a85c3	4f95bc96-08b8-4aad-9f1a-b88a0b211f33	2025-12-28 00:00:00	0.00	80.00	0.00	80.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 16:05:50.296515	2025-12-29 16:05:50.296515	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a4f8faf6-9958-470e-90cf-4befecd9fff3	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	4f95bc96-08b8-4aad-9f1a-b88a0b211f33	2025-12-29 00:00:00	20.00	210.00	0.00	230.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 18:13:41.438541	2025-12-29 18:13:54.415	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c284b9b7-e965-47c1-8472-b43645e8e262	fb428d91-bacb-44ed-b4cd-310c87c5a8de	fd666e2e-2de8-4b34-8687-9d45c75a85c3	d24028d5-7172-4fa4-a16a-e96a21e92c62	2025-12-28 00:00:00	0.00	70.00	0.00	70.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 16:06:47.620578	2025-12-29 16:06:47.620578	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
06b5870c-2fdd-41d5-9349-0797d2fe8c86	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-26 00:00:00	100.00	0.00	15.00	85.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:01:00.581921	2025-12-29 13:02:39.075	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
942bb32d-c1b3-4406-9a86-eae4b8236ad2	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-26 00:00:00	0.00	15.00	0.00	15.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:01:00.588044	2025-12-29 13:02:39.082	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3e646314-e8b2-40c9-8797-c93c7b585097	fb428d91-bacb-44ed-b4cd-310c87c5a8de	fd666e2e-2de8-4b34-8687-9d45c75a85c3	4f95bc96-08b8-4aad-9f1a-b88a0b211f33	2025-12-29 00:00:00	80.00	0.00	0.00	40.00	40.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 16:36:17.766141	2025-12-29 16:36:17.766141	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c38b76a2-6052-4acd-a67f-ae722ecafbdc	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-28 00:00:00	30.00	10.00	0.00	40.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:10:53.79661	2025-12-29 13:10:53.79661	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9ab32f2c-ec06-4991-92ae-354662d94c63	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-27 00:00:00	85.00	0.00	0.00	85.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:03:18.488473	2025-12-29 13:11:26.15	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d413907a-002a-4fe8-8fa8-5aee4268d7c7	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-27 00:00:00	15.00	0.00	0.00	15.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:03:18.493566	2025-12-29 13:11:26.161	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1d8ecc47-2ce6-401f-85a8-7fba38d9f1bf	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	d24028d5-7172-4fa4-a16a-e96a21e92c62	2025-12-29 00:00:00	0.00	5000.00	1000.00	4000.00	\N	\N	1000.00	\N	2025-12-29 18:08:00.477907	2025-12-29 19:03:15.225	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
533f75e0-91a0-43ef-b39b-43f458be21f8	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-29 00:00:00	40.00	100.00	0.00	140.00	119.00	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 14:42:14.0371	2025-12-29 15:12:46.367	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
87bfdaed-d0bb-40a4-80e5-e9e41b65fccd	fb428d91-bacb-44ed-b4cd-310c87c5a8de	fd666e2e-2de8-4b34-8687-9d45c75a85c3	d24028d5-7172-4fa4-a16a-e96a21e92c62	2025-12-29 00:00:00	70.00	1000.00	0.00	1070.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 19:03:15.231266	2025-12-29 19:03:15.231266	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4d7e36dd-e8c4-4d8d-bd7e-a639fdcfaf34	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	4f95bc96-08b8-4aad-9f1a-b88a0b211f33	2025-12-28 00:00:00	10.00	90.00	80.00	20.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 16:04:59.56642	2025-12-29 18:10:53.28	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
470541c1-0ab6-4b2c-b55e-2f1b1be1e3c8	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	d24028d5-7172-4fa4-a16a-e96a21e92c62	2025-12-28 00:00:00	170.00	0.00	70.00	100.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 16:04:59.565173	2025-12-29 18:10:53.403	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
523dc548-1cef-4fe1-9e33-5eb72c571e81	fb428d91-bacb-44ed-b4cd-310c87c5a8de	bd22d458-81ba-414f-bcdb-4e047e7ab1c6	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2025-12-28 00:00:00	85.00	0.00	10.00	75.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 13:10:53.79239	2025-12-29 18:10:53.426	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
61a6ecae-38be-477f-a749-3fa14b4844a3	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-30 00:00:00	11850.00	450.00	450.00	11850.00	\N	\N	500.00	\N	2025-12-30 08:04:45.507571	2025-12-31 06:14:55.823	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c9b2bd86-3d52-4830-8a9d-879eb4be3f85	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-29 00:00:00	22250.00	0.00	450.00	21800.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 22:17:25.005108	2025-12-31 06:14:55.348	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
81f8bfb2-e6bb-46f1-bfe7-2f0f912a34fe	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-30 00:00:00	0.00	450.00	0.00	450.00	448.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 08:26:15.894961	2025-12-30 20:43:31.685	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ed04ce13-b53a-4edb-ac57-ba37c7dba85d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-28 00:00:00	21800.00	450.00	0.00	22250.00	\N	\N	600.00	\N	2025-12-29 21:55:01.516266	2025-12-31 06:14:54.823	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9ab730c6-5dee-427a-9d69-f0c731359b52	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-20 00:00:00	21000.00	500.00	0.00	21500.00	\N	\N	600.00	\N	2025-12-30 14:15:38.306951	2025-12-31 06:14:35.373	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f0b99da0-d216-4bb0-8508-3d38cc1d4869	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-29 00:00:00	5000.00	700.00	700.00	5000.00	\N	\N	600.00	\N	2025-12-29 21:56:26.937135	2025-12-31 06:14:55.344	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c033bfce-a2df-4355-8a60-b2fcb9f95bdb	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-30 00:00:00	10.00	0.00	0.00	10.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 14:50:01.530827	2025-12-30 21:22:33.692	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
569490bb-d637-4590-a7f8-fe4d2f35f4a0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-30 00:00:00	710.00	0.00	5.00	705.00	697.00	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 23:37:08.401725	2025-12-30 21:28:05.542	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f609d282-9dd1-4156-90a7-f2cb903de665	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-20 00:00:00	1200.00	300.00	0.00	1500.00	\N	\N	400.00	\N	2025-12-30 13:59:10.867378	2025-12-31 04:33:30.776	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c24285c0-03f0-497f-b704-b075909b3cfe	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-30 00:00:00	450.00	0.00	0.00	450.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 14:50:01.538774	2025-12-30 14:50:01.538774	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
76895f2f-ebc2-4962-a7ad-8cd157af58d9	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-28 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 14:51:37.256839	2025-12-30 14:51:37.256839	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a3c94e4b-f3ea-4b75-a780-bbdea0f2d278	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-15 00:00:00	800.00	2900.00	0.00	3700.00	\N	\N	400.00	\N	2025-12-30 16:53:31.353949	2025-12-31 06:42:15.033	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
16e68a40-5766-4b65-a8b7-7ed25e1cadeb	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-02 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:45.070937	2025-12-31 06:07:50.103	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a612f18c-85ec-4df0-a419-325d07953e71	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-01 00:00:00	0.00	1000.00	0.00	1000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:36.808444	2025-12-31 06:42:36.063	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
12bf6635-ff9e-4725-8fcd-14770fdae59c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-02 00:00:00	500.00	0.00	0.00	500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:45.062972	2025-12-30 18:16:45.062972	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
daf3ebf9-2cde-49be-a327-c56953f7cbd3	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-01 00:00:00	0.00	1000.00	0.00	1000.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:36.760023	2025-12-31 06:42:36.045	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7e2fcf91-1637-4db9-90e2-6403cadcd8ef	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-30 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 16:50:13.952351	2025-12-31 06:14:55.808	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
683db9fb-f23e-4beb-b4a2-1ff113ce3a76	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-28 00:00:00	0.00	0.00	0.00	0.00	15.00	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 14:51:37.249555	2025-12-30 18:22:24.127	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2967c354-a40d-4e8a-9132-553c9e0ac33c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-30 00:00:00	5000.00	3.00	0.00	5003.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 16:50:13.958601	2025-12-31 06:14:55.816	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c6dc3d06-88c8-43ac-b2a9-c20773390ac8	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-29 00:00:00	15.00	700.00	0.00	710.00	710.00	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 22:15:57.884346	2025-12-31 04:46:05.246	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7b78d318-fe01-49c0-9196-25ee35970030	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-29 00:00:00	10.00	0.00	0.00	10.00	10.00	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 14:51:44.822231	2025-12-31 04:46:05.23	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
e364e917-406d-43e0-ac3a-d4e9de90cc9b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-01 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:27.241897	2025-12-31 04:56:34.763	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2453156d-2f6d-4cb1-bbd5-f292383bc830	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-29 00:00:00	0.00	450.00	0.00	450.00	445.00	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 22:17:25.009862	2026-01-01 00:06:33.978	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3ed94f36-d4e1-4e7b-b865-122f68ff156b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-30 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 16:50:13.942329	2025-12-31 06:14:55.813	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
519e4898-21c3-430e-88d3-7e13cdf71a7e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-01 00:00:00	0.00	5000.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:36.788198	2025-12-31 06:42:36.058	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7f38a41d-207b-4177-8041-566ff84f8b4a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-01 00:00:00	0.00	500.00	0.00	500.00	\N	\N	400.00	\N	2025-12-30 18:15:45.932822	2025-12-31 06:42:36.054	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
58c45a01-723e-44cc-af79-2a45635237c4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-01 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:27.249385	2025-12-31 04:56:34.777	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
019e95f1-f025-4240-adc3-9e7ee5558b86	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-01 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:27.257486	2025-12-31 04:56:34.795	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5e6b5a5d-b2e4-43be-bb91-a5be9851019f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-02 00:00:00	1000.00	2000.00	150.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:45.059275	2025-12-31 05:10:32.579	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
aa33237b-5b63-44ea-a7d9-af35c7f775b1	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-02 00:00:00	2000.00	5000.00	150.00	6850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:45.031371	2025-12-31 06:07:50.111	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
6e5e4e39-56fb-423d-9c86-d5ab86aa09c4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-01 00:00:00	0.00	2000.00	0.00	2000.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:36.650257	2025-12-31 06:42:36.067	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
98588b2d-486c-4936-bb9d-ec2772988851	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-02 00:00:00	1000.00	2000.00	150.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:45.037897	2025-12-31 05:11:25.543	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
844da6fd-1be6-46ad-b49b-83f797d7dabd	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-01 00:00:00	0.00	1000.00	0.00	1000.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:36.736829	2025-12-31 06:42:36.05	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
dd3d932d-4fc8-4400-b3e7-195dd943aa3f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-02 00:00:00	1000.00	20000.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:45.075013	2025-12-31 06:07:50.107	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c684f740-f540-499b-a570-e1ca18e5c9a6	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-30 00:00:00	1490.00	0.00	0.00	1490.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 16:50:13.96446	2025-12-31 06:12:58.844	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
813b7a61-1545-4543-bd7e-a685a4fafade	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-25 00:00:00	21500.00	300.00	0.00	21800.00	\N	\N	600.00	\N	2025-12-30 18:08:09.325886	2025-12-31 06:14:52.723	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
93b51691-3a00-419e-b768-e343ed1a98a0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-03 00:00:00	500.00	0.00	0.00	500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:49.979117	2025-12-30 18:16:49.979117	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d57b5f57-c996-4ad3-ae7d-4d8aef51939b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-04 00:00:00	500.00	0.00	0.00	500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:56.54583	2025-12-30 18:16:56.54583	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
99b918fe-7a8b-4c09-becc-a7a08fc1af87	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-05 00:00:00	500.00	0.00	0.00	500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:01.521365	2025-12-30 18:17:01.521365	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f354c465-cdf1-44ce-a6a5-6295103d138a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-06 00:00:00	500.00	300.00	0.00	800.00	\N	\N	400.00	\N	2025-12-30 18:16:10.036343	2025-12-30 18:17:06.692	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5fcb84e8-f5fb-458e-9210-52937f8696a8	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-07 00:00:00	800.00	0.00	0.00	800.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:13.180642	2025-12-30 18:17:13.180642	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
e8c25570-6899-404a-9c3c-e503e0d0c84d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-04 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:56.553436	2025-12-31 06:10:18.527	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
dc4b220e-711a-4d82-8638-5c2f357631e4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-04 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:56.501983	2025-12-31 06:01:56.863	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
e5d5de67-4b1b-4809-882c-5b339815a6de	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-05 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:01.527856	2025-12-31 06:10:27.361	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
49e3308e-b937-404c-aabf-81d509c64a86	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-05 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:01.517731	2025-12-31 06:03:39.901	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
37e2d7e3-a97e-4aaa-a0b0-a9da69307e96	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-05 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:01.513219	2025-12-31 06:03:39.932	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7e6dc704-bfc4-45ca-b5f5-0fbb9b4c32cb	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-06 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:06.686132	2025-12-31 06:04:30.153	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f0f3ccf3-fa6c-4d37-8e4f-2674e96ecbf0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-06 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:06.697697	2025-12-31 06:10:36.435	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
322af658-b69a-4b81-8eeb-3c1b003075aa	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-06 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:06.681995	2025-12-31 06:04:30.166	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
18e6995d-1f20-4605-a23e-d1312c42d1df	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-07 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:13.167589	2025-12-31 06:10:40.007	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d2062a4e-e463-4409-9975-e24ffdfe3c3d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-03 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:49.986818	2025-12-31 06:08:41.459	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
53f33375-f136-4205-b923-75e869caee3c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-07 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:13.161291	2025-12-31 06:10:40.019	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
83e9d660-6ede-4373-aa1b-f6fd2b01f3b7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-07 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:13.216362	2025-12-31 06:10:40.024	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
bdb3197a-e6e5-49dd-994c-e2f805880d89	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-04 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:56.533847	2025-12-31 06:01:56.843	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2f40ff0c-8e7c-402d-8c93-78f40fc6c5ae	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-03 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:49.992246	2025-12-31 06:08:41.474	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ab1129ff-0496-4cd6-b13a-82c8b67ca17b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-03 00:00:00	6850.00	0.00	0.00	6850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:49.960668	2025-12-31 06:08:41.48	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
879b999f-3382-4650-8ae9-57259d108dc0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-04 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:56.557978	2025-12-31 06:10:18.533	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
acc963b3-8cca-4e8d-9c71-82dc73cdc3b1	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-04 00:00:00	6850.00	0.00	0.00	6850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:56.410755	2025-12-31 06:10:18.539	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
79ef8d06-9bb5-4d3c-bb75-11b6e32669b2	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-05 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:01.535249	2025-12-31 06:10:27.367	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
bf47e75e-22a2-482c-a52c-9d1f40a655a8	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-05 00:00:00	6850.00	5000.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:01.506313	2025-12-31 06:10:27.371	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3f9e7bfa-3320-4ebb-9696-a7b87885db86	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-06 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:06.702682	2025-12-31 06:10:36.443	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9d7098f4-4a63-4b79-ac31-bf64bf7c7aec	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-06 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:06.668268	2025-12-31 06:10:36.447	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
593cd5dd-d21b-45ee-aeb4-cd138888cf4d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-07 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:13.115609	2025-12-31 06:10:40.076	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a467520e-ff7a-42ab-8e69-f303ed2677aa	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-08 00:00:00	800.00	0.00	0.00	800.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:17.870718	2025-12-30 18:17:17.870718	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
06e5d1f3-30c8-4fef-a1e9-37045bb37339	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-09 00:00:00	800.00	0.00	0.00	800.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:24.281799	2025-12-30 18:17:24.281799	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
25579050-cb24-4dd1-a107-54bf3f48e28b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-10 00:00:00	800.00	0.00	0.00	800.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:00.176098	2025-12-30 18:18:00.176098	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c5cb81d8-9f3a-45a1-91bb-9f70aa8aeecd	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-12 00:00:00	800.00	0.00	0.00	800.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:11.106668	2025-12-30 18:18:11.106668	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7b815053-9514-4487-8272-328924fde809	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-08 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:17.874286	2025-12-31 06:10:41.682	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
6370783d-c245-44eb-b8ed-7bf47b2edc64	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-09 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:24.277859	2025-12-31 06:10:44.472	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
cb84732e-6bbd-4486-b21e-3002bf1cb683	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-09 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:24.269641	2025-12-31 06:10:44.477	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
45d9c575-ca51-41e0-9d65-e3be15e66e88	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-09 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:24.287274	2025-12-31 06:10:44.482	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
05236e59-6a82-4d52-afbd-3234fded9ab4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-10 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:00.168684	2025-12-31 06:10:46.259	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
500d62b2-1b97-4689-a3ef-6f30db024dc5	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-10 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:00.16166	2025-12-31 06:10:46.266	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0bcca749-9328-4f9f-ade8-e43d801184de	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-10 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:00.183321	2025-12-31 06:10:46.269	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c7a042af-ce8d-4e11-9b02-8471145c8cfe	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-11 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:04.224891	2025-12-31 06:13:52.246	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c4de21f4-d3b9-4042-bab2-3cd35429c95e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-12 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:11.102741	2025-12-31 06:13:57.401	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
97bcce67-a188-4874-a36f-7d3243c212e3	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-12 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:11.098339	2025-12-31 06:13:57.411	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
35da3b4f-6628-4b15-a902-a2be2ec988dd	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-07 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:13.229781	2025-12-31 06:10:40.071	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
20d91ed5-61ba-4c87-9df5-1b9372fd9587	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-08 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:17.861081	2025-12-31 06:10:41.677	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
19f92dba-8aef-4f7b-a598-3ef9132f5457	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-08 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:17.877928	2025-12-31 06:10:41.688	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5ad5dfeb-f0fe-4495-b08a-790f0cbb8139	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-08 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:17.85571	2025-12-31 06:10:41.692	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
688c9e25-5a24-4e61-bb07-e1b00a519e79	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-09 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:24.292288	2025-12-31 06:10:44.486	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
52934db0-f866-49eb-8d10-c1a9532b5818	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-09 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:24.262662	2025-12-31 06:10:44.49	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0a592120-c08b-4524-bebb-2d158a453514	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-10 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:00.188543	2025-12-31 06:10:46.274	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
fc3081fe-b27e-4371-808c-025e1006c729	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-10 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:00.127161	2025-12-31 06:10:46.279	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
de554741-a534-4400-a82c-e6ab20eeae37	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-12 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:11.092592	2025-12-31 06:13:57.426	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
52da614c-5026-4812-9b84-fa174819c30a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-13 00:00:00	800.00	0.00	0.00	800.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:17.073404	2025-12-30 18:18:17.073404	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
dfd3d416-5ab4-4567-8885-99ff1476690e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-14 00:00:00	800.00	0.00	0.00	800.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:23.532279	2025-12-30 18:18:23.532279	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c40c9af5-2380-48c4-92f3-44f57d1b61bd	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-13 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:17.079896	2025-12-31 06:14:07.302	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9f804b66-5013-45f9-96b3-bc14d7c6eb71	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-14 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:23.528652	2025-12-31 06:14:13.559	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
75eafdd8-171f-41f3-92a5-5a21a845cf1d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-14 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:23.524577	2025-12-31 06:14:13.594	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5a085fc1-06d6-45af-bd40-076d2146d863	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-14 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:23.536304	2025-12-31 06:14:13.604	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
75445bf2-ccb9-42c6-acc1-c1be0e502af0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-15 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:27.744423	2025-12-31 06:14:15.911	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b18efbf1-8a56-45ba-aae7-49875166c927	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-15 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:27.74	2025-12-31 06:14:15.918	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a704ab55-7963-443d-9f81-c602c454ee2a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-16 00:00:00	3700.00	0.00	0.00	3700.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:35.534031	2025-12-31 06:42:53.759	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b84675a1-7068-48ab-b159-507856641c71	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-16 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:35.523764	2025-12-31 06:14:17.951	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f3ebe180-1208-4b64-b05b-0d30d40a4a3b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-16 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:35.51301	2025-12-31 06:14:17.956	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
86d4c374-c7f7-4d78-9ee0-fd7fd2c383ac	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-17 00:00:00	3700.00	0.00	0.00	3700.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:41.836251	2025-12-31 06:43:10.791	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
23119387-0e6f-46a5-8495-81d872ab430e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-17 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:41.832349	2025-12-31 06:14:19.408	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3e87447e-3b00-4165-920b-62e064966705	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-17 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:41.828276	2025-12-31 06:14:19.416	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1e3a4324-431d-4ca7-bd8a-873b1be3b731	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-17 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:41.822112	2025-12-31 06:14:19.431	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
271f7f08-ac98-4b4f-bf61-97c626d933c6	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-13 00:00:00	2850.00	3000.00	0.00	5850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:17.064107	2025-12-31 06:16:19.625	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
99edfdf7-7e0f-42ad-a9e0-5b86d777330a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-12 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:11.110195	2025-12-31 06:13:57.416	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
68654ed2-9c2f-439f-b37c-96c578d2d41b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-12 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:11.113623	2025-12-31 06:13:57.42	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
dc29bd0d-f035-4b3f-b804-eb2800157eb9	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-15 00:00:00	5000.00	2500.00	0.00	7500.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:27.753256	2025-12-31 06:42:28.404	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d5eece2d-15a7-433a-a388-a917f269b8ff	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-13 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:17.083934	2025-12-31 06:14:07.307	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a8bd727b-a422-4d56-a7ce-ecd4e32014be	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-13 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:17.058342	2025-12-31 06:14:07.313	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c760587f-626b-486b-9c19-ebd415b05515	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-14 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:23.539673	2025-12-31 06:14:13.608	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0434c9ef-a833-4c90-88a6-2234f45bc7b5	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-14 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:23.519842	2025-12-31 06:14:13.612	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
19448795-a900-4508-99ce-e5f7093c68f1	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-15 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:27.75951	2025-12-31 06:14:15.943	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b70a01c6-1709-4c80-a9b7-c17d5c4422c4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-15 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:27.736093	2025-12-31 06:14:15.947	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
72524d24-11d8-45ca-b8b9-cdb0ff73352c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-16 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:35.544707	2025-12-31 06:14:17.967	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d76d9216-5aae-4645-ad5e-91583d12fa37	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-16 00:00:00	7500.00	0.00	0.00	7500.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:35.539391	2025-12-31 06:42:53.795	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c460c1aa-1ad9-4dc2-b7ec-81b14b603b4c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-19 00:00:00	1200.00	0.00	0.00	1200.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:53.877222	2025-12-30 18:18:53.877222	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c397c8ab-94b3-4b24-934e-35b179b6f8cb	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-22 00:00:00	1500.00	0.00	0.00	1500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:21.55	2025-12-30 18:19:21.55	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1ca7f597-7fa7-4b71-993d-42132666fea8	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-21 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:16.354837	2025-12-31 06:14:49.174	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
fd50f344-27e3-4d8e-ae42-b01227f24efa	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-22 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:21.546285	2025-12-31 06:14:50.39	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a2f038c0-9b09-4515-b724-668e817c9316	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-20 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:03.929189	2025-12-31 06:14:35.376	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4671c562-b952-40cb-9148-bbb7d41e891c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-18 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:47.838899	2025-12-31 06:14:21.208	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
50d36104-6805-4c3e-90e1-34a0d6518de0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-21 00:00:00	1500.00	0.00	0.00	1500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:16.396575	2025-12-31 04:21:10.443	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
64ebd939-389e-4695-aeb7-2d2a98b6c594	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-22 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:21.54302	2025-12-31 06:14:50.396	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
850af80d-dfac-4eef-b0c7-524e3cdfa0ca	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-20 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:03.965985	2025-12-31 06:14:35.369	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b2a6557f-591f-4913-bcb8-f354a4ca5405	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-21 00:00:00	21500.00	0.00	0.00	21500.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:16.406249	2025-12-31 06:14:49.169	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5b636d84-9c22-4d99-8319-42e8ce7adb8a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-19 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:53.873413	2025-12-31 06:14:24.081	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ef9eac47-2fef-4700-8279-78ff79a5661d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-19 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:53.869045	2025-12-31 06:14:24.086	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
45cebe0a-3924-4d56-9fe0-39ebfae9575b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-19 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:53.880572	2025-12-31 06:14:24.092	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
8a2042ac-b3c2-4e9b-a8a3-e36790ded4bd	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-20 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:03.938943	2025-12-31 06:14:35.359	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2e2540f4-587e-4dc9-b1d6-28eae297e466	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-20 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:03.934777	2025-12-31 06:14:35.364	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
45b03b5d-6e98-4722-a70c-f4218c0c3b09	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-22 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:21.553951	2025-12-31 06:14:50.416	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a329fb72-e0ef-4be9-a5a6-6984096b18f5	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-17 00:00:00	7500.00	0.00	0.00	7500.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:41.840658	2025-12-31 06:43:10.803	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c549369e-f681-4aef-af4f-34ead8baf683	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-18 00:00:00	3700.00	0.00	0.00	3700.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:47.846736	2025-12-31 06:43:14.637	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3346d776-dfa4-472d-adf3-b6ad42d3189d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-17 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:41.844847	2025-12-31 06:14:19.427	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
640445cb-2753-4067-b5c4-adc8758789ff	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-18 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:47.842755	2025-12-31 06:14:21.202	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d579a6dd-c0e2-42ce-a507-4d6b20a87ccb	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-18 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:47.854472	2025-12-31 06:14:21.221	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4993a3ca-c08e-4b0e-9884-f80b89424e14	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-18 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:47.833018	2025-12-31 06:14:21.227	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b940b464-4e58-42da-b3aa-e69f135bc3d8	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-19 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:53.884375	2025-12-31 06:14:24.096	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d9d29a06-34c0-4dc2-aa53-af54253ec51f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-19 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:53.863295	2025-12-31 06:14:24.102	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c46e6eb1-1aaa-4b31-aff6-8706a97c93c3	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-22 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:21.538401	2025-12-31 06:14:50.425	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
e8bb32e9-9c2b-43f6-93de-ca96fa6b306e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-18 00:00:00	7500.00	0.00	0.00	7500.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:47.850732	2025-12-31 06:43:14.641	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a44b0176-355a-4ac4-b372-2aeb0ef6cdb7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-22 00:00:00	21500.00	0.00	0.00	21500.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:21.558269	2025-12-31 06:14:50.42	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
37c2598e-4075-49bb-a4e2-3c9bedbe9453	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-23 00:00:00	1500.00	0.00	0.00	1500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:28.13226	2025-12-30 18:19:28.13226	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c627f074-b45e-4f5f-aa3c-c4e75c6c8fae	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-24 00:00:00	1500.00	0.00	0.00	1500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:33.318679	2025-12-30 18:19:33.318679	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3e2c0947-e664-495b-85f0-476c77df9145	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-25 00:00:00	1500.00	0.00	0.00	1500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:43.023206	2025-12-30 18:19:43.023206	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
325f514c-097f-4d2a-b8a6-2eafcc91899e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-26 00:00:00	1500.00	0.00	0.00	1500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:50.262892	2025-12-30 18:19:50.262892	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1819c3c7-cb87-4e85-90f0-e6be29d5bb8f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-27 00:00:00	1500.00	0.00	0.00	1500.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:09.293537	2025-12-30 18:20:09.293537	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
dbf9da0b-95e3-4b26-8716-a1486d8d5a04	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-23 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:28.136546	2025-12-31 06:14:51.202	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
61061fb7-db64-4cae-b4f4-3c300e9b9208	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-24 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:33.314585	2025-12-31 06:14:52.035	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
91e7badb-e7b5-43b1-8267-221ebc6e634c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-24 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:33.310687	2025-12-31 06:14:52.04	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a60740fb-a643-4c55-ba38-1d9dccaf91d3	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-24 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:33.322156	2025-12-31 06:14:52.047	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4c7a4e3e-2172-4612-be77-ee517fa82b00	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-25 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:43.006101	2025-12-31 06:14:52.702	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
6c5b8fca-26d6-488d-8186-887bc6334386	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-25 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:42.99852	2025-12-31 06:14:52.707	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
761c4ec7-970f-4c55-b5ca-9b8c16b6eb68	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-25 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:43.030515	2025-12-31 06:14:52.712	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
852acede-f7f3-458f-ba42-41ab97d9ccb6	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-26 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:50.258492	2025-12-31 06:14:53.504	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a95b52ec-6075-41a5-b43b-1718985f3b11	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-26 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:50.254756	2025-12-31 06:14:53.512	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
33327ebd-1e60-45f5-a11d-3e211f2e1054	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-26 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:50.266604	2025-12-31 06:14:53.516	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
bfc6279c-3ceb-4685-94cf-d9fd1cbd1611	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-27 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:09.289611	2025-12-31 06:14:54.121	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7eafd6d3-e300-43be-a831-78ae5d86431c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-27 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:09.285663	2025-12-31 06:14:54.126	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
379383c5-79e1-4560-9c44-d6c081bfd3c7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-27 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:09.29716	2025-12-31 06:14:54.13	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
68c29bf9-607c-441f-98af-2935d6d02086	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-23 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:28.122661	2025-12-31 06:14:51.199	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f6406f14-032f-478c-aa99-15713d530056	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-23 00:00:00	21500.00	0.00	0.00	21500.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:28.139563	2025-12-31 06:14:51.208	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7877af5c-52cd-435e-b01f-0b2ac0509e28	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-23 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:28.115472	2025-12-31 06:14:51.211	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3d414653-a621-49ba-ac0d-aca8ef71d0ea	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-24 00:00:00	21500.00	0.00	0.00	21500.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:33.325556	2025-12-31 06:14:52.051	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0bee03ad-5fdf-4c9e-9380-72bcb0551c74	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-24 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:33.306642	2025-12-31 06:14:52.055	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
38634775-15cb-42dd-a569-0a2793757fd1	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-25 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:42.889166	2025-12-31 06:14:52.728	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
742b388d-d52f-4468-a2dd-9e7ae5aa8ad6	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-26 00:00:00	21800.00	0.00	0.00	21800.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:50.270277	2025-12-31 06:14:53.521	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
df47753f-3c6a-4adf-a657-c19944b6f2b0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-26 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:50.249595	2025-12-31 06:14:53.528	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7c81fada-5ff5-48c1-a5d5-8b87f2a49871	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-27 00:00:00	21800.00	0.00	0.00	21800.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:09.301427	2025-12-31 06:14:54.134	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a199254b-d0cb-4d17-bf9a-403e4948623f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-28 00:00:00	0.00	10.00	0.00	10.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 14:51:37.259854	2025-12-30 20:06:21.33	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5baeb97e-6eaa-4df5-8f1d-82d77ee080d4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-30 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 20:42:14.421661	2025-12-30 20:42:14.421661	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9b37eaa6-a8fd-42ee-b3dd-b5ed5cb14784	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-30 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 20:42:14.429104	2025-12-30 20:42:14.429104	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5c1ff89a-c400-4d97-bd0a-7603d9ff164b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:16:39.74767	2025-12-30 21:19:25.469	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
eea22af9-6169-41af-abc3-6b5f50115992	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-28 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:22:41.994993	2025-12-30 18:31:19.399	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4653b3b9-05a1-42f3-a508-b4521b6fd0d4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-28 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:22:42.004325	2025-12-30 18:31:19.408	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7a1e6138-db45-4681-87dc-5b1782ad8e77	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-28 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:22:42.012801	2025-12-30 18:31:19.42	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f0e07c93-2491-4277-b7e6-64a67883f2e0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:17:44.468609	2025-12-30 21:20:18.259	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ae80cf7d-91ad-49c0-8b49-ad206155c0ba	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-28 00:00:00	1500.00	0.00	10.00	1490.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:23.401835	2025-12-30 20:06:21.326	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
423eebd6-ead4-4264-acce-e85212cb54a4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-29 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 21:18:21.294161	2025-12-30 21:21:31.792	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c30cb2c1-b152-4928-8eae-002d9b700e7d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-31 00:00:00	10.00	0.00	0.00	10.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:05:56.109496	2025-12-31 04:05:56.109496	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5455b035-a7b5-40b5-be78-3dfe8c08a798	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-31 00:00:00	697.00	0.00	0.00	697.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:05:56.132109	2025-12-31 04:05:56.132109	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
55e8e257-14d1-4f65-aa5e-4f21cc673570	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-31 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:08:07.838127	2025-12-31 04:08:07.838127	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1c931992-85a9-427c-8bda-b604fe83225c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-28 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:23.395611	2025-12-31 06:14:54.808	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1b9bebaf-ab2c-4635-91f7-220b05f4c419	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-31 00:00:00	450.00	400.00	0.00	850.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:05:56.136561	2025-12-31 04:49:40.977	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c320f5d7-3513-4011-b28f-f911db0f62d6	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-28 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:23.389439	2025-12-31 06:14:54.815	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
176ed06a-fe4e-4318-8b6b-26eb2136a693	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-28 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:23.407374	2025-12-31 06:14:54.819	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4864ea2a-18f5-4040-9819-f98861067ea2	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-29 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:35.645349	2025-12-31 06:14:55.331	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
294b92b3-45f8-4892-a078-0548b6a6f73b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-29 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:35.641096	2025-12-31 06:14:55.339	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
e9d3c1aa-11a1-4747-b8ef-b3c1c7dc209a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-29 00:00:00	1490.00	0.00	0.00	1490.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:35.649334	2025-12-31 06:12:57.526	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d0f85ea1-c639-47e5-9ba6-4d4dee8e30d7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-29 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:35.634422	2025-12-31 06:14:55.352	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d9cf5cb0-b990-436c-819c-21cc232bee2e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-30 00:00:00	21800.00	0.00	0.00	21800.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 16:50:13.970965	2025-12-31 06:14:55.819	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
71ff4b3e-9fd3-4e47-88e9-839e3bf31249	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-31 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:12:16.44706	2025-12-31 19:46:35.488	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
107ed85f-5421-47c4-80c0-14ff1486f9a1	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-31 00:00:00	0.00	0.00	0.00	0.00	0.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:08:07.833914	2025-12-31 08:04:03.616	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
be06edcc-9ad5-47e2-bc3a-60181c4203f2	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-28 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:23.379917	2025-12-31 06:14:54.826	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
665ec905-7ec8-48a8-90b4-e6ef086e7845	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-31 00:00:00	448.00	4.00	5.00	447.00	440.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:08:07.824516	2025-12-31 10:00:30.996	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
09b819fc-3a6d-43b5-a3ec-a9225c0888f4	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-26 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:55.105558	2025-12-31 04:39:55.105558	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4362acf8-be93-4781-a71a-15e0a0cfd904	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-26 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:55.113518	2025-12-31 04:39:55.113518	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
911b27d6-e009-4ae3-a7fd-e5420e69c852	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-27 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:41:23.203413	2025-12-31 04:41:23.203413	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7ab7d9a2-bd7f-42fe-a37b-4ffba74e446c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-21 00:00:00	5000.00	0.00	0.00	5000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:16.402171	2025-12-31 06:14:49.165	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ddb79639-b556-48c6-8501-aa39db9c6efd	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-21 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:17.237214	2025-12-31 04:39:17.237214	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
746263cd-005d-440e-8116-2d2bd68ae96a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-21 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:17.241727	2025-12-31 04:39:17.241727	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
66a1302d-a390-4c45-bc9f-13a7cc0e6188	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-21 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:17.24664	2025-12-31 04:39:17.24664	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d0bbcac6-e12f-4b9c-8ae2-260c399766ff	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-22 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:40.841315	2025-12-31 04:39:40.841315	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
6a347b43-745f-43ec-a4d7-42d20781d4af	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-22 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:40.851058	2025-12-31 04:39:40.851058	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f863b6b1-91d5-4da7-9917-ba1d2f200741	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-22 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:40.856018	2025-12-31 04:39:40.856018	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f730b72f-f341-450b-8c8b-0a11c4a77da7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-23 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:41.061637	2025-12-31 04:39:41.061637	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
85cad7c6-619f-4010-9f8d-fbae41a10ac6	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-23 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:41.067452	2025-12-31 04:39:41.067452	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
84587be1-c776-4d33-8445-72069a58f308	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-23 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:41.072283	2025-12-31 04:39:41.072283	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ac189ab5-1899-4deb-94d8-2678026e1a00	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-24 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:45.1041	2025-12-31 04:39:45.1041	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
cbbcd454-ea0a-4c20-ab5e-43415cfaa7d6	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-24 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:45.110104	2025-12-31 04:39:45.110104	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
39e5cfd8-adef-448e-9887-4a53047aadf7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-24 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:45.11476	2025-12-31 04:39:45.11476	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
be0452a4-e588-4801-b7ab-104b982cec92	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-25 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:48.598416	2025-12-31 04:39:48.598416	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f50dee68-61e8-46ad-8beb-a2611b5bdeed	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-25 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:48.604691	2025-12-31 04:39:48.604691	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7849a1e9-343e-41c3-ac6f-d17fdb1133e2	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-25 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:48.611534	2025-12-31 04:39:48.611534	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d421b94c-56e3-4c99-b8f1-34e57c112b4a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-26 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:39:55.032492	2025-12-31 04:39:55.032492	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
835f77d7-2192-4cf6-bb3f-73fe1db32092	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-27 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:41:23.219238	2025-12-31 04:41:23.219238	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a9d79961-d891-46df-b115-e167991741ae	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-27 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:41:23.224453	2025-12-31 04:41:23.224453	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
e34858c2-49a6-4b5d-8d82-4c34595643ce	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-31 00:00:00	2650.00	200.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:12:16.456367	2025-12-31 19:46:35.487	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2a62d178-7254-45c3-aeb3-b614b47ff87c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-03 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:49.967322	2025-12-31 05:17:09.746	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
8f76ed7c-791e-4126-ac01-946658e629e0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-03 00:00:00	2850.00	0.00	200.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:16:49.972078	2025-12-31 05:17:24.42	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a6e6a77e-e47c-4400-9240-ff3f65536529	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-21 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:16.381385	2025-12-31 06:14:49.157	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
464f5442-14ad-42c3-96c2-5077a317d5aa	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-02 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:47.81966	2025-12-31 05:08:47.81966	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0d48efa7-37aa-4687-9cbb-7ce2860f68b7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-02 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:47.82458	2025-12-31 05:08:47.82458	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
897d3761-c6ac-4e58-91c6-f78d79a183ab	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-02 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:47.833371	2025-12-31 05:08:47.833371	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
650e5433-11fe-4f01-8495-9d4a2a70bc4f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-03 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:53.967095	2025-12-31 05:08:53.967095	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
6d4cab15-ff75-4715-bc8a-4db49a66fff7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-03 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:53.971723	2025-12-31 05:08:53.971723	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d8cec224-c47b-4ad9-afb0-bc6ffbb802a2	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-03 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:53.975407	2025-12-31 05:08:53.975407	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f50e4c42-599a-4d2a-ae11-094f2b6e94d1	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-04 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:59.232158	2025-12-31 05:08:59.232158	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
47c68e9e-2745-484c-be62-363c246fcca8	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-04 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:59.23749	2025-12-31 05:08:59.23749	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f2ecd999-f06e-484b-ac27-034d61fc8677	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-04 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:59.24595	2025-12-31 05:08:59.24595	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
bdb7bec7-9935-441a-83dc-5e875435c518	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-02 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:08:40.497388	2025-12-31 05:10:08.251	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
be9c0f83-1b2d-4a09-878e-61ddcf3677e6	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-03 00:00:00	100.00	0.00	0.00	100.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:16:55.030895	2025-12-31 05:22:08.737	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3bd08b4a-83a2-41d7-9cb7-6a209b99f776	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-03 00:00:00	100.00	0.00	0.00	100.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:16:55.035532	2025-12-31 05:22:08.741	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7cdefcec-35b8-49b4-add0-1ebbe54914e7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-02 00:00:00	0.00	150.00	0.00	150.00	100.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:10:40.033493	2025-12-31 05:23:12.927	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a3f79945-b8a4-4433-8e2f-1e0bec92ee66	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-04 00:00:00	150.00	0.00	0.00	150.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:09:30.949704	2025-12-31 05:16:58.268	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4a061bf7-9d1d-4dc7-8d6c-7b19cdae53f3	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-04 00:00:00	150.00	0.00	0.00	150.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:09:30.959774	2025-12-31 05:16:58.273	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d2aa7070-2efb-4a3c-8c92-8c4fc6cf6ce5	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-04 00:00:00	150.00	0.00	0.00	150.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:09:30.969853	2025-12-31 05:16:58.285	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b60426b4-bef2-46f1-a255-c8c8249379d9	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-08 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:17:17.866827	2025-12-31 06:10:41.67	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c0687b00-8ffb-4569-90d5-f3d0bf0e8ca5	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-02 00:00:00	0.00	150.00	0.00	150.00	100.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:10:40.050297	2025-12-31 05:23:12.931	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
8c032793-3e5e-42f2-857b-f52dcc2cab0b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-11 00:00:00	800.00	0.00	0.00	800.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:04.221171	2025-12-31 06:13:51.799	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
77c84711-cae8-486a-a6cb-de9dae55c8d0	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-11 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:04.217747	2025-12-31 06:13:51.803	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
577c5895-01b1-4710-9c4c-2be52d2a6bbb	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-03 00:00:00	150.00	200.00	0.00	350.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:16:55.024417	2025-12-31 05:30:23.012	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
43810c73-8579-41c7-8625-4b135301747d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-02 00:00:00	0.00	150.00	0.00	150.00	130.00	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 05:10:32.590265	2025-12-31 05:33:04.979	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
23e9d4bc-efa8-4ef4-aae9-f8ad45a54d90	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-11 00:00:00	2850.00	0.00	0.00	2850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:04.213721	2025-12-31 06:13:52.237	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3e3d21f5-adb9-48f7-a98e-d5b15804d89a	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-11 00:00:00	21000.00	0.00	0.00	21000.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:04.228683	2025-12-31 06:13:52.25	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
04952096-5b0e-461e-9471-75398ede937f	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-11 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:04.204134	2025-12-31 06:13:52.253	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0e12f8f0-dca2-44c3-b0a7-6c51d5f82b39	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-16 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:35.504584	2025-12-31 06:14:17.973	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
750e3c30-b203-4aaa-9caf-8d31466e0f1e	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-23 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:28.12743	2025-12-31 06:14:51.192	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
6265f55f-d040-4a01-aae1-40f2f202e5ce	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-13 00:00:00	2650.00	3000.00	0.00	5650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:18:17.06831	2025-12-31 06:16:09.144	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f0008dda-b80d-45c5-ba32-f2c8a16693b1	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-20 00:00:00	150.00	0.00	0.00	150.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 06:14:38.693418	2025-12-31 06:14:38.693418	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
70c42ac5-bb89-4350-962b-4ae446182c95	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	d3a42547-ff64-4772-923c-4a8a112f6be9	2025-12-20 00:00:00	150.00	0.00	0.00	150.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 06:14:38.698302	2025-12-31 06:14:38.698302	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
fdd7b60f-3d12-42a9-8273-4744ed8b064d	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	c47d93b1-4801-445b-a77e-8362ebb25442	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-20 00:00:00	150.00	0.00	0.00	150.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 06:14:38.705074	2025-12-31 06:14:38.705074	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
812c9794-f26c-4bd5-b565-7667800344a7	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	2f64a260-d98d-40cc-bd44-346f94737415	2025-12-21 00:00:00	2650.00	0.00	0.00	2650.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:19:16.391502	2025-12-31 06:14:49.108	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
898f6e45-2d1c-47a5-a1e3-fe6d20299e66	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-27 00:00:00	11850.00	0.00	0.00	11850.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-30 18:20:09.279513	2025-12-31 06:14:54.138	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1a2a07c3-a8ff-4846-97b0-20dbb1cc00ed	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	0685f443-471a-4a34-927e-f5e41fbeb2d3	2025-12-31 00:00:00	11850.00	2.00	2.00	11852.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:12:16.438022	2025-12-31 19:46:35.489	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ff6ed808-cf70-4d73-87db-2c1c7e1be66c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	29070060-0461-41bc-afaa-d58281cef2bb	2025-12-31 00:00:00	1490.00	0.00	0.00	1490.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:12:16.470498	2025-12-31 19:46:35.492	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
f61293c7-d59a-47b6-a8d8-6edd0df0fea2	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2025-12-31 00:00:00	5003.00	0.00	0.00	5003.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:12:16.48148	2025-12-31 19:46:35.494	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9712d932-f98f-401f-84f4-8d253410f3ca	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2025-12-31 00:00:00	21800.00	400.00	400.00	21800.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-31 04:12:16.48891	2025-12-31 19:46:35.494	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
fa1f2de2-0c5e-4bb8-b168-d713b116a493	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2026-01-01 00:00:00	697.00	0.00	0.00	697.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:10:54.158456	2026-01-01 01:10:54.158456	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
de8efc0a-cd89-479b-9196-de020b0d1729	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2026-01-01 00:00:00	10.00	0.00	0.00	10.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:10:54.165773	2026-01-01 01:10:54.165773	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b81d9ebb-9a07-4d2c-a672-ec1306caafd2	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2026-01-01 00:00:00	850.00	0.00	0.00	850.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:10:54.171773	2026-01-01 01:10:54.171773	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
20550007-cd56-4425-b833-3ff863603f59	fb428d91-bacb-44ed-b4cd-310c87c5a8de	b30e98ff-9e99-4f22-b814-cd976d2c9c71	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2026-01-01 00:00:00	697.00	0.00	0.00	697.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:23:13.552558	2026-01-01 01:23:13.552558	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
75506763-5dd9-462c-9610-05d18d8017ae	fb428d91-bacb-44ed-b4cd-310c87c5a8de	b30e98ff-9e99-4f22-b814-cd976d2c9c71	29070060-0461-41bc-afaa-d58281cef2bb	2026-01-01 00:00:00	10.00	0.00	0.00	10.00	\N	0.00	400.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:23:13.557895	2026-01-01 01:23:13.557895	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b6301d13-4ccb-49cc-ac00-1f1493064f5f	fb428d91-bacb-44ed-b4cd-310c87c5a8de	b30e98ff-9e99-4f22-b814-cd976d2c9c71	3315d410-2302-4ff8-8a38-6af5f1bee4ee	2026-01-01 00:00:00	850.00	0.00	0.00	850.00	\N	0.00	600.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:23:13.563005	2026-01-01 01:23:13.563005	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b082a2d0-6a17-402c-b923-f8732e14bc83	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2026-01-01 00:00:00	119.00	0.00	0.00	119.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:23:24.95163	2026-01-01 01:23:24.95163	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
33a1db80-0c9c-4fed-964f-d8fe219e332c	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	43d27fe4-d8e1-4319-9f6b-7657ce33be4a	e55abe0b-52ac-487b-9a47-3a83ee61a95d	2026-01-01 00:00:00	0.00	2000.00	0.00	2000.00	\N	\N	600.00	\N	2026-01-01 05:21:53.286647	2026-01-01 05:21:53.286647	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
8efbdb92-d163-419c-96d4-d35e4e137117	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	d24028d5-7172-4fa4-a16a-e96a21e92c62	2026-01-01 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	1000.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:23:24.957399	2026-01-01 06:29:56.412	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
fc3832ff-1c31-4a11-a53e-0df550a9ef91	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	4f95bc96-08b8-4aad-9f1a-b88a0b211f33	2026-01-01 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	5ed0ccee-d55a-4700-b092-efa7e84a1907	2026-01-01 01:23:24.963413	2026-01-01 06:29:56.42	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
08830864-f963-417e-b54d-3d27ec4a563d	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	1f50d65e-4c16-4e37-93de-a6cdf0b73cf7	2026-01-02 00:00:00	119.00	0.00	0.00	119.00	\N	0.00	1000.00	08cae6ca-1bda-42e0-8cee-bdb28d071529	2026-01-02 22:15:09.070319	2026-01-02 22:15:09.070319	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b16f3a39-6212-429b-ac4a-43033bf7dc41	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	d24028d5-7172-4fa4-a16a-e96a21e92c62	2026-01-02 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	1000.00	08cae6ca-1bda-42e0-8cee-bdb28d071529	2026-01-02 22:15:09.140002	2026-01-02 22:15:09.140002	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c63aac5f-8e30-454d-b9c9-a92dbb6f9e89	fb428d91-bacb-44ed-b4cd-310c87c5a8de	2ce2d797-64c0-48a4-9e3b-03fd62786195	4f95bc96-08b8-4aad-9f1a-b88a0b211f33	2026-01-02 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	08cae6ca-1bda-42e0-8cee-bdb28d071529	2026-01-02 22:15:09.205883	2026-01-02 22:15:09.205883	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
13f0bf9a-9473-44b6-b5b5-903c6b10fe22	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2025-12-15 00:00:00	0.00	1200.00	0.00	1200.00	\N	0.00	0.00	\N	2026-01-05 03:50:15.88745	2026-01-05 03:50:16.174	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
3688b41a-88b2-4ecd-8802-efc423b85102	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2025-12-25 00:00:00	1200.00	500.00	0.00	1700.00	\N	0.00	0.00	\N	2026-01-05 03:49:02.080628	2026-01-05 03:50:17.843	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
fa9f2ea1-51fd-4466-8b99-dc21561ad271	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-01 00:00:00	0.00	1000.00	0.00	1000.00	\N	0.00	0.00	\N	2026-01-07 07:10:52.528803	2026-01-07 07:10:52.719	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9cbdd6c6-a9ad-4e34-8d60-f24df4871fd6	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	3d9cba8b-22ba-4785-9afc-e2e6842eee5a	2026-01-03 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:17:03.387552	2026-01-07 07:17:03.387552	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2eea00c7-5dc9-43f5-b64c-404fc7fd794e	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	3d9cba8b-22ba-4785-9afc-e2e6842eee5a	2026-01-02 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 04:53:30.402145	2026-01-05 04:53:30.402145	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0516b358-8b85-4a08-8d8e-d69cc27f8278	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-01 00:00:00	1700.00	2000.00	200.00	3500.00	\N	0.00	0.00	\N	2026-01-05 03:48:45.544582	2026-01-07 10:47:38.101	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
213e668d-37ee-4f1e-95d8-b29728caff79	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	3d9cba8b-22ba-4785-9afc-e2e6842eee5a	2026-01-06 00:00:00	20.00	0.00	0.00	20.00	\N	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 06:41:02.915207	2026-01-07 06:41:02.915207	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
69049ecc-466c-4dd8-b5b7-aa63c6eff254	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	3d9cba8b-22ba-4785-9afc-e2e6842eee5a	2026-01-05 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 03:50:31.399544	2026-01-07 03:50:31.399544	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0e156e6a-2ad4-4df4-ad88-c1283d18eb15	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	3d9cba8b-22ba-4785-9afc-e2e6842eee5a	2026-01-05 00:00:00	20.00	0.00	0.00	20.00	20.00	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 17:14:44.926646	2026-01-05 17:20:15.211	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
60d55798-ceb5-4bbb-aaa8-a952a931c2f2	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-05 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 03:50:31.402607	2026-01-07 03:50:31.402607	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
037ff60a-fafa-4a6d-b47b-503d63c749ee	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	3d9cba8b-22ba-4785-9afc-e2e6842eee5a	2026-01-04 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 03:51:05.336911	2026-01-07 03:51:05.336911	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
11de77f6-5ae4-4885-a6d9-b7ed0ddd6829	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-04 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 03:51:05.338431	2026-01-07 03:51:05.338431	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9ba72ad2-db96-4b77-9275-bc67c42bc1de	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-02 00:00:00	3500.00	0.00	0.00	3500.00	\N	0.00	0.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-05 04:53:30.19843	2026-01-07 10:47:38.224	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4ef37f17-22d6-4efd-a2c6-19c839e49de2	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-06 00:00:00	200.00	300.00	0.00	460.00	450.00	-10.00	0.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 06:41:03.190236	2026-01-10 00:33:38.992	0.00	0.00	10.00	0.00	20.00	30.00	0.00	0.00	0.00
335de359-28bd-45ee-b131-453065937687	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-03 00:00:00	0.00	300.00	0.00	300.00	300.00	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-07 07:17:03.129367	2026-01-07 07:34:48.980304	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
35913ba2-3033-4a8a-ac16-7dddbb7289f2	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-03 00:00:00	1000.00	0.00	300.00	700.00	\N	0.00	500.00	\N	2026-01-07 07:39:24.826507	2026-01-07 07:39:24.826507	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
01791fca-c93f-4126-8358-34c903deb0e3	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-01 00:00:00	0.00	200.00	0.00	200.00	\N	0.00	500.00	\N	2026-01-07 07:39:38.149728	2026-01-07 07:39:38.149728	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
84c70661-f35b-4802-a254-05be90bb4de7	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-04 00:00:00	700.00	0.00	0.00	700.00	\N	0.00	0.00	\N	2026-01-07 07:39:29.046303	2026-01-07 07:45:25.112	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
e7db07af-d897-415b-b5ae-b4c637f35fa5	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-04 00:00:00	300.00	0.00	0.00	300.00	\N	0.00	0.00	\N	2026-01-07 07:39:33.107025	2026-01-07 07:45:25.592	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
6e4fb730-0c87-4ca3-b9d2-00d491e07409	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-07 00:00:00	900.00	1000.00	800.00	1060.00	\N	0.00	0.00	\N	2026-01-07 14:57:37.994214	2026-01-09 23:47:04.547	0.00	0.00	0.00	0.00	0.00	60.00	0.00	0.00	20.00
7c19ab10-d418-479b-bce9-89f0ce09c3db	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-05 00:00:00	300.00	250.00	0.00	550.00	500.00	-50.00	0.00	\N	2026-01-07 07:56:34.389174	2026-01-08 20:35:30.602	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
d2314ebf-bc4c-4d4a-981b-37187e29c0e5	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-03 00:00:00	3500.00	0.00	0.00	3500.00	\N	0.00	0.00	\N	2026-01-07 10:47:38.356666	2026-01-07 10:47:38.356666	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
28b9e384-5bb6-4783-b407-fece493a2420	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-04 00:00:00	3500.00	0.00	0.00	3500.00	\N	0.00	0.00	\N	2026-01-07 10:47:38.478214	2026-01-07 10:47:38.478214	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
b0498739-7d19-4193-9144-e1d2e8c27dde	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-05 00:00:00	3500.00	0.00	0.00	3500.00	\N	0.00	0.00	\N	2026-01-07 10:47:38.599619	2026-01-07 10:47:38.599619	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a27c90fc-070b-4d9e-a34c-c0c9ce030aa5	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-05 00:00:00	700.00	0.00	250.00	450.00	\N	0.00	0.00	\N	2026-01-07 07:56:33.93846	2026-01-07 08:00:09.69	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
c7a2bd83-d466-424b-97f6-6c4caab717e0	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-06 00:00:00	450.00	0.00	0.00	450.00	\N	0.00	0.00	\N	2026-01-07 07:56:34.0788	2026-01-07 08:00:09.819	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
698c2b88-35fe-4014-be63-5323742d5035	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-06 00:00:00	550.00	0.00	0.00	550.00	500.00	-50.00	0.00	\N	2026-01-07 07:56:34.526139	2026-01-08 20:38:44.925	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
580ca484-bd28-45c4-ab43-a06d96859266	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-07 00:00:00	550.00	400.00	0.00	939.00	900.00	-39.00	0.00	\N	2026-01-07 07:56:34.710625	2026-01-08 21:04:44.873	0.00	5.00	0.00	6.00	0.00	0.00	0.00	0.00	0.00
fd4157b2-0e54-4ab3-b276-ffb32d18e2a4	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-07 00:00:00	450.00	100.00	700.00	250.00	\N	0.00	500.00	\N	2026-01-07 07:56:34.20981	2026-01-09 10:52:07.226	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	31.00
7dcf8748-12fb-486a-982c-dec835bd8636	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	2329f86b-aabd-4aac-b4f2-8e572f51588b	2026-01-07 00:00:00	0.00	1000.00	0.00	1000.00	950.00	950.00	0.00	\N	2026-01-07 15:07:38.078083	2026-01-08 21:01:24.712	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0d387aba-04de-4c63-8d14-6643c3137c67	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-07 00:00:00	0.00	300.00	0.00	280.00	270.00	-10.00	0.00	\N	2026-01-07 08:02:21.321474	2026-01-08 21:24:27.596	0.00	26.00	6.00	0.00	0.00	0.00	0.00	0.00	0.00
5e229e06-7daa-4158-95eb-462dd0444bc4	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	2329f86b-aabd-4aac-b4f2-8e572f51588b	2026-01-07 00:00:00	0.00	250.00	0.00	250.00	\N	0.00	0.00	\N	2026-01-07 15:07:52.494387	2026-01-07 15:12:12.04	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5b6d481f-825f-4bbc-8e54-40e51fb96031	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2329f86b-aabd-4aac-b4f2-8e572f51588b	2026-01-08 00:00:00	-250.00	0.00	0.00	-250.00	\N	0.00	0.00	\N	2026-01-08 01:51:47.03705	2026-01-08 01:51:47.03705	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
88c4e50f-9c86-44de-b856-d18f167a69e3	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-07 00:00:00	400.00	400.00	0.00	770.00	700.00	-70.00	0.00	\N	2026-01-07 15:09:22.545581	2026-01-10 00:38:38.71	0.00	0.00	20.00	50.00	0.00	0.00	0.00	0.00	0.00
2a1d8a5e-36e4-4ea4-ace9-5f8b1da3ddc1	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-07 00:00:00	0.00	200.00	0.00	180.00	170.00	-10.00	0.00	\N	2026-01-07 15:06:59.476509	2026-01-08 20:57:31.473	0.00	10.00	0.00	10.00	0.00	0.00	0.00	0.00	0.00
7585fa33-2c59-4eff-80ba-f3c8276c30d5	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-07 00:00:00	0.00	300.00	0.00	310.00	\N	0.00	0.00	\N	2026-01-07 15:07:12.664526	2026-01-07 15:21:06.831	0.00	0.00	10.00	0.00	0.00	0.00	0.00	0.00	0.00
9e0d7013-904c-4ad5-8be8-6929e7484d48	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2329f86b-aabd-4aac-b4f2-8e572f51588b	2026-01-07 00:00:00	0.00	1000.00	1250.00	-250.00	\N	0.00	0.00	\N	2026-01-07 14:57:30.471422	2026-01-08 01:51:46.878	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
27282d1f-8444-4546-b88e-5d660dcbd72f	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-08 00:00:00	310.00	0.00	0.00	250.00	\N	0.00	0.00	\N	2026-01-08 02:03:52.065769	2026-01-08 02:22:58.533	0.00	50.00	0.00	10.00	0.00	0.00	0.00	0.00	0.00
65f7e1e4-c97a-4a6d-b675-dbfe62a462e5	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-07 00:00:00	0.00	1000.00	500.00	510.00	\N	0.00	0.00	\N	2026-01-07 14:57:18.908986	2026-01-08 20:56:23.919	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	10.00
cf50a6d0-4897-4f66-b654-83944f01eb43	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-06 00:00:00	3500.00	0.00	1300.00	2150.00	\N	0.00	0.00	\N	2026-01-07 10:47:38.720075	2026-01-10 00:32:54.449	0.00	0.00	0.00	0.00	0.00	50.00	0.00	0.00	0.00
f6bba5b4-cfbd-4fc1-a0b0-a57c0c52c3d0	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-08 00:00:00	510.00	0.00	20.00	535.00	\N	0.00	0.00	\N	2026-01-08 02:17:27.522864	2026-01-08 20:56:24.095	0.00	0.00	0.00	0.00	5.00	0.00	0.00	0.00	50.00
13f1965e-efce-4265-8fc3-c6a21f5f14ba	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-08 00:00:00	990.00	250.00	0.00	1210.00	\N	0.00	0.00	\N	2026-01-09 10:41:07.703313	2026-01-10 00:33:38.266	0.00	30.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
338e6fb5-61ad-4b1e-9e44-51568f27b65c	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-09 00:00:00	1630.00	0.00	0.00	1630.00	\N	0.00	0.00	\N	2026-01-09 10:39:42.47161	2026-01-10 00:32:55.279	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
44954e31-8bc0-4304-9c57-e1478467f91e	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-08 00:00:00	280.00	1.00	0.00	280.00	\N	0.00	0.00	\N	2026-01-08 21:09:10.529259	2026-01-08 21:24:27.899	0.00	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
946d906b-9ee0-40fa-a2d4-fcc0b1738144	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-08 00:00:00	-219.00	2000.00	1.00	1781.00	\N	0.00	0.00	\N	2026-01-08 20:10:58.719964	2026-01-08 21:24:28.698	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	1.00
fb8d156c-e946-45e5-b688-2465d550c109	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	f3b1dfbb-98df-4a52-ab1e-617c8e915a4c	2026-01-08 00:00:00	180.00	20.00	0.00	210.00	450.00	240.00	0.00	\N	2026-01-08 02:03:51.847964	2026-01-08 20:57:31.679	0.00	0.00	10.00	0.00	0.00	0.00	0.00	0.00	0.00
ef226cb3-5087-43a0-909e-6b55a45811c9	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	2329f86b-aabd-4aac-b4f2-8e572f51588b	2026-01-08 00:00:00	1000.00	0.00	0.00	1000.00	\N	0.00	0.00	\N	2026-01-08 21:00:12.779023	2026-01-08 21:01:24.906	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7f6bf828-ee1a-4358-95c7-632044f4e059	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	a8606352-f7d1-40e6-8500-8ffcbcc12924	2026-01-08 00:00:00	939.00	0.00	0.00	939.00	\N	0.00	0.00	\N	2026-01-08 20:35:30.55477	2026-01-08 21:04:45.14	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a724e22d-7909-4760-b02d-dd76bf665e1b	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-08 00:00:00	1060.00	0.00	100.00	941.00	\N	0.00	0.00	\N	2026-01-09 09:44:10.002999	2026-01-10 09:52:57.791	0.00	0.00	0.00	0.00	15.00	15.00	0.00	0.00	11.00
a16f5ffe-5bf4-4b02-8da3-68e89bfc00c0	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-08 00:00:00	760.00	0.00	0.00	710.00	\N	0.00	0.00	\N	2026-01-08 20:25:19.525657	2026-01-10 00:33:39.525	0.00	50.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a7daedbb-0d97-421b-bcdc-25923f1ddec3	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	3d9cba8b-22ba-4785-9afc-e2e6842eee5a	2026-01-07 00:00:00	0.00	0.00	0.00	0.00	\N	0.00	500.00	6419147a-44c1-4f3c-bbcb-51a46a91d1be	2026-01-09 10:51:50.400975	2026-01-09 10:52:07.196	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
012db639-70fa-4248-9a27-b70599d026e9	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-09 00:00:00	370.00	0.00	0.00	370.00	\N	0.00	0.00	\N	2026-01-09 09:44:10.551492	2026-01-10 09:48:28.24	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
77e7fa0e-c412-4071-8ea9-5f2647b0a4e6	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-09 00:00:00	941.00	0.00	0.00	941.00	\N	0.00	0.00	\N	2026-01-09 09:44:10.128908	2026-01-10 09:52:58.004	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
10da38ef-bc0e-46ab-bdd3-2dac8bc5edc6	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-09 00:00:00	755.00	0.00	0.00	755.00	\N	0.00	0.00	\N	2026-01-09 09:45:52.858856	2026-01-10 10:03:30.329	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7a094745-96f0-4482-9546-629296cec40a	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-09 00:00:00	710.00	0.00	0.00	710.00	\N	0.00	0.00	\N	2026-01-09 10:39:43.093214	2026-01-10 00:33:39.725	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
e4fa62f3-4e11-40bf-a3b0-77cad90a4217	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-08 00:00:00	700.00	100.00	0.00	796.00	755.00	-46.00	0.00	\N	2026-01-09 09:45:52.726226	2026-01-10 10:03:30.035	0.00	1.00	0.00	0.00	2.00	2.00	1.00	0.00	0.00
60e9089e-10ec-4819-9ba6-57f652386314	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-07 00:00:00	500.00	0.00	0.00	500.00	\N	0.00	0.00	\N	2026-01-09 19:57:11.442843	2026-01-09 19:57:53.842	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
954a65a1-dd95-4c98-929d-ca68d0793ca6	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-07 00:00:00	0.00	400.00	0.00	400.00	380.00	-20.00	0.00	\N	2026-01-09 09:44:10.296522	2026-01-09 09:54:03.911	0.00	20.00	50.00	20.00	5.00	5.00	0.00	0.00	0.00
e0619292-f721-4d1d-b772-871f9137083c	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-07 00:00:00	2150.00	0.00	300.00	1850.00	\N	0.00	0.00	\N	2026-01-07 10:47:38.840357	2026-01-10 00:32:54.646	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
243c3ec3-11d4-45bc-a430-1c8bfd8a8d12	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-08 00:00:00	1850.00	0.00	250.00	1630.00	\N	0.00	0.00	\N	2026-01-08 20:25:19.077466	2026-01-10 00:32:55.078	0.00	0.00	0.00	0.00	20.00	30.00	0.00	0.00	80.00
b6242af6-1a13-46c4-9ac7-f7ba736fc162	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-07 00:00:00	460.00	300.00	0.00	760.00	\N	0.00	0.00	\N	2026-01-08 20:25:19.334295	2026-01-10 00:33:39.193	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
82969779-9933-4553-87db-496929cd9c85	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-08 00:00:00	500.00	0.00	0.00	500.00	\N	0.00	0.00	\N	2026-01-09 19:57:11.576302	2026-01-09 19:57:53.966	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
7ee53a1e-b366-4119-b4c1-0772af44e850	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-06 00:00:00	0.00	1000.00	500.00	500.00	\N	0.00	0.00	\N	2026-01-09 19:57:11.105946	2026-01-09 19:57:53.709	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2074dc4f-35bf-46ff-b43d-de35e2b8a2c7	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-09 00:00:00	500.00	0.00	0.00	500.00	\N	0.00	0.00	\N	2026-01-09 19:54:35.920583	2026-01-09 19:57:54.09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2d52500e-8a26-4ae0-bc90-aaf8cefdb01e	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-09 00:00:00	450.00	0.00	0.00	450.00	\N	0.00	0.00	\N	2026-01-09 19:57:54.643402	2026-01-09 19:58:53.613	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
48004597-0207-407f-b6b7-8f28660f3f13	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-08 00:00:00	380.00	0.00	0.00	370.00	350.00	-20.00	0.00	\N	2026-01-09 09:44:10.422095	2026-01-10 09:48:28.031	0.00	10.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
73a90a43-8c4e-4efc-ac63-f2294e7b7a14	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-07 00:00:00	450.00	0.00	0.00	450.00	\N	0.00	0.00	\N	2026-01-09 19:57:54.399571	2026-01-09 19:58:53.37	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
44ec5dcf-ce76-4752-8aa8-b9bcfbd0062d	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-08 00:00:00	450.00	0.00	0.00	450.00	\N	0.00	0.00	\N	2026-01-09 19:57:54.520714	2026-01-09 19:58:53.491	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1c21bda1-c3e7-4ec1-942e-2892a2f92a25	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-09 00:00:00	1210.00	0.00	0.00	1210.00	\N	0.00	0.00	\N	2026-01-09 10:41:07.888877	2026-01-10 00:33:38.461	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
db0f9ffb-ae75-49de-89a0-a461b58f7f84	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	a09560f4-54bc-4640-9efa-295f4b665032	2026-01-06 00:00:00	0.00	500.00	0.00	500.00	450.00	-50.00	0.00	\N	2026-01-09 19:57:54.275645	2026-01-09 19:58:53.202	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9e7e50fb-8c71-45eb-b050-e087cdd06b96	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-06 00:00:00	0.00	1300.00	400.00	900.00	\N	0.00	0.00	\N	2026-01-09 23:17:21.551636	2026-01-09 23:18:50.715	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
34fb992a-ec8a-44d3-b775-3590e9ac449e	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-06 00:00:00	0.00	400.00	0.00	400.00	\N	0.00	0.00	\N	2026-01-09 23:18:51.307642	2026-01-09 23:18:51.307642	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
6a7ae331-7077-4b9c-80e1-bec54a489453	0d947773-28ee-4e02-b5b6-40455566817d	1e134a24-908d-4535-8443-28fa83f30a6a	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-10 00:00:00	370.00	0.00	0.00	370.00	\N	0.00	0.00	\N	2026-01-10 09:48:28.470636	2026-01-10 09:48:28.470636	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
40b704f2-36d2-44ee-b077-1ed50d3af63e	d40fe583-f75d-4714-b3b5-9d83a9a332a9	f3129970-a2fc-4d98-9f25-70598db1a740	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-10 00:00:00	1630.00	0.00	0.00	1630.00	\N	0.00	0.00	\N	2026-01-10 00:15:10.215052	2026-01-10 00:32:55.476	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
bf63003b-a77a-41ad-a6de-c0cbc7e95376	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-06 00:00:00	0.00	1000.00	0.00	990.00	\N	0.00	0.00	\N	2026-01-10 00:32:55.781472	2026-01-10 00:33:37.803	0.00	0.00	0.00	10.00	0.00	0.00	0.00	0.00	0.00
c5fe67c4-12eb-43b1-8513-9029c764269a	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-07 00:00:00	990.00	0.00	0.00	990.00	\N	0.00	0.00	\N	2026-01-10 00:32:55.979599	2026-01-10 00:33:38.002	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
a1e1c286-5240-4411-9647-818c804520a8	d40fe583-f75d-4714-b3b5-9d83a9a332a9	c8a17169-727d-4c3f-b026-00059fdf32a5	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-10 00:00:00	1210.00	0.00	0.00	1210.00	\N	0.00	0.00	\N	2026-01-10 00:15:10.94928	2026-01-10 00:33:38.661	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
9d5eeea6-270f-4aaf-897f-f754974db515	d40fe583-f75d-4714-b3b5-9d83a9a332a9	4aecd215-ec9e-402d-bc48-1ebc6f79dfc3	097eadbb-cad3-4ef9-aab3-21ac8d02e143	2026-01-10 00:00:00	710.00	0.00	0.00	710.00	\N	0.00	0.00	\N	2026-01-10 00:25:20.919223	2026-01-10 00:33:39.926	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
0e94f68a-5280-4d80-9d79-0c15c8360490	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	f051da21-7909-458e-9c63-d176f6106a0a	2026-01-10 00:00:00	0.00	2000.00	0.00	2000.00	\N	0.00	0.00	\N	2026-01-10 01:16:55.744536	2026-01-10 01:16:55.96	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ef4c5a7f-00ad-40d8-94aa-7417d0b2180b	0d947773-28ee-4e02-b5b6-40455566817d	e885756b-2d5d-4844-91ed-eeff5e2b5ae3	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-10 00:00:00	941.00	0.00	0.00	941.00	\N	0.00	0.00	\N	2026-01-10 09:46:30.977044	2026-01-10 09:52:58.219	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
ae8e1798-528c-40f0-9086-4ebc28283877	0d947773-28ee-4e02-b5b6-40455566817d	0f33a311-9974-4c6d-bd95-8f3ebf172282	2a1eaab7-56a8-40d9-8fc3-d379beec67b2	2026-01-10 00:00:00	755.00	0.00	0.00	754.00	\N	0.00	0.00	\N	2026-01-10 00:38:38.679093	2026-01-10 10:03:30.547	0.00	0.00	0.00	0.00	0.00	0.00	-1.00	0.00	0.00
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subscription_plans (id, slug, display_name, description, is_active, sort_order, monthly_price, quarterly_price, yearly_price, currency, max_clients, max_srd_departments_per_client, max_main_store_per_client, max_seats, retention_days, can_view_reports, can_download_reports, can_print_reports, can_access_purchases_register_page, can_access_second_hit_page, can_download_second_hit_full_table, can_download_main_store_ledger_summary, can_use_beta_features, created_at, updated_at) FROM stdin;
0530cbfb-93c2-487e-9d01-06ead113d8ed	business	Business	Full-featured for established businesses	t	3	75000.00	202500.00	720000.00	NGN	5	12	1	12	365	t	t	t	t	t	t	t	f	2026-01-10 05:32:40.238215	2026-01-10 05:32:40.238215
a14ced71-e1d2-4b80-b72a-8696fe6609e6	enterprise	Enterprise	Custom solutions with dedicated support	t	4	150000.00	405000.00	1440000.00	NGN	10	999	1	999	9999	t	t	t	t	t	t	t	t	2026-01-10 05:32:40.238215	2026-01-10 05:32:40.238215
2654d29e-d5a8-4bd1-bf5a-14374f3da8be	growth	Growth	For growing businesses with more needs	t	2	35000.00	94500.00	336000.00	NGN	3	7	1	5	180	t	t	t	t	f	f	f	f	2026-01-10 05:32:40.238215	2026-01-10 05:57:56.438
0021adbe-a63b-48ef-bd9b-8be125d2e378	starter	Starter	Perfect for small businesses getting started	t	1	1000.00	40500.00	144000.00	NGN	1	4	1	2	90	t	t	f	f	f	f	f	f	2026-01-10 05:32:40.238215	2026-01-10 09:38:12.528
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subscriptions (id, plan_name, billing_period, slots_purchased, status, start_date, end_date, created_at, updated_at, organization_id, provider, next_billing_date, expires_at, notes, updated_by, max_clients_override, max_srd_departments_override, max_main_store_override, max_seats_override, retention_days_override, paystack_customer_code, paystack_subscription_code, paystack_plan_code, paystack_email_token, last_payment_date, last_payment_amount, last_payment_reference) FROM stdin;
91eba1d5-c7b4-4b6a-accc-ec45382ab2b0	starter	monthly	1	trial	2026-01-01 19:29:22.234	\N	2026-01-01 19:29:22.229646	2026-01-01 19:29:22.229646	597b39e0-c81b-4465-8b07-0f70ce9cb0a6	manual	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4a2982d1-6634-48da-ab7f-c7a2300e02a7	starter	monthly	1	trial	2026-01-01 21:26:05.293	\N	2026-01-01 21:26:05.273994	2026-01-01 21:26:05.273994	d18379c6-217e-4d60-8705-a5cae16986b0	manual	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
e97c643b-c6bc-4cbc-8f9a-5af033f09986	starter	monthly	1	trial	2026-01-01 21:27:06.02	\N	2026-01-01 21:27:06.014502	2026-01-01 21:27:06.014502	ee24b79f-7e0a-48bc-9642-d2d9603a36ab	manual	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
725c8604-fcf9-4a52-a59b-d54492af5e2d	starter	monthly	1	trial	2026-01-01 21:29:56.033	\N	2026-01-01 21:29:55.996511	2026-01-01 21:29:55.996511	9696e18f-d53b-45cf-adae-616376d18ad2	manual	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
539b3812-6cf4-47f3-82c0-5c7755f4b349	starter	monthly	1	trial	2026-01-01 22:10:25.391	\N	2026-01-01 22:10:25.384797	2026-01-01 22:10:25.384797	9f06a02a-93b2-4044-9f37-b174f537e82a	manual	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
08511ffc-3d88-459f-9024-a497957f91fd	starter	monthly	1	trial	2026-01-02 01:33:30.681	\N	2026-01-02 01:33:30.587688	2026-01-02 01:33:30.587688	62b4d151-7e74-4012-84fd-d44acedfb8d5	manual	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
3d09f425-afc0-4cf6-aac2-f5d53fddb12a	starter	monthly	1	trial	2026-01-05 04:20:46.122	\N	2026-01-05 04:20:46.065448	2026-01-05 04:20:46.065448	81586752-9ad1-4ba7-92e0-2021626f9412	manual	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
ed19e4ef-d25c-48f6-bb15-763d827aa247	enterprise	monthly	1	active	2026-01-03 03:56:22.24	\N	2026-01-03 03:56:22.143593	2026-01-08 04:13:11.943	d09a34a2-4e1d-4048-be05-faa10238aae7	manual	\N	\N		a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
f129ca8c-5574-4cf4-a19d-baaf720c036c	starter	monthly	1	active	2026-01-07 10:50:43.124	\N	2026-01-07 10:50:43.047446	2026-01-10 09:41:43.994	4144bb32-2cbb-46df-a2e7-ef96f9acebab	manual_free	\N	2026-01-11 00:00:00	Free access granted by platform admin	a32b98c5-cb4e-4c57-8637-f54baf9e74f6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.suppliers (id, client_id, name, contact_person, phone, email, address, status, created_at) FROM stdin;
ea1b27ba-f514-4963-8f6a-21c43afd4a60	fb428d91-bacb-44ed-b4cd-310c87c5a8de	John drink store	favour Esohan	09037162	\N	8 Herald Of Christ Close	active	2025-12-27 09:22:46.624589
3b37bf2b-9563-456a-950b-a2453c851f3a	fb428d91-bacb-44ed-b4cd-310c87c5a8de	Edmond Global resources Ltd	Unknown	\N	\N	\N	active	2025-12-28 04:45:35.234225
bd9a5a84-6231-4101-900a-f5fa11af393b	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	Samson Enterprise	Samuel Samson	09037162	\N	23	active	2025-12-29 22:26:46.294234
367823f0-2197-40bd-9bc9-1847d653f8b0	d40fe583-f75d-4714-b3b5-9d83a9a332a9	Edmond son ltd	Ighodaro 	09037162950	\N	8 Herald Of Christ Close	active	2026-01-05 15:40:10.189554
2de7ad8b-1394-4cc1-93a4-947f38c88c77	0d947773-28ee-4e02-b5b6-40455566817d	Edmond Global resources Ltd	Ighodaro Nosa Ogiemwanye	09037162950	openclax@gmail.com	8 Herald Of Christ Close	active	2026-01-07 14:52:06.101552
\.


--
-- Data for Name: surplus_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.surplus_history (id, surplus_id, action, previous_status, new_status, notes, created_by, created_at) FROM stdin;
31646940-5fc3-4169-bb5b-fa6203336c29	43c9b6ae-4b92-46e0-843f-9cb84dad0eac	created	\N	open	Initial surplus logged	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 23:53:31.092355
\.


--
-- Data for Name: surpluses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.surpluses (id, client_id, department_id, audit_date, surplus_amount, status, classification, comments, evidence_url, created_by, created_at, updated_at) FROM stdin;
43c9b6ae-4b92-46e0-843f-9cb84dad0eac	30dbc5bb-60c2-4a73-bcc1-f18b8ca7189c	f0dd0739-ff38-4819-b311-c6c9992bd79d	2025-12-30 00:00:00	1000.00	open	\N	tips	\N	5ed0ccee-d55a-4700-b092-efa7e84a1907	2025-12-29 23:53:31.076006	2025-12-29 23:53:31.076006
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.system_settings (id, key, value, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: user_client_access; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_client_access (id, user_id, client_id, status, assigned_by, assigned_at, updated_at, suspend_reason, notes) FROM stdin;
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_settings (id, user_id, theme, auto_save_enabled, auto_save_interval_seconds, variance_threshold_percent, updated_at, email_notifications_enabled, exception_alerts_enabled, variance_alerts_enabled, daily_digest_enabled) FROM stdin;
7d1c9447-c4f3-419c-8417-d4f5aea172d5	5ed0ccee-d55a-4700-b092-efa7e84a1907	light	t	60	5.00	2026-01-12 14:06:32.152	t	t	t	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, full_name, email, role, phone, created_at, status, must_change_password, password_reset_token, password_reset_expiry, login_attempts, locked_until, last_login_at, access_scope, updated_at, organization_id, organization_role, email_verified, verification_token, verification_expiry, is_locked, locked_reason) FROM stdin;
d4d4bbe7-b72b-4349-ba5b-ccdcad87dd4e	testuser5	$2b$12$McVHGfbz0Av7Rkqj5adZCOS4O7wKOKZd/i/WgtJvYWCwtvFywGEO2	Test User 5	test5@example.com	super_admin	\N	2026-01-01 21:29:55.996511	active	f	\N	\N	0	\N	\N	{"global": true}	2026-01-01 21:29:55.996511	9696e18f-d53b-45cf-adae-616376d18ad2	owner	f	a728ee522ef1798906bd985201ce1bb62fa8ee79c4b1c460e3e25511a43f8b2f	2026-01-02 21:29:55.995	f	\N
63ab12e8-e632-4c1a-919e-056eaf8cfe8a	auditor	$2b$10$cGxYxu7RfMV70jgIe6lvme8RPe.TWiVq.WeODlfVxBZKk8Z21lfHe	Demo Auditor	auditor@miemploya.com	auditor	+234 800 000 0000	2025-12-26 08:34:06.623351	active	f	\N	\N	0	\N	\N	\N	2025-12-26 08:34:06.623351	\N	member	f	\N	\N	f	\N
dbd700e5-b8d8-4ccf-8535-e67067f4804a	testuser2	$2b$12$2NezLPffDpTY5F7s57tJuuHAqUzzC3hvTMPREYMM7KDd0vGvlsYia	Test User	test2@example.com	super_admin	\N	2026-01-01 19:29:22.229646	active	f	\N	\N	0	\N	\N	{"global": true}	2026-01-01 19:29:22.229646	597b39e0-c81b-4465-8b07-0f70ce9cb0a6	owner	f	c3cba1ebd3acf901270f0bd6fb8fa27a2a8fe75b014cf887888a8d9f965efcd8	2026-01-02 19:29:22.228	f	\N
7e0fef88-1873-4099-bc02-ade3309d4817	testuser3	$2b$12$JcFjAfLNpn.VoeOIA7rjqeG.zKotkLt1/ti95gPkuRsw6Jziag5lO	Test User 3	test3@example.com	super_admin	\N	2026-01-01 21:26:05.273994	active	f	\N	\N	0	\N	\N	{"global": true}	2026-01-01 21:26:05.273994	d18379c6-217e-4d60-8705-a5cae16986b0	owner	f	053dd4744c9d6a6fcb2e538a9f8b80801a113f4a3324e7b5ffbb589fd3bb2f21	2026-01-02 21:26:05.272	f	\N
49650644-8e70-488e-8597-16cb4254d906	testuser4	$2b$12$OoJiH05O9LvV5hNH1zhTs.Ot4p24p./juJe8Ikl3Ep0tv8yfH6T2i	Test User 4	test4@example.com	super_admin	\N	2026-01-01 21:27:06.014502	active	f	\N	\N	0	\N	\N	{"global": true}	2026-01-01 21:27:06.014502	ee24b79f-7e0a-48bc-9642-d2d9603a36ab	owner	f	3d47b271edc774e6564b4c985a3acd2a956a7354f538d337047fadedeaf6bbc7	2026-01-02 21:27:06.013	f	\N
f39d9eec-1e73-4de3-8eb8-da6d7d2c2db4	john.doe	$2b$12$wRRFTDFJ1aXbZPI.81y38O3OpVW943xPF9NtkMH4gsUuPPXj33wfi	Victory	ighodaro.algadg@gmail.com	auditor	\N	2025-12-30 12:24:37.793846	active	f	\N	\N	2	\N	2026-01-01 22:13:34.98	{"global": false}	2026-01-07 12:37:00.53	\N	member	t	fdaa66db27af44db1ed2a6b3844a54e4b11f71cadd0f7ac9d8604cce659ccd24	2026-01-02 21:49:45.597	f	\N
5ed0ccee-d55a-4700-b092-efa7e84a1907	miemploya@gmail.com	$2b$12$QvRxAGTQxTrInk5ONpRfNegiuZClgPxiyqgJmcAhPdn0wc3BRmEEe	Ighodaro Nosa Ogiemwanye	miemploya@gmail.com	super_admin	\N	2025-12-26 07:40:10.550385	active	f	7fdff439433329ebaf531edfc833546f095c37ccdac8a6083e19de7a77eef6c7	2026-01-05 06:55:01.284	0	\N	2026-01-12 14:06:43.437	{"global": true}	2026-01-12 14:06:43.437	d09a34a2-4e1d-4048-be05-faa10238aae7	member	t	\N	\N	f	\N
08cae6ca-1bda-42e0-8cee-bdb28d071529	algadginternationalltd@gmail.com	$2b$12$2j4mve2Q2Jzgu8VFj2kDsO/tzGZWvqshaNZp1z94Eh0Ud1HMPLy.e	Ighodaro Nosa Ogiemwanye	algadginternationalltd@gmail.com	super_admin	\N	2026-01-02 01:33:30.587688	active	f	35917b181f4b053dd582bc0173ac422029db55332413ccc72eb8f96c35d9d5e3	2026-01-10 11:14:25.542	0	\N	2026-01-03 03:54:11.948	{"global": true}	2026-01-10 10:14:25.542	62b4d151-7e74-4012-84fd-d44acedfb8d5	owner	t	\N	\N	f	\N
27debef5-907c-463a-97e8-c70cd012dfd7	newtest123@gmail.com	$2b$12$1bUbdXswfwAHfiewmOzLcep466oyZkdnag507a6L08DZG1iqwEhSe	New Test User	newtest123@gmail.com	super_admin	\N	2026-01-01 22:10:25.384797	inactive	f	21c1be132d441937beeb07e3d7d1e5bb72d48f1351ef94c754eec048d0315212	2026-01-10 06:04:42.897	0	\N	\N	{"global": true}	2026-01-10 05:04:42.897	9f06a02a-93b2-4044-9f37-b174f537e82a	owner	f	63b923e652125e08bfdb1057bf2272ec6455d97b062cd046a741bba3e01d5f5f	2026-01-11 05:04:37.854	t	h
0ff460ab-5b96-4b2d-b85f-d04c54faf25f	demo_user	$2b$12$jR6CiAokA9t8OTllsmEfieHxKni7P0P6.bqKNqgxq.xo8Q4KQ.BAi	Demo User	demo@miauditops.com	super_admin	\N	2026-01-05 04:20:46.065448	inactive	f	\N	\N	0	\N	2026-01-05 05:53:07.049	{"global": true}	2026-01-10 06:18:31.944	81586752-9ad1-4ba7-92e0-2021626f9412	owner	t	\N	\N	t	sd
6419147a-44c1-4f3c-bbcb-51a46a91d1be	openclax@gmail.com	$2b$12$P9IvJ.llJg/jb/BKlOJQR.nMFiSc.ttnqUV6LQdOTIDvAAo5zD6v.	Ighodaro Nosa Ogiemwanye	openclax@gmail.com	super_admin	\N	2026-01-03 03:56:22.143593	active	f	\N	\N	0	\N	2026-01-12 14:00:27.069	{"global": true}	2026-01-12 14:00:27.069	d09a34a2-4e1d-4048-be05-faa10238aae7	owner	t	\N	\N	f	\N
a62196b8-c91c-465d-9f3d-35e82bb6d0d2	ighodaro.efeandassociates@gmail.com	$2b$12$sgUQxI4rTOyfKpuO/uhF0O9LJ7os0v9Nsr.oK6hjinJJIROKdFIw2	Ighodaro Nosa Ogiemwanye	ighodaro.efeandassociates@gmail.com	super_admin	\N	2026-01-07 10:50:43.047446	active	f	9058cedd8b5aaf50c9195f23bf4d1aa05e68c56011c148f8837ae77447df8fec	2026-01-10 06:03:57.118	0	\N	2026-01-10 09:36:13.19	{"global": true}	2026-01-10 09:36:13.19	4144bb32-2cbb-46df-a2e7-ef96f9acebab	owner	t	\N	\N	f	\N
\.


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE SET; Schema: _system; Owner: neondb_owner
--

SELECT pg_catalog.setval('_system.replit_database_migrations_v1_id_seq', 6, true);


--
-- Name: replit_database_migrations_v1 replit_database_migrations_v1_pkey; Type: CONSTRAINT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1
    ADD CONSTRAINT replit_database_migrations_v1_pkey PRIMARY KEY (id);


--
-- Name: admin_activity_logs admin_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_change_log audit_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_change_log
    ADD CONSTRAINT audit_change_log_pkey PRIMARY KEY (id);


--
-- Name: audit_contexts audit_contexts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_contexts
    ADD CONSTRAINT audit_contexts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_reissue_permissions audit_reissue_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_reissue_permissions
    ADD CONSTRAINT audit_reissue_permissions_pkey PRIMARY KEY (id);


--
-- Name: audits audits_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT audits_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: data_exports data_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: exception_activity exception_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exception_activity
    ADD CONSTRAINT exception_activity_pkey PRIMARY KEY (id);


--
-- Name: exception_comments exception_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exception_comments
    ADD CONSTRAINT exception_comments_pkey PRIMARY KEY (id);


--
-- Name: exceptions exceptions_case_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exceptions
    ADD CONSTRAINT exceptions_case_number_unique UNIQUE (case_number);


--
-- Name: exceptions exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exceptions
    ADD CONSTRAINT exceptions_pkey PRIMARY KEY (id);


--
-- Name: goods_received_notes goods_received_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_pkey PRIMARY KEY (id);


--
-- Name: inventory_department_categories inventory_department_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_department_categories
    ADD CONSTRAINT inventory_department_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_departments inventory_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_departments
    ADD CONSTRAINT inventory_departments_pkey PRIMARY KEY (id);


--
-- Name: item_serial_events item_serial_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.item_serial_events
    ADD CONSTRAINT item_serial_events_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization_settings organization_settings_organization_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_organization_id_unique UNIQUE (organization_id);


--
-- Name: organization_settings organization_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: payment_declarations payment_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_declarations
    ADD CONSTRAINT payment_declarations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: platform_admin_audit_log platform_admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_admin_audit_log
    ADD CONSTRAINT platform_admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: platform_admin_users platform_admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_admin_users
    ADD CONSTRAINT platform_admin_users_email_key UNIQUE (email);


--
-- Name: platform_admin_users platform_admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_admin_users
    ADD CONSTRAINT platform_admin_users_pkey PRIMARY KEY (id);


--
-- Name: purchase_item_events purchase_item_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_item_events
    ADD CONSTRAINT purchase_item_events_pkey PRIMARY KEY (id);


--
-- Name: purchase_lines purchase_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: receivable_history receivable_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receivable_history
    ADD CONSTRAINT receivable_history_pkey PRIMARY KEY (id);


--
-- Name: receivables receivables_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_pkey PRIMARY KEY (id);


--
-- Name: reconciliations reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_pkey PRIMARY KEY (id);


--
-- Name: sales_entries sales_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_entries
    ADD CONSTRAINT sales_entries_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: srd_ledger_daily srd_ledger_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_ledger_daily
    ADD CONSTRAINT srd_ledger_daily_pkey PRIMARY KEY (id);


--
-- Name: srd_stock_movements srd_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_stock_movements
    ADD CONSTRAINT srd_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: srd_transfers srd_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_transfers
    ADD CONSTRAINT srd_transfers_pkey PRIMARY KEY (id);


--
-- Name: stock_counts stock_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_pkey PRIMARY KEY (id);


--
-- Name: stock_movement_lines stock_movement_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_movement_lines
    ADD CONSTRAINT stock_movement_lines_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: store_issue_lines store_issue_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_issue_lines
    ADD CONSTRAINT store_issue_lines_pkey PRIMARY KEY (id);


--
-- Name: store_issues store_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_issues
    ADD CONSTRAINT store_issues_pkey PRIMARY KEY (id);


--
-- Name: store_names store_names_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_names
    ADD CONSTRAINT store_names_pkey PRIMARY KEY (id);


--
-- Name: store_stock store_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_stock
    ADD CONSTRAINT store_stock_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_slug_key UNIQUE (slug);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: surplus_history surplus_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.surplus_history
    ADD CONSTRAINT surplus_history_pkey PRIMARY KEY (id);


--
-- Name: surpluses surpluses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.surpluses
    ADD CONSTRAINT surpluses_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_unique UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: user_client_access user_client_access_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: idx_replit_database_migrations_v1_build_id; Type: INDEX; Schema: _system; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_replit_database_migrations_v1_build_id ON _system.replit_database_migrations_v1 USING btree (build_id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_categories_client_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_categories_client_id ON public.categories USING btree (client_id);


--
-- Name: idx_clients_organization_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_clients_organization_id ON public.clients USING btree (organization_id);


--
-- Name: idx_departments_client_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_departments_client_id ON public.departments USING btree (client_id);


--
-- Name: idx_exceptions_client_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_exceptions_client_status ON public.exceptions USING btree (client_id, status);


--
-- Name: idx_items_client_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_items_client_id ON public.items USING btree (client_id);


--
-- Name: idx_notifications_organization_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_organization_id ON public.notifications USING btree (organization_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_sales_entries_client_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_entries_client_date ON public.sales_entries USING btree (client_id, date);


--
-- Name: idx_sales_entries_client_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_entries_client_id ON public.sales_entries USING btree (client_id);


--
-- Name: idx_sales_entries_department_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_entries_department_id ON public.sales_entries USING btree (department_id);


--
-- Name: idx_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_session_expire ON public.session USING btree (expire);


--
-- Name: idx_stock_movements_client_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_client_date ON public.stock_movements USING btree (client_id, date);


--
-- Name: idx_stock_movements_client_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_client_id ON public.stock_movements USING btree (client_id);


--
-- Name: idx_suppliers_client_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_client_id ON public.suppliers USING btree (client_id);


--
-- Name: idx_user_client_access_client_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_client_access_client_id ON public.user_client_access USING btree (client_id);


--
-- Name: idx_user_client_access_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_client_access_user_id ON public.user_client_access USING btree (user_id);


--
-- Name: idx_users_organization_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_organization_id ON public.users USING btree (organization_id);


--
-- Name: srd_ledger_daily_client_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX srd_ledger_daily_client_date_idx ON public.srd_ledger_daily USING btree (client_id, ledger_date);


--
-- Name: srd_ledger_daily_srd_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX srd_ledger_daily_srd_date_idx ON public.srd_ledger_daily USING btree (srd_id, ledger_date);


--
-- Name: srd_ledger_daily_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX srd_ledger_daily_unique ON public.srd_ledger_daily USING btree (srd_id, item_id, ledger_date);


--
-- Name: srd_stock_movements_client_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX srd_stock_movements_client_date_idx ON public.srd_stock_movements USING btree (client_id, movement_date);


--
-- Name: admin_activity_logs admin_activity_logs_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: admin_activity_logs admin_activity_logs_target_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_target_user_id_users_id_fk FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_change_log audit_change_log_audit_id_audits_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_change_log
    ADD CONSTRAINT audit_change_log_audit_id_audits_id_fk FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE;


--
-- Name: audit_change_log audit_change_log_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_change_log
    ADD CONSTRAINT audit_change_log_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: audit_change_log audit_change_log_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_change_log
    ADD CONSTRAINT audit_change_log_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: audit_change_log audit_change_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_change_log
    ADD CONSTRAINT audit_change_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_contexts audit_contexts_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_contexts
    ADD CONSTRAINT audit_contexts_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: audit_contexts audit_contexts_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_contexts
    ADD CONSTRAINT audit_contexts_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: audit_contexts audit_contexts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_contexts
    ADD CONSTRAINT audit_contexts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_reissue_permissions audit_reissue_permissions_audit_id_audits_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_reissue_permissions
    ADD CONSTRAINT audit_reissue_permissions_audit_id_audits_id_fk FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE CASCADE;


--
-- Name: audit_reissue_permissions audit_reissue_permissions_granted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_reissue_permissions
    ADD CONSTRAINT audit_reissue_permissions_granted_by_users_id_fk FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: audit_reissue_permissions audit_reissue_permissions_granted_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_reissue_permissions
    ADD CONSTRAINT audit_reissue_permissions_granted_to_users_id_fk FOREIGN KEY (granted_to) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audits audits_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT audits_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: audits audits_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT audits_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: audits audits_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT audits_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: audits audits_locked_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT audits_locked_by_users_id_fk FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: audits audits_submitted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT audits_submitted_by_users_id_fk FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: categories categories_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: categories categories_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: categories categories_deleted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_deleted_by_users_id_fk FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: clients clients_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: data_exports data_exports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: data_exports data_exports_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: departments departments_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: departments departments_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: departments departments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: exception_activity exception_activity_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exception_activity
    ADD CONSTRAINT exception_activity_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: exception_activity exception_activity_exception_id_exceptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exception_activity
    ADD CONSTRAINT exception_activity_exception_id_exceptions_id_fk FOREIGN KEY (exception_id) REFERENCES public.exceptions(id) ON DELETE CASCADE;


--
-- Name: exception_comments exception_comments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exception_comments
    ADD CONSTRAINT exception_comments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: exception_comments exception_comments_exception_id_exceptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exception_comments
    ADD CONSTRAINT exception_comments_exception_id_exceptions_id_fk FOREIGN KEY (exception_id) REFERENCES public.exceptions(id) ON DELETE CASCADE;


--
-- Name: exceptions exceptions_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exceptions
    ADD CONSTRAINT exceptions_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: exceptions exceptions_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exceptions
    ADD CONSTRAINT exceptions_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: exceptions exceptions_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exceptions
    ADD CONSTRAINT exceptions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: exceptions exceptions_deleted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exceptions
    ADD CONSTRAINT exceptions_deleted_by_users_id_fk FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: exceptions exceptions_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exceptions
    ADD CONSTRAINT exceptions_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: goods_received_notes goods_received_notes_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: goods_received_notes goods_received_notes_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: goods_received_notes goods_received_notes_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: inventory_department_categories inventory_department_categories_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_department_categories
    ADD CONSTRAINT inventory_department_categories_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: inventory_department_categories inventory_department_categories_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_department_categories
    ADD CONSTRAINT inventory_department_categories_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: inventory_department_categories inventory_department_categories_inventory_department_id_invento; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_department_categories
    ADD CONSTRAINT inventory_department_categories_inventory_department_id_invento FOREIGN KEY (inventory_department_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: inventory_departments inventory_departments_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_departments
    ADD CONSTRAINT inventory_departments_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: inventory_departments inventory_departments_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_departments
    ADD CONSTRAINT inventory_departments_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: inventory_departments inventory_departments_store_name_id_store_names_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_departments
    ADD CONSTRAINT inventory_departments_store_name_id_store_names_id_fk FOREIGN KEY (store_name_id) REFERENCES public.store_names(id) ON DELETE RESTRICT;


--
-- Name: item_serial_events item_serial_events_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.item_serial_events
    ADD CONSTRAINT item_serial_events_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: item_serial_events item_serial_events_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.item_serial_events
    ADD CONSTRAINT item_serial_events_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: item_serial_events item_serial_events_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.item_serial_events
    ADD CONSTRAINT item_serial_events_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_serial_events item_serial_events_srd_id_inventory_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.item_serial_events
    ADD CONSTRAINT item_serial_events_srd_id_inventory_departments_id_fk FOREIGN KEY (srd_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: items items_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: items items_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: items items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organization_settings organization_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: organization_settings organization_settings_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: payment_declarations payment_declarations_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_declarations
    ADD CONSTRAINT payment_declarations_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: payment_declarations payment_declarations_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_declarations
    ADD CONSTRAINT payment_declarations_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: payment_declarations payment_declarations_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_declarations
    ADD CONSTRAINT payment_declarations_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: payments payments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: platform_admin_audit_log platform_admin_audit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_admin_audit_log
    ADD CONSTRAINT platform_admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admin_users(id);


--
-- Name: purchase_item_events purchase_item_events_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_item_events
    ADD CONSTRAINT purchase_item_events_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: purchase_item_events purchase_item_events_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_item_events
    ADD CONSTRAINT purchase_item_events_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_item_events purchase_item_events_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_item_events
    ADD CONSTRAINT purchase_item_events_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: purchase_item_events purchase_item_events_srd_id_inventory_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_item_events
    ADD CONSTRAINT purchase_item_events_srd_id_inventory_departments_id_fk FOREIGN KEY (srd_id) REFERENCES public.inventory_departments(id) ON DELETE SET NULL;


--
-- Name: purchase_lines purchase_lines_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: purchase_lines purchase_lines_purchase_id_purchases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_purchase_id_purchases_id_fk FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchases purchases_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: receivable_history receivable_history_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receivable_history
    ADD CONSTRAINT receivable_history_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: receivable_history receivable_history_receivable_id_receivables_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receivable_history
    ADD CONSTRAINT receivable_history_receivable_id_receivables_id_fk FOREIGN KEY (receivable_id) REFERENCES public.receivables(id) ON DELETE CASCADE;


--
-- Name: receivables receivables_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: receivables receivables_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: receivables receivables_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: reconciliations reconciliations_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: reconciliations reconciliations_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: reconciliations reconciliations_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: reconciliations reconciliations_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: sales_entries sales_entries_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_entries
    ADD CONSTRAINT sales_entries_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: sales_entries sales_entries_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_entries
    ADD CONSTRAINT sales_entries_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales_entries sales_entries_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_entries
    ADD CONSTRAINT sales_entries_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: srd_ledger_daily srd_ledger_daily_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_ledger_daily
    ADD CONSTRAINT srd_ledger_daily_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: srd_ledger_daily srd_ledger_daily_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_ledger_daily
    ADD CONSTRAINT srd_ledger_daily_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: srd_ledger_daily srd_ledger_daily_srd_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_ledger_daily
    ADD CONSTRAINT srd_ledger_daily_srd_id_fkey FOREIGN KEY (srd_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: srd_stock_movements srd_stock_movements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_stock_movements
    ADD CONSTRAINT srd_stock_movements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: srd_stock_movements srd_stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_stock_movements
    ADD CONSTRAINT srd_stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: srd_stock_movements srd_stock_movements_from_srd_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_stock_movements
    ADD CONSTRAINT srd_stock_movements_from_srd_id_fkey FOREIGN KEY (from_srd_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: srd_stock_movements srd_stock_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_stock_movements
    ADD CONSTRAINT srd_stock_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: srd_stock_movements srd_stock_movements_to_srd_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_stock_movements
    ADD CONSTRAINT srd_stock_movements_to_srd_id_fkey FOREIGN KEY (to_srd_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: srd_transfers srd_transfers_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_transfers
    ADD CONSTRAINT srd_transfers_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: srd_transfers srd_transfers_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_transfers
    ADD CONSTRAINT srd_transfers_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: srd_transfers srd_transfers_from_srd_id_inventory_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_transfers
    ADD CONSTRAINT srd_transfers_from_srd_id_inventory_departments_id_fk FOREIGN KEY (from_srd_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: srd_transfers srd_transfers_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_transfers
    ADD CONSTRAINT srd_transfers_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: srd_transfers srd_transfers_to_srd_id_inventory_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.srd_transfers
    ADD CONSTRAINT srd_transfers_to_srd_id_inventory_departments_id_fk FOREIGN KEY (to_srd_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: stock_counts stock_counts_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: stock_counts stock_counts_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_counts stock_counts_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: stock_counts stock_counts_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_counts stock_counts_store_department_id_inventory_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_store_department_id_inventory_departments_id_fk FOREIGN KEY (store_department_id) REFERENCES public.inventory_departments(id) ON DELETE SET NULL;


--
-- Name: stock_movement_lines stock_movement_lines_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_movement_lines
    ADD CONSTRAINT stock_movement_lines_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_movement_lines stock_movement_lines_movement_id_stock_movements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_movement_lines
    ADD CONSTRAINT stock_movement_lines_movement_id_stock_movements_id_fk FOREIGN KEY (movement_id) REFERENCES public.stock_movements(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: store_issue_lines store_issue_lines_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_issue_lines
    ADD CONSTRAINT store_issue_lines_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: store_issue_lines store_issue_lines_store_issue_id_store_issues_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_issue_lines
    ADD CONSTRAINT store_issue_lines_store_issue_id_store_issues_id_fk FOREIGN KEY (store_issue_id) REFERENCES public.store_issues(id) ON DELETE CASCADE;


--
-- Name: store_issues store_issues_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_issues
    ADD CONSTRAINT store_issues_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: store_issues store_issues_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_issues
    ADD CONSTRAINT store_issues_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_issues store_issues_from_department_id_inventory_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_issues
    ADD CONSTRAINT store_issues_from_department_id_inventory_departments_id_fk FOREIGN KEY (from_department_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: store_issues store_issues_to_department_id_inventory_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_issues
    ADD CONSTRAINT store_issues_to_department_id_inventory_departments_id_fk FOREIGN KEY (to_department_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: store_names store_names_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_names
    ADD CONSTRAINT store_names_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: store_names store_names_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_names
    ADD CONSTRAINT store_names_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_stock store_stock_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_stock
    ADD CONSTRAINT store_stock_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: store_stock store_stock_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_stock
    ADD CONSTRAINT store_stock_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_stock store_stock_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_stock
    ADD CONSTRAINT store_stock_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: store_stock store_stock_store_department_id_inventory_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_stock
    ADD CONSTRAINT store_stock_store_department_id_inventory_departments_id_fk FOREIGN KEY (store_department_id) REFERENCES public.inventory_departments(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: suppliers suppliers_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: surplus_history surplus_history_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.surplus_history
    ADD CONSTRAINT surplus_history_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: surplus_history surplus_history_surplus_id_surpluses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.surplus_history
    ADD CONSTRAINT surplus_history_surplus_id_surpluses_id_fk FOREIGN KEY (surplus_id) REFERENCES public.surpluses(id) ON DELETE CASCADE;


--
-- Name: surpluses surpluses_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.surpluses
    ADD CONSTRAINT surpluses_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: surpluses surpluses_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.surpluses
    ADD CONSTRAINT surpluses_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: surpluses surpluses_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.surpluses
    ADD CONSTRAINT surpluses_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: user_client_access user_client_access_assigned_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_assigned_by_users_id_fk FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_client_access user_client_access_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: user_client_access user_client_access_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict UAkqcZfOlrRheEgYPpNgNKA3arPNahkmmNaXTrzhJkUwQbHdEaR4JzJaQ5LbQYM

