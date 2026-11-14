import React, { useRef, useEffect } from 'react';
import { CrystalIcon } from '../dashboard/CrystalIcon';
import { CheckCircle, X, Sparkle, Scan } from '../icons';

/**
 * QuestSliderCard - WhatsApp-style mobile slider bottom card for task details.
 *
 * Key Design Features:
 * 1. Fixed positioning at bottom: Zero layout shift; never distorts the map.
 * 2. Slides up smoothly from behind the mobile navigation tab bar (z-35 vs z-40).
 * 3. Mobile safe-area padding: Content sits cleanly above the tab bar.
 * 4. Gesture slider: Smooth touch/pointer drag-to-dismiss (swipe down to close),
 *    with rubber-band resistance when dragging up.
 * 5. Direct GPU transform tracking: 120fps jank-free performance.
 */
export const QuestSliderCard = ({
  quest,
  isCompleted = false,
  onClose,
  onNavigate,
  onComplete,
}) => {
  const sheetRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Entrance slide animation whenever a new quest is selected
  useEffect(() => {
    if (!quest) return;

    const el = sheetRef.current;
    if (!el) return;

    // Reset position off-screen at bottom
    el.style.transition = 'none';
    el.style.transform = 'translateY(115%)';

    // Trigger smooth slide up
    const raf = requestAnimationFrame(() => {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)';
        sheetRef.current.style.transform = 'translateY(0px)';
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [quest?.id]);

  // Smooth slide-down dismiss
  const animateDismiss = () => {
    const el = sheetRef.current;
    if (!el) {
      onClose?.();
      return;
    }
    el.style.transition = 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)';
    el.style.transform = 'translateY(115%)';
    setTimeout(() => {
      onClose?.();
    }, 260);
  };

  // --- Touch & Pointer Gesture Handling (Swipe to Dismiss) ---
  const handlePointerDown = (e) => {
    // Ignore clicks on interactive buttons
    if (e.target.closest('button')) return;

    startYRef.current = e.clientY;
    currentYRef.current = 0;
    isDraggingRef.current = true;

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || !sheetRef.current) return;

    const deltaY = e.clientY - startYRef.current;

    if (deltaY > 0) {
      // Dragging downwards
      currentYRef.current = deltaY;
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    } else {
      // Upward drag with rubber-banding resistance
      const resisted = deltaY * 0.15;
      currentYRef.current = resisted;
      sheetRef.current.style.transform = `translateY(${resisted}px)`;
    }
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current || !sheetRef.current) return;
    isDraggingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}

    // Dismiss if dragged down by > 65px
    if (currentYRef.current > 65) {
      animateDismiss();
    } else {
      // Snap back to open position with natural spring ease
      sheetRef.current.style.transition = 'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)';
      sheetRef.current.style.transform = 'translateY(0px)';
    }
  };

  if (!quest) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none flex justify-center px-2 sm:px-4">
      <div
        ref={sheetRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="pointer-events-auto w-full max-w-[420px] sm:max-w-[500px] md:max-w-[540px] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-t-[28px] sm:rounded-t-[32px] md:rounded-[28px] shadow-[0_-12px_36px_rgba(197,204,214,0.65)] p-4 pt-1.5 pb-20 md:pb-5 md:mb-5 transition-transform select-none touch-pan-y"
        style={{
          transform: 'translateY(115%)',
          willChange: 'transform',
        }}
      >
        {/* Top Centered Drag Handle Pill (Tactile visual cue for swiping) */}
        <div className="w-full flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none">
          <div className="w-11 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors" />
        </div>

        {/* Quest Header */}
        <div className="flex items-start justify-between gap-3 pb-2.5 mb-2.5 border-b border-zinc-100">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Prismatic Crystal Thumbnail */}
            <div className="relative w-8 h-11 shrink-0 flex items-center justify-center filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
              <CrystalIcon color={quest.gemColor} className="w-full h-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-zinc-600 border border-slate-200">
                  {quest.room}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {quest.difficulty}
                </span>
              </div>
              <h3 className="font-arena text-sm font-black text-zinc-900 tracking-wide mt-1 truncate">
                {quest.title}
              </h3>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={animateDismiss}
            title="Close details"
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 active:scale-90 cursor-pointer transition-all"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Quest Description */}
        <p className="text-xs text-zinc-600 leading-relaxed">
          {quest.description}
        </p>

        {/* Footer Actions */}
        <div className="mt-3.5 flex items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-500">Reward:</span>
            <span className="font-arena text-sm font-black text-emerald-600">
              +{quest.points} PTS
            </span>
          </div>

          {isCompleted ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle size={15} weight="fill" className="text-emerald-600" />
              <span>Completed</span>
            </div>
          ) : quest.actionType === 'scanner' ? (
            <button
              type="button"
              onClick={() => {
                if (typeof onNavigate === 'function') onNavigate('scanner');
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold border border-zinc-800 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3)] hover:from-zinc-800 hover:to-zinc-900 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Scan size={16} weight="bold" />
              <span>{quest.actionLabel}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete?.(quest)}
              className="px-4 py-2 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 text-white text-xs font-bold border border-emerald-500 shadow hover:from-emerald-500 hover:to-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkle size={16} weight="bold" />
              <span>{quest.actionLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestSliderCard;
