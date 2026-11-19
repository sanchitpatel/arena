/**
 * Arena — Cloudflare Edge Worker
 * Handles static asset delivery, SPA client routing fallback,
 * caching headers, and edge health checks for arena.bmiil.com.
 */

// Safely fetch static asset from env.ASSETS, following internal redirects
async function fetchAssetSafe(env, request, pathname) {
  const targetUrl = new URL(pathname, request.url);
  let res = await env.ASSETS.fetch(new Request(targetUrl.toString(), request));

  // If Cloudflare static asset engine returns a 3xx redirect (e.g. trailing slash normalization)
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) {
      const followUrl = new URL(location, request.url);
      res = await env.ASSETS.fetch(new Request(followUrl.toString(), request));
    }
  }
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // =========================================================
    // 1. HEALTHCHECK ENDPOINT (/api/health)
    // =========================================================
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          service: "arena-edge",
          domain: "arena.bmiil.com",
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate"
          }
        }
      );
    }

    // =========================================================
    // 2. STATIC ASSETS & SPA ROUTING VIA env.ASSETS
    // =========================================================
    if (env?.ASSETS) {
      const pathname = url.pathname;
      const isStaticFile = pathname.includes(".") || pathname.startsWith("/assets/") || pathname.startsWith("/fonts/") || pathname.startsWith("/images/");

      // Try fetching requested asset directly
      let response = await env.ASSETS.fetch(request);

      // If requested a clean route without file extension (e.g. /leaderboard, /arena, /live, /profile)
      // and asset was not found, serve SPA root index.html
      if ((!response.ok || response.status === 404) && !isStaticFile) {
        let spaResponse = await fetchAssetSafe(env, request, "/index.html");
        if (!spaResponse.ok) {
          spaResponse = await fetchAssetSafe(env, request, "/");
        }

        if (spaResponse.ok) {
          const spaHeaders = new Headers(spaResponse.headers);
          spaHeaders.delete("location");
          spaHeaders.set("Content-Type", "text/html; charset=utf-8");
          spaHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
          // Security Headers
          spaHeaders.set("X-Content-Type-Options", "nosniff");
          spaHeaders.set("X-Frame-Options", "SAMEORIGIN");
          spaHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

          return new Response(spaResponse.body, {
            status: 200,
            headers: spaHeaders
          });
        }
      }

      if (!response.ok) return response;

      // Caching & Security Headers Strategy
      const headers = new Headers(response.headers);
      const hasVersionQuery = url.searchParams.has("v");

      // 1. Immutable hashed Vite bundles & media assets (long-term cache)
      if (
        pathname.startsWith("/assets/") ||
        pathname.startsWith("/fonts/") ||
        hasVersionQuery ||
        pathname.match(/\.(mp3|mp4|webm|woff2?|ttf|eot)$/i)
      ) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      }
      // 2. Static images & avatars (1 day browser / 7 days edge)
      else if (pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
        headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
      }
      // 3. HTML, Service Worker & Manifest (instant revalidation for new deploys)
      else if (
        pathname === "/" ||
        pathname.endsWith(".html") ||
        pathname === "/sw.js" ||
        pathname === "/manifest.webmanifest" ||
        pathname === "/manifest.json"
      ) {
        headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      }

      // Security headers for all responses
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "SAMEORIGIN");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return new Response("Asset engine unavailable", { status: 503 });
  }
};
