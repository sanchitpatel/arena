import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkle } from '../icons';

const STORAGE_KEY_POS = 'arena_prize_button_pos_v3';

/**
 * 3D Royal Reward Chest Icon:
 * Uses the authentic high-fidelity chest SVG asset from /chest.svg
 */
export const RewardChestIcon = ({ className = 'w-full h-full' }) => (
  <img
    src="/chest.svg"
    alt="Prize Road Chest"
    className={`select-none pointer-events-none ${className}`}
    draggable={false}
  />
);

export const PrizeFloatingButton = ({
  onClick,
  unclaimedCount = 0,
  currentStage = 1,
  className = '',
}) => {
  const containerRef = useRef(null);
  const cleanupListenersRef = useRef(null);
  const lastTapTimeRef = useRef(0);

  // Position: null means default responsive CSS position (top-right corner: top-16 right-3.5 etc.)
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_POS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);

  // Mutable refs to track drag state without triggering excessive re-renders
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    hasMoved: false,
    active: false,
  });

  const hasDraggedRef = useRef(false);

  // Viewport & Chrome Clamping Utility:
  // Guarantees the icon NEVER glides over or clips into:
  // 1. Top Navigation Bar (z-40): Clamped at least 10px below its bottom edge
  // 2. Mobile Bottom Tab Bar (z-40): Clamped at least 10px above its top edge
  // 3. Desktop Left Sidebar (z-40): Clamped at least 10px to the right of its edge
  // 4. Viewport boundaries: Clamped with safe margins so it cannot be dragged off-screen
  const getClampedPosition = useCallback((x, y) => {
    if (typeof window === 'undefined') return { x, y };

    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const isDesktop = window.innerWidth >= 768;

    // Measured element dimensions (52px mobile, 60px desktop)
    const width = (rect && rect.width > 0) ? rect.width : (isDesktop ? 60 : 52);
    const height = (rect && rect.height > 0) ? rect.height : (isDesktop ? 60 : 52);
    const pad = 10;

    // 1. Top Nav Bar Clearance (stops icon from gliding into or over top nav)
    let topNavBottom = 56;
    const headerEl = document.querySelector('header');
    if (headerEl) {
      const hRect = headerEl.getBoundingClientRect();
      if (hRect.height > 0) {
        topNavBottom = hRect.bottom;
      }
    }
    const minY = topNavBottom + pad;

    // 2. Mobile Bottom Tab Bar Clearance (stops icon from gliding into or over bottom tab bar)
    let bottomNavTop = window.innerHeight;
    if (!isDesktop) {
      const navEl = document.querySelector('nav');
      if (navEl) {
        const nRect = navEl.getBoundingClientRect();
        if (nRect.height > 0 && nRect.top < window.innerHeight) {
          bottomNavTop = nRect.top;
        }
      } else {
        bottomNavTop = window.innerHeight - 68;
      }
    }
    const maxY = Math.max(minY, bottomNavTop - height - pad);

    // 3. Desktop Left Sidebar Clearance (stops icon from gliding into or over left sidebar)
    let sidebarRight = 0;
    if (isDesktop) {
      const asideEl = document.querySelector('aside');
      if (asideEl) {
        const aRect = asideEl.getBoundingClientRect();
        if (aRect.width > 0) {
          sidebarRight = aRect.right;
        }
      } else {
        sidebarRight = 256;
      }
    }
    const minX = sidebarRight > 0 ? sidebarRight + pad : pad;
    const maxX = Math.max(minX, window.innerWidth - width - pad);

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, []);

  // Handle window resize: clamp position so it never goes off-screen
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const clamped = getClampedPosition(prev.x, prev.y);
        if (clamped.x === prev.x && clamped.y === prev.y) return prev;
        try {
          window.localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(clamped));
        } catch {}
        return clamped;
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getClampedPosition]);

  // Clean up any lingering drag listeners on component unmount
  useEffect(() => {
    return () => {
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
      }
    };
  }, []);

  // Pointer down: initiate gesture tracking
  const handlePointerDown = (e) => {
    // Only primary mouse button (0) or touch
    if (e.button !== undefined && e.button !== 0) return;

    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: currentX,
      originY: currentY,
      hasMoved: false,
      active: true,
    };

    const handlePointerMove = (moveEvent) => {
      const state = dragRef.current;
      if (!state.active) return;

      const deltaX = moveEvent.clientX - state.startX;
      const deltaY = moveEvent.clientY - state.startY;
      const distance = Math.hypot(deltaX, deltaY);

      // 6px threshold to distinguish tap vs deliberate drag
      if (distance > 6) {
        if (!state.hasMoved) {
          state.hasMoved = true;
          hasDraggedRef.current = true;
          setIsDragging(true);
        }

        const nextX = state.originX + deltaX;
        const nextY = state.originY + deltaY;
        const clamped = getClampedPosition(nextX, nextY);

        setPosition(clamped);
      }
    };

    const handlePointerUp = () => {
      const state = dragRef.current;
      if (!state.active) return;

      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }

      const didDrag = state.hasMoved;
      state.active = false;
      setIsDragging(false);

      if (didDrag) {
        // Save dragged coordinates in localStorage
        setPosition((latest) => {
          if (latest) {
            try {
              window.localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(latest));
            } catch {}
          }
          return latest;
        });

        // Keep hasDraggedRef true briefly to swallow the immediate synthetic click
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 140);
      } else {
        hasDraggedRef.current = false;

        // Double-tap reset gesture detection for touch devices
        const now = Date.now();
        if (now - lastTapTimeRef.current < 320) {
          // Double-tap detected: smoothly reset position to default corner
          lastTapTimeRef.current = 0;
          try {
            window.localStorage.removeItem(STORAGE_KEY_POS);
          } catch {}
          setPosition(null);
          return;
        }
        lastTapTimeRef.current = now;
      }
    };

    cleanupListenersRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleButtonClick = (e) => {
    if (hasDraggedRef.current || isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.();
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      window.localStorage.removeItem(STORAGE_KEY_POS);
    } catch {}
    setPosition(null);
  };

  // Determine fixed positioning:
  // If position is null: use responsive top-right Tailwind classes
  // If position is set: use inline top/left coordinates
  const positionClasses = position ? '' : 'top-14 right-3.5 sm:top-16 sm:right-6 md:top-16 md:right-8';
  const positionStyle = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      style={{
        ...positionStyle,
        touchAction: 'none',
      }}
      className={`fixed z-[34] select-none touch-none ${positionClasses} ${
        isDragging
          ? 'cursor-grabbing scale-105 transition-none'
          : 'cursor-grab transition-transform duration-150'
      } ${className}`}
    >
      <button
        type="button"
        onClick={handleButtonClick}
        title="Arena Prize Road & Milestones (Drag to reposition anywhere • Double-tap to reset)"
        aria-label="Open Prize Road"
        className={`group relative flex flex-col items-center justify-center outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab active:scale-95'
        } transition-transform duration-150 ease-out`}
      >
        {/* Outer Machined Neumorphic Bezel Shell */}
        <div
          className={`w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-xl sm:rounded-2xl bg-[#ebedf2] p-1 border border-white/90 transition-all duration-200 ${
            isDragging
              ? 'shadow-[0_14px_30px_rgba(0,0,0,0.22),0_4px_10px_rgba(0,0,0,0.12)] ring-2 ring-white/90 ring-offset-2 ring-offset-black/15'
              : 'shadow-[inset_0_3px_5px_#ffffff,inset_0_-3px_6px_rgba(0,0,0,0.18)] sm:shadow-[inset_0_4px_7px_#ffffff,inset_0_-4px_8px_rgba(0,0,0,0.22)] group-hover:shadow-[inset_0_4px_8px_#ffffff,inset_0_-5px_9px_rgba(0,0,0,0.26)]'
          }`}
        >
          {/* Inner Clean White Core with Inward Soft Shadows (White at Top, Black at Bottom) */}
          <div className="w-full h-full rounded-lg sm:rounded-xl bg-white flex flex-col items-center justify-center relative overflow-hidden border border-slate-100 shadow-[inset_0_2px_4px_rgba(255,255,255,1),inset_0_-3px_5px_rgba(0,0,0,0.14)]">
            {/* 3D Radiant Reward Chest */}
            <div className="relative z-10 w-full h-full flex items-center justify-center sm:p-1 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-0.5 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
              <RewardChestIcon className="w-full h-full object-contain scale-115 sm:scale-120" />
            </div>

            {/* Periodic Wide Specular Sheen Sweep (Synchronized with Map Crystal Shine) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              <div
                className="chest-sheen-sweep absolute -inset-[100%] pointer-events-none"
                style={{
                  background: 'linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.03) 35%, rgba(255,255,255,0.25) 44%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.95) 52%, rgba(255,255,255,0.85) 54%, rgba(255,255,255,0.25) 60%, rgba(255,255,255,0.03) 69%, transparent 79%)',
                }}
              />
            </div>

            {/* Synchronized Specular Starburst Flash (Enlarged with celestial bloom) */}
            <div className="absolute top-0.5 right-1 sm:top-1 sm:right-1.5 pointer-events-none z-30 chest-glint-twinkle">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white filter drop-shadow-[0_0_6px_rgba(255,255,255,1)] drop-shadow-[0_0_12px_rgba(186,230,253,0.85)]">
                <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Notification Alert / Unlocked Tier Ping */}
        {unclaimedCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-gradient-to-r from-amber-400 to-yellow-400 border-2 border-white items-center justify-center text-[7.5px] sm:text-[8.5px] font-black text-zinc-950 shadow-xs">
              {unclaimedCount}
            </span>
          </span>
        )}
      </button>
    </div>
  );
};

export default PrizeFloatingButton;
