import React from 'react';

/**
 * High-Fidelity 3D Game Visual Assets for Arena Prize Road:
 * Matches the reference image with exact 3D lighting, bevels,
 * specular glints, god rays, and vibrant game art styling.
 */

// 1. Laurel Wreath Branch (used in header and summit)
export function LaurelBranch({ className = '', flip = false }) {
  return (
    <svg
      viewBox="0 0 36 60"
      className={`w-5 h-8 sm:w-6 sm:h-9 ${flip ? '-scale-x-100' : ''} ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M28 54C20 46 15 36 15 22C15 14 18 7 23 2"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Laurel Leaves */}
      <path d="M22 7C17 3 10 5 9 10C11 15 18 14 22 10" fill="rgba(255,255,255,0.95)" />
      <path d="M19 18C13 15 7 18 6 23C9 28 15 26 19 21" fill="rgba(255,255,255,0.95)" />
      <path d="M16 30C11 28 5 32 5 37C8 41 14 39 17 34" fill="rgba(255,255,255,0.95)" />
      <path d="M18 42C13 41 8 45 9 50C12 54 18 51 20 46" fill="rgba(255,255,255,0.95)" />
      <path d="M23 52C19 52 15 56 16 60C20 62 25 58 25 55" fill="rgba(255,255,255,0.95)" />
    </svg>
  );
}

// 2. 3D Royal Purple Gift Box with Gold Ribbon and Fluffy Bow
export function GiftBox3D({ className = 'w-12 h-12' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`filter drop-shadow-[0_6px_10px_rgba(76,29,149,0.5)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Box Faces */}
        <linearGradient id="gbox-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="35%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#581c87" />
        </linearGradient>
        <linearGradient id="gbox-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="gbox-side" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#581c87" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>

        {/* Shiny Gold Ribbons */}
        <linearGradient id="ribbon-gold-shiny" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="25%" stopColor="#fde047" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="bow-loop-l" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="bow-loop-r" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      {/* Main Isometric Cube Body */}
      {/* Front Face */}
      <polygon points="20,44 50,56 50,86 20,74" fill="url(#gbox-front)" stroke="#4c1d95" strokeWidth="1" />
      {/* Right Face */}
      <polygon points="50,56 80,44 80,74 50,86" fill="url(#gbox-side)" stroke="#3b0764" strokeWidth="1" />
      {/* Top Lid Face */}
      <polygon points="50,26 80,38 50,50 20,38" fill="url(#gbox-top)" stroke="#6b21a8" strokeWidth="1" />

      {/* Vertical Ribbon Front */}
      <polygon points="32,49 38,51 38,81 32,79" fill="url(#ribbon-gold-shiny)" />
      {/* Vertical Ribbon Right Side */}
      <polygon points="62,51 68,49 68,79 62,81" fill="url(#ribbon-gold-shiny)" />
      {/* Horizontal Ribbon Across Top */}
      <polygon points="32,33 68,47 62,49 26,35" fill="url(#ribbon-gold-shiny)" />
      <polygon points="62,33 26,47 32,49 68,35" fill="url(#ribbon-gold-shiny)" />

      {/* 3D Gold Ribbon Bow on Top */}
      <path
        d="M50 35 C42 16 22 14 30 28 C35 35 46 35 50 35 Z"
        fill="url(#bow-loop-l)"
        stroke="#d97706"
        strokeWidth="1.2"
      />
      <path
        d="M50 35 C58 16 78 14 70 28 C65 35 54 35 50 35 Z"
        fill="url(#bow-loop-r)"
        stroke="#b45309"
        strokeWidth="1.2"
      />
      {/* Center Knot */}
      <circle cx="50" cy="34" r="5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
      {/* Ribbon Tails */}
      <path d="M47 37 C41 42 37 48 35 54" stroke="url(#ribbon-gold-shiny)" strokeWidth="3" strokeLinecap="round" />
      <path d="M53 37 C59 42 63 48 65 54" stroke="url(#ribbon-gold-shiny)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// 3. 3D Cylindrical Milestone Pedestal with Stage Number
export function MilestonePedestal({ stage = 1, isUnlocked = false }) {
  const isGreen = isUnlocked;

  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none select-none">
      {/* Glowing Outer Ground Halo Disc */}
      <div
        className={`absolute -bottom-1 w-16 h-7 rounded-full blur-md pointer-events-none transition-all duration-300 ${
          isGreen ? 'bg-emerald-400/90 animate-pulse' : 'bg-purple-500/40'
        }`}
      />

      {/* 3D Tiered Cylinder SVG */}
      <svg viewBox="0 0 100 54" className="w-[58px] h-[32px] sm:w-[64px] sm:h-[36px]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`ped-base-ring-${stage}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {isGreen ? (
              <>
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#7e22ce" />
              </>
            )}
          </linearGradient>

          <linearGradient id={`ped-side-cyl-${stage}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#581c87" />
            <stop offset="50%" stopColor="#7e22ce" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>

          <linearGradient id={`ped-top-disc-${stage}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d8b4fe" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>

        {/* Lower Ground Ring (Glowing neon green or lilac) */}
        <ellipse cx="50" cy="40" rx="44" ry="11" fill={`url(#ped-base-ring-${stage})`} />

        {/* Cylinder Body Extrusion */}
        <path
          d="M10 20 C10 29 28 36 50 36 C72 36 90 29 90 20 L90 29 C90 38 72 45 50 45 C28 45 10 38 10 29 Z"
          fill={`url(#ped-side-cyl-${stage})`}
        />

        {/* Top Stepping Disc Platform */}
        <ellipse cx="50" cy="20" rx="40" ry="10" fill={`url(#ped-top-disc-${stage})`} stroke="#f3e8ff" strokeWidth="1.2" />

        {/* Front Stage Number Centered on the Front Face */}
        <text
          x="50"
          y="39"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="15"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ filter: 'drop-shadow(0 1.5px 3px rgba(0,0,0,0.8))' }}
        >
          {stage}
        </text>
      </svg>
    </div>
  );
}

