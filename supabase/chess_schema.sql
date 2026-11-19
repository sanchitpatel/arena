-- ==========================================================================
-- ARENA LIVE EVENT: HARDENED MULTIPLAYER CHESS SCHEMA
-- Production Hardening: Security Lock-Down, Advisory Locks, Sweeper & Points Fix
-- PostgreSQL 17 + Supavisor Pooler + Supabase Edge Function (Service Role Only)
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
    challenged_id UUID REFERENCES public.players(id) ON DELETE CASCADE, -- NULL = open matchmaking queue
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

-- SECURE: Drop dangerous public INSERT/UPDATE on challenges.
-- All writes must pass through SECURITY DEFINER RPCs!
DROP POLICY IF EXISTS "Allow public insert chess_challenges" ON public.chess_challenges;
DROP POLICY IF EXISTS "Allow public update chess_challenges" ON public.chess_challenges;

-- ==========================================================================
-- 3. ATOMIC RPC: JOIN OR CREATE MATCHMAKING (With Advisory Lock)
-- ==========================================================================
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
    v_existing_game public.chess_games%ROWTYPE;
    v_open_challenge public.chess_challenges%ROWTYPE;
    v_new_game_id UUID;
    v_is_white BOOLEAN;
    v_white_id UUID;
    v_black_id UUID;
BEGIN
    -- CRITICAL FIX 1: Serialization lock prevents 2 concurrent players from creating duplicate waiting rows
    PERFORM pg_advisory_xact_lock(hashtext('chess_matchmaking_pool'));

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

    -- 2. Lock and find an available open challenge from another player
    SELECT * INTO v_open_challenge
    FROM public.chess_challenges
    WHERE status = 'pending'
      AND challenged_id IS NULL
      AND challenger_id <> p_player_id
      AND expires_at > NOW()
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        -- Randomize White vs Black
        v_is_white := (random() > 0.5);
        IF v_is_white THEN
            v_white_id := p_player_id;
            v_black_id := v_open_challenge.challenger_id;
        ELSE
            v_white_id := v_open_challenge.challenger_id;
            v_black_id := p_player_id;
        END IF;

        -- Create game row
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

        -- Update challenge to accepted so the waiting player's realtime listener wakes up
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

    -- 4. Create new pending open challenge
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
-- 4. ATOMIC RPC: CANCEL QUEUE MATCHMAKING (Prevents Ghost Matchmaking)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.cancel_chess_matchmaking(
    p_challenge_id UUID,
    p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.chess_challenges
    SET status = 'expired'
    WHERE id = p_challenge_id
      AND challenger_id = p_player_id
      AND status = 'pending';

    RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- ==========================================================================
-- 5. ATOMIC RPC: DIRECT CHALLENGE (e.g. Scanned via QR)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.create_direct_chess_challenge(
    p_challenger_id UUID,
    p_challenged_id UUID,
    p_time_control_sec INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_challenge_id UUID;
BEGIN
    IF p_challenger_id = p_challenged_id THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Cannot challenge yourself');
    END IF;

    UPDATE public.chess_challenges
    SET status = 'expired'
    WHERE challenger_id = p_challenger_id
      AND challenged_id = p_challenged_id
      AND status = 'pending';

    INSERT INTO public.chess_challenges (
        challenger_id,
        challenged_id,
        time_control_sec,
        status,
        expires_at
    ) VALUES (
        p_challenger_id,
        p_challenged_id,
        p_time_control_sec,
        'pending',
        NOW() + INTERVAL '3 minutes'
    ) RETURNING id INTO v_challenge_id;

    RETURN jsonb_build_object('success', TRUE, 'challenge_id', v_challenge_id);
END;
$$;

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
    v_new_game_id UUID;
    v_is_white BOOLEAN;
    v_white_id UUID;
    v_black_id UUID;
BEGIN
    SELECT * INTO v_challenge
    FROM public.chess_challenges
    WHERE id = p_challenge_id
      AND challenged_id = p_player_id
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Challenge not found or expired');
    END IF;

    IF NOT p_accept THEN
        UPDATE public.chess_challenges SET status = 'declined' WHERE id = p_challenge_id;
        RETURN jsonb_build_object('success', TRUE, 'action', 'declined');
    END IF;

    v_is_white := (random() > 0.5);
    IF v_is_white THEN
        v_white_id := v_challenge.challenger_id;
        v_black_id := p_player_id;
    ELSE
        v_white_id := p_player_id;
        v_black_id := v_challenge.challenger_id;
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
        v_challenge.time_control_sec,
        v_challenge.time_control_sec * 1000,
        v_challenge.time_control_sec * 1000,
        'in_progress',
        'w',
        NOW()
    ) RETURNING id INTO v_new_game_id;

    UPDATE public.chess_challenges
    SET status = 'accepted',
        game_id = v_new_game_id
    WHERE id = p_challenge_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'action', 'accepted',
        'game_id', v_new_game_id,
        'color', CASE WHEN v_white_id = p_player_id THEN 'w' ELSE 'b' END
    );
