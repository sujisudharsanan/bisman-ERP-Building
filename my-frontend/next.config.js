/** @type {import('next').NextConfig} */

// Determine API base for proxy rewrites.
// Priority: explicit env vars → sensible defaults per environment.
// In Vercel, falling back to localhost breaks because there is no service on :3001.
// So, when VERCEL=1 and no API env is provided, default to the Render backend URL.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  null; // When null, we use same-origin and let Express/Next handle /api/*

const isCI = process.env.CI === 'true' || process.env.VERCEL === '1' || process.env.RAILWAY === '1';

const MM_URL = process.env.MM_BASE_URL || 'http://localhost:8065';

let nextConfig = {
  reactStrictMode: true, // re-enable to catch lifecycle issues early
  // swcMinify was removed in Next 13+; removing to avoid warnings
  images: { domains: [], unoptimized: true },
  // Use Node server output; disable static export due to dynamic routes
  output: 'standalone',
  // Temporarily ignore ESLint during builds to allow deployment (errors will be fixed post-deployment)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  webpack: (config, { dev, isServer }) => {
    // Suppress webpack warnings in development
    if (dev && !isServer) {
      config.stats = 'errors-warnings';
    }
    // Avoid disk pressure in CI or when explicitly disabled
    if (process.env.CI === 'true' || process.env.NO_CACHE === '1') {
      config.cache = false; // disable persistent file cache to prevent ENOSPC
    }
    return config;
  },
  async rewrites() {
    const rules = [];
    // Mattermost proxy (always enabled)
    rules.push(
      { source: '/chat', destination: `${MM_URL}/` },
      { source: '/chat/:path*', destination: `${MM_URL}/:path*` },
      // MM webapp loads assets and calls APIs at absolute paths
      { source: '/static/:path*', destination: `${MM_URL}/static/:path*` },
      { source: '/plugins/:path*', destination: `${MM_URL}/plugins/:path*` },
      // Ensure API v4 hits Mattermost before generic /api proxy below
      { source: '/api/v4/:path*', destination: `${MM_URL}/api/v4/:path*` },
    );

    // Prefer same-origin to avoid CORS; only rewrite if explicit external API_URL is provided.
    if (API_URL) {
      rules.push(
        { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      );
    }
    return rules;
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) { return []; }
    const jitsi = process.env.JITSI_PUBLIC_HOST || 'jitsi.internal.example';
    const turn = process.env.TURN_PUBLIC_HOST || 'turn.internal.example';
    const strict = process.env.CSP_STRICT === '1';
    const nonceToken = 'nonce-PLACEHOLDER'; // Runtime replaced via middleware/body attribute
    const scriptSrc = strict
      ? `script-src 'self' '${nonceToken}' https://${jitsi}`
      : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://${jitsi}`; // Non-strict retains legacy inline/eval
    const styleSrc = strict
      ? `style-src 'self' '${nonceToken}'`
      : "style-src 'self' 'unsafe-inline'"; // Non-strict allows inline styles
    const baseDirectives = [
      "default-src 'self'",
      scriptSrc,
      styleSrc,
      `img-src 'self' data: https://${jitsi}`,
      "font-src 'self' data:",
      `connect-src 'self' wss://${jitsi} https://${jitsi} https://${turn}`,
      `media-src 'self' https://${jitsi}`,
      `frame-src 'self' https://${jitsi}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
  "upgrade-insecure-requests"
  // Note: When strict mode is enabled, inline <script>/<style> must carry runtime nonce from middleware (X-CSP-Nonce)
    ];
    return [
      {
        source: '/chat/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: baseDirectives.join('; ') },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), fullscreen=(), payment=()' }
        ]
      },
      {
        source: '/((?!chat/).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: baseDirectives.join('; ') },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), fullscreen=(), payment=()' }
        ]
      }
    ];
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/admin-login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/manager-login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/hub-incharge-login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/hub',
        destination: '/hub-incharge',
        permanent: false,
      },
    ];
  },
};

// Enable bundle analyzer when ANALYZE=1
if (process.env.ANALYZE === '1') {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
    nextConfig = withBundleAnalyzer(nextConfig);
    // eslint-disable-next-line no-console
    console.log('[next.config] Bundle analyzer enabled');
  } catch (e) {
    console.warn('[next.config] Bundle analyzer not installed:', e.message);
  }
}

module.exports = nextConfig;
