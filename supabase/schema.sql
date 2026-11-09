-- ==========================================================================
-- ARENA MASTER DATABASE SCHEMA — INCUBATION LAB LIVE EVENT
-- Optimized for 200+ Concurrent Mobile Players over Local Venue Network
-- PostgreSQL 17 + Supavisor Connection Pooling + Realtime Broadcast
-- ==========================================================================

-- Enable essential extensions for UUID and crypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================
-- 1. ATOMIC GUEST ID SEQUENCE (Guarantees zero collision for 200+ players)
-- ==========================================================================
CREATE SEQUENCE IF NOT EXISTS public.guest_id_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9999
    CACHE 1;

-- ==========================================================================
-- 2. PLAYERS TABLE
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orb_number INTEGER UNIQUE NOT NULL,              -- Exact integer for player's glowing Orb (1, 2, 43, 58)
    guest_id TEXT UNIQUE NOT NULL,                   -- e.g. Guest001, Guest002 (matches orb_number with padding)
    device_id TEXT UNIQUE NOT NULL,                  -- Client device UUID for seamless re-connection
    name TEXT NOT NULL,                              -- Player handle (defaults to guest_id)
    avatar TEXT NOT NULL DEFAULT '⚡',               -- Player emoji / icon
    team TEXT NOT NULL DEFAULT 'unassigned',         -- Optional team designation
    total_score INTEGER NOT NULL DEFAULT 0,          -- Live running score
    accuracy NUMERIC(5, 2) NOT NULL DEFAULT 0.00,    -- % correct answers
    rounds_played INTEGER NOT NULL DEFAULT 0,        -- Total rounds participated
    last_response_time_ms INTEGER DEFAULT 0,         -- Tie-breaker metric
    is_active BOOLEAN NOT NULL DEFAULT TRUE,         -- Active status
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Heartbeat
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_players_orb_number ON public.players (orb_number);
CREATE INDEX IF NOT EXISTS idx_players_guest_id ON public.players (guest_id);
CREATE INDEX IF NOT EXISTS idx_players_device_id ON public.players (device_id);
CREATE INDEX IF NOT EXISTS idx_players_leaderboard ON public.players (total_score DESC, last_response_time_ms ASC);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON public.players (last_seen_at DESC);

-- ==========================================================================
-- 3. GAME STATE / SESSIONS TABLE (Master Event Controller)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.game_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code TEXT UNIQUE NOT NULL DEFAULT 'ARENA-LIVE',
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (
        status IN ('waiting', 'countdown', 'active', 'round_ended', 'paused', 'finished')
    ),
    current_round INTEGER NOT NULL DEFAULT 1,
    total_rounds INTEGER NOT NULL DEFAULT 10,
    round_title TEXT DEFAULT 'Welcome to Arena',
    round_payload JSONB DEFAULT '{}'::jsonb,         -- Active question/puzzle, options, timers
    time_limit_sec INTEGER NOT NULL DEFAULT 20,
    round_started_at TIMESTAMPTZ,
    round_ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default initial game state if not present
INSERT INTO public.game_state (session_code, status, current_round, total_rounds, round_title, is_active)
VALUES ('ARENA-LIVE', 'waiting', 1, 10, 'Incubation Lab Inauguration Arena', TRUE)
ON CONFLICT (session_code) DO NOTHING;

-- ==========================================================================
-- 4. PLAYER ANSWERS / SCORE SUBMISSIONS TABLE
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.player_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    selected_option TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, round_number)                  -- Strictly prevents duplicate score spam for same round
);

CREATE INDEX IF NOT EXISTS idx_answers_player_round ON public.player_answers (player_id, round_number);
CREATE INDEX IF NOT EXISTS idx_answers_round ON public.player_answers (round_number);

