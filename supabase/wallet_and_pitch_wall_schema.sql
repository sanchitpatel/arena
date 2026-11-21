-- ==========================================================================
-- ARENA WALLET & PITCH WALL MASTER SCHEMA
-- Live Points, Leaderboard Stats, Real-Time Idea Submissions & Voting
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. WALLET TRANSACTIONS TABLE
-- Audit log of all points earned across Chess, Pitch Wall, Quests & Bonuses
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (
        type IN ('chess_win', 'chess_draw', 'chess_loss', 'pitch_submit', 'pitch_vote_received', 'daily_streak', 'bonus', 'quest_reward', 'admin_adjustment')
    ),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_player ON public.wallet_transactions (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions (type);

-- --------------------------------------------------------------------------
-- 2. PITCHES (IDEAS) TABLE
-- Real-time Ideas Pitch Wall submissions for attendees
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pitches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    guest_id TEXT NOT NULL,
    presenter_name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '1',
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    stage TEXT NOT NULL DEFAULT 'Concept' CHECK (
        stage IN ('Concept', 'Prototype Demo', 'Live Beta', 'Lab Tested')
    ),
    votes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitches_player ON public.pitches (player_id);
CREATE INDEX IF NOT EXISTS idx_pitches_votes ON public.pitches (votes_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pitches_guest_id ON public.pitches (guest_id);

-- --------------------------------------------------------------------------
-- 3. PITCH VOTES TABLE
-- Tracks unique attendee ballots (1 vote per player per idea)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pitch_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pitch_id UUID NOT NULL REFERENCES public.pitches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pitch_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_pitch_votes_pitch ON public.pitch_votes (pitch_id);
CREATE INDEX IF NOT EXISTS idx_pitch_votes_player ON public.pitch_votes (player_id);

-- --------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION SETUP
-- Realtime WebSocket push for instant live updates across all attendee devices
-- --------------------------------------------------------------------------
ALTER TABLE public.pitches REPLICA IDENTITY FULL;
ALTER TABLE public.pitch_votes REPLICA IDENTITY FULL;
ALTER TABLE public.wallet_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pitches;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pitch_votes;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

-- --------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY & PERMISSIONS
-- --------------------------------------------------------------------------
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Pitches RLS
DROP POLICY IF EXISTS "Allow public read pitches" ON public.pitches;
CREATE POLICY "Allow public read pitches" ON public.pitches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow public insert pitches" ON public.pitches;
CREATE POLICY "Allow public insert pitches" ON public.pitches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update pitches" ON public.pitches;
CREATE POLICY "Allow public update pitches" ON public.pitches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Pitch Votes RLS
DROP POLICY IF EXISTS "Allow public read pitch_votes" ON public.pitch_votes;
CREATE POLICY "Allow public read pitch_votes" ON public.pitch_votes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow public insert pitch_votes" ON public.pitch_votes;
CREATE POLICY "Allow public insert pitch_votes" ON public.pitch_votes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete pitch_votes" ON public.pitch_votes;
CREATE POLICY "Allow public delete pitch_votes" ON public.pitch_votes FOR DELETE TO anon, authenticated USING (true);

-- Wallet Transactions RLS
DROP POLICY IF EXISTS "Allow public read wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "Allow public read wallet_transactions" ON public.wallet_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow public insert wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "Allow public insert wallet_transactions" ON public.wallet_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Explicit Role Table Grants (Crucial: prevents PostgREST 401 permission denied)
GRANT ALL ON TABLE public.pitches TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pitch_votes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.wallet_transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 6. ATOMIC RPC: SUBMIT PITCH & EARN POINTS
-- Inserts idea, records creator vote, awards +50 pts to wallet
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_pitch(
    p_player_id UUID,
    p_title TEXT,
    p_summary TEXT,
    p_category TEXT DEFAULT 'General',
    p_stage TEXT DEFAULT 'Concept'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_player public.players%ROWTYPE;
    v_pitch_id UUID;
    v_clean_title TEXT;
    v_clean_summary TEXT;
BEGIN
    -- 1. Validate player
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Player not found');
    END IF;

    v_clean_title := TRIM(p_title);
    v_clean_summary := TRIM(p_summary);

    IF LENGTH(v_clean_title) < 4 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Title must be at least 4 characters');
    END IF;

    IF LENGTH(v_clean_summary) < 15 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Description must be at least 15 characters');
    END IF;

    -- 2. Insert new pitch
    INSERT INTO public.pitches (
        player_id,
        guest_id,
        presenter_name,
        avatar,
        title,
        summary,
        category,
        stage,
        votes_count
    ) VALUES (
        v_player.id,
        v_player.guest_id,
        v_player.name,
        v_player.avatar,
        v_clean_title,
        v_clean_summary,
        COALESCE(NULLIF(TRIM(p_category), ''), 'General'),
        COALESCE(NULLIF(TRIM(p_stage), ''), 'Concept'),
        1 -- Creator gets 1 initial vote
    ) RETURNING id INTO v_pitch_id;

    -- 3. Record creator's initial ballot
    INSERT INTO public.pitch_votes (pitch_id, player_id)
    VALUES (v_pitch_id, v_player.id)
    ON CONFLICT (pitch_id, player_id) DO NOTHING;

    -- 4. Award +50 Arena points to the author's wallet
    UPDATE public.players
    SET total_score = total_score + 50,
        updated_at = NOW()
    WHERE id = v_player.id;

    -- 5. Record wallet transaction
    INSERT INTO public.wallet_transactions (
        player_id,
        amount,
        type,
        description,
        metadata
    ) VALUES (
        v_player.id,
        50,
        'pitch_submit',
        '+50 PTS: Published idea on Pitch Wall (' || v_clean_title || ')',
        jsonb_build_object('pitch_id', v_pitch_id, 'title', v_clean_title)
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'pitch_id', v_pitch_id,
        'points_awarded', 50,
        'new_total_score', v_player.total_score + 50
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_pitch(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 7. ATOMIC RPC: TOGGLE PITCH VOTE
-- Toggles vote, updates pitch votes_count, and awards author +10 pts on vote
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_pitch_vote(
    p_pitch_id UUID,
    p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pitch public.pitches%ROWTYPE;
    v_voter public.players%ROWTYPE;
    v_already_voted BOOLEAN;
    v_new_votes INTEGER;
BEGIN
    SELECT * INTO v_voter FROM public.players WHERE id = p_player_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Voter not found');
    END IF;

    SELECT * INTO v_pitch FROM public.pitches WHERE id = p_pitch_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Pitch not found');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.pitch_votes 
        WHERE pitch_id = p_pitch_id AND player_id = p_player_id
    ) INTO v_already_voted;

    IF v_already_voted THEN
        -- Revoke ballot
        DELETE FROM public.pitch_votes 
        WHERE pitch_id = p_pitch_id AND player_id = p_player_id;

        UPDATE public.pitches
        SET votes_count = GREATEST(0, votes_count - 1),
            updated_at = NOW()
        WHERE id = p_pitch_id
        RETURNING votes_count INTO v_new_votes;

        RETURN jsonb_build_object(
            'success', TRUE,
            'action', 'unvoted',
            'has_voted', FALSE,
            'votes_count', v_new_votes
        );
    ELSE
        -- Cast ballot
        INSERT INTO public.pitch_votes (pitch_id, player_id)
        VALUES (p_pitch_id, p_player_id);

        UPDATE public.pitches
        SET votes_count = votes_count + 1,
            updated_at = NOW()
        WHERE id = p_pitch_id
        RETURNING votes_count INTO v_new_votes;

        -- Award pitch author +10 points if voter is not the author
        IF v_pitch.player_id IS NOT NULL AND v_pitch.player_id <> p_player_id THEN
            UPDATE public.players
            SET total_score = total_score + 10,
                updated_at = NOW()
            WHERE id = v_pitch.player_id;

            INSERT INTO public.wallet_transactions (
                player_id,
                amount,
                type,
                description,
                metadata
            ) VALUES (
                v_pitch.player_id,
                10,
                'pitch_vote_received',
                '+10 PTS: Received peer vote on idea (' || v_pitch.title || ')',
                jsonb_build_object('pitch_id', p_pitch_id, 'voter_id', p_player_id)
            );
        END IF;

        RETURN jsonb_build_object(
            'success', TRUE,
            'action', 'voted',
            'has_voted', TRUE,
            'votes_count', v_new_votes
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_pitch_vote(UUID, UUID) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 8. ATOMIC RPC: GET PITCH WALL FEED
-- Returns all pitches ordered by votes_count DESC with user has_voted flag
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pitch_wall_feed(
    p_player_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'title', p.title,
                'summary', p.summary,
                'category', p.category,
                'stage', p.stage,
                'presenter', p.presenter_name,
                'guestId', p.guest_id,
                'avatar', p.avatar,
                'votes', p.votes_count,
                'created_at', p.created_at,
                'isMyPitch', (p_player_id IS NOT NULL AND p.player_id = p_player_id),
                'has_voted', CASE 
                    WHEN p_player_id IS NULL THEN FALSE
                    ELSE EXISTS (
                        SELECT 1 FROM public.pitch_votes pv 
                        WHERE pv.pitch_id = p.id AND pv.player_id = p_player_id
                    )
                END
            )
            ORDER BY p.votes_count DESC, p.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_result
    FROM public.pitches p;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pitch_wall_feed(UUID) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 9. ATOMIC RPC: GET REAL PLAYER WALLET STATS
-- Calculates actual live points, leaderboard rank, ideas count, votes, and games
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_player_wallet_stats(
    p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_player public.players%ROWTYPE;
    v_rank BIGINT;
    v_ideas_count BIGINT;
    v_votes_received BIGINT;
    v_challenges_completed BIGINT;
BEGIN
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Player not found'
        );
    END IF;

    -- Calculate rank in live leaderboard
    SELECT COUNT(*) + 1 INTO v_rank
    FROM public.players
    WHERE total_score > v_player.total_score;

    -- Count ideas submitted by this attendee
    SELECT COUNT(*) INTO v_ideas_count
    FROM public.pitches
    WHERE player_id = p_player_id;

    -- Count total votes received across all ideas by this attendee
    SELECT COALESCE(SUM(votes_count), 0) INTO v_votes_received
    FROM public.pitches
    WHERE player_id = p_player_id;

    -- Count completed chess games
    SELECT COUNT(*) INTO v_challenges_completed
    FROM public.chess_games
    WHERE (white_player_id = p_player_id OR black_player_id = p_player_id)
      AND status NOT IN ('waiting', 'in_progress');

    RETURN jsonb_build_object(
        'success', TRUE,
        'points', v_player.total_score,
        'rank', v_rank,
        'ideas_submitted', v_ideas_count,
        'votes_received', v_votes_received,
        'challenges_completed', v_challenges_completed,
        'player_name', v_player.name,
        'guest_id', v_player.guest_id,
        'avatar', v_player.avatar,
        'orb_number', v_player.orb_number
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_wallet_stats(UUID) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 10. AUTOMATIC CHESS SETTLEMENT WALLET LEDGER TRIGGER
-- Automatically records chess wins (+100), losses (+10), and draws (+50)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_record_chess_wallet_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status IN ('checkmate', 'timeout', 'resigned') AND NEW.winner_id IS NOT NULL AND OLD.status = 'in_progress' THEN
        -- Winner
        INSERT INTO public.wallet_transactions (player_id, amount, type, description, metadata)
        VALUES (
            NEW.winner_id,
            100,
            'chess_win',
            '+100 PTS: Won 1v1 Chess Match',
            jsonb_build_object('game_id', NEW.id, 'reason', NEW.end_reason)
        );
        
        -- Loser
        IF NEW.winner_id = NEW.white_player_id THEN
            INSERT INTO public.wallet_transactions (player_id, amount, type, description, metadata)
            VALUES (
                NEW.black_player_id,
                10,
                'chess_loss',
                '+10 PTS: Completed 1v1 Chess Match',
                jsonb_build_object('game_id', NEW.id, 'reason', NEW.end_reason)
            );
        ELSE
            INSERT INTO public.wallet_transactions (player_id, amount, type, description, metadata)
            VALUES (
                NEW.white_player_id,
                10,
                'chess_loss',
                '+10 PTS: Completed 1v1 Chess Match',
                jsonb_build_object('game_id', NEW.id, 'reason', NEW.end_reason)
            );
        END IF;
    ELSIF NEW.status IN ('stalemate', 'draw_agreed') AND OLD.status = 'in_progress' THEN
        INSERT INTO public.wallet_transactions (player_id, amount, type, description, metadata)
        VALUES 
            (NEW.white_player_id, 50, 'chess_draw', '+50 PTS: Draw in 1v1 Chess Match', jsonb_build_object('game_id', NEW.id)),
            (NEW.black_player_id, 50, 'chess_draw', '+50 PTS: Draw in 1v1 Chess Match', jsonb_build_object('game_id', NEW.id));
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chess_games'
    ) THEN
        DROP TRIGGER IF EXISTS trg_chess_game_wallet_settle ON public.chess_games;
        CREATE TRIGGER trg_chess_game_wallet_settle
            AFTER UPDATE OF status ON public.chess_games
            FOR EACH ROW
            WHEN (OLD.status = 'in_progress' AND NEW.status <> 'in_progress')
            EXECUTE FUNCTION public.trg_record_chess_wallet_transaction();
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 11. SEED STARTER IDEAS (Conference Launch Starters)
-- Inserts initial curated attendee prompts if pitches table is completely empty
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.pitches LIMIT 1) THEN
        INSERT INTO public.pitches (
            guest_id, presenter_name, avatar, title, summary, category, stage, votes_count
        ) VALUES 
        (
            'Guest012', 'Dr. Elena Vance', '7',
            'Autonomous EHR Scribe & Clinical Agent',
            'Ambient clinical listening that converts doctor-patient conversations into structured ICD-10 notes and real-time drug interaction alerts in under 2 seconds.',
            'AI & Agents', 'Live Beta', 124
        ),
        (
            'Guest045', 'Alex Chen', '14',
            'Gamified PT with LiDAR Spatial Tracking',
            'Using smartphone LiDAR to turn post-op orthopedic rehab exercises into an immersive rhythm mini-game with millimeter-accurate range-of-motion metrics.',
            'Hardware & Robotics', 'Prototype Demo', 98
        ),
        (
            'Guest088', 'Sarah Jenkins', '21',
            'Sub-4min Drone Defibrillator Dispatch',
            'Sub-4-minute urban drone deployment delivering automated external defibrillator (AED) units and voice-guided CPR instruction to cardiac arrest scenes before ambulances arrive.',
            'Hardware & Robotics', 'Prototype Demo', 86
        ),
        (
            'Guest033', 'Marcus Thorne', '3',
            'Point-of-Care Blood Biomarker Spectrometer',
            'Pocket spectrophotometer analyzing a single blood droplet for troponin, CRP, and creatinine in 90 seconds using microfluidic sensor chips.',
            'BioTech & Health', 'Lab Tested', 74
        ),
        (
            'Guest061', 'Leo Tanaka', '18',
            'Zero-Knowledge Venue Access & Health Pass',
            'Cryptographically proven health credentialing allowing attendees to share verified lab clearances without exposing any underlying medical history or personal identity.',
            'Web3 & Systems', 'Concept', 62
        ),
        (
            'Guest074', 'Nina Patel', '29',
            'Haptic Feedback VR Surgical Training Gloves',
            'Next-gen pneumatic force-feedback gloves enabling residents to feel realistic tissue resistance and micro-vascular tension in virtual reality surgical simulations.',
            'AI & Agents', 'Prototype Demo', 55
        );
    END IF;
END $$;
