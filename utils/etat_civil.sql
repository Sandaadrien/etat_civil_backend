--
-- PostgreSQL database dump
--

\restrict fGFXbzxyXIHmq7MeMPBGy9JN90qrTcNAfeal64aEeEVu3TlhjVTqZ2wl7guqTK1

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public._prisma_migrations OWNER TO admin;

--
-- Name: account; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp(3) without time zone,
    "refreshTokenExpiresAt" timestamp(3) without time zone,
    scope text,
    password text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.account OWNER TO admin;

--
-- Name: commune; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.commune (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    district_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.commune OWNER TO admin;

--
-- Name: country; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.country (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    iso2_code character(2) NOT NULL,
    iso3_code character(3) NOT NULL,
    name character varying(255) NOT NULL,
    nationality_name character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.country OWNER TO admin;

--
-- Name: district; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.district (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.district OWNER TO admin;

--
-- Name: fokontany; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.fokontany (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    commune_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.fokontany OWNER TO admin;

--
-- Name: region; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.region (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE public.region OWNER TO admin;

--
-- Name: session; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);


ALTER TABLE public.session OWNER TO admin;

--
-- Name: user; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."user" OWNER TO admin;

--
-- Name: verification; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.verification OWNER TO admin;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
13a47279-e984-42d6-ba9b-dafc77447638	8b97e083812d253e730b15089ba6eab2dd09a9428b573efea3e3ff73a4ae4c94	2026-09-26 12:13:13.442711+03	20260926091313_init	\N	\N	2026-09-26 12:13:13.063669+03	1
\.


--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
UQPHey60NU4PhcGF4YglhEDWMDwXoCFN	cMOXrANmH29M6s8p4TVQtIIJtWcnHZIt	credential	cMOXrANmH29M6s8p4TVQtIIJtWcnHZIt	\N	\N	\N	\N	\N	\N	923c3817122e102ad4b0919fd7b765cb:e3339d7f38ea1873c6a2170c1097078450d378cd15d9dcd3f8eaa3ae87aaec596cb6c1466cb0f41db9c3b49230a353b9d3b850b3920ed633445b143f97f08eaa	2026-09-26 11:02:08.764	2026-09-26 11:02:08.764
\.


--
-- Data for Name: commune; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.commune (id, district_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: country; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.country (id, iso2_code, iso3_code, name, nationality_name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: district; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.district (id, region_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fokontany; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.fokontany (id, commune_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.region (id, country_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") FROM stdin;
qsLJKlvRUxkOJ0FEXCJBVr5tG1HWTlJN	2026-10-03 11:02:08.799	mqWjc4xYAPujtkFfuBexGjx6IHcYUZW9	2026-09-26 11:02:08.799	2026-09-26 11:02:08.799		Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0	cMOXrANmH29M6s8p4TVQtIIJtWcnHZIt
zEo9Qh4rnr67hQTaGCOdzLMLGYMir9ML	2026-10-03 11:02:55.76	DaeK1Me7rW8nRChiONx8sV4FBUiXKPkh	2026-09-26 11:02:55.76	2026-09-26 11:02:55.76		Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0	cMOXrANmH29M6s8p4TVQtIIJtWcnHZIt
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt") FROM stdin;
cMOXrANmH29M6s8p4TVQtIIJtWcnHZIt	sanda	sandaniainaadrien@gmail.com	f		2026-09-26 11:02:08.729	2026-09-26 11:02:08.729
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: commune commune_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.commune
    ADD CONSTRAINT commune_pkey PRIMARY KEY (id);


--
-- Name: country country_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.country
    ADD CONSTRAINT country_pkey PRIMARY KEY (id);


--
-- Name: district district_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.district
    ADD CONSTRAINT district_pkey PRIMARY KEY (id);


--
-- Name: fokontany fokontany_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.fokontany
    ADD CONSTRAINT fokontany_pkey PRIMARY KEY (id);


--
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: commune uq_commune_district_name; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.commune
    ADD CONSTRAINT uq_commune_district_name UNIQUE (district_id, name);


--
-- Name: country uq_country_iso2; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.country
    ADD CONSTRAINT uq_country_iso2 UNIQUE (iso2_code);


--
-- Name: country uq_country_iso3; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.country
    ADD CONSTRAINT uq_country_iso3 UNIQUE (iso3_code);


--
-- Name: country uq_country_name; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.country
    ADD CONSTRAINT uq_country_name UNIQUE (name);


--
-- Name: district uq_district_region_name; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.district
    ADD CONSTRAINT uq_district_region_name UNIQUE (region_id, name);


--
-- Name: fokontany uq_fokontany_commune_name; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.fokontany
    ADD CONSTRAINT uq_fokontany_commune_name UNIQUE (commune_id, name);


--
-- Name: region uq_region_country_name; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT uq_region_country_name UNIQUE (country_id, name);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- Name: session_token_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX session_token_key ON public.session USING btree (token);


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- Name: user_email_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX user_email_key ON public."user" USING btree (email);


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: commune fk_commune_district; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.commune
    ADD CONSTRAINT fk_commune_district FOREIGN KEY (district_id) REFERENCES public.district(id);


--
-- Name: district fk_district_region; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.district
    ADD CONSTRAINT fk_district_region FOREIGN KEY (region_id) REFERENCES public.region(id);


--
-- Name: fokontany fk_fokontany_commune; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.fokontany
    ADD CONSTRAINT fk_fokontany_commune FOREIGN KEY (commune_id) REFERENCES public.commune(id);


--
-- Name: region fk_region_country; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT fk_region_country FOREIGN KEY (country_id) REFERENCES public.country(id);


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict fGFXbzxyXIHmq7MeMPBGy9JN90qrTcNAfeal64aEeEVu3TlhjVTqZ2wl7guqTK1

