-- ==========================================================================
-- ARENA LIVE EVENT: 100% DATABASE-NATIVE MULTIPLAYER CHESS SCHEMA
-- Zero Edge Functions Required — Complete In-Database Turn, Clock, & Device Verification
-- PostgreSQL 17 + Supavisor Pooler + Supabase Realtime
-- ==========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================
-- 1. CHESS GAMES TABLE
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.chess_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    white_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    black_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn TEXT NOT NULL DEFAULT '',
    turn CHAR(1) NOT NULL DEFAULT 'w' CHECK (turn IN ('w', 'b')),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
        status IN ('waiting', 'in_progress', 'checkmate', 'stalemate', 'draw_agreed', 'timeout', 'resigned', 'abandoned')
    ),
    winner_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    end_reason TEXT,
    time_control_sec INTEGER NOT NULL DEFAULT 300,
    white_time_left_ms INTEGER NOT NULL DEFAULT 300000,
    black_time_left_ms INTEGER NOT NULL DEFAULT 300000,
    last_move_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_different_players CHECK (white_player_id <> black_player_id)
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_chess_games_white ON public.chess_games (white_player_id);
CREATE INDEX IF NOT EXISTS idx_chess_games_black ON public.chess_games (black_player_id);
CREATE INDEX IF NOT EXISTS idx_chess_games_winner ON public.chess_games (winner_id);
CREATE INDEX IF NOT EXISTS idx_chess_games_status ON public.chess_games (status);
CREATE INDEX IF NOT EXISTS idx_chess_games_active ON public.chess_games (status, last_move_at DESC) 
    WHERE status = 'in_progress';

-- ==========================================================================
-- 2. CHESS CHALLENGES & MATCHMAKING TABLE
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.chess_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    challenged_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'declined', 'expired')
    ),
    game_id UUID REFERENCES public.chess_games(id) ON DELETE CASCADE,
    time_control_sec INTEGER NOT NULL DEFAULT 300,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 minutes')
);

CREATE INDEX IF NOT EXISTS idx_chess_challenges_challenger ON public.chess_challenges (challenger_id);
CREATE INDEX IF NOT EXISTS idx_chess_challenges_challenged ON public.chess_challenges (challenged_id);
CREATE INDEX IF NOT EXISTS idx_chess_challenges_open ON public.chess_challenges (status, challenged_id, expires_at)
    WHERE status = 'pending' AND challenged_id IS NULL;

-- Enable Realtime Replication
ALTER TABLE public.chess_games REPLICA IDENTITY FULL;
ALTER TABLE public.chess_challenges REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_games;
    EXCEPTION WHEN duplicate_object THEN
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_challenges;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.chess_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chess_challenges ENABLE ROW LEVEL SECURITY;

-- Transparent Public Read for Realtime Sync
DROP POLICY IF EXISTS "Allow public read chess_games" ON public.chess_games;
CREATE POLICY "Allow public read chess_games" 
    ON public.chess_games FOR SELECT 
    TO anon, authenticated 
    USING (true);

DROP POLICY IF EXISTS "Allow public read chess_challenges" ON public.chess_challenges;
CREATE POLICY "Allow public read chess_challenges" 
    ON public.chess_challenges FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- Drop public INSERT/UPDATE on challenges; all mutations go through SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Allow public insert chess_challenges" ON public.chess_challenges;
DROP POLICY IF EXISTS "Allow public update chess_challenges" ON public.chess_challenges;

-- ==========================================================================
-- 3. ATOMIC RPC: JOIN OR CREATE MATCHMAKING (With Advisory Lock & Photo Check)
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_players_avatar_photo ON public.players (id) 
WHERE avatar ~* '^(https?://|/storage/|data:|blob:)';

