import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  CheckCircle,
  MapPin,
} from '../icons';
import { CrystalIcon } from '../dashboard/CrystalIcon';
import { PRIZE_STAGES, calculatePrizeProgress } from '../../data/prizesData';
import {
  LaurelBranch,
  GiftBox3D,
  MilestonePedestal,
  TreasureChestSummit,
  StageThumbnailIcon,
  DaisyFlower,
} from './PrizeVisualAssets';

/**
 * PrizeRoadModal Component:
 * Exact 1:1 pixel-faithful replication of reference artwork (media_1794757210281_96345b8d.jpg):
 *
 * 1. Single-screen portrait framing — All 8 stages fit simultaneously into view with zero scrolling.
 * 2. Candy Crush-style 3D sweeping lavender S-curve road with dashed white centerline.
 * 3. 3D purple isometric gift boxes with gold ribbons on cylindrical stage pedestals (Stages 1–7):
 *    - Stages 1 & 2 have vibrant neon-green glowing halos (unlocked milestones).
 *    - Stages 3–7 have lavender/purple glowing halos (locked milestones).
 * 4. Radiant Grand Champion Treasure Chest at the summit (Stage 8) with golden god rays,
 *    laurels, stepped milestone disc with lock, and bold white '8'.
 * 5. Alternating floating stage cards (Left: 1, 3, 5, 7; Right: 2, 4, 6, 8) with thumbnail icons,
 *    title-case badges (Stage 1..8), bold titles, and checkmark / lock indicators.
 * 6. Rich fantasy scenery: twilight purple sky, soft clouds, distant mountain ridges,
 *    lush green rolling meadow, scattered daisy blossoms, and multi-gem crystal formations.
 * 7. Top header with translucent close button, ARENA wordmark, and laurel-framed "Prize Road".
 * 8. Floating bottom telemetry progress pill: "Stage 2 of 8 • 300 / 1,000 PTS".
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

  // Derive progression stats (defaulting to 300 PTS / Stage 2 matching the reference image)
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

  // Exact stage coordinates in the 420x860 master canvas:
  // Each stage is spaced by exactly ~80px (9.3%) vertically
  const STAGES_CONFIG = useMemo(() => [
    { stage: 1, xPct: 44.8, yPct: 84.3, side: 'left', pedX: 188, pedY: 725 },
    { stage: 2, xPct: 55.2, yPct: 75.0, side: 'right', pedX: 232, pedY: 645 },
    { stage: 3, xPct: 44.8, yPct: 65.7, side: 'left', pedX: 188, pedY: 565 },
    { stage: 4, xPct: 55.2, yPct: 56.4, side: 'right', pedX: 232, pedY: 485 },
    { stage: 5, xPct: 44.8, yPct: 47.1, side: 'left', pedX: 188, pedY: 405 },
    { stage: 6, xPct: 55.2, yPct: 37.8, side: 'right', pedX: 232, pedY: 325 },
    { stage: 7, xPct: 44.8, yPct: 28.5, side: 'left', pedX: 188, pedY: 245 },
    { stage: 8, xPct: 48.8, yPct: 21.8, side: 'summit', pedX: 205, pedY: 188 },
  ], []);

  // Wide, luscious Candy Crush-style Serpentine S-Curve Path starting at Stage 1 up to Summit Stage 8
  const roadPathD = useMemo(() => {
    return [
      'M 188 725',
      'C 200 685, 245 685, 235 645', // Stage 1 to 2
      'C 225 605, 175 605, 185 565', // Stage 2 to 3
      'C 195 525, 245 525, 235 485', // Stage 3 to 4
      'C 225 445, 175 445, 185 405', // Stage 4 to 5
      'C 195 365, 245 365, 235 325', // Stage 5 to 6
      'C 225 285, 175 285, 185 245', // Stage 6 to 7
      'C 195 215, 205 215, 205 188', // Stage 7 to 8 Summit
    ].join(' ');
  }, []);

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

      {/* Main Prize Road Mobile Shell Container (Locked 420:860 aspect ratio, fitting viewport) */}
      <div
        className={`relative z-10 w-full max-w-[420px] h-[100dvh] sm:h-[94dvh] sm:max-h-[860px] aspect-[420/860] sm:rounded-[36px] overflow-hidden flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.6)] border border-white/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          animOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
        }`}
      >
        {/* ========================================================
            1. MASTER SVG ENVIRONMENT CANVAS (420 x 860 master grid)
            ======================================================== */}
        <svg
          viewBox="0 0 420 860"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            {/* Deep Twilight Sky Gradient */}
            <linearGradient id="sky-twilight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#221042" />
              <stop offset="16%" stopColor="#2e1555" />
              <stop offset="38%" stopColor="#4c227f" />
              <stop offset="62%" stopColor="#69339e" />
              <stop offset="82%" stopColor="#8747bc" />
              <stop offset="100%" stopColor="#9b56ce" />
            </linearGradient>

            {/* Distant Mountain Silhouettes Gradients */}
            <linearGradient id="mtn-back" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#431c6a" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#2b1145" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="mtn-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#582488" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3c175e" stopOpacity="0.85" />
            </linearGradient>

            {/* Road Top Surface Lavender Gradient */}
            <linearGradient id="road-surface" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#faf5ff" />
              <stop offset="40%" stopColor="#f3e8ff" />
              <stop offset="75%" stopColor="#e9d5ff" />
              <stop offset="100%" stopColor="#d8b4fe" />
            </linearGradient>

            {/* Road Extruded 3D Rim Gradient */}
            <linearGradient id="road-rim" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#7e22ce" />
              <stop offset="100%" stopColor="#6b21a8" />
            </linearGradient>

            {/* Lush Rolling Grass Meadow Gradients */}
            <linearGradient id="grass-hill-back" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#84cc16" />
              <stop offset="40%" stopColor="#65a30d" />
              <stop offset="100%" stopColor="#4d7c0f" />
            </linearGradient>
            <linearGradient id="grass-hill-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#65a30d" />
              <stop offset="60%" stopColor="#4d7c0f" />
              <stop offset="100%" stopColor="#365314" />
            </linearGradient>

            {/* Soft Ambient Cloud Gradient */}
            <linearGradient id="cloud-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#e9d5ff" stopOpacity="0.10" />
            </linearGradient>

            {/* Outer Road Glow Filter */}
            <filter id="road-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#a855f7" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* 1. Sky Background */}
          <rect width="420" height="860" fill="url(#sky-twilight)" />

          {/* 2. Soft Floating Clouds in Sky */}
          {/* Upper-Left Cloud (Behind floating crystal) */}
          <path
            d="M 15 140 Q 25 120 45 125 Q 65 115 85 130 Q 105 128 115 145 Q 85 155 15 140 Z"
            fill="url(#cloud-glow)"
          />
          {/* Upper-Right Cloud (Behind Grand Prize card) */}
          <path
            d="M 290 150 Q 310 130 335 135 Q 360 120 385 135 Q 410 132 420 152 Q 370 162 290 150 Z"
            fill="url(#cloud-glow)"
          />
          {/* Mid-Left Cloud */}
          <path
            d="M -10 330 Q 15 315 35 322 Q 55 310 75 325 Q 90 335 70 345 Q 25 348 -10 330 Z"
            fill="url(#cloud-glow)"
          />
          {/* Mid-Right Cloud */}
          <path
            d="M 330 390 Q 355 375 375 382 Q 400 370 425 388 Q 390 405 330 390 Z"
            fill="url(#cloud-glow)"
          />

          {/* 3. Distant Mountain Silhouette Ridges */}
          <path
            d="M 0 250 L 50 200 L 110 235 L 180 165 L 255 230 L 330 180 L 390 225 L 420 205 L 420 300 L 0 300 Z"
            fill="url(#mtn-back)"
          />
          <path
            d="M 0 280 L 70 215 L 140 260 L 210 195 L 290 255 L 360 210 L 420 255 L 420 340 L 0 340 Z"
            fill="url(#mtn-front)"
          />

          {/* 4. Sweeping Serpentine Road (4 Layers of 3D Candy Crush Polish) */}
          {/* Layer A: Ambient Outer Purple Glow */}
          <path
            d={roadPathD}
            stroke="#a855f7"
            strokeWidth="38"
            strokeLinecap="round"
            opacity="0.38"
            filter="url(#road-glow)"
          />

          {/* Layer B: 3D Bottom Extruded Rim */}
          <path
            d={roadPathD}
            stroke="url(#road-rim)"
            strokeWidth="32"
            strokeLinecap="round"
          />

          {/* Layer C: Smooth Top Lavender Surface */}
          <path
            d={roadPathD}
            stroke="url(#road-surface)"
            strokeWidth="24"
            strokeLinecap="round"
          />

          {/* Layer D: Crisp White Dashed Lane Centerline */}
          <path
            d={roadPathD}
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeDasharray="6 7"
            strokeLinecap="round"
            opacity="0.95"
          />

          {/* 5. Lush Green Rolling Meadow at the Bottom */}
          {/* Back Hill Curve */}
          <path
            d="M 0 745 Q 110 725 210 740 Q 320 755 420 730 L 420 860 L 0 860 Z"
            fill="url(#grass-hill-back)"
          />
          {/* Front Hill Curve */}
          <path
            d="M 0 780 Q 140 760 260 785 Q 360 805 420 780 L 420 860 L 0 860 Z"
            fill="url(#grass-hill-front)"
          />
        </svg>

        {/* ========================================================
            2. SCENIC AMBIENT DECORATIONS (Crystals & Flowers)
            ======================================================== */}
        {/* Floating Faceted Purple Crystal (Upper-Left below close button) */}
        <div className="absolute top-22 left-6 w-8 h-12 pointer-events-none filter drop-shadow-[0_4px_14px_rgba(192,132,252,0.85)]">
          <CrystalIcon color="amethyst" className="w-full h-full" />
        </div>

        {/* Bottom-Right Magnificent Crystal Cluster nestled in grass */}
        <div className="absolute bottom-11 right-3 flex items-end gap-1 pointer-events-none z-10 filter drop-shadow-[0_6px_22px_rgba(168,85,247,0.9)]">
          <div className="w-8 h-12 rotate-6">
            <CrystalIcon color="ruby" className="w-full h-full" />
          </div>
          <div className="w-11 h-18 -ml-2 -rotate-6">
            <CrystalIcon color="amethyst" className="w-full h-full" />
          </div>
          <div className="w-7 h-10 -ml-2 rotate-12">
            <CrystalIcon color="diamond" className="w-full h-full" />
          </div>
        </div>

        {/* Bottom-Left Crystal in Grass */}
        <div className="absolute bottom-14 left-4 w-8 h-12 -rotate-12 pointer-events-none z-10 filter drop-shadow-[0_4px_14px_rgba(99,102,241,0.75)]">
          <CrystalIcon color="sapphire" className="w-full h-full" />
        </div>

        {/* Scattered White Daisy Blossoms across the meadow grass */}
        <div className="absolute bottom-7 left-7 pointer-events-none z-10">
          <DaisyFlower className="w-3.5 h-3.5" />
        </div>
        <div className="absolute bottom-11 left-24 pointer-events-none z-10">
          <DaisyFlower className="w-3 h-3" />
        </div>
        <div className="absolute bottom-4 left-36 pointer-events-none z-10">
          <DaisyFlower className="w-3 h-3" />
        </div>
        <div className="absolute bottom-4 right-28 pointer-events-none z-10">
          <DaisyFlower className="w-3.5 h-3.5" />
        </div>
        <div className="absolute bottom-10 right-36 pointer-events-none z-10">
          <DaisyFlower className="w-3 h-3" />
        </div>

        {/* ========================================================
            3. TOP HEADER APP BAR (Laurel-framed Title, Close & Brand)
            ======================================================== */}
        <header className="absolute top-0 left-0 right-0 z-30 pt-3 pb-1 px-4 flex flex-col items-center pointer-events-none">
          {/* Top Row: Translucent Circle Close Button */}
          <div className="w-full flex items-center justify-between pointer-events-auto">
            <button
              type="button"
              onClick={onClose}
              title="Close Prize Road"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-md"
            >
              <X size={18} weight="bold" />
            </button>
            <div className="w-9" />
          </div>

          {/* ARENA Brand Tag */}
          <div className="text-[10px] font-black tracking-[0.28em] text-white/85 uppercase -mt-5 drop-shadow-sm font-sans">
            ARENA
          </div>

          {/* Laurel Wreath Framing "Prize Road" */}
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <LaurelBranch className="text-white drop-shadow-sm w-5 h-7" />
            <h1
              className="text-[28px] sm:text-[32px] font-black italic tracking-wide text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
              style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                WebkitTextStroke: '0.4px rgba(255,255,255,0.7)',
              }}
            >
              Prize Road
            </h1>
            <LaurelBranch flip={true} className="text-white drop-shadow-sm w-5 h-7" />
          </div>

          {/* Subtitle */}
          <p className="text-[11.5px] font-medium text-white/85 text-center drop-shadow-xs max-w-[280px] sm:max-w-none leading-tight mt-0.5 font-sans">
            Complete stages, earn points, and unlock exclusive prizes.
          </p>
        </header>

        {/* ========================================================
            4. THE 8 ROAD STAGES (Pedestals, Gift Boxes & Cards)
            ======================================================== */}
        <div className="absolute inset-0 w-full h-full pointer-events-auto">
          {STAGES_CONFIG.map((cfg) => {
            const prize = PRIZE_STAGES.find((p) => p.stage === cfg.stage);
            if (!prize) return null;

            const isSummit = cfg.stage === 8;
            const isUnlocked = prize.unlocked;

            return (
              <React.Fragment key={prize.id}>
                {/* --- A. PEDESTAL & GIFT BOX ON THE ROAD --- */}
                <div
                  style={{
                    left: `${cfg.xPct}%`,
                    top: `${cfg.yPct}%`,
                  }}
                  onClick={() => setSelectedPrize(prize)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  {isSummit ? (
                    /* Stage 8 Summit Ornate Treasure Chest */
                    <TreasureChestSummit />
                  ) : (
                    /* Stages 1 to 7: 3D Purple Gift Box on Milestone Pedestal */
                    <div className="relative flex flex-col items-center">
                      <div className="-mb-1.5 relative z-10 transition-transform duration-200 group-hover:-translate-y-1">
                        <GiftBox3D className="w-[46px] h-[46px] sm:w-[50px] sm:h-[50px]" />
                      </div>
                      <MilestonePedestal
                        stage={prize.stage}
                        isUnlocked={isUnlocked}
                      />
                    </div>
                  )}
                </div>

                {/* --- B. FLOATING STAGE INFORMATION CARD --- */}
                <div
                  style={{
                    top: `${cfg.yPct}%`,
                    left: cfg.side === 'left' ? '10px' : 'auto',
                    right: (cfg.side === 'right' || cfg.side === 'summit') ? '10px' : 'auto',
                  }}
                  onClick={() => setSelectedPrize(prize)}
                  className={`absolute -translate-y-1/2 z-20 cursor-pointer group transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] ${
                    isSummit
                      ? 'w-[168px] sm:w-[178px]'
                      : 'w-[160px] sm:w-[168px]'
                  }`}
                >
                  <div
                    className={`relative rounded-2xl p-2 transition-shadow duration-200 flex items-center gap-2 ${
                      isSummit
                        ? 'bg-gradient-to-r from-[#fffdf5] via-[#fffbf0] to-[#fef3c7] border border-amber-300 shadow-[0_6px_22px_rgba(245,158,11,0.28)] ring-1 ring-amber-400/20'
                        : 'bg-white/95 backdrop-blur-md border border-white/80 shadow-[0_5px_16px_rgba(76,29,149,0.14)] hover:shadow-[0_8px_22px_rgba(76,29,149,0.22)]'
                    }`}
                  >
                    {/* Left: Thumbnail Icon Container */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isSummit
                          ? 'bg-amber-100/90 border border-amber-200 text-amber-800'
                          : 'bg-[#f5f3ff] border border-purple-100 text-purple-700'
                      }`}
                    >
                      {isSummit ? (
                        <span className="text-base leading-none">👑</span>
                      ) : (
                        <StageThumbnailIcon type={prize.iconType} className="w-4.5 h-4.5" />
                      )}
                    </div>

                    {/* Middle: Stage Badge & Title */}
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span
                          className={`text-[9.5px] font-semibold px-2 py-0.2 rounded-full tracking-wide ${
                            isSummit
                              ? 'bg-[#1e1b4b] text-amber-200'
                              : 'bg-[#4c1d95] text-white'
                          }`}
                        >
                          {prize.badgeText}
                        </span>

                        {/* Lock Icon for locked stages */}
                        {!isUnlocked && !isSummit && (
                          <Lock size={10} weight="bold" className="text-zinc-400 shrink-0 ml-auto" />
                        )}
                      </div>

                      {/* Title */}
                      <h4
                        className={`font-black tracking-tight truncate ${
                          isSummit
                            ? 'text-indigo-950 font-black text-[11px]'
                            : prize.title.length > 18
                              ? 'text-[9.5px] text-zinc-900'
                              : 'text-[10.5px] sm:text-[11px] text-zinc-900'
                        }`}
                      >
                        {prize.title}
                      </h4>

                      {/* Subtitle / Points (Only if present) */}
                      {prize.subtitle && (
                        <p
                          className={`text-[9px] font-bold truncate -mt-0.5 ${
                            isSummit ? 'text-amber-800/80' : 'text-zinc-400'
                          }`}
                        >
                          {prize.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Right: Green Checkmark Badge for Unlocked Stages */}
                    {isUnlocked && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle size={15} weight="fill" className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* ========================================================
            5. FLOATING BOTTOM TELEMETRY PROGRESS PILL
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
            6. INTERACTIVE PRIZE DETAIL INSPECTOR SHEET
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
