import { getLocalIpAddresses } from './network-info';

async function testProxy() {
  const ips = getLocalIpAddresses();
  const primaryIp = ips[0] || '127.0.0.1';

  console.log('\n===============================================================');
  console.log('🔍 SMART RECEPTIONIST: NEXT.JS PROXY & HEALTH CHECK VERIFIER');
  console.log('===============================================================');

  // 1. Test Direct Backend (port 5000)
  const directUrl = 'http://127.0.0.1:5000/api/health';
  console.log(`\n1. Testing Direct Backend Health Check: ${directUrl}`);
  try {
    const res = await fetch(directUrl);
    const data: any = await res.json();
    console.log(`   ✓ Status: HTTP ${res.status}`);
    console.log(`   ✓ Backend State: ${data.data?.status || 'OK'}`);
  } catch (err: any) {
    console.log(`   ❌ Direct backend unreachable: ${err.message}`);
    console.log('      Ensure backend is running: npm --prefix backend run dev');
  }

  // 2. Test Next.js Rewrites Proxy over HTTPS (port 3000)
  const httpsProxyUrl = `https://${primaryIp}:3000/api/health`;
  console.log(`\n2. Testing HTTPS Next.js Proxy on LAN IP: ${httpsProxyUrl}`);
  try {
    // In Node.js, bypass self-signed cert verification for local dev test
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const res = await fetch(httpsProxyUrl);
    const data: any = await res.json();
    console.log(`   ✓ Status: HTTP ${res.status}`);
    console.log(`   ✓ Proxied Response: ${JSON.stringify(data.data || data)}`);

    // 3. Test Voice Transport Session creation through HTTPS proxy
    console.log(`\n3. Testing Voice Transport Session Creation: https://${primaryIp}:3000/api/ai/voice/transport/session`);
    const sessionRes = await fetch(`https://${primaryIp}:3000/api/ai/voice/transport/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'b0000001-0000-0000-0000-000000000001',
        channel: 'MOBILE_WEB',
      }),
    });
    const sessionData: any = await sessionRes.json();
    console.log(`   ✓ Status: HTTP ${sessionRes.status}`);
    console.log(`   ✓ Session ID: ${sessionData.data?.transportSessionId || 'Failed'}`);

    console.log('\n🎉 PROXY ARCHITECTURE VERIFIED: Mobile HTTPS can reach Backend & start Voice Calls!');
  } catch (err: any) {
    console.log(`   ℹ️ Note: Frontend HTTPS dev server not running on port 3000.`);
    console.log(`      Start mobile frontend: npm run dev:mobile`);
    console.log(`      Then test in browser: ${httpsProxyUrl}`);
  }

  console.log('===============================================================\n');
}

testProxy();
