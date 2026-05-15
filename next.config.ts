import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
  outputFileTracingIncludes: {
    "/api/generate-resume": ["./node_modules/@sparticuz/chromium/**/*"],
    "/api/generate-cover-letter": ["./node_modules/@sparticuz/chromium/**/*"],
    "/api/render-cover-letter-pdf": ["./node_modules/@sparticuz/chromium/**/*"],
    "/api/ats-fix-resume": ["./node_modules/@sparticuz/chromium/**/*"],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        ],
      },
    ]
  },
};

export default nextConfig;
