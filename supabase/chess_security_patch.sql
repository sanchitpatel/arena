-- ==========================================================================
-- ARENA 1V1 CHESS & DEVICE SECURITY MASTER PATCH
-- Unified Supabase Cloud SQL Patch (Run in Supabase Dashboard -> SQL Editor)
--
-- Incorporates:
-- 1. Private player_devices table (Isolates device_id from public read)
-- 2. Revoked settle_chess_game client execution (Prevents free points exploit)
-- 3. Dropped obsolete 8-param submit_chess_move overload
-- 4. VOLATILE server_now() for precise wall-clock calibration
-- 5. Atomic cancel_chess_matchmaking with advisory lock & matched detection
-- 6. Anti-tampering submit_chess_move & resign_chess_game (private device check)
-- 7. FEN-based ply counting & points_awarded recording in settle_chess_game
-- ==========================================================================

-- --------------------------------------------------------------------------
-- STEP 1: ISOLATE device_id INTO PRIVATE player_devices TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_devices (
    player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and revoke all public/client access: only SECURITY DEFINER functions can access
ALTER TABLE public.player_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_devices FROM PUBLIC, anon, authenticated;

-- Migrate existing device_ids into player_devices if device_id column currently exists on players
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'device_id'
    ) THEN
        INSERT INTO public.player_devices (player_id, device_id)
        SELECT id, device_id FROM public.players 
        WHERE device_id IS NOT NULL
        ON CONFLICT (player_id) DO UPDATE SET device_id = EXCLUDED.device_id;
    END IF;
END $$;

-- Update claim_guest_player to manage device_id via player_devices
CREATE OR REPLACE FUNCTION public.claim_guest_player(
    p_device_id TEXT,
    p_name TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL,
    p_team TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_player_id UUID;
    v_player public.players%ROWTYPE;
    v_seq_val BIGINT;
    v_guest_id TEXT;
    v_clean_name TEXT;
    v_clean_avatar TEXT;
    v_display_name TEXT;
    v_display_avatar TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_device_id));

    v_clean_name := SUBSTRING(REGEXP_REPLACE(TRIM(COALESCE(p_name, '')), '[^a-zA-Z0-9 _-]', '', 'g'), 1, 16);
    
    -- Avatar handling: allow full URLs or curated numeric 1..30; leave NULL if omitted
    IF p_avatar IS NOT NULL AND TRIM(p_avatar) <> '' THEN
        IF p_avatar ~* '^https?://' OR p_avatar ~* '^/storage/' OR p_avatar ~* '^data:' OR p_avatar ~* '^blob:' THEN
            v_clean_avatar := TRIM(p_avatar);
        ELSE
            v_clean_avatar := SUBSTRING(REGEXP_REPLACE(TRIM(p_avatar), '[^0-9]', '', 'g'), 1, 2);
            IF v_clean_avatar = '' OR v_clean_avatar::INT < 1 OR v_clean_avatar::INT > 30 THEN
                v_clean_avatar := '1';
            END IF;
        END IF;
    ELSE
        v_clean_avatar := NULL;
    END IF;

    -- Check if device is already registered
    SELECT player_id INTO v_player_id 
    FROM public.player_devices 
    WHERE device_id = p_device_id 
    LIMIT 1;

    IF v_player_id IS NOT NULL THEN
        SELECT * INTO v_player FROM public.players WHERE id = v_player_id;
        v_display_name := CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE v_player.name END;
        
        -- Preserve existing avatar if not explicitly provided
        IF v_clean_avatar IS NOT NULL THEN
            v_display_avatar := v_clean_avatar;
        ELSE
            v_display_avatar := v_player.avatar;
        END IF;
        
        UPDATE public.players 
        SET last_seen_at = NOW(), 
            is_active = TRUE, 
            name = v_display_name, 
            avatar = v_display_avatar,
            team = COALESCE(NULLIF(TRIM(p_team), ''), v_player.team)
        WHERE id = v_player.id
        RETURNING * INTO v_player;

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

    -- New player creation: Atomically increment sequence for guaranteed collision-free guest_id
    v_seq_val := nextval('public.guest_id_seq');
    v_guest_id := 'Guest' || LPAD(v_seq_val::TEXT, 3, '0');
    v_display_name := CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE v_guest_id END;
    v_display_avatar := CASE WHEN v_clean_avatar IS NOT NULL THEN v_clean_avatar ELSE '1' END;

    INSERT INTO public.players (
        orb_number,
        guest_id,
        name,
        avatar,
        team,
        total_score,
        last_seen_at
    )
    VALUES (
        v_seq_val,
        v_guest_id,
        v_display_name,
        v_display_avatar,
        COALESCE(NULLIF(TRIM(p_team), ''), 'unassigned'),
        0,
        NOW()
    )
    RETURNING * INTO v_player;

    -- Map player to device in private table
    INSERT INTO public.player_devices (player_id, device_id)
    VALUES (v_player.id, p_device_id)
    ON CONFLICT (player_id) DO UPDATE SET device_id = EXCLUDED.device_id;

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
GRANT EXECUTE ON FUNCTION public.claim_guest_player TO anon, authenticated;

-- Drop device_id column from public.players so it cannot be queried via public client
ALTER TABLE public.players DROP COLUMN IF EXISTS device_id;

