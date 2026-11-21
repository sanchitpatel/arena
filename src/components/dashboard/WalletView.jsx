import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Wallet } from '../icons';
import ArenaAvatar from '../avatars/ArenaAvatar';
import ChatGPTOrb from './ChatGPTOrb';
import PlayerQRBadge from '../qr/PlayerQRBadge';
import { fetchLeaderboard, subscribeToLeaderboard } from '../../services/arenaService';
import { fetchPlayerWalletStats, subscribeToPlayerWallet } from '../../services/walletService';
import { getPlayerId, getPlayerUuid, getOrbNumber, getStoredOrbNumber } from '../../utils/playerId';

export const WalletView = ({ player, onNavigate }) => {
  const guestId = player?.guest_id || getPlayerId() || null;
  const orbNumber = player?.orb_number || (guestId ? getOrbNumber(guestId) : null) || getStoredOrbNumber() || '?';

  const [players, setPlayers] = useState([]);
  const [walletStats, setWalletStats] = useState({
    points: player?.total_score || 0,
    rank: 1,
    ideas_submitted: 0,
    votes_received: 0,
    challenges_completed: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleCloseQrModal = () => setQrModalOpen(false);
  const handleOpenScanner = () => {
    setQrModalOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('arena:open-scanner'));
    }
  };

  // Synchronize player stats with local user data and real PostgreSQL wallet stats
  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      const myId = player?.id || getPlayerUuid();
      if (!myId) return;
      const res = await fetchPlayerWalletStats(myId);
      if (isMounted && res?.success && res.data) {
        setWalletStats(res.data);
      }
    };

    loadStats();
    const unsub = subscribeToPlayerWallet(player?.id, () => {
      loadStats();
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [player?.id]);

  const userPoints = useMemo(() => {
    if (walletStats?.points !== undefined && walletStats.points !== null) {
      return Number(walletStats.points);
    }
    if (player?.total_score !== undefined && player?.total_score !== null) {
      return Number(player.total_score);
    }
    return 0;
  }, [walletStats?.points, player?.total_score]);

  const userAvatar = useMemo(() => {
    return player?.avatar ? String(player.avatar) : '6';
  }, [player?.avatar]);

  // Fetch real Postgres leaderboard
  useEffect(() => {
    let isMounted = true;
    const loadStandings = async () => {
      try {
        const res = await fetchLeaderboard(25);
        const live = Array.isArray(res) ? res : (res?.data || []);
        if (isMounted && live.length > 0) {
          const myGid = player?.guest_id || getPlayerId();
          const myUid = player?.id || getPlayerUuid();

          // Merge real DB players
          const formatted = live.map((p, idx) => ({
            id: p.id || String(idx + 1),
            rank: idx + 1,
            name: p.name || p.guest_id || `Guest ${idx + 1}`,
            points: Number(p.total_score || 0),
            avatar: p.avatar || String((idx % 30) + 1),
            isYou: Boolean((myGid && p.guest_id === myGid) || (myUid && p.id === myUid)),
          }));

          setPlayers(formatted);
        }
      } catch (err) {
        console.warn('[WalletView] Leaderboard fetch error:', err);
      }
    };

    loadStandings();

    const unsubscribe = subscribeToLeaderboard(() => {
      loadStandings();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [player?.guest_id, player?.id]);

  // Partition top 3 podium vs rest
  const rank1 = players[0] || { rank: 1, name: 'Arena Leader', points: 0, avatar: '18', isYou: false };
  const rank2 = players[1] || { rank: 2, name: 'Contender', points: 0, avatar: '1', isYou: false };
  const rank3 = players[2] || { rank: 3, name: 'Challenger', points: 0, avatar: '3', isYou: false };
  const listPlayers = players.slice(3, 10);

  // If current user is outside top 3 and not in top list, add "You" at the bottom with real rank
  const userInTopList = players.slice(0, 10).some((p) => p.isYou);
  const displayList = [...listPlayers];
  if (!userInTopList && walletStats.rank > 3) {
    displayList.push({
      id: 'you',
      rank: walletStats.rank,
      name: 'You',
      points: userPoints,
      avatar: userAvatar,
      isYou: true,
    });
  }

  return (
    <div className="w-full max-w-[430px] mx-auto px-4 sm:px-2 pt-2 pb-24 space-y-4 select-none font-sans">
      {/* ========================================================
          1. HEADER: "My Wallet" with Standard Wallet Badge
          ======================================================== */}
      <div className="flex items-center gap-3 pt-1">
        {/* Circular Wallet Badge */}
        <div className="w-12 h-12 rounded-full bg-white/90 border border-sky-200/90 shadow-[0_4px_16px_rgba(2,110,220,0.12),inset_0_2px_4px_#ffffff] flex items-center justify-center shrink-0">
          <Wallet size={24} weight="fill" className="text-sky-600" />
        </div>

        <div>
          <h1 className="text-[23px] sm:text-[25px] font-black text-slate-900 tracking-tight leading-tight">
            My Wallet
          </h1>
          <p className="text-[12.5px] sm:text-[13px] text-slate-500 font-medium leading-tight">
            Your points, rewards, and leaderboard standing.
          </p>
        </div>
      </div>

      {/* ========================================================
          2. MAIN CARD: Points 3D Orb + Quick Stats List
          ======================================================== */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-[2.2rem] p-4 sm:p-5 shadow-[0_16px_36px_rgba(180,200,225,0.38),inset_0_2px_4px_#ffffff] flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Authentic ChatGPT-Style Player Orb from Profile page */}
        <div className="shrink-0 flex items-center justify-center py-1 pl-1">
          <ChatGPTOrb
            orbNumber={userPoints.toLocaleString()}
            avatar={userAvatar}
            badge="qr"
            onBadgeClick={() => setQrModalOpen(true)}
            onOrbClick={() => setQrModalOpen(true)}
            size="w-28 h-28 sm:w-28 sm:h-28"
            numberSize="text-[24px] sm:text-[27px]"
            label="POINTS"
          />
        </div>

        {/* Right: Quick Stats List (Ideas, Votes, Challenges) */}
        <div className="flex-1 flex flex-col justify-center space-y-2 sm:space-y-2.5 pl-1 sm:pl-2">
          {/* Row 1: Ideas Submitted */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800 shrink-0">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span className="text-[12.5px] sm:text-[13px] font-bold text-slate-800 truncate">
                Ideas Submitted
              </span>
            </div>
            <span className="text-[15px] sm:text-[16px] font-black text-slate-900 ml-2">
              {walletStats.ideas_submitted}
            </span>
          </div>

          <div className="h-[1px] bg-sky-100/90 w-full" />

          {/* Row 2: Votes Received */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800 shrink-0">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span className="text-[12.5px] sm:text-[13px] font-bold text-slate-800 truncate">
                Votes Received
              </span>
            </div>
            <span className="text-[15px] sm:text-[16px] font-black text-slate-900 ml-2">
              {walletStats.votes_received}
            </span>
          </div>

          <div className="h-[1px] bg-sky-100/90 w-full" />

          {/* Row 3: Challenges Completed */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800 shrink-0">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              <span className="text-[12.5px] sm:text-[13px] font-bold text-slate-800 truncate">
                Challenges Completed
              </span>
            </div>
            <span className="text-[15px] sm:text-[16px] font-black text-slate-900 ml-2">
              {walletStats.challenges_completed}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. LEADERBOARD CARD & PODIUM
          ======================================================== */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-[2.2rem] p-4 sm:p-5 shadow-[0_16px_36px_rgba(180,200,225,0.38),inset_0_2px_4px_#ffffff] space-y-4">
          {/* Top 3 Podium (Rank 2 Silver | Rank 1 Gold | Rank 3 Bronze) */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2 items-end pt-2 pb-1">
            {/* ---------------- Rank 2 (Dr. Arjun Mehta - Silver) ---------------- */}
            <div className="flex flex-col items-center">
              {/* Silver Metallic Frame Container */}
              <div className="relative w-[102px] h-[125px] sm:w-[112px] sm:h-[137px] flex items-center justify-center shrink-0">
                {/* Circular Avatar placed in the clear aperture */}
                <div className="absolute left-1/2 top-[52.3%] -translate-x-1/2 -translate-y-1/2 w-[57px] h-[57px] sm:w-[63px] sm:h-[63px] rounded-full overflow-hidden bg-white shadow-inner flex items-center justify-center z-0">
                  <ArenaAvatar id={rank2.avatar} size="badge" className="w-full h-full object-cover" />
                </div>
                {/* Silver SVG Metallic Frame Overlay */}
                <img
                  src="/silver.svg"
                  alt="Rank 2 Frame"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 drop-shadow-md select-none"
                />
              </div>

              {/* Pedestal Block 2 */}
              <div className="w-full -mt-4 sm:-mt-5 bg-gradient-to-b from-[#f1f6fc] via-[#e4eff9] to-[#d6e6f5] rounded-2xl p-2 pt-5 sm:pt-5.5 text-center border border-slate-200/90 shadow-[0_4px_14px_rgba(100,116,139,0.08)] min-h-[84px] sm:min-h-[90px] flex flex-col justify-center">
                <span className="text-[11.5px] sm:text-[12px] font-black text-slate-900 leading-tight truncate px-0.5">
                  {rank2.name}
                </span>
                <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-600 mt-0.5">
                  {rank2.points.toLocaleString()} PTS
                </span>
              </div>
            </div>

            {/* ---------------- Rank 1 (Dr. Elena Vance - Gold) ---------------- */}
            <div className="flex flex-col items-center">
              {/* Golden Metallic Frame Container */}
              <div className="relative w-[136px] h-[125px] sm:w-[148px] sm:h-[136px] flex items-center justify-center shrink-0">
                {/* Circular Avatar placed in the clear aperture */}
                <div className="absolute left-1/2 top-[52.3%] -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] sm:w-[65px] sm:h-[65px] rounded-full overflow-hidden bg-white shadow-inner flex items-center justify-center z-0">
                  <ArenaAvatar id={rank1.avatar} size="badge" className="w-full h-full object-cover" />
                </div>
                {/* Golden SVG Metallic Frame Overlay */}
                <img
                  src="/golden.svg"
                  alt="Rank 1 Frame"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 drop-shadow-lg select-none"
                />
              </div>

              {/* Pedestal Block 1 (Elevated) */}
              <div className="w-full -mt-4 sm:-mt-5 bg-gradient-to-b from-[#fef8e7] via-[#fdeec4] to-[#fce4a6] rounded-2xl p-2 pt-5 sm:pt-6 text-center border border-amber-200/90 shadow-[0_6px_18px_rgba(245,158,11,0.14)] min-h-[98px] sm:min-h-[106px] flex flex-col justify-center">
                <span className="text-[12px] sm:text-[12.5px] font-black text-slate-950 leading-tight truncate px-0.5">
                  {rank1.name}
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-black text-amber-950 mt-0.5">
                  {rank1.points.toLocaleString()} PTS
                </span>
              </div>
            </div>

            {/* ---------------- Rank 3 (Rohan Desai - Bronze) ---------------- */}
            <div className="flex flex-col items-center">
              {/* Bronze Metallic Frame Container */}
              <div className="relative w-[102px] h-[125px] sm:w-[112px] sm:h-[137px] flex items-center justify-center shrink-0">
                {/* Circular Avatar placed in the clear aperture */}
                <div className="absolute left-1/2 top-[52.3%] -translate-x-1/2 -translate-y-1/2 w-[57px] h-[57px] sm:w-[63px] sm:h-[63px] rounded-full overflow-hidden bg-white shadow-inner flex items-center justify-center z-0">
                  <ArenaAvatar id={rank3.avatar} size="badge" className="w-full h-full object-cover" />
                </div>
                {/* Bronze SVG Metallic Frame Overlay */}
                <img
                  src="/bronze.svg"
                  alt="Rank 3 Frame"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 drop-shadow-md select-none"
                />
              </div>

              {/* Pedestal Block 3 */}
              <div className="w-full -mt-4 sm:-mt-5 bg-gradient-to-b from-[#fdf4f0] via-[#fae6de] to-[#f6d7cc] rounded-2xl p-2 pt-5 sm:pt-5.5 text-center border border-amber-200/60 shadow-[0_4px_14px_rgba(197,110,75,0.08)] min-h-[78px] sm:min-h-[84px] flex flex-col justify-center">
                <span className="text-[11.5px] sm:text-[12px] font-black text-slate-900 leading-tight truncate px-0.5">
                  {rank3.name}
                </span>
                <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-600 mt-0.5">
                  {rank3.points.toLocaleString()} PTS
                </span>
              </div>
            </div>
          </div>

          {/* ---------------- Rankings List: Rank 4 to 10 ---------------- */}
          <div className="space-y-2 pt-1">
            {displayList.map((item) => {
              const isUserRow = item.isYou;

              return (
                <div
                  key={`${item.id || 'rank'}-${item.rank}`}
                  className={`rounded-2xl p-2.5 px-3.5 sm:px-4 flex items-center justify-between transition-all duration-150 ${
                    isUserRow
                      ? 'bg-[#dbeafe]/95 border border-sky-300/90 shadow-[0_4px_16px_rgba(56,189,248,0.22)]'
                      : 'bg-white/70 hover:bg-white/90 border border-white/90 shadow-sm'
                  }`}
                >
                  {/* Left: Rank + Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-[13.5px] sm:text-[14px] font-black w-4 text-center shrink-0 ${
                        isUserRow ? 'text-blue-600' : 'text-slate-800'
                      }`}
                    >
                      {item.rank}
                    </span>

                    <div className="w-9 h-9 rounded-full bg-white border border-slate-200/80 shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
                      <ArenaAvatar id={item.avatar} size="badge" className="w-full h-full" />
                    </div>

                    <span
                      className={`text-[13px] sm:text-[13.5px] truncate font-bold ${
                        isUserRow ? 'text-slate-950 font-black' : 'text-slate-900'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>

                  {/* Right: Points */}
                  <span
                    className={`text-[13px] sm:text-[13.5px] font-black shrink-0 ml-2 ${
                      isUserRow ? 'text-blue-600' : 'text-slate-800'
                    }`}
                  >
                    {item.points.toLocaleString()} PTS
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      {/* ========================================================
          3. PLAYER QR BADGE POP-UP MODAL (Triggered via Orb QR Icon)
          ======================================================== */}
      {qrModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={handleCloseQrModal}
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] w-screen h-screen min-h-screen bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div onClick={(e) => e.stopPropagation()} className="cursor-default">
            <PlayerQRBadge
              playerId={guestId}
              playerName={player?.name || guestId}
              orbNumber={orbNumber}
              avatar={userAvatar}
              onClose={handleCloseQrModal}
              onOpenScanner={handleOpenScanner}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WalletView;
