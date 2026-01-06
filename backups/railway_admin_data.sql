--
-- PostgreSQL database dump
--

\restrict KbaPP5bzKcn5RkCZJvUbb6wYFoAOSWD80DqXqOrjeGDAacL8zXt79oO8OKjRWKs

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
-- Data for Name: enterprise_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enterprise_admins (id, name, email, password_hash, profile_pic_url, is_active, created_at, updated_at) FROM stdin;
2	Enterprise Admin	enterprise@bisman.erp	$2b$10$ZQ2rndUiwn66YQeC7beqtOvgJDQvRNU/LeomlmK0n6EbFIcS/Jvfu	\N	t	2025-12-03 20:41:21.792	2025-12-03 20:41:21.792
\.


--
-- Data for Name: super_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.super_admins (id, name, email, password_hash, "productType", profile_pic_url, is_active, created_at, updated_at, created_by) FROM stdin;
3	Super Admin	business_superadmin@bisman.demo	$2b$10$UrEakAIkhAKBFi.4602PU.aJ8aUa7D.ODde3Xcc00vfsFjtDxApzi	BUSINESS_ERP	\N	t	2025-12-03 20:55:12.358	2025-12-03 20:58:49.865	2
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, name, client_code, public_code, client_number, legal_name, trade_name, client_type, industry, business_size, registration_number, tax_id, legal_status, import_export_code, registration_year, addresses, contact_persons, financial_details, bank_details, documents, system_access, operational, risk, status, onboarding_status, trial_start_date, trial_end_date, modules_enabled, notification_prefs, preferred_language, timezone, mfa_enabled, duplicate_check, onboarding_activity, onboarding_date, first_invoice_date, last_activity_date, auto_disable_rules, "productType", super_admin_id, "subscriptionPlan", "subscriptionStatus", is_active, settings, logo, created_at, updated_at, created_by, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, cancel_at_period_end, trial_expired, payment_failed, payment_failed_at, last_payment_at, unique_id) FROM stdin;
\.


--
-- Name: enterprise_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enterprise_admins_id_seq', 2, true);


--
-- Name: super_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.super_admins_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--

\unrestrict KbaPP5bzKcn5RkCZJvUbb6wYFoAOSWD80DqXqOrjeGDAacL8zXt79oO8OKjRWKs

