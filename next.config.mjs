/** @type {import('next').NextConfig} */
const previewOrigins = process.env.BASE44_PREVIEW_MODE === '1' && process.env.BASE44_PUBLIC_HOST_SUFFIX
  ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
  : [];

const nextConfig = {
  reactStrictMode: true,

  // Only set in the Base44 sandbox preview, where the dev server is reached
  // through a proxied host. Empty everywhere else.
  allowedDevOrigins: previewOrigins,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async redirects() {
    return [
      // Legacy static-host URLs
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/login.html', destination: '/login', permanent: true },
      { source: '/about.html', destination: '/about', permanent: true },
      { source: '/bulletin.html', destination: '/bulletin', permanent: true },
      { source: '/calendar.html', destination: '/calendar', permanent: true },
      { source: '/community.html', destination: '/community', permanent: true },
      { source: '/zine.html', destination: '/zines', permanent: true },
      { source: '/admin-login.html', destination: '/admin-login', permanent: true },
      { source: '/organizing.html', destination: '/organizing', permanent: true },
      { source: '/education.html', destination: '/education', permanent: true },
      { source: '/care.html', destination: '/care', permanent: true },
      { source: '/privacy.html', destination: '/privacy', permanent: true },
      { source: '/terms.html', destination: '/terms', permanent: true },
      { source: '/accessibility.html', destination: '/accessibility', permanent: true },
      // Consolidated routes
      { source: '/events', destination: '/calendar', permanent: true },
      { source: '/shop/success', destination: '/donate', permanent: true },
      { source: '/chatroom-spec', destination: '/chat', permanent: true },
    ];
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js hydration uses inline scripts and styles.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      // Firebase Storage hosts uploaded images; data:/blob: cover local previews.
      "img-src 'self' data: blob: https://storage.googleapis.com",
      // All Firestore/Auth calls are server-side only, so connect-src is 'self'.
      "connect-src 'self'",
      "font-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    const memberPaths = [
      '/admin/:path*',
      '/ai-chat/:path*',
      '/archive/:path*',
      '/bulletin/:path*',
      '/calendar/:path*',
      '/care/:path*',
      '/chat/:path*',
      '/community/:path*',
      '/education/:path*',
      '/organizing/:path*',
      '/shop/:path*',
      '/zines/:path*',
    ];

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      ...memberPaths.map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
};

export default nextConfig;
