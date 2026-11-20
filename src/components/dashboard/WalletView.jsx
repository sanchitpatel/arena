import React, { useState, useEffect, useMemo } from 'react';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { fetchLeaderboard, subscribeToLeaderboard } from '../../services/arenaService';
import { getPlayerId, getOrbNumber, getStoredOrbNumber } from '../../utils/playerId';

/**
 * 3D Isometric Stacked Coins Icon
 * Replicating the authentic blue coin stack on the "My Wallet" badge and inside the points orb.
 */
function StackedCoinsIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bottom Coin */}
      <ellipse cx="16" cy="22" rx="10" ry="3.8" fill="#0284c7" />
      <path d="M6 22v3c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8v-3c0 2.1-4.5 3.8-10 3.8S6 24.1 6 22z" fill="#0369a1" />
      <ellipse cx="16" cy="22" rx="9" ry="3" fill="#38bdf8" />

      {/* Middle Coin */}
      <ellipse cx="16" cy="15" rx="10" ry="3.8" fill="#0284c7" />
      <path d="M6 15v3c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8v-3c0 2.1-4.5 3.8-10 3.8S6 17.1 6 15z" fill="#0369a1" />
      <ellipse cx="16" cy="15" rx="9" ry="3" fill="#38bdf8" />

      {/* Top Coin */}
      <ellipse cx="16" cy="8" rx="10" ry="3.8" fill="#0284c7" />
      <path d="M6 8v3c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8v-3c0 2.1-4.5 3.8-10 3.8S6 10.1 6 8z" fill="#0369a1" />
      <ellipse cx="16" cy="8" rx="9" ry="3" fill="#7dd3fc" />
      <ellipse cx="16" cy="8" rx="6.5" ry="2" fill="#e0f2fe" opacity="0.8" />
    </svg>
  );
}

/**
 * Authentic Mock Leaderboard Data matching public/wallet.png
 */
const DEFAULT_TOP_PLAYERS = [
  { id: '1', rank: 1, name: 'Dr. Elena Vance', points: 5420, avatar: '18', isYou: false },
  { id: '2', rank: 2, name: 'Dr. Arjun Mehta', points: 4980, avatar: '1', isYou: false },
  { id: '3', rank: 3, name: 'Rohan Desai', points: 4610, avatar: '3', isYou: false },
  { id: '4', rank: 4, name: 'Dr. Karan Shah', points: 4200, avatar: '4', isYou: false },
  { id: '5', rank: 5, name: 'Dr. Priya Nair', points: 3980, avatar: '5', isYou: false },
  { id: '6', rank: 6, name: 'You', points: 2840, avatar: '6', isYou: true },
  { id: '7', rank: 7, name: 'Aditi Kulkarni', points: 2720, avatar: '7', isYou: false },
];

