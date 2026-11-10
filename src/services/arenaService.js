import { supabase } from '../utils/supabase';
import { getDeviceId, savePlayerRecord } from '../utils/playerId';

/**
 * Arena Service — Real-time Multiplayer Engine & Live Leaderboard
 * Tailored for 200+ concurrent mobile players over local Wi-Fi / self-hosted Supabase.
 */

/**
 * Subscribes to live leaderboard score updates via Supabase Realtime WebSocket.
 * Listens for any UPDATE or INSERT on the `players` table.
 */
export function subscribeToLeaderboard(callback) {
  try {
    const channel = supabase
      .channel('arena_leaderboard_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
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
    console.error('[Arena Realtime] Leaderboard subscription error:', err);
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
 * Fetches the current top leaderboard standings ordered by total_score DESC.
 */
export async function fetchLeaderboard(limit = 25) {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, guest_id, name, avatar, team, total_score, accuracy, rounds_played, last_response_time_ms')
      .order('total_score', { ascending: false })
      .order('last_response_time_ms', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.warn('[Arena Service] fetchLeaderboard error:', err.message);
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
    console.warn('[Arena Service] fetchActiveGameState error:', err.message);
    return { success: false, data: null, error: err.message };
  }
}

/**
 * Atomically claims or reconnects a guest player using PostgreSQL sequence + device token.
 * Prevents any ID collision and recovers existing session across mobile refreshes.
 */
export async function claimOrRegisterGuest({ name = null, avatar = '1', team = 'unassigned' } = {}) {
  try {
    const deviceId = getDeviceId();

    // Call atomic PostgreSQL function
    const { data, error } = await supabase.rpc('claim_guest_player', {
      p_device_id: deviceId,
      p_name: name,
      p_avatar: avatar,
      p_team: team,
    });

    if (error) throw error;

    if (data) {
      savePlayerRecord(data);
    }

    return { success: true, data };
  } catch (err) {
    console.error('[Arena Service] claimOrRegisterGuest error:', err);
    return { success: false, data: null, error: err.message };
  }
}

// Aliased for convenience
export const registerPlayer = claimOrRegisterGuest;

/**
 * Submit round answer and score. Thread-safe atomic update via PostgreSQL RPC.
 */
export async function submitRoundScore({
  playerId,
  roundNumber,
  selectedOption,
  isCorrect = false,
  points = 0,
  responseTimeMs = 0,
}) {
  try {
    const { data, error } = await supabase.rpc('submit_player_answer', {
      p_player_id: playerId,
      p_round_number: roundNumber,
      p_selected_option: selectedOption,
      p_is_correct: isCorrect,
      p_points: points,
      p_response_time_ms: responseTimeMs,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('[Arena Service] submitRoundScore error:', err);
    return { success: false, error: err.message };
  }
}
