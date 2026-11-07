import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { List, X, ArrowUpRight } from './icons';
import Logo from './Logo';
import siteData from '../data/site.json';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Why AI Tutor', href: '#about' },
  { label: 'Subjects', href: '#services' },
];

export default function Navbar() {
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('Home');
  const { scrollY } = useScroll();
  const navRef = useRef(null);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 32);
  });

  useEffect(() => {
    const updateActiveItem = () => {
      const hash = window.location.hash;
      if (hash === '#about') {
        setActive('Why AI Tutor');
      } else if (hash === '#services') {
        setActive('Subjects');
      } else {
        setActive('Home');
      }
    };

    updateActiveItem();
    window.addEventListener('hashchange', updateActiveItem);
    window.addEventListener('popstate', updateActiveItem);
    return () => {
      window.removeEventListener('hashchange', updateActiveItem);
      window.removeEventListener('popstate', updateActiveItem);
    };
  }, []);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    document.body.classList.toggle('no-scroll', menuOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [menuOpen]);

  return (
    <motion.header
      ref={navRef}
      initial={reduceMotion ? false : { y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,padding] duration-500 ease-premium ${scrolled || menuOpen
        ? 'bg-[#09090B]/90 backdrop-blur-xl border-b border-white/[0.08] py-3'
        : 'bg-transparent border-b border-transparent py-5'
        }`}
    >
      <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <a href="#home" className="group flex items-center gap-2.5 sm:gap-3" aria-label={`${siteData.name} — home`}>
          <Logo className="h-9 w-9 transition-transform duration-500 ease-premium group-hover:scale-105 sm:h-10 sm:w-10" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-semibold tracking-tight text-white sm:text-base">AI Tutor</span>
            <span className="mt-1 font-sans text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-400 sm:text-[10px]">Intelligent Learning</span>
          </span>
        </a>

        {/* Desktop nav links */}
        <ul className="hidden items-center gap-8 lg:flex xl:gap-10">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                onClick={() => setActive(link.label)}
                className={`group relative font-sans text-[13px] lg:text-[15px] font-medium tracking-tight transition-colors duration-300 ${active === link.label ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-2 left-0 h-px w-full origin-left bg-white transition-transform duration-300 ease-premium ${active === link.label ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                />
              </a>
            </li>
          ))}
        </ul>

        {/* Right CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/dashboard"
            className="group hidden h-10 items-center justify-center gap-2 rounded-full bg-white px-4 font-sans text-black border border-white/20 shadow-[0_2px_12px_rgba(255,255,255,0.08)] transition-all duration-300 ease-premium hover:bg-neutral-200 active:scale-95 cursor-pointer sm:inline-flex"
          >
            <span className="whitespace-nowrap text-[12px] font-semibold tracking-wide">{siteData.bookButtonLabel || 'Start Learning Free'}</span>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-black transition-transform duration-300 ease-premium group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight size={13} weight="bold" />
            </span>
          </a>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white ring-1 ring-inset ring-white/15 transition-colors duration-300 hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <motion.div
        initial={false}
        animate={menuOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden lg:hidden"
      >
        <ul className="flex flex-col gap-1 border-t border-white/[0.08] bg-[#09090B]/95 px-6 pb-6 pt-4 backdrop-blur-xl">
          {NAV_LINKS.map((link, i) => (
            <li key={link.label}>
              <a
                href={link.href}
                onClick={() => {
                  setActive(link.label);
                  setMenuOpen(false);
                }}
                style={reduceMotion ? undefined : { transitionDelay: `${menuOpen ? i * 40 : 0}ms` }}
                className={`flex items-center justify-between border-b border-white/[0.05] py-3.5 font-display text-lg font-medium tracking-tight transition-colors ${active === link.label ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
              >
                {link.label}
                <ArrowUpRight size={16} weight="bold" className="text-zinc-500" />
              </a>
            </li>
          ))}
          <li className="pt-5">
            <a
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="group flex w-full h-12 items-center justify-center gap-2.5 rounded-full bg-white px-6 font-sans text-black font-semibold shadow-[0_4px_16px_rgba(255,255,255,0.1)] transition-all duration-300 ease-premium hover:bg-neutral-200 active:scale-95 cursor-pointer"
            >
              <span className="whitespace-nowrap text-xs font-semibold tracking-wide">{siteData.bookButtonLabel || 'Start Learning Free'}</span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-black transition-transform duration-300 ease-premium group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight size={14} weight="bold" />
              </span>
            </a>
          </li>
        </ul>
      </motion.div>

      {/* Backdrop */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 -z-10 bg-black/70 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}
    </motion.header>
  );
}
