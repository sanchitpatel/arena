import { supabase } from '../utils/supabase';
import { getOrAssignPlayerId, generateRandomGuestId } from '../utils/playerId';

/**
 * Arena Service — Real-time Multiplayer Game Engine & Live Scoreboard
 * Tuned for 200+ concurrent connections over local Wi-Fi / self-hosted Supabase.
 */

/**
 * Subscribes to real-time leaderboard score updates via Supabase Realtime channel.
 * Uses postgres_changes with automatic fallback or broadcast.
 */
export function subscribeToLeaderboard(callback) {
  try {
    const channel = supabase
      .channel('arena_leaderboard_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arena_scores' },
        (payload) => {
          if (typeof callback === 'function') callback(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Arena Realtime] Leaderboard channel connected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.error('[Arena Realtime] Subscription error:', err);
    return () => {};
  }
}

/**
 * Subscribes to global game state changes (e.g., active round, countdown, pause).
 */
export function subscribeToGameState(callback) {
  try {
    const channel = supabase
      .channel('arena_game_state_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state' },
        (payload) => {
          if (typeof callback === 'function') callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.error('[Arena Realtime] Game state subscription error:', err);
    return () => {};
  }
}

/**
 * Fetches the current top leaderboard standings.
 */
export async function fetchLeaderboard(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('arena_scores')
      .select('id, player_id, score, accuracy, response_time_ms, rank, player:players(name, avatar, team, badge_code)')
      .order('score', { ascending: false })
      .order('response_time_ms', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.warn('[Arena Service] fetchLeaderboard:', err.message);
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Fetches active game state (current question/round, phase, time remaining).
 */
export async function fetchActiveGameState() {
  try {
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('[Arena Service] fetchActiveGameState:', err.message);
    return { success: false, data: null, error: err.message };
  }
}

/**
 * Register or login a player anonymously or with display handle and Guest ID.
 */
export async function registerPlayer({ name, team = 'unassigned', avatar = '⚡', guestId = null } = {}) {
  try {
    const assignedGuestId = guestId || getOrAssignPlayerId() || generateRandomGuestId();
    const displayName = (name && name.trim()) || assignedGuestId;

    const { data, error } = await supabase
      .from('players')
      .insert([
        {
          name: displayName,
          badge_code: assignedGuestId,
          team,
          avatar,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('[Arena Service] registerPlayer error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit player score / round answer.
 */
export async function submitRoundScore({ playerId, roundId, scoreIncrement, responseTimeMs }) {
  try {
    const { data, error } = await supabase.rpc('submit_arena_score', {
      p_player_id: playerId,
      p_round_id: roundId,
      p_score_increment: scoreIncrement,
      p_response_time_ms: responseTimeMs,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('[Arena Service] submitRoundScore error:', err);
    return { success: false, error: err.message };
  }
}