-- --------------------------------------------------------------------------
-- STEP 2: CHESS PERMISSIONS & COLUMNS CLEANUP
-- --------------------------------------------------------------------------
-- 1. Ensure points_awarded column exists on chess_games
ALTER TABLE public.chess_games ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT NULL;

-- 2. Revoke execute on settle_chess_game from public and client roles (prevents free +100 point injection)
REVOKE EXECUTE ON FUNCTION public.settle_chess_game(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- 3. Drop all previous overloads of submit_chess_move and chess functions to allow parameter renaming
DROP FUNCTION IF EXISTS public.submit_chess_move(UUID, UUID, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.submit_chess_move(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.cancel_chess_matchmaking(UUID, UUID);
DROP FUNCTION IF EXISTS public.resign_chess_game(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.settle_chess_game(UUID, TEXT, UUID, TEXT);

-- 4. Mark server_now as VOLATILE for true clock precision
CREATE OR REPLACE FUNCTION public.server_now()
RETURNS TIMESTAMPTZ
LANGUAGE sql
VOLATILE
AS $$
    SELECT clock_timestamp();
$$;
GRANT EXECUTE ON FUNCTION public.server_now() TO anon, authenticated;

-- --------------------------------------------------------------------------
-- STEP 3: ATOMIC MATCHMAKING (PHOTO VERIFICATION & CANCELLATION)
-- --------------------------------------------------------------------------
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
GRANT EXECUTE ON FUNCTION public.join_or_create_chess_matchmaking(UUID, INTEGER) TO anon, authenticated;

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
GRANT EXECUTE ON FUNCTION public.cancel_chess_matchmaking(UUID, UUID) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- STEP 4: HARDENED submit_chess_move (ANTI-TAMPERING & PRIVATE DEVICE AUTH)
-- --------------------------------------------------------------------------
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
GRANT EXECUTE ON FUNCTION public.submit_chess_move(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, TEXT) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- STEP 5: RESIGN CHESS GAME (PRIVATE DEVICE AUTH)
-- --------------------------------------------------------------------------
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
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game is already finished');
    END IF;

    -- Validate player is in this game
    IF v_game.white_player_id <> p_player_id AND v_game.black_player_id <> p_player_id THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Player is not a participant');
    END IF;

    -- Assign opponent as winner
    IF v_game.white_player_id = p_player_id THEN
        v_winner_id := v_game.black_player_id;
    ELSE
        v_winner_id := v_game.white_player_id;
    END IF;

    RETURN public.settle_chess_game(p_game_id, 'resigned', v_winner_id, 'resignation');
END;
$$;
GRANT EXECUTE ON FUNCTION public.resign_chess_game(UUID, UUID, TEXT) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- STEP 6: SETTLE CHESS GAME (FEN PLY CALCULATION & points_awarded LOGGING)
-- --------------------------------------------------------------------------
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
    v_loser_id UUID;
    v_ply_count INT;
    v_is_early_resignation BOOLEAN := FALSE;
    v_points_win INT := 100;
    v_points_draw INT := 50;
    v_points_loss INT := 10;
BEGIN
    SELECT * INTO v_game
    FROM public.chess_games
    WHERE id = p_game_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game not found');
    END IF;

    IF v_game.status <> 'in_progress' THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Game already settled', 'status', v_game.status);
    END IF;

    -- Calculate move ply directly from FEN
    v_ply_count := (split_part(v_game.fen, ' ', 6)::INT - 1)*2 + (split_part(v_game.fen, ' ', 2) = 'b')::INT;

    -- Anti-collusion: Resignations before ply 10 (move 5) award zero points
    IF p_status = 'resigned' AND v_ply_count < 10 THEN
        v_is_early_resignation := TRUE;
        v_points_win := 0;
        v_points_draw := 0;
        v_points_loss := 0;
        p_end_reason := 'early_resignation_no_points';
    END IF;

    -- Finalize game row with points_awarded
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

    -- Award Arena leaderboard points
    IF p_status IN ('checkmate', 'timeout', 'resigned') AND p_winner_id IS NOT NULL THEN
        IF p_winner_id = v_game.white_player_id THEN
            v_loser_id := v_game.black_player_id;
        ELSE
            v_loser_id := v_game.white_player_id;
        END IF;

        IF NOT v_is_early_resignation THEN
            -- Winner gets +100
            UPDATE public.players
            SET total_score = total_score + v_points_win,
                rounds_played = rounds_played + 1,
                updated_at = NOW()
            WHERE id = p_winner_id;

            -- Loser gets +10
            UPDATE public.players
            SET total_score = total_score + v_points_loss,
                rounds_played = rounds_played + 1,
                updated_at = NOW()
            WHERE id = v_loser_id;
        END IF;

    ELSIF p_status IN ('stalemate', 'draw_agreed') THEN
        -- Both get +50
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
        'end_reason', p_end_reason,
        'points_awarded', CASE
            WHEN p_winner_id IS NOT NULL THEN v_points_win
            WHEN p_status IN ('stalemate', 'draw_agreed') THEN v_points_draw
            ELSE v_points_loss
        END
    );
END;
$$;

-- Revoke execute on settle_chess_game from public & client roles (Internal RPC calls only)
REVOKE EXECUTE ON FUNCTION public.settle_chess_game(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- --------------------------------------------------------------------------
-- STEP 7: VERIFICATION QUERY
-- --------------------------------------------------------------------------
SELECT p.oid::regprocedure, has_function_privilege('anon', p.oid, 'execute') AS anon_can_run
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE '%chess%';
