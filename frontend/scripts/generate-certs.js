const fs = require('fs');
const path = require('path');
const os = require('os');
const selfsigned = require('selfsigned');

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;

    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses;
}

async function generateDevCertificates() {
  const certDir = path.join(__dirname, '..', 'certificates');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const certPath = path.join(certDir, 'dev-cert.pem');
  const keyPath = path.join(certDir, 'dev-key.pem');

  const lanIps = getLocalIpAddresses();
  console.log(`[CertGen] Detected LAN IPs: ${lanIps.join(', ') || 'none'}`);

  // Create Subject Alternative Names (SANs) for localhost, loopbacks, and all LAN IPs
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 2, value: '127.0.0.1' },
    { type: 7, ip: '127.0.0.1' },
    ...lanIps.map((ip) => ({ type: 7, ip })),
    ...lanIps.map((ip) => ({ type: 2, value: ip })),
  ];

  const attrs = [
    { name: 'commonName', value: lanIps[0] || 'localhost' },
    { name: 'organizationName', value: 'Smart Receptionist Local Dev' },
    { shortName: 'OU', value: 'AI Receptionist Voice Client' },
  ];

  console.log('[CertGen] Generating local TLS/HTTPS certificate with SANs...');
  const pems = await selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames,
      },
    ],
  });

  const certData = pems.cert || pems.certificate;
  const keyData = pems.private || pems.key || pems.clientKey;

  if (!certData || !keyData) {
    console.error('[CertGen] Unexpected pems format:', Object.keys(pems || {}));
    process.exit(1);
  }

  fs.writeFileSync(certPath, certData, 'utf8');
  fs.writeFileSync(keyPath, keyData, 'utf8');

  console.log(`[CertGen] ✓ Certificate written to: ${certPath}`);
  console.log(`[CertGen] ✓ Private Key written to: ${keyPath}`);
}

generateDevCertificates();