CREATE OR REPLACE FUNCTION public.join_or_create_chess_matchmaking(
    p_player_id UUID,
    p_time_control_sec INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_player public.players%ROWTYPE;
    v_existing_game public.chess_games%ROWTYPE;
    v_open_challenge public.chess_challenges%ROWTYPE;
    v_new_game_id UUID;
    v_is_white BOOLEAN;
    v_white_id UUID;
    v_black_id UUID;
BEGIN
    -- Serialization lock prevents concurrent queue race collisions
    PERFORM pg_advisory_xact_lock(hashtext('chess_matchmaking_pool'));

    -- 0. Check whether requesting player exists and has uploaded their profile photo
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Player not found');
    END IF;

    IF v_player.avatar IS NULL OR v_player.avatar !~* '^(https?://|/storage/|data:|blob:)' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'action', 'photo_required',
            'message', 'Please upload a profile photo before entering 1v1 matchmaking.'
        );
    END IF;

    -- 1. Check if player already has an ongoing active game
    SELECT * INTO v_existing_game
    FROM public.chess_games
    WHERE (white_player_id = p_player_id OR black_player_id = p_player_id)
      AND status = 'in_progress'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'action', 'reconnected',
            'game_id', v_existing_game.id,
            'color', CASE WHEN v_existing_game.white_player_id = p_player_id THEN 'w' ELSE 'b' END
        );
    END IF;

    -- 2. Lock and find an available open challenge from another player WHO ALSO HAS AN UPLOADED PHOTO
    SELECT c.* INTO v_open_challenge
    FROM public.chess_challenges c
    JOIN public.players p ON p.id = c.challenger_id
    WHERE c.status = 'pending'
      AND c.challenged_id IS NULL
      AND c.challenger_id <> p_player_id
      AND c.expires_at > NOW()
      AND p.avatar ~* '^(https?://|/storage/|data:|blob:)'
    ORDER BY c.created_at ASC
    LIMIT 1
    FOR UPDATE OF c SKIP LOCKED;

    IF FOUND THEN
        v_is_white := (random() > 0.5);
        IF v_is_white THEN
            v_white_id := p_player_id;
            v_black_id := v_open_challenge.challenger_id;
        ELSE
            v_white_id := v_open_challenge.challenger_id;
            v_black_id := p_player_id;
        END IF;

        INSERT INTO public.chess_games (
            white_player_id,
            black_player_id,
            time_control_sec,
            white_time_left_ms,
            black_time_left_ms,
            status,
            turn,
            last_move_at
        ) VALUES (
            v_white_id,
            v_black_id,
            p_time_control_sec,
            p_time_control_sec * 1000,
            p_time_control_sec * 1000,
            'in_progress',
            'w',
            NOW()
        ) RETURNING id INTO v_new_game_id;

        UPDATE public.chess_challenges
        SET status = 'accepted',
            game_id = v_new_game_id
        WHERE id = v_open_challenge.id;

        RETURN jsonb_build_object(
            'success', TRUE,
            'action', 'matched',
            'game_id', v_new_game_id,
            'color', CASE WHEN v_white_id = p_player_id THEN 'w' ELSE 'b' END,
            'opponent_id', v_open_challenge.challenger_id
        );
    END IF;

    -- 3. Cancel any prior stale open challenges from this player
    UPDATE public.chess_challenges
    SET status = 'expired'
    WHERE challenger_id = p_player_id
      AND status = 'pending';

    -- 4. Register new pending challenge
    INSERT INTO public.chess_challenges (
        challenger_id,
        challenged_id,
        time_control_sec,
        status,
        expires_at
    ) VALUES (
        p_player_id,
        NULL,
        p_time_control_sec,
        'pending',
        NOW() + INTERVAL '2 minutes'
    ) RETURNING * INTO v_open_challenge;

    RETURN jsonb_build_object(
        'success', TRUE,
        'action', 'waiting',
        'challenge_id', v_open_challenge.id
    );
END;
$$;

-- ==========================================================================
-- 4. ATOMIC RPC: CANCEL QUEUE MATCHMAKING (With Advisory Lock & Match Detection)
-- ==========================================================================
DROP FUNCTION IF EXISTS public.cancel_chess_matchmaking(UUID, UUID);

