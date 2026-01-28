CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'trader',
    'viewer'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'trader');
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: hash_password(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hash_password(_password text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN extensions.crypt(_password, extensions.gen_salt('bf'));
END;
$$;


--
-- Name: is_api_key_encrypted(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_api_key_encrypted(key_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT api_secret_encrypted IS NOT NULL 
  FROM public.api_keys 
  WHERE id = key_id;
$$;


--
-- Name: mark_messages_as_read(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_messages_as_read(_conversation_id uuid, _reader_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- 标记对方发送的消息为已读
  -- 如果读者是用户，则标记客服/AI发送的消息
  -- 如果读者是客服，则标记用户发送的消息
  UPDATE cs_messages
  SET read_at = now(), is_read = true
  WHERE conversation_id = _conversation_id
    AND read_at IS NULL
    AND (
      (_reader_type = 'user' AND sender_type IN ('agent', 'ai', 'system'))
      OR (_reader_type = 'agent' AND sender_type = 'user')
    );
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: verify_admin_password(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_admin_password(_username text, _password text) RETURNS TABLE(admin_id uuid, admin_username text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.username
  FROM public.admin_users au
  WHERE au.username = _username
    AND au.password_hash = extensions.crypt(_password, au.password_hash)
    AND au.is_active = true;
  
  -- Update last login time if successful
  IF FOUND THEN
    UPDATE public.admin_users 
    SET last_login_at = now(), updated_at = now()
    WHERE username = _username;
  END IF;
END;
$$;


--
-- Name: verify_agent_password(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_agent_password(_username text, _password text) RETURNS TABLE(agent_id uuid, agent_username text, agent_display_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT ca.id, ca.username, ca.display_name
  FROM public.cs_agents ca
  WHERE ca.username = _username
    AND ca.password_hash = extensions.crypt(_password, ca.password_hash)
    AND ca.is_active = true;
  
  IF FOUND THEN
    UPDATE public.cs_agents 
    SET last_login_at = now(), updated_at = now(), is_online = true
    WHERE username = _username;
  END IF;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    admin_username text NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    email text,
    is_active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    exchange text NOT NULL,
    api_key text NOT NULL,
    api_secret text NOT NULL,
    passphrase text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    api_secret_encrypted bytea,
    passphrase_encrypted bytea,
    CONSTRAINT api_keys_exchange_check CHECK ((exchange = ANY (ARRAY['okx'::text, 'htx'::text])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crypto_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crypto_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    summary text,
    content text,
    source text NOT NULL,
    source_url text,
    image_url text,
    category text NOT NULL,
    published_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_hot boolean DEFAULT false,
    language text DEFAULT 'en'::text
);


--
-- Name: cs_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    avatar_url text,
    is_online boolean DEFAULT false,
    is_active boolean DEFAULT true,
    max_conversations integer DEFAULT 10,
    current_conversations integer DEFAULT 0,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agent_id uuid,
    status text DEFAULT 'waiting'::text NOT NULL,
    is_ai_mode boolean DEFAULT false,
    priority integer DEFAULT 0,
    last_message_at timestamp with time zone,
    last_message_preview text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rating integer,
    rating_comment text,
    rated_at timestamp with time zone,
    CONSTRAINT cs_conversations_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: cs_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_type text NOT NULL,
    sender_id uuid,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text,
    image_url text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);


--
-- Name: cs_quick_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_quick_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'general'::text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cs_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cs_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    from_agent_id uuid,
    to_agent_id uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deposit_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deposit_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coin_symbol text NOT NULL,
    coin_name text NOT NULL,
    network text NOT NULL,
    address text NOT NULL,
    qr_code_url text,
    min_deposit numeric DEFAULT 0,
    confirmations_required integer DEFAULT 12,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deposit_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deposit_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coin_symbol text NOT NULL,
    network text NOT NULL,
    amount numeric NOT NULL,
    from_address text,
    to_address text NOT NULL,
    tx_hash text,
    confirmations integer DEFAULT 0,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    screenshot_url text,
    submit_method text DEFAULT 'hash'::text,
    CONSTRAINT deposit_records_submit_method_check CHECK ((submit_method = ANY (ARRAY['hash'::text, 'manual'::text])))
);


--
-- Name: earn_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.earn_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_type text NOT NULL,
    coin_symbol text NOT NULL,
    coin_name text NOT NULL,
    apy_rate numeric NOT NULL,
    min_amount numeric DEFAULT 0 NOT NULL,
    max_amount numeric,
    lock_period_days integer,
    risk_level text NOT NULL,
    is_active boolean DEFAULT true,
    total_value_locked numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: earn_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.earn_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    amount numeric NOT NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    status text DEFAULT 'active'::text NOT NULL,
    earned_interest numeric DEFAULT 0,
    last_interest_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expert_showcases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_showcases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    profit_amount numeric DEFAULT 0 NOT NULL,
    profit_percent numeric DEFAULT 0 NOT NULL,
    symbol text DEFAULT 'BTC-USDT'::text NOT NULL,
    direction text DEFAULT 'long'::text NOT NULL,
    leverage integer DEFAULT 10 NOT NULL,
    entry_price numeric,
    exit_price numeric,
    image_url text,
    expert_name text NOT NULL,
    expert_avatar text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expert_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    strategy_type text DEFAULT 'grid'::text NOT NULL,
    symbol text DEFAULT 'BTC-USDT'::text NOT NULL,
    expert_name text NOT NULL,
    expert_avatar text,
    profit_rate numeric DEFAULT 0 NOT NULL,
    win_rate numeric DEFAULT 0 NOT NULL,
    total_profit numeric DEFAULT 0 NOT NULL,
    total_trades integer DEFAULT 0 NOT NULL,
    followers_count integer DEFAULT 0 NOT NULL,
    min_investment numeric DEFAULT 100 NOT NULL,
    risk_level text DEFAULT 'medium'::text NOT NULL,
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expert_strategy_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_strategy_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    strategy_id uuid NOT NULL,
    investment_amount numeric NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    profit numeric DEFAULT 0,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: follow_trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follow_trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    showcase_id uuid NOT NULL,
    amount numeric NOT NULL,
    leverage integer DEFAULT 10 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: futures_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.futures_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symbol text NOT NULL,
    name text NOT NULL,
    underlying text NOT NULL,
    contract_size numeric DEFAULT 1 NOT NULL,
    tick_size numeric DEFAULT 0.01 NOT NULL,
    expiry_date date,
    is_perpetual boolean DEFAULT false,
    is_active boolean DEFAULT true,
    max_leverage integer DEFAULT 100,
    maintenance_margin numeric DEFAULT 0.5,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: futures_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.futures_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    order_type text NOT NULL,
    side text NOT NULL,
    position_side text DEFAULT 'both'::text NOT NULL,
    quantity numeric NOT NULL,
    price numeric,
    stop_price numeric,
    leverage integer DEFAULT 1 NOT NULL,
    filled_quantity numeric DEFAULT 0,
    avg_fill_price numeric,
    status text DEFAULT 'pending'::text NOT NULL,
    reduce_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: futures_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.futures_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    side text NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    entry_price numeric DEFAULT 0 NOT NULL,
    mark_price numeric DEFAULT 0,
    liquidation_price numeric,
    margin numeric DEFAULT 0 NOT NULL,
    leverage integer DEFAULT 1 NOT NULL,
    unrealized_pnl numeric DEFAULT 0,
    realized_pnl numeric DEFAULT 0,
    status text DEFAULT 'open'::text NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kyc_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    real_name text NOT NULL,
    id_type text NOT NULL,
    id_number text NOT NULL,
    id_front_url text,
    id_back_url text,
    selfie_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    reject_reason text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kyc_verifications_id_type_check CHECK ((id_type = ANY (ARRAY['id_card'::text, 'passport'::text, 'driver_license'::text]))),
    CONSTRAINT kyc_verifications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: otc_merchants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otc_merchants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_name text NOT NULL,
    merchant_level text NOT NULL,
    completion_rate numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    support_coins text[] DEFAULT ARRAY['BTC'::text, 'ETH'::text, 'USDT'::text] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT otc_merchants_merchant_level_check CHECK ((merchant_level = ANY (ARRAY['diamond'::text, 'gold'::text, 'silver'::text])))
);


--
-- Name: otc_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otc_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    order_type text NOT NULL,
    coin_symbol text NOT NULL,
    amount numeric NOT NULL,
    price numeric NOT NULL,
    total_usd numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT otc_orders_order_type_check CHECK ((order_type = ANY (ARRAY['buy'::text, 'sell'::text]))),
    CONSTRAINT otc_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text])))
);


--
-- Name: otc_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otc_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    coin_symbol text NOT NULL,
    price numeric NOT NULL,
    min_limit numeric NOT NULL,
    max_limit numeric NOT NULL,
    avg_response_time integer DEFAULT 300 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: otp_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    success boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: perpetual_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perpetual_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    side text NOT NULL,
    leverage integer NOT NULL,
    entry_price numeric NOT NULL,
    amount numeric NOT NULL,
    margin numeric NOT NULL,
    unrealized_pnl numeric DEFAULT 0,
    liquidation_price numeric,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    close_price numeric,
    CONSTRAINT perpetual_positions_side_check CHECK ((side = ANY (ARRAY['long'::text, 'short'::text]))),
    CONSTRAINT perpetual_positions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'liquidated'::text])))
);


