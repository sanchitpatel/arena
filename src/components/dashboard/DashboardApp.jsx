import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { LoginView } from './LoginView';
import { DashboardShell } from './DashboardShell';
import { FrostMountainBackground } from '../common/FrostMountainBackground';
import { CircleNotch } from '@phosphor-icons/react/dist/icons/CircleNotch';
import { getPlayerId, getOrbNumber, getStoredOrbNumber, getPlayerUuid } from '../../utils/playerId';
import { claimOrRegisterGuest } from '../../services/arenaService';

// Lazy-load individual heavy dashboard views on demand
const NewPatientView = lazy(() => import('./NewPatientView').then(m => ({ default: m.NewPatientView })));
const ExistingPatientView = lazy(() => import('./ExistingPatientView').then(m => ({ default: m.ExistingPatientView })));
const DoctorDashboardView = lazy(() => import('./DoctorDashboardView').then(m => ({ default: m.DoctorDashboardView })));
const WalletView = lazy(() => import('./WalletView').then(m => ({ default: m.WalletView })));
const NotificationView = lazy(() => import('./NotificationView').then(m => ({ default: m.NotificationView })));
const ProfileView = lazy(() => import('./ProfileView').then(m => ({ default: m.ProfileView })));
const ScannerView = lazy(() => import('./ScannerView').then(m => ({ default: m.ScannerView })));
const MapView = lazy(() => import('./MapView').then(m => ({ default: m.MapView })));
const IdeasPitchWallView = lazy(() => import('./IdeasPitchWallView').then(m => ({ default: m.IdeasPitchWallView })));
const ChessView = lazy(() => import('./ChessView').then(m => ({ default: m.ChessView })));

// Pre-fetch dashboard views in background after onboarding page has loaded
const prefetchDashboard = () => {
  if (typeof window === 'undefined') return;
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
  idle(() => {
    import('./DashboardShell');
    import('./NewPatientView');
    import('./ExistingPatientView');
    import('./DoctorDashboardView');
    import('./WalletView');
    import('./NotificationView');
    import('./ProfileView');
    import('./ScannerView');
    import('./MapView');
    import('./IdeasPitchWallView');
    import('./ChessView');

    // Warm up critical visual assets into browser memory cache for 0ms paint
    const bgImg = new Image();
    bgImg.src = '/images/arena-bg.webp';
    const prizeImg = new Image();
    prizeImg.src = '/images/prize_road_template.webp';
  }, { timeout: 1000 });
};

/**
 * Arena Loading Screen:
 * Renders the authentic frost mountain background with an animated sky-blue spinner in the center.
 * Eliminates plain white/gray flash on route transitions or cold loads.
 */
function ArenaLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 w-full h-full flex items-center justify-center select-none overflow-hidden">
      {/* Authentic Frost Mountain & Crystal Theme Backdrop */}
      <FrostMountainBackground />

      <div className="relative z-10 flex flex-col items-center justify-center gap-3">
        <CircleNotch size={38} className="animate-spin text-sky-500" />
      </div>
    </div>
  );
}

/**
 * Route Mappings for Clean Native Mobile URLs (Zero '#' in URLs)
 * - /profile        -> Player Identity & Profile (Default Root Tab)
 * - /arena          -> Main Game/Quests View
 * - /leaderboard    -> Live Scoreboard / Rankings
 * - /live           -> Active Challenge / Round View
 * - /notifications  -> Event Announcements / Notifications
 */
const ROOT_TAB = 'profile';
const ROOT_PATH = '/profile';

const TAB_TO_PATH = {
  'profile': '/profile',
  'new-patient': '/arena',
  'existing-patient': '/leaderboard',
  'dashboard': '/wallet',
  'scanner': '/scanner',
  'ideas': '/ideas',
  'prizes': '/ideas',
  'map': '/map',
  'chess': '/chess',
};

