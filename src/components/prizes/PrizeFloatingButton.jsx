import React from 'react';
import { Trophy } from '../icons';

/**
 * PrizeFloatingButton Component:
 * Industry game-standard floating action button (FAB) in the bottom-right corner.
 * Features machined double-bezel hardware layering, a glowing golden trophy emblem,
 * tactile spring physics, and an overhanging "PRIZES" brand badge.
 */
export const PrizeFloatingButton = ({
  onClick,
  unclaimedCount = 0,
  currentStage = 1,
  className = '',
}) => {
  return (
    <div
      className={`fixed bottom-20 right-3.5 sm:right-6 md:bottom-6 md:right-8 z-40 select-none ${className}`}
    >
      <button
        type="button"
        onClick={onClick}
        title="View Arena Prize Road & Milestones"
        aria-label="Open Prize Road"
        className="group relative flex flex-col items-center justify-center cursor-pointer outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] active:scale-90 transition-transform duration-150 ease-out"
      >
        {/* Outer Machined Neumorphic Bezel Shell */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] sm:rounded-[24px] bg-[#ebedf2] p-1 shadow-[4px_4px_12px_#b8c2d0,-4px_-4px_12px_#ffffff] border border-white/90 transition-shadow duration-200 group-hover:shadow-[6px_6px_16px_#b0bccb,-6px_-6px_16px_#ffffff]">
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
