import React, { useState, useEffect, useMemo } from 'react';
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
          <path d="M15.5 3c-.4 1.2-1.5 2-2.8 2s-2.4-.8-2.8-2L4.5 5.5l1.8 4.5 2.7-.9V21h10V9.1l2.7.9 1.8-4.5L15.5 3z" />
        </svg>
      );
    case 'gold-coins':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#eab308">
          <circle cx="8" cy="8" r="6" />
          <circle cx="15" cy="14" r="6" />
        </svg>
      );
    case 'crown-chest':
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#eab308">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z" />
        </svg>
      );
  }
}

/**
 * PrizeRoadModal Component:
 * Powered directly by the user's authentic high-definition 3D game template artwork:
 * /images/prize_road_template.jpg (576 x 1024 / 9:16 aspect ratio).
 *
 * All 3D visual assets (winding 3D road, gift boxes, pedestals, summit chest, laurels,
 * crystals, and landscape) are rendered with native 3D game studio quality.
 *
 * Interactive overlay slots:
 * - Top-left interactive Close button (X)
 * - 7 Card slots with reward icons, stage badges, titles, points, and checkmarks/locks
 * - Stage 8 Grand Prize champagne card next to the summit chest
 * - Floating bottom telemetry pill: "Stage 2 of 8 • 300 / 1,000 PTS"
 * - Interactive Prize Detail Inspector Sheet on tap
 */
