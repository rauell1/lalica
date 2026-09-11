import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Remote media images are always served through the same-origin
    // /api/media/[...] route, so no remote patterns are required for CMS
    // media. Keep the Vercel Blob public host allowed as a fallback for
    // direct public bucket URLs if an operator configures them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Include the company profile copy (served behind the approval-gated
  // download route) in the serverless function bundle.
  outputFileTracingIncludes: {
    "/downloads/**": ["./downloads/**"],
  },
  // Next 16: Turbopack is the default for dev and build.
  experimental: {
    // Server Actions body size: images are uploaded through dedicated
    // upload routes, not actions, so a modest limit is safe.
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
