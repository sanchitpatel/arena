import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  UserCircle,
  CheckCircle,
  CircleNotch,
  SignOut,
  X,
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const debounceTimerRef = useRef(null);

  // Sync state if player prop updates
  useEffect(() => {
    if (player?.name && player.name !== guestId) {
      setPlayerName(player.name);
    }
    if (player?.avatar) {
      setSelectedAvatar(String(player.avatar));
    }
  }, [player, guestId]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const persistProfile = async (targetName, targetAvatar) => {
    try {
      setIsSaving(true);
      setErrorMessage('');

      // 1. Strict Input Sanitization & Validation
      const validation = validatePlayerHandle(targetName, guestId);
      if (!validation.isValid) {
        setErrorMessage(validation.error);
        setIsSaving(false);
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
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setErrorMessage(res?.error || 'Changes saved locally (offline mode)');
      }
    } catch (err) {
      console.error('[ProfileView] Auto-save error:', err);
      setErrorMessage('Changes saved locally (offline mode)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameChange = (e) => {
    const clean = normalizePlayerInput(e.target.value);
    setPlayerName(clean);
    if (errorMessage) setErrorMessage('');
    if (saveSuccess) setSaveSuccess(false);

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
      persistProfile(clean, selectedAvatar);
    }, 500);
  };

  const handleNameBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistProfile(playerName, selectedAvatar);
  };

  const handleAvatarSelect = (avatarId) => {
    const newAvatar = String(avatarId);
    setSelectedAvatar(newAvatar);
    if (saveSuccess) setSaveSuccess(false);

    try {
      window.localStorage.setItem(STORAGE_KEY_DRAFT_AVATAR, newAvatar);
    } catch { }

    // Instant automatic DB sync on avatar selection
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistProfile(playerName, newAvatar);
  };

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistProfile(playerName, selectedAvatar);
  };

  return (
    <div className="w-full max-w-[430px] mx-auto px-4 sm:px-2 space-y-6 pb-12 select-none font-sans">
      {/* ========================================================
          1. MAIN PROFILE & AVATAR EDIT FORM (Directly on canvas)
          ======================================================== */}
      <form onSubmit={handleSaveProfile} className="space-y-5">
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
            <label className="text-[12px] font-bold tracking-wider text-zinc-500 pl-1 flex items-center gap-1.5">
              <User size={15} weight="bold" className="text-zinc-500" />
              Username
            </label>
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
            <div className="flex items-center justify-between pl-1">
              <label className="text-[12px] font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <UserCircle size={19} weight="bold" className="text-zinc-500/80" />
                Choose Avatar
              </label>
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

          {/* Auto-Save Status Indicator */}
          <div className="flex items-center justify-center min-h-[22px] pt-1 text-[11px] font-medium transition-all">
            {isSaving ? (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <CircleNotch size={13} className="animate-spin text-zinc-400" />
                <span>Saving changes...</span>
              </div>
            ) : saveSuccess ? (
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold animate-in fade-in">
                <CheckCircle size={13} weight="fill" className="text-emerald-500" />
                <span>Saved automatically</span>
              </div>
            ) : errorMessage ? (
              <p className="text-rose-500 font-medium">{errorMessage}</p>
            ) : null}
          </div>
        </form>

      {/* ========================================================
          2. SESSION & ACCOUNT CARD (Shifted to bottom per user request)
          ======================================================== */}
      <div className="bg-[#ebedf2] border border-slate-300/60 rounded-[2rem] p-4 sm:p-5 shadow-[inset_4px_4px_10px_#ffffff,inset_-4px_-4px_10px_#c5ccd6]">
        <div className="flex items-center gap-3.5 pb-3 mb-3 border-b border-zinc-300/60">
          <div className="w-12 h-12 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-white flex items-center justify-center overflow-hidden shrink-0 bg-white">
            <ArenaAvatar id={selectedAvatar} size="badge" className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-zinc-900 truncate">
              {playerName || player?.name || guestId}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-100/60 hover:bg-rose-100/90 shadow-[inset_2px_2px_4px_#ddb6b6,inset_-2px_-2px_4px_#ffffff] hover:shadow-[inset_3px_3px_5px_#ddb6b6,inset_-3px_-3px_5px_#ffffff] active:scale-[0.98] transition-all cursor-pointer border border-rose-300/60"
        >
          <SignOut size={16} weight="bold" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ========================================================
          3. PLAYER QR BADGE POP-UP MODAL (Triggered via Orb QR Icon)
          ======================================================== */}
      {qrModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] w-screen h-screen min-h-screen bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-[#ebedf2] border border-slate-300/60 rounded-[2.5rem] p-5 shadow-[inset_8px_8px_20px_#ffffff,inset_-8px_-8px_20px_#c5ccd6]">
            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#ebedf2] shadow-[2px_2px_4px_#c5ccd6,-2px_-2px_4px_#ffffff] flex items-center justify-center text-zinc-500 hover:text-zinc-900 border border-white/60 transition-all cursor-pointer z-10 active:scale-90"
              title="Close QR Badge"
            >
              <X size={16} weight="bold" />
            </button>
            <PlayerQRBadge
              player={{
                guest_id: guestId,
                orb_number: orbNumber,
                name: playerName || player?.name || guestId,
                avatar: selectedAvatar,
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProfileView;
