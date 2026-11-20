import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Clock, User, CheckCircle, Swords } from '../icons';
import ArenaAvatar from '../avatars/ArenaAvatar';
import {
  fetchNotificationQueue,
  subscribeToClinicRealtime,
} from '../../services/clinicService';
import { respondToChessChallenge } from '../../services/notificationService';
import { getPlayerUuid } from '../../utils/playerId';

// Dummy draft notifications for UI preview (superseded by DB when populated)
export const DUMMY_NOTIFICATIONS = [
  {
    id: 'draft-1',
    title: 'Arena Quest',
    message: "New speed quest unlocked at Hall B beacon!",
    time: 'now',
    avatar: '3',
    variant: 'light',
  },
  {
    id: 'draft-2',
    title: 'Daily Streak Bonus',
    message: "+50 XP claimed! 3-day active streak.",
    time: '12m ago',
    avatar: null,
    variant: 'light',
  },
  {
    id: 'draft-3',
    title: 'Special Event Alert',
    message: "Round 2 tournament bracket is now live.",
    time: '1h ago',
    avatar: '7',
    variant: 'dark',
  },
  {
    id: 'draft-4',
    title: '1v1 Chess Challenge',
    message: "Guest014 invited you to a 5m Blitz duel!",
    time: '2h ago',
    avatar: '11',
    variant: 'light',
  },
  {
    id: 'draft-5',
    title: 'Mystery Chest Unlocked',
    message: "Stage 2 Prize Road reward ready to claim.",
    time: '3h ago',
    avatar: '14',
    variant: 'dark',
  },
  {
    id: 'draft-6',
    title: 'Zone Beacon Ping',
    message: "Connected to Zone 3 Living Room Beacon.",
    time: '5h ago',
    avatar: null,
    variant: 'light',
  },
  {
    id: 'draft-7',
    title: 'Pitch Wall Upvotes',
    message: "Your clinical AI pitch crossed 100 votes!",
    time: '7h ago',
    avatar: '5',
    variant: 'light',
  },
];

/**
 * NotificationSliderCard - Tactile Neumorphic Mobile Notification Slider Card.
 *
 * Hardened architecture adhering to strict mobile touch and gesture physics:
 * 1. Sheet Stacking: Positioned at top-0 z-[38] to emerge from behind the sticky top nav bar (z-40)
 *    with rounded-b-[28px] sm:rounded-b-[32px] md:rounded-[28px].
 * 2. Full-Screen Focus Scrim: At z-[35] with soft 15% tint + 1px micro-blur.
 * 3. Double-rAF Transition: Leak-free cancelable double requestAnimationFrame orchestration.
 * 4. Micro-drag tap preservation: setPointerCapture only engages once |deltaY| > 5px, preserving
 *    clean click/tap events on notification items.
 * 5. Multi-fire dismiss guard: dismissTimerRef and dismissingRef prevent duplicate close executions.
 * 6. Scoped touch action: touch-none on sheet frame prevents native pan cancellations, while
 *    touch-pan-y on list preserves native vertical momentum scrolling.
 */
