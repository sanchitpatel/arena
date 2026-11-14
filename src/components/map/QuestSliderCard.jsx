import React, { useRef, useEffect, useState } from 'react';
import { CrystalIcon } from '../dashboard/CrystalIcon';
import { CheckCircle, Sparkle, Scan } from '../icons';

/**
 * QuestSliderCard - Tactile Neumorphic Mobile Quest Slider Card.
 *
 * Designed to seamlessly blend with Arena's signature #ebedf2 clay / molded neumorphic language:
 * 1. Sheet Stacking: Positioned at z-[38] behind bottom tab bar (z-40) with rounded-t-[28px] sm:rounded-t-[32px],
 *    so it emerges from behind the bottom tab bar on entrance and slides back behind it on exit.
 * 2. Middle-Screen Focus Scrim: Softly dulls and blurs only the center map viewport (top-12 z-[35])
 *    leaving the top app bar and bottom tab bar clean and prominent.
 * 3. Tactile #ebedf2 Clay Theme: Molded surface with dual-directional light simulation, raised crystal tile,
 *    curated Arena tokens (identity room pill, debossed badge capsules), and signature high-contrast pill CTA.
 * 4. Butter-Smooth Slide Animations: 320ms Apple spring glide up, 260ms exit down, and velocity-aware
 *    swipe-down gesture dismissal with rubber-band resistance when pulling up.
 */
