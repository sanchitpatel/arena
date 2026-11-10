import React, { useState, useEffect, useCallback } from 'react';
import { claimOrRegisterGuest } from '../../services/arenaService';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';
import { normalizePlayerInput, validatePlayerHandle } from '../../utils/sanitize';
import { CircleNotch, ArrowRight, UserCircle, User, ShieldCheck } from '../icons';
import Logo from '../Logo';
import ChatGPTOrb from './ChatGPTOrb';
import ArenaAvatar, { CURATED_AVATARS } from '../avatars/ArenaAvatar';

const STORAGE_KEY_DRAFT_NAME = 'arena_draft_username';
const STORAGE_KEY_DRAFT_AVATAR = 'arena_draft_avatar';

export const LoginView = ({ onEnterArena }) => {
  // Initialize with verified local guest ID if returning, or null if brand new device
  const [guestId, setGuestId] = useState(() => getPlayerId() || null);
  const [orbNumber, setOrbNumber] = useState(() => {
    const existing = getPlayerId();
    return existing ? getOrbNumber(existing) : null;
  });

  // Restore draft username from cache immediately on mount or refresh
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(STORAGE_KEY_DRAFT_NAME) || '';
    } catch {
      return '';
    }
  });

  // Restore draft avatar from cache immediately on mount or refresh
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    if (typeof window === 'undefined') return '1';
    try {
      return window.localStorage.getItem(STORAGE_KEY_DRAFT_AVATAR) || '1';
    } catch {
      return '1';
    }
  });

  const [selectedTeam, setSelectedTeam] = useState('Alpha');
  const [isLoading, setIsLoading] = useState(true);
  const [isEntering, setIsEntering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // On mount, claim or reconnect this device in PostgreSQL to fetch official sequential Orb & Guest ID
  const initGuest = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await claimOrRegisterGuest();

      if (res.success && res.data) {
        const assignedGuestId = res.data.guest_id;
        const assignedOrb = res.data.orb_number || getOrbNumber(assignedGuestId);
        setGuestId(assignedGuestId);
        setOrbNumber(assignedOrb);

        // Priority for username restoration:
        // 1. Locally typed/cached draft (protects accidental refresh while typing)
        // 2. Already registered handle in DB (if previously customized)
        // 3. Fallback to empty (placeholder will display assigned Guest ID)
        let cachedDraft = '';
        try {
          cachedDraft = window.localStorage.getItem(STORAGE_KEY_DRAFT_NAME) || '';
        } catch {}

        if (cachedDraft) {
          setPlayerName(cachedDraft);
        } else if (res.data.name && res.data.name !== assignedGuestId) {
          setPlayerName(res.data.name);
          try {
            window.localStorage.setItem(STORAGE_KEY_DRAFT_NAME, res.data.name);
          } catch {}
        } else {
          setPlayerName('');
        }

        // Same smart caching for avatar selection
        let cachedAvatar = '';
        try {
          cachedAvatar = window.localStorage.getItem(STORAGE_KEY_DRAFT_AVATAR) || '';
        } catch {}

        if (cachedAvatar) {
          setSelectedAvatar(cachedAvatar);
        } else if (res.data.avatar) {
          const num = parseInt(String(res.data.avatar).replace(/\D/g, ''), 10);
          const validNum = num >= 1 && num <= 30 ? String(num) : '1';
          setSelectedAvatar(validNum);
          try {
            window.localStorage.setItem(STORAGE_KEY_DRAFT_AVATAR, validNum);
          } catch {}
        }

        if (res.data.team) setSelectedTeam(res.data.team);
      } else {
        setErrorMessage(res?.error || 'Unable to connect to local Arena server. Please check Wi-Fi.');
      }
    } catch (err) {
      console.warn('[Onboarding] Error claiming player ID:', err);
      setErrorMessage(err.message || 'Unable to connect to local Arena server. Please check Wi-Fi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initGuest();
  }, [initGuest]);

  // Instant real-time draft caching on every keystroke
  const handleNameChange = (e) => {
    const clean = normalizePlayerInput(e.target.value);
    setPlayerName(clean);
    if (errorMessage) setErrorMessage('');

    try {
      if (clean) {
        window.localStorage.setItem(STORAGE_KEY_DRAFT_NAME, clean);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_DRAFT_NAME);
      }
    } catch (err) {
      console.warn('[Onboarding] Error caching draft username:', err);
    }
  };

  const handleAvatarSelect = (avatarId) => {
    setSelectedAvatar(avatarId);
    try {
      window.localStorage.setItem(STORAGE_KEY_DRAFT_AVATAR, String(avatarId));
    } catch (err) {
      console.warn('[Onboarding] Error caching draft avatar:', err);
    }
  };

  const handleEnterArena = async (e) => {
    if (e) e.preventDefault();
    if (isEntering) return;

    try {
      setIsEntering(true);
      setErrorMessage('');

      const activeGuestId = guestId || 'Guest001';

      // 1. Strict Input Normalization & Validation Check
      const validation = validatePlayerHandle(playerName, activeGuestId);
      if (!validation.isValid) {
        setErrorMessage(validation.error);
        setIsEntering(false);
        return;
      }

      const displayName = validation.value;

      // Keep cached draft synced with validated final handle
      try {
        window.localStorage.setItem(STORAGE_KEY_DRAFT_NAME, displayName);
        window.localStorage.setItem(STORAGE_KEY_DRAFT_AVATAR, String(selectedAvatar));
      } catch {}

      // 2. Submit normalized name & avatar to PostgreSQL
      const res = await claimOrRegisterGuest({
        name: displayName,
        avatar: selectedAvatar,
        team: selectedTeam,
      });

      const finalPlayer = res.success && res.data ? res.data : {
        guest_id: activeGuestId,
        orb_number: orbNumber || 1,
        name: displayName,
        avatar: selectedAvatar,
        team: selectedTeam,
      };

      if (typeof onEnterArena === 'function') {
        onEnterArena(finalPlayer);
      }
    } catch (err) {
      console.error('[Onboarding] Error entering arena:', err);
      setErrorMessage('Unable to connect to local Arena server. Please check Wi-Fi.');
    } finally {
      setIsEntering(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] text-zinc-800 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      <div className="w-full max-w-[430px] relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <Logo className="w-[68px] h-[68px] sm:w-20 sm:h-20 mb-2" />
          <h1 className="font-arena text-[32px] sm:text-[36px] font-black tracking-wider text-zinc-900">
            ARENA
          </h1>
        </div>

        {/* Neumorphic Main Onboarding Card */}
        <div className="bg-[#ebedf2] border border-slate-300/60 rounded-[2.5rem] p-5 sm:p-9 shadow-[inset_8px_8px_20px_#ffffff,inset_-8px_-8px_20px_#c5ccd6]">
          {isLoading && !guestId ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <CircleNotch size={32} className="animate-spin text-slate-500" />
              <p className="text-xs font-semibold text-zinc-600">Assigning Player Orb...</p>
            </div>
          ) : errorMessage && !guestId ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4 text-center px-4">
              <p className="text-xs font-semibold text-rose-600">{errorMessage}</p>
              <button
                type="button"
                onClick={initGuest}
                className="px-5 py-3 bg-zinc-900 text-white text-xs font-bold rounded-full shadow hover:bg-zinc-800 transition cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnterArena} className="space-y-6">
              {/* The Ethereal ChatGPT-Style Player Orb */}
              <div className="flex flex-col items-center justify-center pt-2">
                <ChatGPTOrb
                  orbNumber={orbNumber || 1}
                  avatar={selectedAvatar}
                  size="w-24 h-24 sm:w-28 sm:h-28"
                />

                <div className="mt-4 text-center">
                  <span
                    className="font-arena inline-block px-3.5 py-1 rounded-full bg-gradient-to-r from-white to-zinc-200 border border-white text-zinc-600 text-[13.5px] tracking-wider shadow-sm"
                    style={{ WebkitTextStroke: '0.5px' }}
                  >
                    {guestId || 'Guest...'}
                  </span>
                  <p className="text-[12px] text-zinc-500/80 mt-1">
                    Your assigned player identity on venue network
                  </p>
                </div>
              </div>

              {/* Player Handle Input */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold tracking-wider text-zinc-500 pl-1 flex items-center gap-1.5 -mt-0.5">
                  <User size={15} weight="bold" className="text-zinc-500" />
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={handleNameChange}
                    placeholder={guestId || 'Player Name'}
                    maxLength={16}
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full py-3 px-4 bg-[#F2F7FC] text-zinc-900 font-semibold text-sm rounded-3xl border border-transparent shadow-[inset_3px_3px_6px_#c8d0db,inset_-3px_-3px_6px_#ffffff] outline-none focus:outline-none focus:border-zinc-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 selection:bg-sky-200 selection:text-zinc-900 transition-colors duration-150 placeholder:text-zinc-400"
                    style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  />
                </div>
                {errorMessage && (
                  <p className="text-[10.5px] font-medium text-rose-500 pl-2 pt-0.5">
                    {errorMessage}
                  </p>
                )}
              </div>

              {/* Curated Lorelei Avatar Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[14px] font-bold tracking-wider text-zinc-500 flex items-center gap-1.5 -mt-1.5">
                    <UserCircle size={20} weight="bold" className="text-zinc-500/80 " />
                    Choose Avatar
                  </label>
                </div>

                <div className="p-3 bg-[#F2F7FC] rounded-2xl shadow-[inset_2px_2px_5px_#c8d0db,inset_-2px_-2px_5px_#ffffff]">
                  <div className="grid grid-cols-5 gap-2.5 sm:gap-3 max-h-[185px] overflow-y-auto p-1.5 pr-1.5 avatar-scroll">
                    {CURATED_AVATARS.map((av) => {
                      const isSelected = String(selectedAvatar) === String(av.id) || String(selectedAvatar) === String(av.num);
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => handleAvatarSelect(av.id)}
                          className={`relative flex items-center justify-center p-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-[#F2F7FC] scale-105 shadow-md z-10'
                              : 'opacity-85 hover:opacity-100 hover:scale-105 active:scale-95'
                          }`}
                        >
                          <ArenaAvatar id={av.id} size="md" className="w-12 h-12 sm:w-[50px] sm:h-[50px] shadow-sm" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Enter Arena CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isEntering || !guestId}
                  className="w-full py-3.5 px-6 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-white font-bold text-base rounded-full transition-[box-shadow] duration-200 ease-out flex items-center justify-center gap-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),3px_3px_8px_#c5ccd6,-3px_-3px_8px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)] cursor-pointer border border-zinc-800/80 group"
                >
                  {isEntering ? (
                    <>
                      <CircleNotch size={18} className="animate-spin text-zinc-300" />
                      <span>Entering Arena...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Arena</span>
                      <div className="w-5 h-5 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out group-hover:translate-x-1.5">
                        <ArrowRight size={18} weight="bold" />
                      </div>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginView;
