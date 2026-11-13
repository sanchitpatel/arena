import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserCirclePlus, UserList, SquaresFour, SignOut, UserCircle, CalendarCheck, CaretUp, Bell, QrCode, Scan, X, ArenaMapIcon, CurrencyCircleDollar } from '../icons';
import Logo from '../Logo';
import ArenaAvatar from '../avatars/ArenaAvatar';
import PlayerQRBadge from '../qr/PlayerQRBadge';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';
import {
  getPendingNotificationCount,
  subscribeToClinicRealtime
} from '../../services/clinicService';

export const DashboardShell = ({
  activeTab,
  onTabChange,
  player,
  onSignOut,
  children
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [qrModalOpen, setQrModalOpen] = useState(null); // 'badge' | null
  const profileRef = useRef(null);
  const mobileProfileRef = useRef(null);
  const mobileProfileBtnRef = useRef(null);

  // Player identity fallback resolution
  const guestId = player?.guest_id || getPlayerId() || 'Guest001';
  const orbNumber = player?.orb_number || getOrbNumber(guestId) || 1;
  const displayName = player?.name || guestId;
  const avatar = player?.avatar || '1';

  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      const res = await getPendingNotificationCount();
      if (isMounted && res.success) {
        setPendingCount(res.count);
      }
    };
    fetchCount();

    const unsubscribe = subscribeToClinicRealtime(() => {
      fetchCount();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (
        mobileProfileRef.current &&
        !mobileProfileRef.current.contains(event.target) &&
        mobileProfileBtnRef.current &&
        !mobileProfileBtnRef.current.contains(event.target)
      ) {
        setMobileProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close QR/Scanner modal on Escape key press
  useEffect(() => {
    if (!qrModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setQrModalOpen(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [qrModalOpen]);

  // Listen for global custom events to open Scanner or QR Badge modal
  useEffect(() => {
    const handleOpenScanner = () => {
      setQrModalOpen(null);
      if (typeof onTabChange === 'function') {
        onTabChange('scanner');
      }
    };
    const handleOpenBadge = () => setQrModalOpen('badge');
    const handleOpenMap = () => {
      setQrModalOpen(null);
      if (typeof onTabChange === 'function') {
        onTabChange('map');
      }
    };
    window.addEventListener('arena:open-scanner', handleOpenScanner);
    window.addEventListener('arena:open-badge', handleOpenBadge);
    window.addEventListener('arena:open-map', handleOpenMap);
    return () => {
      window.removeEventListener('arena:open-scanner', handleOpenScanner);
      window.removeEventListener('arena:open-badge', handleOpenBadge);
      window.removeEventListener('arena:open-map', handleOpenMap);
    };
  }, [onTabChange]);

  const handleSignOutClick = () => {
    setProfileMenuOpen(false);
    setMobileProfileOpen(false);
    if (typeof onSignOut === 'function') {
      onSignOut();
    }
  };

  const navItems = [
    {
      id: 'new-patient',
      label: 'New Patient',
      icon: UserCirclePlus,
      description: 'Register new patient',
    },
    {
      id: 'existing-patient',
      label: 'Existing Patient',
      icon: UserList,
      description: 'Search records',
    },
    {
      id: 'scanner',
      label: 'Scan QR',
      icon: Scan,
      description: 'QR scanner & battle duels',
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: SquaresFour,
      description: 'Daily queues & statistics',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: UserCircle,
      description: 'Player identity & avatar',
    },
    {
      id: 'map',
      label: '2D Map',
      icon: ArenaMapIcon,
      description: 'Lab floorplan & gem quests',
    },
    {
      id: 'notifications',
      label: 'Notification',
      icon: Bell,
      description: 'WhatsApp reminders',
      badge: pendingCount,
    },
  ];

  return (
    <div className="h-screen w-full bg-[#f0f2f5] text-zinc-800 flex flex-col md:flex-row font-sans selection:bg-sky-200 selection:text-zinc-900 overflow-hidden">

      {/* ========================================================
          1. DESKTOP SIDEBAR (Soft Slate Neumorphic Theme)
          ======================================================== */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 bg-[#ebedf2] border-r border-slate-300/60 shrink-0 h-full z-30 shadow-[4px_0_16px_#c8d0db]">

        {/* Arena Brand Header */}
        <div className="p-4 border-b border-zinc-300/50 flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-[#ebedf2] shadow-[3px_3px_6px_#c2c9d4,-3px_-3px_6px_#ffffff] border border-white/60 flex items-center justify-center overflow-hidden shrink-0">
            <Logo className="w-12 h-12" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-base font-black tracking-wider text-zinc-900 truncate font-arena">
              ARENA
            </h1>
            <p className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mt-0.5">
              Live Battleground
            </p>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left text-sm group cursor-pointer transition-colors duration-100 active:scale-[0.98] ${isActive
                  ? 'bg-[#ebedf2] text-zinc-900 shadow-[3px_3px_8px_#c6ced9,-3px_-3px_8px_#ffffff] border border-white font-bold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:shadow-[inset_3px_3px_6px_#c8d0db,inset_-3px_-3px_6px_#ffffff] font-medium border border-transparent'
                  }`}
              >
                <div className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 ${isActive
                  ? 'bg-gradient-to-b from-zinc-900 to-black text-white border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff]'
                  : 'bg-[#ebedf2] text-zinc-500 shadow-[inset_1px_1px_3px_#c8d0db,inset_-1px_-1px_3px_#ffffff] group-hover:text-zinc-900'
                  }`}>
                  <Icon size={24} weight={isActive ? 'bold' : 'duotone'} />
                </div>
                <div className="flex-1 min-w-0 truncate">
                  <div className="leading-tight truncate">{item.label}</div>
                  <div className="text-[11px] text-zinc-500 font-normal truncate mt-0.5">{item.description}</div>
                </div>
                {item.badge > 0 && (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30 shadow-[inset_1px_1px_2px_#ffffff]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Attendee / Guest Player Profile & Expandable Sign Out */}
        <div
          ref={profileRef}
          className="m-3 p-3 rounded-2xl bg-[#ebedf2] border border-white/80 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6] transition-all duration-300 ease-out"
        >
          {/* Header Row Trigger */}
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-white flex items-center justify-center overflow-hidden shrink-0">
              <ArenaAvatar id={avatar} size="badge" className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-zinc-900 truncate">
                {displayName}
              </div>
            </div>
            <div className="text-zinc-400 group-hover:text-zinc-600">
              <CaretUp size={14} weight="bold" className={`transition-transform duration-300 ease-out ${profileMenuOpen ? 'rotate-180 text-zinc-900' : ''}`} />
            </div>
          </button>

          {/* Smooth Connected Accordion Expansion for Sign Out */}
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${profileMenuOpen ? 'grid-rows-[1fr] opacity-100 mt-2.5 pt-2.5 border-t border-zinc-300/50' : 'grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t-0 border-transparent'
              }`}
          >
            <div className="overflow-hidden">
              <button
                type="button"
                onClick={handleSignOutClick}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-100/50 hover:bg-rose-100/80 shadow-[inset_2px_2px_4px_#ddb6b6,inset_-2px_-2px_4px_#ffffff] hover:shadow-[inset_3px_3px_5px_#ddb6b6,inset_-3px_-3px_5px_#ffffff] active:scale-[0.98] transition-all cursor-pointer border border-rose-300/60"
              >
                <SignOut size={15} weight="bold" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================
          2. MOBILE BOTTOM APP BAR (Native Mobile App Experience)
          ======================================================== */}
      {/* Mobile Profile Drop-up Popup Menu */}
      {mobileProfileOpen && (
        <div
          ref={mobileProfileRef}
          className="md:hidden fixed bottom-20 right-3 z-50 w-64 bg-[#ebedf2] border border-white/90 rounded-2xl p-4 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_8px_20px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out"
        >
          <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-zinc-300/60">
            <div className="w-10 h-10 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-white flex items-center justify-center overflow-hidden shrink-0">
              <ArenaAvatar id={avatar} size="badge" className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-zinc-900 truncate">
                {displayName}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOutClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-100/60 hover:bg-rose-100/90 shadow-[inset_2px_2px_4px_#ddb6b6,inset_-2px_-2px_4px_#ffffff] hover:shadow-[inset_3px_3px_5px_#ddb6b6,inset_-3px_-3px_5px_#ffffff] active:scale-[0.98] transition-all cursor-pointer border border-rose-300/60"
          >
            <SignOut size={15} weight="bold" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#ebedf2]/95 backdrop-blur-lg border-t border-slate-300/60 shadow-[0_-4px_20px_rgba(197,204,214,0.7)] px-1.5 py-1.5">
        <div className="flex items-end justify-between max-w-md mx-auto w-full">
          {navItems.filter((item) => item.id !== 'notifications' && item.id !== 'map').map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isCenterScanner = item.id === 'scanner';
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileProfileOpen(false);
                }}
                className={`flex-1 flex flex-col items-center justify-end py-0.5 px-0.5 rounded-2xl active:scale-95 transition-transform duration-100 ease-out cursor-pointer ${
                  isCenterScanner ? '-mt-1 sm:-mt-2.5' : ''
                } ${isActive
                    ? 'text-zinc-900 font-bold'
                    : 'text-zinc-500 font-medium hover:text-zinc-800'
                  }`}
              >
                <div className="relative">
                  <div
                    className={`${
                      isCenterScanner
                        ? 'p-2 rounded-xl mb-0.5'
                        : 'p-1.5 rounded-xl mb-0.5'
                    } ${isActive
                        ? 'bg-gradient-to-b from-zinc-900 to-black text-white border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff]'
                        : isCenterScanner
                          ? 'bg-[#ebedf2] shadow-[3px_3px_6px_#c2c9d4,-3px_-3px_6px_#ffffff] border border-white/80 text-zinc-600 hover:text-zinc-900'
                          : 'bg-[#ebedf2] shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] text-zinc-500 hover:text-zinc-900'
                      }`}
                  >
                    <Icon size={isCenterScanner ? 29 : 23} weight={isActive ? 'bold' : 'duotone'} />
                  </div>
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white font-extrabold text-[9px] flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`${isCenterScanner ? 'text-[10.5px] font-bold text-zinc-700' : 'text-[10px]'} tracking-tight truncate`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ========================================================
          3. MAIN CONTENT WORKSPACE
          ======================================================== */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#f0f2f5] overflow-y-scroll [scrollbar-gutter:stable] pb-20 md:pb-0">
        {/* ========================================================
            TOP TRANSPARENT APP BAR (Fixed height, zero jump / zero scale on click)
            ======================================================== */}
        <header className="sticky top-0 z-30 w-full bg-[#f0f2f5]/80 backdrop-blur-md border-none px-4 sm:px-6 py-1.5 flex items-center justify-between select-none">
          {/* Brand Name */}
          <span className="font-arena text-xl -ml-1 sm:text-lg font-black tracking-wider text-zinc-900 shrink-0">
            ARENA
          </span>

          {/* Top Actions: Notification on left, Prizes in middle, Map on rightmost end */}
          <div className="flex items-center gap-2 sm:gap-2">
            {/* Notification Option (Two-layer GPU opacity cross-fade: zero flicker, instant & butter-smooth) */}
            <button
              type="button"
              onClick={() => onTabChange('notifications')}
              title="WhatsApp Notifications"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl shrink-0 cursor-pointer select-none outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
            >
              {/* Default / Inactive State Layer (Fades out when active) */}
              <span
                className={`absolute inset-0 rounded-lg bg-[#ebedf2] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] transition-opacity duration-150 pointer-events-none ${
                  activeTab === 'notifications' ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* Active State Layer (Fades in when active) */}
              <span
                className={`absolute inset-0 rounded-lg bg-gradient-to-b from-zinc-900 to-black border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff] transition-opacity duration-150 pointer-events-none ${
                  activeTab === 'notifications' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Bell Icon (Smoothly transitions color on top) */}
              <Bell
                size={23}
                weight={activeTab === 'notifications' ? 'fill' : 'regular'}
                className={`relative z-10 transition-colors duration-150 ${
                  activeTab === 'notifications' ? 'text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              />

              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 z-20 min-w-[15px] h-3.5 px-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[8.5px] flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>

            {/* Prizes / Dollar Option (Two-layer GPU opacity cross-fade: zero flicker, instant & butter-smooth) */}
            <button
              type="button"
              onClick={() => {
                if (typeof onTabChange === 'function') onTabChange('prizes');
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('arena:open-prizes'));
              }}
              title="Prizes"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl shrink-0 cursor-pointer select-none outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
            >
              {/* Default / Inactive State Layer (Fades out when active) */}
              <span
                className={`absolute inset-0 rounded-lg bg-[#ebedf2] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] transition-opacity duration-150 pointer-events-none ${
                  activeTab === 'prizes' ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* Active State Layer (Fades in when active) */}
              <span
                className={`absolute inset-0 rounded-lg bg-gradient-to-b from-zinc-900 to-black border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff] transition-opacity duration-150 pointer-events-none ${
                  activeTab === 'prizes' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* CurrencyCircleDollar Icon (Smoothly transitions color on top) */}
              <CurrencyCircleDollar
                size={25}
                weight={activeTab === 'prizes' ? 'fill' : 'regular'}
                className={`relative z-10 transition-colors duration-150 ${
                  activeTab === 'prizes' ? 'text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              />
            </button>

            {/* Map Icon on the Rightmost End (Two-layer GPU opacity cross-fade: zero flicker, instant & butter-smooth) */}
            <button
              type="button"
              onClick={() => {
                if (typeof onTabChange === 'function') onTabChange('map');
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('arena:open-map'));
              }}
              title="Tactical Map"
              className="relative w-10 h-9 flex items-center justify-center rounded-xl shrink-0 cursor-pointer select-none outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
            >
              {/* Default / Inactive State Layer (Fades out when active) */}
              <span
                className={`absolute inset-0 rounded-lg bg-[#ebedf2] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] transition-opacity duration-150 pointer-events-none ${
                  activeTab === 'map' ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* Active State Layer (Fades in when active) */}
              <span
                className={`absolute inset-0 rounded-lg bg-gradient-to-b from-zinc-900 to-black border border-zinc-800/80 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff] transition-opacity duration-150 pointer-events-none ${
                  activeTab === 'map' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Map Icon (Smoothly transitions color on top) */}
              <ArenaMapIcon
                size={27}
                className={`relative z-10 transition-colors duration-150 ${
                  activeTab === 'map' ? 'text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              />
            </button>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 px-4 pt-3 pb-6 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* QR Modals (Quick access from anywhere) */}
      {qrModalOpen === 'badge' && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setQrModalOpen(null)}
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
                setQrModalOpen(null);
              }}
              className="absolute -top-3 -right-2.5 w-8 h-8 rounded-full bg-[#ebedf2] shadow-[2px_2px_6px_rgba(0,0,0,0.3),-1px_-1px_3px_#ffffff] flex items-center justify-center text-rose-500 hover:text-rose-700 border-2 border-white transition-all cursor-pointer z-30 active:scale-90"
              title="Close QR Badge"
            >
              <X size={16} weight="bold" />
            </button>

            <div className="relative bg-[#f0f2f5] rounded-[26px] p-3.5 sm:p-3.5 shadow-[inset_2px_2px_6px_#cbd2de,inset_-2px_-2px_6px_#ffffff]">
              <PlayerQRBadge
                player={player}
                onScanClick={() => {
                  setQrModalOpen(null);
                  if (typeof onTabChange === 'function') {
                    onTabChange('scanner');
                  }
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