const PATH_TO_TAB = {
  '/profile': 'profile',
  '/arena': 'new-patient',
  '/leaderboard': 'existing-patient',
  '/live': 'dashboard',
  '/wallet': 'dashboard',
  '/notifications': 'profile',
  '/records': 'existing-patient',
  '/scanner': 'scanner',
  '/scan': 'scanner',
  '/ideas': 'ideas',
  '/pitch-wall': 'ideas',
  '/prizes': 'ideas',
  '/map': 'map',
  '/chess': 'chess',
  '/': 'profile',
};

function parsePathToTab(pathname) {
  if (!pathname) return ROOT_TAB;
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return PATH_TO_TAB[clean] || ROOT_TAB;
}

export default function DashboardApp() {
  // Check if guest has entered in current browser session
  const [isEntered, setIsEntered] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('arena_entered') === 'true';
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return ROOT_TAB;
    return parsePathToTab(window.location.pathname);
  });

  // Track whether notification slider overlay is currently visible
  const [isNotificationOpen, setIsNotificationOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.toLowerCase().replace(/\/+$/, '') === '/notifications';
  });

  // Track active player details (Guest ID, Orb Number, name, avatar)
  const [player, setPlayer] = useState(() => {
    const gId = getPlayerId();
    const storedOrb = getStoredOrbNumber();
    const storedUuid = getPlayerUuid();
    const orb = (gId ? getOrbNumber(gId) : null) || storedOrb || '?';
    let storedName = '';
    let storedAvatar = '1';
    try {
      storedName = window.localStorage.getItem('arena_draft_username') || '';
      storedAvatar = window.localStorage.getItem('arena_draft_avatar') || '1';
    } catch { }
    return {
      id: storedUuid || null,
      guest_id: gId || 'Guest...',
      orb_number: orb,
      name: storedName || gId || 'Player',
      avatar: storedAvatar || '1',
    };
  });

  // Re-sync freshest player identity and Orb from PostgreSQL
  useEffect(() => {
    let isMounted = true;
    claimOrRegisterGuest().then((res) => {
      if (isMounted && res?.success && res.data) {
        setPlayer((prev) => {
          const freshAvatar = res.data.avatar || prev.avatar;
          try {
            if (freshAvatar) {
              window.localStorage.setItem('arena_draft_avatar', String(freshAvatar));
            }
          } catch { }
          return {
            ...prev,
            id: res.data.player_id || prev.id,
            guest_id: res.data.guest_id || prev.guest_id,
            orb_number: res.data.orb_number || prev.orb_number,
            name: res.data.name || prev.name,
            avatar: freshAvatar,
            team: res.data.team || prev.team,
          };
        });
      }
    }).catch((err) => {
      console.warn('[DashboardApp] Player reconnection sync error:', err);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Silently warm up dashboard chunks while player types nickname/chooses avatar
  useEffect(() => {
    if (!isEntered) {
      prefetchDashboard();
    }
  }, [isEntered]);

  /**
   * Native Mobile Back-Button Behavior:
   * Listens to popstate (Android hardware back, iOS swipe back).
   * Synchronizes active tab smoothly without page reload or layout distortion.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const currentPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';

      if (currentPath === '' || currentPath === '/' || currentPath === '/onboarding') {
        // Returned to root / onboarding view
        setIsEntered(false);
        try {
          window.sessionStorage.removeItem('arena_entered');
        } catch { }
        return;
      }

      if (currentPath === '/notifications') {
        setIsEntered(true);
        setIsNotificationOpen(true);
        return;
      }

      setIsNotificationOpen(false);
      const targetTab = PATH_TO_TAB[currentPath];
      if (targetTab) {
        setIsEntered(true);
        setActiveTab(targetTab);
      } else {
        setActiveTab(ROOT_TAB);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /**
   * Handle Tab Switching with Clean HTML5 URLs (No Hash)
   * Adds entry to history stack so Back button returns to previous tab or Root (/arena).
   */
  const handleTabChange = useCallback((newTab) => {
    if (newTab === 'notifications') {
      setIsNotificationOpen(true);
      return;
    }
    setIsNotificationOpen(false);
    setActiveTab(newTab);
    const targetPath = TAB_TO_PATH[newTab] || ROOT_PATH;

    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: newTab }, '', targetPath);
    }
  }, []);

  const handleSelectDate = useCallback((dateKey) => {
    setSelectedDate(dateKey);
  }, []);

  const handleSelectMonth = useCallback((monthKey) => {
    setSelectedMonth(monthKey);
  }, []);

  // When guest clicks "Enter Arena" on Onboarding screen
  const handleEnterArena = (playerData) => {
    try {
      window.sessionStorage.setItem('arena_entered', 'true');
    } catch { }

    if (playerData) {
      setPlayer(playerData);
      try {
        if (playerData.avatar) {
          window.localStorage.setItem('arena_draft_avatar', String(playerData.avatar));
        }
        if (playerData.name) {
          window.localStorage.setItem('arena_draft_username', playerData.name);
        }
      } catch { }
    }

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    setIsEntered(true);
    setActiveTab(ROOT_TAB);

    // Push clean root URL for native back stack
    window.history.pushState({ tab: ROOT_TAB }, '', ROOT_PATH);
  };

  /**
   * Sign Out Handler:
   * Returns attendee back to onboarding screen (LoginView).
   * Does NOT delete their guest account or orb from PostgreSQL database.
   * Keeps their assigned Guest ID and Orb number in device storage so they can re-enter.
   */
  const handleSignOut = useCallback(() => {
    try {
      window.sessionStorage.removeItem('arena_entered');
    } catch { }

    setIsEntered(false);
    setActiveTab(ROOT_TAB);

    // Navigate cleanly to root onboarding route
    if (window.location.pathname !== '/') {
      window.history.pushState({ tab: 'onboarding' }, '', '/');
    }
  }, []);

  // 1. Direct Onboarding Screen (Transformed LoginView)
  if (!isEntered) {
    return (
      <LoginView
        onEnterArena={handleEnterArena}
      />
    );
  }

  // 2. Main Arena Dashboard Shell & Responsive Views (Root /arena shows first)
  return (
    <Suspense fallback={<ArenaLoadingScreen />}>
      <DashboardShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        player={player}
        onSignOut={handleSignOut}
        isNotificationOpen={isNotificationOpen}
        onToggleNotification={() => setIsNotificationOpen((prev) => !prev)}
        onCloseNotification={() => setIsNotificationOpen(false)}
      >
        <div className={activeTab === 'new-patient' ? 'block' : 'hidden'}>
          <NewPatientView onNavigate={handleTabChange} />
        </div>
        <div className={activeTab === 'existing-patient' ? 'block' : 'hidden'}>
          <ExistingPatientView
            selectedMonth={selectedMonth}
            onSelectMonth={handleSelectMonth}
          />
        </div>
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <WalletView
            player={player}
            onNavigate={handleTabChange}
          />
        </div>
        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
          <ProfileView
            player={player}
            onUpdatePlayer={(updated) => setPlayer((prev) => ({ ...prev, ...updated }))}
            onSignOut={handleSignOut}
          />
        </div>
        <div className={activeTab === 'scanner' ? 'block' : 'hidden'}>
          <ScannerView
            player={player}
            onNavigate={handleTabChange}
            isActive={activeTab === 'scanner'}
          />
        </div>
        <div className={activeTab === 'map' ? 'block' : 'hidden'}>
          <MapView
            player={player}
            onNavigate={handleTabChange}
            isActive={activeTab === 'map'}
          />
        </div>
        <div className={(activeTab === 'ideas' || activeTab === 'prizes') ? 'block' : 'hidden'}>
          <IdeasPitchWallView
            player={player}
          />
        </div>
        <div className={activeTab === 'chess' ? 'block' : 'hidden'}>
          <ChessView
            player={player}
            onBack={() => handleTabChange('profile')}
          />
        </div>
      </DashboardShell>
    </Suspense>
  );
}
