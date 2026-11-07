import { useState } from 'react';
import Logo from './Logo';
import { ArrowRight, EnvelopeSimple, GithubLogo, YoutubeLogo } from './icons';
import siteData from '../data/site.json';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
      setEmail('');
    }
  };

  return (
    <footer className="relative w-full border-t border-white/10 bg-[#000000]">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 pt-10 sm:pt-14 pb-8 sm:pb-10">
        
        {/* Main Content Row matching reference image */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.6fr] lg:gap-10 items-start">
          
          {/* Column 1: Brand & Socials */}
          <div className="flex flex-col items-start pr-0 lg:pr-6">
            <a href="#home" className="inline-flex items-center gap-3 group" aria-label="AI Tutor Platform">
              <Logo className="h-10 w-10 rounded-xl shadow-sm" />
              <div className="flex flex-col text-left">
                <span className="font-display text-[18px] font-bold tracking-tight text-white leading-tight">
                  AI Tutor
                </span>
                <span className="text-[12px] uppercase tracking-widest text-zinc-400 mt-0.5">
                  Intelligent Learning
                </span>
              </div>
            </a>

            <p className="mt-4 max-w-xs font-sans text-xs sm:text-[13px] text-zinc-400 leading-relaxed font-normal">
              A personalized, adaptive learning platform powered by cognitive science.
            </p>

            {/* Social Icons */}
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/25 hover:bg-white/[0.08] active:scale-95 transition-all"
              >
                <YoutubeLogo size={16} weight="fill" />
              </a>
              <a
                href={siteData.socialLinks?.github || 'https://github.com'}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/25 hover:bg-white/[0.08] active:scale-95 transition-all"
              >
                <GithubLogo size={16} weight="regular" />
              </a>
              <a
                href={`mailto:${siteData.email || 'hello@aitutor.app'}`}
                aria-label="Email"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/25 hover:bg-white/[0.08] active:scale-95 transition-all"
              >
                <EnvelopeSimple size={16} weight="regular" />
              </a>
            </div>
          </div>

          {/* Column 2: EXPLORE */}
          <div>
            <h4 className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
              Explore
            </h4>
            <ul className="mt-3.5 space-y-2.5 font-sans text-xs sm:text-[13px] text-zinc-400">
              <li>
                <a href="#home" className="transition-colors hover:text-white">
                  Home
                </a>
              </li>
              <li>
                <a href="#about" className="transition-colors hover:text-white">
                  Why AI Tutor
                </a>
              </li>
              <li>
                <a href="#services" className="transition-colors hover:text-white">
                  Subjects
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: RESOURCES */}
          <div>
            <h4 className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
              Resources
            </h4>
            <ul className="mt-3.5 space-y-2.5 font-sans text-xs sm:text-[13px] text-zinc-400">
              <li>
                <a href="/about#faq" className="transition-colors hover:text-white">
                  Help &amp; FAQ
                </a>
              </li>
              <li>
                <a href="/dashboard#study-plan" className="transition-colors hover:text-white">
                  Study Guides
                </a>
              </li>
              <li>
                <a href={`mailto:${siteData.email || 'hello@aitutor.app'}`} className="transition-colors hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Stay in the loop with vertical border */}
          <div className="border-t border-white/10 pt-8 sm:border-t-0 sm:pt-0 lg:border-l lg:border-white/10 lg:pl-10">
            <h3 className="font-sans font-semibold text-base sm:text-[17px] text-white tracking-tight">
              Stay in the loop
            </h3>
            <p className="mt-1 font-sans text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed">
              Get updates, new subjects, and learning tips.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="mt-4 flex items-center justify-between rounded-full border border-white/15 bg-white/[0.04] p-1.5 pl-3.5 max-w-sm hover:border-white/25 focus-within:border-white/35 transition-colors"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <EnvelopeSimple size={16} weight="regular" className="text-zinc-400 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={subscribed ? 'Subscribed!' : 'Enter your email'}
                  className="w-full bg-transparent font-sans text-xs sm:text-[13px] text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shadow-xs ml-2"
              >
                <ArrowRight size={14} weight="bold" />
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Row: Divider + Copyright + Legal Links */}
        <div className="mt-8 sm:mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="font-sans text-xs sm:text-[13px] text-zinc-400">
            &copy; {currentYear} AI Tutor. All rights reserved.
          </p>

          <div className="flex items-center gap-3 font-sans text-xs sm:text-[13px] text-zinc-400">
            <a href="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <span className="text-zinc-600 select-none">|</span>
            <a href="/terms" className="transition-colors hover:text-white">
              Terms &amp; Conditions
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