--
-- Name: platform_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text,
    is_important boolean DEFAULT false,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    wallet_address text,
    has_password boolean DEFAULT false
);


--
-- Name: second_contract_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.second_contract_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text DEFAULT 'BTC-USDT'::text NOT NULL,
    duration integer NOT NULL,
    amount numeric NOT NULL,
    entry_price numeric NOT NULL,
    direction text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    result text,
    admin_result text,
    final_price numeric,
    profit numeric DEFAULT 0,
    yield_rate numeric DEFAULT 0.85,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    settlement_time timestamp with time zone NOT NULL,
    settled_at timestamp with time zone,
    CONSTRAINT second_contract_orders_admin_result_check CHECK ((admin_result = ANY (ARRAY['win'::text, 'lose'::text, 'real'::text]))),
    CONSTRAINT second_contract_orders_direction_check CHECK ((direction = ANY (ARRAY['up'::text, 'down'::text]))),
    CONSTRAINT second_contract_orders_result_check CHECK ((result = ANY (ARRAY['win'::text, 'lose'::text]))),
    CONSTRAINT second_contract_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'settled'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY public.second_contract_orders REPLICA IDENTITY FULL;


--
-- Name: stock_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    order_type text NOT NULL,
    side text NOT NULL,
    quantity numeric NOT NULL,
    price numeric,
    stop_price numeric,
    filled_quantity numeric DEFAULT 0,
    avg_fill_price numeric,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    avg_cost numeric DEFAULT 0 NOT NULL,
    market_value numeric DEFAULT 0,
    unrealized_pnl numeric DEFAULT 0,
    realized_pnl numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_symbols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_symbols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symbol text NOT NULL,
    name text NOT NULL,
    market text DEFAULT 'US'::text NOT NULL,
    sector text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    strategy_type text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT strategies_strategy_type_check CHECK ((strategy_type = ANY (ARRAY['grid'::text, 'dca'::text, 'arbitrage'::text, 'custom'::text])))
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: time_contract_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_contract_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coin_symbol text NOT NULL,
    coin_name text NOT NULL,
    is_active boolean DEFAULT true,
    min_stake_amount numeric(20,8) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    category text DEFAULT 'crypto'::text NOT NULL
);


