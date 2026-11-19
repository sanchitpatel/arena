-- ==========================================================================
-- ARENA LIVE EVENT: MULTIPLAYER CHESS SCHEMA
-- Optimized for Mobile-First 1v1 Matches with Supabase Cloud Realtime
-- PostgreSQL 17 + Supavisor Pooler + Row-Level Concurrency Control
-- ==========================================================================

-- Enable UUID extension if not already present
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
    challenged_id UUID REFERENCES public.players(id) ON DELETE CASCADE, -- NULL indicates open public matchmaking queue
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

-- Enable Realtime Replication & Full Row Identity
ALTER TABLE public.chess_games REPLICA IDENTITY FULL;
ALTER TABLE public.chess_challenges REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_games;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_challenges;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.chess_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chess_challenges ENABLE ROW LEVEL SECURITY;

-- Transparent Public Read for Realtime Sync across guest devices
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

-- Allow public insert/update for challenges (RPCs handle games securely)
DROP POLICY IF EXISTS "Allow public insert chess_challenges" ON public.chess_challenges;
CREATE POLICY "Allow public insert chess_challenges" 
    ON public.chess_challenges FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update chess_challenges" ON public.chess_challenges;
CREATE POLICY "Allow public update chess_challenges" 
    ON public.chess_challenges FOR UPDATE 
    TO anon, authenticated 
    USING (true);

