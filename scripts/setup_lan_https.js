/* eslint-disable @typescript-eslint/no-require-imports */
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Ensure cert directories exist
const certsDir = path.join(__dirname, '..', 'certs');
const legacyCertsDir = path.join(__dirname, '..', 'certificates');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });
if (!fs.existsSync(legacyCertsDir)) fs.mkdirSync(legacyCertsDir, { recursive: true });

const certFile = path.join(certsDir, 'lan-cert.pem');
const keyFile = path.join(certsDir, 'lan-key.pem');

// 1. Detect LAN IP
const lanIps = getPrivateLanIpv4();
const primaryLanIp = lanIps[0]?.address || '127.0.0.1';
const allIps = ['127.0.0.1', ...lanIps.map(l => l.address)];
const uniqueIps = Array.from(new Set(allIps));

// 2. Discover / Verify mkcert CAROOT
let caRoot = '';
let caCertPath = '';
try {
  caRoot = execSync('mkcert -CAROOT', { encoding: 'utf8' }).trim();
  caCertPath = path.join(caRoot, 'rootCA.pem');
} catch (e) {
  console.warn('⚠️  mkcert not found or -CAROOT failed. Ensure mkcert is installed via Homebrew.');
}

// 3. Ensure local CA exists
if (caRoot && !fs.existsSync(caCertPath)) {
  try {
    execSync('mkcert -install', { stdio: 'inherit' });
  } catch (e) {
    // If sudo was needed, CA files may still be created
  }
}

// 4. Ensure rootCA is trusted in macOS user login keychain
if (fs.existsSync(caCertPath) && process.platform === 'darwin') {
  try {
    const homeDir = os.homedir();
    const loginKeychain = path.join(homeDir, 'Library/Keychains/login.keychain-db');
    execSync(`security add-certificate -k "${loginKeychain}" "${caCertPath}" 2>/dev/null || true`);
    execSync(`security add-trusted-cert -r trustRoot -p ssl -k "${loginKeychain}" "${caCertPath}" 2>/dev/null || true`);
  } catch (e) {
    // Non-fatal if already trusted
  }
}

// 5. Check if existing certificate matches current LAN IP and is valid
let needsRegeneration = true;
if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
  try {
    // Check expiration (> 1 day left)
    execSync(`openssl x509 -checkend 86400 -noout -in "${certFile}"`, { stdio: 'pipe' });

    // Check if current primary LAN IP matches cert
    let allMatch = true;
    for (const ip of lanIps.map(l => l.address)) {
      try {
        execSync(`openssl x509 -checkip "${ip}" -noout -in "${certFile}"`, { stdio: 'pipe' });
      } catch (err) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      needsRegeneration = false;
    }
  } catch (e) {
    needsRegeneration = true;
  }
}

// 6. Generate or regenerate certificate using mkcert
if (needsRegeneration) {
  console.log(`\n🔄 Generating trusted TLS certificate for LAN IP(s): ${uniqueIps.join(', ')} ...`);
  const hostArgs = ['localhost', ...uniqueIps].join(' ');
  try {
    execSync(`mkcert -cert-file "${certFile}" -key-file "${keyFile}" ${hostArgs}`, { stdio: 'inherit' });
    // Also copy to legacy certificates folder for backward compatibility
    fs.copyFileSync(certFile, path.join(legacyCertsDir, 'lan-cert.pem'));
    fs.copyFileSync(keyFile, path.join(legacyCertsDir, 'lan-key.pem'));
  } catch (err) {
    console.error('❌ mkcert generation failed, falling back to openssl SAN...', err.message);
    const sanEntries = ['DNS:localhost', ...uniqueIps.map(ip => `IP:${ip}`)].join(',');
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=AMS Local LAN Server" -days 365 -keyout "${keyFile}" -out "${certFile}" -addext "subjectAltName=${sanEntries}"`,
      { stdio: 'pipe' }
    );
    fs.copyFileSync(certFile, path.join(legacyCertsDir, 'lan-cert.pem'));
    fs.copyFileSync(keyFile, path.join(legacyCertsDir, 'lan-key.pem'));
  }
}

// 7. Strictly protect and isolate rootCA.pem / rootCA-key.pem
// Never expose rootCA-key.pem. Copy ONLY rootCA.pem to certs/ for mobile distribution.
const distCaCert = path.join(certsDir, 'rootCA.pem');
if (fs.existsSync(caCertPath)) {
  fs.copyFileSync(caCertPath, distCaCert);
  fs.chmodSync(distCaCert, 0o644);
}
// Guard: NEVER allow rootCA-key.pem in certs/
const forbiddenKey = path.join(certsDir, 'rootCA-key.pem');
if (fs.existsSync(forbiddenKey)) {
  fs.unlinkSync(forbiddenKey);
}

// 8. Output summary
console.log('\n' + '='.repeat(74));
console.log('  🔒 AMS — Trusted Local Area Network (LAN) HTTPS Server');
console.log('='.repeat(74));
console.log(`  Local Server:         https://localhost:3000`);
if (lanIps.length > 0) {
  lanIps.forEach(({ interface: iface, address }) => {
    console.log(`  LAN URL (${iface}):        https://${address}:3000`);
  });
}
console.log('\n  🔐 Trust & Certificate Verification:');
console.log(`  - Server Certificate:   ${certFile}`);
console.log(`  - Root CA Location:     ${caCertPath}`);
console.log(`  - Mobile Distribution:  ${distCaCert} (Share ONLY this public file)`);
console.log(`  - macOS Keychain:       Trusted in user login keychain (Safari & Chrome ready)`);

console.log('\n  📱 iPhone / iPad Setup (One-time, takes ~30 seconds):');
console.log(`  1. AirDrop '${distCaCert}' to your iPhone (or email it).`);
console.log(`  2. Open iPhone Settings -> tap 'Profile Downloaded' -> tap 'Install'.`);
console.log(`  3. Go to Settings -> General -> About -> Certificate Trust Settings.`);
console.log(`  4. Under 'Enable Full Trust For Root Certificates', toggle 'mkcert' ON.`);
console.log(`  5. Open Safari to https://${primaryLanIp}:3000 -> 100% Trusted, zero warnings!`);

console.log('\n  🤖 Android Setup:');
console.log(`  1. Transfer '${distCaCert}' to your phone via USB or Google Drive.`);
console.log(`  2. Go to Settings -> Security -> Encryption & Credentials -> Install a certificate -> CA certificate.`);
console.log(`  3. Select '${path.basename(distCaCert)}' and confirm.`);
console.log('='.repeat(74) + '\n');