--
-- Name: time_contract_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_contract_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    duration_minutes integer NOT NULL,
    profit_rate numeric(10,4) NOT NULL,
    min_amount numeric(20,8) DEFAULT 0 NOT NULL,
    max_amount numeric(20,8),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    duration_value integer DEFAULT 1 NOT NULL,
    duration_unit text DEFAULT 'minutes'::text NOT NULL,
    CONSTRAINT apy_rate_valid CHECK (((profit_rate >= (0)::numeric) AND (profit_rate <= (100)::numeric))),
    CONSTRAINT duration_days_positive CHECK ((duration_minutes > 0)),
    CONSTRAINT time_contract_configs_duration_unit_check CHECK ((duration_unit = ANY (ARRAY['seconds'::text, 'minutes'::text, 'hours'::text, 'days'::text])))
);


--
-- Name: trade_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trade_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    strategy_id uuid,
    exchange text NOT NULL,
    symbol text NOT NULL,
    order_type text NOT NULL,
    side text NOT NULL,
    price numeric(20,8),
    amount numeric(20,8) NOT NULL,
    filled numeric(20,8) DEFAULT 0,
    status text NOT NULL,
    exchange_order_id text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_positive_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT check_positive_price CHECK (((price IS NULL) OR (price > (0)::numeric))),
    CONSTRAINT trade_orders_order_type_check CHECK ((order_type = ANY (ARRAY['market'::text, 'limit'::text, 'stop'::text]))),
    CONSTRAINT trade_orders_side_check CHECK ((side = ANY (ARRAY['buy'::text, 'sell'::text]))),
    CONSTRAINT trade_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'open'::text, 'filled'::text, 'cancelled'::text, 'failed'::text])))
);


