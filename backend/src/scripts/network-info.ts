import os from 'os';

export function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;

    for (const net of netList) {
      // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses;
}

function printNetworkInfo(): void {
  const ips = getLocalIpAddresses();
  const hostname = os.hostname();
  const primaryIp = ips[0] || '127.0.0.1';

  console.log('\n===============================================================');
  console.log('📡 SMART RECEPTIONIST: LOCAL NETWORK & MOBILE ACCESS DISCOVERY');
  console.log('===============================================================');
  console.log(`💻 Hostname: ${hostname}`);
  console.log(`🖥️  Platform: ${os.type()} ${os.release()} (${os.arch()})`);

  if (ips.length === 0) {
    console.log('\n⚠️  No active non-loopback IPv4 network interface detected.');
    console.log('   Ensure you are connected to a Wi-Fi or Ethernet network.');
  } else {
    console.log('\n🌐 Detected Local Network IP Addresses:');
    ips.forEach((ip, idx) => {
      console.log(`   [${idx + 1}] ${ip}`);
    });

    console.log('\n📱 Mobile Phone Access URLs (on same Wi-Fi network):');
    console.log(`   🔒 Secure HTTPS Voice Client (Recommended): https://${primaryIp}:3000/voice`);
    console.log(`   🌐 Standard HTTP Voice Client            : http://${primaryIp}:3000/voice`);
    console.log(`   📊 Main Dashboard Overview              : https://${primaryIp}:3000/dashboard`);
    console.log(`   ⚡ Backend REST API Engine (Proxied)     : https://${primaryIp}:3000/api/health`);
    console.log(`   🩺 Direct Backend Health Check           : http://${primaryIp}:5000/api/health`);
  }

  console.log('\n📋 Simple Startup Workflow:');
  console.log('   1. Start Backend:   npm --prefix backend run dev');
  console.log('   2. Start Mobile UI: npm --prefix frontend run dev:https');
  console.log('      (Or from root:   npm run dev:mobile)');

  console.log('\n🛡️  Mobile Microphone & Security Notes:');
  console.log('   • Mobile browsers (Android Chrome / Safari) enforce HTTPS for microphone access.');
  console.log('   • When opening https://' + primaryIp + ':3000/voice on your phone:');
  console.log('     Tap "Advanced" -> "Proceed to site (unsafe)" to accept the local dev certificate.');
  console.log('   • Next.js proxies all API requests internally, eliminating Mixed Content and CORS issues.');
  console.log('===============================================================\n');
}

printNetworkInfo();
