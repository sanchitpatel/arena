import { supabase } from '../utils/supabase';

/**
 * ARENA CHESS SERVICE (100% DATABASE-NATIVE MODE)
 * Direct PostgreSQL RPC Communication over Supabase Cloud.
 * In-Database Turn, Clock, Device Identity & Concurrency Verification.
 * Zero Edge Functions & Zero CLI Tokens Required.
 */

// 1. Join or Queue for Open Matchmaking
export async function joinOrCreateMatchmaking(playerId, timeControlSec = 300) {
  try {
    const { data, error } = await supabase.rpc('join_or_create_chess_matchmaking', {
      p_player_id: playerId,
      p_time_control_sec: timeControlSec,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] joinOrCreateMatchmaking failed:', err);
    throw err;
  }
}

// 2. Cancel Pending Queue Matchmaking
export async function cancelChessMatchmaking(challengeId, playerId) {
  try {
    const { data, error } = await supabase.rpc('cancel_chess_matchmaking', {
      p_challenge_id: challengeId,
      p_player_id: playerId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] cancelChessMatchmaking failed:', err);
    throw err;
  }
}

// 3. Direct Challenge (e.g. Scanned via QR)
export async function createDirectChallenge(challengerId, challengedId, timeControlSec = 300) {
  try {
    const { data, error } = await supabase.rpc('create_direct_chess_challenge', {
      p_challenger_id: challengerId,
      p_challenged_id: challengedId,
      p_time_control_sec: timeControlSec,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] createDirectChallenge failed:', err);
    throw err;
  }
}

// 4. Respond to Direct Challenge
export async function respondDirectChallenge(challengeId, playerId, accept) {
  try {
    const { data, error } = await supabase.rpc('respond_direct_chess_challenge', {
      p_challenge_id: challengeId,
      p_player_id: playerId,
      p_accept: accept,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] respondDirectChallenge failed:', err);
    throw err;
  }
}

// 5. Fetch Active Game State
export async function getChessGame(gameId) {
  try {
    const { data, error } = await supabase
      .from('chess_games')
      .select(`
        *,
        white_player:players!white_player_id(id, name, orb_number, guest_id, avatar, total_score),
        black_player:players!black_player_id(id, name, orb_number, guest_id, avatar, total_score)
      `)
      .eq('id', gameId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] getChessGame failed:', err);
    throw err;
  }
}

// 6. Check Active Ongoing Game on App Mount / Reconnect
export async function getActiveOngoingGame(playerId) {
  try {
    const { data, error } = await supabase
      .from('chess_games')
      .select(`
        *,
        white_player:players!white_player_id(id, name, orb_number, guest_id, avatar, total_score),
        black_player:players!black_player_id(id, name, orb_number, guest_id, avatar, total_score)
      `)
      .or(`white_player_id.eq.${playerId},black_player_id.eq.${playerId}`)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] getActiveOngoingGame failed:', err);
    return null;
  }
}

// 7. Direct Database Move Submission (Fast 1-Hop DB RPC with Device Identity & Clock Checks)
export async function submitMove({
  gameId,
  playerId,
  deviceId,
  newFen,
  newPgn,
  isGameOver = false,
  endStatus = null,
  winnerId = null,
  endReason = null,
}) {
  try {
    const { data, error } = await supabase.rpc('submit_chess_move', {
      p_game_id: gameId,
      p_player_id: playerId,
      p_device_id: deviceId,
      p_new_fen: newFen,
      p_new_pgn: newPgn,
      p_is_game_over: isGameOver,
      p_end_status: endStatus,
      p_winner_id: winnerId,
      p_end_reason: endReason,
    });

    if (error) throw error;
    if (data && data.success === false) {
      throw new Error(data.message || 'Move submission rejected by server.');
    }
    return data;
  } catch (err) {
    console.error('[ChessService] submitMove failed:', err);
    throw err;
  }
}

// 8. Direct Database Resign RPC (With Device Identity Check)
export async function resignChessGame(gameId, playerId, deviceId) {
  try {
    const { data, error } = await supabase.rpc('resign_chess_game', {
      p_game_id: gameId,
      p_player_id: playerId,
      p_device_id: deviceId,
    });

    if (error) throw error;
    if (data && data.success === false) {
      throw new Error(data.message || 'Resignation rejected.');
    }
    return data;
  } catch (err) {
    console.error('[ChessService] resignChessGame failed:', err);
    throw err;
  }
}

// 9. Claim Timeout / Flag-Fall
export async function claimChessTimeout(gameId, claimingPlayerId) {
  try {
    const { data, error } = await supabase.rpc('claim_chess_timeout', {
      p_game_id: gameId,
      p_claiming_player_id: claimingPlayerId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] claimChessTimeout failed:', err);
    throw err;
  }
}

// 10. Automated Inactive Game Sweeper
export async function sweepExpiredGames() {
  try {
    const { data, error } = await supabase.rpc('sweep_expired_chess_games');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] sweepExpiredGames failed:', err);
    return 0;
  }
}

// 11. Subscribe to Live Game Realtime Updates
export function subscribeToChessGame(gameId, onUpdate) {
  const channel = supabase
    .channel(`chess_game_${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chess_games',
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        if (payload?.new) {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// 12. Subscribe to Waiting Queue Matchmaking Challenge Row
export async function getChessChallenge(challengeId) {
  try {
    const { data, error } = await supabase
      .from('chess_challenges')
      .select('*')
      .eq('id', challengeId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] getChessChallenge failed:', err);
    return null;
  }
}

export function subscribeToMatchmakingQueue(challengeId, onMatched) {
  const channel = supabase
    .channel(`chess_queue_${challengeId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chess_challenges',
        filter: `id=eq.${challengeId}`,
      },
      (payload) => {
        if (payload?.new && payload.new.status === 'accepted' && payload.new.game_id) {
          onMatched(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