// 4. Grand Champion 3D Treasure Chest at Peak Summit (Stage 8)
export function TreasureChestSummit() {
  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none select-none">
      {/* Radiant Golden Sunburst God Rays */}
      <div className="absolute -top-10 w-48 h-48 rounded-full bg-amber-400/30 blur-2xl pointer-events-none animate-pulse" />

      {/* SVG God Rays / Sunburst Lines */}
      <svg viewBox="0 0 240 180" className="absolute -top-8 w-56 h-40 pointer-events-none" fill="none">
        <defs>
          <radialGradient id="chest-sunburst" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="120" cy="85" r="75" fill="url(#chest-sunburst)" />
        <path d="M120 85 L120 12 M120 85 L148 18 M120 85 L178 40 M120 85 L198 80 M120 85 L188 118 M120 85 L158 148 M120 85 L82 148 M120 85 L52 118 M120 85 L42 80 M120 85 L62 40 M120 85 L92 18" stroke="rgba(254, 240, 138, 0.55)" strokeWidth="2.5" strokeDasharray="5 5" />
      </svg>

      {/* Golden Laurel Branches Flanking the Chest */}
      <div className="absolute top-1 -left-4 z-10">
        <LaurelBranch className="w-7 h-11 text-amber-200" />
      </div>
      <div className="absolute top-1 -right-4 z-10">
        <LaurelBranch className="w-7 h-11 text-amber-200" flip={true} />
      </div>

      {/* 3D Royal Purple & Gold Treasure Chest SVG */}
      <svg viewBox="0 0 140 120" className="w-28 h-24 relative z-20 filter drop-shadow-[0_8px_18px_rgba(245,158,11,0.55)]" fill="none">
        <defs>
          <linearGradient id="c-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="30%" stopColor="#fde047" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <linearGradient id="c-purple" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7e22ce" />
            <stop offset="50%" stopColor="#6b21a8" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>

          <linearGradient id="c-gem" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5d0fe" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>

        {/* Chest Base Pedestal Tier (Solid Gold Tier) */}
        <ellipse cx="70" cy="104" rx="50" ry="13" fill="url(#c-gold)" />
        <ellipse cx="70" cy="100" rx="44" ry="10" fill="#ca8a04" />

        {/* Chest Lower Box Body */}
        <rect x="32" y="52" width="76" height="40" rx="6" fill="url(#c-purple)" stroke="#ca8a04" strokeWidth="2" />

        {/* Gold Corner Reinforcements */}
        <path d="M32 55 H43 V83 H32 Z" fill="url(#c-gold)" opacity="0.9" />
        <path d="M97 55 H108 V83 H97 Z" fill="url(#c-gold)" opacity="0.9" />
        <path d="M64 55 H76 V85 H64 Z" fill="url(#c-gold)" />

        {/* Chest Arched Lid */}
        <path
          d="M28 52 C28 28 45 20 70 20 C95 20 112 28 112 52 Z"
          fill="url(#c-purple)"
          stroke="url(#c-gold)"
          strokeWidth="3"
        />
        {/* Lid Gold Arches */}
        <path d="M34 52 C34 32 49 26 70 26 C91 26 106 32 106 52" fill="none" stroke="url(#c-gold)" strokeWidth="4.5" opacity="0.8" />
        <path d="M65 20 H75 V52 H65 Z" fill="url(#c-gold)" />

        {/* Glowing Faceted Crystal / Gem Clasp in Center */}
        <polygon points="70,44 78,51 70,60 62,51" fill="url(#c-gem)" stroke="#ffffff" strokeWidth="1.2" />
        <polygon points="70,46 75,50 70,56 65,50" fill="#ffffff" opacity="0.85" />
      </svg>

      {/* Stage 8 Stepped Milestone Disc with Lock & White "8" (matching reference) */}
      <div className="-mt-3.5 flex flex-col items-center z-30">
        <svg viewBox="0 0 70 42" className="w-[52px] h-[32px]" fill="none">
          <defs>
            <linearGradient id="ped-gold-disc" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="ped-gold-base" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ca8a04" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>

          {/* Stepped Cylinder Base */}
          <ellipse cx="35" cy="30" rx="30" ry="8" fill="url(#ped-gold-base)" />
          <path d="M7 20 C7 25 19 29 35 29 C51 29 63 25 63 20 L63 25 C63 30 51 34 35 34 C19 34 7 30 7 25 Z" fill="#92400e" />
          <ellipse cx="35" cy="20" rx="27" ry="7" fill="url(#ped-gold-disc)" stroke="#fef08a" strokeWidth="1" />

          {/* Golden Padlock Icon atop the disc */}
          <g transform="translate(30, 2)">
            <path d="M5 1a2.5 2.5 0 0 0-2.5 2.5V5H1.5A1.5 1.5 0 0 0 0 6.5v5A1.5 1.5 0 0 0 1.5 13h7A1.5 1.5 0 0 0 10 11.5v-5A1.5 1.5 0 0 0 8.5 5H7.5V3.5A2.5 2.5 0 0 0 5 1zm1.5 4h-3V3.5a1.5 1.5 0 0 1 3 0V5z" fill="#78350f" />
            <path d="M5 2a1.5 1.5 0 0 0-1.5 1.5V5h3V3.5A1.5 1.5 0 0 0 5 2z" fill="#fef08a" />
          </g>

          {/* Bold White Stage Number "8" */}
          <text
            x="35"
            y="24"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="14"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }}
          >
            8
          </text>
        </svg>
      </div>
    </div>
  );
}