export const NotificationSliderCard = ({
  isOpen = false,
  onClose,
  onNavigate,
  player,
}) => {
  const [displayed, setDisplayed] = useState(isOpen);
  const [isOpenState, setIsOpenState] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  // Notification queue state
  const [queue, setQueue] = useState([]);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasCapturedRef = useRef(false);
  const trackingRef = useRef(false);
  const dismissingRef = useRef(false);
  const dismissTimerRef = useRef(null);

  const sheetRef = useRef(null);
  const listRef = useRef(null);

  const resetGesture = useCallback(() => {
    trackingRef.current = false;
    isDraggingRef.current = false;
    hasCapturedRef.current = false;
    currentYRef.current = 0;
  }, []);

  const releaseCapture = useCallback((e) => {
    if (!hasCapturedRef.current) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch { }
    hasCapturedRef.current = false;
  }, []);

  // Clean up any lingering dismissal timer on component unmount
  useEffect(() => () => clearTimeout(dismissTimerRef.current), []);

  // Load real-time notification queue from PostgreSQL
  const loadNotifications = useCallback(async () => {
    try {
      const myId = player?.id || getPlayerUuid();
      const res = await fetchNotificationQueue(myId);
      if (res.success && Array.isArray(res.data)) {
        setQueue(res.data);
      }
    } catch (err) {
      console.warn('[NotificationSliderCard] Error loading notifications:', err);
    }
  }, [player?.id]);

  useEffect(() => {
    loadNotifications();
    const unsubscribe = subscribeToClinicRealtime(() => {
      loadNotifications();
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadNotifications]);

  const handleAcceptChallenge = async (item) => {
    const challengeId = item.data?.challenge_id;
    const myId = player?.id || getPlayerUuid();
    if (!challengeId || !myId) return;

    setRespondingId(item.id);
    try {
      const res = await respondToChessChallenge(challengeId, myId, true);
      if (res?.success) {
        setQueue((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, action_status: 'accepted' } : n))
        );
        onClose?.();
        if (typeof onNavigate === 'function') {
          onNavigate('chess');
        }
      } else {
        alert(res?.message || 'Could not join challenge');
      }
    } catch (err) {
      console.error('[NotificationSliderCard] Accept duel error:', err);
    } finally {
      setRespondingId(null);
    }
  };

  const handleDeclineChallenge = async (item) => {
    const challengeId = item.data?.challenge_id;
    const myId = player?.id || getPlayerUuid();
    if (!challengeId || !myId) return;

    setRespondingId(item.id);
    try {
      await respondToChessChallenge(challengeId, myId, false);
      setQueue((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, action_status: 'declined' } : n))
      );
    } catch (err) {
      console.error('[NotificationSliderCard] Decline duel error:', err);
    } finally {
      setRespondingId(null);
    }
  };

  // Entrance & Exit animation orchestration with leak-free rAF cleanup
  useEffect(() => {
    if (isOpen) {
      dismissingRef.current = false;
      clearTimeout(dismissTimerRef.current);
      setDisplayed(true);
      setDragOffset(0);
      setIsDragging(false);

      let r2;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => {
          setIsOpenState(true);
        });
      });

      return () => {
        cancelAnimationFrame(r1);
        if (r2) cancelAnimationFrame(r2);
      };
    } else {
      setIsOpenState(false);
      setDragOffset(0);
      setIsDragging(false);

      const timer = setTimeout(() => {
        setDisplayed(false);
      }, 310);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Guarded slide-up dismiss (prevents duplicate timeouts or multiple onClose triggers)
  const animateDismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setIsOpenState(false);
    setDragOffset(0);
    setIsDragging(false);

    dismissTimerRef.current = setTimeout(() => {
      onClose?.();
      setDisplayed(false);
      dismissingRef.current = false;
    }, 310);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!displayed) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') animateDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayed, animateDismiss]);

  // Scoped background and sheet edge scroll lock
  useEffect(() => {
    if (!isOpenState) return;

    const preventBackgroundScroll = (e) => {
      const list = listRef.current;
      const inList = list && list.contains(e.target);
      const listScrolls = list && list.scrollHeight > list.clientHeight + 4;

      // Allow native momentum scrolling inside overflowing list (overscroll-contain handles boundaries)
      if (inList && listScrolls) return;

      // Prevent wheel/touchmove leakage on sheet padding, background, or blank state
      if (e.cancelable) {
        e.preventDefault();
      }

      // Wheel-up dismiss on background or scrim
      if (e.deltaY < -12) {
        animateDismiss();
      }
    };

    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventBackgroundScroll);
      document.removeEventListener('wheel', preventBackgroundScroll);
    };
  }, [isOpenState, animateDismiss]);

  // --- Touch & Pointer Gesture Handling (Swipe UP to Dismiss) ---
  const handlePointerDown = (e) => {
    resetGesture(); // Always reset first so nothing stale survives an early return

    // Ignore clicks on interactive buttons or links
    if (e.target.closest('button, a')) return;

    // Check if user is touching inside the scrollable notifications list when it has overflow
    const scrollable = listRef.current;
    const inList = scrollable && scrollable.contains(e.target);
    const hasScrollOverflow = scrollable && (scrollable.scrollHeight > scrollable.clientHeight + 4);

    // If touching inside a list that needs scrolling, let native touch-pan-y scroll it
    if (inList && hasScrollOverflow) {
      return;
    }

    startYRef.current = e.clientY;
    trackingRef.current = true;
  };

  const handlePointerMove = (e) => {
    if (!trackingRef.current) return; // Guard: only runs if pointerdown started tracking

    const deltaY = e.clientY - startYRef.current;

    // Only initiate drag after crossing 5px threshold (preserves tap/click events on notification cards)
    if (!isDraggingRef.current) {
      if (Math.abs(deltaY) <= 5) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        hasCapturedRef.current = true;
      } catch { }
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    const offset = deltaY < 0 ? deltaY : deltaY * 0.15;
    currentYRef.current = offset;
    setDragOffset(offset);
  };

  const handlePointerUp = (e) => {
    releaseCapture(e);
    const wasDragging = isDraggingRef.current;
    const shouldDismiss = wasDragging && currentYRef.current < -35;
    resetGesture();

    if (!wasDragging) return;
    setIsDragging(false);

    if (shouldDismiss) {
      animateDismiss();
    } else {
      setDragOffset(0);
    }
  };

  // Cancel = browser took over (native momentum scroll). Never dismiss, just reset and snap back if dragging.
  const handlePointerCancel = (e) => {
    releaseCapture(e);
    const wasDragging = isDraggingRef.current;
    resetGesture();
    if (wasDragging) {
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  // Wheel gesture to dismiss on upward trackpad / mouse scroll
  const handleWheel = (e) => {
    if (e.deltaY < -12) {
      const scrollable = listRef.current;
      if (!scrollable || scrollable.scrollTop <= 0) {
        animateDismiss();
      }
    }
  };

  // Active notification queue: uses real DB notifications when available, falls back to dummy draft for preview
  const hasDbItems = Array.isArray(queue) && queue.length > 0;
  const notifications = hasDbItems ? queue : DUMMY_NOTIFICATIONS;
  const hasItems = notifications.length > 0;

  // Dynamic transform styles: gradual, physical drawer curves identical to QuestSliderCard
  const cardStyle = isDragging
    ? {
      transform: `translateY(${dragOffset}px)`,
      transition: 'none',
      willChange: 'transform',
    }
    : {
      transform: isOpenState ? 'translateY(0px)' : 'translateY(-115%)',
      transition: isOpenState
        ? 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)'
        : 'transform 300ms cubic-bezier(0.36, 0.66, 0.04, 1)',
      willChange: 'transform',
    };

  if (!displayed && !isOpen) return null;

  return (
    <>
      {/* Full-Screen Focus Scrim (At z-[35], so top header and bottom nav at z-40 sit above it completely unblurred) */}
      <div
        onClick={animateDismiss}
        onWheel={handleWheel}
        className={`fixed inset-0 z-[35] bg-black/15 backdrop-blur-[1px] touch-none select-none overscroll-none will-change-[opacity] ${
          isOpenState
            ? 'opacity-100 pointer-events-auto cursor-pointer transition-opacity duration-300 ease-out'
            : 'opacity-0 pointer-events-none transition-opacity duration-280 ease-out'
        }`}
      />

      {/* Sheet Container: Positioned at top-0 z-[38] to emerge downwards from behind the top nav bar (z-40) */}
      <div className="fixed top-0 left-0 right-0 z-[38] pointer-events-none flex justify-center px-1.5 sm:px-4">
        <div
          ref={sheetRef}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onWheel={handleWheel}
          className="pointer-events-auto w-full max-w-full sm:max-w-[500px] md:max-w-[540px] h-[calc((100dvh-135px)*0.38+4.5rem)] min-h-[330px] max-h-[385px] md:h-[255px] md:min-h-[255px] md:max-h-[255px] bg-[#ebedf2] border border-white/90 rounded-b-[28px] sm:rounded-b-[32px] md:rounded-[28px] shadow-[inset_0_4px_8px_rgba(0,0,0,0.22),inset_0_-4px_8px_#ffffff] pt-14 sm:pt-14 md:pt-4 md:mt-4 px-4 sm:px-4.5 pb-2 select-none touch-none cursor-grab active:cursor-grabbing flex flex-col justify-between"
          style={cardStyle}
        >
          {/* Main Notifications Content Area */}
          {hasItems ? (
            <div className="flex-1 min-h-0 flex flex-col pt-1 sm:pt-1.5 pb-1">
              {/* Scrollable list of individual notification cards */}
              <div
                ref={listRef}
                data-scrollable="true"
                className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 avatar-scroll overscroll-contain touch-pan-y"
              >
                {notifications.map((item) => {
                  const isDark = item.variant === 'dark';
                  return (
                    <div
                      key={item.id}
                      className={`w-full rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 transition-all active:scale-[0.99] select-none ${
                        isDark
                          ? 'bg-gradient-to-b from-zinc-900 to-black text-white border border-zinc-800/80 shadow-[0_3px_0_#18181b,0_4px_8px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                          : 'bg-white text-zinc-900 border border-white/90 shadow-[0_3px_0_#c8d0db,0_4px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_#ffffff]'
                      }`}
                    >
                      {/* Circular Avatar / Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                          isDark
                            ? 'bg-gradient-to-b from-zinc-700 to-zinc-800 border border-zinc-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)]'
                            : 'bg-gradient-to-b from-zinc-300 to-zinc-400 border border-white shadow-[inset_0_1px_1px_#ffffff,0_1px_2px_rgba(0,0,0,0.08)]'
                        }`}
                      >
                        {item.data?.challenger_avatar || item.sender?.avatar || item.avatar ? (
                          <ArenaAvatar
                            id={item.data?.challenger_avatar || item.sender?.avatar || item.avatar}
                            size="badge"
                          />
                        ) : (
                          <User size={20} weight="fill" className={isDark ? 'text-zinc-200' : 'text-white'} />
                        )}
                      </div>

                      {/* Content: Title, Time, Text */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-[13px] sm:text-[13.5px] font-bold truncate leading-tight tracking-tight ${
                              isDark ? 'text-white' : 'text-zinc-900'
                            }`}
                          >
                            {item.title}
                          </h4>
                          <span
                            className={`text-[11px] font-medium shrink-0 ${
                              isDark ? 'text-zinc-400' : 'text-zinc-400'
                            }`}
                          >
                            {item.time || 'now'}
                          </span>
                        </div>
                        <p
                          className={`text-[11.5px] sm:text-[12px] font-medium mt-0.5 leading-tight ${
                            isDark ? 'text-zinc-300' : 'text-zinc-600'
                          }`}
                        >
                          {item.message}
                        </p>

                        {/* Interactive 1v1 Chess Action Buttons */}
                        {item.type === 'chess_challenge' && (
                          <div className="mt-2 pt-2 border-t border-zinc-200/60 flex items-center gap-2">
                            {item.action_status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptChallenge(item);
                                  }}
                                  disabled={respondingId === item.id}
                                  className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 hover:from-emerald-400 hover:to-sky-500 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  <Swords size={14} weight="bold" />
                                  <span>{respondingId === item.id ? 'Joining...' : 'Accept Duel'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeclineChallenge(item);
                                  }}
                                  disabled={respondingId === item.id}
                                  className="py-1.5 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-semibold active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <span>Decline</span>
                                </button>
                              </>
                            ) : item.action_status === 'accepted' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <CheckCircle size={13} weight="fill" />
                                <span>Accepted — Game Live</span>
                              </span>
                            ) : item.action_status === 'declined' ? (
                              <span className="text-[11px] font-medium text-zinc-400">Declined</span>
                            ) : (
                              <span className="text-[11px] font-medium text-zinc-400">Expired</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Blank State */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-2 px-1 gap-2 touch-none">
              <p className="text-[12.5px] sm:text-[13px] text-zinc-500/90 leading-relaxed font-medium">
                No new notifications or activity alerts at this time.
              </p>

              {/* Tactile Auto-Clear Info Capsule */}
              <div
                className="font-arena inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-white to-zinc-200 border border-white text-zinc-600 text-[9px] tracking-wider shadow-sm w-fit"
                style={{ WebkitTextStroke: '0.4px', fontWeight: 400 }}
              >
                <Clock size={14} weight="bold" className="text-zinc-600 shrink-0" />
                <span>
                  Notifications auto-clear after 12 hrs
                </span>
              </div>
            </div>
          )}

          {/* Bottom Centered Drag Handle Pill (Tactile Debossed Groove for Swiping UP to Dismiss) */}
          <div
            className="w-full flex items-center justify-center pt-1.5 pb-0.5 cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            <div className="w-11 h-1.5 rounded-full bg-zinc-300/70 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),0_1px_1px_#ffffff]" />
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationSliderCard;
