import { motion, useReducedMotion } from 'framer-motion';
import {
  Brain,
  Stack,
  SquaresFour,
  Lightning,
  User,
  Plus,
  PaperPlaneTilt,
} from './icons';
import Logo from './Logo';

const EASE_PREMIUM = [0.16, 1, 0.3, 1];

const FEATURES = [
  {
    icon: <Brain size={24} weight="regular" />,
    title: 'Socratic Inquiry',
    desc: 'Guides you with the right questions, helping you think deeper and build real understanding.',
  },
  {
    icon: <Stack size={24} weight="regular" />,
    title: 'Real-Time Adaptive Pacing',
    desc: 'Adjusts to your level, response speed, and learning goals in real time.',
  },
  {
    icon: <SquaresFour size={24} weight="regular" />,
    title: 'Multi-Disciplinary Mastery',
    desc: 'Learn and connect concepts across Mathematics, Computer Science, Physics, Chemistry, and more.',
  },
  {
    icon: <Lightning size={24} weight="regular" />,
    title: 'Multi-Modal Feedback',
    desc: 'Get clear explanations with code, equations, and visual breakdowns whenever you need them.',
  },
];

export default function About() {
  const reduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: reduceMotion ? {} : { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: EASE_PREMIUM },
    },
  };

  return (
    <section
      id="about"
      className="relative w-full overflow-hidden bg-[#09090B] py-20 sm:py-24 md:py-28 border-t border-white/[0.06]"
    >
      {/* Top-Right curved specular ambient light sweep matching Image 2 */}
      <svg
        className="pointer-events-none absolute -top-12 -right-12 h-[550px] w-[550px] opacity-40 select-none z-0"
        viewBox="0 0 550 550"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 550 0 C 420 120, 240 240, 0 450"
          stroke="url(#aboutRightGlow)"
          strokeWidth="2"
        />
        <path
          d="M 550 0 C 420 120, 240 240, 0 450"
          stroke="url(#aboutRightGlow)"
          strokeWidth="10"
          strokeOpacity="0.3"
          filter="blur(8px)"
        />
        <defs>
          <linearGradient id="aboutRightGlow" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-start">
          
          {/* Left Column: Eyebrow + Headline + Subtitle + Stacked Interactive Chat Mockup */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="flex flex-col"
          >
            {/* 1. Eyebrow Badge matching Image 2 */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-md">
                <Brain size={18} weight="regular" className="text-zinc-200 shrink-0" />
                <span className="font-sans text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                  The AI Tutor Advantage
                </span>
              </div>
            </motion.div>

            {/* 2. Main Headline matching Image 2 */}
            <motion.h2
              variants={itemVariants}
              className="mt-4 font-display font-bold text-3xl sm:text-4xl lg:text-[40px] leading-[1.14] text-white tracking-tight"
            >
              Built on Cognitive Science &amp; Intelligent Mentorship
            </motion.h2>

            {/* 3. Subtitle matching Image 2 */}
            <motion.p
              variants={itemVariants}
              className="mt-3 font-sans text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-xl"
            >
              A learning experience designed around how you think, practice, and truly build lasting understanding.
            </motion.p>

            {/* 4. Stacked Mockup Window with 3 layered cards behind matching Image */}
            <motion.div
              variants={itemVariants}
              className="relative mt-8 sm:mt-10 w-full max-w-[530px] pl-3.5 sm:pl-7"
            >
              {/* Soft ambient backlight halo */}
              <div
                aria-hidden
                className="absolute -top-6 -left-6 -z-10 h-72 w-72 rounded-full bg-white/[0.05] blur-3xl pointer-events-none"
              />

              {/* Stacked Backdrop Card 1 (Furthest Back - Widest Fan) */}
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 left-3.5 sm:left-7 rounded-[24px] sm:rounded-[28px] border border-white/10 bg-gradient-to-br from-[#2a2a32]/90 via-[#1c1c22]/90 to-[#121216]/95 -rotate-[3deg] sm:-rotate-[5.5deg] -translate-x-3.5 sm:-translate-x-7 -translate-y-2 sm:-translate-y-3 origin-bottom-right pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),-12px_16px_36px_rgba(0,0,0,0.65)] backdrop-blur-xl"
              />

              {/* Stacked Backdrop Card 2 (Middle Layer) */}
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 left-3.5 sm:left-7 rounded-[24px] sm:rounded-[28px] border border-white/20 bg-gradient-to-br from-[#222228]/92 via-[#18181d]/92 to-[#0e0e12]/95 -rotate-[2deg] sm:-rotate-[3.6deg] -translate-x-2 sm:-translate-x-4.5 -translate-y-1 sm:-translate-y-2 origin-bottom-right pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),-8px_12px_28px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              />

              {/* Stacked Backdrop Card 3 (Immediate Backdrop) */}
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 left-3.5 sm:left-7 rounded-[24px] sm:rounded-[28px] border border-white/30 bg-gradient-to-br from-[#1b1b20]/95 via-[#141418]/95 to-[#0b0b0e] -rotate-[1deg] sm:-rotate-[1.8deg] -translate-x-1 sm:-translate-x-2.5 -translate-y-0.5 sm:-translate-y-1 origin-bottom-right pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),-4px_8px_20px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              />

              {/* Main Foreground White Mockup Window */}
              <div className="relative rounded-[22px] sm:rounded-[26px] border border-zinc-200/90 bg-white p-3.5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.65),0_2px_4px_rgba(0,0,0,0.06)] text-zinc-900">
                
                {/* Window Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 sm:pb-3.5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Traffic Light Dots */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full bg-zinc-300" />
                      <span className="h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full bg-zinc-300" />
                      <span className="h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full bg-zinc-300" />
                    </div>

                    {/* Window Brand Mark & Title */}
                    <div className="flex items-center gap-1.5 sm:gap-2 ml-0.5 sm:ml-1">
                      <Logo dark className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg" />
                      <span className="font-sans text-[11px] sm:text-[13px] font-semibold text-zinc-900 tracking-tight">
                        AI Tutor Session
                      </span>
                    </div>
                  </div>

                  {/* Live Session Badge */}
                  <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200/80 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium text-zinc-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Session</span>
                  </div>
                </div>

                {/* Conversation Body */}
                <div className="mt-3.5 sm:mt-4 space-y-3 sm:space-y-3.5">
                  
                  {/* User Question with Separate Avatar */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200/80 text-zinc-600 mt-0.5 shadow-2xs">
                      <User size={14} weight="bold" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-sm bg-zinc-100/90 border border-zinc-200/70 px-3.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-[13px] text-zinc-800 font-sans leading-relaxed">
                      Why does Quicksort run in <span className="font-semibold text-zinc-900">O(n²)</span> in the worst case?
                    </div>
                  </div>

                  {/* AI Tutor Response with Logo Component */}
                  <div className="flex items-start gap-2.5 sm:gap-3 mt-3.5 sm:mt-4">
                    <Logo dark className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl shrink-0 mt-0.5" />
                    <div className="flex-1 rounded-2xl rounded-tl-sm bg-white p-3 sm:p-4 border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-xs sm:text-[13px] text-zinc-800 font-sans leading-relaxed">
                      <p className="text-zinc-800 leading-relaxed font-normal">
                        Great question! Quicksort&apos;s worst case happens when the pivot consistently divides the array into highly unbalanced parts — for example, when the array is already sorted.
                      </p>

                      {/* Interactive Array Visualization matching Image */}
                      <div className="mt-3 sm:mt-3.5 flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <div
                              key={num}
                              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl border border-zinc-200 bg-white font-mono text-[11px] sm:text-xs font-semibold text-zinc-900 shadow-xs"
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                        <span className="text-zinc-400 font-bold text-xs sm:text-sm mx-0.5 sm:mx-1 select-none">→</span>
                        <div className="flex items-center rounded-lg sm:rounded-xl border border-zinc-200 bg-zinc-100 px-2.5 sm:px-3 py-1 sm:py-1.5 font-mono text-[11px] sm:text-xs font-semibold text-zinc-800">
                          pivot = 1
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Input Field matching Image */}
                  <div className="mt-4 sm:mt-5 flex items-center justify-between gap-2.5 sm:gap-3 rounded-full border border-zinc-200 bg-zinc-50/80 px-3 sm:px-3.5 py-1.5 sm:py-2">
                    <button
                      type="button"
                      aria-label="Add attachment"
                      className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      <Plus size={15} weight="bold" />
                    </button>
                    <span className="flex-1 font-sans text-[11px] sm:text-[13px] text-zinc-400 select-none truncate">
                      Ask a follow-up question...
                    </span>
                    <button
                      type="button"
                      aria-label="Send message"
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-zinc-900 text-white hover:bg-black active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      <PaperPlaneTilt size={12} weight="fill" className="-rotate-12 translate-x-px" />
                    </button>
                  </div>

                </div>

              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: 4 Feature Cards shifted to align bottom with the white card */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="flex flex-col gap-3 w-full mt-6 lg:mt-0 lg:self-end"
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group relative flex items-start gap-3.5 sm:gap-4 rounded-2xl border border-white/10 bg-[#121214] p-3.5 sm:p-4 transition-all duration-300 ease-premium hover:border-white/20 hover:bg-[#161619] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
              >
                {/* Feature Icon Box */}
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 group-hover:text-white group-hover:border-white/20 group-hover:bg-white/[0.08] transition-all duration-300">
                  {feature.icon}
                </div>

                {/* Feature Text */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-sans font-semibold text-sm sm:text-base text-white tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-0.5 font-sans text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
