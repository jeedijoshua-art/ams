import os from 'os';

/**
 * Dynamically detects the primary private IPv4 address for local network access.
 * Supports standard RFC 1918 private subnets: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.
 */
export function getLanIp(): string {
  const ifaces = os.networkInterfaces();
  // Prioritize active Wi-Fi (en0 on macOS, wlan0 on Linux)
  const preferredInterfaces = ['en0', 'wlan0', 'wi-fi', 'eth0'];

  for (const ifaceName of preferredInterfaces) {
    const list = ifaces[ifaceName];
    if (list) {
      for (const net of list) {
        if (net.family === 'IPv4' && !net.internal) {
          const ip = net.address;
          if (isPrivateIpv4(ip)) return ip;
        }
      }
    }
  }

  // Fallback to any active non-internal private IPv4 interface
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        const ip = net.address;
        if (isPrivateIpv4(ip)) return ip;
      }
    }
  }

  return 'localhost';
}

function isPrivateIpv4(ip: string): boolean {
  const is10 = /^10\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
  const is172 = /^172\.(1[6-9]|2\d|3[01])\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
  const is192 = /^192\.168\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
  return is10 || is172 || is192;
}

export function getLanUrl(port = 3000, protocol = 'http'): string {
  const ip = getLanIp();
  return `${protocol}://${ip}:${port}`;
}
