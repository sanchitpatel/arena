import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Trophy,
  Gift,
  Medal,
  Lock,
  Check,
  CheckCircle,
  Sparkle,
  Crown,
  Ticket,
  Coffee,
  Brain,
  Lightning,
  Star,
  MapPin,
  ArrowRight,
} from '../icons';
import { CrystalIcon } from '../dashboard/CrystalIcon';
import ChatGPTOrb from '../dashboard/ChatGPTOrb';
import { PRIZE_STAGES, calculatePrizeProgress } from '../../data/prizesData';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';

// Helper to render stage-specific icons
function StagePrizeIcon({ type = 'ticket', rarityColor = '#f59e0b', className = 'w-6 h-6' }) {
  switch (type) {
    case 'ticket':
      return <Ticket size={24} weight="fill" className="text-sky-500" />;
    case 'coffee':
      return <Coffee size={24} weight="fill" className="text-emerald-500" />;
    case 'hardware':
      return <Lightning size={24} weight="fill" className="text-indigo-500" />;
    case 'shirt':
      return <Sparkle size={24} weight="fill" className="text-purple-500" />;
    case 'crown':
      return <Crown size={24} weight="fill" className="text-amber-500" />;
    case 'brain':
      return <Brain size={24} weight="fill" className="text-pink-500" />;
    case 'headphones':
      return <Medal size={24} weight="fill" className="text-cyan-500" />;
    case 'trophy':
    default:
      return <Trophy size={28} weight="fill" className="text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]" />;
  }
}

/**
 * PrizeRoadModal Component:
 * Candy Crush-style vertical winding pathway (trophy road) climbing from bottom (Stage 1) to top (Stage 8).
 * Fully themed in Arena's tactile light-neumorphic and machined monolith aesthetic.
 */
