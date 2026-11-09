import { useState, useEffect } from 'react';
import DashboardApp from './components/dashboard/DashboardApp';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

// Whitelist of valid paths for the Arena application
const VALID_APP_PATHS = new Set([
  '/',
  '',
  '/onboarding',
  '/arena',
  '/leaderboard',
  '/live',
  '/notifications',
  '/records',
]);

function resolveRoute() {
  if (typeof window === 'undefined') return 'app';

  // Normalize path by stripping trailing slashes and converting to lowercase
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const hash = window.location.hash.toLowerCase();

  // 1. Explicit Legal and Info pages
  if (path === '/terms' || hash === '#terms') return 'terms';
  if (path === '/privacy' || hash === '#privacy' || hash === '#privacy-policy') return 'privacy';
  if (path === '/404' || hash === '#404') return '404';

  // 2. Valid Arena application routes
  if (VALID_APP_PATHS.has(path)) {
    return 'app';
  }

  // 3. Any unrecognized, misspelled, or wrong URL -> 404 Not Found
  return '404';
}

export default function App() {
  const [route, setRoute] = useState(resolveRoute);

  useEffect(() => {
    const handleNav = () => setRoute(resolveRoute());
    window.addEventListener('popstate', handleNav);
    window.addEventListener('hashchange', handleNav);
    return () => {
      window.removeEventListener('popstate', handleNav);
      window.removeEventListener('hashchange', handleNav);
    };
  }, []);

  const navigateToApp = () => {
    window.history.pushState(null, '', '/arena');
    setRoute('app');
  };

  return (
    <div className="app-container min-h-screen bg-[#09090B] text-[#FAFAFA]">
      {route === 'terms' && <TermsPage onBack={navigateToApp} />}
      {route === 'privacy' && <PrivacyPolicyPage onBack={navigateToApp} />}
      {route === '404' && <NotFoundPage onGoHome={navigateToApp} />}
      {route === 'app' && <DashboardApp />}
    </div>
  );
}
