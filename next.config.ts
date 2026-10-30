import type { NextConfig } from 'next';
import os from 'os';

function getLanDevOrigins(): string[] {
  const origins: string[] = ['localhost', '127.0.0.1'];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    const list = ifaces[name];
    if (!list) continue;
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) {
        origins.push(net.address);
        origins.push(`${net.address}:3000`);
      }
    }
  }
  return origins;
}

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // Allow development cross-origin HMR WebSocket and asset requests for LAN IP
  allowedDevOrigins: getLanDevOrigins(),
};

export default nextConfig;
