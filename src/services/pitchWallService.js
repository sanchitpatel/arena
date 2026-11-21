import { supabase } from '../utils/supabase';
import { getPlayerUuid } from '../utils/playerId';

/**
 * Pitch Wall Service — Real-time attendee idea submissions, voting, and live feed
 */

/**
 * Fetch all pitches from the live PostgreSQL database
 */
export async function fetchPitches(playerId) {
  const myId = playerId || getPlayerUuid();

  try {
    // 1. Try atomic RPC first
    const { data, error } = await supabase.rpc('get_pitch_wall_feed', {
      p_player_id: myId || null,
    });

    if (!error && Array.isArray(data)) {
      return { success: true, data };
    }

    // 2. Direct query fallback
    const { data: rows, error: qErr } = await supabase
      .from('pitches')
      .select('*')
      .order('votes_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (qErr) throw qErr;

    // Check which pitches the current player voted on
    let myVotedIds = new Set();
    if (myId) {
      const { data: voteRows } = await supabase
        .from('pitch_votes')
        .select('pitch_id')
        .eq('player_id', myId);
      if (voteRows) {
        voteRows.forEach((v) => myVotedIds.add(v.pitch_id));
      }
    }

    const formatted = (rows || []).map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      category: p.category || 'General',
      stage: p.stage || 'Concept',
      presenter: p.presenter_name,
      guestId: p.guest_id,
      avatar: p.avatar,
      votes: p.votes_count || 0,
      created_at: p.created_at,
      isMyPitch: Boolean(myId && p.player_id === myId),
      has_voted: myVotedIds.has(p.id),
    }));

    return { success: true, data: formatted };
  } catch (err) {
    console.warn('[PitchWallService] fetchPitches error:', err);
    return { success: false, data: [] };
  }
}

/**
 * Submit a new idea/pitch to the Pitch Wall (Awards +50 points to player wallet)
 */
export async function submitNewPitch({
  playerId,
  title,
  summary,
  category = 'General',
  stage = 'Concept',
}) {
  const myId = playerId || getPlayerUuid();
  if (!myId) {
    return { success: false, message: 'Player identification missing. Please refresh.' };
  }

  try {
    const { data, error } = await supabase.rpc('submit_pitch', {
      p_player_id: myId,
      p_title: title,
      p_summary: summary,
      p_category: category,
      p_stage: stage,
    });

    if (error) throw error;
    return data || { success: true };
  } catch (err) {
    console.error('[PitchWallService] submitNewPitch failed:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Toggle vote on a pitch (Awards +10 points to author on upvote)
 */
export async function togglePitchVote(pitchId, playerId) {
  const myId = playerId || getPlayerUuid();
  if (!myId || !pitchId) {
    return { success: false, message: 'Missing required vote parameters.' };
  }

  try {
    const { data, error } = await supabase.rpc('toggle_pitch_vote', {
      p_pitch_id: pitchId,
      p_player_id: myId,
    });

    if (error) throw error;
    return data || { success: true };
  } catch (err) {
    console.error('[PitchWallService] togglePitchVote failed:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Subscribe to real-time changes on the Pitch Wall (new pitches and vote changes)
 */
export function subscribeToPitchWall(callback) {
  try {
    const channelName = `pitches:live:${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pitches' },
        (payload) => {
          if (typeof callback === 'function') callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[PitchWallService] Realtime subscription error:', err);
    return () => {};
  }
}
