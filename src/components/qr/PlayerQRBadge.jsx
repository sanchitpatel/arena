import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode, { toDataURL, toString } from 'qrcode';
import Logo from '../Logo';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { DownloadSimple, Copy, Check, ShieldCheck } from '../icons';

// Bulletproof helper to safely invoke QRCode methods across all bundlers / ESM environments
const safeToDataURL = async (text, options) => {
  const fn =
    (typeof toDataURL === 'function' ? toDataURL : null) ||
    (typeof QRCode?.toDataURL === 'function' ? QRCode.toDataURL : null) ||
    (typeof QRCode?.default?.toDataURL === 'function' ? QRCode.default.toDataURL : null);

  if (!fn) throw new Error('QRCode.toDataURL not found in module');
  return fn(text, options);
};

const safeToString = async (text, options) => {
  const fn =
    (typeof toString === 'function' ? toString : null) ||
    (typeof QRCode?.toString === 'function' ? QRCode.toString : null) ||
    (typeof QRCode?.default?.toString === 'function' ? QRCode.default.toString : null);

  if (!fn) throw new Error('QRCode.toString not found in module');
  return fn(text, options);
};

/**
 * PlayerQRBadge Component:
 * Generates an ultra-crisp, high-density vector QR code badge for the active attendee.
 * Uses Error Correction Level 'H' (30% recovery) allowing the embedded Arena Logo in the center.
 */
export default function PlayerQRBadge({ player, className = '' }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  const guestId = player?.guest_id || 'Guest001';
  const orbNumber = player?.orb_number || 1;
  const displayName = player?.name || guestId;
  const avatar = player?.avatar || '1';

  // Construct official URL format:
  // - Enables native smartphone cameras (iOS Camera, Google Lens) to show a direct link to the Arena web app.
  // - Allows our in-game Arena scanner to decode player profile parameters instantly.
  const qrPayload = useMemo(() => {
    let baseOrigin = 'https://arena.bmiil.com';
    if (typeof window !== 'undefined' && window.location?.origin) {
      baseOrigin = window.location.origin;
    }

    const params = new URLSearchParams({
      app: 'ARENA',
      player: guestId,
      orb: String(orbNumber),
      name: displayName,
      avatar: String(avatar),
    });

    return `${baseOrigin}/arena?${params.toString()}`;
  }, [guestId, orbNumber, displayName, avatar]);

  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const generateQR = async () => {
      try {
        let resultUrl = '';

        // Primary: High-res Canvas PNG Data URL (Level H error correction)
        try {
          resultUrl = await safeToDataURL(qrPayload, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 1,
            width: 400,
            color: {
              dark: '#09090B',
              light: '#FFFFFF',
            },
          });
        } catch (canvasErr) {
          console.warn('[PlayerQRBadge] Canvas toDataURL failed, falling back to SVG vector:', canvasErr);
          // Fallback: Pure vector SVG string (100% reliable, zero canvas dependency)
          const svgString = await safeToString(qrPayload, {
            type: 'svg',
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 400,
            color: {
              dark: '#09090B',
              light: '#FFFFFF',
            },
          });
          resultUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
        }

        if (isMounted) {
          setQrDataUrl(resultUrl);
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('[PlayerQRBadge] QR Generation Error:', err);
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    generateQR();

    return () => {
      isMounted = false;
    };
  }, [qrPayload]);

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(guestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Arena_${guestId}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`flex flex-col items-center select-none font-sans ${className}`}>
      {/* Badge Sub-header */}
      <div className="text-center mb-4">
        <span className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} weight="bold" className="text-sky-600" />
          Official Player Access Key
        </span>
      </div>

      {/* Main QR Card Container */}
      <div className="relative p-5 rounded-[2rem] bg-white border border-slate-200/80 shadow-[0_12px_32px_rgba(197,204,214,0.45),inset_0_1px_1px_rgba(255,255,255,0.8)] max-w-[280px] w-full flex flex-col items-center">
        {/* Subtle Decorative Top Corner Accents */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-zinc-300 rounded-tl" />
        <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-zinc-300 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-zinc-300 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-zinc-300 rounded-br" />

        {/* QR Code Canvas with Embedded Arena Logo Emblem */}
        <div className="relative w-52 h-52 flex items-center justify-center bg-white rounded-2xl overflow-hidden p-2">
          {isGenerating ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              <span className="text-[11px] font-medium text-zinc-400">Rendering QR...</span>
            </div>
          ) : qrDataUrl ? (
            <>
              <img
                src={qrDataUrl}
                alt={`Arena QR for ${guestId}`}
                className="w-full h-full object-contain"
              />

              {/* Centered Embedded Arena Badge (Level H allows center coverage safely) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-11 h-11 rounded-xl bg-black p-1 border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center">
                  <Logo className="w-full h-full" dark />
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-rose-500">Failed to render QR</div>
          )}
        </div>

        {/* Player Identifiers Pill */}
        <div className="mt-4 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#F2F7FC] border border-slate-200/60 shadow-[inset_1px_1px_3px_#c8d0db,inset_-1px_-1px_3px_#ffffff]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white shrink-0 shadow-sm">
              <ArenaAvatar id={avatar} size="badge" className="w-full h-full" />
            </div>
            <div className="truncate">
              <div className="text-[12px] font-bold text-zinc-900 truncate leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] font-arena font-semibold text-zinc-500 uppercase tracking-tight">
                {guestId}
              </div>
            </div>
          </div>

          <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-[10px] font-extrabold tracking-wider shrink-0 shadow-sm">
            ORB #{orbNumber}
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="mt-4 flex items-center gap-2.5 w-full max-w-[280px]">
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex-1 py-2 px-3 bg-[#ebedf2] hover:bg-[#e2e6ec] active:scale-95 text-zinc-700 text-xs font-bold rounded-xl border border-white/80 shadow-[2px_2px_5px_#c8d0db,-2px_-2px_5px_#ffffff] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={14} weight="bold" className="text-emerald-600" />
              <span className="text-emerald-700">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} weight="bold" className="text-zinc-500" />
              <span>Copy ID</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDownloadQR}
          disabled={!qrDataUrl}
          className="flex-1 py-2 px-3 bg-[#ebedf2] hover:bg-[#e2e6ec] active:scale-95 text-zinc-700 text-xs font-bold rounded-xl border border-white/80 shadow-[2px_2px_5px_#c8d0db,-2px_-2px_5px_#ffffff] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <DownloadSimple size={14} weight="bold" className="text-zinc-500" />
          <span>Save PNG</span>
        </button>
      </div>

      <p className="text-[10.5px] text-zinc-500/80 text-center mt-3 max-w-[260px] leading-relaxed">
        Scan with Arena scanner or any smartphone camera to view profile and verify ID.
      </p>
    </div>
  );
}
