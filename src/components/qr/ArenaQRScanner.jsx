import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { CheckCircle, CheckCircleBW, WarningCircle, ArrowClockwise, CircleNotch, CameraSlash, FlipHorizontalIcon, BootstrapQrCode, Play, Pause } from '../icons';
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
export default function ArenaQRScanner({
  onScanSuccess,
  onClose,
  onMyQrClick,
  className = '',
  variant = 'modal',
  showMyQrButton = true,
}) {
  const [scannerStatus, setScannerStatus] = useState('initializing'); // 'initializing' | 'scanning' | 'success' | 'error' | 'disabled'
  const [errorMessage, setErrorMessage] = useState('');
  const [scannedPlayer, setScannedPlayer] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [invalidBanner, setInvalidBanner] = useState('');
  const [duelStatus, setDuelStatus] = useState(null); // 'sent' | null
  const [isPaused, setIsPaused] = useState(false);

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
  const isPausedRef = useRef(false);

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
    if (!payload && (rawText.startsWith('http://') || rawText.startsWith('https://'))) {
      try {
        const url = new URL(rawText);
        const params = url.searchParams;
        const appParam = params.get('app');
        const playerParam = params.get('player') || params.get('gid');

        // Security validation:
        // 1. Strict protocol: http or https
        // 2. Strict path: /arena or /arena/
        // 3. Origin must match active domain or trusted Arena host (localhost gated to DEV)
        const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);
        const isTrustedHost =
          typeof window !== 'undefined' &&
          (url.hostname === window.location.hostname ||
            url.hostname === 'arena.bmiil.com' ||
            url.hostname.endsWith('.bmiil.com') ||
            (isDev && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')));

        const isArenaPath = url.pathname === '/arena' || url.pathname === '/arena/';

        if (isTrustedHost && playerParam && (appParam === 'ARENA' || isArenaPath)) {
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

          // Freeze video frame on screen under the frosted glass overlay without blacking out the screen
          if (scannerRef.current) {
            try {
              scannerRef.current.pause(true);
            } catch { }
          }

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
            ? 'Camera access is blocked. Please allow it in your browser settings.'
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
          setErrorMessage('Camera access is blocked. Please allow it in your browser settings.');
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

    // Handle document visibility change (phone screen lock, switching browser tabs)
    const handleVisibilityChange = () => {
      if (!isMountedRef.current) return;
      if (document.hidden) {
        // Tab backgrounded or screen locked: stop hardware tracks to save battery and avoid iOS WebKit frozen stream
        if (isScanningRef.current) {
          stopCameraHardwareImmediately('Tab backgrounded / screen locked');
        }
      } else {
        // Tab returned to foreground: restart camera if active, not disabled in settings, and not paused
        const currentPref = getInAppPermission('camera');
        if (currentPref !== 'disabled' && !hasScannedRef.current && !isPausedRef.current) {
          startCamera(facingMode);
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
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

  const handleTogglePause = () => {
    // If a player was successfully scanned, tapping the first action button resumes scanning
    if (scannerStatus === 'success') {
      handleScanAgain();
      return;
    }

    if (isPaused) {
      isPausedRef.current = false;
      setIsPaused(false);
      if (scannerRef.current) {
        try {
          scannerRef.current.resume();
        } catch {
          startCamera(facingMode);
        }
      } else {
        startCamera(facingMode);
      }
    } else {
      isPausedRef.current = true;
      setIsPaused(true);
      if (scannerRef.current) {
        try {
          scannerRef.current.pause(true);
        } catch { }
      }
    }
  };

  const handleFlipCamera = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    setScannedPlayer(null);
    setDuelStatus(null);
    hasScannedRef.current = false;
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleScanAgain = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    setScannedPlayer(null);
    setDuelStatus(null);
    setInvalidBanner('');
    lastInvalidCodeRef.current = '';
    hasScannedRef.current = false;
    setScannerStatus('scanning');
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch {
        startCamera(facingMode);
      }
    } else {
      startCamera(facingMode);
    }
  };

  const handleInitiateDuel = () => {
    setDuelStatus('sent');
    if (navigator?.vibrate) {
      navigator.vibrate([30, 40, 30]);
    }
  };

  const handleOpenMyQr = () => {
    if (typeof onMyQrClick === 'function') {
      onMyQrClick();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('arena:open-badge'));
    }
  };

  const isPage = variant === 'page';

  return (
    <div className={`flex flex-col items-center select-none font-sans pt-1 sm:pt-3 pb-1 ${className}`}>
      {/* Main Scanner Card Container */}
      <div className={`relative pt-2 pb-6 px-5 sm:px-4 rounded-[1.15rem] bg-white border border-slate-200/80 shadow-[0_16px_40px_rgba(197,204,214,0.5),inset_0_1px_1px_rgba(255,255,255,0.8)] w-full flex flex-col items-center ${
        isPage ? 'max-w-[380px] sm:max-w-[480px]' : 'max-w-[250px]'
      }`}>
        {/* Subtle Decorative Top Corner Accents */}
        <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-zinc-300 rounded-tl" />
        <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-zinc-300 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-zinc-300 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-zinc-300 rounded-br" />

        {/* Header on top in the middle (Arena Font) */}
        <div className="font-arena text-[15px] font-black tracking-widest text-zinc-800 uppercase text-center select-none pt-0.5 pb-2">
          ARENA SCANNER
        </div>

        {/* Viewfinder Canvas */}
        <div className={`relative flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-slate-200/80 ${
          isPage ? 'w-[315px] h-[315px] sm:w-[420px] sm:h-[420px]' : 'w-52 h-52'
        }`}>
          {/* html5-qrcode video target mount */}
          <div id={containerId} className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {/* Floating Non-Intrusive Invalid Code Banner */}
          {invalidBanner && scannerStatus === 'scanning' && !isCameraDisabledInApp && (
            <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/85 border border-rose-500/60 backdrop-blur-md shadow-lg text-white text-[10.5px] font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
              <WarningCircle size={13} weight="bold" className="text-rose-400 shrink-0" />
              <span className="truncate">{invalidBanner}</span>
            </div>
          )}

          {/* Viewfinder Target Overlays (while scanning) */}
          {scannerStatus === 'scanning' && !isCameraDisabledInApp && !isPaused && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Center Reticle Frame */}
              <div className={`relative border-2 border-sky-400/80 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.4)] ${
                isPage ? 'w-64 h-64 sm:w-76 sm:h-76' : 'w-40 h-40'
              }`}>
                {/* Corner brackets */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-white rounded-tl" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-white rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-white rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-white rounded-br" />

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

          {/* Paused Overlay */}
          {isPaused && !isCameraDisabledInApp && (
            <div
              onClick={handleTogglePause}
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white z-20 animate-in fade-in duration-150 cursor-pointer select-none"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 border border-white/40 shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform">
                <Play size={22} weight="fill" className="text-white ml-0.5" />
              </div>
              <span className="font-arena text-[11px] font-black tracking-widest text-zinc-200 uppercase">
                Scanner Paused • Tap to Resume
              </span>
            </div>
          )}

          {/* Success Frosted Glass Overlay (Freezes frame with blur instead of turning screen black) */}
          {scannerStatus === 'success' && !isCameraDisabledInApp && (
            <div
              onClick={handleScanAgain}
              className="absolute inset-0 bg-black/55 backdrop-blur-[3px] flex flex-col items-center justify-center gap-2 text-white z-20 animate-in fade-in duration-200 cursor-pointer select-none"
              title="Tap to scan another"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/70 shadow-[0_0_20px_rgba(255,255,255,0.25)] flex items-center justify-center animate-in zoom-in-75 duration-200">
                <CheckCircleBW size={37} />
              </div>
              <span className="font-arena text-[13px] font-black tracking-widest text-white uppercase">
                QR Code Scanned
              </span>
              <span className="text-[11px] text-zinc-300 font-medium -mt-2">
                Tap to scan another
              </span>
            </div>
          )}

          {/* Initializing Spinner Overlay */}
          {scannerStatus === 'initializing' && !isCameraDisabledInApp && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
              <CircleNotch size={28} className="animate-spin text-sky-400" />
              <span className="text-[11px] font-semibold text-zinc-300">Starting Camera...</span>
            </div>
          )}

          {/* Paused by User Preference in App */}
          {isCameraDisabledInApp && (
            <div className="absolute inset-0 bg-[#09090B]/95 backdrop-blur-md p-4 flex flex-col items-center justify-center text-center gap-2 text-white z-30 animate-in fade-in duration-200">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center text-zinc-400">
                <CameraSlash size={22} weight="bold" />
              </div>

              <div>
                <h4 className="text-[13px] font-bold text-white">Camera Access Paused</h4>
                <p className="text-[10px] text-zinc-400 mt-0.5 max-w-[220px] leading-relaxed">
                  Turned off in settings. Toggle below to resume.
                </p>
              </div>

              {/* Toggle Switch */}
              <div
                onClick={handleEnableCameraInScanner}
                className="mt-0.5 flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-zinc-800/80 active:scale-95 transition-all select-none"
              >
                <span className="text-[12px] font-semibold text-zinc-100">Enable</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={false}
                  className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-[#cbd2de]"
                >
                  <span className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out translate-x-0" />
                </button>
              </div>
            </div>
          )}

          {/* Error Fallback Overlay */}
          {scannerStatus === 'error' && !isCameraDisabledInApp && (
            <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center text-center gap-2 text-white">
              <WarningCircle size={30} weight="bold" className="text-rose-500" />
              <p className="text-[11px] text-zinc-300 leading-snug px-1">{errorMessage}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold rounded-lg border border-zinc-700 shadow flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ArrowClockwise size={13} weight="bold" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Camera Flip Button (Top Right Floating) */}
          {scannerStatus === 'scanning' && !isCameraDisabledInApp && (
            <button
              type="button"
              onClick={handleFlipCamera}
              className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md cursor-pointer active:scale-90 transition-all z-20"
              title="Flip Camera"
            >
              <FlipHorizontalIcon size={18} className="text-white" />
            </button>
          )}
        </div>

        {/* Sub-instruction (Always inside white card) */}
        <p className={`text-zinc-500/80 text-center mt-2 leading-relaxed ${
          isPage ? 'max-w-[320px] text-[11px]' : 'max-w-[230px] text-[10.5px]'
        }`}>
          {scannerStatus === 'success'
            ? 'Player verified. Challenge or scan another below.'
            : 'Align any Arena QR code within the frame to verify.'}
        </p>

        {/* 3 Action Buttons: Pause/Resume, Flip, QR (Always Visible inside White Card) */}
        <div className={`w-full flex items-center gap-2 sm:gap-2.5 mt-2.5 select-none ${
          isPage ? 'max-w-[325px] sm:max-w-[420px]' : 'max-w-[240px]'
        }`}>
          {/* Button 1: Pause / Resume / Scan Another */}
          <button
            type="button"
            onClick={handleTogglePause}
            className="flex-1 py-2.5 sm:py-3 px-2 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white text-[13px] font-bold rounded-xl border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] hover:shadow-[inset_0_-4px_7px_rgba(0,0,0,0.3),inset_0_2px_6px_rgba(255,255,255,0.55)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)] active:scale-[0.96] transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
            title={scannerStatus === 'success' ? "Scan Another QR" : isPaused ? "Resume Camera" : "Pause Camera"}
          >
            {scannerStatus === 'success' || isPaused ? (
              <>
                <Play size={18} weight="fill" className="text-sky-400 scale-105 shrink-0" />
                <span className="truncate">{scannerStatus === 'success' ? 'Scan' : 'Resume'}</span>
              </>
            ) : (
              <>
                <Pause size={18} weight="fill" className="text-white scale-105 shrink-0" />
                <span className="truncate">Pause</span>
              </>
            )}
          </button>

          {/* Button 2: Flip Camera */}
          <button
            type="button"
            onClick={handleFlipCamera}
            className="flex-1 py-2.5 sm:py-3 px-2 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white text-[13px] font-bold rounded-xl border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] hover:shadow-[inset_0_-4px_7px_rgba(0,0,0,0.3),inset_0_2px_6px_rgba(255,255,255,0.55)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)] active:scale-[0.96] transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
            title="Flip Front / Rear Camera"
          >
            <FlipHorizontalIcon size={20} className="text-white scale-105 shrink-0" />
            <span className="truncate">Flip</span>
          </button>

          {/* Button 3: QR Code Opening */}
          <button
            type="button"
            onClick={handleOpenMyQr}
            className="flex-1 py-2.5 sm:py-3 px-2 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white text-[13px] font-bold rounded-xl border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] hover:shadow-[inset_0_-4px_7px_rgba(0,0,0,0.3),inset_0_2px_6px_rgba(255,255,255,0.55)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)] active:scale-[0.96] transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
            title="Open My QR Code"
          >
            <BootstrapQrCode size={20} className="text-white scale-105 shrink-0" />
            <span className="truncate">QR</span>
          </button>
        </div>
      </div>

      {/* Scanned Result Discovery Card (Displayed at the bottom outside the white card) */}
      {scannerStatus === 'success' && scannedPlayer && (
        <div className={`mt-3.5 w-full p-2 pb-3 rounded-2xl bg-white border border-slate-200/80 shadow-[0_12px_32px_rgba(197,204,214,0.45)] animate-in fade-in slide-in-from-bottom-2 duration-200 ${
          isPage ? 'max-w-[380px] sm:max-w-[480px]' : 'max-w-[250px]'
        }`}>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold pb-1 mb-1 ml-1.5 border-b border-zinc-100">
            <CheckCircle size={15} weight="fill" className="text-emerald-600" />
            <span>Player Found</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-full border-2 border-white shadow overflow-hidden shrink-0 bg-[#F2F7FC]">
              <ArenaAvatar id={scannedPlayer.avatar || '1'} size="badge" className="w-full h-full" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-zinc-900 truncate">
                {scannedPlayer.name || scannedPlayer.gid}
              </div>
              <div className="text-[10.5px] font-arena text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5 mt-0.5">
                <span>{scannedPlayer.gid}</span>
                {scannedPlayer.orb && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-700/40" />
                    <span>Orb @{scannedPlayer.orb}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* In-Card Duel Status Feedback */}
          {duelStatus === 'sent' && (
            <div className="mt-1 py-1 px-2.5 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1 animate-in fade-in duration-150">
              <CheckCircle size={14} weight="fill" className="text-emerald-600 shrink-0" />
              <span className="truncate">Challenge request sent to {scannedPlayer.name || scannedPlayer.gid}!</span>
            </div>
          )}

          {/* Action Row */}
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleScanAgain}
              className="flex-1 py-2.5 sm:py-3 px-2 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white text-xs sm:text-[13px] font-bold rounded-xl border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] hover:shadow-[inset_0_-4px_7px_rgba(0,0,0,0.3),inset_0_2px_6px_rgba(255,255,255,0.55)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)] active:scale-[0.96] transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <ArrowClockwise size={16} weight="bold" className="text-white scale-105 shrink-0" />
              <span className="truncate">Scan Another</span>
            </button>
            <button
              type="button"
              onClick={handleInitiateDuel}
              disabled={duelStatus === 'sent'}
              className={`flex-1 py-2 sm:py-3 px-2 text-[13px] sm:text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.96] group ${
                duelStatus === 'sent'
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white border border-emerald-500/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] opacity-95'
                  : 'bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] hover:shadow-[inset_0_-4px_7px_rgba(0,0,0,0.3),inset_0_2px_6px_rgba(255,255,255,0.55)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)]'
              }`}
            >
              {duelStatus === 'sent' ? (
                <>
                  <CheckCircle size={16} weight="fill" className="text-white shrink-0" />
                  <span className="truncate">Challenge Sent</span>
                </>
              ) : (
                <>
                  <Sword size={18} weight="bold" className="text-white scale-105 shrink-0" />
                  <span className="truncate">Duel</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
