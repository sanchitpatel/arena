-- 1. Create public storage policies for 'avatars' bucket
CREATE POLICY "Public Read Avatars" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'avatars');

CREATE POLICY "Allow Public Avatar Uploads" 
ON storage.objects FOR INSERT 
TO anon, authenticated 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow Public Avatar Updates" 
ON storage.objects FOR UPDATE 
TO anon, authenticated 
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- 2. Update claim_guest_player to allow both Curated IDs (1..30) AND Storage URLs
CREATE OR REPLACE FUNCTION public.claim_guest_player(
    p_device_id TEXT,
    p_name TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT '1',
    p_team TEXT DEFAULT 'unassigned'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_player public.players%ROWTYPE;
    v_seq_val BIGINT;
    v_guest_id TEXT;
    v_clean_name TEXT;
    v_clean_avatar TEXT;
    v_display_name TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_device_id));

    -- Clean name (alphanumeric, spaces, hyphens, max 16 chars)
    v_clean_name := SUBSTRING(REGEXP_REPLACE(TRIM(COALESCE(p_name, '')), '[^a-zA-Z0-9 _-]', '', 'g'), 1, 16);
    
    -- Avatar handling: allow full URLs or fallback to numeric 1..30
    IF p_avatar ~* '^https?://' OR p_avatar ~* '^/storage/' THEN
        v_clean_avatar := TRIM(p_avatar);
    ELSE
        v_clean_avatar := SUBSTRING(REGEXP_REPLACE(TRIM(COALESCE(p_avatar, '1')), '[^0-9]', '', 'g'), 1, 2);
        IF v_clean_avatar = '' OR v_clean_avatar::INT < 1 OR v_clean_avatar::INT > 30 THEN
            v_clean_avatar := '1';
        END IF;
    END IF;

    -- Check if device already claimed a guest ID
    SELECT * INTO v_player 
    FROM public.players 
    WHERE device_id = p_device_id 
    LIMIT 1;

    IF FOUND THEN
        IF v_clean_name <> '' THEN
            v_display_name := v_clean_name;
        ELSE
            v_display_name := v_player.name;
        END IF;

        UPDATE public.players 
        SET last_seen_at = NOW(),
            is_active = TRUE,
            name = v_display_name,
            avatar = v_clean_avatar,
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

    -- New device registration
    v_seq_val := nextval('public.guest_id_seq');
    v_guest_id := 'Guest' || LPAD(v_seq_val::TEXT, 3, '0');
    v_display_name := CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE v_guest_id END;

    INSERT INTO public.players (
        orb_number,
        guest_id,
        device_id,
        name,
        avatar,
        team,
        total_score,
        last_seen_at
    )
    VALUES (
        v_seq_val,
        v_guest_id,
        p_device_id,
        v_display_name,
        v_clean_avatar,
        COALESCE(NULLIF(TRIM(p_team), ''), 'unassigned'),
        0,
        NOW()
    )
    ON CONFLICT (device_id) DO UPDATE
        SET last_seen_at = NOW()
    RETURNING * INTO v_player;

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