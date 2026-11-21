import React from 'react';
import { Scroll, Sparkle } from '../icons';

export const QuestsView = () => {
  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-6 pt-4 pb-12 flex flex-col items-center">
      {/* Page Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-white/90 shadow-[inset_1px_1px_2px_#ffffff,0_2px_6px_rgba(0,0,0,0.04)] mb-2">
          <Sparkle size={13} weight="fill" className="text-sky-600" />
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-zinc-600 font-sans">
            Arena Missions
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-arena">
          Quests
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">
          Complete event missions and challenges to earn Arena points
        </p>
      </div>

      {/* Clean Empty State Card */}
      <div className="w-full rounded-[28px] sm:rounded-[32px] bg-[#ebedf2] border border-white/90 p-8 sm:p-10 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_10px_24px_rgba(0,0,0,0.05)] flex flex-col items-center text-center">
        {/* Recessed Inset Icon Container */}
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#ebedf2] border border-white/80 shadow-[inset_2px_2px_5px_#c8d0db,inset_-2px_-2px_5px_#ffffff] flex items-center justify-center mb-4 transition-transform hover:scale-105">
          <Scroll size={32} weight="duotone" className="text-sky-600" />
        </div>

        {/* Text */}
        <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
          No quests yet
        </h2>
        <p className="text-xs sm:text-[13px] text-zinc-500 font-medium max-w-xs mt-1.5 leading-relaxed">
          Interactive event quests and challenges will appear here during the live session. Check back soon!
        </p>

        {/* Status Pill */}
        <div className="mt-5 px-3 py-1 rounded-full bg-white/80 border border-slate-200/60 shadow-[inset_1px_1px_2px_#ffffff] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-[11px] font-bold text-zinc-600">
            Awaiting new challenges
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuestsView;
