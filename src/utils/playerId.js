/**
 * Arena Player Identification & Guest ID Utility
 * Generates and formats player IDs in the format: Guest001, Guest002, Guest003...
 * Designed for 200+ concurrent mobile attendees with offline device persistence.
 */

const STORAGE_KEY = 'arena_guest_id';

/**
 * Formats a numeric value or ID string into standardized "Guest001" format (3-digit minimum padding).
 * Example: 1 -> "Guest001", 42 -> "Guest042", 215 -> "Guest215"
 */
export function formatGuestId(number) {
  const parsed = parseInt(number, 10);
  if (isNaN(parsed) || parsed < 0) return 'Guest001';
  return `Guest${String(parsed).padStart(3, '0')}`;
}

/**
 * Generates a random guest ID between min and max (inclusive).
 * Default range 1 to 500 comfortably accommodates 200+ attendees with low collision probability.
 */
export function generateRandomGuestId(min = 1, max = 500) {
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  return formatGuestId(randomNum);
}

/**
 * Normalizes any incoming player code, legacy ID, or raw number into "Guest001" standard format.
 * Examples:
 *   "5" -> "Guest005"
 *   "guest23" -> "Guest023"
 *   "AR-104" -> "Guest104"
 *   "Guest001" -> "Guest001"
 */
export function formatPlayerId(code, fallback = 'Guest001') {
  if (!code) return fallback;
  const str = String(code).trim();

  // If already matching exact Guest + digits format, ensure 3-digit padding
  const guestMatch = str.match(/^guest[ -_]?(\d+)$/i);
  if (guestMatch) {
    return formatGuestId(guestMatch[1]);
  }

  // If it's a numeric string or contains digits at the end
  const digitsMatch = str.match(/(\d+)/);
  if (digitsMatch) {
    return formatGuestId(digitsMatch[1]);
  }

  return fallback;
}

/**
 * Gets or assigns a persistent Guest ID on the attendee's mobile device.
 * Checks localStorage / sessionStorage so refreshing the mobile browser doesn't change the player's identity.
 */
export function getOrAssignPlayerId() {
  if (typeof window === 'undefined') return 'Guest001';

  try {
    let storedId = window.localStorage.getItem(STORAGE_KEY) || window.sessionStorage.getItem(STORAGE_KEY);
    if (!storedId) {
      storedId = generateRandomGuestId();
      window.localStorage.setItem(STORAGE_KEY, storedId);
      window.sessionStorage.setItem(STORAGE_KEY, storedId);
    }
    return formatPlayerId(storedId);
  } catch {
    return generateRandomGuestId();
  }
}

/**
 * Clears or resets the local guest ID (useful for testing or switching users).
 */
export function resetLocalPlayerId() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[PlayerID] Unable to clear stored player ID:', err);
  }
}

// Aliased for backwards compatibility with any lingering components
export const formatPatientId = formatPlayerId;

export default formatPlayerId;
