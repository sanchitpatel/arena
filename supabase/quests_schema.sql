-- ==========================================================================
-- ARENA QUESTS & QUIZ SCORES SCHEMA
-- Stores score per quest per user based on correct answer counts
-- ==========================================================================

-- 1. QUEST SCORES TABLE
CREATE TABLE IF NOT EXISTS public.quest_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    guest_id TEXT NOT NULL,
    quest_id TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 10,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_scores_player ON public.quest_scores (player_id);
CREATE INDEX IF NOT EXISTS idx_quest_scores_quest ON public.quest_scores (quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_scores_score ON public.quest_scores (score DESC);

-- Enable RLS
ALTER TABLE public.quest_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first so the script can be safely re-run without error 42710
DROP POLICY IF EXISTS "Allow public read quest_scores" ON public.quest_scores;
CREATE POLICY "Allow public read quest_scores"
ON public.quest_scores FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public insert quest_scores" ON public.quest_scores;
CREATE POLICY "Allow public insert quest_scores"
ON public.quest_scores FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update quest_scores" ON public.quest_scores;
CREATE POLICY "Allow public update quest_scores"
ON public.quest_scores FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions to Data API
GRANT SELECT, INSERT, UPDATE ON public.quest_scores TO anon, authenticated;

-- Realtime Publication for live updates
ALTER TABLE public.quest_scores REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_scores;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

-- 2. ATOMIC RPC FUNCTION TO RECORD QUEST SCORE
-- Safely upserts quest score, increments player total_score, and writes wallet transaction
CREATE OR REPLACE FUNCTION public.record_quest_score(
    p_player_id UUID,
    p_guest_id TEXT,
    p_quest_id TEXT,
    p_score INTEGER,
    p_correct_count INTEGER,
    p_total_questions INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_score INTEGER := 0;
    v_score_diff INTEGER := 0;
    v_new_total INTEGER := 0;
    v_quest_title TEXT := 'Quest Challenge';
BEGIN
    -- Check if previous score exists for this quest
    SELECT score INTO v_old_score
    FROM public.quest_scores
    WHERE player_id = p_player_id AND quest_id = p_quest_id;

    IF NOT FOUND THEN
        v_old_score := 0;
        -- First time completing this quest: entire score is added
        v_score_diff := p_score;
    ELSE
        -- If player scored higher on re-attempt, award the point difference
        IF p_score > v_old_score THEN
            v_score_diff := p_score - v_old_score;
        ELSE
            v_score_diff := 0;
        END IF;
    END IF;

    -- Upsert into quest_scores
    INSERT INTO public.quest_scores (
        player_id,
        guest_id,
        quest_id,
        score,
        correct_count,
        total_questions,
        completed_at,
        updated_at
    )
    VALUES (
        p_player_id,
        p_guest_id,
        p_quest_id,
        GREATEST(p_score, COALESCE(v_old_score, 0)),
        p_correct_count,
        p_total_questions,
        NOW(),
        NOW()
    )
    ON CONFLICT (player_id, quest_id) DO UPDATE SET
        score = GREATEST(EXCLUDED.score, public.quest_scores.score),
        correct_count = GREATEST(EXCLUDED.correct_count, public.quest_scores.correct_count),
        updated_at = NOW();

    -- If there's new points to award, increment player total_score and record wallet transaction
    IF v_score_diff > 0 THEN
        UPDATE public.players
        SET total_score = total_score + v_score_diff,
            updated_at = NOW()
        WHERE id = p_player_id
        RETURNING total_score INTO v_new_total;

        -- Record in wallet_transactions if table exists
        BEGIN
            INSERT INTO public.wallet_transactions (
                player_id,
                amount,
                type,
                description,
                metadata
            ) VALUES (
                p_player_id,
                v_score_diff,
                'quest_reward',
                'Completed Quest: ' || p_quest_id,
                jsonb_build_object(
                    'quest_id', p_quest_id,
                    'correct_count', p_correct_count,
                    'total_questions', p_total_questions,
                    'score_awarded', v_score_diff
                )
            );
        EXCEPTION WHEN OTHERS THEN
            -- Ignore wallet_transactions error if table not yet configured
        END;
    ELSE
        SELECT total_score INTO v_new_total FROM public.players WHERE id = p_player_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'quest_id', p_quest_id,
        'points_awarded', v_score_diff,
        'total_score', v_new_total,
        'high_score', GREATEST(p_score, COALESCE(v_old_score, 0))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_quest_score TO anon, authenticated;
