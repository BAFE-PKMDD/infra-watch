import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nsfwjs", "@tensorflow/tfjs-node", "sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "abemis.bafe.gov.ph",
      },
      {
        protocol: "https",
        hostname: "storage.bafe.online",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
