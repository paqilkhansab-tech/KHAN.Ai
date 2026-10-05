import type { NextConfig } from "next";

/**
 * KHAN security configuration
 * - Security headers on every route (CSP locked to self, no framing, no sniffing)
 * - X-Powered-By suppressed (do not reveal framework fingerprint)
 * - No browser source maps in production (do not ship source code)
 * - Cross-origin isolation headers (COOP/CORP) + legacy plug-in policy locked down
 * - Type errors fail the build (no silent broken deployments)
 */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // cross-origin isolation: other sites cannot frame/steal KHAN resources
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' is dev-only (Next.js HMR); production ships without it
      isProd
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  poweredByHeader: false, // security fix: never advertise Next.js
  productionBrowserSourceMaps: false, // security fix: no source code in the browser
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: false, // security fix: type errors must fail the build
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // public assets (logo etc.) — cache hard on the client + CDN
        source: "/:asset(logo.png|logo.svg|robots.txt|icon.png|apple-icon.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
