import { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Footer from './components/Footer';
import DashboardApp from './components/dashboard/DashboardApp';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

// Resolves current page route and section from window location
function resolveRoute() {
  if (typeof window === 'undefined') return { page: 'home', section: null };

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash;

  // Dashboard route
  if (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    hash === '#dashboard' ||
    hash.startsWith('#dashboard') ||
    hash === '#new-patient' ||
    hash.startsWith('#existing-patient') ||
    hash.startsWith('#notifications')
  ) {
    return { page: 'dashboard', section: null };
  }

  // Privacy Policy route
  if (pathname === '/privacy' || pathname === '/privacy-policy' || hash === '#privacy' || hash === '#privacy-policy') {
    return { page: 'privacy', section: null };
  }

  // Terms and Conditions route
  if (pathname === '/terms' || pathname === '/terms-and-conditions' || hash === '#terms' || hash === '#terms-and-conditions') {
    return { page: 'terms', section: null };
  }

  // Root Homepage
  if (pathname === '/') {
    if (hash === '#404') {
      return { page: 'not-found', section: null };
    }
    if (hash === '#about' || hash === '#services') {
      return { page: 'home', section: hash };
    }
    // Pure home root: no section anchor
    return { page: 'home', section: null };
  }

  // Any unrecognized path -> 404 Not Found
  return { page: 'not-found', section: null };
}

export default function App() {
  const lenisRef = useRef(null);
  const [route, setRoute] = useState(resolveRoute);

  // Sync route on browser popstate and hashchange
  useEffect(() => {
    const handleNavigation = () => {
      const current = resolveRoute();
      setRoute(current);

      // Normalize URL in address bar
      if (current.page === 'home' && !current.section) {
        if (window.location.hash || window.location.pathname !== '/') {
          window.history.replaceState(null, '', '/');
        }
      } else if (current.page === 'dashboard' && window.location.pathname !== '/dashboard' && !window.location.hash) {
        window.history.replaceState(null, '', '/dashboard');
      } else if (current.page === 'privacy' && window.location.pathname !== '/privacy') {
        window.history.replaceState(null, '', '/privacy');
      } else if (current.page === 'terms' && window.location.pathname !== '/terms') {
        window.history.replaceState(null, '', '/terms');
      }

      // Scroll handling
      if (current.page === 'home') {
        if (current.section) {
          setTimeout(() => {
            const el = document.querySelector(current.section);
            if (el) {
              if (lenisRef.current) {
                lenisRef.current.scrollTo(el);
              } else {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }, 60);
        } else {
          window.scrollTo(0, 0);
        }
      } else {
        window.scrollTo(0, 0);
      }
    };

    // Run initial URL normalization
    handleNavigation();

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // Lenis smooth scroll for Homepage only
  useEffect(() => {
    if (route.page !== 'home') {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis = null;
    let rafId;

    if (!prefersReducedMotion) {
      lenis = new Lenis({
        lerp: 0.1,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
      });

      lenisRef.current = lenis;

      const raf = (time) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    }

    // Intercept clicks on links for smooth navigation
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      // Dashboard navigation
      if (href === '/dashboard' || href.startsWith('/dashboard') || href === '#dashboard' || href.startsWith('#dashboard')) {
        e.preventDefault();
        window.history.pushState(null, '', '/dashboard');
        setRoute({ page: 'dashboard', section: null });
        window.scrollTo(0, 0);
        return;
      }

      // Clean path navigation for pages
      if (href === '/privacy' || href === '/privacy-policy') {
        e.preventDefault();
        window.history.pushState(null, '', '/privacy');
        setRoute({ page: 'privacy', section: null });
        window.scrollTo(0, 0);
        return;
      }

      if (href === '/terms' || href === '/terms-and-conditions') {
        e.preventDefault();
        window.history.pushState(null, '', '/terms');
        setRoute({ page: 'terms', section: null });
        window.scrollTo(0, 0);
        return;
      }

      // Home link: reset URL to '/' (no '#')
      if (href === '#home' || href === '/') {
        e.preventDefault();
        window.history.pushState(null, '', '/');
        setRoute({ page: 'home', section: null });
        if (lenisRef.current) {
          lenisRef.current.scrollTo(0, { duration: 1.0 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      // Homepage section anchors: only use /#section
      if (href.startsWith('#') && href.length > 1) {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          e.preventDefault();
          window.history.pushState(null, '', `/${href}`);
          setRoute({ page: 'home', section: href });
          if (lenisRef.current) {
            lenisRef.current.scrollTo(targetElement, { offset: 0, duration: 1.2 });
          } else {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('click', handleAnchorClick);
      if (lenis) lenis.destroy();
      lenisRef.current = null;
    };
  }, [route.page]);

  // Navigate back to homepage root '/' with no hash
  const navigateToHome = () => {
    window.history.pushState(null, '', '/');
    setRoute({ page: 'home', section: null });
    window.scrollTo(0, 0);
  };

  return (
    <div className="app-container min-h-screen bg-[#09090B] text-[#FAFAFA]">
      {/* 1. Main Homepage */}
      {route.page === 'home' && (
        <>
          <Navbar />
          <main>
            <Hero />
            <About />
            <Services />
          </main>
          <Footer />
        </>
      )}

      {/* 2. Dashboard App */}
      {route.page === 'dashboard' && (
        <DashboardApp />
      )}

      {/* 3. Privacy Policy Page */}
      {route.page === 'privacy' && (
        <PrivacyPolicyPage onBack={navigateToHome} />
      )}

      {/* 4. Terms & Conditions Page */}
      {route.page === 'terms' && (
        <TermsPage onBack={navigateToHome} />
      )}

      {/* 5. 404 Page Not Found */}
      {route.page === 'not-found' && (
        <NotFoundPage onGoHome={navigateToHome} />
      )}
    </div>
  );
}
