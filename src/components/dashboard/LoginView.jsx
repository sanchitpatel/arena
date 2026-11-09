import React, { useState, useEffect } from 'react';
import { claimOrRegisterGuest } from '../../services/arenaService';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';
import { CircleNotch, ArrowRight, Sparkle, User, ShieldCheck } from '../icons';
import Logo from '../Logo';

const AVATAR_OPTIONS = ['⚡', '🔥', '🚀', '👑', '🎯', '💎', '👾', '🌟'];

export const LoginView = ({ onEnterArena }) => {
  const [guestId, setGuestId] = useState(() => getPlayerId() || 'Guest001');
  const [orbNumber, setOrbNumber] = useState(() => getOrbNumber(guestId) || 1);
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('⚡');
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
          if (res.data.avatar) setSelectedAvatar(res.data.avatar);
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
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[430px] relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo className="w-20 h-20 sm:w-20 sm:h-20 mb-3" />
          <h1 className="font-arena text-[36px] sm:text-[40px] font-black tracking-wider text-zinc-900">
            ARENA
          </h1>
        </div>

        {/* Neumorphic Main Onboarding Card */}
        <div className="bg-[#e6ebf2] border border-slate-300/40 rounded-[2.5rem] p-7 sm:p-9 shadow-[inset_8px_8px_20px_#ffffff,inset_-8px_-8px_20px_#c5ccd6]">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <CircleNotch size={32} className="animate-spin text-emerald-600" />
              <p className="text-xs font-semibold text-zinc-600">Assigning Player Orb...</p>
            </div>
          ) : (
            <form onSubmit={handleEnterArena} className="space-y-6">
              {/* The Glowing Player Orb Badge */}
              <div className="flex flex-col items-center justify-center pt-1">
                <div className="relative group">
                  {/* Outer pulsating glow ring */}
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse" />
                  
                  {/* Main circular Orb */}
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-b from-[#18181b] to-[#09090b] text-white flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_20px_rgba(0,0,0,0.35)] border border-white/20">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                      ORB
                    </span>
                    <span className="text-3xl font-black tracking-tight font-mono text-white">
                      {orbNumber}
                    </span>
                  </div>

                  {/* Avatar badge on orb */}
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#e6ebf2] shadow-[2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff] border border-white flex items-center justify-center text-sm">
                    {selectedAvatar}
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-600/10 border border-emerald-600/25 text-emerald-800 font-mono text-xs font-bold tracking-wider">
                    {guestId}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Your assigned player identity on venue network
                  </p>
                </div>
              </div>

              {/* Player Handle Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 pl-1 flex items-center gap-1.5">
                  <User size={13} weight="bold" className="text-emerald-700" />
                  Player Handle (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={guestId}
                    maxLength={20}
                    className="w-full py-3.5 px-4 bg-[#e6ebf2] text-zinc-900 font-semibold text-sm rounded-2xl border border-transparent shadow-[inset_3px_3px_6px_#c8d0db,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:border-emerald-600/50 transition-all placeholder:text-zinc-400"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 pl-1 flex items-center gap-1.5">
                  <Sparkle size={13} weight="bold" className="text-emerald-700" />
                  Choose Emblem
                </label>
                <div className="flex items-center justify-between gap-1 p-1.5 bg-[#e6ebf2] rounded-2xl shadow-[inset_2px_2px_5px_#c8d0db,inset_-2px_-2px_5px_#ffffff]">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-150 cursor-pointer ${
                        selectedAvatar === emoji
                          ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-[2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff] scale-110'
                          : 'hover:bg-black/5 text-zinc-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs font-medium text-rose-600 text-center bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  {errorMessage}
                </p>
              )}

              {/* Enter Arena CTA Button */}
              <button
                type="submit"
                disabled={isEntering}
                className="w-full py-4 px-6 bg-gradient-to-r from-zinc-900 to-black hover:from-black hover:to-zinc-950 text-white font-bold text-sm tracking-wide uppercase rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.35)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border border-zinc-700/50 group"
              >
                {isEntering ? (
                  <>
                    <CircleNotch size={18} className="animate-spin" />
                    <span>Entering Arena...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Arena</span>
                    <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 pt-1">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span>Instant Wi-Fi Guest Onboarding — Zero Password Required</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginView;
