import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bell,
  CheckCircle,
  WhatsappLogo,
  ChatCircleDots,
  ArrowRight,
  CaretLeft,
  CaretRight,
} from '../icons';
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

  // Lock background and main screen scrolling while the notification slider is open
  useEffect(() => {
    if (!isOpen) return;

    // 1. Lock document body and html elements
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // 2. Lock the <main> scroll container in DashboardShell
    const mainEl = document.querySelector('main');
    const prevMainOverflow = mainEl ? mainEl.style.overflow : '';
    if (mainEl) {
      mainEl.style.overflow = 'hidden';
    }

    // 3. Prevent passive touchmove/wheel bubbling on document background
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
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      if (mainEl) {
        mainEl.style.overflow = prevMainOverflow;
      }
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

  const displayTitle = activeItem
    ? (activeItem.patient_name ? `Alert for ${activeItem.patient_name}` : activeItem.title || 'Arena Dispatch Alert')
    : 'All Notifications Clear';

  const displayDescription = activeItem
    ? (activeItem.message || activeItem.details || 'New event activity reported on venue network. Review alert details below.')
    : 'All arena systems are operational. No pending alerts, challenges, or unread WhatsApp reminders on venue network.';

  const displayCategory = activeItem?.message_type === 'whatsapp'
    ? 'WHATSAPP DISPATCH'
    : 'ARENA DISPATCH';

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
      <div className="fixed top-0 left-0 right-0 z-[38] pointer-events-none flex justify-center px-1.5 sm:px-4">
        <div
          ref={sheetRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className="pointer-events-auto w-full max-w-full sm:max-w-[500px] md:max-w-[540px] h-[calc((100dvh-135px)*0.38+4.5rem)] min-h-[330px] max-h-[385px] md:h-[255px] md:min-h-[255px] md:max-h-[255px] bg-[#ebedf2] border border-white/90 rounded-b-[28px] sm:rounded-b-[32px] md:rounded-[28px] shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6] pt-14 sm:pt-14 md:pt-4 md:mt-4 px-4 sm:px-4.5 pb-2 select-none touch-none cursor-grab active:cursor-grabbing flex flex-col justify-between"
          style={cardStyle}
        >
          {/* Top Section: Header */}
          <div className="shrink-0">
            {/* Header Content */}
            <div className="flex items-center gap-3 pb-3 mb-1.5 border-b border-zinc-300/60 shadow-[0_1px_0_#ffffff]">
              {/* Tactile Icon Tile */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-zinc-900 to-black text-white border border-zinc-800/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),2px_2px_6px_#c5ccd6,-2px_-2px_6px_#ffffff] flex items-center justify-center shrink-0">
                {activeItem?.message_type === 'whatsapp' ? (
                  <WhatsappLogo size={24} weight="bold" className="text-emerald-400" />
                ) : (
                  <Bell size={24} weight="bold" className="text-white" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                {/* Badges: Category Pill + Status */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="font-arena text-[10.5px] tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-white to-zinc-200 border border-white text-zinc-700 shadow-sm"
                    style={{ WebkitTextStroke: '0.4px' }}
                  >
                    {displayCategory}
                  </span>

                  {hasItems && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F2F7FC] text-amber-700 border border-white/80 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff]">
                      {queue.length} PENDING
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  className="font-arena text-[14px] sm:text-[15px] font-black text-zinc-900 tracking-wide mt-1.5 truncate"
                  style={{ WebkitTextStroke: '0.5px' }}
                >
                  {displayTitle}
                </h3>
              </div>

              {/* Multiple Items Pagination Controls */}
              {queue.length > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : queue.length - 1));
                    }}
                    className="w-7 h-7 rounded-lg bg-[#ebedf2] border border-white/80 shadow-[2px_2px_4px_#c8d0db,-2px_-2px_4px_#ffffff] active:scale-90 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-transform cursor-pointer"
                    title="Previous Notification"
                  >
                    <CaretLeft size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex((prev) => (prev < queue.length - 1 ? prev + 1 : 0));
                    }}
                    className="w-7 h-7 rounded-lg bg-[#ebedf2] border border-white/80 shadow-[2px_2px_4px_#c8d0db,-2px_-2px_4px_#ffffff] active:scale-90 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-transform cursor-pointer"
                    title="Next Notification"
                  >
                    <CaretRight size={14} weight="bold" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Middle Section: Description (Vertically Centered Compartment with Equal Height) */}
          <div className="flex-1 min-h-0 flex items-center py-2 px-1">
            <p className="text-[12.5px] sm:text-[13px] text-zinc-600 leading-relaxed font-medium line-clamp-3 sm:line-clamp-4">
              {displayDescription}
            </p>
          </div>

          {/* Bottom Section: Footer Actions */}
          <div className="shrink-0 flex items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-300/60 shadow-[0_1px_0_#ffffff]">
            {/* Tactile Status Capsule */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F2F7FC] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Status</span>
              <span className="font-arena text-xs sm:text-sm font-black text-emerald-600 tracking-wider">
                {hasItems ? `${queue.length} PENDING` : 'ALL CAUGHT UP'}
              </span>
            </div>

            {/* Action CTA Button (Signature Arena Pill) */}
            <button
              type="button"
              onClick={animateDismiss}
              className="py-2.5 px-5 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white text-xs font-bold rounded-full transition-all duration-150 ease-out flex items-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),2px_2px_6px_#c5ccd6,-2px_-2px_6px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:scale-[0.97] cursor-pointer border border-zinc-800/80"
            >
              <CheckCircle size={15} weight="fill" className="text-emerald-400" />
              <span>Dismiss</span>
            </button>
          </div>

          {/* Bottom Centered Drag Handle Pill (Tactile Debossed Groove for Swiping UP to Dismiss) */}
          <div className="w-full flex items-center justify-center pt-2 pb-0.5 cursor-grab active:cursor-grabbing touch-none shrink-0">
            <div className="w-11 h-1.5 rounded-full bg-zinc-300/70 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),0_1px_1px_#ffffff]" />
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationSliderCard;
