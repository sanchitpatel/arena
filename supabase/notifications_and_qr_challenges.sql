-- ==========================================================================
-- ARENA REAL-TIME NOTIFICATIONS & 1V1 CHESS QR CHALLENGE MIGRATION
-- Enables live in-venue QR duels & interactive Notification Slider Card
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. NOTIFICATIONS TABLE
-- --------------------------------------------------------------------------
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

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_player ON public.notifications (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (player_id) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_challenge ON public.notifications ((data->>'challenge_id')) WHERE type = 'chess_challenge';

-- Enable Realtime Replication for Instant Push Delivery
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read notifications" ON public.notifications;
CREATE POLICY "Allow public read notifications" 
    ON public.notifications FOR SELECT 
    TO anon, authenticated 
    USING (true);

DROP POLICY IF EXISTS "Allow public update notifications" ON public.notifications;
CREATE POLICY "Allow public update notifications" 
    ON public.notifications FOR UPDATE 
    TO anon, authenticated 
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert notifications" ON public.notifications;
CREATE POLICY "Allow public insert notifications" 
    ON public.notifications FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

-- Ensure anon & authenticated roles have full table permissions (subject to RLS)
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 2. ENHANCED create_direct_chess_challenge
-- Supports UUID or canonical Guest ID ("Guest042"), enforces photos, and posts notification
-- --------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------
-- 3. ENHANCED respond_direct_chess_challenge
-- Atomically accepts/declines challenge, creates live game, and updates notification
-- --------------------------------------------------------------------------
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
    SELECT * INTO v_challenge
    FROM public.chess_challenges
    WHERE id = p_challenge_id
      AND challenged_id = p_player_id
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Challenge not found or already expired');
    END IF;

    IF NOT p_accept THEN
        UPDATE public.chess_challenges 
        SET status = 'declined' 
        WHERE id = p_challenge_id;

        UPDATE public.notifications
        SET action_status = 'declined',
            is_read = TRUE
        WHERE data->>'challenge_id' = p_challenge_id::TEXT;

        RETURN jsonb_build_object('success', TRUE, 'action', 'declined');
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
