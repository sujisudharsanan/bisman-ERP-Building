/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL 
  || process.env.NEXT_PUBLIC_API_BASE 
  || process.env.NEXT_PUBLIC_API_BASE_URL 
  || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  // swcMinify was removed in Next 13+; removing to avoid warnings
  images: { domains: [] },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
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