export const PrizeRoadModal = ({
  isOpen = false,
  onClose,
  player,
  totalPoints = 300,
}) => {
  const [displayed, setDisplayed] = useState(isOpen);
  const [animOpen, setAnimOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState(null);

  // Progression stats (defaulting to 300 PTS / Stage 2 matching the reference design)
  const effectivePoints = totalPoints > 0 ? totalPoints : 300;
  const progress = useMemo(() => calculatePrizeProgress(effectivePoints), [effectivePoints]);

  // Entrance & Exit animation orchestration
  useEffect(() => {
    if (isOpen) {
      setDisplayed(true);
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setAnimOpen(true);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    } else {
      setAnimOpen(false);
      const timer = setTimeout(() => {
        setDisplayed(false);
        setSelectedPrize(null);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!displayed) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedPrize) setSelectedPrize(null);
        else onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayed, selectedPrize, onClose]);

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

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center select-none font-sans overflow-hidden p-0 sm:p-4">
      {/* Background Dim Scrim with Backdrop Blur */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 ${
          animOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Main Prize Road Container (True 9:16 Aspect Ratio fitting viewport seamlessly) */}
      <div
        className={`relative z-10 w-full max-w-[440px] h-[100dvh] sm:h-[94dvh] sm:max-h-[860px] aspect-[576/1024] sm:rounded-[36px] overflow-hidden flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.65)] border border-white/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          animOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
        }`}
      >
        {/* ========================================================
            1. AUTHENTIC 3D GAME TEMPLATE ARTWORK BACKGROUND
            ======================================================== */}
        <img
          src="/images/prize_road_template.jpg"
          alt="Arena Prize Road"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />

        {/* ========================================================
            2. INTERACTIVE CLOSE BUTTON OVERLAY (Top-Left)
            ======================================================== */}
        <button
          type="button"
          onClick={onClose}
          title="Close Prize Road"
          className="absolute top-[2.2%] left-[4.8%] w-[7.8%] aspect-square rounded-full z-30 cursor-pointer active:scale-90 transition-transform bg-transparent hover:bg-white/10"
        >
          <span className="sr-only">Close</span>
        </button>

        {/* ========================================================
            3. INTERACTIVE CARD OVERLAYS (Stages 1 to 8)
            ======================================================== */}
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
                  style={slot.style}
                  onClick={() => setSelectedPrize(prize)}
                  className="absolute z-20 cursor-pointer group transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
                >
                  <div className="w-full h-full rounded-[18px] bg-gradient-to-r from-[#fffcf2] via-[#fffbf0] to-[#fef3c7] border border-amber-300 shadow-[0_6px_22px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/25 p-2 flex items-center gap-2">
                    {/* Crown Icon */}
                    <div className="w-8 h-8 rounded-xl bg-amber-100/90 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <span className="text-base leading-none">👑</span>
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[9px] font-bold px-2 py-0.2 rounded-full tracking-wide bg-[#1e1b4b] text-amber-200">
                          Stage 8
                        </span>
                      </div>
                      <h4 className="font-black tracking-tight text-indigo-950 text-[11px] truncate">
                        Grand Prize
                      </h4>
                      <p className="text-[9px] font-bold text-amber-800/80 truncate -mt-0.5">
                        VIP Incubation Access
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Stages 1 to 7: Content mapped seamlessly inside the pre-rendered speech bubble slots
            return (
              <div
                key={prize.id}
                style={slot.style}
                onClick={() => setSelectedPrize(prize)}
                className="absolute z-20 cursor-pointer group flex items-center px-2 py-1.5 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Left: Thumbnail Icon positioned over the pre-rendered square */}
                <div className="w-[24%] max-w-[34px] aspect-square flex items-center justify-center shrink-0">
                  <StageThumbnailIcon type={prize.iconType} className="w-[68%] h-[68%] text-purple-700" />
                </div>

                {/* Middle: Stage Badge, Title, Points */}
                <div className="min-w-0 flex-1 pl-1.5 leading-tight">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full tracking-wide bg-[#4c1d95] text-white">
                      {prize.badgeText}
                    </span>

                    {/* Lock Icon for locked stages */}
                    {!isUnlocked && (
                      <Lock size={10} weight="bold" className="text-zinc-400 shrink-0 ml-auto mr-1" />
                    )}
                  </div>

                  {/* Title */}
                  <h4
                    className={`font-black tracking-tight truncate ${
                      prize.title.length > 16
                        ? 'text-[8.5px] sm:text-[9px] text-zinc-900'
                        : 'text-[10px] sm:text-[10.5px] text-zinc-900'
                    }`}
                  >
                    {prize.title}
                  </h4>

                  {/* Subtitle / Points */}
                  {prize.subtitle && (
                    <p className="text-[8.5px] font-bold text-zinc-400 truncate -mt-0.5">
                      {prize.subtitle}
                    </p>
                  )}
                </div>

                {/* Right: Green Checkmark for Unlocked Stages */}
                {isUnlocked && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs mr-1">
                    <CheckCircle size={15} weight="fill" className="text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================
            4. FLOATING BOTTOM TELEMETRY PROGRESS PILL
            ======================================================== */}
        <div className="absolute bottom-3 sm:bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto rounded-full bg-white/95 backdrop-blur-md shadow-[0_8px_24px_rgba(76,29,149,0.25)] px-5 py-2 border border-white/90 flex flex-col items-center justify-center gap-1 w-[280px] sm:w-[300px]">
            {/* Telemetry Text: "Stage 2 of 8 • 300 / 1,000 PTS" */}
            <div className="text-[11.5px] font-bold text-zinc-900 tracking-normal flex items-center gap-1.5 font-sans">
              <span>Stage {progress.currentStage} of {progress.totalStages}</span>
              <span className="text-zinc-400">•</span>
              <span className="text-purple-700 font-extrabold">{progress.currentPoints} / {progress.nextTargetPoints.toLocaleString()} PTS</span>
            </div>

            {/* Smooth Purple Gradient Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-purple-100 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 transition-all duration-500 ease-out shadow-xs"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* ========================================================
            5. INTERACTIVE PRIZE DETAIL INSPECTOR SHEET
            ======================================================== */}
        {selectedPrize && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
            <div className="w-full max-w-[400px] bg-white border border-slate-200 rounded-[28px] p-5 shadow-2xl relative select-none animate-in slide-in-from-bottom-4 duration-200">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedPrize(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 active:scale-90 cursor-pointer shadow-xs"
              >
                <X size={16} weight="bold" />
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
              <div className="flex items-center gap-3.5 my-3 pb-3 border-b border-zinc-100">
                <div className="w-12 h-12 rounded-2xl bg-[#f5f3ff] border border-purple-100 flex items-center justify-center shrink-0 shadow-xs">
                  <StageThumbnailIcon type={selectedPrize.iconType} className="w-7 h-7 text-purple-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-arena text-base font-black text-zinc-900 leading-tight">
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
              <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-3 mb-3 space-y-1.5">
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
              <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium px-1 mb-4">
                <MapPin size={15} weight="bold" className="text-zinc-500 shrink-0" />
                <span>Claim at: <strong className="text-zinc-900">{selectedPrize.redemptionLocation}</strong></span>
              </div>

              {/* Status Action Button */}
              {selectedPrize.unlocked ? (
                <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
                  <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                  <span>Unlocked & Ready to Claim!</span>
                </div>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-gradient-to-b from-purple-700 to-indigo-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md">
                  <Lock size={15} weight="bold" className="text-purple-300" />
                  <span>{selectedPrize.points - progress.currentPoints} More Points Needed</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PrizeRoadModal;
