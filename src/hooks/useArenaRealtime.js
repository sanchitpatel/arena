import { useState, useEffect, useCallback } from 'react';
import {
  fetchLeaderboard,
  fetchActiveGameState,
  subscribeToLiveArena,
  createThrottledLeaderboardSubscriber,
  broadcastGameCommand,
} from '../services/arenaService';

/**
 * useArenaRealtime — High-performance React hook for live game synchronization.
 * Integrates Postgres CDC changes, batched leaderboard re-ordering, broadcast commands,
 * and online presence into a unified React state.
 */
export function useArenaRealtime({
  player = null,
  autoFetch = true,
  throttleMs = 200,
} = {}) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [recentScoreBurst, setRecentScoreBurst] = useState(null);
  const [loading, setLoading] = useState(autoFetch);

  // Initial load of current leaderboard and game state
  useEffect(() => {
    if (!autoFetch) return;

    let isMounted = true;
    async function init() {
      setLoading(true);
      const [boardRes, stateRes] = await Promise.all([
        fetchLeaderboard(50),
        fetchActiveGameState(),
      ]);

      if (isMounted) {
        if (boardRes.success) setLeaderboard(boardRes.data || []);
        if (stateRes.success) setGameState(stateRes.data || null);
        setLoading(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [autoFetch]);

  // Realtime subscription
  useEffect(() => {
    // 1. Throttled Leaderboard Updater: Batches multiple player score changes
    const unsubLeaderboard = createThrottledLeaderboardSubscriber((batch) => {
      setLeaderboard((prevBoard) => {
        const boardMap = new Map(prevBoard.map((p) => [p.id, p]));
        for (const playerUpdate of batch) {
          boardMap.set(playerUpdate.id, {
            ...(boardMap.get(playerUpdate.id) || {}),
            ...playerUpdate,
          });
        }
        // Re-sort leaderboard: total_score DESC, last_response_time_ms ASC
        return Array.from(boardMap.values()).sort((a, b) => {
          if (b.total_score !== a.total_score) {
            return b.total_score - a.total_score;
          }
          return (a.last_response_time_ms || 0) - (b.last_response_time_ms || 0);
        });
      });
    }, throttleMs);

    // 2. Master Live Room Subscription: Game State, Broadcast Commands, Presence
    const unsubLive = subscribeToLiveArena({
      onGameStateChange: (payload) => {
        if (payload.new) {
          setGameState(payload.new);
        }
      },
      onScoreBurst: (burst) => {
        setRecentScoreBurst(burst);
      },
      onPresenceSync: (presenceState) => {
        const total = Object.values(presenceState).reduce(
          (acc, presences) => acc + presences.length,
          0
        );
        setOnlineCount(total);
      },
      onStatusChange: (status) => {
        setIsConnected(status === 'SUBSCRIBED');
      },
      presenceData: player ? {
        guest_id: player.guest_id,
        orb_number: player.orb_number,
        name: player.name,
      } : null,
    });

    return () => {
      unsubLeaderboard();
      unsubLive();
    };
  }, [throttleMs, player?.guest_id]);

  const sendCommand = useCallback(async (action, payload) => {
    return broadcastGameCommand(action, payload);
  }, []);

  return {
    leaderboard,
    gameState,
    isConnected,
    onlineCount,
    recentScoreBurst,
    loading,
    sendCommand,
  };
}

export default useArenaRealtime;
