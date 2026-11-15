import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy } from '../icons';

const STORAGE_KEY_POS = 'arena_prize_button_pos_v2';

/**
 * PrizeFloatingButton Component:
 * Industry game-standard floating action button (FAB) for the Arena Prize Road.
 * Features:
 * - Default position: bottom-right corner (above mobile bottom bar, right edge).
 * - Fully Draggable: touch and mouse gestures allow attendees to place it anywhere on screen.
 * - Viewport & Chrome clamping: NEVER glides over top nav bar, bottom tab bar, or desktop sidebar.
 * - Layered strictly at z-[34] (between z-30 and z-35), always visible without toggling or disabling.
 * - Double-click / double-tap to reset to default corner position.
 * - Tap vs. Drag discrimination (6px threshold) so clicks reliably toggle the Prize Road modal.
 * - Machined double-bezel hardware layering, glowing golden trophy, and "PRIZES" brand badge.
 */
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

    // Measured element dimensions + buffer for overhanging PRIZES badge (-bottom-1.5 = 6px) and soft shadows
    const width = (rect && rect.width > 0) ? rect.width : (isDesktop ? 68 : 60);
    const height = (rect && rect.height > 0) ? Math.max(rect.height, isDesktop ? 80 : 72) : (isDesktop ? 80 : 72);
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
        {/* Outer Machined Neumorphic Bezel Shell */}
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] sm:rounded-[24px] bg-[#ebedf2] p-1 border border-white/90 transition-all duration-200 ${
            isDragging
              ? 'shadow-[0_16px_36px_rgba(0,0,0,0.38),0_4px_12px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/70 ring-offset-2 ring-offset-black/20'
              : 'shadow-[4px_4px_12px_#b8c2d0,-4px_-4px_12px_#ffffff] group-hover:shadow-[6px_6px_16px_#b0bccb,-6px_-6px_16px_#ffffff]'
          }`}
        >
          {/* Inner Deep Obsidian & Titanium Core */}
          <div className="w-full h-full rounded-[18px] sm:rounded-[20px] bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center relative overflow-hidden border border-zinc-800/90 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.35),inset_0_2px_5px_rgba(255,255,255,0.4)]">
            {/* Ambient Warm Golden Aura (Breathing pulse) */}
            <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-amber-400/25 blur-md pointer-events-none animate-pulse" />

            {/* Subtle Diagonal Glint Line */}
            <div className="absolute -top-6 -left-6 w-14 h-14 bg-gradient-to-br from-white/20 to-transparent rotate-45 pointer-events-none" />

            {/* Radiant Golden Trophy Icon */}
            <div className="relative z-10 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-0.5">
              <Trophy
                size={27}
                weight="fill"
                className="text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.65)]"
              />
            </div>
          </div>
        </div>

        {/* Overhanging Game-Style "PRIZES" Tag */}
        <span className="absolute -bottom-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-black text-[8px] sm:text-[8.5px] uppercase tracking-wider shadow-[0_2px_6px_rgba(0,0,0,0.22)] font-arena border border-amber-200/90 pointer-events-none transition-transform duration-200 group-hover:scale-105">
          PRIZES
        </span>

        {/* Notification Alert / Unlocked Tier Ping */}
        {unclaimedCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white items-center justify-center text-[8.5px] font-black text-white shadow-xs">
              {unclaimedCount}
            </span>
          </span>
        )}
      </button>
    </div>
  );
};

export default PrizeFloatingButton;