--
-- Name: user_announcement_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_announcement_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    announcement_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    target_type text DEFAULT 'all'::text NOT NULL,
    target_user_ids uuid[] DEFAULT '{}'::uuid[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_balance_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_balance_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    total_usd_value numeric DEFAULT 0 NOT NULL,
    snapshot_type text DEFAULT 'daily'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    currency text NOT NULL,
    account_type text DEFAULT 'spot'::text NOT NULL,
    available numeric DEFAULT 0 NOT NULL,
    frozen numeric DEFAULT 0 NOT NULL,
    total numeric GENERATED ALWAYS AS ((available + frozen)) STORED,
    usd_value numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_reply text,
    replied_at timestamp with time zone,
    replied_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_withdrawal_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_withdrawal_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coin_symbol text NOT NULL,
    coin_name text NOT NULL,
    network text NOT NULL,
    address text NOT NULL,
    label text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wallet_nonces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_nonces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address text NOT NULL,
    nonce text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: withdraw_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdraw_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coin_symbol text NOT NULL,
    network text NOT NULL,
    amount numeric NOT NULL,
    fee numeric DEFAULT 0 NOT NULL,
    to_address text NOT NULL,
    tx_hash text,
    status text DEFAULT 'pending'::text NOT NULL,
    reject_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_audit_logs admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_key UNIQUE (username);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_user_id_exchange_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_exchange_key UNIQUE (user_id, exchange);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: crypto_news crypto_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_news
    ADD CONSTRAINT crypto_news_pkey PRIMARY KEY (id);


--
-- Name: crypto_news crypto_news_source_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_news
    ADD CONSTRAINT crypto_news_source_url_key UNIQUE (source_url);


--
-- Name: crypto_news crypto_news_source_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_news
    ADD CONSTRAINT crypto_news_source_url_unique UNIQUE (source_url);


--
-- Name: cs_agents cs_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_agents
    ADD CONSTRAINT cs_agents_pkey PRIMARY KEY (id);


--
-- Name: cs_agents cs_agents_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_agents
    ADD CONSTRAINT cs_agents_username_key UNIQUE (username);


--
-- Name: cs_conversations cs_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_conversations
    ADD CONSTRAINT cs_conversations_pkey PRIMARY KEY (id);


--
-- Name: cs_messages cs_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_messages
    ADD CONSTRAINT cs_messages_pkey PRIMARY KEY (id);


--
-- Name: cs_quick_replies cs_quick_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_quick_replies
    ADD CONSTRAINT cs_quick_replies_pkey PRIMARY KEY (id);


--
-- Name: cs_transfers cs_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_transfers
    ADD CONSTRAINT cs_transfers_pkey PRIMARY KEY (id);


--
-- Name: deposit_addresses deposit_addresses_coin_symbol_network_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_addresses
    ADD CONSTRAINT deposit_addresses_coin_symbol_network_key UNIQUE (coin_symbol, network);


--
-- Name: deposit_addresses deposit_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_addresses
    ADD CONSTRAINT deposit_addresses_pkey PRIMARY KEY (id);


--
-- Name: deposit_records deposit_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_records
    ADD CONSTRAINT deposit_records_pkey PRIMARY KEY (id);


--
-- Name: earn_products earn_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earn_products
    ADD CONSTRAINT earn_products_pkey PRIMARY KEY (id);


--
-- Name: earn_subscriptions earn_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earn_subscriptions
    ADD CONSTRAINT earn_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: expert_showcases expert_showcases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_showcases
    ADD CONSTRAINT expert_showcases_pkey PRIMARY KEY (id);


--
-- Name: expert_strategies expert_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_strategies
    ADD CONSTRAINT expert_strategies_pkey PRIMARY KEY (id);


--
-- Name: expert_strategy_subscriptions expert_strategy_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_strategy_subscriptions
    ADD CONSTRAINT expert_strategy_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: follow_trades follow_trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_trades
    ADD CONSTRAINT follow_trades_pkey PRIMARY KEY (id);


--
-- Name: futures_contracts futures_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.futures_contracts
    ADD CONSTRAINT futures_contracts_pkey PRIMARY KEY (id);


--
-- Name: futures_contracts futures_contracts_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.futures_contracts
    ADD CONSTRAINT futures_contracts_symbol_key UNIQUE (symbol);


--
-- Name: futures_orders futures_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.futures_orders
    ADD CONSTRAINT futures_orders_pkey PRIMARY KEY (id);


--
-- Name: futures_positions futures_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.futures_positions
    ADD CONSTRAINT futures_positions_pkey PRIMARY KEY (id);


--
-- Name: kyc_verifications kyc_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifications
    ADD CONSTRAINT kyc_verifications_pkey PRIMARY KEY (id);


--
-- Name: kyc_verifications kyc_verifications_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifications
    ADD CONSTRAINT kyc_verifications_user_id_key UNIQUE (user_id);


--
-- Name: otc_merchants otc_merchants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otc_merchants
    ADD CONSTRAINT otc_merchants_pkey PRIMARY KEY (id);


--
-- Name: otc_orders otc_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otc_orders
    ADD CONSTRAINT otc_orders_pkey PRIMARY KEY (id);


--
-- Name: otc_prices otc_prices_merchant_id_coin_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otc_prices
    ADD CONSTRAINT otc_prices_merchant_id_coin_symbol_key UNIQUE (merchant_id, coin_symbol);


--
-- Name: otc_prices otc_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otc_prices
    ADD CONSTRAINT otc_prices_pkey PRIMARY KEY (id);


--
-- Name: otp_attempts otp_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_attempts
    ADD CONSTRAINT otp_attempts_pkey PRIMARY KEY (id);


--
-- Name: perpetual_positions perpetual_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perpetual_positions
    ADD CONSTRAINT perpetual_positions_pkey PRIMARY KEY (id);


--
-- Name: platform_announcements platform_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_announcements
    ADD CONSTRAINT platform_announcements_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: second_contract_orders second_contract_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.second_contract_orders
    ADD CONSTRAINT second_contract_orders_pkey PRIMARY KEY (id);


--
-- Name: stock_orders stock_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_orders
    ADD CONSTRAINT stock_orders_pkey PRIMARY KEY (id);


--
-- Name: stock_positions stock_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_positions
    ADD CONSTRAINT stock_positions_pkey PRIMARY KEY (id);


--
-- Name: stock_positions stock_positions_user_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_positions
    ADD CONSTRAINT stock_positions_user_id_symbol_key UNIQUE (user_id, symbol);


--
-- Name: stock_symbols stock_symbols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_symbols
    ADD CONSTRAINT stock_symbols_pkey PRIMARY KEY (id);


--
-- Name: stock_symbols stock_symbols_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_symbols
    ADD CONSTRAINT stock_symbols_symbol_key UNIQUE (symbol);


--
-- Name: strategies strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategies
    ADD CONSTRAINT strategies_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: time_contract_assets time_contract_assets_coin_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_contract_assets
    ADD CONSTRAINT time_contract_assets_coin_symbol_key UNIQUE (coin_symbol);


--
-- Name: time_contract_assets time_contract_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_contract_assets
    ADD CONSTRAINT time_contract_assets_pkey PRIMARY KEY (id);


--
-- Name: time_contract_configs time_contract_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_contract_configs
    ADD CONSTRAINT time_contract_configs_pkey PRIMARY KEY (id);


--
-- Name: trade_orders trade_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_orders
    ADD CONSTRAINT trade_orders_pkey PRIMARY KEY (id);


--
-- Name: user_announcement_reads user_announcement_reads_announcement_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_announcement_reads
    ADD CONSTRAINT user_announcement_reads_announcement_id_user_id_key UNIQUE (announcement_id, user_id);


--
-- Name: user_announcement_reads user_announcement_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_announcement_reads
    ADD CONSTRAINT user_announcement_reads_pkey PRIMARY KEY (id);


--
-- Name: user_announcements user_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_announcements
    ADD CONSTRAINT user_announcements_pkey PRIMARY KEY (id);


--
-- Name: user_balance_snapshots user_balance_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_balance_snapshots
    ADD CONSTRAINT user_balance_snapshots_pkey PRIMARY KEY (id);


--
-- Name: user_balances user_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_pkey PRIMARY KEY (id);


--
-- Name: user_balances user_balances_user_id_currency_account_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_user_id_currency_account_type_key UNIQUE (user_id, currency, account_type);


--
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_withdrawal_addresses user_withdrawal_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_withdrawal_addresses
    ADD CONSTRAINT user_withdrawal_addresses_pkey PRIMARY KEY (id);


--
-- Name: wallet_nonces wallet_nonces_nonce_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_nonces
    ADD CONSTRAINT wallet_nonces_nonce_key UNIQUE (nonce);


--
-- Name: wallet_nonces wallet_nonces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_nonces
    ADD CONSTRAINT wallet_nonces_pkey PRIMARY KEY (id);


--
-- Name: withdraw_records withdraw_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdraw_records
    ADD CONSTRAINT withdraw_records_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs USING btree (action);


--
-- Name: idx_admin_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_admin_id ON public.admin_audit_logs USING btree (admin_id);


--
-- Name: idx_admin_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs USING btree (created_at DESC);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_balance_snapshots_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_snapshots_user_created ON public.user_balance_snapshots USING btree (user_id, created_at DESC);


--
-- Name: idx_crypto_news_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crypto_news_category ON public.crypto_news USING btree (category);


--
-- Name: idx_crypto_news_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crypto_news_language ON public.crypto_news USING btree (language);


--
-- Name: idx_crypto_news_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crypto_news_published_at ON public.crypto_news USING btree (published_at DESC);


--
-- Name: idx_cs_conversations_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_conversations_agent_id ON public.cs_conversations USING btree (agent_id);


--
-- Name: idx_cs_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_conversations_status ON public.cs_conversations USING btree (status);


--
-- Name: idx_cs_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_conversations_user_id ON public.cs_conversations USING btree (user_id);


--
-- Name: idx_cs_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_messages_conversation_id ON public.cs_messages USING btree (conversation_id);


--
-- Name: idx_cs_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cs_messages_created_at ON public.cs_messages USING btree (created_at);


--
-- Name: idx_earn_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earn_products_active ON public.earn_products USING btree (is_active);


--
-- Name: idx_earn_products_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earn_products_type ON public.earn_products USING btree (product_type);


--
-- Name: idx_earn_subscriptions_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earn_subscriptions_product ON public.earn_subscriptions USING btree (product_id);


--
-- Name: idx_earn_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earn_subscriptions_status ON public.earn_subscriptions USING btree (status);


--
-- Name: idx_earn_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earn_subscriptions_user ON public.earn_subscriptions USING btree (user_id);


--
-- Name: idx_kyc_verifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_verifications_status ON public.kyc_verifications USING btree (status);


--
-- Name: idx_kyc_verifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_verifications_user_id ON public.kyc_verifications USING btree (user_id);


--
-- Name: idx_otc_merchants_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otc_merchants_active ON public.otc_merchants USING btree (is_active);


--
-- Name: idx_otc_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otc_orders_status ON public.otc_orders USING btree (status);


--
-- Name: idx_otc_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otc_orders_user ON public.otc_orders USING btree (user_id);


--
-- Name: idx_otc_prices_coin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otc_prices_coin ON public.otc_prices USING btree (coin_symbol);


--
-- Name: idx_otc_prices_merchant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otc_prices_merchant ON public.otc_prices USING btree (merchant_id);


--
-- Name: idx_otp_attempts_phone_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_attempts_phone_time ON public.otp_attempts USING btree (phone, created_at DESC);


--
-- Name: idx_perpetual_positions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perpetual_positions_status ON public.perpetual_positions USING btree (status);


--
-- Name: idx_perpetual_positions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perpetual_positions_user_id ON public.perpetual_positions USING btree (user_id);


--
-- Name: idx_platform_announcements_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_announcements_published_at ON public.platform_announcements USING btree (published_at DESC);


--
-- Name: idx_profiles_wallet_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_wallet_address ON public.profiles USING btree (wallet_address) WHERE (wallet_address IS NOT NULL);


--
-- Name: idx_second_contract_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_second_contract_orders_status ON public.second_contract_orders USING btree (status);


--
-- Name: idx_second_contract_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_second_contract_orders_user_id ON public.second_contract_orders USING btree (user_id);


--
-- Name: idx_strategies_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strategies_user_id ON public.strategies USING btree (user_id);


--
-- Name: idx_time_contract_assets_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_contract_assets_category ON public.time_contract_assets USING btree (category);


--
-- Name: idx_time_contract_configs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_contract_configs_active ON public.time_contract_configs USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_trade_orders_strategy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_orders_strategy_id ON public.trade_orders USING btree (strategy_id);


--
-- Name: idx_trade_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_orders_user_id ON public.trade_orders USING btree (user_id);


--
-- Name: idx_user_balances_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_balances_currency ON public.user_balances USING btree (currency);


--
-- Name: idx_user_balances_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_balances_user_id ON public.user_balances USING btree (user_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_wallet_nonces_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_nonces_address ON public.wallet_nonces USING btree (address);


--
-- Name: idx_wallet_nonces_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_nonces_expires_at ON public.wallet_nonces USING btree (expires_at);


--
-- Name: idx_wallet_nonces_nonce; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_nonces_nonce ON public.wallet_nonces USING btree (nonce);


--
-- Name: api_keys set_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: strategies set_strategies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_strategies_updated_at BEFORE UPDATE ON public.strategies FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: trade_orders set_trade_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_trade_orders_updated_at BEFORE UPDATE ON public.trade_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: crypto_news update_crypto_news_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_crypto_news_updated_at BEFORE UPDATE ON public.crypto_news FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: cs_agents update_cs_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cs_agents_updated_at BEFORE UPDATE ON public.cs_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cs_conversations update_cs_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cs_conversations_updated_at BEFORE UPDATE ON public.cs_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cs_quick_replies update_cs_quick_replies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cs_quick_replies_updated_at BEFORE UPDATE ON public.cs_quick_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deposit_addresses update_deposit_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deposit_addresses_updated_at BEFORE UPDATE ON public.deposit_addresses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: deposit_records update_deposit_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deposit_records_updated_at BEFORE UPDATE ON public.deposit_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: earn_products update_earn_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_earn_products_updated_at BEFORE UPDATE ON public.earn_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: earn_subscriptions update_earn_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_earn_subscriptions_updated_at BEFORE UPDATE ON public.earn_subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: futures_contracts update_futures_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_futures_contracts_updated_at BEFORE UPDATE ON public.futures_contracts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: futures_orders update_futures_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_futures_orders_updated_at BEFORE UPDATE ON public.futures_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: futures_positions update_futures_positions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_futures_positions_updated_at BEFORE UPDATE ON public.futures_positions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: kyc_verifications update_kyc_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kyc_verifications_updated_at BEFORE UPDATE ON public.kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_announcements update_platform_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_announcements_updated_at BEFORE UPDATE ON public.platform_announcements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: stock_orders update_stock_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_orders_updated_at BEFORE UPDATE ON public.stock_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: stock_positions update_stock_positions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_positions_updated_at BEFORE UPDATE ON public.stock_positions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: stock_symbols update_stock_symbols_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_symbols_updated_at BEFORE UPDATE ON public.stock_symbols FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: system_configs update_system_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON public.system_configs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: time_contract_assets update_time_contract_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_time_contract_assets_updated_at BEFORE UPDATE ON public.time_contract_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: time_contract_configs update_time_contract_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_time_contract_configs_updated_at BEFORE UPDATE ON public.time_contract_configs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: user_announcements update_user_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_announcements_updated_at BEFORE UPDATE ON public.user_announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_balances update_user_balances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON public.user_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_feedback update_user_feedback_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_feedback_updated_at BEFORE UPDATE ON public.user_feedback FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: user_withdrawal_addresses update_user_withdrawal_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_withdrawal_addresses_updated_at BEFORE UPDATE ON public.user_withdrawal_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: withdraw_records update_withdraw_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_withdraw_records_updated_at BEFORE UPDATE ON public.withdraw_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: cs_conversations cs_conversations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_conversations
    ADD CONSTRAINT cs_conversations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.cs_agents(id);


--
-- Name: cs_messages cs_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_messages
    ADD CONSTRAINT cs_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.cs_conversations(id) ON DELETE CASCADE;


--
-- Name: cs_quick_replies cs_quick_replies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_quick_replies
    ADD CONSTRAINT cs_quick_replies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.cs_agents(id);


--
-- Name: cs_transfers cs_transfers_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_transfers
    ADD CONSTRAINT cs_transfers_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.cs_conversations(id) ON DELETE CASCADE;


--
-- Name: cs_transfers cs_transfers_from_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_transfers
    ADD CONSTRAINT cs_transfers_from_agent_id_fkey FOREIGN KEY (from_agent_id) REFERENCES public.cs_agents(id);


--
-- Name: cs_transfers cs_transfers_to_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cs_transfers
    ADD CONSTRAINT cs_transfers_to_agent_id_fkey FOREIGN KEY (to_agent_id) REFERENCES public.cs_agents(id);


--
-- Name: deposit_records deposit_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_records
    ADD CONSTRAINT deposit_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: earn_subscriptions earn_subscriptions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.earn_subscriptions
    ADD CONSTRAINT earn_subscriptions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.earn_products(id);


--
-- Name: expert_strategy_subscriptions expert_strategy_subscriptions_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_strategy_subscriptions
    ADD CONSTRAINT expert_strategy_subscriptions_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.expert_strategies(id) ON DELETE CASCADE;


--
-- Name: follow_trades follow_trades_showcase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_trades
    ADD CONSTRAINT follow_trades_showcase_id_fkey FOREIGN KEY (showcase_id) REFERENCES public.expert_showcases(id) ON DELETE CASCADE;


--
-- Name: otc_orders otc_orders_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otc_orders
    ADD CONSTRAINT otc_orders_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.otc_merchants(id);


--
-- Name: otc_prices otc_prices_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otc_prices
    ADD CONSTRAINT otc_prices_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.otc_merchants(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: strategies strategies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategies
    ADD CONSTRAINT strategies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: trade_orders trade_orders_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_orders
    ADD CONSTRAINT trade_orders_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.strategies(id) ON DELETE SET NULL;


--
-- Name: trade_orders trade_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_orders
    ADD CONSTRAINT trade_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_announcement_reads user_announcement_reads_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_announcement_reads
    ADD CONSTRAINT user_announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.user_announcements(id) ON DELETE CASCADE;


--
-- Name: user_feedback user_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: withdraw_records withdraw_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdraw_records
    ADD CONSTRAINT withdraw_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_feedback Admins can delete feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete feedback" ON public.user_feedback FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: deposit_addresses Admins can manage deposit addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage deposit addresses" ON public.deposit_addresses USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: earn_products Admins can manage earn products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage earn products" ON public.earn_products USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: expert_strategies Admins can manage expert strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage expert strategies" ON public.expert_strategies USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: futures_contracts Admins can manage futures contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage futures contracts" ON public.futures_contracts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: otc_merchants Admins can manage merchants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage merchants" ON public.otc_merchants USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: otc_prices Admins can manage prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage prices" ON public.otc_prices USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: expert_showcases Admins can manage showcases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage showcases" ON public.expert_showcases USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stock_symbols Admins can manage stock symbols; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage stock symbols" ON public.stock_symbols USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_configs Admins can manage system configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage system configs" ON public.system_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: time_contract_assets Admins can manage time contract assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage time contract assets" ON public.time_contract_assets USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: time_contract_configs Admins can manage time contract configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage time contract configs" ON public.time_contract_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: kyc_verifications Admins can update all kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all kyc" ON public.kyc_verifications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: second_contract_orders Admins can update all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all orders" ON public.second_contract_orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: perpetual_positions Admins can update all positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all positions" ON public.perpetual_positions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: deposit_records Admins can update deposit records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update deposit records" ON public.deposit_records FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_feedback Admins can update feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update feedback" ON public.user_feedback FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: follow_trades Admins can update follow trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update follow trades" ON public.follow_trades FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: futures_orders Admins can update futures orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update futures orders" ON public.futures_orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: futures_positions Admins can update futures positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update futures positions" ON public.futures_positions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: otc_orders Admins can update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update orders" ON public.otc_orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stock_orders Admins can update stock orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update stock orders" ON public.stock_orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: earn_subscriptions Admins can update subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update subscriptions" ON public.earn_subscriptions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: expert_strategy_subscriptions Admins can update subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update subscriptions" ON public.expert_strategy_subscriptions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: withdraw_records Admins can update withdraw records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update withdraw records" ON public.withdraw_records FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: api_keys Admins can view all API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all API keys" ON public.api_keys FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: deposit_records Admins can view all deposit records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all deposit records" ON public.deposit_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_feedback Admins can view all feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all feedback" ON public.user_feedback FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: follow_trades Admins can view all follow trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all follow trades" ON public.follow_trades FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: futures_orders Admins can view all futures orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all futures orders" ON public.futures_orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: futures_positions Admins can view all futures positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all futures positions" ON public.futures_positions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: kyc_verifications Admins can view all kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all kyc" ON public.kyc_verifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: otc_orders Admins can view all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all orders" ON public.otc_orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: second_contract_orders Admins can view all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all orders" ON public.second_contract_orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: trade_orders Admins can view all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all orders" ON public.trade_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: perpetual_positions Admins can view all positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all positions" ON public.perpetual_positions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stock_orders Admins can view all stock orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all stock orders" ON public.stock_orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: strategies Admins can view all strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all strategies" ON public.strategies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: earn_subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.earn_subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: expert_strategy_subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.expert_strategy_subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: withdraw_records Admins can view all withdraw records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all withdraw records" ON public.withdraw_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: earn_products Anyone can view active earn products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active earn products" ON public.earn_products FOR SELECT USING ((is_active = true));


--
-- Name: expert_strategies Anyone can view active expert strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active expert strategies" ON public.expert_strategies FOR SELECT USING ((is_active = true));


--
-- Name: futures_contracts Anyone can view active futures contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active futures contracts" ON public.futures_contracts FOR SELECT USING ((is_active = true));


--
-- Name: otc_merchants Anyone can view active merchants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active merchants" ON public.otc_merchants FOR SELECT USING ((is_active = true));


--
-- Name: otc_prices Anyone can view active prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active prices" ON public.otc_prices FOR SELECT USING ((is_active = true));


--
-- Name: expert_showcases Anyone can view active showcases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active showcases" ON public.expert_showcases FOR SELECT USING ((is_active = true));


--
-- Name: stock_symbols Anyone can view active stock symbols; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active stock symbols" ON public.stock_symbols FOR SELECT USING ((is_active = true));


--
-- Name: time_contract_assets Anyone can view active time contract assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active time contract assets" ON public.time_contract_assets FOR SELECT USING ((is_active = true));


--
-- Name: time_contract_configs Anyone can view active time contract configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active time contract configs" ON public.time_contract_configs FOR SELECT USING ((is_active = true));


--
-- Name: platform_announcements Anyone can view announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view announcements" ON public.platform_announcements FOR SELECT USING (true);


--
-- Name: crypto_news Anyone can view crypto news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view crypto news" ON public.crypto_news FOR SELECT USING (true);


--
-- Name: deposit_addresses Authenticated users can view active deposit addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active deposit addresses" ON public.deposit_addresses FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (is_active = true)));


--
-- Name: system_configs Authenticated users can view system configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view system configs" ON public.system_configs FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: wallet_nonces Delete expired nonces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete expired nonces" ON public.wallet_nonces FOR DELETE USING ((expires_at < now()));


--
-- Name: admin_users No client access to admin_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No client access to admin_users" ON public.admin_users USING (false);


--
-- Name: admin_audit_logs No direct client access to admin audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct client access to admin audit logs" ON public.admin_audit_logs USING (false);


--
-- Name: deposit_addresses Only admins can view deposit addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view deposit addresses" ON public.deposit_addresses FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: deposit_records Service can insert deposit records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert deposit records" ON public.deposit_records FOR INSERT WITH CHECK (true);


--
-- Name: user_balance_snapshots Service can insert snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert snapshots" ON public.user_balance_snapshots FOR INSERT WITH CHECK (true);


--
-- Name: user_balances Service can manage balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage balances" ON public.user_balances USING (true);


--
-- Name: stock_positions Service can manage stock positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage stock positions" ON public.stock_positions USING (true);


--
-- Name: otp_attempts Service role can insert OTP attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert OTP attempts" ON public.otp_attempts FOR INSERT WITH CHECK (true);


--
-- Name: audit_logs Service role can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: wallet_nonces Service role can insert wallet nonces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert wallet nonces" ON public.wallet_nonces FOR INSERT WITH CHECK (true);


--
-- Name: cs_agents Service role can manage cs_agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cs_agents" ON public.cs_agents USING ((auth.role() = 'service_role'::text));


--
-- Name: cs_conversations Service role can manage cs_conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cs_conversations" ON public.cs_conversations USING ((auth.role() = 'service_role'::text));


--
-- Name: cs_messages Service role can manage cs_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cs_messages" ON public.cs_messages USING ((auth.role() = 'service_role'::text));


--
-- Name: cs_quick_replies Service role can manage cs_quick_replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cs_quick_replies" ON public.cs_quick_replies USING ((auth.role() = 'service_role'::text));


--
-- Name: cs_transfers Service role can manage cs_transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cs_transfers" ON public.cs_transfers USING ((auth.role() = 'service_role'::text));


--
-- Name: wallet_nonces Service role can select wallet nonces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can select wallet nonces" ON public.wallet_nonces FOR SELECT USING (true);


--
-- Name: wallet_nonces Service role can update wallet nonces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update wallet nonces" ON public.wallet_nonces FOR UPDATE USING (true);


--
-- Name: follow_trades Users can create follow trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create follow trades" ON public.follow_trades FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: futures_orders Users can create own futures orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own futures orders" ON public.futures_orders FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: futures_positions Users can create own futures positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own futures positions" ON public.futures_positions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: otc_orders Users can create own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own orders" ON public.otc_orders FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: second_contract_orders Users can create own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own orders" ON public.second_contract_orders FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: trade_orders Users can create own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own orders" ON public.trade_orders FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: perpetual_positions Users can create own positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own positions" ON public.perpetual_positions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: stock_orders Users can create own stock orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own stock orders" ON public.stock_orders FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: earn_subscriptions Users can create own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own subscriptions" ON public.earn_subscriptions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: expert_strategy_subscriptions Users can create own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own subscriptions" ON public.expert_strategy_subscriptions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_withdrawal_addresses Users can create own withdrawal addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own withdrawal addresses" ON public.user_withdrawal_addresses FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: withdraw_records Users can create their own withdraw requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own withdraw requests" ON public.withdraw_records FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_withdrawal_addresses Users can delete own withdrawal addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own withdrawal addresses" ON public.user_withdrawal_addresses FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: cs_messages Users can insert messages in own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages in own conversations" ON public.cs_messages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.cs_conversations
  WHERE ((cs_conversations.id = cs_messages.conversation_id) AND (cs_conversations.user_id = auth.uid())))));