END;
$$;

-- ==========================================================================
-- 6. ATOMIC RPC: SUBMIT MOVE (SERVICE ROLE ONLY - HARDENED)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.submit_chess_move(
    p_game_id UUID,
    p_player_id UUID,
    p_expected_fen TEXT,
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
BEGIN
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

    -- Concurrency Guard: reject if game board has already moved past expected FEN
    IF v_game.fen <> p_expected_fen THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Board state conflict. Move already processed.');
    END IF;

    -- Turn validation
    IF (v_game.turn = 'w' AND v_game.white_player_id <> p_player_id) OR
       (v_game.turn = 'b' AND v_game.black_player_id <> p_player_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Not your turn');
    END IF;

    -- Clock deduction
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

    -- CRITICAL FIX 2: Do NOT write final status or end_reason here!
    -- Update clocks, fen, and pgn first, then delegate termination exclusively to settle_chess_game.
    UPDATE public.chess_games
    SET fen = p_new_fen,
        pgn = p_new_pgn,
        turn = v_next_turn,
        white_time_left_ms = v_new_white_ms,
        black_time_left_ms = v_new_black_ms,
        last_move_at = NOW(),
        updated_at = NOW()
    WHERE id = p_game_id;

    IF p_is_game_over THEN
        -- Settle points and status exclusively in settle_chess_game
        RETURN public.settle_chess_game(p_game_id, p_end_status, p_winner_id, p_end_reason);
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
-- 7. ATOMIC RPC: SETTLE CHESS GAME & POINTS (SERVICE ROLE ONLY)
-- ==========================================================================
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

    -- Idempotency: If already settled, do not re-credit points
    IF v_game.status <> 'in_progress' AND v_game.end_reason IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'status', v_game.status,
            'winner_id', v_game.winner_id,
            'message', 'Already settled'
        );
    END IF;

    -- CRITICAL FIX 5 (Anti-Point-Farming Guard):
    -- Count approximate plies from PGN. If resigned or ended before 10 plies (5 moves per side),
    -- mark as 'abandoned' and award 0 points to prevent collusion.
    IF v_game.pgn <> '' THEN
        v_ply_count := array_length(regexp_split_to_array(TRIM(v_game.pgn), '\s+'), 1);
    END IF;

    IF p_status = 'resigned' AND v_ply_count < 10 THEN
        UPDATE public.chess_games
        SET status = 'abandoned',
            winner_id = p_winner_id,
            end_reason = 'early_resignation_no_points',
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

    -- Update game status
    UPDATE public.chess_games
    SET status = p_status,
        winner_id = p_winner_id,
        end_reason = COALESCE(p_end_reason, 'standard'),
        updated_at = NOW()
    WHERE id = p_game_id;

    -- Award points
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

        -- Loser gets +10 participation
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
-- 8. ATOMIC RPC: CLAIM TIMEOUT (Flag-Fall Protection)
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
-- 9. AUTOMATED SWEEPER: SETTLE EXPIRED INACTIVE GAMES
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
-- 10. STRICT ACCESS CONTROL (SECURITY LOCK-DOWN)
-- ==========================================================================
-- 1. REVOKE direct access from public/anon/authenticated on authoritative RPCs
REVOKE ALL ON FUNCTION public.submit_chess_move FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_chess_game FROM PUBLIC, anon, authenticated;

-- 2. GRANT execution strictly to service_role (Edge Function)
GRANT EXECUTE ON FUNCTION public.submit_chess_move TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_chess_game TO service_role;

-- 3. Public matchmaking, challenges, timeouts, and sweeper can be executed by clients
GRANT EXECUTE ON FUNCTION public.join_or_create_chess_matchmaking(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_chess_matchmaking(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_chess_challenge(UUID, UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_direct_chess_challenge(UUID, UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_chess_timeout(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_expired_chess_games() TO anon, authenticated;
