/** @type {imconst nextConfig = {
  reactStrictMode: false, // Temporarily disabled to debug webpack errors
  // swcMinify was removed in Next 13+; removing to avoid warnings
  images: { domains: [], unoptimized: true },
  // Don't use standalone output - we'll use regular build with custom server
  // output: 'standalone',
  // In CI builds (Railway/Vercel), don't fail on lint or TS; we already run these in prebuild locally
  eslint: { ignoreDuringBuilds: isCI },
  typescript: { ignoreBuildErrors: isCI },t').NextConfig} */
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

const nextConfig = {
  reactStrictMode: false, // Temporarily disabled to debug webpack errors
  // swcMinify was removed in Next 13+; removing to avoid warnings
  images: { domains: [], unoptimized: true },
  // Use Node server output; disable static export due to dynamic routes
  output: 'standalone',
  // In CI builds (Railway/Vercel), don’t fail on lint or TS; we already run these in prebuild locally
  eslint: { ignoreDuringBuilds: isCI },
  typescript: { ignoreBuildErrors: isCI },
  webpack: (config, { dev, isServer }) => {
    // Suppress webpack warnings in development
    if (dev && !isServer) {
      config.stats = 'errors-warnings';
    }
    // Avoid disk pressure in CI
    if (process.env.CI === 'true') {
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    // Prefer same-origin to avoid CORS; only rewrite if explicit external API_URL is provided.
    if (API_URL) {
      return [
        { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
        { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
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

module.exports = nextConfig;
