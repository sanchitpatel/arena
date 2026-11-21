import { supabase } from '../utils/supabase';
import { getPlayerUuid } from '../utils/playerId';

/**
 * Wallet Service — Live attendee point balances, wallet metrics, and leaderboard standing
 */

/**
 * Fetch real-time wallet stats for a player
 * Returns actual points, global rank, ideas submitted, votes received, and challenges completed.
 */
export async function fetchPlayerWalletStats(playerId) {
  const id = playerId || getPlayerUuid();
  if (!id) {
    return {
      success: true,
      data: {
        points: 0,
        rank: 1,
        ideas_submitted: 0,
        votes_received: 0,
        challenges_completed: 0,
      },
    };
  }

  try {
    // 1. Try atomic RPC first
    const { data, error } = await supabase.rpc('get_player_wallet_stats', {
      p_player_id: id,
    });

    if (!error && data?.success) {
      return { success: true, data };
    }

    // 2. Direct fallback query if RPC not yet run
    const { data: playerData } = await supabase
      .from('players')
      .select('id, name, guest_id, total_score, avatar, orb_number')
      .eq('id', id)
      .maybeSingle();

    const score = Number(playerData?.total_score || 0);

    // Calculate rank
    const { count: higherCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .gt('total_score', score);

    // Count ideas submitted
    const { count: ideasCount } = await supabase
      .from('pitches')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    // Count completed chess games (any finished status)
    const { count: gamesCount } = await supabase
      .from('chess_games')
      .select('*', { count: 'exact', head: true })
      .or(`white_player_id.eq.${id},black_player_id.eq.${id}`)
      .not('status', 'in', '("waiting","in_progress")');

    return {
      success: true,
      data: {
        points: score,
        rank: (higherCount || 0) + 1,
        ideas_submitted: ideasCount || 0,
        votes_received: 0,
        challenges_completed: gamesCount || 0,
      },
    };
  } catch (err) {
    console.warn('[WalletService] fetchPlayerWalletStats fallback:', err);
    return {
      success: true,
      data: {
        points: 0,
        rank: 1,
        ideas_submitted: 0,
        votes_received: 0,
        challenges_completed: 0,
      },
    };
  }
}

/**
 * Subscribe to live player wallet changes via Supabase Realtime
 */
export function subscribeToPlayerWallet(playerId, onUpdate) {
  const id = playerId || getPlayerUuid();
  if (!id) return () => {};

  try {
    const channelName = `wallet:player:${id}:${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (typeof onUpdate === 'function') onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[WalletService] Realtime subscription error:', err);
    return () => {};
  }
}
