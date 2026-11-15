import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  CheckCircle,
  MapPin,
} from '../icons';
import { PRIZE_STAGES, calculatePrizeProgress } from '../../data/prizesData';

// Stage Thumbnail Icons matching the reward types
function StageThumbnailIcon({ type = 'gift', className = 'w-5 h-5' }) {
  switch (type) {
    case 'gift':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-3-3c-1.4 0-2.57.96-2.88 2.26L12 5.5l-.12-1.24A3.003 3.003 0 0 0 9 2a3 3 0 0 0-3 3c0 .35.07.69.18 1H4a2 2 0 0 0-2 2v3h20V8a2 2 0 0 0-2-2zm-9-1c0-.55.45-1 1-1s1 .45 1 1v1h-2V5zm-4 0c0-.55.45-1 1-1s1 .45 1 1v1H7V5zM3 13v7a2 2 0 0 0 2 2h6v-9H3zm10 9h6a2 2 0 0 0 2-2v-7h-8v9z" />
        </svg>
      );
    case 'lightning':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M11 21h-1l1-7H7.5c-.88 0-1.33-1.07-.71-1.7l7-9.5c.57-.77 1.71-.37 1.71.59v6.61h3.5c.88 0 1.33 1.07.71 1.7l-7 9.3z" />
        </svg>
      );
    case 'coins':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <ellipse cx="8" cy="8" rx="6" ry="3" />
          <path d="M2 8v3c0 1.66 2.69 3 6 3s6-1.34 6-3V8" />
          <path d="M2 14v3c0 1.66 2.69 3 6 3s6-1.34 6-3v-3" />
          <path d="M12 11c1.33.64 3.03 1 5 1 3.31 0 6-1.34 6-3V6" />
          <path d="M17 12v3c0 1.66-2.69 3-6 3" />
        </svg>
      );
    case 'bag':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M19 6h-3V5a4 4 0 0 0-8 0v1H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-9-1a2 2 0 0 1 4 0v1h-4V5zm10 15H4V8h16v12z" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      );
    case 'shirt':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M21.9 8.89l-3.71-3.71c-.38-.38-.91-.6-1.46-.6H16c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2H7.27c-.55 0-1.08.22-1.46.6L2.1 8.89c-.78.78-.78 2.05 0 2.83l1.9 1.9V20c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-6.38l1.9-1.9c.78-.78.78-2.05 0-2.83z" />
        </svg>
      );
    case 'gold-coins':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#f59e0b">
          <circle cx="12" cy="12" r="9" stroke="#b45309" strokeWidth="1.5" />
          <path d="M12 6v12M9 9h6M9 15h6" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'crown-chest':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#f59e0b">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
  }
}

/**
 * PrizeSliderCard (formerly PrizeRoadModal):
 * Tactile Neumorphic Mobile Prize Road Slider Card.
 *
 * Replicates the exact properties, gestures, and behaviors of QuestSliderCard:
 * 1. Sheet Stacking: Positioned at z-[38] to emerge from behind the bottom tab bar (z-40)
 *    with rounded-t-[28px] sm:rounded-t-[32px] md:rounded-[28px].
 * 2. Reduced Height: Sized comfortably below the sticky top nav bar with generous clearance (never hides behind it).
 * 3. Focus Scrim: At z-[35], so top header and bottom nav at z-40 sit above it unblurred.
 * 4. Background Scroll Locking: While open, all touchmove and wheel bubbling outside the card is prevented.
 * 5. Auto-Dismiss on ANY External Button Click: Clicking any button/tab outside the slider automatically closes it.
 * 6. Dismissal Channels:
 *    - Click anywhere on the focus scrim.
 *    - Click any button outside the card (top nav, bottom nav, sidebar).
 *    - Pointer/touch swipe-down gesture anywhere on the card (> 40px with upward rubber-band resistance).
 *    - Downward mouse wheel scroll (> 20 delta).
 *    - Escape key press.
 * 7. Visual Framing: Purely frames the authentic 576:1024 Prize Road artwork with minimal padding (no extra headers, crosses, text, or icons).
 */
