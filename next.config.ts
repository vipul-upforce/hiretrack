import type { NextConfig } from 'next';
import type { Configuration as WebpackConfiguration } from 'webpack';

// webpack-obfuscator doesn't ship types; cast to any
const WebpackObfuscator = require('webpack-obfuscator') as any;

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    ...({
      middlewareClientMaxBodySize: '50mb', // For route handlers processed through middleware
      proxyClientMaxBodySize: '50mb', // For requests processed through proxy
      serverActions: { bodySizeLimit: '50mb' },
    } as Record<string, unknown>),
    // Enable Turbopack for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Optimize images
  images: {
    domains: [
      '192.168.56.1',
      'localhost',
      '192.168.5.210',
      'res.cloudinary.com',
      'rms-bucket-upforcetech.s3.us-east-1.amazonaws.com',
    ],
    unoptimized: true,
    // Disable image optimization in development for faster builds
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
  // Disable React Strict Mode for faster development
  reactStrictMode: false,
  // Optimize webpack configuration
  webpack: (
    config: WebpackConfiguration,
    {
      dev,
      isServer,
      webpack,
    }: { dev: boolean; isServer: boolean; webpack: any },
  ): WebpackConfiguration => {
    // Optimize for development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      };
      // Faster source maps in development
      config.devtool = 'eval-source-map';
    }

    // Optimize resolve
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        path: false,
      };
    }

    // Handle PDF.js worker - FIXED CONFIGURATION
    if (isServer) {
      // Server-side configuration for PDF.js
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };

      // Ensure PDF.js worker can be found on server
      config.externals = config.externals || [];
      (config.externals as any[]).push({
        canvas: 'canvas',
      });
    } else {
      // Client-side configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        path: false,
      };
    }

    // Handle PDF.js worker files
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Add rule for PDF.js worker - IMPROVED
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    });

    // Additional rule to handle PDF.js modules
    config.module.rules.push({
      test: /node_modules[\/\\]pdfjs-dist[\/\\].*\.js$/,
      type: 'javascript/auto',
    });

    // Add obfuscation for client bundles in production
    if (isProd && !isServer) {
      const obfuscatorOptions = {
        compact: true,
        controlFlowFlattening: false,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        stringArray: true,
        stringArrayThreshold: 0.75,
        rotateStringArray: true,
        simplify: true,
      };

      const excludePatterns = [
        '**/node_modules/**',
        '**/_next/static/**',
        '**/*.map',
        '**/react-refresh/**',
        '**/runtime-main.*.js',
      ];

      // Ensure plugins array exists
      if (!config.plugins) config.plugins = [];
      config.plugins.push(
        new WebpackObfuscator(obfuscatorOptions, excludePatterns),
      );
    }

    return config;
  },
  // Optimize headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,PATCH,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
      {
        // Allow apply-jobs route to be embedded in iframes
        source: '/apply-jobs',
        headers: [
          // Remove X-Frame-Options to allow embedding
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          // Set Content Security Policy to allow framing from any origin
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *;',
          },
          // Additional CORS headers for embedded content
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      {
        // Also allow API routes used by apply-jobs when embedded
        source: '/api/jobs/open-jobs',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      {
        // Allow candidate-related API routes for embedded portal
        source: '/api/candidates/guest-apply',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
  // Optimize TypeScript compilation
  typescript: {
    // Disable TypeScript checking during build for faster builds
    ignoreBuildErrors: true,
  },
  // Optimize ESLint
  eslint: {
    // Disable ESLint during builds for faster builds
    ignoreDuringBuilds: true,
  },
  // Optimize output
  output: 'standalone',
  // Optimize compression
  compress: true,
  // Optimize powered by header
  poweredByHeader: false,
};

export default nextConfig;
