const os = require('os');

function getPrivateLanIpv4() {
  const ifaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        const ip = net.address;
        const is10 = /^10\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
        const is172 = /^172\.(1[6-9]|2\d|3[01])\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
        const is192 = /^192\.168\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
        if (is10 || is172 || is192) {
          addresses.push({ interface: name, address: ip });
        }
      }
    }
  }
  return addresses;
}

const lanIps = getPrivateLanIpv4();
const primaryLanIp = lanIps[0]?.address || '127.0.0.1';

console.log('\n' + '='.repeat(72));
console.log('  📡 AMS — Local Area Network (LAN) Server');
console.log('='.repeat(72));
console.log('  Local Server:    http://localhost:3000');
if (lanIps.length > 0) {
  lanIps.forEach(({ interface: iface, address }) => {
    console.log(`  LAN URL (${iface}):   http://${address}:3000`);
  });
  console.log('\n  📱 Demonstration on Same Wi-Fi / Hotspot:');
  console.log(`  Open this URL on iPhone or other laptops: http://${primaryLanIp}:3000`);
} else {
  console.log('  ⚠️  No active private Wi-Fi/LAN IPv4 interface detected.');
  console.log('  Ensure Wi-Fi is connected or iPhone Hotspot is active.');
}
console.log('='.repeat(72) + '\n');

