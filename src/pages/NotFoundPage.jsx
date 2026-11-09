import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import { Swords } from '../components/icons';

export default function NotFoundPage({ onGoHome }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#09090B] px-5 text-center text-[#FAFAFA]">
      {/* Background ambient radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.03) 60%, transparent 100%)' }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex max-w-sm flex-col items-center"
      >
        {/* Arena Emblem Badge */}
        <Logo className="mb-6 h-20 w-20" />

        <h1 className="font-arena text-7xl sm:text-8xl font-black tracking-wider bg-gradient-to-b from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="mt-2 font-arena text-base sm:text-lg font-bold tracking-widest uppercase text-zinc-300">
          Page Not Found
        </h2>

        {/* Mobile-First High-Contrast Action Button with Official Crossed Swords */}
        <div className="mt-8 flex w-full items-center justify-center">
          <button
            onClick={onGoHome}
            type="button"
            className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-white px-7 font-sans text-[15px] sm:text-base font-bold text-black whitespace-nowrap border border-white/60 shadow-[0_4px_28px_rgba(255,255,255,0.22),0_1px_3px_rgba(0,0,0,0.9)] active:scale-[0.96] active:bg-zinc-200 transition-transform duration-100 ease-out cursor-pointer select-none"
          >
            <Swords size={25} strokeWidth={2.4} className="shrink-0 text-black" />
            <span className="leading-none">Return to Arena</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
