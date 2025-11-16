--
-- PostgreSQL database dump
--

\restrict eKqYBlFj5hYTkVVlJwxRK7XjO8xkaILIFVRmwutGCaz1XgLWcxyVnOpbM7fg0Xm

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
-- Data for Name: rbac_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rbac_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rbac_routes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rbac_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: postgres
--



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
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.routes_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict eKqYBlFj5hYTkVVlJwxRK7XjO8xkaILIFVRmwutGCaz1XgLWcxyVnOpbM7fg0Xm

