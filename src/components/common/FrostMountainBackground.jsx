import React from 'react';

/**
 * FrostMountainBackground
 * =======================
 * Ultra-Lightweight (18.4 KB), High-Fidelity App-Wide Background
 *
 * Supports two viewport modes:
 * 1. Fullscreen (clampToBars=false): For Onboarding/Login and Loading screens.
 * 2. Bottom-Clamped Viewport (clampToBars=true):
 *    Expands continuously behind the top navigation bar (top-0) so the frosted
 *    header blurs the mountain peaks, while clamping strictly above the mobile
 *    bottom tab bar (bottom=64px, md:bottom=0) to keep all bottom crystals visible.
 */
export const FrostMountainBackground = React.memo(function FrostMountainBackground({
  hasSidebar = false,
  clampToBars = false,
  clampTop = false,
  clampBottom = clampToBars,
  className = '',
}) {
  const sidebarClasses = hasSidebar ? 'md:left-60 lg:left-64' : '';
  const viewportBounds = `${clampTop ? 'top-[48px] sm:top-[52px]' : 'top-0'} ${
    clampBottom ? 'bottom-[64px] md:bottom-0' : 'bottom-0'
  }`;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 ${sidebarClasses} pointer-events-none select-none overflow-hidden z-0 ${className}`}
    >
      {/* Base Sky Tint Layer across entire area (including behind nav bars) */}
      <div className="absolute inset-0 bg-[#e4f0fa]" />

      {/* Unobscured Center Viewport for Complete Image Display */}
      <div className={`absolute left-0 right-0 ${viewportBounds} overflow-hidden`}>
        <picture className="w-full h-full block">
          <source srcSet="/images/arena-bg.webp" type="image/webp" />
          <img
            src="/images/arena-bg.jpg"
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover object-center pointer-events-none select-none will-change-transform"
          />
        </picture>
      </div>

      {/* Subtle Central Sky Glow to ensure razor-sharp card and text contrast */}
      <div className="absolute inset-0 bg-radial from-white/20 via-transparent to-transparent pointer-events-none" />
    </div>
  );
});

export default FrostMountainBackground;
