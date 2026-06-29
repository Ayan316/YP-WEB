import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // react-pdf (pdfjs-dist) optionally requires the native `canvas` module for
  // Node-side rendering; we only render PDFs client-side, so mark it external
  // to keep the bundler from trying to resolve it.
  serverExternalPackages: ["canvas"],
  images: {
    // domains: ["34.41.203.136", "34.42.218.255"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "youngprofessionals.global",
      },
      {
        protocol: "https",
        hostname: "admin.youngprofessionals.global",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      }
    ]
  },
};

export default nextConfig;
