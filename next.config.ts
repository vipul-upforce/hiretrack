import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // remotePatterns: [
    //   {
    //     protocol: 'http',
    //     hostname: 'localhost',
    //     port: '3000', // Optional, specify if needed
    //     pathname: '/**', // Use this to allow all paths
    //   },
    //   {
    //     protocol: 'http',
    //     hostname: '192.168.5.210',
    //     port: '80', // Optional, specify if needed
    //     pathname: '/**',
    //   },
    //   {
    //     protocol: 'https',
    //     hostname: 'res.cloudinary.com',
    //     pathname: '/**',
    //   },
    //   {
    //     protocol: 'https',
    //     hostname: 'rms-bucket-upforcetech.s3.us-east-1.amazonaws.com',
    //     pathname: '/**',
    //   },
    // ],
    domains: ["localhost", "192.168.5.210", "res.cloudinary.com","rms-bucket-upforcetech.s3.us-east-1.amazonaws.com"],
  },
  async headers() {
    return [
        {
            // matching all API routes
            source: "/api/:path*",
            headers: [
                { key: "Access-Control-Allow-Credentials", value: "true" },
                { key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
                { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
            ]
        }
    ]
  },
};

export default nextConfig;
