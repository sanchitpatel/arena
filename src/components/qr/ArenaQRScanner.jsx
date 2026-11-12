import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { CheckCircle, WarningCircle, ArrowClockwise, CircleNotch, CameraSlash } from '../icons';
import { Sword } from '@phosphor-icons/react/dist/icons/Sword';
import {
  killAllMediaTracks,
  getInAppPermission,
  setInAppPermission,
  subscribeToPermissionChanges,
} from '../../utils/mediaGuard';
import { getPlayerId } from '../../utils/playerId';

/**
 * ArenaQRScanner Component:
 * In-browser mobile/desktop camera scanner using html5-qrcode.
 * Safely handles camera lifecycle, desktop fallbacks, and in-app permission overrides.
 */
export default function ArenaQRScanner({ onScanSuccess, onClose, className = '' }) {
  const [scannerStatus, setScannerStatus] = useState('initializing'); // 'initializing' | 'scanning' | 'success' | 'error' | 'disabled'
  const [errorMessage, setErrorMessage] = useState('');
  const [scannedPlayer, setScannedPlayer] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [invalidBanner, setInvalidBanner] = useState('');
  const [duelStatus, setDuelStatus] = useState(null); // 'sent' | null

  // Track if attendee explicitly paused camera access in Arena settings
  const [isCameraDisabledInApp, setIsCameraDisabledInApp] = useState(() => {
    return getInAppPermission('camera') === 'disabled';
  });

  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const isMountedRef = useRef(true);
  const runIdRef = useRef(0);
  const hasScannedRef = useRef(false);
  const invalidBannerTimerRef = useRef(null);
  const lastInvalidCodeRef = useRef('');
  const stopPromiseRef = useRef(Promise.resolve());

  // Generate unique DOM container ID per mount to avoid collision
  const containerId = useRef(`arena-qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;

  // Validates and extracts official Arena QR player payload
  const parseArenaQRPayload = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return null;

    let payload = null;

    // Case 1: JSON payload format (e.g. {"app":"ARENA","gid":"Guest008","orb":8,"name":"Guest008","avatar":"1"})
    if (rawText.startsWith('{') && rawText.endsWith('}')) {
      try {
        const json = JSON.parse(rawText);
        const rawGid = json.gid || json.player;
        if (json && (json.app === 'ARENA' || /^guest/i.test(rawGid)) && rawGid) {
          const parsedOrb = parseInt(json.orb, 10);
          const gidMatch = String(rawGid).match(/^guest(\d+)$/i);
          const canonicalGid = gidMatch ? `Guest${gidMatch[1].padStart(3, '0')}` : String(rawGid).trim();
          payload = {
            app: 'ARENA',
            gid: canonicalGid,
            orb: isNaN(parsedOrb) || parsedOrb < 1 ? 1 : parsedOrb,
            name: String(json.name || canonicalGid).trim(),
            avatar: String(json.avatar || '1').trim(),
          };
        }
      } catch { }
    }

    // Case 2: Official URL format (e.g. https://arena.bmiil.com/arena?app=ARENA&player=Guest008&orb=8&name=Guest008&avatar=1)
    if (!payload && (rawText.includes('/arena') || rawText.includes('app=ARENA') || rawText.includes('player='))) {
      try {
        let url;
        try {
          url = new URL(rawText);
        } catch {
          url = new URL(`https://arena.bmiil.com${rawText.startsWith('/') ? '' : '/'}${rawText}`);
        }

        const params = url.searchParams;
        const appParam = params.get('app');
        const playerParam = params.get('player') || params.get('gid');

        // Security validation:
        // 1. Must explicitly have app=ARENA or path /arena
        // 2. Must strictly have a non-empty player ID
        // 3. Origin must match active domain or trusted Arena host
        const isTrustedHost =
          typeof window !== 'undefined' &&
          (url.hostname === window.location.hostname ||
            url.hostname === 'arena.bmiil.com' ||
            url.hostname === 'localhost' ||
            url.hostname.endsWith('.bmiil.com'));

        if (isTrustedHost && playerParam && (appParam === 'ARENA' || url.pathname.includes('/arena'))) {
          const parsedOrb = parseInt(params.get('orb'), 10);
          const rawGid = String(playerParam).trim();
          const gidMatch = rawGid.match(/^guest(\d+)$/i);
          const canonicalGid = gidMatch ? `Guest${gidMatch[1].padStart(3, '0')}` : rawGid;
          payload = {
            app: 'ARENA',
            gid: canonicalGid,
            orb: isNaN(parsedOrb) || parsedOrb < 1 ? 1 : parsedOrb,
            name: String(params.get('name') || canonicalGid).trim(),
            avatar: String(params.get('avatar') || '1').trim(),
          };
        }
      } catch { }
    }

    // Sanity validation: must have non-empty gid between 3 and 32 characters
    if (payload && payload.gid && payload.gid.length >= 3 && payload.gid.length <= 32) {
      return payload;
    }

    return null;
  };

  // Tears down a specific Html5Qrcode instance without touching scannerRef (prevents race conditions)
  const teardownInstance = async (s) => {
    if (!s) return;
    try {
      await s.stop();
    } catch { }
    try {
      s.clear();
    } catch { }
  };

  // Fully awaits stopping and clearing the current active scanner instance
  const teardown = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    isScanningRef.current = false;
    await teardownInstance(s);
  };

  // Forcefully stop all camera tracks immediately on unmount or pause (returns a chainable promise)
  const stopCameraHardwareImmediately = (reason = 'Manual stop') => {
    const myRun = ++runIdRef.current;
    isScanningRef.current = false;

    // 1. Direct hardware track termination on DOM video elements:
    try {
      const container = document.getElementById(containerId);
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((video) => {
          if (video && video.srcObject) {
            const stream = video.srcObject;
            if (stream && typeof stream.getTracks === 'function') {
              stream.getTracks().forEach((track) => {
                try {
                  track.stop();
                } catch { }
              });
            }
            video.srcObject = null;
          }
        });
      }
    } catch { }

    // 2. Chained async teardown: prevents new startCamera from colliding with pending stop/clear
    const p = teardown().then(() => {
      // Only execute global media kill if a newer run hasn't already started
      if (runIdRef.current === myRun) {
        killAllMediaTracks(`Scanner stop: ${reason}`, 'video');
      }
    });

    stopPromiseRef.current = p;
    return p;
  };

  // Initialize and start camera scanner
  const startCamera = async (mode = facingMode) => {
    const runId = ++runIdRef.current;
    hasScannedRef.current = false;

    try {
      setScannerStatus('initializing');
      setErrorMessage('');
      setScannedPlayer(null);

      // Clean up previous running instance completely before mounting new one
      await stopPromiseRef.current;
      await teardown();
      if (runId !== runIdRef.current || !isMountedRef.current) return;

      // Ensure the container element exists in DOM
      const elem = document.getElementById(containerId);
      if (!elem) {
        return;
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText) => {
        if (!isMountedRef.current || runId !== runIdRef.current || hasScannedRef.current) return;

        const parsed = parseArenaQRPayload(decodedText);

        if (parsed) {
          // Self-scan prevention: prevent an attendee from dueling or scanning themselves
          const myId = getPlayerId();
          if (myId && parsed.gid && parsed.gid.toUpperCase() === myId.toUpperCase()) {
            if (lastInvalidCodeRef.current !== decodedText) {
              lastInvalidCodeRef.current = decodedText;
              setInvalidBanner("You can't duel yourself!");
              if (invalidBannerTimerRef.current) clearTimeout(invalidBannerTimerRef.current);
              invalidBannerTimerRef.current = setTimeout(() => {
                setInvalidBanner('');
                lastInvalidCodeRef.current = '';
              }, 2500);
            }
            return;
          }

          hasScannedRef.current = true;
          setInvalidBanner('');
          setScannedPlayer(parsed);
          setScannerStatus('success');

          if (navigator?.vibrate) {
            navigator.vibrate([40, 60, 40]);
          }

          // Power down camera immediately upon successful scan so green indicator turns off
          stopCameraHardwareImmediately('Scan verified successfully');

          if (typeof onScanSuccess === 'function') {
            onScanSuccess(parsed);
          }
          return;
        }

        // Non-Arena QR code detected: DO NOT stop camera or show duel button.
        // Show subtle non-intrusive banner and keep camera actively scanning.
        if (lastInvalidCodeRef.current !== decodedText) {
          lastInvalidCodeRef.current = decodedText;
          setInvalidBanner('Not an Arena QR code');
          if (invalidBannerTimerRef.current) clearTimeout(invalidBannerTimerRef.current);
          invalidBannerTimerRef.current = setTimeout(() => {
            setInvalidBanner('');
            lastInvalidCodeRef.current = '';
          }, 2400);
        }
      };

      const qrCodeErrorCallback = () => {
        // Continuous scan tick; expected when frame contains no QR code
      };

      const config = {
        fps: 15,
        // qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      // Try preferred facingMode, but auto-fallback if desktop/laptop lacks environment camera
      try {
        await html5QrCode.start(
          { facingMode: mode },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
      } catch (firstErr) {
        if (runId !== runIdRef.current || !isMountedRef.current) {
          await teardownInstance(html5QrCode);
          return;
        }

        const firstErrStr = String(firstErr?.message || firstErr?.name || firstErr || '');
        const isDenial =
          firstErr?.name === 'NotAllowedError' ||
          firstErr?.name === 'PermissionDeniedError' ||
          /notallowed|permission/i.test(firstErrStr);

        // If user denied camera permission, fail immediately without re-prompting on iOS
        if (isDenial) {
          throw firstErr;
        }

        // If desktop has no environment camera, retry with user/webcam fallback
        try {
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
        } catch (secondErr) {
          if (runId !== runIdRef.current || !isMountedRef.current) {
            await teardownInstance(html5QrCode);
            return;
          }

          const secondErrStr = String(secondErr?.message || secondErr?.name || secondErr || '');
          if (/notallowed|permission/i.test(secondErrStr)) {
            throw secondErr;
          }

          // Ultimate fallback: Enumerate available cameras and bind directly to the first available camera ID
          const cams = await Html5Qrcode.getCameras();
          if (cams && cams.length > 0) {
            await html5QrCode.start(
              cams[0].id,
              config,
              qrCodeSuccessCallback,
              qrCodeErrorCallback
            );
          } else {
            throw new Error('No camera device found on this system.');
          }
        }
      }

      if (runId !== runIdRef.current || !isMountedRef.current) {
        await teardownInstance(html5QrCode);
        return;
      }

      isScanningRef.current = true;
      setScannerStatus('scanning');
    } catch (err) {
      if (runId === runIdRef.current && isMountedRef.current) {
        setScannerStatus('error');
        const errStr = String(err?.message || err?.name || err || '');
        const isPermissionDenied =
          err?.name === 'NotAllowedError' ||
          err?.name === 'PermissionDeniedError' ||
          /notallowed|permission/i.test(errStr);

        if (isPermissionDenied) {
          setInAppPermission('camera', 'denied');
        }

        setErrorMessage(
          isPermissionDenied
            ? 'Camera permission was denied. Please allow camera access in your browser.'
            : 'Unable to access device camera. Please check your camera permissions.'
        );
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    // Check if camera is paused in user preferences
    const pref = getInAppPermission('camera');

    if (pref === 'disabled') {
      setIsCameraDisabledInApp(true);
      setScannerStatus('disabled');
    } else {
      startCamera(facingMode);
    }

    // Subscribe to in-app changes from ProfileView or elsewhere
    const unsubscribe = subscribeToPermissionChanges(({ capability, state }) => {
      if (!isMountedRef.current) return;
      if (capability === 'camera') {
        if (state === 'disabled') {
          setIsCameraDisabledInApp(true);
          setScannerStatus('disabled');
          stopCameraHardwareImmediately('Disabled via app settings');
        } else if (state === 'denied') {
          setIsCameraDisabledInApp(false);
          setScannerStatus('error');
          setErrorMessage('Camera permission was blocked in browser settings. Please allow camera access.');
          stopCameraHardwareImmediately('Denied via browser settings');
        } else if (state === 'granted') {
          setIsCameraDisabledInApp(false);
          // Don't restart camera if already actively scanning or if an opponent's card is showing!
          if (!isScanningRef.current && !hasScannedRef.current) {
            startCamera(facingMode);
          }
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      if (invalidBannerTimerRef.current) clearTimeout(invalidBannerTimerRef.current);
      unsubscribe();
      stopCameraHardwareImmediately('ArenaQRScanner unmounted');
    };
  }, [facingMode]);

  // Re-enable camera directly inside the scanner box
  const handleEnableCameraInScanner = async () => {
    setIsCameraDisabledInApp(false);
    // setInAppPermission triggers the subscriber, which starts camera cleanly once without double-starting
    setInAppPermission('camera', 'granted');
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleScanAgain = () => {
    setScannedPlayer(null);
    setDuelStatus(null);
    setInvalidBanner('');
    lastInvalidCodeRef.current = '';
    hasScannedRef.current = false;
    startCamera(facingMode);
  };

  const handleInitiateDuel = () => {
    setDuelStatus('sent');
    if (navigator?.vibrate) {
      navigator.vibrate([30, 40, 30]);
    }
  };

  return (
    <div className={`flex flex-col items-center select-none font-sans ${className}`}>
      {/* Scanner Viewfinder Box */}
      <div className="relative w-full max-w-[320px] aspect-square rounded-[2rem] bg-black overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_12px_32px_rgba(197,204,214,0.5)] border-2 border-slate-300/80">
        {/* html5-qrcode video target mount */}
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Floating Non-Intrusive Invalid Code Banner */}
        {invalidBanner && scannerStatus === 'scanning' && !isCameraDisabledInApp && (
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/85 border border-rose-500/60 backdrop-blur-md shadow-lg text-white text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
            <WarningCircle size={15} weight="bold" className="text-rose-400 shrink-0" />
            <span className="truncate">{invalidBanner}</span>
          </div>
        )}

        {/* Viewfinder Target Overlays (while scanning) */}
        {scannerStatus === 'scanning' && !isCameraDisabledInApp && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Center Reticle Frame */}
            <div className="relative w-52 h-52 border-2 border-sky-400/80 rounded-2xl shadow-[0_0_15px_rgba(56,189,248,0.4)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-white rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-pulse"
                style={{
                  top: '50%',
                  animationDuration: '1.8s',
                }}
              />
            </div>
          </div>
        )}

        {/* Initializing Spinner Overlay */}
        {scannerStatus === 'initializing' && !isCameraDisabledInApp && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 text-white">
            <CircleNotch size={32} className="animate-spin text-sky-400" />
            <span className="text-xs font-semibold text-zinc-300">Starting Camera...</span>
          </div>
        )}

        {/* Paused by User Preference in App (Re-enable directly via identical toggle) */}
        {isCameraDisabledInApp && (
          <div className="absolute inset-0 bg-[#09090B]/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center gap-3.5 text-white z-30 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center text-zinc-400">
              <CameraSlash size={22} weight="bold" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">Camera Access Paused</h4>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-[210px] leading-relaxed">
                You turned off camera access in settings. Toggle below to resume scanning.
              </p>
            </div>

            {/* Custom Exact Same Neumorphic iOS Toggle Switch */}
            <div
              onClick={handleEnableCameraInScanner}
              className="mt-1 flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-zinc-800/80 active:scale-95 transition-all select-none"
            >
              <span className="text-xs font-semibold text-zinc-300">Enable Camera</span>
              <button
                type="button"
                role="switch"
                aria-checked={false}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-[#cbd2de] shadow-[inset_2px_2px_4px_#b3bac6,inset_-2px_-2px_4px_#ffffff]"
              >
                <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[1px_2px_4px_rgba(0,0,0,0.25)] transition duration-200 ease-in-out translate-x-0" />
              </button>
            </div>
          </div>
        )}

        {/* Error Fallback Overlay */}
        {scannerStatus === 'error' && !isCameraDisabledInApp && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center gap-3 text-white">
            <WarningCircle size={36} weight="bold" className="text-rose-500" />
            <p className="text-xs text-zinc-300 leading-relaxed">{errorMessage}</p>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl border border-zinc-700 shadow flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowClockwise size={14} weight="bold" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Camera Flip Button (Top Right Floating) */}
        {scannerStatus === 'scanning' && !isCameraDisabledInApp && (
          <button
            type="button"
            onClick={handleFlipCamera}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md cursor-pointer active:scale-90 transition-all z-20"
            title="Flip Camera"
          >
            <ArrowClockwise size={18} weight="bold" />
          </button>
        )}
      </div>

      {/* Scanned Result Discovery Card */}
      {scannerStatus === 'success' && scannedPlayer && (
        <div className="mt-4 w-full max-w-[320px] p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(197,204,214,0.45)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold pb-2.5 mb-2.5 border-b border-zinc-100">
            <CheckCircle size={16} weight="fill" className="text-emerald-600" />
            <span>Player Found</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-white shadow overflow-hidden shrink-0 bg-[#F2F7FC]">
              <ArenaAvatar id={scannedPlayer.avatar || '1'} size="badge" className="w-full h-full" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-900 truncate">
                {scannedPlayer.name || scannedPlayer.gid}
              </div>
              <div className="text-[11px] font-arena text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5 mt-0.5">
                <span>{scannedPlayer.gid}</span>
                {scannedPlayer.orb && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    <span>Orb #{scannedPlayer.orb}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* In-Card Duel Status Feedback (Replaces freezing browser alert) */}
          {duelStatus === 'sent' && (
            <div className="mt-3 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
              <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
              <span className="truncate">Challenge request sent to {scannedPlayer.name || scannedPlayer.gid}!</span>
            </div>
          )}

          {/* Action Row */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleScanAgain}
              className="flex-1 py-2 px-3 bg-[#ebedf2] hover:bg-[#e2e6ec] text-zinc-800 text-xs font-bold rounded-xl border border-white/80 shadow-[2px_2px_4px_#c8d0db,-2px_-2px_4px_#ffffff] transition-all cursor-pointer active:scale-95"
            >
              Scan Another
            </button>
            <button
              type="button"
              onClick={handleInitiateDuel}
              disabled={duelStatus === 'sent'}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl shadow transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                duelStatus === 'sent'
                  ? 'bg-emerald-600 text-white border border-emerald-500 opacity-90'
                  : 'bg-gradient-to-b from-zinc-900 to-black text-white border border-zinc-800'
              }`}
            >
              <Sword size={14} weight="bold" />
              <span>{duelStatus === 'sent' ? 'Challenge Sent' : 'Duel'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-instruction */}
      {scannerStatus === 'scanning' && !isCameraDisabledInApp && (
        <p className="text-[11px] text-zinc-500 text-center mt-3 font-medium">
          Align any Arena QR code within the frame to verify.
        </p>
      )}
    </div>
  );
}
