// AI Tutor brand logo mark — Premium Monochrome
export default function Logo({ className = 'w-8 h-8', dark = false }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-xl transition-colors ${
        dark
          ? 'bg-black text-white border border-zinc-800 shadow-sm'
          : 'bg-white text-black border border-white/20 shadow-[0_2px_12px_rgba(255,255,255,0.12)]'
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-1/2 h-1/2"
        aria-label="AI Tutor Logo"
      >
        <path d="M12 2v4" />
        <path d="m4.93 4.93 2.83 2.83" />
        <path d="M2 12h4" />
        <path d="m4.93 19.07 2.83-2.83" />
        <path d="M12 18v4" />
        <path d="m19.07 19.07-2.83-2.83" />
        <path d="M20 12h-4" />
        <path d="m19.07 4.93-2.83 2.83" />
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
      </svg>
    </div>
  );
}
