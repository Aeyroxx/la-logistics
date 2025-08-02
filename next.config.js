/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  async rewrites() {
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'http://localhost:3003' 
      : 'http://localhost:3003';
      
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  
  // Optimize for production deployment
  experimental: {
    serverComponentsExternalPackages: ['sqlite3'],
  },
  
  // Image optimization for logos/uploads
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3003',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;
