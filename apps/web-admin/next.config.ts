import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Optimizaciones para producción
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  
  // Output standalone para Docker/Railway
  output: 'standalone',
};

export default nextConfig;
