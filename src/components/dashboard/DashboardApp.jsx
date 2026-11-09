import React, { useState, useEffect, useCallback } from 'react';
import { LoginView } from './LoginView';
import { DashboardShell } from './DashboardShell';
import { NewPatientView } from './NewPatientView';
import { ExistingPatientView } from './ExistingPatientView';
import { DoctorDashboardView } from './DoctorDashboardView';
import { NotificationView } from './NotificationView';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';

/**
 * Route Mappings for Clean Native Mobile URLs (Zero '#' in URLs)
 * - /arena          -> Main Game/Onboarding View (Root Tab)
 * - /leaderboard    -> Live Scoreboard / Rankings
 * - /live           -> Active Challenge / Round View
 * - /notifications  -> Event Announcements / Notifications
 */
const ROOT_TAB = 'new-patient';
const ROOT_PATH = '/arena';

const TAB_TO_PATH = {
  'new-patient': '/arena',
  'existing-patient': '/leaderboard',
  'dashboard': '/live',
  'notifications': '/notifications',
};

const PATH_TO_TAB = {
  '/arena': 'new-patient',
  '/leaderboard': 'existing-patient',
  '/live': 'dashboard',
  '/notifications': 'notifications',
  '/records': 'existing-patient',
  '/': 'new-patient',
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

  // Track active player details (Guest ID, Orb Number, name, avatar)
  const [player, setPlayer] = useState(() => {
    const gId = getPlayerId() || 'Guest001';
    const orb = getOrbNumber(gId) || 1;
    return {
      guest_id: gId,
      orb_number: orb,
      name: gId,
      avatar: '⚡',
    };
  });

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

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
        } catch {}
        return;
      }

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
    } catch {}

    if (playerData) {
      setPlayer(playerData);
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
    } catch {}

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
    <DashboardShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      player={player}
      onSignOut={handleSignOut}
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
        <DoctorDashboardView
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      </div>
      <div className={activeTab === 'notifications' ? 'block' : 'hidden'}>
        <NotificationView />
      </div>
    </DashboardShell>
  );
}
