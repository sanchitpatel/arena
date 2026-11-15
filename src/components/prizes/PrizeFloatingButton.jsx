import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkle } from '../icons';

const STORAGE_KEY_POS = 'arena_prize_button_pos_v2';

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

  // Position: null means default responsive CSS position (bottom-20 right-3.5 etc.)
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

    // Measured element dimensions (scaled down for mobile view: 44px mobile, 56px desktop)
    const width = (rect && rect.width > 0) ? rect.width : (isDesktop ? 56 : 44);
    const height = (rect && rect.height > 0) ? rect.height : (isDesktop ? 56 : 44);
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
  // If position is null: use responsive bottom-right Tailwind classes
  // If position is set: use inline top/left coordinates
  const positionClasses = position ? '' : 'bottom-20 right-3.5 sm:right-6 md:bottom-6 md:right-8';
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
        {/* Outer Machined Neumorphic Bezel Shell (Compact on mobile: 44px vs desktop 56px) */}
        <div
          className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-[#ebedf2] p-1 border border-white/90 transition-all duration-200 ${
            isDragging
              ? 'shadow-[0_14px_30px_rgba(0,0,0,0.22),0_4px_10px_rgba(0,0,0,0.12)] ring-2 ring-white/90 ring-offset-2 ring-offset-black/15'
              : 'shadow-[3px_3px_10px_#b8c2d0,-3px_-3px_10px_#ffffff] sm:shadow-[4px_4px_12px_#b8c2d0,-4px_-4px_12px_#ffffff] group-hover:shadow-[5px_5px_14px_#a8b4c4,-5px_-5px_14px_#ffffff]'
          }`}
        >
          {/* Inner Luminous Sky Blue Gemstone Core (Exact Palette Match to Attendee Orb) */}
          <div className="w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#bae6fd] via-[#38bdf8] via-[#0284c7] to-[#1a7afc] flex flex-col items-center justify-center relative overflow-hidden border border-white/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.75),inset_0_-2px_4px_rgba(0,0,0,0.3)]">
            {/* Ambient Cyan Aura (Breathing pulse matching Orb) */}
            <div className="absolute inset-0 m-auto w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-sky-300/30 blur-xs pointer-events-none animate-pulse" />

            {/* Specular Diagonal Glass Sheen */}
            <div className="absolute -top-6 -left-6 w-14 h-14 bg-gradient-to-br from-white/40 via-white/10 to-transparent rotate-45 pointer-events-none" />

            {/* 3D Radiant Golden Reward Chest with Hexagonal Crystal Clasp */}
            <div className="relative z-10 w-full h-full flex items-center justify-center p-1 sm:p-1.5 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-0.5 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
              <RewardChestIcon className="w-full h-full object-contain" />
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
