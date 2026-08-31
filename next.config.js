
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better error detection
  reactStrictMode: true,

  // Image optimization configuration
  images: {
    // Remote patterns for allowed image sources (Next.js 16+)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.tvinsider.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"], // Modern image formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production (keep error/warn)
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Experimental features for better performance
  experimental: {
    // Optimize imports for MUI (reduces bundle size)
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
  },

  // Turbopack configuration (Next.js 16+)
  turbopack: {},

  // Headers for security and caching
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Webpack configuration (advanced)
  webpack: (config, { isServer }) => {
    // Fixes for packages that don't work well with webpack
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Environment variables available in browser
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  // Powered by header (optional, remove for security)
  poweredByHeader: false,
};

// NOTE: this was previously wrapped in next-pwa. That plugin needs a standalone
// `webpack` module, which Next 16 (Turbopack) does not provide, so its hook
// never ran and no service worker was ever emitted — the app shipped without
// one. The service worker is now hand-authored at public/sw.js and registered
// by src/components/ServiceWorkerRegistrar.tsx.
export default nextConfig;
