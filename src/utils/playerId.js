/**
 * Player identification for Arena live game.
 * Assigns each attendee a random ID: Guest001, Guest002, Guest003...
 * Persisted in browser localStorage so mobile reloads keep the same player.
 */

const STORAGE_KEY = 'arena_guest_id';

// Formats a number to 3-digit padded string: 1 -> "Guest001", 42 -> "Guest042"
export function formatGuestId(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 1) return 'Guest001';
  return `Guest${String(n).padStart(3, '0')}`;
}

// Generates a random Guest ID between min and max (e.g. Guest001 to Guest500)
export function generateGuestId(min = 1, max = 500) {
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  return formatGuestId(randomNum);
}

// Retrieves existing player ID from phone storage, or generates and saves a new one
export function getPlayerId() {
  if (typeof window === 'undefined') return 'Guest001';

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateGuestId();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

// Backwards-compatible aliases for existing callers
export const formatPlayerId = formatGuestId;
export const formatPatientId = formatGuestId;
export const getOrAssignPlayerId = getPlayerId;

export default getPlayerId;
