// Build version timestamp for local cache-busting on local venue network
export const BUILD_VERSION = "1.0.1";

/**
 * Offline & Local Network Asset URL Resolver
 * 
 * Optimized for offline venue Wi-Fi operation (zero external internet dependency).
 * Ensures all static assets resolve from local origin / bundled public paths.
 */
export function assetUrl(path) {
  if (!path) return "";

  // Data URIs, Blobs, and internal SVG hashes require no alteration
  if (path.startsWith("data:") || path.startsWith("blob:") || path.startsWith("#")) {
    return path;
  }

  // Warn if an external URL is used while running in offline event environment
  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (typeof window !== "undefined" && !window.location.host.includes("localhost") && !path.includes(window.location.host)) {
      console.warn(`[Asset Warning] External URL detected in offline environment: ${path}. External assets will fail without internet.`);
    }
    return path;
  }

  // Handle Vite base URL prefixing cleanly for local network hosting
  const baseUrl = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
  let cleanPath = path;

  if (cleanPath.startsWith("/") && baseUrl !== "/") {
    cleanPath = `${baseUrl.replace(/\/$/, "")}${cleanPath}`;
  }

  // Append local version query parameter to bust browser cache on local device reloads
  const separator = cleanPath.includes("?") ? "&" : "?";
  return `${cleanPath}${separator}v=${BUILD_VERSION}`;
}
