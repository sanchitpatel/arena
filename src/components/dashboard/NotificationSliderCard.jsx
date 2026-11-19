import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Clock, User } from '../icons';
import ArenaAvatar from '../avatars/ArenaAvatar';
import {
  fetchNotificationQueue,
  subscribeToClinicRealtime,
} from '../../services/clinicService';

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
];

/**
 * NotificationSliderCard - Tactile Neumorphic Mobile Notification Slider Card.
 *
 * Replicates the exact physics, gestures, and lifecycle architecture of QuestSliderCard:
 * 1. Sheet Stacking: Positioned at top-0 z-[38] to emerge from behind the sticky top nav bar (z-40)
 *    with rounded-b-[28px] sm:rounded-b-[32px] md:rounded-[28px].
 * 2. Full-Screen Focus Scrim: At z-[35] with soft 15% tint + 1px micro-blur,
 *    keeping top app bar and bottom nav at z-40 crisp and unblurred.
 * 3. Butter-Smooth Slide Animations: Double-rAF 320ms Apple spring glide down, 300ms exit up,
 *    and velocity-aware swipe-up gesture dismissal with rubber-band resistance when pulling down.
 * 4. Background Scroll Lock: Clean event filter on document preventing outside touchmove and wheel
 *    without layout shifts or brittle inline style mutations.
 * 5. Auto-Dismiss Channels:
 *    - Click / tap anywhere on focus scrim.
 *    - Click any external tab or button outside the card.
 *    - Pointer / touch swipe-up gesture (> 35px with downward rubber-band resistance).
 *    - Upward mouse wheel / trackpad scroll (> 12 delta) when at top of list.
 *    - Escape key press.
 */
export const NotificationSliderCard = ({
  isOpen = false,
  onClose,
  onNavigate,
  onCountChange,
}) => {
  const [displayed, setDisplayed] = useState(isOpen);
  const [isOpenState, setIsOpenState] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Notification queue state
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const sheetRef = useRef(null);
  const listRef = useRef(null);

  // Load real-time notification queue
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchNotificationQueue();
      if (res.success && Array.isArray(res.data)) {
        setQueue(res.data);
      }
    } catch (err) {
      console.warn('[NotificationSliderCard] Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const unsubscribe = subscribeToClinicRealtime(() => {
      loadNotifications();
    });
    return () => unsubscribe();
  }, [loadNotifications]);

  // Entrance & Exit animation orchestration identical to QuestSliderCard
  useEffect(() => {
    if (isOpen) {
      setDisplayed(true);
      setDragOffset(0);
      setIsDragging(false);

      // Double rAF ensures element is painted in DOM at closed position (translateY(-115%))
      // before transitioning to translateY(0), guaranteeing the slide entrance animation plays smoothly every time.
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setIsOpenState(true);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
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

  // Smooth slide-up dismiss identical to QuestSliderCard
  const animateDismiss = useCallback(() => {
    setIsOpenState(false);
    setDragOffset(0);
    setIsDragging(false);

    setTimeout(() => {
      onClose?.();
      setDisplayed(false);
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

  // Prevent background and main screen scrolling while the slider is open (Identical to QuestSliderCard)
  useEffect(() => {
    if (!isOpenState) return;

    // Prevent passive touchmove/wheel bubbling on document background
    const preventBackgroundScroll = (e) => {
      if (!sheetRef.current || !sheetRef.current.contains(e.target)) {
        if (e.cancelable) {
          e.preventDefault();
        }
        // Also dismiss if mouse wheel is scrolled upwards anywhere on the background / scrim
        if (e.deltaY < -12) {
          animateDismiss();
        }
      }
    };

    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventBackgroundScroll);
      document.removeEventListener('wheel', preventBackgroundScroll);
    };
  }, [isOpenState, animateDismiss]);

  // --- Touch & Pointer Gesture Handling (Swipe UP to Dismiss) mirrored from QuestSliderCard ---
  const handlePointerDown = (e) => {
    // Ignore clicks on interactive buttons
    if (e.target.closest('button, a')) return;

    // Check if user is touching inside the scrollable notifications list when it has overflow
    const scrollable = listRef.current;
    const isInsideScrollable = scrollable && scrollable.contains(e.target);
    const hasScrollOverflow = scrollable && (scrollable.scrollHeight > scrollable.clientHeight + 4);

    // If touching inside a list that needs scrolling, allow native list scrolling
    if (isInsideScrollable && hasScrollOverflow) {
      return;
    }

    startYRef.current = e.clientY;
    currentYRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch { }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    const deltaY = e.clientY - startYRef.current;
    if (deltaY < 0) {
      // Dragging upwards towards top nav bar
      currentYRef.current = deltaY;
      setDragOffset(deltaY);
    } else {
      // Pulling downwards with rubber-band resistance (mirrored from QuestSliderCard)
      const resisted = deltaY * 0.15;
      currentYRef.current = resisted;
      setDragOffset(resisted);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch { }

    // Dismiss if dragged upwards by > 35px
    if (currentYRef.current < -35) {
      animateDismiss();
    } else {
      // Snap back to open position
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

  // Sync notification count with top nav bar and parent shell
  useEffect(() => {
    onCountChange?.(notifications.length);
  }, [notifications.length, onCountChange]);

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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className="pointer-events-auto w-full max-w-full sm:max-w-[500px] md:max-w-[540px] h-[calc((100dvh-135px)*0.38+4.5rem)] min-h-[330px] max-h-[385px] md:h-[255px] md:min-h-[255px] md:max-h-[255px] bg-[#ebedf2] border border-white/90 rounded-b-[28px] sm:rounded-b-[32px] md:rounded-[28px] shadow-[inset_0_4px_8px_rgba(0,0,0,0.22),inset_0_-4px_8px_#ffffff] pt-14 sm:pt-14 md:pt-4 md:mt-4 px-4 sm:px-4.5 pb-2 select-none cursor-grab active:cursor-grabbing flex flex-col justify-between"
          style={cardStyle}
        >
          {/* Main Notifications Content Area */}
          {hasItems ? (
            <div className="flex-1 min-h-0 flex flex-col pt-1 sm:pt-1.5 pb-1">
              {/* Scrollable list of individual notification cards */}
              <div
                ref={listRef}
                onWheel={handleWheel}
                data-scrollable="true"
                className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5 avatar-scroll overscroll-contain touch-pan-y"
              >
                {notifications.map((item) => {
                  const isDark = item.variant === 'dark';
                  return (
                    <div
                      key={item.id}
                      className={`w-full rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 transition-all active:scale-[0.99] cursor-pointer select-none ${
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
                        {item.avatar ? (
                          <ArenaAvatar id={item.avatar} size="badge" />
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
                          className={`text-[11.5px] sm:text-[12px] font-medium truncate mt-0.5 leading-tight ${
                            isDark ? 'text-zinc-300' : 'text-zinc-600'
                          }`}
                        >
                          {item.message}
                        </p>
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
            onPointerDown={handlePointerDown}
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
