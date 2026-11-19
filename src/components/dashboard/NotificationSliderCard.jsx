import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Clock } from '../icons';
import {
  fetchNotificationQueue,
  subscribeToClinicRealtime,
} from '../../services/clinicService';

/**
 * NotificationSliderCard - Tactile Neumorphic Mobile Notification Slider Card.
 *
 * Emerges downwards from behind the top nav bar (z-40) at z-[38]:
 * 1. Top-Down Sheet Stacking: Positioned at top-0 with rounded-b-[28px] sm:rounded-b-[32px],
 *    emerging downwards from behind the top nav bar and sliding back up on exit.
 * 2. Full-Screen Focus Scrim: At z-[35] with soft 15% tint + 1px micro-blur,
 *    keeping top app bar and bottom nav at z-40 crisp and unblurred.
 * 3. Tactile #ebedf2 Clay Theme: Molded surface with dual-directional light simulation,
 *    pure inward bevels (zero outward shadow), raised dark icon tile, and signature Arena pill CTA.
 * 4. Gesture Physics (Swipe UP to Dismiss): Dragging up follows finger, pulling down rubber-bands.
 *    Releasing past 50px upward drag smoothly slides the card back up behind the top nav bar.
 */
export const NotificationSliderCard = ({
  isOpen: propIsOpen = true,
  onClose,
  onNavigate,
}) => {
  const [shouldRender, setShouldRender] = useState(propIsOpen);
  const [isOpen, setIsOpen] = useState(false);
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

  // Entrance & Exit animation orchestration with instant interruptibility
  useEffect(() => {
    if (propIsOpen) {
      if (!shouldRender) {
        setShouldRender(true);
        setDragOffset(0);
        setIsDragging(false);

        // Double rAF ensures element is painted at closed position (translateY(-112%))
        // before transitioning to translateY(0), guaranteeing an instant, butter-smooth slide entrance.
        const r1 = requestAnimationFrame(() => {
          const r2 = requestAnimationFrame(() => {
            setIsOpen(true);
          });
          return () => cancelAnimationFrame(r2);
        });
        return () => cancelAnimationFrame(r1);
      } else {
        // Fast re-open/interrupt: reverse direction immediately without waiting for rAF
        setDragOffset(0);
        setIsDragging(false);
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
      setDragOffset(0);
      setIsDragging(false);

      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 310);
      return () => clearTimeout(timer);
    }
  }, [propIsOpen, shouldRender]);

  // Smooth slide-up dismiss (immediately notifies parent and plays crisp exit)
  const animateDismiss = useCallback(() => {
    setIsOpen(false);
    setDragOffset(0);
    setIsDragging(false);
    setTimeout(() => {
      onClose?.();
    }, 310);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!shouldRender) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') animateDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldRender, animateDismiss]);

  // Prevent background and main screen scrolling while the notification slider is open (Zero layout shift)
  useEffect(() => {
    if (!isOpen) return;

    // Prevent passive touchmove/wheel bubbling on document background
    const preventBackgroundScroll = (e) => {
      if (!sheetRef.current || !sheetRef.current.contains(e.target)) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventBackgroundScroll);
      document.removeEventListener('wheel', preventBackgroundScroll);
    };
  }, [isOpen]);

  // --- Touch & Pointer Gesture Handling (Swipe UP to Dismiss) ---
  const handlePointerDown = (e) => {
    // Ignore clicks on interactive buttons
    if (e.target.closest('button')) return;

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
      // Pulling downwards with rubber-band resistance
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
    if (e.deltaY < -15) {
      animateDismiss();
    }
  };

  // Active notification data fallback
  const activeItem = queue[currentIndex] || null;
  const hasItems = queue.length > 0;

  const displayDescription = hasItems && activeItem
    ? (activeItem.message || activeItem.details || 'New activity reported on arena network.')
    : "You're all caught up. No new notifications or activity alerts at this time.";

  // Dynamic transform styles: gradual, physical drawer curves
  const cardStyle = isDragging
    ? {
      transform: `translateY(${dragOffset}px)`,
      transition: 'none',
      willChange: 'transform',
    }
    : {
      transform: isOpen ? 'translateY(0px)' : 'translateY(-115%)',
      transition: isOpen
        ? 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)'
        : 'transform 300ms cubic-bezier(0.36, 0.66, 0.04, 1)',
      willChange: 'transform',
    };

  if (!shouldRender && !propIsOpen) return null;

  return (
    <>
      {/* Full-Screen Focus Scrim (At z-[35], so top header and bottom nav at z-40 sit above it completely unblurred) */}
      <div
        onClick={animateDismiss}
        className={`fixed inset-0 z-[35] bg-black/15 backdrop-blur-[1px] touch-none select-none overscroll-none will-change-[opacity] ${
          isOpen
            ? 'opacity-100 pointer-events-auto cursor-pointer transition-opacity duration-300 ease-out'
            : 'opacity-0 pointer-events-none transition-opacity duration-280 ease-out'
        }`}
      />

      {/* Sheet Container: Positioned at top-0 z-[38] to emerge downwards from behind the top nav bar (z-40) */}
      <div className="fixed top-0 left-0 right-0 z-[38] pointer-events-none flex justify-center px-2 sm:px-4">
        <div
          ref={sheetRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className="pointer-events-auto w-full max-w-full sm:max-w-[440px] md:max-w-[460px] h-auto min-h-[145px] max-h-[180px] md:min-h-[110px] md:max-h-[135px] bg-[#ebedf2] border border-white/90 rounded-b-[24px] sm:rounded-b-[28px] md:rounded-[24px] shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6] pt-14 sm:pt-14 md:pt-4 md:mt-4 px-4 sm:px-5 pb-2 select-none touch-none cursor-grab active:cursor-grabbing flex flex-col justify-between"
          style={cardStyle}
        >
          {/* Main Content & Auto-Clear Notice */}
          <div className="flex-1 flex flex-col items-center justify-center text-center py-2 px-1 gap-2">
            <p className="text-[12.5px] sm:text-[13px] text-zinc-600 leading-relaxed font-medium">
              {displayDescription}
            </p>

            {/* Tactile Auto-Clear Info Capsule */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F7FC] border border-white/80 shadow-[inset_1.5px_1.5px_3px_#c8d0db,inset_-1.5px_-1.5px_3px_#ffffff] w-fit">
              <Clock size={13} weight="bold" className="text-zinc-500 shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-500 tracking-tight">
                Notifications auto-clear after 24 hrs
              </span>
            </div>
          </div>

          {/* Bottom Centered Drag Handle Pill (Tactile Debossed Groove for Swiping UP to Dismiss) */}
          <div className="w-full flex items-center justify-center pt-1.5 pb-0.5 cursor-grab active:cursor-grabbing touch-none shrink-0">
            <div className="w-11 h-1.5 rounded-full bg-zinc-300/70 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),0_1px_1px_#ffffff]" />
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationSliderCard;