export const PrizeSliderCard = ({
  isOpen = false,
  onClose,
  player,
  totalPoints = 300,
}) => {
  const [displayed, setDisplayed] = useState(isOpen);
  const [openState, setOpenState] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState(null);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const sheetRef = useRef(null);

  // Progression calculation (defaulting to 300 PTS / Stage 2 matching reference design)
  const effectivePoints = totalPoints > 0 ? totalPoints : 300;
  const progress = useMemo(() => calculatePrizeProgress(effectivePoints), [effectivePoints]);

  // Entrance & Exit animation orchestration identical to QuestSliderCard
  useEffect(() => {
    if (isOpen) {
      setDisplayed(true);
      setDragOffset(0);
      setIsDragging(false);

      // Double rAF ensures element is painted in DOM at closed position (translateY(115%))
      // before transitioning to translateY(0), guaranteeing the slide-up animation plays smoothly every time.
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setOpenState(true);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    } else {
      setOpenState(false);
      setDragOffset(0);
      setIsDragging(false);

      const timer = setTimeout(() => {
        setDisplayed(false);
        setSelectedPrize(null);
      }, 310);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Smooth slide-down dismiss identical to QuestSliderCard
  const animateDismiss = () => {
    setOpenState(false);
    setDragOffset(0);
    setIsDragging(false);

    setTimeout(() => {
      onClose?.();
      setDisplayed(false);
      setSelectedPrize(null);
    }, 310);
  };

  // Close on Escape key
  useEffect(() => {
    if (!displayed) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedPrize) setSelectedPrize(null);
        else animateDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayed, selectedPrize]);

  // Prevent background and main screen scrolling while the slider is open (Identical to QuestSliderCard)
  useEffect(() => {
    if (!openState) return;

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
  }, [openState]);

  // When slider is active, clicking ANY button outside the slider automatically closes it
  useEffect(() => {
    if (!openState) return;

    const handleGlobalClick = (e) => {
      const button = e.target.closest('button, [role="button"], a');
      if (button) {
        // If the button clicked is NOT inside this slider sheet (e.g. top nav, bottom nav, sidebar)
        if (!sheetRef.current || !sheetRef.current.contains(button)) {
          animateDismiss();
        }
      }
    };

    // Use capture phase so we detect the button click immediately without blocking its action
    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [openState]);

  // --- Touch & Pointer Gesture Handling (Swipe to Dismiss) identical to QuestSliderCard ---
  const handlePointerDown = (e) => {
    // Ignore clicks on close button inside detail inspector
    if (e.target.closest('button')) return;

    startYRef.current = e.clientY;
    currentYRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    const deltaY = e.clientY - startYRef.current;
    if (deltaY > 0) {
      // Dragging downwards
      currentYRef.current = deltaY;
      setDragOffset(deltaY);
    } else {
      // Upward drag with rubber-banding resistance
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
    } catch {}

    // Dismiss if dragged down by > 40px
    if (currentYRef.current > 40) {
      animateDismiss();
    } else {
      // Snap back to open position
      setDragOffset(0);
    }
  };

  // Wheel gesture to dismiss on downward trackpad / mouse scroll identical to QuestSliderCard
  const handleWheel = (e) => {
    if (e.deltaY > 20) {
      animateDismiss();
    }
  };

  // Exact coordinates matching the speech bubble slots in the 576 x 1024 template:
  const CARD_SLOTS = useMemo(() => [
    {
      stage: 1,
      style: { left: '3.6%', top: '78.3%', width: '35.2%', height: '8.4%' },
      iconStyle: { left: '4.5%', width: '22%' },
    },
    {
      stage: 2,
      style: { left: '61.8%', top: '70.4%', width: '35.2%', height: '8.4%' },
      iconStyle: { left: '4.5%', width: '22%' },
    },
    {
      stage: 3,
      style: { left: '3.6%', top: '64.3%', width: '35.2%', height: '7.6%' },
      iconStyle: { left: '4.5%', width: '22%' },
    },
    {
      stage: 4,
      style: { left: '61.8%', top: '54.1%', width: '35.2%', height: '8.1%' },
      iconStyle: { left: '4.5%', width: '22%' },
    },
    {
      stage: 5,
      style: { left: '3.6%', top: '45.5%', width: '35.2%', height: '8.1%' },
      iconStyle: { left: '4.5%', width: '22%' },
    },
    {
      stage: 6,
      style: { left: '61.8%', top: '35.6%', width: '35.2%', height: '8.8%' },
      iconStyle: { left: '4.5%', width: '22%' },
    },
    {
      stage: 7,
      style: { left: '3.6%', top: '28.8%', width: '35.2%', height: '7.8%' },
      iconStyle: { left: '4.5%', width: '22%' },
    },
    {
      stage: 8,
      isSummit: true,
      style: { left: '53.0%', top: '15.2%', width: '42.5%', height: '9.2%' },
    },
  ], []);

  if (!displayed || typeof document === 'undefined') return null;

  // Determine transform and transition styles dynamically identical to QuestSliderCard
  const cardStyle = isDragging
    ? {
        transform: `translateY(${dragOffset}px)`,
        transition: 'none',
        willChange: 'transform',
      }
    : {
        transform: openState ? 'translateY(0px)' : 'translateY(115%)',
        transition: openState
          ? 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 300ms cubic-bezier(0.36, 0.66, 0.04, 1)',
        willChange: 'transform',
      };

  return createPortal(
    <>
      {/* Full-Screen Focus Scrim (At z-[35], so top header and bottom nav at z-40 sit above it unblurred) */}
      <div
        onClick={animateDismiss}
        className={`fixed inset-0 z-[35] bg-black/15 backdrop-blur-[1px] touch-none select-none overscroll-none will-change-[opacity] ${
          openState
            ? 'opacity-100 pointer-events-auto cursor-pointer transition-opacity duration-300 ease-out'
            : 'opacity-0 pointer-events-none transition-opacity duration-280 ease-out'
        }`}
      />

      {/* Sheet Container: Positioned at z-[38] to emerge from behind the bottom tab bar (z-40) */}
      <div className="fixed bottom-0 left-0 right-0 z-[38] pointer-events-none flex justify-center px-1.5 sm:px-4">
        <div
          ref={sheetRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          style={cardStyle}
          className="pointer-events-auto w-auto max-w-[min(440px,calc(100vw-1.5rem))] bg-[#ebedf2] border border-white/90 rounded-t-[28px] sm:rounded-t-[32px] md:rounded-[28px] shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_-8px_32px_rgba(0,0,0,0.18)] p-2 sm:p-2.5 pb-20 md:pb-2.5 md:mb-4 select-none touch-none cursor-grab active:cursor-grabbing flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Main Prize Road Artwork Container: Reduced height with comfortable clearance below top nav bar */}
          <div
            style={{
              aspectRatio: '576 / 1024',
              height: 'min(615px, calc(100dvh - 7.5rem))',
            }}
            className="relative w-auto max-w-full rounded-[20px] sm:rounded-[22px] overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06)] [container-type:inline-size] select-none flex items-center justify-center"
          >
            {/* Authentic 3D Game Template Artwork Background (WebP + JPG fallback) */}
            <picture className="absolute inset-0 w-full h-full pointer-events-none select-none">
              <source srcSet="/images/prize_road_template.webp" type="image/webp" />
              <img
                src="/images/prize_road_template.jpg"
                alt="Arena Prize Road"
                className="w-full h-full block object-fill pointer-events-none select-none"
                loading="eager"
                decoding="async"
              />
            </picture>

            {/* Interactive Stage Speech Bubbles (Stages 1 to 8 with container query typography) */}
            <div className="absolute inset-0 w-full h-full pointer-events-auto">
              {CARD_SLOTS.map((slot) => {
                const prize = PRIZE_STAGES.find((p) => p.stage === slot.stage);
                if (!prize) return null;

                const isSummit = slot.isSummit;
                const isUnlocked = prize.unlocked;

                // Stage 8: Grand Prize Champagne Glow Card at Summit
                if (isSummit) {
                  return (
                    <div
                      key={prize.id}
                      data-interactive="true"
                      style={slot.style}
                      onClick={() => {
                        if (!isDraggingRef.current && dragOffset === 0) {
                          setSelectedPrize(prize);
                        }
                      }}
                      className="absolute z-20 cursor-pointer group transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
                    >
                      <div className="w-full h-full rounded-[3.8cqw] bg-gradient-to-r from-[#fffcf2] via-[#fffbf0] to-[#fef3c7] border border-amber-300 shadow-[0_1.5cqw_4cqw_rgba(245,158,11,0.3)] ring-1 ring-amber-400/25 p-[1.8cqw] flex items-center gap-[1.8cqw]">
                        {/* Crown Icon */}
                        <div className="w-[7.5cqw] h-[7.5cqw] rounded-[2.2cqw] bg-amber-100/90 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[3.5cqw] leading-none">👑</span>
                        </div>

                        {/* Text Details */}
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="flex items-center gap-[0.8cqw] mb-[0.4cqw]">
                            <span className="text-[2.1cqw] font-bold px-[1.8cqw] py-[0.2cqw] rounded-full tracking-wide bg-[#1e1b4b] text-amber-200">
                              Stage 8
                            </span>
                          </div>
                          <h4 className="font-black tracking-tight text-indigo-950 text-[2.7cqw] truncate">
                            Grand Prize
                          </h4>
                          <p className="text-[2.1cqw] font-bold text-amber-800/80 truncate -mt-[0.2cqw]">
                            VIP Incubation Access
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Stages 1 to 7: Content mapped seamlessly inside speech bubble slots
                return (
                  <div
                    key={prize.id}
                    data-interactive="true"
                    style={slot.style}
                    onClick={() => {
                      if (!isDraggingRef.current && dragOffset === 0) {
                        setSelectedPrize(prize);
                      }
                    }}
                    className="absolute z-20 cursor-pointer group flex items-center px-[1.5cqw] py-[0.8cqw] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {/* Left: Thumbnail Icon positioned over pre-rendered square */}
                    <div className="w-[24%] max-w-[34px] aspect-square flex items-center justify-center shrink-0">
                      <StageThumbnailIcon type={prize.iconType} className="w-[68%] h-[68%] text-purple-700" />
                    </div>

                    {/* Middle: Stage Badge, Title, Points */}
                    <div className="min-w-0 flex-1 pl-[1.2cqw] leading-tight">
                      <div className="flex items-center gap-[0.8cqw] mb-[0.2cqw]">
                        <span className="text-[2.1cqw] font-bold px-[1.5cqw] py-[0.1cqw] rounded-full tracking-wide bg-[#4c1d95] text-white">
                          {prize.badgeText}
                        </span>

                        {!isUnlocked && (
                          <Lock size={11} weight="bold" className="text-zinc-400 shrink-0 ml-auto mr-[0.5cqw]" />
                        )}
                      </div>

                      {/* Title */}
                      <h4
                        className={`font-black tracking-tight truncate ${
                          prize.title.length > 16
                            ? 'text-[2.2cqw] text-zinc-900'
                            : 'text-[2.5cqw] text-zinc-900'
                        }`}
                      >
                        {prize.title}
                      </h4>

                      {/* Subtitle / Points */}
                      {prize.subtitle && (
                        <p className="text-[2.1cqw] font-bold text-zinc-500 truncate -mt-[0.2cqw]">
                          {prize.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Right: Green Checkmark for Unlocked Stages */}
                    {isUnlocked && (
                      <div className="w-[4.8cqw] h-[4.8cqw] rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs mr-[0.5cqw]">
                        <CheckCircle size={14} weight="fill" className="text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Floating Bottom Telemetry Pill inside road */}
            <div className="absolute bottom-[2.5cqw] sm:bottom-[3.5cqw] left-0 right-0 z-30 flex justify-center pointer-events-none px-[3cqw]">
              <div className="pointer-events-auto rounded-full bg-white/95 backdrop-blur-md shadow-[0_8px_24px_rgba(76,29,149,0.25)] px-[4cqw] py-[1.8cqw] border border-white/90 flex flex-col items-center justify-center gap-[0.8cqw] w-[72cqw] max-w-[320px]">
                <div className="text-[2.6cqw] font-bold text-zinc-900 tracking-normal flex items-center gap-[1cqw] font-sans">
                  <span>Stage {progress.currentStage} of {progress.totalStages}</span>
                  <span className="text-zinc-400">•</span>
                  <span className="text-purple-700 font-extrabold">{progress.currentPoints} / {progress.nextTargetPoints.toLocaleString()} PTS</span>
                </div>

                <div className="w-full h-[1.2cqw] min-h-[5px] rounded-full bg-purple-100 overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 transition-all duration-500 ease-out shadow-xs"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Prize Detail Inspector Sheet Overlay */}
          {selectedPrize && (
            <div
              onClick={() => setSelectedPrize(null)}
              className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150 cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[380px] bg-[#ebedf2] border border-white/90 rounded-[28px] p-4.5 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_16px_36px_rgba(0,0,0,0.3)] relative select-none animate-in slide-in-from-bottom-3 duration-200 cursor-default"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedPrize(null)}
                  className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-[#ebedf2] border border-white flex items-center justify-center text-zinc-500 hover:text-zinc-800 shadow-[2px_2px_4px_#c5ccd6,-2px_-2px_4px_#ffffff] active:scale-90 cursor-pointer transition-all"
                >
                  <X size={14} weight="bold" />
                </button>

                {/* Stage Badge & Required Points */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#4c1d95] text-white">
                    {selectedPrize.badgeText}
                  </span>
                  <span className="text-xs font-bold text-zinc-500">
                    {selectedPrize.points.toLocaleString()} PTS Required
                  </span>
                </div>

                {/* Title & Icon Header */}
                <div className="flex items-center gap-3 my-2.5 pb-2.5 border-b border-zinc-300/60 shadow-[0_1px_0_#ffffff]">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                    <StageThumbnailIcon type={selectedPrize.iconType} className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-arena text-sm sm:text-base font-black text-zinc-900 leading-tight">
                      {selectedPrize.title}
                    </h3>
                    {selectedPrize.subtitle && (
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        {selectedPrize.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-600 leading-relaxed font-medium mb-3">
                  {selectedPrize.description}
                </p>

                {/* Perks Checklist */}
                <div className="bg-[#f0f2f5] border border-white/80 rounded-2xl p-3 mb-3 space-y-1.5 shadow-[inset_1.5px_1.5px_3px_#cbd2de,inset_-1.5px_-1.5px_3px_#ffffff]">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
                    Reward Inclusions
                  </div>
                  {selectedPrize.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-800 font-semibold">
                      <CheckCircle size={14} weight="fill" className="text-emerald-500 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>

                {/* Redemption Location */}
                <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium px-1 mb-3.5">
                  <MapPin size={14} weight="bold" className="text-zinc-500 shrink-0" />
                  <span>Claim at: <strong className="text-zinc-900">{selectedPrize.redemptionLocation}</strong></span>
                </div>

                {/* Status Action Button */}
                {selectedPrize.unlocked ? (
                  <div className="w-full py-2.5 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
                    <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                    <span>Unlocked & Ready to Claim!</span>
                  </div>
                ) : (
                  <div className="w-full py-2.5 rounded-full bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md border border-zinc-800">
                    <Lock size={14} weight="bold" className="text-amber-400" />
                    <span>{selectedPrize.points - progress.currentPoints} More Points Needed</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export const PrizeRoadModal = PrizeSliderCard;
export default PrizeSliderCard;
