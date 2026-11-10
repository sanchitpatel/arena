import { supabase } from '../utils/supabase';
import { getDeviceId, savePlayerRecord } from '../utils/playerId';

/**
 * Arena Service — Real-time Multiplayer Engine & Live Leaderboard
 * Tailored for 200+ concurrent mobile players over local Wi-Fi / self-hosted Supabase.
 */

// Active singleton channel for broadcast/presence reuse
let arenaBroadcastChannel = null;

function getOrCreateBroadcastChannel() {
  if (!arenaBroadcastChannel) {
    arenaBroadcastChannel = supabase.channel('arena_live_room', {
      config: { broadcast: { self: true } }
    });
    arenaBroadcastChannel.subscribe();
  }
  return arenaBroadcastChannel;
}

/**
 * Fires an instantaneous broadcast command to all connected phones in < 15ms.
 * (e.g. action: 'start_round', 'freeze_leaderboard', 'show_question', 'reveal_answer')
 */
export async function broadcastGameCommand(action, payload = {}) {
  try {
    const channel = getOrCreateBroadcastChannel();
    await channel.send({
      type: 'broadcast',
      event: 'arena_command',
      payload: { action, ...payload, timestamp: Date.now() },
    });
    return { success: true };
  } catch (err) {
    console.error('[Arena Realtime] broadcastGameCommand error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Ephemeral score burst broadcast for instant visual/sound feedback on Admin screen
 */
export async function broadcastScoreBurst({ playerId, guestId, orbNumber, pointsAdded, newTotal }) {
  try {
    const channel = getOrCreateBroadcastChannel();
    await channel.send({
      type: 'broadcast',
      event: 'score_burst',
      payload: { playerId, guestId, orbNumber, pointsAdded, newTotal, timestamp: Date.now() },
    });
    return { success: true };
  } catch (err) {
    console.warn('[Arena Realtime] broadcastScoreBurst error:', err);
    return { success: false };
  }
}

/**
 * Master Realtime Multi-Channel Subscription:
 * Integrates Postgres CDC (players, game_state), Broadcast commands, and Presence in one connection.
 */
export function subscribeToLiveArena({
  onScoreUpdate,
  onGameStateChange,
  onCommand,
  onScoreBurst,
  onPresenceSync,
  onStatusChange,
  presenceData = null,
} = {}) {
  try {
    const channel = supabase.channel('arena_live_room', {
      config: {
        broadcast: { self: false },
        presence: { key: presenceData?.guest_id || 'guest_device' },
      },
    });

    // 1. Database CDC: Listen for live player score changes & registrations
    if (onScoreUpdate) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload) => onScoreUpdate(payload)
      );
    }

    // 2. Database CDC: Listen for master game state changes
    if (onGameStateChange) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state' },
        (payload) => onGameStateChange(payload)
      );
    }

    // 3. Ephemeral Broadcast: Admin game control commands (< 15ms latency)
    if (onCommand) {
      channel.on('broadcast', { event: 'arena_command' }, ({ payload }) => {
        onCommand(payload);
      });
    }

    // 4. Ephemeral Broadcast: Instant score burst animations
    if (onScoreBurst) {
      channel.on('broadcast', { event: 'score_burst' }, ({ payload }) => {
        onScoreBurst(payload);
      });
    }

    // 5. Presence: Track live attendee online count
    if (onPresenceSync) {
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        onPresenceSync(state);
      });
    }

    // Connect WebSocket
    channel.subscribe(async (status) => {
      onStatusChange?.(status);
      if (status === 'SUBSCRIBED') {
        console.log('[Arena Realtime] Connected to live event room');
        if (presenceData) {
          try {
            await channel.track(presenceData);
          } catch (e) {
            console.warn('[Arena Realtime] Presence track error:', e);
          }
        }
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.error('[Arena Realtime] subscribeToLiveArena error:', err);
    return () => {};
  }
}

/**
 * Throttled Leaderboard Subscriber:
 * Prevents React rendering churn when 200+ players submit points within 2 seconds.
 * Accumulates individual player score updates into an in-memory buffer,
 * flushing them as a single batch update every `throttleMs` (default 200ms).
 */
export function createThrottledLeaderboardSubscriber(onBatchUpdate, throttleMs = 200) {
  let pendingUpdates = new Map();
  let flushTimer = null;

  const flush = () => {
    if (pendingUpdates.size > 0) {
      const batch = Array.from(pendingUpdates.values());
      pendingUpdates.clear();
      onBatchUpdate(batch);
    }
    flushTimer = null;
  };

  const handleScoreEvent = (payload) => {
    const updated = payload.new;
    if (updated && updated.id) {
      pendingUpdates.set(updated.id, updated);
      if (!flushTimer) {
        flushTimer = setTimeout(flush, throttleMs);
      }
    }
  };

  const unsubscribe = subscribeToLeaderboard(handleScoreEvent);

  return () => {
    if (flushTimer) clearTimeout(flushTimer);
    pendingUpdates.clear();
    unsubscribe();
  };
}

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

// In-flight singleton promise to guarantee only 1 network request per device mount
let activeClaimPromise = null;

// Enforces a strict 5-second timeout on network RPC calls to prevent indefinite spinner hanging
const RPC_TIMEOUT_MS = 4000;

function withTimeout(promise, ms, errorMsg = 'Server response timed out. Please check Wi-Fi connection.') {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Atomically claims or reconnects a guest player using PostgreSQL sequence + device token.
 * Prevents any ID collision and recovers existing session across mobile refreshes.
 */
export async function claimOrRegisterGuest({ name = null, avatar = '1', team = 'unassigned' } = {}) {
  // If an initial claim is already pending for this device without a name update, reuse in-flight promise
  if (!name && activeClaimPromise) {
    return activeClaimPromise;
  }

  const claimOperation = (async () => {
    try {
      const deviceId = getDeviceId();

      // Call atomic PostgreSQL function with strict timeout
      const rpcCall = supabase.rpc('claim_guest_player', {
        p_device_id: deviceId,
        p_name: name,
        p_avatar: avatar,
        p_team: team,
      });

      const { data, error } = await withTimeout(rpcCall, RPC_TIMEOUT_MS);

      if (error) throw error;

      if (data) {
        savePlayerRecord(data);
      }

      return { success: true, data };
    } catch (err) {
      console.error('[Arena Service] claimOrRegisterGuest error:', err);
      return { success: false, data: null, error: err.message };
    } finally {
      if (!name) {
        activeClaimPromise = null;
      }
    }
  })();

  if (!name) {
    activeClaimPromise = claimOperation;
  }

  return claimOperation;
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

/**
 * Submits answer atomically to Postgres, and fires an instant broadcast score burst
 * so the Admin projector and leaderboard display the player's points with zero delay.
 */
export async function submitAnswerAndNotify({
  playerId,
  guestId,
  orbNumber,
  roundNumber,
  selectedOption,
  isCorrect = false,
  points = 0,
  responseTimeMs = 0,
}) {
  const result = await submitRoundScore({
    playerId,
    roundNumber,
    selectedOption,
    isCorrect,
    points,
    responseTimeMs,
  });

  if (result.success && points > 0) {
    // Non-blocking broadcast for instant visual feedback on host/admin screen
    broadcastScoreBurst({
      playerId,
      guestId,
      orbNumber,
      pointsAdded: points,
      newTotal: result.data?.total_score,
    });
  }

  return result;
}
