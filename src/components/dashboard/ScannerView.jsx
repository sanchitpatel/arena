import React, { useState } from 'react';
import ArenaQRScanner from '../qr/ArenaQRScanner';
import PlayerQRBadge from '../qr/PlayerQRBadge';
import { Scan, QrCode, ShieldCheck, Sword } from '../icons';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';

/**
 * ScannerView Component:
 * Dedicated first-class application page for the Arena QR Scanner & Battle Hub.
 *
 * Replaces the old miniature floating popup with a spacious, polished, dual-station
 * console that lets attendees scan opponents while also displaying their own ID badge.
 */
export const ScannerView = ({ player, onNavigate, isActive = true }) => {
  // Mobile / tablet segmented switcher: 'scanner' | 'badge'
  const [mobileTab, setMobileTab] = useState('scanner');
  const [lastScanned, setLastScanned] = useState(null);

  const guestId = player?.guest_id || getPlayerId() || 'Guest001';
  const orbNumber = player?.orb_number || getOrbNumber(guestId) || 1;

  const handleScanSuccess = (scannedPlayer) => {
    setLastScanned(scannedPlayer);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 select-none font-sans">
      {/* ========================================================
          1. PAGE HEADER & STATUS ROW
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-300/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-arena text-[11px] font-black tracking-widest text-zinc-600 uppercase px-2.5 py-0.5 rounded-full bg-[#ebedf2] border border-white shadow-[inset_1px_1px_2px_#cbd2de,inset_-1px_-1px_2px_#ffffff]">
              OPTICAL BATTLE HUB
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300/70 px-2.5 py-0.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Scanner Ready
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 font-arena tracking-wider mt-1.5">
            ARENA SCANNER & DUEL HUB
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
            Scan attendee badges to inspect live combat stats and issue battle challenges, or present your unique QR to receive invitations.
          </p>
        </div>

        {/* Mobile Segmented Switcher (Visible on mobile screens) */}
        <div className="lg:hidden flex items-center p-1 rounded-2xl bg-[#ebedf2] border border-white shadow-[inset_2px_2px_5px_#c8d0db,inset_-2px_-2px_5px_#ffffff] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMobileTab('scanner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'scanner'
                ? 'bg-gradient-to-b from-zinc-900 to-black text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff]'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Scan size={14} weight="bold" />
            <span>Scan Opponent</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('badge')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'badge'
                ? 'bg-gradient-to-b from-zinc-900 to-black text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff]'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <QrCode size={14} weight="bold" />
            <span>My Battle QR</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. MAIN WORKSPACE CONSOLE
          - Desktop (lg): Two-Column Battle Station
          - Mobile (< lg): Single Column with Segmented Switcher
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ======================================================
            COLUMN 1: LIVE SCANNER CONSOLE (Visible on desktop OR when mobileTab === 'scanner')
            ====================================================== */}
        <div className={`lg:col-span-7 flex flex-col space-y-4 ${mobileTab === 'scanner' ? 'block' : 'hidden lg:block'}`}>
          <div className="rounded-[32px] p-5 sm:p-6 bg-[#ebedf2] border-2 border-white shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_10px_28px_rgba(197,204,214,0.45)]">
            {/* Console Header Bar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-300/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-sm">
                  <Scan size={16} weight="bold" />
                </div>
                <span className="font-arena text-xs font-black tracking-wider text-zinc-800 uppercase">
                  LIVE OPTICAL RETICLE
                </span>
              </div>
              <span className="text-[11px] font-bold text-zinc-500 font-mono tracking-tight">
                CAMERA: READY
              </span>
            </div>

            {/* Recessed Viewfinder Frame */}
            <div className="relative bg-[#f0f2f5] rounded-[26px] p-4 sm:p-5 shadow-[inset_2px_2px_6px_#cbd2de,inset_-2px_-2px_6px_#ffffff] flex flex-col items-center justify-center">
              {isActive ? (
                <ArenaQRScanner
                  variant="page"
                  showMyQrButton={false}
                  onScanSuccess={handleScanSuccess}
                />
              ) : (
                <div className="w-64 h-64 flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
                  <span>Scanner Paused</span>
                </div>
              )}
            </div>

            {/* Quick Tips Footer */}
            <div className="mt-4 pt-3 border-t border-zinc-300/50 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} weight="bold" className="text-sky-600 shrink-0" />
                <span>Instant sub-second QR parsing</span>
              </span>
              <span className="hidden sm:inline text-zinc-400">
                Front & Rear Camera Supported
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================
            COLUMN 2: YOUR BATTLE IDENTITY & INSTRUCTIONS (Visible on desktop OR when mobileTab === 'badge')
            ====================================================== */}
        <div className={`lg:col-span-5 flex flex-col space-y-4 ${mobileTab === 'badge' ? 'block' : 'hidden lg:block'}`}>
          <div className="rounded-[32px] p-5 sm:p-6 bg-[#ebedf2] border-2 border-white shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_10px_28px_rgba(197,204,214,0.45)]">
            {/* Identity Card Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-300/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-sm">
                  <QrCode size={16} weight="bold" />
                </div>
                <span className="font-arena text-xs font-black tracking-wider text-zinc-800 uppercase">
                  MY BATTLE BADGE
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-arena font-bold bg-white border border-slate-200 text-zinc-700 shadow-sm">
                Orb #{orbNumber}
              </span>
            </div>

            {/* Recessed Badge Canvas */}
            <div className="relative bg-[#f0f2f5] rounded-[26px] p-4 sm:p-5 shadow-[inset_2px_2px_6px_#cbd2de,inset_-2px_-2px_6px_#ffffff] flex flex-col items-center justify-center">
              <PlayerQRBadge
                variant="page"
                player={player}
                showScanButton={false}
              />
            </div>

            {/* How Duels Work Info Box */}
            <div className="mt-4 p-3.5 rounded-2xl bg-white/70 border border-white shadow-[0_2px_8px_rgba(197,204,214,0.3)] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                <Sword size={14} weight="bold" className="text-amber-600" />
                <span>How to Duel at the Venue</span>
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-600 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 font-extrabold text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Point your camera at any attendee's QR badge, or show them yours.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 font-extrabold text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Once locked, tap the <strong>Duel</strong> challenge button on screen.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 font-extrabold text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Track real-time challenge invites on the <strong>Notification</strong> tab!</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScannerView;
