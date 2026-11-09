/**
 * Player Identification & Dual-Layer Persistence for Arena Live Game.
 * Combines localStorage + 12-Hour Persistent Cookie for bulletproof mobile resilience.
 * Stores ONLY identity credentials (Guest ID & Device UUID).
 * All scores, leaderboard rankings, and game state live exclusively in PostgreSQL.
 */

const TWELVE_HOURS_SEC = 12 * 60 * 60; // 43,200 seconds
const TWELVE_HOURS_MS = TWELVE_HOURS_SEC * 1000;

const STORAGE_KEY_GUEST = 'arena_guest_id';
const STORAGE_KEY_DEVICE = 'arena_device_id';
const STORAGE_KEY_EXPIRES = 'arena_expires_at';

// Helper to read a cookie value
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Helper to write a 12-hour persistent cookie
export function setCookie(name, value, maxAge = TWELVE_HOURS_SEC) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

// Clears credentials when 12 hours expire or user leaves
export function clearLocalPlayerData() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_GUEST);
    window.localStorage.removeItem(STORAGE_KEY_DEVICE);
    window.localStorage.removeItem(STORAGE_KEY_EXPIRES);

    // Expire cookies immediately
    setCookie(STORAGE_KEY_GUEST, '', 0);
    setCookie(STORAGE_KEY_DEVICE, '', 0);
  } catch (err) {
    console.warn('[PlayerID] Error clearing player data:', err);
  }
}

// Formats number to standardized 3-digit padded string: 1 -> "Guest001", 42 -> "Guest042"
export function formatGuestId(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 1) return 'Guest001';
  return `Guest${String(n).padStart(3, '0')}`;
}

/**
 * Returns a stable unique device UUID for the attendee's smartphone.
 * Synced across localStorage and 12-hour cookie.
 */
export function getDeviceId() {
  if (typeof window === 'undefined') return 'device-server';

  // Check 12-hour TTL expiration
  const expiry = window.localStorage.getItem(STORAGE_KEY_EXPIRES);
  if (expiry && Date.now() > Number(expiry)) {
    clearLocalPlayerData();
  }

  let deviceId = window.localStorage.getItem(STORAGE_KEY_DEVICE) || getCookie(STORAGE_KEY_DEVICE);
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  }

  // Cross-mirror to both layers with 12-hour lifetime
  try {
    const expiresAt = String(Date.now() + TWELVE_HOURS_MS);
    window.localStorage.setItem(STORAGE_KEY_DEVICE, deviceId);
    window.localStorage.setItem(STORAGE_KEY_EXPIRES, expiresAt);
    setCookie(STORAGE_KEY_DEVICE, deviceId, TWELVE_HOURS_SEC);
  } catch (err) {
    console.warn('[PlayerID] Storage write error:', err);
  }

  return deviceId;
}

/**
 * Retrieves the attendee's assigned Guest ID from either localStorage or 12-hour Cookie.
 * Automatically clears if older than 12 hours.
 */
export function getPlayerId() {
  if (typeof window === 'undefined') return 'Guest001';

  // Enforce 12-hour TTL expiration check on localStorage
  const expiry = window.localStorage.getItem(STORAGE_KEY_EXPIRES);
  if (expiry && Date.now() > Number(expiry)) {
    clearLocalPlayerData();
    return null;
  }

  let guestId = window.localStorage.getItem(STORAGE_KEY_GUEST) || getCookie(STORAGE_KEY_GUEST);

  if (guestId) {
    try {
      window.localStorage.setItem(STORAGE_KEY_GUEST, guestId);
      setCookie(STORAGE_KEY_GUEST, guestId, TWELVE_HOURS_SEC);
    } catch {}
    return guestId;
  }

  return null;
}

/**
 * Saves ONLY the assigned Guest ID to localStorage and 12-hour Cookie.
 * (No scores or game bodies are stored on the client).
 */
export function savePlayerRecord(player) {
  if (typeof window === 'undefined' || !player) return;

  try {
    const guestId = player.guest_id || player.name;
    const expiresAt = String(Date.now() + TWELVE_HOURS_MS);

    window.localStorage.setItem(STORAGE_KEY_GUEST, guestId);
    window.localStorage.setItem(STORAGE_KEY_EXPIRES, expiresAt);

    setCookie(STORAGE_KEY_GUEST, guestId, TWELVE_HOURS_SEC);
  } catch (err) {
    console.warn('[PlayerID] Unable to persist guest ID:', err);
  }
}

// Backwards-compatible aliases
export const formatPlayerId = formatGuestId;
export const formatPatientId = formatGuestId;
export const getOrAssignPlayerId = getPlayerId;

export default getPlayerId;