export const QuestSliderCard = ({
  quest,
  isCompleted = false,
  onClose,
  onNavigate,
  onComplete,
}) => {
  const [displayedQuest, setDisplayedQuest] = useState(quest);
  const [isOpen, setIsOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const sheetRef = useRef(null);

  // Active quest fallback ensures component never returns null on the first render tick
  const activeQuest = quest || displayedQuest;

  // Entrance & Exit animation orchestration
  useEffect(() => {
    if (quest) {
      setDisplayedQuest(quest);
      setDragOffset(0);
      setIsDragging(false);

      // Double rAF ensures element is painted in DOM at closed position (translateY(115%))
      // before transitioning to translateY(0), guaranteeing the slide-up animation plays smoothly every time.
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setIsOpen(true);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    } else {
      setIsOpen(false);
      setDragOffset(0);
      setIsDragging(false);

      const timer = setTimeout(() => {
        setDisplayedQuest(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [quest]);

  // Smooth slide-down dismiss
  const animateDismiss = () => {
    setIsOpen(false);
    setDragOffset(0);
    setIsDragging(false);

    setTimeout(() => {
      onClose?.();
      setDisplayedQuest(null);
    }, 280);
  };

  // Close on Escape key
  useEffect(() => {
    if (!activeQuest) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') animateDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuest]);

  // --- Touch & Pointer Gesture Handling (Swipe to Dismiss) ---
  const handlePointerDown = (e) => {
    // Ignore clicks on interactive buttons
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

    // Dismiss if dragged down by > 60px
    if (currentYRef.current > 60) {
      animateDismiss();
    } else {
      // Snap back to open position
      setDragOffset(0);
    }
  };

  if (!activeQuest) return null;

  // Determine transform and transition styles dynamically
  const cardStyle = isDragging
    ? {
        transform: `translateY(${dragOffset}px)`,
        transition: 'none',
        willChange: 'transform',
      }
    : {
        transform: isOpen ? 'translateY(0px)' : 'translateY(115%)',
        transition: isOpen
          ? 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)'
          : 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform',
      };

  return (
    <>
      {/* Full-Screen Focus Scrim (At z-[35], so top header and bottom nav at z-40 sit above it completely unblurred) */}
      <div
        onClick={animateDismiss}
        className={`fixed inset-0 z-[35] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto cursor-pointer' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet Container: Positioned at z-[38] to emerge from behind the bottom tab bar (z-40) */}
      <div className="fixed bottom-0 left-0 right-0 z-[38] pointer-events-none flex justify-center px-2 sm:px-4">
        <div
          ref={sheetRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="pointer-events-auto w-full max-w-[420px] sm:max-w-[500px] md:max-w-[540px] bg-[#ebedf2] border border-white/90 rounded-t-[28px] sm:rounded-t-[32px] md:rounded-[28px] shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_-12px_36px_rgba(197,204,214,0.7)] p-4 pt-1.5 pb-20 md:pb-5 md:mb-5 select-none touch-pan-y"
          style={cardStyle}
        >
          {/* Top Centered Drag Handle Pill (Tactile Debossed Groove) */}
          <div className="w-full flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none">
            <div className="w-11 h-1.5 rounded-full bg-zinc-300/70 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),0_1px_1px_#ffffff]" />
          </div>

          {/* Quest Header */}
          <div className="flex items-center gap-3 pb-2.5 mb-2.5 border-b border-zinc-300/60 shadow-[0_1px_0_#ffffff]">
            {/* Raised Tactile Crystal Tile */}
            <div className="w-12 h-12 rounded-2xl bg-[#ebedf2] shadow-[2px_2px_5px_#c8d0db,-2px_-2px_5px_#ffffff] border border-white/90 flex items-center justify-center shrink-0 p-1.5 relative overflow-hidden">
              <div
                className="absolute inset-0 rounded-2xl opacity-25 blur-md pointer-events-none"
                style={{ backgroundColor: activeQuest.glowColor || '#38bdf8' }}
              />
              <div className="relative z-10 w-full h-full flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]">
                <CrystalIcon color={activeQuest.gemColor} className="w-full h-full" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {/* Badges: Room + Difficulty + Type */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Room Pill (Signature Arena Identity Gradient) */}
                <span
                  className="font-arena text-[10px] tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-white to-zinc-200 border border-white text-zinc-700 shadow-sm"
                  style={{ WebkitTextStroke: '0.4px' }}
                >
                  {activeQuest.room}
                </span>

                {/* Difficulty Capsule */}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F2F7FC] text-zinc-600 border border-white/80 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff]">
                  {activeQuest.difficulty}
                </span>

                {/* Type Capsule */}
                {activeQuest.type && (
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f0f2f5] text-zinc-500 border border-zinc-300/50 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff]">
                    {activeQuest.type}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3
                className="font-arena text-[14px] sm:text-[15px] font-black text-zinc-900 tracking-wide mt-1.5 truncate"
                style={{ WebkitTextStroke: '0.5px' }}
              >
                {activeQuest.title}
              </h3>
            </div>
          </div>

          {/* Quest Description */}
          <p className="text-xs sm:text-[12.5px] text-zinc-600 leading-relaxed font-medium px-0.5">
            {activeQuest.description}
          </p>

          {/* Footer Actions */}
          <div className="mt-3 flex items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-300/60 shadow-[0_1px_0_#ffffff]">
            {/* Tactile Reward Well */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F2F7FC] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Reward</span>
              <span className="font-arena text-xs sm:text-sm font-black text-emerald-600 tracking-wider">
                +{activeQuest.points} PTS
              </span>
            </div>

            {/* Action CTA Button (Signature Arena Pill) */}
            {isCompleted ? (
              <div className="px-4 py-2 rounded-full bg-emerald-100/60 border border-emerald-300/70 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-[inset_1.5px_1.5px_3px_#bbf7d0,inset_-1.5px_-1.5px_3px_#ffffff]">
                <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                <span>Completed</span>
              </div>
            ) : activeQuest.actionType === 'scanner' ? (
              <button
                type="button"
                onClick={() => {
                  if (typeof onNavigate === 'function') onNavigate('scanner');
                }}
                className="py-2.5 px-5 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white text-xs font-bold rounded-full transition-all duration-150 ease-out flex items-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),2px_2px_6px_#c5ccd6,-2px_-2px_6px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:scale-[0.97] cursor-pointer border border-zinc-800/80"
              >
                <Scan size={15} weight="bold" />
                <span>{activeQuest.actionLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onComplete?.(activeQuest)}
                className="py-2.5 px-5 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white text-xs font-bold rounded-full transition-all duration-150 ease-out flex items-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),2px_2px_6px_#c5ccd6,-2px_-2px_6px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:scale-[0.97] cursor-pointer border border-zinc-800/80"
              >
                <Sparkle size={15} weight="fill" className="text-amber-400" />
                <span>{activeQuest.actionLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default QuestSliderCard;
