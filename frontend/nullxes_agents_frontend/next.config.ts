import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lab.anam.ai",
      },
      {
        protocol: "https",
        hostname: "newgxnc1uqs0jnqm.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
}

export default nextConfig
