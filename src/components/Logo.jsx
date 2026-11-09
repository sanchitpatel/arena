import { GameController } from './icons';

// Arena brand logo mark — Premium Gaming Monochrome
export default function Logo({ className = 'w-12 h-12', dark = false }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Ambient background glow for high-impact first look on mobile */}
      <div className="absolute -inset-1 rounded-2xl bg-white/10 blur-md pointer-events-none" />

      {/* Main emblem badge */}
      <div
        className={`relative flex h-full w-full items-center justify-center rounded-2xl transition-all ${
          dark
            ? 'bg-black text-white border border-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
            : 'bg-gradient-to-b from-zinc-800 to-zinc-950 text-white border border-zinc-700/80 shadow-[0_8px_24px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)]'
        }`}
      >
        <GameController
          weight="fill"
          className="w-3/5 h-3/5 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]"
          aria-label="Arena Game Controller Logo"
        />
      </div>
    </div>
  );
}
