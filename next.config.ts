import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // Allow development cross-origin HMR WebSocket and asset requests for LAN IP and ngrok tunnels
  allowedDevOrigins: [
    '172.20.10.3',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.app',
    '*.ngrok.io',
  ],
};

export default nextConfig;
