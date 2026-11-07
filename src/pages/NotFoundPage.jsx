import { motion } from 'framer-motion';
import { ArrowLeft, Compass } from '../components/icons';
import Logo from '../components/Logo';

export default function NotFoundPage({ onGoHome }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#09090B] px-5 text-center text-[#FAFAFA]">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)' }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex max-w-md flex-col items-center"
      >
        <Logo className="mb-4 h-12 w-12" />

        <h1 className="mt-4 font-display text-6xl sm:text-7xl font-bold tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="mt-2 font-display text-xl font-semibold text-white">
          Page Not Found
        </h2>

        <p className="mt-3 font-sans text-sm font-light leading-relaxed text-zinc-400">
          The page or study session you are looking for doesn’t exist, has expired, or the link is incorrect.
        </p>

        <div className="mt-8 flex items-center justify-center">
          <button
            onClick={onGoHome}
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 font-sans text-xs font-semibold text-black border border-white/20 shadow-[0_2px_16px_rgba(255,255,255,0.1)] transition-all duration-300 ease-premium hover:bg-neutral-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={14} weight="bold" className="transition-transform group-hover:-translate-x-0.5" />
            <span>Return to Home</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
