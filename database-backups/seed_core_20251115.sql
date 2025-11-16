--
-- PostgreSQL database dump
--

\restrict 00TXNMmke9Sw8a3fhfxt5DtXZiLrWqsluecY34FByIsTvOasLnY59IggHhj2hgA

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
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: abhi
--

INSERT INTO public.modules VALUES (1, 'finance', 'Finance', NULL, '/finance', 'Banknote', 'BUSINESS_ERP', true, 1, '2025-10-26 04:56:59.128', '2025-10-26 04:56:59.128');
INSERT INTO public.modules VALUES (2, 'hr', 'Human Resources', NULL, '/hr', 'Users', 'BUSINESS_ERP', true, 2, '2025-10-26 04:56:59.137', '2025-10-26 04:56:59.137');
INSERT INTO public.modules VALUES (3, 'admin', 'Administration', NULL, '/admin', 'Shield', 'BUSINESS_ERP', true, 3, '2025-10-26 04:56:59.142', '2025-10-26 04:56:59.142');
INSERT INTO public.modules VALUES (4, 'procurement', 'Procurement', NULL, '/procurement', 'ShoppingCart', 'BUSINESS_ERP', true, 4, '2025-10-26 04:56:59.151', '2025-10-26 04:56:59.151');
INSERT INTO public.modules VALUES (5, 'inventory', 'Inventory', NULL, '/inventory', 'Boxes', 'BUSINESS_ERP', true, 5, '2025-10-26 04:56:59.16', '2025-10-26 04:56:59.16');
INSERT INTO public.modules VALUES (6, 'compliance', 'Compliance', NULL, '/compliance', 'ClipboardCheck', 'BUSINESS_ERP', true, 6, '2025-10-26 04:56:59.167', '2025-10-26 04:56:59.167');
INSERT INTO public.modules VALUES (7, 'legal', 'Legal', NULL, '/legal', 'Scale', 'BUSINESS_ERP', true, 7, '2025-10-26 04:56:59.174', '2025-10-26 04:56:59.174');
INSERT INTO public.modules VALUES (8, 'common', 'Common', NULL, '/common', 'Settings', 'BUSINESS_ERP', true, 99, '2025-10-26 04:56:59.181', '2025-10-26 04:56:59.181');
INSERT INTO public.modules VALUES (9, 'pump-management', 'Pump Management', NULL, '/pump-management', 'Fuel', 'PUMP_ERP', true, 1, '2025-10-26 04:56:59.187', '2025-10-26 04:56:59.187');
INSERT INTO public.modules VALUES (10, 'operations', 'Operations', NULL, '/operations', 'Briefcase', 'PUMP_ERP', true, 2, '2025-10-26 04:56:59.191', '2025-10-26 04:56:59.191');
INSERT INTO public.modules VALUES (11, 'fuel-management', 'Fuel Management', NULL, '/fuel-management', 'Droplet', 'PUMP_ERP', true, 3, '2025-10-26 04:56:59.198', '2025-10-26 04:56:59.198');
INSERT INTO public.modules VALUES (12, 'pump-sales', 'Sales & POS', NULL, '/pump-sales', 'DollarSign', 'PUMP_ERP', true, 4, '2025-10-26 04:56:59.205', '2025-10-26 04:56:59.205');
INSERT INTO public.modules VALUES (13, 'pump-inventory', 'Pump Inventory', NULL, '/pump-inventory', 'Package', 'PUMP_ERP', true, 5, '2025-10-26 04:56:59.211', '2025-10-26 04:56:59.211');
INSERT INTO public.modules VALUES (14, 'pump-reports', 'Reports & Analytics', NULL, '/pump-reports', 'BarChart', 'PUMP_ERP', true, 6, '2025-10-26 04:56:59.22', '2025-10-26 04:56:59.22');
INSERT INTO public.modules VALUES (15, 'analytics', 'Analytics', NULL, '/analytics', 'TrendingUp', 'ALL', true, 1, '2025-10-26 04:56:59.226', '2025-10-26 04:56:59.226');
INSERT INTO public.modules VALUES (16, 'subscriptions', 'Subscriptions', NULL, '/subscriptions', 'CreditCard', 'ALL', true, 2, '2025-10-26 04:56:59.232', '2025-10-26 04:56:59.232');
INSERT INTO public.modules VALUES (17, 'system', 'System Administration', 'System settings, users, and configuration', '/system', NULL, 'BUSINESS_ERP', true, 0, '2025-10-26 14:38:59.942', '2025-10-26 14:38:59.942');
INSERT INTO public.modules VALUES (18, 'super-admin', 'Super Admin', 'Super Admin specific functionality', '/super-admin', 'shield', 'BUSINESS_ERP', true, 18, '2025-10-26 15:06:13.03', '2025-10-26 15:06:13.03');
INSERT INTO public.modules VALUES (19, 'task-management', 'Task Management', 'Task and workflow management system', '/tasks', 'tasks', 'BUSINESS_ERP', true, 19, '2025-10-26 15:06:13.157', '2025-10-26 15:06:13.157');


