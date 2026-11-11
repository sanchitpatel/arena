import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { CheckCircle, WarningCircle, ArrowClockwise, CircleNotch, CameraSlash } from '../icons';
import { Sword } from '@phosphor-icons/react/dist/icons/Sword';
import { killAllMediaTracks } from '../../utils/mediaGuard';

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

  // Track if attendee explicitly paused camera access in Arena settings
  const [isCameraDisabledInApp, setIsCameraDisabledInApp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('arena_perm_camera') === 'disabled';
  });

  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const isMountedRef = useRef(true);

  // Generate unique DOM container ID per mount to avoid collision
  const containerId = useRef(`arena-qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;

  // Initialize and start camera scanner
  const startCamera = async (mode = facingMode) => {
    try {
      setScannerStatus('initializing');
      setErrorMessage('');
      setScannedPlayer(null);

      // Clean up previous running instance safely
      if (scannerRef.current && isScanningRef.current) {
        try {
          isScanningRef.current = false;
          await scannerRef.current.stop();
        } catch { }
      }

      // Ensure the container element exists in DOM
      const elem = document.getElementById(containerId);
      if (!elem) {
        return;
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText) => {
        if (!isMountedRef.current) return;

        try {
          let parsed = null;
          // Case 1: JSON payload format
          if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
            parsed = JSON.parse(decodedText);
          }
          // Case 2: URL payload format (e.g., https://arena.bmiil.com/arena?player=GUEST006&orb=6&name=aman&avatar=1)
          else if (decodedText.includes('player=') || decodedText.includes('gid=')) {
            let searchParams;
            try {
              const url = new URL(decodedText);
              searchParams = url.searchParams;
            } catch {
              searchParams = new URLSearchParams(decodedText.includes('?') ? decodedText.split('?')[1] : decodedText);
            }

            parsed = {
              app: searchParams.get('app') || 'ARENA',
              gid: searchParams.get('player') || searchParams.get('gid'),
              orb: searchParams.get('orb') ? parseInt(searchParams.get('orb'), 10) : 1,
              name: searchParams.get('name') || searchParams.get('player'),
              avatar: searchParams.get('avatar') || '1',
            };
          }

          if (parsed && (parsed.app === 'ARENA' || parsed.gid)) {
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
        } catch (e) { }

        // Generic text/URL scan fallback
        setScannedPlayer({
          rawText: decodedText,
          gid: 'Scanned Token',
          name: decodedText.slice(0, 24),
        });
        setScannerStatus('success');

        if (scannerRef.current && isScanningRef.current) {
          try {
            scannerRef.current.pause(true);
          } catch { }
        }
      };

      const qrCodeErrorCallback = () => {
        // Continuous scan tick; expected when frame contains no QR code
      };

      const config = {
        fps: 15,
        qrbox: { width: 220, height: 220 },
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
        // If desktop has no environment camera, retry with user/webcam fallback
        try {
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
        } catch (secondErr) {
          // Ultimate fallback to default camera without constraint
          await html5QrCode.start(
            true,
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
        }
      }

      if (isMountedRef.current) {
        isScanningRef.current = true;
        setScannerStatus('scanning');
      } else {
        // Unmounted during start: shut down immediately
        stopCameraHardwareImmediately('Unmounted during startup');
      }
    } catch (err) {
      if (isMountedRef.current) {
        setScannerStatus('error');
        setErrorMessage(
          err?.name === 'NotAllowedError' || err?.message?.includes('Permission')
            ? 'Camera permission was denied. Please allow camera access in your browser.'
            : 'Unable to access device camera. Please check your camera permissions.'
        );
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    // Check if camera is paused in user preferences
    const pref = typeof window !== 'undefined' ? window.localStorage.getItem('arena_perm_camera') : null;

    if (pref === 'disabled') {
      setIsCameraDisabledInApp(true);
      setScannerStatus('disabled');
      return;
    }

    startCamera(facingMode);

    return () => {
      isMountedRef.current = false;
      stopCameraHardwareImmediately('ArenaQRScanner unmounted');
    };
  }, [facingMode]);

  // Forcefully stop all camera tracks immediately on unmount or pause
  const stopCameraHardwareImmediately = (reason = 'Manual stop') => {
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

    // 2. Safe Html5Qrcode instance shutdown:
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        scanner.stop().catch(() => {}).finally(() => {
          try { scanner.clear(); } catch {}
        });
      } catch {
        try { scannerRef.current.clear(); } catch {}
      }
    }

    // 3. Global MediaGuard kill to guarantee NO orphaned stream remains in memory (camera video only, preserving audio/mic):
    killAllMediaTracks(`Scanner stop: ${reason}`, 'video');
  };

  // Re-enable camera directly inside the scanner box
  const handleEnableCameraInScanner = async () => {
    try {
      window.localStorage.setItem('arena_perm_camera', 'granted');
    } catch { }
    setIsCameraDisabledInApp(false);
    startCamera(facingMode);
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleScanAgain = () => {
    setScannedPlayer(null);
    setScannerStatus('scanning');
    startCamera(facingMode);
  };

  return (
    <div className={`flex flex-col items-center select-none font-sans ${className}`}>
      {/* Scanner Viewfinder Box */}
      <div className="relative w-full max-w-[320px] aspect-square rounded-[2rem] bg-black overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_12px_32px_rgba(197,204,214,0.5)] border-2 border-slate-300/80">
        {/* html5-qrcode video target mount */}
        <div id={containerId} className="w-full h-full object-cover" />

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
            <span>Player Verified!</span>
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
              onClick={() => {
                alert(`Challenge request initiated for ${scannedPlayer.name || scannedPlayer.gid}!`);
              }}
              className="flex-1 py-2 px-3 bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold rounded-xl border border-zinc-800 shadow transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Sword size={14} weight="bold" />
              <span>Duel</span>
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
