import React, { useRef, useEffect, useState } from 'react';
import { CrystalIcon } from '../dashboard/CrystalIcon';
import { CheckCircle, Sparkle, Scan } from '../icons';

/**
 * QuestSliderCard - WhatsApp-style mobile slider bottom card for task details.
 *
 * Key Features:
 * 1. 100% Reliable Render: Uses reactive activeQuest (quest || displayedQuest) so the card
 *    is guaranteed to mount and animate into view on the very first crystal click without missing.
 * 2. Background Focus Scrim: Softly dulls out background (30% tint + micro-blur) so visual focus
 *    rests squarely on the card. Tapping the background dismisses smoothly.
 * 3. Butter-Smooth Slide Animations:
 *    - Entrance: 320ms Apple spring glide up from bottom (cubic-bezier(0.32, 0.72, 0, 1)).
 *    - Exit: 260ms smooth slide-down BEFORE unmounting from DOM.
 * 4. Gesture Slider: Tactile drag-to-dismiss (swipe down) with rubber-band resistance when pulling up.
 * 5. Clean Header: Cross button removed for a clean, spacious layout.
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

      // Double rAF ensures the element is first painted in DOM at closed position (translateY(115%))
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
      {/* Background Focus Scrim (Softly dulls out only the middle screen behind the card) */}
      <div
        onClick={animateDismiss}
        className={`fixed inset-x-0 bottom-0 top-12 z-[35] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto cursor-pointer' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div className="fixed bottom-0 left-0 right-0 z-[38] pointer-events-none flex justify-center px-2 sm:px-4">
        <div
          ref={sheetRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="pointer-events-auto w-full max-w-[420px] sm:max-w-[500px] md:max-w-[540px] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-t-[28px] sm:rounded-t-[32px] md:rounded-[28px] shadow-[0_-12px_36px_rgba(197,204,214,0.65)] p-4 pt-1.5 pb-20 md:pb-5 md:mb-5 select-none touch-pan-y"
          style={cardStyle}
        >
          {/* Top Centered Drag Handle Pill (Tactile Affordance) */}
          <div className="w-full flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none">
            <div className="w-10 h-1.5 rounded-full bg-[#cbd5e1] shadow-[inset_1px_1px_2px_#94a3b8,inset_-1px_-1px_2px_#ffffff]" />
          </div>

          {/* Quest Header (Clean, spacious header without cross button) */}
          <div className="flex items-center gap-3 pb-2.5 mb-2.5 border-b border-zinc-100">
            {/* Prismatic Crystal Display with Ambient Soft Glow */}
            <div className="relative w-8 h-12 shrink-0 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full opacity-30 blur-sm pointer-events-none"
                style={{ backgroundColor: activeQuest.glowColor || '#6366f1' }}
              />
              <div className="relative z-10 w-full h-full flex items-center justify-center filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.22)]">
                <CrystalIcon color={activeQuest.gemColor} className="w-full h-full" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {/* Badges: Room + Difficulty + Type */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#f0f2f5] text-zinc-700 border border-slate-200/90 shadow-[inset_1px_1px_2px_#dbe1ea,inset_-1px_-1px_2px_#ffffff]">
                  {activeQuest.room}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs">
                  {activeQuest.difficulty}
                </span>
                {activeQuest.type && (
                  <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200/60">
                    {activeQuest.type}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-arena text-sm font-black text-zinc-900 tracking-wide mt-1 truncate">
                {activeQuest.title}
              </h3>
            </div>
          </div>

          {/* Quest Description */}
          <p className="text-xs text-zinc-600 leading-relaxed font-medium px-0.5">
            {activeQuest.description}
          </p>

          {/* Footer Actions */}
          <div className="mt-3.5 flex items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-100">
            {/* Tactile Reward Capsule */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0f2f5] border border-white/80 shadow-[inset_1.5px_1.5px_3px_#c8d0db,inset_-1.5px_-1.5px_3px_#ffffff]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Reward</span>
              <span className="font-arena text-xs sm:text-sm font-black text-emerald-600">
                +{activeQuest.points} PTS
              </span>
            </div>

            {/* Action Button (Signature Black & White Theme) */}
            {isCompleted ? (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                <span>Completed</span>
              </div>
            ) : activeQuest.actionType === 'scanner' ? (
              <button
                type="button"
                onClick={() => {
                  if (typeof onNavigate === 'function') onNavigate('scanner');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff] hover:from-zinc-800 hover:to-zinc-900 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Scan size={15} weight="bold" />
                <span>{activeQuest.actionLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onComplete?.(activeQuest)}
                className="px-4 py-2 rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff] hover:from-zinc-800 hover:to-zinc-900 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
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
