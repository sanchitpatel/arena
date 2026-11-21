import { supabase } from '../utils/supabase';
import { playTinNotificationSound } from '../utils/chessAudio';

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
      console.warn('[NotificationService] fetchPlayerNotifications error:', error.message || error);
      return { success: true, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.warn('[NotificationService] fetchPlayerNotifications exception:', err);
    return { success: true, data: [] };
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

    if (error) {
      return { success: true, count: 0 };
    }
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
 * Update notification action status (e.g. 'declined', 'accepted', 'expired') and mark read
 */
export async function updateNotificationActionStatus(notificationId, actionStatus = 'declined') {
  if (!notificationId) return;
  try {
    await supabase
      .from('notifications')
      .update({ action_status: actionStatus, is_read: true })
      .eq('id', notificationId);
  } catch (err) {
    console.warn('[NotificationService] updateNotificationActionStatus error:', err);
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
 * Subscribe to real-time notification push events for a player.
 * Uses a unique subscription channel name per listener instance to prevent
 * Supabase Realtime channel collisions across concurrently mounted components.
 */
export function subscribeToPlayerNotifications(playerId, onNotification) {
  if (!playerId) return () => {};

  try {
    const subId = Math.random().toString(36).substring(2, 9);
    const channelName = `notifications:${playerId}:${subId}`;

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
          try {
            if (payload?.eventType === 'INSERT') {
              playTinNotificationSound();
            }
            if (typeof onNotification === 'function') {
              onNotification(payload);
            }
          } catch (e) {
            console.warn('[NotificationService] onNotification handler error:', e);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.warn('[NotificationService] removeChannel error:', err);
      }
    };
  } catch (err) {
    console.warn('[NotificationService] Failed to initialize Realtime listener:', err);
    return () => {};
  }
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
    return data || { success: false, message: 'No response from server' };
  } catch (err) {
    console.error('[NotificationService] respondToChessChallenge failed:', err);
    return { success: false, message: err.message };
  }
}
