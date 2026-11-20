import { supabase } from '../utils/supabase';

/**
 * Notification Service — Real-time PostgreSQL notifications for Arena
 * Manages fetching, unread badge counters, and live Supabase Realtime subscriptions.
 */

/**
 * Fetch latest notifications for a player from PostgreSQL
 */
export async function fetchPlayerNotifications(playerId) {
  if (!playerId) return { success: true, data: [] };

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:players!sender_id(id, name, guest_id, avatar, orb_number)
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      // Graceful fallback if table does not yet exist on fresh migration
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { success: true, data: [] };
      }
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.warn('[NotificationService] fetchPlayerNotifications error:', err);
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Get count of unread notifications for a player
 */
export async function getUnreadNotificationCount(playerId) {
  if (!playerId) return { success: true, count: 0 };

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('is_read', false);

    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch (err) {
    return { success: true, count: 0 };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  } catch (err) {
    console.warn('[NotificationService] markAsRead error:', err);
  }
}

/**
 * Mark all notifications as read for a player
 */
export async function markAllNotificationsAsRead(playerId) {
  if (!playerId) return;
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('player_id', playerId)
      .eq('is_read', false);
  } catch (err) {
    console.warn('[NotificationService] markAllAsRead error:', err);
  }
}

/**
 * Subscribe to real-time notification push events for a player
 */
export function subscribeToPlayerNotifications(playerId, onNotification) {
  if (!playerId) return () => {};

  const channelName = `notifications:player:${playerId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `player_id=eq.${playerId}`,
      },
      (payload) => {
        if (typeof onNotification === 'function') {
          onNotification(payload);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Respond to an incoming direct chess challenge (Accept or Decline)
 */
export async function respondToChessChallenge(challengeId, playerId, accept) {
  try {
    const { data, error } = await supabase.rpc('respond_direct_chess_challenge', {
      p_challenge_id: challengeId,
      p_player_id: playerId,
      p_accept: accept,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[NotificationService] respondToChessChallenge error:', err);
    throw err;
  }
}