--
-- Name: user_feedback Users can insert own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) OR (user_id IS NULL)));


--
-- Name: kyc_verifications Users can insert own kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own kyc" ON public.kyc_verifications FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((id = auth.uid()));


--
-- Name: user_roles Users can insert own role on signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own role on signup" ON public.user_roles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: api_keys Users can manage own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own API keys" ON public.api_keys TO authenticated USING ((user_id = auth.uid()));


--
-- Name: strategies Users can manage own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own strategies" ON public.strategies TO authenticated USING ((user_id = auth.uid()));


--
-- Name: profiles Users can only view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can only view own profile" ON public.profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: user_withdrawal_addresses Users can update own withdrawal addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own withdrawal addresses" ON public.user_withdrawal_addresses FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: kyc_verifications Users can update pending kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update pending kyc" ON public.kyc_verifications FOR UPDATE USING (((user_id = auth.uid()) AND (status = 'pending'::text)));


--
-- Name: cs_messages Users can view messages in own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in own conversations" ON public.cs_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.cs_conversations
  WHERE ((cs_conversations.id = cs_messages.conversation_id) AND (cs_conversations.user_id = auth.uid())))));


--
-- Name: otp_attempts Users can view own OTP attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own OTP attempts" ON public.otp_attempts FOR SELECT USING ((phone IN ( SELECT users.phone
   FROM auth.users
  WHERE (users.id = auth.uid()))));


