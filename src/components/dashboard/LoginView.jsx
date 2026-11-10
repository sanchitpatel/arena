import React, { useState, useEffect } from 'react';
import { claimOrRegisterGuest } from '../../services/arenaService';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';
import { CircleNotch, ArrowRight, Sparkle, User, ShieldCheck } from '../icons';
import Logo from '../Logo';
import ChatGPTOrb from './ChatGPTOrb';
import ArenaAvatar, { CURATED_AVATARS } from '../avatars/ArenaAvatar';

export const LoginView = ({ onEnterArena }) => {
  const [guestId, setGuestId] = useState(() => getPlayerId() || 'Guest001');
  const [orbNumber, setOrbNumber] = useState(() => getOrbNumber(guestId) || 1);
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('1');
  const [selectedTeam, setSelectedTeam] = useState('Alpha');
  const [isLoading, setIsLoading] = useState(true);
  const [isEntering, setIsEntering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // On mount, claim or reconnect this device in PostgreSQL to fetch official sequential Orb & Guest ID
  useEffect(() => {
    let isMounted = true;

    async function initGuest() {
      try {
        setIsLoading(true);
        const res = await claimOrRegisterGuest();
        if (isMounted && res.success && res.data) {
          const assignedGuestId = res.data.guest_id || 'Guest001';
          const assignedOrb = res.data.orb_number || getOrbNumber(assignedGuestId);
          setGuestId(assignedGuestId);
          setOrbNumber(assignedOrb);
          setPlayerName(res.data.name !== assignedGuestId ? res.data.name : '');
          if (res.data.avatar) {
            const num = parseInt(String(res.data.avatar).replace(/\D/g, ''), 10);
            setSelectedAvatar(num >= 1 && num <= 30 ? String(num) : '1');
          }
          if (res.data.team) setSelectedTeam(res.data.team);
        }
      } catch (err) {
        console.warn('[Onboarding] Fallback to local guest ID:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initGuest();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnterArena = async (e) => {
    if (e) e.preventDefault();
    if (isEntering) return;

    try {
      setIsEntering(true);
      setErrorMessage('');

      const displayName = playerName.trim() || guestId;

      // Update name and avatar in PostgreSQL
      const res = await claimOrRegisterGuest({
        name: displayName,
        avatar: selectedAvatar,
        team: selectedTeam,
      });

      const finalPlayer = res.success && res.data ? res.data : {
        guest_id: guestId,
        orb_number: orbNumber,
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
        <div className="flex flex-col items-center text-center mb-6">
          <Logo className="w-20 h-20 sm:w-20 sm:h-20 mb-3" />
          <h1 className="font-arena text-[36px] sm:text-[40px] font-black tracking-wider text-zinc-900">
            ARENA
          </h1>
        </div>

        {/* Neumorphic Main Onboarding Card */}
        <div className="bg-[#ebedf2] border border-slate-300/60 rounded-[2.5rem] p-7 sm:p-9 shadow-[inset_8px_8px_20px_#ffffff,inset_-8px_-8px_20px_#c5ccd6]">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <CircleNotch size={32} className="animate-spin text-emerald-600" />
              <p className="text-xs font-semibold text-zinc-600">Assigning Player Orb...</p>
            </div>
          ) : (
            <form onSubmit={handleEnterArena} className="space-y-6">
              {/* The Ethereal ChatGPT-Style Player Orb */}
              <div className="flex flex-col items-center justify-center pt-2">
                <ChatGPTOrb
                  orbNumber={orbNumber}
                  avatar={selectedAvatar}
                  size="w-32 h-32"
                />

                <div className="mt-4 text-center">
                  <span
                    className="font-arena inline-block px-3.5 py-1 rounded-full bg-gradient-to-r from-white to-zinc-200 border border-white text-zinc-600 text-[13.5px] tracking-wider shadow-sm"
                    style={{ WebkitTextStroke: '0.5px' }}
                  >
                    {guestId}
                  </span>
                  <p className="text-[12px] text-zinc-500/80 mt-1">
                    Your assigned player identity on venue network
                  </p>
                </div>
              </div>

              {/* Player Handle Input */}
              <div className="space-y-1.5">
                <label className="text-[14px] font-bold tracking-wider text-zinc-500 pl-1 flex items-center gap-1.5">
                  <User size={15} weight="bold" className="text-zinc-500" />
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={guestId}
                    maxLength={20}
                    className="w-full py-3.5 px-4 bg-[#F2F7FC] text-zinc-900 font-semibold text-sm rounded-3xl border border-transparent shadow-[inset_3px_3px_6px_#c8d0db,inset_-3px_-3px_6px_#ffffff] outline-none focus:outline-none focus:border-zinc-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 transition-colors duration-150 placeholder:text-zinc-400"
                    style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  />
                </div>
              </div>

              {/* Curated Lorelei Avatar Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[14px] font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Sparkle size={15} weight="bold" className="text-zinc-500" />
                    Choose Avatar
                  </label>
                  <span className="text-[11px] font-semibold text-zinc-500 font-mono">
                    {CURATED_AVATARS.length} Curated
                  </span>
                </div>

                <div className="p-2.5 bg-[#F2F7FC] rounded-2xl shadow-[inset_2px_2px_5px_#c8d0db,inset_-2px_-2px_5px_#ffffff]">
                  <div className="grid grid-cols-6 gap-2 max-h-[160px] overflow-y-auto p-1 pr-1.5 scrollbar-thin">
                    {CURATED_AVATARS.map((av) => {
                      const isSelected = String(selectedAvatar) === String(av.id) || String(selectedAvatar) === String(av.num);
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setSelectedAvatar(av.id)}
                          className={`relative flex items-center justify-center p-0.5 rounded-full transition-all duration-150 cursor-pointer ${isSelected
                              ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-[#e6ebf2] scale-110 shadow-md z-10'
                              : 'opacity-80 hover:opacity-100 hover:scale-105 active:scale-95'
                            }`}
                        >
                          <ArenaAvatar id={av.id} size="sm" className="w-10 h-10 shadow-sm" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs font-medium text-rose-600 text-center bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  {errorMessage}
                </p>
              )}

              {/* Enter Arena CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isEntering}
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
