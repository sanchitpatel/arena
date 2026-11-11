import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  UserCircle,
  CheckCircle,
  CircleNotch,
  SignOut,
  X,
  Camera,
  Microphone,
  SlidersHorizontal,
} from '../icons';
import ChatGPTOrb from './ChatGPTOrb';
import ArenaAvatar, { CURATED_AVATARS } from '../avatars/ArenaAvatar';
import PlayerQRBadge from '../qr/PlayerQRBadge';
import { normalizePlayerInput, validatePlayerHandle } from '../../utils/sanitize';
import { claimOrRegisterGuest } from '../../services/arenaService';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';

const STORAGE_KEY_DRAFT_NAME = 'arena_draft_username';
const STORAGE_KEY_DRAFT_AVATAR = 'arena_draft_avatar';

export const ProfileView = ({ player, onUpdatePlayer, onSignOut }) => {
  const guestId = player?.guest_id || getPlayerId() || 'Guest001';
  const orbNumber = player?.orb_number || getOrbNumber(guestId) || 1;

  const [playerName, setPlayerName] = useState(() => {
    return player?.name && player.name !== guestId ? player.name : '';
  });
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    return player?.avatar ? String(player.avatar) : '1';
  });

  const [savingField, setSavingField] = useState(null); // 'username' | 'avatar' | null
  const [savedField, setSavedField] = useState(null);   // 'username' | 'avatar' | null
  const [errorMessage, setErrorMessage] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const debounceTimerRef = useRef(null);
  const savedTimerRef = useRef(null);

  // Client device permissions state (Camera & Microphone/Audio)
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [micGranted, setMicGranted] = useState(false);
  const [micLoading, setMicLoading] = useState(false);
  const [micError, setMicError] = useState('');

  // Check and listen to client device permission states (localStorage preference takes priority over browser grant)
  useEffect(() => {
    let isMounted = true;

    const checkExistingPermissions = async () => {
      // 1. Camera permission check:
      // Respect user's explicit in-app choice first
      const camPref = typeof window !== 'undefined' ? window.localStorage.getItem('arena_perm_camera') : null;
      if (camPref === 'disabled') {
        if (isMounted) setCameraGranted(false);
      } else if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const camQuery = await navigator.permissions.query({ name: 'camera' });
          const isAllowed = camQuery.state === 'granted' && camPref !== 'disabled';
          if (isMounted) setCameraGranted(isAllowed);

          camQuery.onchange = () => {
            const currentPref = window.localStorage.getItem('arena_perm_camera');
            if (isMounted && currentPref !== 'disabled') {
              setCameraGranted(camQuery.state === 'granted');
            }
          };
        } catch {
          if (isMounted) setCameraGranted(camPref === 'granted');
        }
      } else {
        if (isMounted) setCameraGranted(camPref === 'granted');
      }

      // 2. Microphone permission check:
      // Respect user's explicit in-app choice first
      const micPref = typeof window !== 'undefined' ? window.localStorage.getItem('arena_perm_mic') : null;
      if (micPref === 'disabled') {
        if (isMounted) setMicGranted(false);
      } else if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const micQuery = await navigator.permissions.query({ name: 'microphone' });
          const isAllowed = micQuery.state === 'granted' && micPref !== 'disabled';
          if (isMounted) setMicGranted(isAllowed);

          micQuery.onchange = () => {
            const currentPref = window.localStorage.getItem('arena_perm_mic');
            if (isMounted && currentPref !== 'disabled') {
              setMicGranted(micQuery.state === 'granted');
            }
          };
        } catch {
          if (isMounted) setMicGranted(micPref === 'granted');
        }
      } else {
        if (isMounted) setMicGranted(micPref === 'granted');
      }
    };

    checkExistingPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync state if player prop updates
  useEffect(() => {
    if (player?.name && player.name !== guestId) {
      setPlayerName(player.name);
    }
    if (player?.avatar) {
      setSelectedAvatar(String(player.avatar));
    }
  }, [player, guestId]);

  // Cleanup debounce & saved timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  // Close QR modal on Escape key press
  useEffect(() => {
    if (!qrModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setQrModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [qrModalOpen]);

  const persistProfile = async (targetName, targetAvatar, targetField = 'username') => {
    try {
      setSavingField(targetField);
      setSavedField(null);
      setErrorMessage('');

      // 1. Strict Input Sanitization & Validation
      const validation = validatePlayerHandle(targetName, guestId);
      if (!validation.isValid) {
        setErrorMessage(validation.error);
        setSavingField(null);
        return;
      }

      const displayName = validation.value;

      // 2. Immediate Local Storage Sync
      try {
        window.localStorage.setItem(STORAGE_KEY_DRAFT_NAME, displayName);
        window.localStorage.setItem(STORAGE_KEY_DRAFT_AVATAR, String(targetAvatar));
      } catch { }

      // 3. Atomically persist to PostgreSQL database via Supabase RPC
      const res = await claimOrRegisterGuest({
        name: displayName,
        avatar: String(targetAvatar),
        team: player?.team || 'Alpha',
      });

      if (res.success && res.data) {
        if (typeof onUpdatePlayer === 'function') {
          onUpdatePlayer(res.data);
        }
        setSavingField(null);
        setSavedField(targetField);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setSavedField(null);
        }, 2200);
      } else {
        setSavingField(null);
        setErrorMessage(res?.error || 'Changes saved locally (offline mode)');
      }
    } catch (err) {
      console.error('[ProfileView] Auto-save error:', err);
      setSavingField(null);
      setErrorMessage('Changes saved locally (offline mode)');
    }
  };

  const handleNameChange = (e) => {
    const clean = normalizePlayerInput(e.target.value);
    setPlayerName(clean);
    if (errorMessage) setErrorMessage('');
    if (savedField === 'username') setSavedField(null);

    try {
      if (clean) {
        window.localStorage.setItem(STORAGE_KEY_DRAFT_NAME, clean);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_DRAFT_NAME);
      }
    } catch { }

    // Debounced automatic DB sync (500ms after last keystroke)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      persistProfile(clean, selectedAvatar, 'username');
    }, 500);
  };

  const handleNameBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistProfile(playerName, selectedAvatar, 'username');
  };

  const handleAvatarSelect = (avatarId) => {
    const newAvatar = String(avatarId);
    setSelectedAvatar(newAvatar);
    if (savedField === 'avatar') setSavedField(null);

    try {
      window.localStorage.setItem(STORAGE_KEY_DRAFT_AVATAR, newAvatar);
    } catch { }

    // Instant automatic DB sync on avatar selection
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistProfile(playerName, newAvatar, 'avatar');
  };

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistProfile(playerName, selectedAvatar, 'username');
  };

  const handleToggleCamera = async () => {
    if (cameraLoading) return;
    setCameraError('');

    // If currently ON, user wants to mute/pause camera in Arena
    if (cameraGranted) {
      setCameraGranted(false);
      try {
        window.localStorage.setItem('arena_perm_camera', 'disabled');
      } catch { }
      return;
    }

    // If currently OFF, user wants to enable camera in Arena
    setCameraLoading(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported on this browser');
      }

      // Check if browser has already granted hardware permission in the past
      let alreadyGranted = false;
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const q = await navigator.permissions.query({ name: 'camera' });
          alreadyGranted = q.state === 'granted';
        } catch { }
      }

      if (alreadyGranted) {
        // Hardware already allowed in browser: immediately flip ON with ZERO pop-up!
        setCameraGranted(true);
        try {
          window.localStorage.setItem('arena_perm_camera', 'granted');
        } catch { }
      } else {
        // First-time grant request: trigger native prompt with desktop fallback
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
        } catch (firstErr) {
          // Desktop / laptop webcam fallback (prevents OverconstrainedError)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }

        // Release hardware immediately so device privacy light turns off
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        setCameraGranted(true);
        try {
          window.localStorage.setItem('arena_perm_camera', 'granted');
        } catch { }
      }
    } catch (err) {
      console.warn('[Permissions] Camera request denied or failed:', err);
      setCameraGranted(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permission blocked in browser settings. Tap the lock icon in your address bar to enable.');
      } else {
        setCameraError(err.message || 'Unable to access camera.');
      }
      try {
        window.localStorage.setItem('arena_perm_camera', 'denied');
      } catch { }
    } finally {
      setCameraLoading(false);
    }
  };

  const handleToggleMic = async () => {
    if (micLoading) return;
    setMicError('');

    // If currently ON, user wants to mute/pause mic in Arena
    if (micGranted) {
      setMicGranted(false);
      try {
        window.localStorage.setItem('arena_perm_mic', 'disabled');
      } catch { }
      return;
    }

    // If currently OFF, user wants to enable mic in Arena
    setMicLoading(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Microphone is not supported on this browser');
      }

      // Check if browser has already granted hardware permission in the past
      let alreadyGranted = false;
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const q = await navigator.permissions.query({ name: 'microphone' });
          alreadyGranted = q.state === 'granted';
        } catch { }
      }

      if (alreadyGranted) {
        // Hardware already allowed in browser: immediately flip ON with ZERO pop-up!
        setMicGranted(true);
        try {
          window.localStorage.setItem('arena_perm_mic', 'granted');
        } catch { }
      } else {
        // First-time grant request
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        // Release hardware immediately so device privacy indicator turns off
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        setMicGranted(true);
        try {
          window.localStorage.setItem('arena_perm_mic', 'granted');
        } catch { }
      }
    } catch (err) {
      console.warn('[Permissions] Microphone request denied or failed:', err);
      setMicGranted(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Permission blocked in browser settings. Tap the lock icon in your address bar to enable.');
      } else {
        setMicError(err.message || 'Unable to access microphone.');
      }
      try {
        window.localStorage.setItem('arena_perm_mic', 'denied');
      } catch { }
    } finally {
      setMicLoading(false);
    }
  };

  const renderFieldStatus = (field) => {
    if (savingField === field) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 animate-in fade-in duration-150 whitespace-nowrap shrink-0">
          <CircleNotch size={12} className="animate-spin text-zinc-400 shrink-0" />
          <span>Saving changes...</span>
        </span>
      );
    }
    if (savedField === field) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 animate-in fade-in duration-150 whitespace-nowrap shrink-0">
          <CheckCircle size={12} weight="fill" className="text-emerald-500 shrink-0" />
          <span>Saved</span>
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-[430px] mx-auto px-4 sm:px-2 space-y-6 pb-12 select-none font-sans">
      {/* ========================================================
          1. MAIN PROFILE & AVATAR EDIT FORM (Directly on canvas)
          ======================================================== */}
      <form onSubmit={handleSaveProfile} className="space-y-4">
        {/* Ethereal ChatGPT-Style Player Orb with Clickable QR Badge */}
        <div className="flex flex-col items-center justify-center pt-1">
          <ChatGPTOrb
            orbNumber={orbNumber}
            avatar={selectedAvatar}
            badge="qr"
            onBadgeClick={() => setQrModalOpen(true)}
            onOrbClick={() => setQrModalOpen(true)}
            size="w-28 h-28 sm:w-28 sm:h-28"
            numberSize="text-[40px] sm:text-[40px]"
          />

            <div className="mt-3.5 text-center">
              <span
                className="font-arena inline-block px-3.5 py-1 rounded-full bg-gradient-to-r from-white to-zinc-200 border border-white text-zinc-600 text-[12.5px] tracking-wider shadow-sm"
                style={{ WebkitTextStroke: '0.5px', fontWeight: 400 }}
              >
                {guestId}
              </span>
              <p className="text-[11px] text-zinc-500/80 mt-1">
                Your assigned player identity on venue network
              </p>
            </div>
          </div>

          {/* Username Input Field */}
          <div className="space-y-1.5">
            <div className="min-h-[20px] flex items-center justify-between pl-1 pr-1">
              <label className="text-[12px] font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <User size={15} weight="bold" className="text-zinc-500" />
                Username
              </label>
              {renderFieldStatus('username')}
            </div>
            <div className="relative">
              <input
                type="text"
                value={playerName}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                placeholder={guestId || 'Player Name'}
                maxLength={16}
                autoComplete="off"
                spellCheck="false"
                className="w-full py-2.5 px-4 bg-[#F2F7FC] text-zinc-900 font-semibold text-[13px] rounded-3xl border border-transparent shadow-[inset_3px_3px_6px_#c8d0db,inset_-3px_-3px_6px_#ffffff] outline-none focus:outline-none focus:border-zinc-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 selection:bg-sky-200 selection:text-zinc-900 transition-colors duration-150 placeholder:text-zinc-400"
                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              />
            </div>
            {errorMessage && (
              <p className="text-[10.5px] font-medium text-rose-500 pl-2 pt-0.5">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Curated Lorelei Avatar Selector Tray */}
          <div className="space-y-1.5">
            <div className="min-h-[20px] flex items-center justify-between pl-1 pr-1">
              <label className="text-[12px] font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <UserCircle size={19} weight="bold" className="text-zinc-500/80" />
                Choose Avatar
              </label>
              {renderFieldStatus('avatar')}
            </div>

            <div className="p-2 bg-[#F2F7FC] rounded-2xl shadow-[inset_2px_2px_5px_#c8d0db,inset_-2px_-2px_5px_#ffffff]">
              <div className="grid grid-cols-5 gap-2.5 sm:gap-3 max-h-[180px] overflow-y-auto p-1.5 pr-1.5 avatar-scroll">
                {CURATED_AVATARS.map((av) => {
                  const isSelected = String(selectedAvatar) === String(av.id) || String(selectedAvatar) === String(av.num);
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleAvatarSelect(av.id)}
                      className={`relative flex items-center justify-center p-0.5 rounded-full transition-all duration-150 cursor-pointer ${isSelected
                        ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-[#F2F7FC] scale-105 shadow-md z-10'
                        : 'opacity-85 hover:opacity-100 hover:scale-105 active:scale-95'
                        }`}
                    >
                      <ArenaAvatar id={av.id} size="md" className="w-11 h-11 sm:w-[50px] sm:h-[50px] shadow-sm" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </form>

      {/* ========================================================
          2. APP PERMISSIONS SECTION (Camera & Microphone/Audio)
          ======================================================== */}
      <div className="space-y-1.5">
        <div className="min-h-[20px] flex items-center justify-between pl-1 pr-1">
          <label className="text-[12px] font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
            <SlidersHorizontal size={17} weight="bold" className="text-zinc-500" />
            Permissions
          </label>
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
            {cameraGranted && micGranted ? (
              <span className="text-sky-500 font-semibold">Configured</span>
            ) : cameraGranted || micGranted ? (
              <span className="text-sky-500 font-semibold">Active</span>
            ) : (
              <span>Not Configured</span>
            )}
          </span>
        </div>

        <div className="bg-[#ebedf2] border border-slate-300/60 rounded-2xl p-2.5 sm:p-3 shadow-[inset_4px_4px_10px_#ffffff,inset_-4px_-4px_10px_#c5ccd6] space-y-2">
          {/* 1. Camera Permission Toggle Row */}
          <div>
            <div
              onClick={handleToggleCamera}
              className="flex items-center justify-between gap-3 p-1 rounded-xl cursor-pointer hover:bg-black/[0.02] active:scale-[0.99] transition-all select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#ebedf2] shadow-[2px_2px_4px_#c8d0db,-2px_-2px_4px_#ffffff] border border-white/80 flex items-center justify-center shrink-0">
                  <Camera
                    size={17}
                    weight="bold"
                    className={cameraGranted ? 'text-sky-600/90 transition-colors' : 'text-zinc-500 transition-colors'}
                  />
                </div>
                <div className="truncate">
                  <div className="text-[12.5px] font-bold text-zinc-900 leading-tight">
                    Camera Access
                  </div>
                  <div className="text-[10.5px] font-medium text-zinc-500 truncate leading-tight">
                    Arena QR Scanner & Quests
                  </div>
                </div>
              </div>

              {/* Custom Neumorphic iOS Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={cameraGranted}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCamera();
                }}
                disabled={cameraLoading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  cameraGranted
                    ? 'bg-sky-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]'
                    : 'bg-[#cbd2de] shadow-[inset_2px_2px_4px_#b3bac6,inset_-2px_-2px_4px_#ffffff]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[1px_2px_4px_rgba(0,0,0,0.25)] transition duration-200 ease-in-out flex items-center justify-center ${
                    cameraGranted ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {cameraLoading && (
                    <CircleNotch size={11} className="animate-spin text-zinc-500" />
                  )}
                </span>
              </button>
            </div>
            {cameraError && (
              <p className="text-[10px] font-medium text-rose-500 pl-11 pt-1 leading-tight">
                {cameraError}
              </p>
            )}
          </div>

          <div className="border-t border-zinc-300/60" />

          {/* 2. Microphone / Speaker Permission Toggle Row */}
          <div>
            <div
              onClick={handleToggleMic}
              className="flex items-center justify-between gap-3 p-1 rounded-xl cursor-pointer hover:bg-black/[0.02] active:scale-[0.99] transition-all select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#ebedf2] shadow-[2px_2px_4px_#c8d0db,-2px_-2px_4px_#ffffff] border border-white/80 flex items-center justify-center shrink-0">
                  <Microphone
                    size={17}
                    weight="bold"
                    className={micGranted ? 'text-sky-600/90 transition-colors' : 'text-zinc-500 transition-colors'}
                  />
                </div>
                <div className="truncate">
                  <div className="text-[12.5px] font-bold text-zinc-900 leading-tight">
                    Microphone Access
                  </div>
                  <div className="text-[10.5px] font-medium text-zinc-500 truncate leading-tight">
                    Venue Zone Tracking
                  </div>
                </div>
              </div>

              {/* Custom Neumorphic iOS Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={micGranted}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMic();
                }}
                disabled={micLoading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  micGranted
                    ? 'bg-sky-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]'
                    : 'bg-[#cbd2de] shadow-[inset_2px_2px_4px_#b3bac6,inset_-2px_-2px_4px_#ffffff]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[1px_2px_4px_rgba(0,0,0,0.25)] transition duration-200 ease-in-out flex items-center justify-center ${
                    micGranted ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {micLoading && (
                    <CircleNotch size={11} className="animate-spin text-zinc-500" />
                  )}
                </span>
              </button>
            </div>
            {micError && (
              <p className="text-[10px] font-medium text-rose-500 pl-11 pt-1 leading-tight">
                {micError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          3. SESSION & ACCOUNT CARD (Single horizontal row)
          ======================================================== */}
      <div className="bg-[#ebedf2] border border-slate-300/60 rounded-2xl p-2 sm:p-2.5 shadow-[inset_4px_4px_10px_#ffffff,inset_-4px_-4px_10px_#c5ccd6] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-white flex items-center justify-center overflow-hidden shrink-0 bg-white">
            <ArenaAvatar id={selectedAvatar} size="badge" className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-zinc-900 truncate">
              {playerName || player?.name || guestId}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-100/60 hover:bg-rose-100/90 shadow-[inset_2px_2px_4px_#ddb6b6,inset_-2px_-2px_4px_#ffffff] hover:shadow-[inset_3px_3px_5px_#ddb6b6,inset_-3px_-3px_5px_#ffffff] active:scale-[0.96] transition-all cursor-pointer border border-rose-300/60"
        >
          <SignOut size={15} weight="bold" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ========================================================
          3. PLAYER QR BADGE POP-UP MODAL (Triggered via Orb QR Icon)
          ======================================================== */}
      {qrModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setQrModalOpen(false)}
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] w-screen h-screen min-h-screen bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[310px] bg-[#ebedf2] rounded-[36px] p-3 sm:p-3 border-4 border-white animate-in zoom-in-95 duration-150 cursor-default"
          >
            {/* Close button positioned in the top-right corner OUT of the card frame */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQrModalOpen(false);
              }}
              className="absolute -top-3 -right-2.5 w-8 h-8 rounded-full bg-[#ebedf2] shadow-[2px_2px_6px_rgba(0,0,0,0.3),-1px_-1px_3px_#ffffff] flex items-center justify-center text-rose-500 hover:text-rose-700 border-2 border-white transition-all cursor-pointer z-30 active:scale-90"
              title="Close QR Badge"
            >
              <X size={15} weight="bold" />
            </button>

            <div className="relative bg-[#f0f2f5] rounded-[26px] p-4 sm:p-3.5 shadow-[inset_2px_2px_6px_#cbd2de,inset_-2px_-2px_6px_#ffffff]">
              <PlayerQRBadge
                player={{
                  guest_id: guestId,
                  orb_number: orbNumber,
                  name: playerName || player?.name || guestId,
                  avatar: selectedAvatar,
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProfileView;
