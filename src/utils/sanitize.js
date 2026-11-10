/**
 * Strict Input Sanitization & Normalization for Arena Player Handles
 * Prevents Stored XSS, script injection, HTML payloads, control characters,
 * and dangerous symbols from reaching PostgreSQL / Supabase or the live leaderboard.
 */

// Whitelist: letters, digits, spaces, hyphens, and underscores only
const SAFE_HANDLE_REGEX = /^[a-zA-Z0-9 _-]*$/;

/**
 * Normalizes input in real time on keystroke.
 * Strips disallowed characters immediately so users cannot even paste malicious scripts.
 */
export function normalizePlayerInput(raw) {
  if (!raw || typeof raw !== 'string') return '';

  return raw
    // Strip HTML/XML tags completely
    .replace(/<[^>]*>?/gm, '')
    // Strip dangerous scripting & injection characters
    .replace(/[<>'"`;()\/\\|$={}\[\]]/g, '')
    // Strip non-printable control characters & null bytes
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Collapse multiple consecutive whitespace into a single space
    .replace(/\s+/g, ' ')
    // Enforce 16 character limit
    .slice(0, 16);
}

/**
 * Validates the finalized handle before submitting to Supabase.
 */
export function validatePlayerHandle(handle, fallbackId = 'Guest001') {
  const trimmed = (handle || '').trim();

  // If empty, it's valid because we fall back to assigned sequential Guest ID
  if (!trimmed) {
    return { isValid: true, value: fallbackId, isCustom: false };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Username must be at least 2 characters', value: '' };
  }

  if (trimmed.length > 16) {
    return { isValid: false, error: 'Username cannot exceed 16 characters', value: '' };
  }

  if (!SAFE_HANDLE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, spaces, - and _',
      value: ''
    };
  }

  return { isValid: true, value: trimmed, isCustom: true };
}
