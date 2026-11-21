-- ==========================================================================
-- CLEAR ALL DUMMY PITCHES & VOTES IN SUPABASE
-- Run this query in your Supabase SQL Editor:
-- ==========================================================================

-- 1. Remove any votes on seeded dummy pitches
DELETE FROM public.pitch_votes 
WHERE pitch_id IN (
    SELECT id FROM public.pitches 
    WHERE player_id IS NULL 
       OR guest_id IN ('Guest012', 'Guest045', 'Guest088', 'Guest033', 'Guest061', 'Guest074')
);

-- 2. Remove the 6 dummy conference launch starter pitches
DELETE FROM public.pitches 
WHERE player_id IS NULL 
   OR guest_id IN ('Guest012', 'Guest045', 'Guest088', 'Guest033', 'Guest061', 'Guest074');

-- 3. Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';