-- ==========================================================================
-- 3. ATOMIC RPC: JOIN OR CREATE MATCHMAKING (Zero-Latency Queue Pairing)
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

    -- 2. Lock and find an available open challenge from another player (Skip Locked avoids queue head-of-line blocking)
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
        -- Randomize White vs Black for fairness
        v_is_white := (random() > 0.5);
        IF v_is_white THEN
            v_white_id := p_player_id;
            v_black_id := v_open_challenge.challenger_id;
        ELSE
            v_white_id := v_open_challenge.challenger_id;
            v_black_id := p_player_id;
        END IF;

        -- Create the new game row
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

        -- Update challenge to accepted with game reference
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

    -- 3. No match found: Cancel any stale open challenges from this player
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
-- 4. ATOMIC RPC: DIRECT CHALLENGE (e.g. via Venue QR Scanner)
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

    -- Cancel older pending direct challenges between these two
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

    RETURN jsonb_build_object(
        'success', TRUE,
        'challenge_id', v_challenge_id
    );
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

    -- Accepted: Randomize colors
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
-- 5. ATOMIC RPC: SUBMIT CHESS MOVE & SYNC CLOCK
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.submit_chess_move(
    p_game_id UUID,
    p_player_id UUID,
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
    v_final_status TEXT;
    v_final_winner UUID;
BEGIN
    -- Advisory lock for concurrency protection per game
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

    -- Turn validation
    IF (v_game.turn = 'w' AND v_game.white_player_id <> p_player_id) OR
       (v_game.turn = 'b' AND v_game.black_player_id <> p_player_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Not your turn');
    END IF;

    -- Compute elapsed clock time since last move
    v_elapsed_ms := GREATEST(0, (EXTRACT(EPOCH FROM (NOW() - v_game.last_move_at)) * 1000)::INTEGER);
    v_new_white_ms := v_game.white_time_left_ms;
    v_new_black_ms := v_game.black_time_left_ms;

    IF v_game.turn = 'w' THEN
        v_new_white_ms := v_new_white_ms - v_elapsed_ms;
        IF v_new_white_ms <= 0 THEN
            -- White ran out of time!
            RETURN public.settle_chess_game(p_game_id, 'timeout', v_game.black_player_id, 'flag_fall');
        END IF;
        v_next_turn := 'b';
    ELSE
        v_new_black_ms := v_new_black_ms - v_elapsed_ms;
        IF v_new_black_ms <= 0 THEN
            -- Black ran out of time!
            RETURN public.settle_chess_game(p_game_id, 'timeout', v_game.white_player_id, 'flag_fall');
        END IF;
        v_next_turn := 'w';
    END IF;

    -- Handle Game Over transitions
    IF p_is_game_over THEN
        v_final_status := COALESCE(p_end_status, 'checkmate');
        v_final_winner := p_winner_id;

        UPDATE public.chess_games
        SET fen = p_new_fen,
            pgn = p_new_pgn,
            turn = v_next_turn,
            white_time_left_ms = v_new_white_ms,
            black_time_left_ms = v_new_black_ms,
            status = v_final_status,
            winner_id = v_final_winner,
            end_reason = p_end_reason,
            last_move_at = NOW(),
            updated_at = NOW()
        WHERE id = p_game_id;

        -- Settle points atomically
        PERFORM public.settle_chess_game(p_game_id, v_final_status, v_final_winner, p_end_reason);

        RETURN jsonb_build_object(
            'success', TRUE,
            'status', v_final_status,
            'winner_id', v_final_winner,
            'white_time_left_ms', v_new_white_ms,
            'black_time_left_ms', v_new_black_ms
        );
    END IF;

    -- Normal Move Update
    UPDATE public.chess_games
    SET fen = p_new_fen,
        pgn = p_new_pgn,
        turn = v_next_turn,
        white_time_left_ms = v_new_white_ms,
        black_time_left_ms = v_new_black_ms,
        last_move_at = NOW(),
        updated_at = NOW()
    WHERE id = p_game_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'turn', v_next_turn,
        'white_time_left_ms', v_new_white_ms,
        'black_time_left_ms', v_new_black_ms
    );
END;
$$;

-- ==========================================================================
-- 6. ATOMIC RPC: SETTLE CHESS GAME & AWARD ARENA LEADERBOARD POINTS
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
BEGIN
    SELECT * INTO v_game
    FROM public.chess_games
    WHERE id = p_game_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game not found');
    END IF;

    -- If already ended and settled, return existing state
    IF v_game.status NOT IN ('in_progress', 'waiting') AND v_game.end_reason IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'status', v_game.status,
            'winner_id', v_game.winner_id,
            'message', 'Already settled'
        );
    END IF;

    -- Update game status
    UPDATE public.chess_games
    SET status = p_status,
        winner_id = p_winner_id,
        end_reason = COALESCE(p_end_reason, 'standard'),
        updated_at = NOW()
    WHERE id = p_game_id;

    -- Determine points awards
    IF p_status IN ('checkmate', 'timeout', 'resigned', 'abandoned') AND p_winner_id IS NOT NULL THEN
        -- Identify loser
        IF p_winner_id = v_game.white_player_id THEN
            v_loser_id := v_game.black_player_id;
        ELSE
            v_loser_id := v_game.white_player_id;
        END IF;

        -- Award Winner +100 pts
        UPDATE public.players
        SET total_score = total_score + v_points_win,
            rounds_played = rounds_played + 1,
            updated_at = NOW()
        WHERE id = p_winner_id;

        -- Award Loser +10 participation pts
        IF v_loser_id IS NOT NULL THEN
            UPDATE public.players
            SET total_score = total_score + v_points_loss,
                rounds_played = rounds_played + 1,
                updated_at = NOW()
            WHERE id = v_loser_id;
        END IF;

    ELSIF p_status IN ('stalemate', 'draw_agreed') THEN
        -- Draw: Both players get +50 pts
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
-- 7. ATOMIC RPC: CLAIM TIMEOUT (Flag-Fall Protection)
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

    -- Calculate elapsed time
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

-- Grant EXECUTE permissions on RPCs to anon and authenticated
GRANT EXECUTE ON FUNCTION public.join_or_create_chess_matchmaking(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_chess_challenge(UUID, UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_direct_chess_challenge(UUID, UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_chess_move(UUID, UUID, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_chess_game(UUID, TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_chess_timeout(UUID, UUID) TO anon, authenticated;
