import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Optimizaciones para producción
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  
  // Proxy para modelos de InsightFace desde HuggingFace
  async rewrites() {
    return [
      {
        source: '/hf-models/:path*',
        destination: 'https://huggingface.co/InventAgency/insightface-models/resolve/main/:path*',
      },
    ];
  },
};

export default nextConfig;
