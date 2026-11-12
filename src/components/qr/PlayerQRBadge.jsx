import React, { useState, useEffect, useMemo } from 'react';
import QRCode, { toDataURL, toString } from 'qrcode';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { Scan } from '../icons';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';

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
export default function PlayerQRBadge({
  player,
  onScanClick,
  className = '',
  variant = 'modal',
  showScanButton = true,
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);

  // Normalize and validate player ID; prevent rendering fake Guest001 before real ID loads
  const rawId = player?.guest_id || (typeof window !== 'undefined' ? getPlayerId() : null);
  const guestId = useMemo(() => {
    if (!rawId) return null;
    const match = String(rawId).match(/^guest(\d+)$/i);
    if (match) {
      return `Guest${match[1].padStart(3, '0')}`;
    }
    return String(rawId).trim();
  }, [rawId]);

  const orbNumber = player?.orb_number || (guestId ? getOrbNumber(guestId) : 1);
  const displayName = player?.name || guestId || 'Player';
  const avatar = player?.avatar || '1';

  // Construct official URL format:
  // - Enables native smartphone cameras (iOS Camera, Google Lens) to show a direct link to the Arena web app.
  // - Allows our in-game Arena scanner to decode player profile parameters instantly.
  const qrPayload = useMemo(() => {
    if (!guestId) return null;

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
    if (!qrPayload) {
      setIsGenerating(true);
      return;
    }

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

  const isPage = variant === 'page';

  return (
    <div className={`flex flex-col items-center select-none font-sans pt-1 sm:pt-1 pb-1 ${className}`}>
      {/* Main QR Card Container */}
      <div className={`relative pt-2 pb-4 px-3 rounded-[1.25rem] bg-white border border-slate-200/80 shadow-[0_12px_32px_rgba(197,204,214,0.45),inset_0_1px_1px_rgba(255,255,255,0.8)] w-full flex flex-col items-center ${isPage ? 'max-w-[375px] sm:max-w-[420px]' : 'max-w-[250px]'
        }`}>
        {/* Subtle Decorative Top Corner Accents */}
        <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-zinc-300 rounded-tl" />
        <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-zinc-300 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-zinc-300 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-zinc-300 rounded-br" />

        {/* Guest ID on top in the middle (Arena Font) */}
        <div className="font-arena text-[14px] tracking-widest text-zinc-500 uppercase text-center select-none pt-1 -mb-0.5">
          {guestId || 'GUEST001'}
        </div>

        {/* QR Code Canvas with Embedded Arena Logo Emblem */}
        <div className={`relative flex items-center justify-center bg-white rounded-2xl overflow-hidden p-2 ${isPage ? 'w-[285px] h-[285px] sm:w-[335px] sm:h-[335px]' : 'w-52 h-52'
          }`}>
          {isGenerating || !guestId ? (
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

              {/* Centered Embedded Player Avatar (Level H allows center coverage safely) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className={`rounded-full bg-white p-0.5 border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden ${isPage ? 'w-24 h-24 sm:w-20 sm:h-20' : 'w-14 h-14'
                  }`}>
                  <ArenaAvatar id={avatar} size="badge" className="w-full h-full" />
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-rose-500">Failed to render QR</div>
          )}
        </div>
      </div>

      {/* Helper text explaining the QR Code */}
      <p className={`text-zinc-600/90 text-center mt-2.5 leading-relaxed ${isPage ? 'max-w-[330px] text-[12px]' : 'max-w-[240px] text-[10.5px]'
        }`}>
        Scan with Arena scanner to verify ID and more...
      </p>

      {showScanButton && typeof onScanClick === 'function' && (
        <>
          {/* Break line with "OR" in Center */}
          <div className={`w-full flex items-center gap-2.5 my-2 select-none ${isPage ? 'max-w-[320px]' : 'max-w-[240px]'
            }`}>
            <div className="flex-1 h-[1px] bg-zinc-300/80 shadow-[0_1px_0_#ffffff]" />
            <span className="text-[11px] font-bold tracking-widest text-zinc-500/80 uppercase font-arena">
              OR
            </span>
            <div className="flex-1 h-[1px] bg-zinc-300/80 shadow-[0_1px_0_#ffffff]" />
          </div>

          {/* Scan a QR Option */}
          <button
            type="button"
            onClick={onScanClick}
            className={`w-full py-2.5 sm:py-3 px-3.5 bg-white active:scale-[0.97] text-zinc-700 text-[14px] font-bold rounded-xl border border-slate shadow-[inset_0_2px_6px_#ffffff,inset_0_-4px_7px_rgba(0,0,0,0.24)] hover:shadow-[inset_0_2px_6px_#ffffff,inset_0_-4px_7px_rgba(0,0,0,0.24)] active:shadow-[inset_0_1px_3px_#ffffff,inset_0_-2px_4px_rgba(0,0,0,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer group ${isPage ? 'max-w-[320px]' : 'max-w-[250px]'
              }`}
          >
            <Scan size={24} weight="bold" className="text-zinc-700 scale-105 transition-transform" />
            <span>Scan a QR</span>
          </button>
        </>
      )}
    </div>
  );
}
