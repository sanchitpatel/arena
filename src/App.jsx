import { useState, useEffect } from 'react';
import DashboardApp from './components/dashboard/DashboardApp';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

function resolveRoute() {
  if (typeof window === 'undefined') return 'app';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path === '/terms' || hash === '#terms') return 'terms';
  if (path === '/privacy' || hash === '#privacy' || hash === '#privacy-policy') return 'privacy';
  if (path === '/404' || hash === '#404') return '404';

  return 'app';
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