export const PrizeRoadModal = ({
  isOpen = false,
  onClose,
  player,
  totalPoints = 0,
}) => {
  const [displayed, setDisplayed] = useState(isOpen);
  const [animOpen, setAnimOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState(null);

  const scrollContainerRef = useRef(null);
  const activeNodeRef = useRef(null);

  const guestId = player?.guest_id || getPlayerId() || 'Guest001';
  const orbNumber = player?.orb_number || getOrbNumber(guestId) || 1;
  const avatar = player?.avatar || '1';
  const displayName = player?.name || guestId;

  // Calculate current stage progress
  const progress = useMemo(() => calculatePrizeProgress(totalPoints), [totalPoints]);

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
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape
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

  // Auto-scroll into view at the active stage on initial open
  useEffect(() => {
    if (animOpen && activeNodeRef.current && scrollContainerRef.current) {
      const timer = setTimeout(() => {
        activeNodeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [animOpen]);

  // Pre-calculated coordinates for the 8-stage serpentine road in viewBox (0 0 400 1620)
  // Stage 1 at bottom (y: 1420), Stage 8 at top summit (y: 160)
  const STAGE_COORDS = [
    { stage: 1, x: 140, y: 1420 },
    { stage: 2, x: 270, y: 1240 },
    { stage: 3, x: 130, y: 1060 },
    { stage: 4, x: 280, y: 880 },
    { stage: 5, x: 120, y: 700 },
    { stage: 6, x: 270, y: 520 },
    { stage: 7, x: 140, y: 340 },
    { stage: 8, x: 200, y: 160 }, // Peak Summit
  ];

  // Generate smooth SVG S-curve Bézier path connecting stages from 1 to 8
  const pathD = useMemo(() => {
    let d = `M ${STAGE_COORDS[0].x} ${STAGE_COORDS[0].y}`;
    for (let i = 0; i < STAGE_COORDS.length - 1; i++) {
      const p1 = STAGE_COORDS[i];
      const p2 = STAGE_COORDS[i + 1];
      const midY = (p1.y + p2.y) / 2;
      d += ` C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, []);

  // Generate active path segment up to player's current stage
  const activePathD = useMemo(() => {
    if (progress.currentStage <= 0) return '';
    const maxIdx = Math.min(STAGE_COORDS.length - 1, progress.currentStage - 1);
    let d = `M ${STAGE_COORDS[0].x} ${STAGE_COORDS[0].y}`;
    for (let i = 0; i < maxIdx; i++) {
      const p1 = STAGE_COORDS[i];
      const p2 = STAGE_COORDS[i + 1];
      const midY = (p1.y + p2.y) / 2;
      d += ` C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [progress.currentStage]);

  if (!displayed || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center select-none font-sans">
      {/* Background Focus Scrim */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/45 backdrop-blur-md transition-opacity duration-300 ${
          animOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Main Modal Window */}
      <div
        className={`relative z-10 w-full max-w-[460px] sm:max-w-[540px] md:max-w-[620px] h-[92dvh] max-h-[880px] bg-[#f0f2f5] border border-white/90 rounded-[28px] sm:rounded-[36px] shadow-[0_20px_60px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          animOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
        }`}
      >
        {/* ========================================================
            1. STICKY TOP APP BAR & TELEMETRY
            ======================================================== */}
        <div className="sticky top-0 z-30 bg-[#ebedf2]/95 backdrop-blur-md border-b border-slate-300/60 px-4 sm:px-6 py-3 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Close Circle Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Prize Road"
              className="w-9 h-9 rounded-full bg-[#f0f2f5] shadow-[2px_2px_5px_#c2c9d4,-2px_-2px_5px_#ffffff] border border-white/80 flex items-center justify-center text-zinc-600 hover:text-zinc-900 active:scale-90 transition-all cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>

            {/* Center: Title & Stage Counter */}
            <div className="text-center flex-1 min-w-0">
              <h2 className="font-arena text-sm sm:text-base font-black tracking-wider text-zinc-900 truncate">
                ARENA PRIZE ROAD
              </h2>
              <p className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider -mt-0.5">
                Candy Road • 8 Milestones
              </p>
            </div>

            {/* Right: Player Points Capsule */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0f2f5] border border-white shadow-[inset_1.5px_1.5px_3px_#c2c9d4,inset_-1.5px_-1.5px_3px_#ffffff] shrink-0">
              <Star size={14} weight="fill" className="text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="font-arena text-xs sm:text-sm font-black text-zinc-900">
                {totalPoints} <span className="text-[9.5px] text-zinc-500">PTS</span>
              </span>
            </div>
          </div>

          {/* Player Progress Telemetry Mini-Banner */}
          <div className="mt-2.5 pt-2 border-t border-zinc-300/40 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/70 shrink-0">
                Stage {progress.currentStage} of 8
              </span>
              <span className="text-[11px] font-medium text-zinc-600 truncate">
                {progress.isMaxStage ? (
                  '🎉 All Milestones Conquered!'
                ) : (
                  <>
                    Next: <strong className="text-zinc-900">{progress.nextStage?.title}</strong> ({progress.pointsToNext} PTS to unlock)
                  </>
                )}
              </span>
            </div>

            <span className="font-arena text-[11px] font-bold text-zinc-700 shrink-0">
              {progress.progressPercent}%
            </span>
          </div>

          {/* Segmented Progress Track */}
          <div className="w-full h-1.5 bg-[#dbe1ea] rounded-full mt-1.5 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>

        {/* ========================================================
            2. CANDY CRUSH-STYLE SERPENTINE ROAD CANVAS
            ======================================================== */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#f0f2f5] p-2 sm:p-4 [scrollbar-gutter:stable]"
        >
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-amber-200/25 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-sky-200/25 blur-3xl pointer-events-none" />

          {/* Fixed-Aspect Pathway Container (400px wide x 1620px tall) */}
          <div className="relative w-full max-w-[420px] mx-auto h-[1620px]">
            {/* SVG Winding Track Overlay */}
            <svg
              viewBox="0 0 400 1620"
              className="absolute inset-0 w-full h-full pointer-events-none"
              fill="none"
            >
              <defs>
                {/* Active Path Energy Glow Gradient */}
                <linearGradient id="active-track-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>

                {/* Soft Drop Shadow for the road bed */}
                <filter id="road-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#b8c2d0" floodOpacity="0.6" />
                </filter>
              </defs>

              {/* Road Bed Outer Inset Rim */}
              <path
                d={pathD}
                stroke="#c9d2de"
                strokeWidth="32"
                strokeLinecap="round"
                filter="url(#road-shadow)"
              />

              {/* Road Bed Main Body */}
              <path
                d={pathD}
                stroke="#ebedf2"
                strokeWidth="24"
                strokeLinecap="round"
              />

              {/* Dashed Inactive Stepping Track (Candy Crush style) */}
              <path
                d={pathD}
                stroke="#94a3b8"
                strokeWidth="5"
                strokeDasharray="8 8"
                strokeLinecap="round"
              />

              {/* Active Energy Conduit (Glows for completed milestones) */}
              {activePathD && (
                <path
                  d={activePathD}
                  stroke="url(#active-track-gradient)"
                  strokeWidth="8"
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              )}
            </svg>

            {/* Summit Floating Champion Crest (Top of the Mountain) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-zinc-950 font-arena text-[10px] font-black uppercase tracking-wider shadow-md border border-amber-200">
                <Crown size={14} weight="fill" className="text-zinc-950 animate-bounce" />
                <span>CHAMPION SUMMIT</span>
              </div>
            </div>

            {/* Start Gate Banner (Bottom of the Mountain) */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
              <span className="font-arena text-[10px] font-black uppercase tracking-widest text-zinc-400 px-3 py-1 rounded-full bg-white/70 shadow-xs border border-slate-200">
                STARTING GATE • STAGE 1
              </span>
            </div>

            {/* ========================================================
                3. MILESTONE NODES & BRANCHING PRIZE CARDS
                ======================================================== */}
            {PRIZE_STAGES.map((prize, idx) => {
              const coords = STAGE_COORDS[idx];
              const isUnlocked = totalPoints >= prize.points;
              const isCurrent = progress.currentStage === prize.stage || (progress.currentStage === 0 && prize.stage === 1);
              const isNext = progress.nextStage?.stage === prize.stage;
              const isSummit = prize.stage === 8;

              // Node is positioned on the winding SVG road
              const leftPercent = (coords.x / 400) * 100;
              const topPx = coords.y;

              // Prize card alternate sides:
              // Left node (x < 200) -> card on right
              // Right node (x > 200) -> card on left
              // Summit node (stage 8) -> card directly below/beside
              const cardOnRight = coords.x < 200;

              return (
                <div key={prize.id} className="contents">
                  {/* --- A. STAGE NODE BUTTON ON THE PATH --- */}
                  <div
                    ref={isCurrent ? activeNodeRef : null}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPx}px`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group cursor-pointer"
                    onClick={() => setSelectedPrize(prize)}
                  >
                    {/* Attendee Orb on Current Active Stage (YOU ARE HERE) */}
                    {isCurrent && (
                      <div className="absolute -top-14 sm:-top-16 z-30 flex flex-col items-center animate-bounce pointer-events-none">
                        <div className="relative">
                          <ChatGPTOrb
                            avatar={avatar}
                            orbNumber={orbNumber}
                            size="w-10 h-10 sm:w-11 sm:h-11"
                            numberSize="text-lg"
                            labelSize="text-[7px]"
                            speed={1}
                          />
                        </div>
                        <span className="mt-0.5 px-2 py-0.5 rounded-full bg-zinc-900 text-white text-[8px] font-black uppercase tracking-wider shadow-md border border-white/40 whitespace-nowrap">
                          YOU
                        </span>
                      </div>
                    )}

                    {/* Active Radar Beacon Ping Ring */}
                    {isCurrent && (
                      <span className="absolute -inset-3 rounded-full bg-amber-400/30 animate-ping pointer-events-none" />
                    )}

                    {/* The Circular 3D Game Milestone Button */}
                    <div
                      className={`relative w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110 active:scale-95 ${
                        isUnlocked
                          ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 text-zinc-950 shadow-[0_4px_14px_rgba(245,158,11,0.5),inset_0_2px_4px_rgba(255,255,255,0.8)] border-2 border-white'
                          : isCurrent
                            ? 'bg-zinc-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.4)] border-2 border-amber-400'
                            : 'bg-[#ebedf2] text-zinc-400 border border-slate-300/80 shadow-[inset_2px_2px_5px_#c2c9d4,inset_-2px_-2px_5px_#ffffff]'
                      }`}
                    >
                      {isUnlocked ? (
                        <Check size={22} weight="bold" className="text-zinc-950" />
                      ) : isCurrent ? (
                        <span className="font-arena text-base sm:text-lg font-black text-amber-400">
                          {prize.stage}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Lock size={15} weight="bold" className="text-zinc-400" />
                          <span className="font-arena text-[9px] font-black text-zinc-400 -mt-0.5">
                            {prize.stage}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Candy Crush-style 3-Star Micro-Cluster underneath */}
                    <div className="mt-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/90 shadow-xs border border-slate-200/80">
                      <Star size={8.5} weight="fill" className={isUnlocked ? 'text-amber-400' : 'text-zinc-300'} />
                      <Star size={10} weight="fill" className={isUnlocked ? 'text-amber-400' : 'text-zinc-300'} />
                      <Star size={8.5} weight="fill" className={isUnlocked ? 'text-amber-400' : 'text-zinc-300'} />
                    </div>
                  </div>

                  {/* --- B. BRANCHING REWARD CARD --- */}
                  <div
                    style={{
                      top: `${topPx}px`,
                      left: isSummit ? '50%' : cardOnRight ? '53%' : '3%',
                      transform: isSummit ? 'translate(-50%, 42px)' : 'translateY(-50%)',
                      width: isSummit ? '92%' : '44%',
                    }}
                    onClick={() => setSelectedPrize(prize)}
                    className="absolute z-10 cursor-pointer group"
                  >
                    {/* Double-Bezel Tactile Reward Card */}
                    <div
                      className={`relative bg-[#ebedf2] border rounded-2xl p-2.5 sm:p-3 transition-all duration-200 group-hover:scale-[1.03] active:scale-[0.98] ${
                        isUnlocked
                          ? 'border-amber-300/80 shadow-[3px_3px_10px_#c2c9d4,-3px_-3px_10px_#ffffff,0_0_12px_rgba(245,158,11,0.15)] ring-1 ring-amber-300/40'
                          : isCurrent
                            ? 'border-zinc-800 shadow-[3px_3px_10px_#c2c9d4,-3px_-3px_10px_#ffffff] ring-2 ring-zinc-900/10'
                            : 'border-white/80 shadow-[3px_3px_8px_#c2c9d4,-3px_-3px_8px_#ffffff]'
                      }`}
                    >
                      {/* Top Row: Rarity Badge + Points */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md font-arena truncate"
                          style={{
                            backgroundColor: `${prize.rarityColor}15`,
                            color: prize.rarityColor,
                            border: `1px solid ${prize.rarityColor}40`,
                          }}
                        >
                          {prize.rarity}
                        </span>

                        <span className="font-arena text-[9.5px] font-black text-zinc-700 shrink-0">
                          {prize.points} PTS
                        </span>
                      </div>

                      {/* Middle: Icon + Title */}
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center shrink-0">
                          <StagePrizeIcon type={prize.iconType} rarityColor={prize.rarityColor} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-zinc-900 leading-snug line-clamp-2">
                            {prize.title}
                          </h4>
                        </div>
                      </div>

                      {/* Bottom Status Pill */}
                      <div className="mt-2 pt-1.5 border-t border-zinc-300/40 flex items-center justify-between text-[9.5px] font-bold">
                        {isUnlocked ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                            <CheckCircle size={11} weight="fill" className="text-emerald-600" />
                            <span>Unlocked</span>
                          </span>
                        ) : isNext ? (
                          <span className="text-amber-800 font-extrabold">
                            {prize.points - totalPoints} PTS left
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-medium">
                            Locked
                          </span>
                        )}

                        <span className="text-zinc-400 group-hover:text-zinc-800 transition-colors">
                          Inspect →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            4. PRIZE DETAIL INSPECTOR (Modal within modal)
            ======================================================== */}
        {selectedPrize && (
          <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
            <div
              className="w-full max-w-[440px] bg-[#f0f2f5] border border-white/90 rounded-[28px] p-5 shadow-2xl relative select-none animate-in slide-in-from-bottom-4 duration-200"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedPrize(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f0f2f5] shadow-[2px_2px_4px_#c2c9d4,-2px_-2px_4px_#ffffff] border border-white flex items-center justify-center text-zinc-600 hover:text-zinc-900 active:scale-90 cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>

              {/* Header Badge */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full font-arena"
                  style={{
                    backgroundColor: `${selectedPrize.rarityColor}20`,
                    color: selectedPrize.rarityColor,
                    border: `1px solid ${selectedPrize.rarityColor}60`,
                  }}
                >
                  {selectedPrize.rarity}
                </span>
                <span className="text-xs font-bold text-zinc-500">
                  Stage {selectedPrize.stage} • {selectedPrize.points} PTS Required
                </span>
              </div>

              {/* Title & Icon */}
              <div className="flex items-center gap-3.5 my-3 pb-3 border-b border-zinc-300/50">
                <div className="w-13 h-13 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center shrink-0">
                  <StagePrizeIcon type={selectedPrize.iconType} rarityColor={selectedPrize.rarityColor} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-arena text-base font-black text-zinc-900 leading-tight">
                    {selectedPrize.title}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {selectedPrize.subtitle}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-600 leading-relaxed font-medium mb-3">
                {selectedPrize.description}
              </p>

              {/* Perks Checklist */}
              <div className="bg-[#ebedf2] border border-white/80 rounded-2xl p-3 shadow-[inset_1.5px_1.5px_3px_#c2c9d4,inset_-1.5px_-1.5px_3px_#ffffff] mb-3 space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                  Reward Inclusions
                </div>
                {selectedPrize.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-zinc-800 font-semibold">
                    <CheckCircle size={14} weight="fill" className="text-emerald-600 shrink-0" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              {/* Venue Redemption Location */}
              <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium px-1 mb-4">
                <MapPin size={15} weight="bold" className="text-zinc-500 shrink-0" />
                <span>Claim at: <strong className="text-zinc-900">{selectedPrize.redemptionLocation}</strong></span>
              </div>

              {/* Status Action Button */}
              {totalPoints >= selectedPrize.points ? (
                <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
                  <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                  <span>Unlocked & Ready to Claim!</span>
                </div>
              ) : (
                <div className="w-full py-3 rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md">
                  <Lock size={15} weight="bold" className="text-zinc-400" />
                  <span>{selectedPrize.points - totalPoints} More Points Needed</span>
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
