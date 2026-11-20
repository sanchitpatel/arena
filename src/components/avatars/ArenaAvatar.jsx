import React, { useState } from 'react';

/**
 * Curated 30 Lorelei Hand-Picked Avatars (Baked offline into /avatars/{id}.svg)
 */
export const CURATED_AVATARS = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  num: i + 1,
  url: `/avatars/${i + 1}.svg`,
}));

const sizeClasses = {
  badge: 'w-full h-full',
  xs: 'w-7 h-7',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

/**
 * Universal ArenaAvatar Component
 * 
 * Supports both:
 * 1. Curated vector avatars: id / avatarId = '1'..'30' -> renders `/avatars/{num}.svg`
 * 2. Custom Player Photos: id / avatarId = 'https://...' | 'blob:...' | 'data:...' -> renders photo with smooth object-cover fit
 */
export default function ArenaAvatar({
  id = '1',
  avatarId,
  size = 'md',
  className = '',
  alt = 'Player Avatar',
  fallback = '1',
}) {
  const [imgError, setImgError] = useState(false);

  // Normalize incoming identifier (handles both 'id' and 'avatarId' prop conventions)
  const rawValue = avatarId !== undefined && avatarId !== null ? avatarId : id;
  const rawString = String(rawValue || '').trim();

  // Detect whether this is a custom uploaded photo URL or a local curated SVG ID
  const isCustomPhoto =
    rawString.startsWith('http://') ||
    rawString.startsWith('https://') ||
    rawString.startsWith('blob:') ||
    rawString.startsWith('data:') ||
    rawString.startsWith('/storage/');

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Render Custom Uploaded Photo
  if (isCustomPhoto && !imgError) {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none bg-zinc-800/10 ${sizeClass} ${className}`}
      >
        <img
          src={rawString}
          alt={alt}
          className="w-full h-full object-cover pointer-events-none"
          loading="lazy"
          onError={() => {
            // Graceful fallback if cloud image fails to load (e.g. offline)
            setImgError(true);
          }}
        />
      </div>
    );
  }

  // Render Curated Vector SVG Avatar (1..30)
  let avatarNum = 1;
  if (typeof rawValue === 'number') {
    avatarNum = rawValue;
  } else if (typeof rawValue === 'string') {
    const match = rawString.match(/\d+/);
    if (match) {
      avatarNum = parseInt(match[0], 10);
    }
  }

  // Constrain to available 1..30 range
  if (avatarNum < 1 || avatarNum > 30) {
    avatarNum = 1;
  }

  const avatarUrl = `/avatars/${avatarNum}.svg`;

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
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
