-- ==========================================================================
-- FIX FOR: public.submit_chess_move and live 1v1 PvP chess execution
-- Run this in Supabase Dashboard -> SQL Editor (takes 2 seconds)
-- ==========================================================================

-- 1. DROP ALL OLD/AMBIGUOUS OVERLOADS
DROP FUNCTION IF EXISTS public.submit_chess_move(UUID, UUID, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.submit_chess_move(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.submit_chess_move(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.settle_chess_game(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.resign_chess_game(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.claim_chess_timeout(UUID, UUID);

-- 2. CREATE AUTHORITATIVE GAME SETTLEMENT ENGINE
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
    BEGIN
        v_ply_count := (split_part(v_game.fen,' ',6)::INT - 1)*2 + (split_part(v_game.fen,' ',2) = 'b')::INT;
    EXCEPTION WHEN OTHERS THEN
        v_ply_count := 10;
    END;

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
        SET total_score = COALESCE(total_score, 0) + v_points_win,
            rounds_played = COALESCE(rounds_played, 0) + 1,
            updated_at = NOW()
        WHERE id = p_winner_id;

        -- Loser gets +10
        IF v_loser_id IS NOT NULL THEN
            UPDATE public.players
            SET total_score = COALESCE(total_score, 0) + v_points_loss,
                rounds_played = COALESCE(rounds_played, 0) + 1,
                updated_at = NOW()
            WHERE id = v_loser_id;
        END IF;

    ELSIF p_status IN ('stalemate', 'draw_agreed') THEN
        -- Draw gets +50 each
        UPDATE public.players
        SET total_score = COALESCE(total_score, 0) + v_points_draw,
            rounds_played = COALESCE(rounds_played, 0) + 1,
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

-- 3. CREATE SUBMIT_CHESS_MOVE (WITH ALL DEFAULT PARAMETERS)
CREATE OR REPLACE FUNCTION public.submit_chess_move(
    p_game_id UUID,
    p_player_id UUID,
    p_device_id TEXT DEFAULT NULL,
    p_new_fen TEXT DEFAULT NULL,
    p_new_pgn TEXT DEFAULT '',
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
    IF p_device_id IS NOT NULL AND TRIM(p_device_id) <> '' THEN
        IF EXISTS (SELECT 1 FROM public.player_devices WHERE player_id = p_player_id) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.player_devices 
                WHERE player_id = p_player_id AND device_id = p_device_id
            ) THEN
                RETURN jsonb_build_object('success', FALSE, 'message', 'Unauthorized: Device credential mismatch');
            END IF;
        ELSE
            -- Auto-register device for this player if not yet mapped
            INSERT INTO public.player_devices (player_id, device_id)
            VALUES (p_player_id, p_device_id)
            ON CONFLICT (player_id) DO UPDATE SET device_id = EXCLUDED.device_id;
        END IF;
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
    IF p_new_fen IS NOT NULL THEN
        IF p_new_fen !~ '^[1-8prnbqkPRNBQK/]+ [wb] \S+ \S+ [0-9]+ [0-9]+$'
           OR array_length(string_to_array(split_part(p_new_fen,' ',1),'/'),1) <> 8
           OR split_part(p_new_fen,' ',2) <> v_next_turn THEN
            RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid position format');
        END IF;

        BEGIN
            v_old_ply := (split_part(v_game.fen,' ',6)::INT - 1)*2 + (split_part(v_game.fen,' ',2) = 'b')::INT;
            v_new_ply := (split_part(p_new_fen,' ',6)::INT - 1)*2 + (split_part(p_new_fen,' ',2) = 'b')::INT;
            IF v_new_ply <> v_old_ply + 1 THEN
                RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid move sequence');
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- In case of non-standard FEN counters, skip strict ply check
        END;

        v_w_old := length(regexp_replace(split_part(v_game.fen,' ',1), '[^A-Z]', '', 'g'));
        v_b_old := length(regexp_replace(split_part(v_game.fen,' ',1), '[^a-z]', '', 'g'));
        v_w_new := length(regexp_replace(split_part(p_new_fen,' ',1), '[^A-Z]', '', 'g'));
        v_b_new := length(regexp_replace(split_part(p_new_fen,' ',1), '[^a-z]', '', 'g'));

        IF (v_game.turn = 'w' AND (v_w_new <> v_w_old OR v_b_new NOT IN (v_b_old, v_b_old - 1)))
           OR (v_game.turn = 'b' AND (v_b_new <> v_b_old OR v_w_new NOT IN (v_w_old, v_w_old - 1))) THEN
            RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid move: piece count violation');
        END IF;
    END IF;

    -- 5. Commit move and updated clocks
    UPDATE public.chess_games
    SET fen = COALESCE(p_new_fen, fen),
        pgn = COALESCE(p_new_pgn, pgn),
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
            COALESCE(p_end_status, 'checkmate'),
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

-- 4. CREATE RESIGN FUNCTION
CREATE OR REPLACE FUNCTION public.resign_chess_game(
    p_game_id UUID,
    p_player_id UUID,
    p_device_id TEXT DEFAULT NULL
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
    SELECT * INTO v_game
    FROM public.chess_games
    WHERE id = p_game_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game not found');
    END IF;

    IF v_game.status <> 'in_progress' THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game is already finished');
    END IF;

    IF v_game.white_player_id <> p_player_id AND v_game.black_player_id <> p_player_id THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Player is not a participant');
    END IF;

    IF v_game.white_player_id = p_player_id THEN
        v_winner_id := v_game.black_player_id;
    ELSE
        v_winner_id := v_game.white_player_id;
    END IF;

    RETURN public.settle_chess_game(p_game_id, 'resigned', v_winner_id, 'resignation');
END;
$$;

-- 5. CREATE TIMEOUT CLAIM FUNCTION
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
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game already finished');
    END IF;

    IF v_game.white_player_id <> p_claiming_player_id AND v_game.black_player_id <> p_claiming_player_id THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Not a participant');
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

-- 6. CREATE SERVER TIME FUNCTION
CREATE OR REPLACE FUNCTION public.server_now()
RETURNS TIMESTAMPTZ
LANGUAGE sql
VOLATILE
AS $$
    SELECT clock_timestamp();
$$;

-- 7. GRANT EXECUTE TO CLIENT ROLES
REVOKE EXECUTE ON FUNCTION public.settle_chess_game(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_chess_move(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resign_chess_game(UUID, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_chess_timeout(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_now() TO anon, authenticated, service_role;

-- 8. RELOAD POSTGREST SCHEMA CACHE INSTANTLY
NOTIFY pgrst, 'reload schema';