CREATE OR REPLACE FUNCTION public.cancel_chess_matchmaking(
    p_challenge_id UUID,
    p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ch public.chess_challenges%ROWTYPE;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('chess_matchmaking_pool'));

    SELECT * INTO v_ch
    FROM public.chess_challenges
    WHERE id = p_challenge_id AND challenger_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', TRUE, 'action', 'none');
    END IF;

    IF v_ch.status = 'accepted' THEN
        RETURN jsonb_build_object('success', TRUE, 'action', 'matched', 'game_id', v_ch.game_id);
    END IF;

    UPDATE public.chess_challenges
    SET status = 'expired'
    WHERE id = p_challenge_id AND status = 'pending';

    RETURN jsonb_build_object('success', TRUE, 'action', 'cancelled');
END;
$$;

-- ==========================================================================
-- 5. ATOMIC RPC: DIRECT CHALLENGE & REAL-TIME NOTIFICATIONS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'general' CHECK (
        type IN ('chess_challenge', 'general', 'quest', 'announcement', 'achievement')
    ),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_status TEXT DEFAULT 'pending' CHECK (
        action_status IN ('pending', 'accepted', 'declined', 'expired')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_notifications_player ON public.notifications (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (player_id) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_challenge ON public.notifications ((data->>'challenge_id')) WHERE type = 'chess_challenge';

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read notifications" ON public.notifications;
CREATE POLICY "Allow public read notifications" ON public.notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow public update notifications" ON public.notifications;
CREATE POLICY "Allow public update notifications" ON public.notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public insert notifications" ON public.notifications;
CREATE POLICY "Allow public insert notifications" ON public.notifications FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Ensure anon & authenticated roles have full table permissions (subject to RLS)
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.create_direct_chess_challenge(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.create_direct_chess_challenge(UUID, UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.create_direct_chess_challenge(
    p_challenger_id UUID,
    p_challenged_id UUID DEFAULT NULL,
    p_challenged_guest_id TEXT DEFAULT NULL,
    p_time_control_sec INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_challenger public.players%ROWTYPE;
    v_challenged public.players%ROWTYPE;
    v_target_id UUID;
    v_challenge_id UUID;
    v_notification_id UUID;
BEGIN
    -- 1. Validate challenger
    SELECT * INTO v_challenger FROM public.players WHERE id = p_challenger_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Challenger player not found');
    END IF;

    -- Mandatory Photo Check on Challenger
    IF v_challenger.avatar IS NULL OR v_challenger.avatar !~* '^(https?://|/storage/|data:|blob:)' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'action', 'photo_required',
            'message', 'Please upload your profile photo before sending a 1v1 challenge.'
        );
    END IF;

    -- 2. Resolve challenged player by UUID or canonical Guest ID
    v_target_id := p_challenged_id;
    IF v_target_id IS NULL AND p_challenged_guest_id IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.players WHERE LOWER(guest_id) = LOWER(TRIM(p_challenged_guest_id));
    END IF;

    IF v_target_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Opponent player not found in database');
    END IF;

    IF p_challenger_id = v_target_id THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'You cannot challenge yourself to a duel!');
    END IF;

    SELECT * INTO v_challenged FROM public.players WHERE id = v_target_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Opponent player record not found');
    END IF;

    -- Mandatory Photo Check on Opponent
    IF v_challenged.avatar IS NULL OR v_challenged.avatar !~* '^(https?://|/storage/|data:|blob:)' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'action', 'opponent_photo_missing',
            'message', v_challenged.name || ' has not uploaded a profile photo yet.'
        );
    END IF;

    -- 3. Expire prior pending challenges & notifications between these players
    UPDATE public.chess_challenges
    SET status = 'expired'
    WHERE challenger_id = p_challenger_id
      AND challenged_id = v_target_id
      AND status = 'pending';

    UPDATE public.notifications
    SET action_status = 'expired',
        is_read = TRUE
    WHERE player_id = v_target_id
      AND sender_id = p_challenger_id
      AND type = 'chess_challenge'
      AND action_status = 'pending';

    -- 4. Create new pending challenge
    INSERT INTO public.chess_challenges (
        challenger_id,
        challenged_id,
        time_control_sec,
        status,
        expires_at
    ) VALUES (
        p_challenger_id,
        v_target_id,
        p_time_control_sec,
        'pending',
        NOW() + INTERVAL '3 minutes'
    ) RETURNING id INTO v_challenge_id;

    -- 5. Atomically insert Real-time Notification for the challenged player
    INSERT INTO public.notifications (
        player_id,
        sender_id,
        type,
        title,
        message,
        data,
        action_status,
        expires_at
    ) VALUES (
        v_target_id,
        p_challenger_id,
        'chess_challenge',
        '1v1 Chess Challenge',
        v_challenger.name || ' challenged you to a ' || (p_time_control_sec / 60)::TEXT || 'm Blitz duel!',
        jsonb_build_object(
            'challenge_id', v_challenge_id,
            'challenger_id', v_challenger.id,
            'challenger_name', v_challenger.name,
            'challenger_guest_id', v_challenger.guest_id,
            'challenger_avatar', v_challenger.avatar,
            'time_control_sec', p_time_control_sec
        ),
        'pending',
        NOW() + INTERVAL '3 minutes'
    ) RETURNING id INTO v_notification_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'challenge_id', v_challenge_id,
        'notification_id', v_notification_id,
        'challenged_name', v_challenged.name,
        'challenged_id', v_target_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_chess_challenge(UUID, UUID, TEXT, INTEGER) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.respond_direct_chess_challenge(
    p_challenge_id UUID,
    p_player_id UUID,
    p_accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_challenge public.chess_challenges%ROWTYPE;
    v_responder public.players%ROWTYPE;
    v_new_game_id UUID;
    v_is_white BOOLEAN;
    v_white_id UUID;
    v_black_id UUID;
BEGIN
    -- 1. If declining, always succeed and clean up notifications and challenge even if expired!
    IF NOT p_accept THEN
        UPDATE public.chess_challenges 
        SET status = 'declined' 
        WHERE id = p_challenge_id;

        UPDATE public.notifications
        SET action_status = 'declined',
            is_read = TRUE
        WHERE data->>'challenge_id' = p_challenge_id::TEXT
           OR (player_id = p_player_id AND data->>'challenge_id' = p_challenge_id::TEXT);

        -- Alert the challenger (scanner player) that their challenge was declined
        INSERT INTO public.notifications (
            player_id,
            sender_id,
            type,
            title,
            message,
            data,
            action_status,
            is_read
        )
        SELECT 
            c.challenger_id,
            p_player_id,
            'general',
            'Challenge Declined',
            COALESCE(p.name, p.guest_id) || ' declined your 1v1 chess duel request.',
            jsonb_build_object('challenge_id', p_challenge_id),
            'declined',
            FALSE
        FROM public.chess_challenges c
        JOIN public.players p ON p.id = p_player_id
        WHERE c.id = p_challenge_id;

        RETURN jsonb_build_object('success', TRUE, 'action', 'declined');
    END IF;

    -- 2. If accepting, check active challenge
    SELECT * INTO v_challenge
    FROM public.chess_challenges
    WHERE id = p_challenge_id
      AND challenged_id = p_player_id
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Auto-expire notification so user is not stuck with pending state
        UPDATE public.notifications
        SET action_status = 'expired',
            is_read = TRUE
        WHERE data->>'challenge_id' = p_challenge_id::TEXT;

        RETURN jsonb_build_object('success', FALSE, 'message', 'Challenge not found or already expired');
    END IF;

    -- Verify responder photo
    SELECT * INTO v_responder FROM public.players WHERE id = p_player_id;
    IF v_responder.avatar IS NULL OR v_responder.avatar !~* '^(https?://|/storage/|data:|blob:)' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'action', 'photo_required',
            'message', 'Please upload a profile photo before accepting a 1v1 challenge.'
        );
    END IF;

    -- Assign random colors
    v_is_white := (random() > 0.5);
    IF v_is_white THEN
        v_white_id := v_challenge.challenger_id;
        v_black_id := p_player_id;
    ELSE
        v_white_id := p_player_id;
        v_black_id := v_challenge.challenger_id;
    END IF;

    -- Create live game
    INSERT INTO public.chess_games (
        white_player_id,
        black_player_id,
        time_control_sec,
        white_time_left_ms,
        black_time_left_ms,
        status,
        turn,
        last_move_at
    ) VALUES (
        v_white_id,
        v_black_id,
        v_challenge.time_control_sec,
        v_challenge.time_control_sec * 1000,
        v_challenge.time_control_sec * 1000,
        'in_progress',
        'w',
        NOW()
    ) RETURNING id INTO v_new_game_id;

    -- Update challenge status
    UPDATE public.chess_challenges
    SET status = 'accepted',
        game_id = v_new_game_id
    WHERE id = p_challenge_id;

    -- Update notification status
    UPDATE public.notifications
    SET action_status = 'accepted',
        is_read = TRUE,
        data = data || jsonb_build_object('game_id', v_new_game_id)
    WHERE data->>'challenge_id' = p_challenge_id::TEXT;

    RETURN jsonb_build_object(
        'success', TRUE,
        'action', 'matched',
        'game_id', v_new_game_id,
        'color', CASE WHEN v_white_id = p_player_id THEN 'w' ELSE 'b' END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_direct_chess_challenge(UUID, UUID, BOOLEAN) TO anon, authenticated;

-- ==========================================================================
-- 6. ATOMIC RPC: SUBMIT MOVE (Direct DB Mode with Device Verification)
-- ==========================================================================
DROP FUNCTION IF EXISTS public.submit_chess_move(UUID, UUID, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.submit_chess_move(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.submit_chess_move(
    p_game_id UUID,
    p_player_id UUID,
    p_device_id TEXT,
    p_new_fen TEXT,
    p_new_pgn TEXT,
    p_is_game_over BOOLEAN DEFAULT FALSE,
    p_end_status TEXT DEFAULT NULL,
    p_winner_id UUID DEFAULT NULL,
    p_end_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_game public.chess_games%ROWTYPE;
    v_elapsed_ms INTEGER;
    v_new_white_ms INTEGER;
    v_new_black_ms INTEGER;
    v_next_turn CHAR(1);
    v_old_ply INT;
    v_new_ply INT;
    v_w_old INT;
    v_b_old INT;
    v_w_new INT;
    v_b_new INT;
BEGIN
    -- 1. Security Identity Check: Device UUID must match player_id in private player_devices table
    IF NOT EXISTS (
        SELECT 1 FROM public.player_devices 
        WHERE player_id = p_player_id AND device_id = p_device_id
    ) THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Unauthorized: Device credential mismatch');
    END IF;

    -- 2. Concurrency Lock per game
    PERFORM pg_advisory_xact_lock(hashtext(p_game_id::TEXT));

    SELECT * INTO v_game
    FROM public.chess_games
    WHERE id = p_game_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game not found');
    END IF;

    IF v_game.status <> 'in_progress' THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game is already finished', 'status', v_game.status);
    END IF;

    -- 3. Turn Validation: Is it actually this player's turn?
    IF (v_game.turn = 'w' AND v_game.white_player_id <> p_player_id) OR
       (v_game.turn = 'b' AND v_game.black_player_id <> p_player_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Not your turn');
    END IF;

    -- 4. Authoritative Clock Deduction & Flag-Fall Check
    v_elapsed_ms := GREATEST(0, (EXTRACT(EPOCH FROM (NOW() - v_game.last_move_at)) * 1000)::INTEGER);
    v_new_white_ms := v_game.white_time_left_ms;
    v_new_black_ms := v_game.black_time_left_ms;

    IF v_game.turn = 'w' THEN
        v_new_white_ms := v_new_white_ms - v_elapsed_ms;
        IF v_new_white_ms <= 0 THEN
            RETURN public.settle_chess_game(p_game_id, 'timeout', v_game.black_player_id, 'flag_fall');
        END IF;
        v_next_turn := 'b';
    ELSE
        v_new_black_ms := v_new_black_ms - v_elapsed_ms;
        IF v_new_black_ms <= 0 THEN
            RETURN public.settle_chess_game(p_game_id, 'timeout', v_game.white_player_id, 'flag_fall');
        END IF;
        v_next_turn := 'w';
    END IF;

    -- 4.5 Move & Position Integrity Validation (Anti-Tampering)
    IF p_new_fen !~ '^[1-8prnbqkPRNBQK/]+ [wb] \S+ \S+ [0-9]+ [0-9]+$'
       OR array_length(string_to_array(split_part(p_new_fen,' ',1),'/'),1) <> 8
       OR split_part(p_new_fen,' ',2) <> v_next_turn THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid position format');
    END IF;

    v_old_ply := (split_part(v_game.fen,' ',6)::INT - 1)*2 + (split_part(v_game.fen,' ',2) = 'b')::INT;
    v_new_ply := (split_part(p_new_fen,' ',6)::INT - 1)*2 + (split_part(p_new_fen,' ',2) = 'b')::INT;
    IF v_new_ply <> v_old_ply + 1 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid move sequence');
    END IF;

    v_w_old := length(regexp_replace(split_part(v_game.fen,' ',1), '[^A-Z]', '', 'g'));
    v_b_old := length(regexp_replace(split_part(v_game.fen,' ',1), '[^a-z]', '', 'g'));
    v_w_new := length(regexp_replace(split_part(p_new_fen,' ',1), '[^A-Z]', '', 'g'));
    v_b_new := length(regexp_replace(split_part(p_new_fen,' ',1), '[^a-z]', '', 'g'));

    IF (v_game.turn = 'w' AND (v_w_new <> v_w_old OR v_b_new NOT IN (v_b_old, v_b_old - 1)))
       OR (v_game.turn = 'b' AND (v_b_new <> v_b_old OR v_w_new NOT IN (v_w_old, v_w_old - 1))) THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid move: piece count violation');
    END IF;

    IF p_is_game_over AND NOT ((p_end_status = 'checkmate' AND v_new_ply >= 4) OR p_end_status = 'stalemate') THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid game result');
    END IF;

    -- 5. Commit move and updated clocks
    UPDATE public.chess_games
    SET fen = p_new_fen,
        pgn = p_new_pgn,
        turn = v_next_turn,
        white_time_left_ms = v_new_white_ms,
        black_time_left_ms = v_new_black_ms,
        last_move_at = NOW(),
        updated_at = NOW()
    WHERE id = p_game_id;

    -- 6. If checkmate or draw, settle points atomically (Winner derived authoritatively)
    IF p_is_game_over THEN
        RETURN public.settle_chess_game(
            p_game_id,
            p_end_status,
            CASE WHEN p_end_status = 'checkmate' THEN p_player_id ELSE NULL END,
            COALESCE(p_end_reason, p_end_status)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'turn', v_next_turn,
        'white_time_left_ms', v_new_white_ms,
        'black_time_left_ms', v_new_black_ms
    );
END;
$$;

-- ==========================================================================
-- 7. ATOMIC RPC: RESIGN GAME (With Device Verification)
-- ==========================================================================
DROP FUNCTION IF EXISTS public.resign_chess_game(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.resign_chess_game(
    p_game_id UUID,
    p_player_id UUID,
    p_device_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_game public.chess_games%ROWTYPE;
    v_winner_id UUID;
BEGIN
    -- Verify device identity using private player_devices table
    IF NOT EXISTS (
        SELECT 1 FROM public.player_devices 
        WHERE player_id = p_player_id AND device_id = p_device_id
    ) THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Unauthorized: Device mismatch');
    END IF;

    SELECT * INTO v_game
    FROM public.chess_games
    WHERE id = p_game_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game not found');
    END IF;

    IF v_game.status <> 'in_progress' THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game already ended');
    END IF;

    IF p_player_id = v_game.white_player_id THEN
        v_winner_id := v_game.black_player_id;
    ELSIF p_player_id = v_game.black_player_id THEN
        v_winner_id := v_game.white_player_id;
    ELSE
        RETURN jsonb_build_object('success', FALSE, 'message', 'Not a participant in this game');
    END IF;

    RETURN public.settle_chess_game(p_game_id, 'resigned', v_winner_id, 'resignation');
END;
$$;

-- ==========================================================================
-- 8. ATOMIC RPC: SETTLE CHESS GAME & AWARD LEADERBOARD POINTS
-- ==========================================================================
DROP FUNCTION IF EXISTS public.settle_chess_game(UUID, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.settle_chess_game(
    p_game_id UUID,
    p_status TEXT,
    p_winner_id UUID DEFAULT NULL,
    p_end_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_game public.chess_games%ROWTYPE;
    v_points_win INTEGER := 100;
    v_points_draw INTEGER := 50;
    v_points_loss INTEGER := 10;
    v_loser_id UUID;
    v_ply_count INTEGER := 0;
BEGIN
    SELECT * INTO v_game
    FROM public.chess_games
    WHERE id = p_game_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game not found');
    END IF;

    -- Idempotency check: Don't re-award points if already completed
    IF v_game.status <> 'in_progress' AND v_game.end_reason IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'status', v_game.status,
            'winner_id', v_game.winner_id,
            'message', 'Already settled'
        );
    END IF;

    -- Anti-Point-Farming Guard: Require minimum 10 plies (5 moves per side) before resignation awards points
    v_ply_count := (split_part(v_game.fen,' ',6)::INT - 1)*2 + (split_part(v_game.fen,' ',2) = 'b')::INT;

    IF p_status = 'resigned' AND v_ply_count < 10 THEN
        UPDATE public.chess_games
        SET status = 'abandoned',
            winner_id = p_winner_id,
            end_reason = 'early_resignation_no_points',
            points_awarded = 0,
            updated_at = NOW()
        WHERE id = p_game_id;

        RETURN jsonb_build_object(
            'success', TRUE,
            'status', 'abandoned',
            'winner_id', p_winner_id,
            'end_reason', 'early_resignation_no_points',
            'points_awarded', 0
        );
    END IF;

    -- Update game status & points_awarded
    UPDATE public.chess_games
    SET status = p_status,
        winner_id = p_winner_id,
        end_reason = COALESCE(p_end_reason, 'standard'),
        points_awarded = CASE
            WHEN p_winner_id IS NOT NULL THEN v_points_win
            WHEN p_status IN ('stalemate', 'draw_agreed') THEN v_points_draw
            ELSE v_points_loss
        END,
        updated_at = NOW()
    WHERE id = p_game_id;

    -- Award Arena points
    IF p_status IN ('checkmate', 'timeout', 'resigned') AND p_winner_id IS NOT NULL THEN
        IF p_winner_id = v_game.white_player_id THEN
            v_loser_id := v_game.black_player_id;
        ELSE
            v_loser_id := v_game.white_player_id;
        END IF;

        -- Winner gets +100
        UPDATE public.players
        SET total_score = total_score + v_points_win,
            rounds_played = rounds_played + 1,
            updated_at = NOW()
        WHERE id = p_winner_id;

        -- Loser gets +10
        IF v_loser_id IS NOT NULL THEN
            UPDATE public.players
            SET total_score = total_score + v_points_loss,
                rounds_played = rounds_played + 1,
                updated_at = NOW()
            WHERE id = v_loser_id;
        END IF;

    ELSIF p_status IN ('stalemate', 'draw_agreed') THEN
        -- Draw gets +50 each
        UPDATE public.players
        SET total_score = total_score + v_points_draw,
            rounds_played = rounds_played + 1,
            updated_at = NOW()
        WHERE id IN (v_game.white_player_id, v_game.black_player_id);
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'status', p_status,
        'winner_id', p_winner_id,
        'end_reason', p_end_reason
    );
END;
$$;

-- ==========================================================================
-- 9. ATOMIC RPC: CLAIM TIMEOUT (Flag-Fall Protection)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.claim_chess_timeout(
    p_game_id UUID,
    p_claiming_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_game public.chess_games%ROWTYPE;
    v_elapsed_ms INTEGER;
    v_active_time_left INTEGER;
    v_winner_id UUID;
BEGIN
    SELECT * INTO v_game
    FROM public.chess_games
    WHERE id = p_game_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game not found');
    END IF;

    IF v_game.status <> 'in_progress' THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game is not active', 'status', v_game.status);
    END IF;

    v_elapsed_ms := GREATEST(0, (EXTRACT(EPOCH FROM (NOW() - v_game.last_move_at)) * 1000)::INTEGER);

    IF v_game.turn = 'w' THEN
        v_active_time_left := v_game.white_time_left_ms - v_elapsed_ms;
        v_winner_id := v_game.black_player_id;
    ELSE
        v_active_time_left := v_game.black_time_left_ms - v_elapsed_ms;
        v_winner_id := v_game.white_player_id;
    END IF;

    IF v_active_time_left <= 0 THEN
        RETURN public.settle_chess_game(p_game_id, 'timeout', v_winner_id, 'flag_fall');
    ELSE
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Player has not timed out yet',
            'time_remaining_ms', v_active_time_left
        );
    END IF;
END;
$$;

-- ==========================================================================
-- 10. AUTOMATED SWEEPER: SETTLE EXPIRED INACTIVE GAMES
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.sweep_expired_chess_games()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_game RECORD;
    v_count INTEGER := 0;
    v_elapsed_ms INTEGER;
    v_winner_id UUID;
BEGIN
    FOR v_game IN
        SELECT *
        FROM public.chess_games
        WHERE status = 'in_progress'
        FOR UPDATE SKIP LOCKED
    LOOP
        v_elapsed_ms := GREATEST(0, (EXTRACT(EPOCH FROM (NOW() - v_game.last_move_at)) * 1000)::INTEGER);
        
        IF (v_game.turn = 'w' AND (v_game.white_time_left_ms - v_elapsed_ms) <= 0) THEN
            v_winner_id := v_game.black_player_id;
            PERFORM public.settle_chess_game(v_game.id, 'timeout', v_winner_id, 'flag_fall_swept');
            v_count := v_count + 1;
        ELSIF (v_game.turn = 'b' AND (v_game.black_time_left_ms - v_elapsed_ms) <= 0) THEN
            v_winner_id := v_game.white_player_id;
            PERFORM public.settle_chess_game(v_game.id, 'timeout', v_winner_id, 'flag_fall_swept');
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ==========================================================================
-- 11. GRANT EXECUTE ON ALL SECURE RPCS TO CLIENT ROLES
-- ==========================================================================
-- Security Hardening: Revoke direct execution on internal settlement engine
REVOKE EXECUTE ON FUNCTION public.settle_chess_game(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- Drop legacy 8-parameter overload lacking device verification
DROP FUNCTION IF EXISTS public.submit_chess_move(UUID, UUID, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT);

GRANT EXECUTE ON FUNCTION public.join_or_create_chess_matchmaking(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_chess_matchmaking(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_chess_challenge(UUID, UUID, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_direct_chess_challenge(UUID, UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_chess_move(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resign_chess_game(UUID, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_chess_timeout(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_expired_chess_games() TO anon, authenticated;


-- ==========================================================================
-- 12. ATOMIC RPC: SERVER CURRENT TIME (Clock Skew Synchronization)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.server_now()
RETURNS TIMESTAMPTZ
LANGUAGE sql
VOLATILE
AS $$
    SELECT clock_timestamp();
$$;

GRANT EXECUTE ON FUNCTION public.server_now() TO anon, authenticated;
