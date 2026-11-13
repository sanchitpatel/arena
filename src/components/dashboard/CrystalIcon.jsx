import React from 'react';

/**
 * 3D Prismatic Quartz Crystal Obelisk
 * Exact SVG design built from public/crystal.md
 */
export const CrystalIcon = ({ color = 'cryst', className = 'w-full h-full' }) => {
  const p = color || 'cryst';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 900"
      width="100%"
      height="100%"
      className={className}
    >
      <defs>
        {/* Soft Ambient Drop Shadow */}
        <filter id={`${p}-crystal-glow`} x="-20%" y="-10%" width="140%" height="120%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#5c528a" floodOpacity="0.22" />
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#809fff" floodOpacity="0.15" />
        </filter>

        {/* Specular Star/Flare Filter */}
        <filter id={`${p}-flare-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`${p}-soft-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" />
        </filter>

        {/* Clip Path for the Exact Outer Silhouette */}
        <clipPath id={`${p}-crystal-silhouette`}>
          <polygon points="204,24 106,232 132,626 202,862 256,632 302,228" />
        </clipPath>

        {/* ==================== CROWN & UPPER GRADIENTS ==================== */}
        <linearGradient id={`${p}-g-top-left-outer`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b95ba" />
          <stop offset="45%" stopColor="#5e6b94" />
          <stop offset="78%" stopColor="#f7d2b7" />
          <stop offset="94%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffebd6" />
        </linearGradient>

        <linearGradient id={`${p}-g-top-left-inner`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#7c87b0" />
          <stop offset="50%" stopColor="#a5b4d9" />
          <stop offset="85%" stopColor="#e3d8f2" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        <linearGradient id={`${p}-g-top-right-inner`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#aeb4db" />
          <stop offset="35%" stopColor="#ffffff" />
          <stop offset="75%" stopColor="#d5daf7" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        <linearGradient id={`${p}-g-top-right-outer`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9ca0d6" />
          <stop offset="50%" stopColor="#c9c6f0" />
          <stop offset="85%" stopColor="#8f9be8" />
          <stop offset="100%" stopColor="#e6ecff" />
        </linearGradient>

        {/* ==================== WARM REFRACTION & SHOULDER GRADIENTS ==================== */}
        <linearGradient id={`${p}-g-warm-flare`} x1="0%" y1="20%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#ffe5c4" />
          <stop offset="58%" stopColor="#eba97a" />
          <stop offset="85%" stopColor="#7a7399" />
          <stop offset="100%" stopColor="#56547a" />
        </linearGradient>

        <linearGradient id={`${p}-g-warm-sub`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffeedb" />
          <stop offset="40%" stopColor="#f2b891" />
          <stop offset="75%" stopColor="#a297bf" />
          <stop offset="100%" stopColor="#7078a8" />
        </linearGradient>

        <linearGradient id={`${p}-g-upper-center-left`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d0c8eb" />
          <stop offset="35%" stopColor="#b8b5e0" />
          <stop offset="75%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dcd9f7" />
        </linearGradient>

        <linearGradient id={`${p}-g-upper-center-right`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b90bd" />
          <stop offset="45%" stopColor="#6b739e" />
          <stop offset="85%" stopColor="#8e94bd" />
          <stop offset="100%" stopColor="#b5bce0" />
        </linearGradient>

        <linearGradient id={`${p}-g-right-shoulder`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4e5278" />
          <stop offset="40%" stopColor="#9b8ee0" />
          <stop offset="75%" stopColor="#e8d7ff" />
          <stop offset="100%" stopColor="#9e95eb" />
        </linearGradient>

        {/* ==================== MID BODY & PRISMATIC CORE GRADIENTS ==================== */}
        <linearGradient id={`${p}-g-left-shaft-top`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9ca6cf" />
          <stop offset="30%" stopColor="#7685b8" />
          <stop offset="70%" stopColor="#87b5f5" />
          <stop offset="100%" stopColor="#b8dcff" />
        </linearGradient>

        <linearGradient id={`${p}-g-cyan-prism`} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="22%" stopColor="#96e6ff" />
          <stop offset="48%" stopColor="#759eff" />
          <stop offset="75%" stopColor="#b594ff" />
          <stop offset="100%" stopColor="#f2e6ff" />
        </linearGradient>

        <linearGradient id={`${p}-g-core-diamond`} x1="0%" y1="15%" x2="100%" y2="85%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="18%" stopColor="#e3f4ff" />
          <stop offset="45%" stopColor="#b8c5eb" />
          <stop offset="78%" stopColor="#95a0cc" />
          <stop offset="100%" stopColor="#d9e4ff" />
        </linearGradient>

        <linearGradient id={`${p}-g-mid-right-slate`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c84ab" />
          <stop offset="35%" stopColor="#a2add4" />
          <stop offset="68%" stopColor="#f5c6aa" />
          <stop offset="88%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#8592c2" />
        </linearGradient>

        <linearGradient id={`${p}-g-right-rib`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c9baff" />
          <stop offset="35%" stopColor="#958ce6" />
          <stop offset="70%" stopColor="#b4bef5" />
          <stop offset="100%" stopColor="#e2d9ff" />
        </linearGradient>

        {/* ==================== LOWER SHAFT GRADIENTS ==================== */}
        <linearGradient id={`${p}-g-lower-left-deep`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#56628a" />
          <stop offset="35%" stopColor="#3c466b" />
          <stop offset="75%" stopColor="#6475a6" />
          <stop offset="100%" stopColor="#9bb1de" />
        </linearGradient>

        <linearGradient id={`${p}-g-lower-center-bright`} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#e3d1ff" />
          <stop offset="30%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#c4cdf2" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        <linearGradient id={`${p}-g-lower-right-prism`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="20%" stopColor="#ffcfb3" />
          <stop offset="45%" stopColor="#80dfff" />
          <stop offset="75%" stopColor="#7584bf" />
          <stop offset="100%" stopColor="#b8aee8" />
        </linearGradient>

        <linearGradient id={`${p}-g-lower-right-edge`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8c4eb" />
          <stop offset="45%" stopColor="#8f99cc" />
          <stop offset="80%" stopColor="#d2bfff" />
          <stop offset="100%" stopColor="#918ae0" />
        </linearGradient>

        {/* ==================== BOTTOM PAVILION (TIP) GRADIENTS ==================== */}
        <linearGradient id={`${p}-g-bottom-left-outer`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#828cb5" />
          <stop offset="30%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f7cfb6" />
          <stop offset="82%" stopColor="#9c8ce0" />
          <stop offset="100%" stopColor="#8a99cf" />
        </linearGradient>

        <linearGradient id={`${p}-g-bottom-center-left`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#474e70" />
          <stop offset="35%" stopColor="#6e769e" />
          <stop offset="70%" stopColor="#c2b8f0" />
          <stop offset="100%" stopColor="#eef2ff" />
        </linearGradient>

        <linearGradient id={`${p}-g-bottom-center-right`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c8d2f7" />
          <stop offset="40%" stopColor="#98a6db" />
          <stop offset="75%" stopColor="#606d9c" />
          <stop offset="100%" stopColor="#a6b8f2" />
        </linearGradient>

        <linearGradient id={`${p}-g-bottom-right-outer`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffdfc7" />
          <stop offset="25%" stopColor="#d1c2ff" />
          <stop offset="65%" stopColor="#8898db" />
          <stop offset="100%" stopColor="#c4d4ff" />
        </linearGradient>

        {/* ==================== INTERNAL CAUSTIC OVERLAYS ==================== */}
        <radialGradient id={`${p}-caustic-light-1`} cx="30%" cy="26%" r="35%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#ffdec2" stopOpacity="0.65" />
          <stop offset="65%" stopColor="#9ea9ff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${p}-caustic-light-2`} cx="48%" cy="48%" r="38%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#8ae8ff" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#b58cff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${p}-caustic-light-3`} cx="52%" cy="66%" r="30%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#dcd4ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${p}-edge-bevel-shine`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="25%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#a8c5ff" stopOpacity="0.6" />
          <stop offset="75%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* MAIN CRYSTAL CONTAINER */}
      <g filter={`url(#${p}-crystal-glow)`}>
        <g clipPath={`url(#${p}-crystal-silhouette)`}>
          {/* Base Fallback Fill */}
          <polygon points="204,24 106,232 132,626 202,862 256,632 302,228" fill="#8c96bd" />

          {/* ==================== 1. TOP CROWN FACETS ==================== */}
          <polygon points="204,24 106,232 152,196" fill={`url(#${p}-g-top-left-outer)`} />
          <polygon points="204,24 152,196 204,132" fill={`url(#${p}-g-top-left-inner)`} />
          <polygon points="204,24 204,132 262,188" fill={`url(#${p}-g-top-right-inner)`} />
          <polygon points="204,24 262,188 302,228" fill={`url(#${p}-g-top-right-outer)`} />

          {/* ==================== 2. UPPER SHOULDER & WARM FLARE FACETS ==================== */}
          <polygon points="106,232 152,196 148,298 114,274" fill={`url(#${p}-g-warm-flare)`} />
          <polygon points="106,232 114,274 118,396" fill="#5b658c" />
          <polygon points="152,196 204,132 148,298" fill={`url(#${p}-g-upper-center-left)`} />
          <polygon points="204,132 148,298 202,282" fill={`url(#${p}-g-warm-sub)`} opacity="0.85" />
          <polygon points="204,132 202,282 262,188" fill={`url(#${p}-g-upper-center-right)`} />
          <polygon points="262,188 302,228 268,256" fill={`url(#${p}-g-top-right-inner)`} />
          <polygon points="302,228 268,256 286,368" fill={`url(#${p}-g-right-shoulder)`} />
          <polygon points="262,188 202,282 268,256" fill="#636b96" />

          {/* ==================== 3. MID-BODY PRISMATIC FACETS ==================== */}
          <polygon points="114,274 148,298 136,442 118,396" fill={`url(#${p}-g-left-shaft-top)`} />
          <polygon points="148,298 202,282 194,458 136,442" fill={`url(#${p}-g-cyan-prism)`} />
          <polygon points="202,282 268,256 248,412 194,458" fill={`url(#${p}-g-core-diamond)`} />
          <polygon points="268,256 286,368 248,412" fill={`url(#${p}-g-mid-right-slate)`} />
          <polygon points="286,368 272,504 248,412" fill={`url(#${p}-g-right-rib)`} />

          {/* Internal Prismatic Sub-Facets */}
          <polygon points="148,298 176,362 136,442" fill="#e6f7ff" opacity="0.55" />
          <polygon points="202,282 176,362 194,458" fill="#89b4ff" opacity="0.45" />
          <polygon points="202,282 232,348 194,458" fill="#ffffff" opacity="0.4" />
          <polygon points="268,256 232,348 248,412" fill="#58608a" opacity="0.5" />

          {/* ==================== 4. LOWER SHAFT FACETS ==================== */}
          <polygon points="118,396 136,442 126,536" fill="#7889ba" />
          <polygon points="136,442 194,458 178,564 126,536" fill={`url(#${p}-g-lower-left-deep)`} />
          <polygon points="126,536 178,564 132,626" fill="#6573a1" />
          <polygon points="194,458 248,412 224,552 178,564" fill={`url(#${p}-g-lower-center-bright)`} />
          <polygon points="248,412 272,504 224,552" fill={`url(#${p}-g-lower-right-prism)`} />
          <polygon points="272,504 256,632 224,552" fill={`url(#${p}-g-lower-right-edge)`} />
          <polygon points="178,564 224,552 198,668" fill={`url(#${p}-g-top-right-inner)`} />
          <polygon points="132,626 178,564 198,668" fill="#919bc4" />
          <polygon points="224,552 256,632 198,668" fill="#a9b5de" />

          {/* Sub-Refraction Shards in Lower Body */}
          <polygon points="136,442 166,495 194,458" fill="#d9ecff" opacity="0.65" />
          <polygon points="194,458 216,498 248,412" fill="#ffffff" opacity="0.7" />
          <polygon points="224,552 246,522 256,632" fill="#70d6ff" opacity="0.45" />
          <polygon points="178,564 202,612 224,552" fill="#ffffff" opacity="0.8" />

          {/* ==================== 5. BOTTOM PAVILION (POINT) FACETS ==================== */}
          <polygon points="132,626 198,668 202,862" fill={`url(#${p}-g-bottom-left-outer)`} />
          <polygon points="164,646 198,668 202,862" fill={`url(#${p}-g-bottom-center-left)`} />
          <polygon points="198,668 232,648 202,862" fill={`url(#${p}-g-bottom-center-right)`} />
          <polygon points="232,648 256,632 202,862" fill={`url(#${p}-g-bottom-right-outer)`} />

          {/* Bottom Tip Internal Shards */}
          <polygon points="132,626 164,646 176,738" fill="#fff0e0" opacity="0.75" />
          <polygon points="198,668 216,746 202,862" fill="#ffffff" opacity="0.5" />

          {/* ==================== 6. SECONDARY INTERNAL GHOST LINES & LATTICE ==================== */}
          <g opacity="0.38" style={{ mixBlendMode: 'overlay' }}>
            <polygon points="204,132 114,274 248,412" fill="none" stroke="#ffffff" strokeWidth="1.5" />
            <polygon points="262,188 148,298 272,504" fill="none" stroke="#aee8ff" strokeWidth="1.2" />
            <polygon points="136,442 268,256 224,552" fill="none" stroke="#ffc9a3" strokeWidth="1.5" />
            <polygon points="126,536 248,412 256,632" fill="none" stroke="#ffffff" strokeWidth="1.2" />
            <polygon points="178,564 272,504 202,862" fill="none" stroke="#d4c2ff" strokeWidth="1" />
          </g>

          {/* Prismatic Color Dispersion Streaks (Chromatic Aberration Effect) */}
          <g opacity="0.65">
            <polygon points="106,232 156,192 148,302 108,255" fill="#ffb078" filter={`url(#${p}-soft-glow)`} />
            <polygon points="248,412 268,382 262,435" fill="#ff9d66" filter={`url(#${p}-flare-blur)`} />
            <polygon points="244,418 264,392 256,445" fill="#5ce1ff" filter={`url(#${p}-flare-blur)`} />
            <polygon points="148,298 168,340 142,415" fill="#52b7ff" filter={`url(#${p}-soft-glow)`} />
            <polygon points="168,340 196,420 162,445" fill="#c17aff" filter={`url(#${p}-soft-glow)`} />
            <polygon points="248,505 266,535 235,565" fill="#ffae78" filter={`url(#${p}-flare-blur)`} />
            <polygon points="238,518 256,548 228,578" fill="#47d4ff" filter={`url(#${p}-flare-blur)`} />
          </g>

          {/* Soft Caustic Light Pockets */}
          <rect x="0" y="0" width="400" height="900" fill={`url(#${p}-caustic-light-1)`} />
          <rect x="0" y="0" width="400" height="900" fill={`url(#${p}-caustic-light-2)`} />
          <rect x="0" y="0" width="400" height="900" fill={`url(#${p}-caustic-light-3)`} />

          {/* ==================== 7. CRISP FACET RIDGE HIGHLIGHTS ==================== */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Main Vertical Central Spine */}
            <polyline
              points="204,24 204,132 202,282 194,458 178,564 198,668 202,862"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeOpacity="0.85"
            />

            {/* Primary Internal Facet Edges */}
            <polyline
              points="106,232 152,196 204,132 262,188 302,228"
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeOpacity="0.9"
            />
            <polyline
              points="204,24 152,196 148,298 136,442 178,564 132,626"
              stroke="#ffffff"
              strokeWidth="1.1"
              strokeOpacity="0.7"
            />
            <polyline
              points="204,24 262,188 268,256 248,412 224,552 256,632"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />

            {/* Cross Diagonal Facet Lines */}
            <polyline
              points="106,232 148,298 202,282 268,256 302,228"
              stroke="#ffffff"
              strokeWidth="1"
              strokeOpacity="0.65"
            />
            <polyline
              points="202,282 248,412 272,504"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.7"
            />
            <polyline
              points="136,442 194,458 248,412 286,368"
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeOpacity="0.8"
            />
            <polyline
              points="194,458 224,552 198,668"
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeOpacity="0.85"
            />
            <polyline
              points="132,626 198,668 256,632"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />
          </g>

          {/* Outer Perimeter Bevel Highlight */}
          <polygon
            points="204,24 106,232 132,626 202,862 256,632 302,228"
            fill="none"
            stroke={`url(#${p}-edge-bevel-shine)`}
            strokeWidth="3"
          />
        </g>

        {/* ==================== 8. EXTERNAL SPECULAR STARBURSTS & EDGE BLOOMS ==================== */}
        {/* Top Left Shoulder Main Sunburst Flare */}
        <g transform="translate(110, 230)" filter={`url(#${p}-flare-blur)`}>
          <circle cx="0" cy="0" r="14" fill="#fff4e6" opacity="0.85" />
          <path d="M-32,-8 L0,-3 L32,8 L0,3 Z" fill="#ffffff" />
          <path d="M-8,28 L-3,0 L8,-28 L3,0 Z" fill="#ffffff" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>

        {/* Upper Crown Right Specular Glint */}
        <g transform="translate(228, 152)" filter={`url(#${p}-flare-blur)`}>
          <circle cx="0" cy="0" r="10" fill="#ffffff" opacity="0.8" />
          <path d="M-22,-12 L0,-2 L22,12 L0,2 Z" fill="#ffffff" />
          <path d="M-12,22 L-2,0 L12,-22 L2,0 Z" fill="#ffffff" />
        </g>

        {/* Mid-Core Prismatic Node Glint */}
        <g transform="translate(194, 456)" filter={`url(#${p}-flare-blur)`}>
          <circle cx="0" cy="0" r="12" fill="#e8f8ff" opacity="0.85" />
          <path d="M-24,0 L0,-2 L24,0 L0,2 Z" fill="#ffffff" />
          <path d="M0,-24 L-2,0 L0,24 L2,0 Z" fill="#ffffff" />
        </g>

        {/* Lower Central Heart Glint */}
        <g transform="translate(200, 608)" filter={`url(#${p}-flare-blur)`}>
          <circle cx="0" cy="0" r="14" fill="#ffffff" opacity="0.9" />
          <path d="M-26,-6 L0,-2 L26,6 L0,2 Z" fill="#ffffff" />
          <path d="M-6,26 L-2,0 L6,-26 L2,0 Z" fill="#ffffff" />
        </g>

        {/* Lower Left Pavilion Flare */}
        <g transform="translate(154, 654)" filter={`url(#${p}-flare-blur)`}>
          <circle cx="0" cy="0" r="10" fill="#ffebd6" opacity="0.9" />
          <path d="M-20,-10 L0,-2 L20,10 L0,2 Z" fill="#ffffff" />
          <path d="M-10,20 L-2,0 L10,-20 L2,0 Z" fill="#ffffff" />
        </g>

        {/* Micro Sparkle Accents */}
        <circle cx="294" cy="232" r="3.5" fill="#ffffff" filter={`url(#${p}-flare-blur)`} />
        <circle cx="252" cy="410" r="4" fill="#ffffff" filter={`url(#${p}-flare-blur)`} />
        <circle cx="140" cy="442" r="3.5" fill="#ffffff" filter={`url(#${p}-flare-blur)`} />
        <circle cx="248" cy="528" r="3.5" fill="#ffffff" filter={`url(#${p}-flare-blur)`} />
        <circle cx="204" cy="28" r="2.5" fill="#ffffff" filter={`url(#${p}-flare-blur)`} />
        <circle cx="202" cy="856" r="2.5" fill="#ffffff" filter={`url(#${p}-flare-blur)`} />
      </g>
    </svg>
  );
};

export default CrystalIcon;