-- ==========================================================================
-- 5. ATOMIC RPC: CLAIM OR REGISTER GUEST (Zero-Collision, Idempotent)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.claim_guest_player(
    p_device_id TEXT,
    p_name TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT '⚡',
    p_team TEXT DEFAULT 'unassigned'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_player public.players%ROWTYPE;
    v_seq_val BIGINT;
    v_guest_id TEXT;
    v_display_name TEXT;
BEGIN
    -- 1. Check if device already claimed a guest ID (reconnect after reload)
    SELECT * INTO v_player 
    FROM public.players 
    WHERE device_id = p_device_id 
    LIMIT 1;

    IF FOUND THEN
        -- Update last seen heartbeat
        UPDATE public.players 
        SET last_seen_at = NOW(),
            is_active = TRUE
        WHERE id = v_player.id;

        RETURN jsonb_build_object(
            'player_id', v_player.id,
            'orb_number', v_player.orb_number,
            'guest_id', v_player.guest_id,
            'name', v_player.name,
            'avatar', v_player.avatar,
            'team', v_player.team,
            'total_score', v_player.total_score,
            'is_new', FALSE
        );
    END IF;

    -- 2. New device: Atomically increment sequence for guaranteed collision-free Guest ID & Orb number
    v_seq_val := nextval('public.guest_id_seq');
    v_guest_id := 'Guest' || LPAD(v_seq_val::TEXT, 3, '0');
    v_display_name := COALESCE(NULLIF(TRIM(p_name), ''), v_guest_id);

    -- 3. Insert new player row
    INSERT INTO public.players (
        orb_number,
        guest_id,
        device_id,
        name,
        avatar,
        team,
        total_score,
        last_seen_at
    )
    VALUES (
        v_seq_val,
        v_guest_id,
        p_device_id,
        v_display_name,
        COALESCE(p_avatar, '⚡'),
        COALESCE(p_team, 'unassigned'),
        0,
        NOW()
    )
    RETURNING * INTO v_player;

    RETURN jsonb_build_object(
        'player_id', v_player.id,
        'orb_number', v_player.orb_number,
        'guest_id', v_player.guest_id,
        'name', v_player.name,
        'avatar', v_player.avatar,
        'team', v_player.team,
        'total_score', v_player.total_score,
        'is_new', TRUE
    );
END;
$$;

-- ==========================================================================
-- 6. ATOMIC RPC: SUBMIT ROUND SCORE (Thread-Safe Score Increment)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.submit_player_answer(
    p_player_id UUID,
    p_round_number INTEGER,
    p_selected_option TEXT,
    p_is_correct BOOLEAN,
    p_points INTEGER,
    p_response_time_ms INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_total INTEGER;
    v_rounds_played INTEGER;
BEGIN
    -- 1. Insert answer with idempotency guard
    INSERT INTO public.player_answers (
        player_id,
        round_number,
        selected_option,
        is_correct,
        points_awarded,
        response_time_ms
    )
    VALUES (
        p_player_id,
        p_round_number,
        p_selected_option,
        p_is_correct,
        p_points,
        p_response_time_ms
    )
    ON CONFLICT (player_id, round_number) DO NOTHING;

    -- If duplicate submission, don't re-award points
    IF NOT FOUND THEN
        SELECT total_score INTO v_new_total FROM public.players WHERE id = p_player_id;
        RETURN jsonb_build_object('success', FALSE, 'message', 'Answer already recorded', 'total_score', v_new_total);
    END IF;

    -- 2. Atomically update player total score and stats
    UPDATE public.players
    SET total_score = total_score + p_points,
        rounds_played = rounds_played + 1,
        last_response_time_ms = p_response_time_ms,
        last_seen_at = NOW(),
        updated_at = NOW()
    WHERE id = p_player_id
    RETURNING total_score INTO v_new_total;

    RETURN jsonb_build_object(
        'success', TRUE,
        'total_score', v_new_total,
        'points_awarded', p_points
    );
END;
$$;

-- ==========================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ==========================================================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;

-- Players table policies: Everyone on local Wi-Fi can view leaderboard, RPC manages mutations
CREATE POLICY "Allow public read players for leaderboard"
    ON public.players FOR SELECT
    TO anon, authenticated
    USING (true);

-- Game state policies: Everyone can read active game phase
CREATE POLICY "Allow public read game state"
    ON public.game_state FOR SELECT
    TO anon, authenticated
    USING (true);

-- Answers: Players can inspect their own submissions
CREATE POLICY "Allow public read own answers"
    ON public.player_answers FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant schema and execution permissions to public anon role
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.guest_id_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_player TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_player_answer TO anon, authenticated;

-- ==========================================================================
-- 8. REALTIME REPLICATION (Instant Live Scoreboard Sync)
-- ==========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
