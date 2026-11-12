const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const PUBLIC_API = new URL(process.env.NEXT_PUBLIC_API_URL || API_URL);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Default the public API URL to API_URL (so local dev works without a .env.local)
  env: { NEXT_PUBLIC_API_URL: (process.env.NEXT_PUBLIC_API_URL || API_URL).replace(/\/$/, '') },
  compress: true,
  images: {
    remotePatterns: [
      { protocol: PUBLIC_API.protocol.replace(':', ''), hostname: PUBLIC_API.hostname, port: PUBLIC_API.port, pathname: '/uploads/**' },
    ],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600],
    imageSizes: [48, 64, 96, 128, 200, 256, 320],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // The browser talks to the API through this site (no CORS, one domain)
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
};

export default nextConfig;
