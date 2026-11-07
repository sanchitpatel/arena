/**
 * Normalizes and formats patient IDs with the "Cr-" prefix.
 * Converts legacy "PM-1003" or raw numbers "1003" into "Cr-1003".
 */
export const formatPatientId = (code, fallback = 'Cr-XXXX') => {
  if (!code) return fallback;
  const str = String(code).trim();
  if (/^(PM|CR|Cr)-/i.test(str)) {
    return str.replace(/^(PM|CR|Cr)-/i, 'Cr-');
  }
  if (/^\d+$/.test(str)) {
    return `Cr-${str}`;
  }
  return str;
};
