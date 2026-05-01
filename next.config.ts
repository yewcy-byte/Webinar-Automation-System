import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-id.cloudfront.net', // Replace with your actual CF domain
        port: '',
        pathname: '/**',
      },
    ],
  },

  
};






export default nextConfig;


