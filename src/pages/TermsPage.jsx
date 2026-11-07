import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Handshake,
  CalendarCheck,
  Scales,
  CheckCircle,
  ShieldWarning,
  Gavel,
} from '../components/icons';
import termsData from '../data/terms.json';

const ICONS = {
  Handshake,
  CalendarCheck,
  Scales,
  CheckCircle,
  ShieldWarning,
  Gavel,
};

export default function TermsPage({ onBack }) {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      {/* Top sticky navigation bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-sans text-xs font-semibold text-white transition-all duration-200 hover:border-white/25 hover:bg-white/[0.08] active:scale-95"
          >
            <ArrowLeft size={14} weight="bold" className="transition-transform group-hover:-translate-x-0.5" />
            <span>{termsData.backButtonLabel || 'Back to Home'}</span>
          </button>
          <span className="font-mono text-xs text-zinc-400">Effective November 2026</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
        <div className="mb-12">
          <span className="inline-block rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
            {termsData.badge}
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {termsData.title}
          </h1>
          <p className="mt-4 max-w-2xl font-sans text-base font-light leading-relaxed text-zinc-400">
            {termsData.subtitle}
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {termsData.sections?.map((sec, idx) => {
            const Icon = ICONS[sec.icon] || Handshake;
            return (
              <motion.section
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="rounded-3xl border border-white/10 bg-[#121214]/80 p-6 sm:p-8 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white">
                    <Icon size={20} weight="regular" />
                  </span>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {sec.title}
                  </h2>
                </div>

                <div className="mt-4 space-y-3 pl-0 sm:pl-[52px]">
                  {sec.content?.map((paragraph, pIdx) => (
                    <p key={pIdx} className="font-sans text-sm font-light leading-relaxed text-zinc-300">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
