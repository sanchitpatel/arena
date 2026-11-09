import React from 'react';
import { motion } from 'framer-motion';

// Soft cloud-wisp texture (static SVG noise → white alpha wisps)
const WISPS = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.008 0.014' numOctaves='4' seed='7'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1.7 -0.6'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

// Organic morphing shapes so blobs never look like circles
const MORPH = [
  '42% 58% 63% 37% / 45% 40% 60% 55%',
  '60% 40% 38% 62% / 58% 62% 38% 42%',
  '38% 62% 55% 45% / 40% 55% 45% 60%',
  '42% 58% 63% 37% / 45% 40% 60% 55%',
];

// Each blob uses a different duration so the loop never visibly repeats
function Blob({ className, x, y, scale, rotate, duration, delay = 0 }) {
  return (
    <motion.div
      className={`absolute will-change-transform ${className}`}
      animate={{ x, y, scale, rotate, borderRadius: MORPH }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export default function ChatGPTOrb({ orbNumber = 1, avatar = '⚡', size = 'w-28 h-28' }) {
  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Soft ambient glow (subtle, not a neon halo) */}
      <div className="pointer-events-none absolute inset-2 -z-10 rounded-full bg-sky-400/40 blur-2xl" />

      <div
        className={`relative ${size} overflow-hidden rounded-full`}
        style={{
          isolation: 'isolate',
          WebkitMaskImage: '-webkit-radial-gradient(white, black)', // Safari: clip blurred children
          background: 'linear-gradient(180deg,#d8f3ff 0%,#8ad4ff 35%,#2c98ff 70%,#0a6cff 100%)',
        }}
      >
        {/* Deep azure mass, bottom */}
        <Blob
          className="-bottom-[35%] -left-[15%] h-[85%] w-[130%] bg-[#0a6cff] blur-xl"
          x={['0%', '8%', '-6%', '0%']}
          y={['0%', '-6%', '4%', '0%']}
          scale={[1, 1.12, 0.96, 1]}
          rotate={[0, 12, -8, 0]}
          duration={11}
        />
        {/* Bright cyan mid-layer, left */}
        <Blob
          className="top-[28%] -left-[25%] h-[60%] w-[75%] bg-[#4cc3ff] blur-xl"
          x={['0%', '14%', '4%', '0%']}
          y={['0%', '-8%', '8%', '0%']}
          scale={[1, 0.9, 1.1, 1]}
          rotate={[0, -20, 10, 0]}
          duration={13}
        />
        {/* Deep blue accent, right */}
        <Blob
          className="top-[40%] -right-[20%] h-[55%] w-[60%] bg-[#0058f0] opacity-80 blur-xl"
          x={['0%', '-10%', '6%', '0%']}
          y={['0%', '6%', '-6%', '0%']}
          scale={[1, 1.1, 0.92, 1]}
          rotate={[0, 25, -12, 0]}
          duration={9}
        />
        {/* Cream-white cloud, top-right (the signature highlight) */}
        <Blob
          className="-top-[18%] -right-[12%] h-[60%] w-[75%] bg-[#fffdf2] blur-lg"
          x={['0%', '-12%', '6%', '0%']}
          y={['0%', '8%', '-4%', '0%']}
          scale={[1, 1.15, 0.92, 1]}
          rotate={[0, -15, 10, 0]}
          duration={10}
        />
        {/* Pale sky wash, top-left */}
        <Blob
          className="-top-[20%] -left-[15%] h-[55%] w-[70%] bg-[#e6f8ff] blur-lg"
          x={['0%', '10%', '-4%', '0%']}
          y={['0%', '6%', '-6%', '0%']}
          scale={[1, 1.08, 0.94, 1]}
          rotate={[0, 18, -10, 0]}
          duration={14}
        />

        {/* Cloud wisp texture, slowly rotating = the "liquid" feel */}
        <motion.div
          className="pointer-events-none absolute -inset-[25%] opacity-50 blur-[1px]"
          style={{ backgroundImage: WISPS, backgroundSize: 'cover' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />

        {/* Very soft bottom depth, no glass rim */}
        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_-8px_20px_rgba(0,50,200,0.25)]" />

        {/* Label */}
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-arena text-[10px] font-black uppercase tracking-widest text-sky-950/70">
            ORB
          </span>
          <span className="font-arena mt-0.5 text-3xl font-black leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,40,160,0.6)] sm:text-[34px]">
            {orbNumber}
          </span>
        </div>
      </div>

      {avatar && (
        <div className="absolute -bottom-1 -right-1 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white/90 text-sm shadow-[0_4px_12px_rgba(0,0,0,0.18)] backdrop-blur-md">
          {avatar}
        </div>
      )}
    </div>
  );
}
