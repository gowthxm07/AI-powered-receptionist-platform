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

    const primaryIp = ips[0];
    console.log('\n📱 Mobile Phone Access URLs (on same Wi-Fi network):');
    console.log(`   🎙️  Mobile Voice Receptionist : http://${primaryIp}:3000/voice`);
    console.log(`   📊 Main Dashboard            : http://${primaryIp}:3000/dashboard`);
    console.log(`   ⚡ Backend REST API Engine    : http://${primaryIp}:5000`);
    console.log(`   🩺 Backend Health Check      : http://${primaryIp}:5000/api/health`);
  }

  console.log('\n📋 Quick Start Commands:');
  console.log('   1. Start Backend:  npm --prefix backend run dev');
  console.log('   2. Start Frontend: npm --prefix frontend run dev -- -H 0.0.0.0');

  console.log('\n🛡️  Mobile Browser & Network Tips:');
  console.log('   • Connect both Laptop and Mobile Phone to the same Wi-Fi network.');
  console.log('   • If prompted by Windows Defender Firewall, allow Node.js on Private Networks.');
  console.log('   • On Chrome Android, open chrome://flags/#unsafely-treat-insecure-origin-as-secure');
  console.log(`     and add "http://${ips[0] || '<LAPTOP_IP>'}:3000" if microphone permission is blocked on HTTP.`);
  console.log('===============================================================\n');
}

if (require.main === module) {
  printNetworkInfo();
}
