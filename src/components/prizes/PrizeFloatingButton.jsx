import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkle } from '../icons';

const STORAGE_KEY_POS = 'arena_prize_button_pos_v2';

/**
 * 3D Royal Reward Chest Icon (Vector Masterwork):
 * Specifically crafted to match the Arena primary theme:
 * - Rich Electric & Sapphire Blue Vaulted Hull (#38bdf8, #0284c7, #0369a1, #082f49)
 * - 24K Polished Golden Reinforced Straps & Rim (#fde047, #f59e0b, #78350f)
 * - Radiant Diamond Starburst erupting from the chest seam
 * - Polished Center Escutcheon with an embedded faceted Cyan Gem
 * - High-clarity silhouette that is instantly recognizable as prizes/rewards in one glance.
 */
export const RewardChestIcon = ({ className = 'w-8 h-8 sm:w-8.5 sm:h-8.5' }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      {/* Soft Cyan & Golden Ambient Light */}
      <radialGradient id="rc-glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.85" />
        <stop offset="45%" stopColor="#0284c7" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
      </radialGradient>

      {/* Polished 24K Gold Hardware */}
      <linearGradient id="rc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fffbeb" />
        <stop offset="25%" stopColor="#fde047" />
        <stop offset="60%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>

      {/* Horizontal Seam Gold */}
      <linearGradient id="rc-gold-rim" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#fde047" />
        <stop offset="70%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>

      {/* Domed Lid Electric Blue */}
      <linearGradient id="rc-lid" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#7dd3fc" />
        <stop offset="25%" stopColor="#38bdf8" />
        <stop offset="65%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>

      {/* Lower Hull Sapphire Cobalt Blue */}
      <linearGradient id="rc-body" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="45%" stopColor="#0369a1" />
        <stop offset="100%" stopColor="#082f49" />
      </linearGradient>

      {/* Cyan Jewel Gem Core */}
      <linearGradient id="rc-gem" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="35%" stopColor="#bae6fd" />
        <stop offset="75%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>

    {/* Layer 1: Warm Golden & Cyan Backlight Glow */}
    <circle cx="18" cy="17" r="14" fill="url(#rc-glow)" />

    {/* Layer 2: Radiant Starburst Light erupting from Chest Seam */}
    <g className="animate-pulse" style={{ transformOrigin: '18px 14px' }}>
      {/* Core Diamond Star */}
      <path
        d="M18 3.5 L19.8 11.2 L27.5 13 L19.8 14.8 L18 22.5 L16.2 14.8 L8.5 13 L16.2 11.2 Z"
        fill="#ffffff"
        opacity="0.9"
      />
      <path
        d="M18 5.5 L19.2 11.5 L25 13 L19.2 14.5 L18 20.5 L16.8 14.5 L11 13 L16.8 11.5 Z"
        fill="#fef08a"
        opacity="0.95"
      />
      {/* Star Sparkle Satellite Accents */}
      <circle cx="28" cy="7.5" r="1" fill="#ffffff" />
      <circle cx="7.5" cy="9.5" r="0.8" fill="#fef08a" />
      <circle cx="29.5" cy="21.5" r="0.7" fill="#fde047" />
    </g>

    {/* Layer 3: Chest Lower Body (Hull) */}
    <rect
      x="5.5"
      y="15.5"
      width="25"
      height="13.5"
      rx="3.5"
      fill="url(#rc-body)"
      stroke="#082f49"
      strokeWidth="0.8"
    />
    {/* Hull Inner Highlights & Shadows */}
    <rect x="6.5" y="16.5" width="23" height="2.5" fill="#ffffff" fillOpacity="0.22" />
    <rect x="6.5" y="26" width="23" height="2" rx="1" fill="#000000" fillOpacity="0.35" />

    {/* Layer 4: Vaulted Domed Lid */}
    <path
      d="M5 16 C5 10.5, 9.5 7.5, 18 7.5 C26.5 7.5, 31 10.5, 31 16 Z"
      fill="url(#rc-lid)"
      stroke="#075985"
      strokeWidth="0.8"
    />
    {/* Curved Specular Reflection along Vault Crown */}
    <path
      d="M8.5 13 C11 9.5, 14 9, 18 9 C22 9, 25 9.5, 27.5 13"
      stroke="#ffffff"
      strokeWidth="1.1"
      strokeLinecap="round"
      fill="none"
      opacity="0.8"
    />

    {/* Layer 5: Vertical Reinforced Gold Straps (Left & Right) */}
    {/* Left Strap */}
    <path d="M10 9.2 C10.8 8.8, 11.8 8.5, 13 8.2 L13 16 L10 16 Z" fill="url(#rc-gold)" />
    <rect x="10" y="15.5" width="3" height="13.5" fill="url(#rc-gold)" stroke="#78350f" strokeWidth="0.4" />
    <line x1="11.5" y1="16" x2="11.5" y2="28" stroke="#ffffff" strokeWidth="0.6" opacity="0.85" />

    {/* Right Strap */}
    <path d="M26 9.2 C25.2 8.8, 24.2 8.5, 23 8.2 L23 16 L26 16 Z" fill="url(#rc-gold)" />
    <rect x="23" y="15.5" width="3" height="13.5" fill="url(#rc-gold)" stroke="#78350f" strokeWidth="0.4" />
    <line x1="24.5" y1="16" x2="24.5" y2="28" stroke="#ffffff" strokeWidth="0.6" opacity="0.85" />

    {/* Layer 6: Horizontal Seam Rim / Gasket */}
    <rect
      x="4"
      y="15"
      width="28"
      height="2.5"
      rx="1.2"
      fill="url(#rc-gold-rim)"
      stroke="#78350f"
      strokeWidth="0.5"
    />
    <line x1="5" y1="15.5" x2="31" y2="15.5" stroke="#ffffff" strokeWidth="0.7" opacity="0.9" />

    {/* Layer 7: Golden Center Clasp Plate with Glowing Cut Cyan Gem */}
    {/* Escutcheon Plate */}
    <path
      d="M15.5 15 L20.5 15 L20.5 19.5 C20.5 21.8, 18 23.5, 18 23.5 C18 23.5, 15.5 21.8, 15.5 19.5 Z"
      fill="url(#rc-gold)"
      stroke="#78350f"
      strokeWidth="0.6"
    />
    {/* Cyan Gem Core */}
    <circle cx="18" cy="18.5" r="1.8" fill="url(#rc-gem)" stroke="#0369a1" strokeWidth="0.4" />
    {/* Specular White Sparkle Glint on Gem */}
    <circle cx="17.4" cy="17.8" r="0.5" fill="#ffffff" />

    {/* Layer 8: Bottom Corner Hardware Rivets */}
    <circle cx="6.8" cy="26.8" r="0.8" fill="#fde047" stroke="#78350f" strokeWidth="0.3" />
    <circle cx="29.2" cy="26.8" r="0.8" fill="#fde047" stroke="#78350f" strokeWidth="0.3" />
  </svg>
);

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
 * - Machined double-bezel hardware layering, glowing royal reward chest, and "PRIZES" brand badge.
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

    // Measured element dimensions
    const width = (rect && rect.width > 0) ? rect.width : (isDesktop ? 64 : 56);
    const height = (rect && rect.height > 0) ? rect.height : (isDesktop ? 64 : 56);
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
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-[#ebedf2] p-1 border border-white/90 transition-all duration-200 ${
            isDragging
              ? 'shadow-[0_14px_30px_rgba(0,0,0,0.22),0_4px_10px_rgba(0,0,0,0.12)] ring-2 ring-white/90 ring-offset-2 ring-offset-black/15'
              : 'shadow-[4px_4px_12px_#b8c2d0,-4px_-4px_12px_#ffffff] group-hover:shadow-[6px_6px_16px_#a8b4c4,-6px_-6px_16px_#ffffff]'
          }`}
        >
          {/* Inner Luminous Cyan & Royal Blue Gemstone Core (Harmonized with Arena Theme) */}
          <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0c4a6e] flex flex-col items-center justify-center relative overflow-hidden border border-white/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.65),inset_0_-3px_6px_rgba(0,0,0,0.4)]">
            {/* Ambient Electric Blue & Cyan Aura (Breathing pulse) */}
            <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-gradient-to-r from-sky-300/35 to-blue-500/25 blur-md pointer-events-none animate-pulse" />

            {/* Specular Diagonal Glass Sheen */}
            <div className="absolute -top-6 -left-6 w-14 h-14 bg-gradient-to-br from-white/35 via-white/10 to-transparent rotate-45 pointer-events-none" />

            {/* 3D Royal Reward Chest Icon */}
            <div className="relative z-10 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-0.5 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
              <RewardChestIcon className="w-8 h-8 sm:w-8.5 sm:h-8.5" />
            </div>
          </div>
        </div>

        {/* Notification Alert / Unlocked Tier Ping */}
        {unclaimedCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-r from-amber-400 to-yellow-400 border-2 border-white items-center justify-center text-[8.5px] font-black text-zinc-950 shadow-xs">
              {unclaimedCount}
            </span>
          </span>
        )}
      </button>
    </div>
  );
};

export default PrizeFloatingButton;
