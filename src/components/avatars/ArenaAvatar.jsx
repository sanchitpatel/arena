import React from 'react';

/**
 * Curated 30 Lorelei Hand-Picked Avatars (Baked offline into /avatars/{id}.svg)
 */
export const CURATED_AVATARS = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  num: i + 1,
  url: `/avatars/${i + 1}.svg`,
}));

const sizeClasses = {
  badge: 'w-7 h-7',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

/**
 * Universal ArenaAvatar Component
 * Renders local baked SVG avatars (1..30).
 */
export default function ArenaAvatar({ id = '1', size = 'md', className = '', alt = 'Player Avatar' }) {
  // Extract number if id is like "1", 1, "/avatars/1.svg", or fallback to 1
  let avatarNum = 1;
  if (typeof id === 'number') {
    avatarNum = id;
  } else if (typeof id === 'string') {
    const match = id.match(/\d+/);
    if (match) {
      avatarNum = parseInt(match[0], 10);
    }
  }

  // Constrain to available 1..30 range
  if (avatarNum < 1 || avatarNum > 30) {
    avatarNum = 1;
  }

  const avatarUrl = `/avatars/${avatarNum}.svg`;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none ${sizeClass} ${className}`}
    >
      <img
        src={avatarUrl}
        alt={alt}
        className="w-full h-full object-cover pointer-events-none"
        loading="lazy"
        onError={(e) => {
          // Graceful fallback if file is somehow missing
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