export const WalletView = ({ player, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'activity'
  const [players, setPlayers] = useState(DEFAULT_TOP_PLAYERS);
  const [isLoading, setIsLoading] = useState(false);

  // Synchronize player stats with local user data
  const userPoints = useMemo(() => {
    if (player?.total_score && Number(player.total_score) > 0) {
      return Number(player.total_score);
    }
    return 2840;
  }, [player?.total_score]);

  const userAvatar = useMemo(() => {
    return player?.avatar ? String(player.avatar) : '6';
  }, [player?.avatar]);

  // Fetch real Postgres leaderboard if active
  useEffect(() => {
    let isMounted = true;
    const loadStandings = async () => {
      try {
        const live = await fetchLeaderboard(15);
        if (isMounted && live && live.length > 0) {
          // Merge real DB players while preserving the visual replica structure
          const formatted = live.map((p, idx) => ({
            id: p.id || String(idx + 1),
            rank: idx + 1,
            name: p.name || p.guest_id || `Guest ${idx + 1}`,
            points: p.total_score || 0,
            avatar: p.avatar || String((idx % 30) + 1),
            isYou: p.guest_id === player?.guest_id,
          }));

          // If current user is not in top 3, ensure their rank appears as highlighted "You"
          const hasUser = formatted.some((p) => p.isYou);
          if (!hasUser && formatted.length >= 5) {
            formatted[5] = {
              id: 'you',
              rank: 6,
              name: 'You',
              points: userPoints,
              avatar: userAvatar,
              isYou: true,
            };
          }

          setPlayers(formatted.slice(0, 7));
        }
      } catch (err) {
        console.warn('[WalletView] Using mock replica leaderboard standings:', err);
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
  }, [player?.guest_id, userPoints, userAvatar]);

  // Partition top 3 podium vs rest
  const rank1 = players.find((p) => p.rank === 1) || DEFAULT_TOP_PLAYERS[0];
  const rank2 = players.find((p) => p.rank === 2) || DEFAULT_TOP_PLAYERS[1];
  const rank3 = players.find((p) => p.rank === 3) || DEFAULT_TOP_PLAYERS[2];
  const listPlayers = players.filter((p) => p.rank > 3);

  return (
    <div className="w-full max-w-[430px] mx-auto px-4 sm:px-2 pt-2 pb-24 space-y-4 select-none font-sans">
      {/* ========================================================
          1. HEADER: "My Wallet" with Stacked Coins Badge
          ======================================================== */}
      <div className="flex items-center gap-3 pt-1">
        {/* Circular Blue Coin Badge */}
        <div className="w-12 h-12 rounded-full bg-white/90 border border-sky-200/90 shadow-[0_4px_16px_rgba(2,110,220,0.12),inset_0_2px_4px_#ffffff] flex items-center justify-center shrink-0">
          <StackedCoinsIcon size={26} />
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
        {/* Left: Glowing 3D Celestial Points Orb */}
        <div className="relative w-[138px] h-[138px] sm:w-[152px] sm:h-[152px] shrink-0 flex items-center justify-center">
          {/* Ambient Blue Halo */}
          <div className="absolute inset-0 rounded-full bg-sky-400/40 blur-xl pointer-events-none" />

          {/* Volumetric Spherical Glass Body */}
          <div
            className="relative w-full h-full rounded-full flex flex-col items-center justify-center text-center overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #d2ecff 24%, #6ec2ff 54%, #1c86ff 84%, #0284c7 100%)',
              boxShadow: 'inset -8px -8px 18px rgba(2, 110, 220, 0.38), inset 6px 6px 14px rgba(255, 255, 255, 0.9), 0 10px 24px rgba(2, 110, 220, 0.28)',
            }}
          >
            {/* 3D Specular Curvature Glint */}
            <div className="absolute top-[12%] left-[16%] w-[34%] h-[22%] rounded-full bg-gradient-to-br from-white/95 via-white/30 to-transparent blur-[1.5px] -rotate-12 pointer-events-none" />

            {/* Inner Content */}
            <span className="text-[11.5px] sm:text-[12px] font-bold text-sky-950/85 tracking-tight -mt-0.5">
              My Points
            </span>
            <span className="text-[25px] sm:text-[28px] font-black text-slate-900 tracking-tight leading-none mt-0.5">
              {userPoints.toLocaleString()}
            </span>
            <div className="mt-1">
              <StackedCoinsIcon size={20} />
            </div>
          </div>
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
              3
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
              128
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
              5
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. SEGMENTED TAB SWITCHER: [ Leaderboard | My Activity ]
          ======================================================== */}
      <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-full border border-white/90 shadow-[0_4px_16px_rgba(197,204,214,0.3)] flex items-center gap-1">
        {/* Leaderboard Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2.5 sm:py-3 rounded-full flex items-center justify-center gap-2 text-[13px] sm:text-[14px] font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-[#0f172a] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1 .45-1 1v3h12v-3c0-.55-.45-1-1-1h-2c-.55 0-1-.45-1-1v-2.34" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <span>Leaderboard</span>
        </button>

        {/* My Activity Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-2.5 sm:py-3 rounded-full flex items-center justify-center gap-2 text-[13px] sm:text-[14px] font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-[#0f172a] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>My Activity</span>
        </button>
      </div>

      {/* ========================================================
          4. LEADERBOARD CARD & PODIUM
          ======================================================== */}
      {activeTab === 'leaderboard' ? (
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

          {/* ---------------- Rankings List: Rank 4 to 7 ---------------- */}
          <div className="space-y-2 pt-1">
            {listPlayers.map((item) => {
              const isUserRow = item.isYou;

              return (
                <div
                  key={item.rank}
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
      ) : (
        /* ========================================================
            5. MY ACTIVITY TAB (Detailed Player Achievements View)
            ======================================================== */
        <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-[2.2rem] p-4 sm:p-5 shadow-[0_16px_36px_rgba(180,200,225,0.38),inset_0_2px_4px_#ffffff] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <h3 className="font-black text-slate-900 text-sm tracking-tight">
              Recent Points Activity
            </h3>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
              Live Feed
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="bg-white/70 p-3 rounded-2xl border border-white/90 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Lab Quest 3 Completed</p>
                  <p className="text-[10.5px] text-slate-500">Floorplan Gem Scan</p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-600">+500 PTS</span>
            </div>

            <div className="bg-white/70 p-3 rounded-2xl border border-white/90 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  ★
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Innovation Idea Voted</p>
                  <p className="text-[10.5px] text-slate-500">Pitch Wall community vote</p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-600">+100 PTS</span>
            </div>

            <div className="bg-white/70 p-3 rounded-2xl border border-white/90 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  ⚡
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Speed Quiz Round 1</p>
                  <p className="text-[10.5px] text-slate-500">Correct rapid response</p>
                </div>
              </div>
              <span className="text-xs font-black text-blue-600">+1,200 PTS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletView;