--
-- Name: audit_logs Users can view own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_balances Users can view own balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own balances" ON public.user_balances FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: cs_conversations Users can view own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own conversations" ON public.cs_conversations FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_feedback Users can view own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own feedback" ON public.user_feedback FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: follow_trades Users can view own follow trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own follow trades" ON public.follow_trades FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: futures_orders Users can view own futures orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own futures orders" ON public.futures_orders FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: futures_positions Users can view own futures positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own futures positions" ON public.futures_positions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: kyc_verifications Users can view own kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own kyc" ON public.kyc_verifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: otc_orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.otc_orders FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: second_contract_orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.second_contract_orders FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: trade_orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.trade_orders FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: perpetual_positions Users can view own positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own positions" ON public.perpetual_positions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_balance_snapshots Users can view own snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own snapshots" ON public.user_balance_snapshots FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: stock_orders Users can view own stock orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own stock orders" ON public.stock_orders FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: stock_positions Users can view own stock positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own stock positions" ON public.stock_positions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: earn_subscriptions Users can view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscriptions" ON public.earn_subscriptions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: expert_strategy_subscriptions Users can view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscriptions" ON public.expert_strategy_subscriptions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_withdrawal_addresses Users can view own withdrawal addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own withdrawal addresses" ON public.user_withdrawal_addresses FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: deposit_records Users can view their own deposit records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own deposit records" ON public.deposit_records FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: withdraw_records Users can view their own withdraw records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own withdraw records" ON public.withdraw_records FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: admin_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: crypto_news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crypto_news ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_quick_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_quick_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: cs_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cs_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: deposit_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: deposit_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deposit_records ENABLE ROW LEVEL SECURITY;