// 5. Card Thumbnail Icons (matching reference artwork)
export function StageThumbnailIcon({ type = 'gift', className = 'w-5 h-5' }) {
  switch (type) {
    case 'gift':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-3-3c-1.4 0-2.57.96-2.88 2.26L12 5.5l-.12-1.24A3.003 3.003 0 0 0 9 2a3 3 0 0 0-3 3c0 .35.07.69.18 1H4a2 2 0 0 0-2 2v3h20V8a2 2 0 0 0-2-2zm-9-1c0-.55.45-1 1-1s1 .45 1 1v1h-2V5zm-4 0c0-.55.45-1 1-1s1 .45 1 1v1H7V5zM3 13v7a2 2 0 0 0 2 2h6v-9H3zm10 9h6a2 2 0 0 0 2-2v-7h-8v9z" />
        </svg>
      );
    case 'lightning':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M11 21h-1l1-7H7.5c-.88 0-1.33-1.07-.71-1.7l7-9.5c.57-.77 1.71-.37 1.71.59v6.61h3.5c.88 0 1.33 1.07.71 1.7l-7 9.3z" />
        </svg>
      );
    case 'coins':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <ellipse cx="8" cy="8" rx="6" ry="3" />
          <path d="M2 8v3c0 1.66 2.69 3 6 3s6-1.34 6-3V8" />
          <path d="M2 14v3c0 1.66 2.69 3 6 3s6-1.34 6-3v-3" />
          <path d="M12 11c1.33.64 3.03 1 5 1 3.31 0 6-1.34 6-3V6" />
          <path d="M17 12v3c0 1.66-2.69 3-6 3" />
        </svg>
      );
    case 'bag':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M19 6h-3V5a4 4 0 0 0-8 0v1H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-9-1a2 2 0 0 1 4 0v1h-4V5zm10 15H4V8h16v12z" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      );
    case 'shirt':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#7c3aed">
          <path d="M15.5 3c-.4 1.2-1.5 2-2.8 2s-2.4-.8-2.8-2L4.5 5.5l1.8 4.5 2.7-.9V21h10V9.1l2.7.9 1.8-4.5L15.5 3z" />
        </svg>
      );
    case 'gold-coins':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#eab308">
          <circle cx="8" cy="8" r="6" />
          <circle cx="15" cy="14" r="6" />
        </svg>
      );
    case 'crown-chest':
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#eab308">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z" />
        </svg>
      );
  }
}

// 6. Daisy Blossom Flowers for the Grass Landscape
export function DaisyFlower({ className = '' }) {
  return (
    <svg viewBox="0 0 32 32" className={`w-3.5 h-3.5 ${className}`} fill="none">
      <circle cx="16" cy="7" r="4.5" fill="#ffffff" />
      <circle cx="16" cy="25" r="4.5" fill="#ffffff" />
      <circle cx="7" cy="16" r="4.5" fill="#ffffff" />
      <circle cx="25" cy="16" r="4.5" fill="#ffffff" />
      <circle cx="9.5" cy="9.5" r="4.5" fill="#ffffff" />
      <circle cx="22.5" cy="22.5" r="4.5" fill="#ffffff" />
      <circle cx="9.5" cy="22.5" r="4.5" fill="#ffffff" />
      <circle cx="22.5" cy="9.5" r="4.5" fill="#ffffff" />
      <circle cx="16" cy="16" r="5" fill="#facc15" stroke="#eab308" strokeWidth="1" />
    </svg>
  );
}
