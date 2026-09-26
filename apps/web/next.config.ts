import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@postn/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "postind.xyz" }],
        destination: "https://www.postind.xyz/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