--
-- Name: earn_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.earn_products ENABLE ROW LEVEL SECURITY;

--
-- Name: earn_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.earn_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: expert_showcases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expert_showcases ENABLE ROW LEVEL SECURITY;

--
-- Name: expert_strategies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expert_strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: expert_strategy_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expert_strategy_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: follow_trades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follow_trades ENABLE ROW LEVEL SECURITY;

--
-- Name: futures_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.futures_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: futures_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.futures_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: futures_positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.futures_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: kyc_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: otc_merchants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otc_merchants ENABLE ROW LEVEL SECURITY;

--
-- Name: otc_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otc_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: otc_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otc_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: otp_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: perpetual_positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perpetual_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: second_contract_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.second_contract_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_symbols; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_symbols ENABLE ROW LEVEL SECURITY;

--
-- Name: strategies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: system_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: time_contract_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_contract_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: time_contract_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_contract_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: trade_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trade_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: user_announcement_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_announcement_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: user_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_balance_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_balance_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: user_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_withdrawal_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_withdrawal_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_nonces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_nonces ENABLE ROW LEVEL SECURITY;

--
-- Name: withdraw_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdraw_records ENABLE ROW LEVEL SECURITY;

--
-- Name: user_announcement_reads 用户可以创建自己的已读记录; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "用户可以创建自己的已读记录" ON public.user_announcement_reads FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_announcements 用户可以查看发给自己的公告; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "用户可以查看发给自己的公告" ON public.user_announcements FOR SELECT USING (((is_active = true) AND ((target_type = 'all'::text) OR (auth.uid() = ANY (target_user_ids)))));


--
-- Name: user_announcement_reads 用户可以查看自己的已读记录; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "用户可以查看自己的已读记录" ON public.user_announcement_reads FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_announcement_reads 管理员可以查看所有已读记录; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可以查看所有已读记录" ON public.user_announcement_reads FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_announcements 管理员可以管理公告; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可以管理公告" ON public.user_announcements USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- PostgreSQL database dump complete
--




COMMIT;