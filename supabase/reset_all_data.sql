-- ==========================================================================
-- ARENA FRESH LAUNCH RESET SCRIPT
-- Clears all testing data, resets Guest sequences to Guest001,
-- and re-initializes the live game session cleanly.
-- Run in Supabase Dashboard -> SQL Editor
-- ==========================================================================

-- 1. TRUNCATE ALL USER & GAME ACTIVITY TABLES (CASCADE HANDLES ALL FOREIGN KEYS)
TRUNCATE TABLE 
    public.pitch_votes,
    public.pitches,
    public.wallet_transactions,
    public.player_answers,
    public.notifications,
    public.chess_challenges,
    public.chess_games,
    public.player_devices,
    public.players
CASCADE;

-- 2. RESTART GUEST ID SEQUENCE TO 1 (Next attendee will be Guest001)
ALTER SEQUENCE IF EXISTS public.guest_id_seq RESTART WITH 1;

-- 3. RESET MASTER GAME STATE TO DEFAULT WAITING LOBBY
INSERT INTO public.game_state (session_code, status, current_round, total_rounds, round_title, is_active)
VALUES ('ARENA-LIVE', 'waiting', 1, 10, 'Incubation Lab Inauguration Arena', TRUE)
ON CONFLICT (session_code) DO UPDATE 
SET status = 'waiting', 
    current_round = 1, 
    round_title = 'Incubation Lab Inauguration Arena', 
    round_payload = '{}'::jsonb,
    is_active = TRUE,
    updated_at = NOW();

-- 4. OPTIONAL: CLEAN UP TEST AVATARS IN STORAGE (Uncomment if you want to wipe test uploaded selfie images)
-- DELETE FROM storage.objects WHERE bucket_id = 'avatars';

-- 5. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
