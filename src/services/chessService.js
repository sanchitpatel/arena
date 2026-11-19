import { supabase } from '../utils/supabase';

/**
 * ARENA CHESS SERVICE
 * Handles Matchmaking, Realtime Game Synchronization,
 * Clock Deductions, and Move Verification.
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

// 2. Direct Challenge (e.g. Scanned via QR)
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

// 3. Respond to Direct Challenge
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

// 4. Fetch Game State
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

// 5. Submit Move (Edge Function with Direct RPC Fallback)
export async function submitMove({
  gameId,
  playerId,
  from,
  to,
  promotion = 'q',
  newFen,
  newPgn,
  isGameOver = false,
  endStatus = null,
  winnerId = null,
  endReason = null,
}) {
  try {
    // Attempt 1: Call Supabase Edge Function for authoritative server-side check
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('chess-move', {
      body: {
        game_id: gameId,
        player_id: playerId,
        from,
        to,
        promotion,
      },
    });

    if (!edgeError && edgeData?.success) {
      return edgeData;
    }

    // If Edge function is not deployed yet or errored, fallback cleanly to atomic Postgres RPC
    console.warn('[ChessService] Edge function unavailable or errored, falling back to direct RPC:', edgeError);
    const { data: rpcData, error: rpcError } = await supabase.rpc('submit_chess_move', {
      p_game_id: gameId,
      p_player_id: playerId,
      p_new_fen: newFen,
      p_new_pgn: newPgn,
      p_is_game_over: isGameOver,
      p_end_status: endStatus,
      p_winner_id: winnerId,
      p_end_reason: endReason,
    });

    if (rpcError) throw rpcError;
    return rpcData;
  } catch (err) {
    console.error('[ChessService] submitMove failed:', err);
    throw err;
  }
}

// 6. Claim Timeout / Flag-Fall
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

// 7. Resign Game
export async function resignChessGame(gameId, resigningPlayerId, opponentId) {
  try {
    const { data, error } = await supabase.rpc('settle_chess_game', {
      p_game_id: gameId,
      p_status: 'resigned',
      p_winner_id: opponentId,
      p_end_reason: 'resignation',
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ChessService] resignChessGame failed:', err);
    throw err;
  }
}

// 8. Subscribe to Live Game Realtime Updates
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

// 9. Subscribe to Matchmaking Challenge Notifications for a Player
export function subscribeToChallenges(playerId, onChallengeUpdate) {
  const channel = supabase
    .channel(`chess_challenges_${playerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chess_challenges',
        filter: `challenged_id=eq.${playerId}`,
      },
      (payload) => {
        if (payload?.new) {
          onChallengeUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