--
-- Data for Name: super_admins; Type: TABLE DATA; Schema: public; Owner: abhi
--

INSERT INTO public.super_admins VALUES (1, 'Business Super Admin', 'business_superadmin@bisman.demo', '$2a$10$iSosrNLFJO7R/n1a7di6VOjrClyOSOTQAf.KJeI7CXHf1.BM8eu.u', 'BUSINESS_ERP', NULL, true, '2025-10-26 04:56:59.378', '2025-10-26 04:56:59.378', 1);
INSERT INTO public.super_admins VALUES (2, 'Pump Super Admin', 'pump_superadmin@bisman.demo', '$2a$10$iSosrNLFJO7R/n1a7di6VOjrClyOSOTQAf.KJeI7CXHf1.BM8eu.u', 'PUMP_ERP', NULL, true, '2025-10-26 04:56:59.389', '2025-10-26 04:56:59.389', 1);


--
-- Data for Name: module_assignments; Type: TABLE DATA; Schema: public; Owner: abhi
--

INSERT INTO public.module_assignments VALUES (34, 1, 3, '2025-11-03 17:02:55.833', '["dashboard"]');
INSERT INTO public.module_assignments VALUES (48, 1, 1, '2025-11-13 15:05:10.276', '["dashboard", "accounts", "accounts-payable", "accounts-receivable", "accounts-payable-summary", "general-ledger", "executive-dashboard", "cfo-dashboard", "finance-controller", "treasury", "banker"]');
INSERT INTO public.module_assignments VALUES (9, 2, 9, '2025-10-26 04:56:59.435', NULL);
INSERT INTO public.module_assignments VALUES (10, 2, 10, '2025-10-26 04:56:59.438', NULL);
INSERT INTO public.module_assignments VALUES (11, 2, 11, '2025-10-26 04:56:59.442', NULL);
INSERT INTO public.module_assignments VALUES (12, 2, 12, '2025-10-26 04:56:59.447', NULL);
INSERT INTO public.module_assignments VALUES (13, 2, 13, '2025-10-26 04:56:59.452', NULL);
INSERT INTO public.module_assignments VALUES (14, 2, 14, '2025-10-26 04:56:59.456', NULL);
INSERT INTO public.module_assignments VALUES (33, 1, 10, '2025-10-26 14:10:42.327', '["hub-incharge"]');
INSERT INTO public.module_assignments VALUES (35, 1, 17, '2025-10-26 14:43:50.53', '["dashboard", "user-management", "user-creation", "roles-users", "pages-roles", "permission-manager", "company-setup", "system-settings", "master-data", "integration-settings", "api-config", "system-health", "scheduler", "deployment", "backup-restore", "audit-logs", "error-logs", "server-logs", "about-me"]');
INSERT INTO public.module_assignments VALUES (42, 1, 5, '2025-11-02 08:22:19.456', NULL);
INSERT INTO public.module_assignments VALUES (44, 1, 7, '2025-11-02 08:22:19.466', NULL);
INSERT INTO public.module_assignments VALUES (46, 1, 19, '2025-11-02 08:22:19.479', NULL);
INSERT INTO public.module_assignments VALUES (47, 1, 18, '2025-11-02 09:40:28.715', '["dashboard", "security", "system", "orders"]');
INSERT INTO public.module_assignments VALUES (45, 1, 8, '2025-11-03 16:51:34.427', '["about-me"]');


--
-- Name: module_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: abhi
--

SELECT pg_catalog.setval('public.module_assignments_id_seq', 48, true);


--
-- Name: modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: abhi
--

SELECT pg_catalog.setval('public.modules_id_seq', 19, true);


--
-- Name: super_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: abhi
--

SELECT pg_catalog.setval('public.super_admins_id_seq', 3, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 00TXNMmke9Sw8a3fhfxt5DtXZiLrWqsluecY34FByIsTvOasLnY59IggHhj2hgA

