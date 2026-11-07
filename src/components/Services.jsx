import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  Atom,
  Code,
  Flask,
  Gear,
  TrendUp,
  BookOpen,
  SquaresFour,
} from './icons';

const EASE_PREMIUM = [0.16, 1, 0.3, 1];

const SUBJECTS = [
  {
    id: 'math',
    name: 'Mathematics',
    icon: (
      <span className="font-serif font-bold text-3xl sm:text-[34px] leading-none select-none">
        Σ
      </span>
    ),
    href: '/dashboard#math',
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: <Atom size={34} weight="regular" />,
    href: '/dashboard#physics',
  },
  {
    id: 'cs',
    name: 'Computer Science',
    icon: <Code size={32} weight="bold" />,
    href: '/dashboard#cs',
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: <Flask size={32} weight="regular" />,
    href: '/dashboard#chemistry',
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-8 h-8"
        aria-hidden="true"
      >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
    href: '/dashboard#biology',
  },
  {
    id: 'engineering',
    name: 'Engineering',
    icon: <Gear size={32} weight="regular" />,
    href: '/dashboard#engineering',
  },
  {
    id: 'data-science',
    name: 'Data Science',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-8 h-8"
        aria-hidden="true"
      >
        <path d="M6 5H4v14h2" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        <path d="M18 5h2v14h-2" />
      </svg>
    ),
    href: '/dashboard#data-science',
  },
  {
    id: 'economics',
    name: 'Economics',
    icon: <TrendUp size={32} weight="bold" />,
    href: '/dashboard#economics',
  },
  {
    id: 'humanities',
    name: 'Humanities',
    icon: <BookOpen size={32} weight="regular" />,
    href: '/dashboard#humanities',
  },
  {
    id: 'more',
    name: 'More Subjects',
    icon: <SquaresFour size={32} weight="bold" />,
    href: '/dashboard',
  },
];

export default function Services() {
  const reduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.05,
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
      id="services"
      className="relative w-full overflow-hidden bg-[#09090B] py-16 sm:py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        
        {/* 1. Section Header matching Image */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, ease: EASE_PREMIUM }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 text-left"
        >
          <div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-[2.25rem] text-white tracking-tight leading-tight">
              Explore Subjects
            </h2>
            <p className="font-sans text-xs sm:text-sm text-zinc-400 mt-1.5 font-normal">
              From core STEM to humanities, learn and practice across 50+ subjects.
            </p>
          </div>

          <a
            href="/dashboard"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 font-sans text-xs sm:text-[13px] font-semibold text-black shadow-[0_2px_12px_rgba(255,255,255,0.1)] hover:bg-neutral-200 active:scale-95 transition-all duration-300 ease-premium shrink-0 cursor-pointer w-fit"
          >
            <span>View All Subjects</span>
            <ArrowUpRight
              size={14}
              weight="bold"
              className="transition-transform duration-300 ease-premium group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        </motion.div>

        {/* 2. Subjects Grid: 10 Cards in 5x2 Layout (Narrower container matching Hero workbench) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3.5"
        >
          {SUBJECTS.map((subject) => (
            <motion.a
              key={subject.id}
              href={subject.href}
              variants={itemVariants}
              className="group relative flex flex-col items-center justify-center h-[96px] sm:h-[110px] md:h-[116px] px-2.5 py-3 sm:px-3.5 sm:py-4 rounded-2xl border border-white/[0.08] bg-[#111113] hover:bg-[#18181c] hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-200 ease-out cursor-pointer active:scale-[0.98]"
            >
              <div className="h-9 sm:h-10 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors duration-200">
                {subject.icon}
              </div>
              <span className="font-sans text-[11.5px] sm:text-[13px] font-medium text-zinc-300 group-hover:text-white mt-1.5 sm:mt-2 text-center tracking-tight transition-colors duration-200 select-none">
                {subject.name}
              </span>
            </motion.a>
          ))}
        </motion.div>

        {/* 3. CTA Banner: Unlock Your Full Academic Potential */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.7, ease: EASE_PREMIUM }}
          className="relative mt-10 sm:mt-16 overflow-hidden rounded-[20px] sm:rounded-[30px] border border-white/15 border-t-white/30 bg-gradient-to-b from-[#131316] via-[#0d0d10] to-[#070708] px-5 py-8 sm:px-12 sm:py-12 md:py-14 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
        >
          {/* Top ambient radial spotlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 -top-16 -translate-x-1/2 h-[220px] w-[600px] rounded-full opacity-35 blur-[70px] z-0"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)',
            }}
          />

          {/* Bottom-left curved specular light sweep */}
          <svg
            className="pointer-events-none absolute bottom-0 left-0 h-full w-[42%] max-w-[440px] opacity-70 select-none z-0"
            viewBox="0 0 440 260"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M -10 260 C 110 240, 210 180, 380 0"
              stroke="url(#ctaLeftGlow)"
              strokeWidth="2.5"
            />
            <path
              d="M -10 260 C 110 240, 210 180, 380 0"
              stroke="url(#ctaLeftGlow)"
              strokeWidth="10"
              strokeOpacity="0.4"
              filter="blur(8px)"
            />
            <defs>
              <linearGradient id="ctaLeftGlow" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Bottom-right curved specular light sweep */}
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-full w-[42%] max-w-[440px] opacity-70 select-none z-0"
            viewBox="0 0 440 260"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 450 260 C 330 240, 230 180, 60 0"
              stroke="url(#ctaRightGlow)"
              strokeWidth="2.5"
            />
            <path
              d="M 450 260 C 330 240, 230 180, 60 0"
              stroke="url(#ctaRightGlow)"
              strokeWidth="10"
              strokeOpacity="0.4"
              filter="blur(8px)"
            />
            <defs>
              <linearGradient id="ctaRightGlow" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Banner Content */}
          <div className="relative z-10 mx-auto max-w-2xl">
            <h3 className="font-display font-bold text-xl sm:text-3xl md:text-[2.25rem] leading-tight text-white tracking-tight">
              Unlock Your Full Academic Potential
            </h3>
            
            <p className="mx-auto mt-2.5 max-w-xl font-sans text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
              Start learning with your 24/7 personal AI Tutor. Master tough concepts, ace your exams, and build deep confidence.
            </p>

            <div className="mt-7 flex justify-center">
              <a
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-sans text-xs sm:text-sm font-semibold text-black shadow-[0_4px_24px_rgba(255,255,255,0.18)] hover:bg-neutral-100 active:scale-[0.97] transition-all duration-200 cursor-pointer"
              >
                <span>Start Learning Free</span>
                <ArrowUpRight
                  size={15}
                  weight="bold"
                  className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
