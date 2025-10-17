/** @type {import('next').NextConfig} */
// Determine API base for proxy rewrites.
// Priority: explicit env vars → sensible defaults per environment.
// In Vercel, falling back to localhost breaks because there is no service on :3001.
// So, when VERCEL=1 and no API env is provided, default to the Render backend URL.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.VERCEL === '1'
    ? (process.env.RENDER_BACKEND_URL || 'https://bisman-erp-rr6f.onrender.com')
    : 'http://localhost:3001');

const nextConfig = {
  reactStrictMode: false, // Temporarily disabled to debug webpack errors
  // swcMinify was removed in Next 13+; removing to avoid warnings
  images: { domains: [] },
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
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://bisman-erp-rr6f.onrender.com/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
