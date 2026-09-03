import assert from 'assert';
import { prisma } from '../lib/prisma';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { VoiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { WhisperCppProvider } from '../modules/speech/providers/whisper-cpp.provider';
import { PiperProvider } from '../modules/speech/providers/piper.provider';
import { isOriginAllowed } from '../app';
import { getLocalIpAddresses } from './network-info';

interface LatencyRecord {
  scenario: string;
  source: string;
  sttMs: number;
  convMs: number;
  ttsMs: number;
  overheadMs: number;
  totalMs: number;
}

export async function runMobileVoiceVerification(): Promise<void> {
  console.log('\n================================================================');
  console.log('🎙️  PHASE 7.2.2: LIVE END-TO-END MOBILE VOICE VERIFICATION');
  console.log('================================================================');

  const latencies: LatencyRecord[] = [];

  // Fetch demo business
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true, phone: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist in PostgreSQL.');

  const knownCustomer = await prisma.customer.findFirst({
    where: { businessId: business.id },
    select: { id: true, name: true, phone: true },
  });
  assert(knownCustomer, 'Demo customer must exist.');

  // -------------------------------------------------------------------
  // 1. VERIFY LOCAL NETWORK & CORS ORIGIN COMPATIBILITY
  // -------------------------------------------------------------------
  console.log('\n[1/6] 🌐 Verifying Local Network & Dynamic CORS Strategy...');
  const localIps = getLocalIpAddresses();
  console.log(`   Detected LAN IPs: ${localIps.join(', ') || 'localhost only'}`);

  const testOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.150:3000',
    'http://10.0.0.42:3000',
    'http://172.20.144.1:3000',
  ];
  if (localIps.length > 0) {
    testOrigins.push(`http://${localIps[0]}:3000`);
  }

  for (const origin of testOrigins) {
    const allowed = isOriginAllowed(origin);
    assert.strictEqual(allowed, true, `Origin ${origin} should be allowed by CORS in development.`);
  }

  const disallowed = isOriginAllowed('http://malicious-external-site.com');
  assert.strictEqual(disallowed, false, 'External malicious origin must be rejected by CORS.');
  console.log('   ✓ Dynamic LAN CORS origin strategy verified (100% compliant).');

  // Initialize unified voice pipeline
  const whisper = new WhisperCppProvider();
  const piper = new PiperProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: whisper,
    ttsProvider: piper,
  });
  const transportService = new VoiceTurnTransportService({ orchestrator });

  // -------------------------------------------------------------------
  // 2. VERIFY FAST DETERMINISTIC GREETING (TEST A)
  // -------------------------------------------------------------------
  console.log('\n[2/6] ⚡ Verifying Fast Greeting Pipeline (Test A: "Hello")...');
  const greetingSession = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    customerId: knownCustomer.id,
    channel: 'MOBILE_WEB',
    clientMetadata: { device: 'Mobile Safari / iOS 17.5' },
  });
  assert(greetingSession.session);

  // Synthesize realistic speech audio for input
  const helloAudio = await piper.synthesize('Hello');
  const t0 = performance.now();
  const turnA = await transportService.processVoiceTurn({
    transportSessionId: greetingSession.session.transportSessionId,
    businessId: business.id,
    customerId: knownCustomer.id,
    audioFilePath: helloAudio.audioPath,
    clientChannel: 'MOBILE_WEB',
  });
  const tTurnA = performance.now() - t0;

  if (!turnA.success) {
    console.error('turnA error:', turnA);
  }
  assert.strictEqual(turnA.success, true);
  assert.strictEqual(turnA.source, 'deterministic');
  assert(turnA.audio !== null);

  latencies.push({
    scenario: 'A. Fast Greeting ("Hello")',
    source: turnA.source,
    sttMs: turnA.metrics.sttMs,
    convMs: turnA.metrics.conversationMs,
    ttsMs: turnA.metrics.ttsMs,
    overheadMs: turnA.metrics.transportOverheadMs,
    totalMs: turnA.metrics.totalMs,
  });

  console.log(`   ✓ Transcript: "${turnA.transcript}"`);
  console.log(`   ✓ AI Response: "${turnA.responseText}"`);
  console.log(`   ✓ Audio Stream URL: ${turnA.audio.url}`);
  console.log(`   ⏱️  Metrics: STT=${turnA.metrics.sttMs.toFixed(1)}ms | Conv=${turnA.metrics.conversationMs.toFixed(1)}ms | TTS=${turnA.metrics.ttsMs.toFixed(1)}ms | Total=${turnA.metrics.totalMs.toFixed(1)}ms`);

  // -------------------------------------------------------------------
  // 3. VERIFY DATABASE INFORMATION QUERY (TEST B)
  // -------------------------------------------------------------------
  console.log('\n[3/6] 🗄️  Verifying Database Information Tool (Test B: "What services do you offer?")...');
  const servicesAudio = await piper.synthesize('What services do you offer?');
  const turnB = await transportService.processVoiceTurn({
    transportSessionId: greetingSession.session.transportSessionId,
    businessId: business.id,
    customerId: knownCustomer.id,
    audioFilePath: servicesAudio.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  assert.strictEqual(turnB.success, true);
  assert.strictEqual(turnB.source, 'tool');
  assert(turnB.responseText.includes('Comprehensive Oral Exam') || turnB.responseText.includes('Dental Cleaning') || turnB.responseText.includes('offer'));

  latencies.push({
    scenario: 'B. Database Query ("What services do you offer?")',
    source: turnB.source,
    sttMs: turnB.metrics.sttMs,
    convMs: turnB.metrics.conversationMs,
    ttsMs: turnB.metrics.ttsMs,
    overheadMs: turnB.metrics.transportOverheadMs,
    totalMs: turnB.metrics.totalMs,
  });

  console.log(`   ✓ Transcript: "${turnB.transcript}"`);
  console.log(`   ✓ AI Response: "${turnB.responseText.slice(0, 80)}..."`);
  console.log(`   ⏱️  Metrics: STT=${turnB.metrics.sttMs.toFixed(1)}ms | Conv=${turnB.metrics.conversationMs.toFixed(1)}ms | TTS=${turnB.metrics.ttsMs.toFixed(1)}ms | Total=${turnB.metrics.totalMs.toFixed(1)}ms`);

  await voiceTransportSessionManager.terminateTransportSession(greetingSession.session.transportSessionId);

  // -------------------------------------------------------------------
  // 4. VERIFY MULTI-TURN APPOINTMENT BOOKING: KNOWN CUSTOMER (TEST C)
  // -------------------------------------------------------------------
  console.log('\n[4/6] 📅 Verifying 6-Turn Known Customer Booking via Transport (Test C)...');
  const bookingSession = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    customerId: knownCustomer.id,
    channel: 'MOBILE_WEB',
  });
  assert(bookingSession.session);

  const bookingTurns = [
    { text: 'I want to book an appointment', expectedStep: 'SERVICE_SELECT' },
    { text: 'Comprehensive Oral Exam', expectedStep: 'STAFF_SELECT' },
    { text: 'Anyone is fine', expectedStep: 'DATE_SELECT' },
    { text: 'Tomorrow', expectedStep: 'TIME_SELECT' },
    { text: '10 in the morning', expectedStep: 'CONFIRM' },
    { text: 'Yes confirm', expectedStep: 'DONE' },
  ];

  let createdAppointmentId: string | null = null;

  for (let i = 0; i < bookingTurns.length; i++) {
    const turn = bookingTurns[i];
    const turnAudio = await piper.synthesize(turn.text);
    const turnRes = await transportService.processVoiceTurn({
      transportSessionId: bookingSession.session.transportSessionId,
      businessId: business.id,
      customerId: knownCustomer.id,
      audioFilePath: turnAudio.audioPath,
      clientChannel: 'MOBILE_WEB',
    });

    assert.strictEqual(turnRes.success, true);
    console.log(`   Turn ${i + 1} ("${turn.text}") ──> Transcript: "${turnRes.transcript}" | Step: ${turnRes.metadata?.conversationStep || 'N/A'}`);
    console.log(`      AI: "${turnRes.responseText}"`);

    if (i === bookingTurns.length - 1) {
      assert.strictEqual(turnRes.source, 'tool');
      assert(turnRes.metadata?.appointmentId, 'Appointment must be created on final confirmation turn.');
      createdAppointmentId = turnRes.metadata.appointmentId;
      latencies.push({
        scenario: 'C. Multi-Turn Booking (Confirm Turn)',
        source: turnRes.source,
        sttMs: turnRes.metrics.sttMs,
        convMs: turnRes.metrics.conversationMs,
        ttsMs: turnRes.metrics.ttsMs,
        overheadMs: turnRes.metrics.transportOverheadMs,
        totalMs: turnRes.metrics.totalMs,
      });
    }
  }

  assert(createdAppointmentId, 'Created appointment ID must exist.');
  const dbAppointment = await prisma.appointment.findUnique({
    where: { id: createdAppointmentId },
    include: { customer: true, staff: true, service: true },
  });
  assert(dbAppointment, 'Appointment record must exist in PostgreSQL.');
  assert.strictEqual(dbAppointment.businessId, business.id);
  assert.strictEqual(dbAppointment.customerId, knownCustomer.id);
  console.log(`   ✓ Verified PostgreSQL Appointment ID: ${dbAppointment.id} (Customer: ${dbAppointment.customer.name}, Service: ${dbAppointment.service.name})`);

  // Clean up appointment
  await prisma.appointment.delete({ where: { id: createdAppointmentId } });
  await voiceTransportSessionManager.terminateTransportSession(bookingSession.session.transportSessionId);
  console.log('   ✓ Cleaned up test appointment and terminated transport session.');

  // -------------------------------------------------------------------
  // 5. VERIFY UNKNOWN CUSTOMER PHONE COLLECTION & CREATION (TEST D)
  // -------------------------------------------------------------------
  console.log('\n[5/6] 👤 Verifying Unknown Customer Phone Collection & Dynamic Creation...');
  const unknownSession = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    channel: 'MOBILE_WEB', // No customerId provided
  });
  assert(unknownSession.session);

  const testPhone = '+1-555-900-7711';
  const testName = 'Elena Rostova';

  // Clean up any leftover test customer with this phone
  await prisma.customer.deleteMany({ where: { phone: testPhone } });

  const unknownTurns = [
    'I want to book an appointment',
    'Comprehensive Oral Exam',
    'Anyone is fine',
    'Tomorrow',
    '10 in the morning',
    `My phone number is 555-900-7711 and name is ${testName}`,
    'Yes confirm',
  ];

  let unknownAppointmentId: string | null = null;

  for (let i = 0; i < unknownTurns.length; i++) {
    const text = unknownTurns[i];
    const turnAudio = await piper.synthesize(text);
    const turnRes = await transportService.processVoiceTurn({
      transportSessionId: unknownSession.session.transportSessionId,
      businessId: business.id,
      audioFilePath: turnAudio.audioPath,
      clientChannel: 'MOBILE_WEB',
    });

    assert.strictEqual(turnRes.success, true);
    console.log(`   Unknown Turn ${i + 1} ("${text}") ──> Transcript: "${turnRes.transcript}" | Step: ${turnRes.metadata?.conversationStep || 'N/A'}`);
    console.log(`      AI: "${turnRes.responseText}"`);
    if (turnRes.metadata?.appointmentId) {
      unknownAppointmentId = turnRes.metadata.appointmentId;
    }
  }

  assert(unknownAppointmentId, 'Appointment must be created for unknown customer.');
  const newAppointment = await prisma.appointment.findUnique({
    where: { id: unknownAppointmentId },
    include: { customer: true },
  });
  if (!newAppointment) {
    throw new Error('New appointment not found in database.');
  }
  assert(newAppointment.customer.phone && newAppointment.customer.phone.length > 0, 'Customer phone must be stored.');
  assert(newAppointment.customer.id, 'New customer UUID must exist.');
  console.log(`   ✓ Verified dynamically created customer '${newAppointment.customer.name}' (${newAppointment.customer.phone}) linked to appointment ${newAppointment.id}.`);

  // Clean up
  await prisma.appointment.delete({ where: { id: unknownAppointmentId } });
  await prisma.customer.delete({ where: { id: newAppointment.customer.id } });
  await voiceTransportSessionManager.terminateTransportSession(unknownSession.session.transportSessionId);
  console.log('   ✓ Cleaned up dynamically created customer and test appointment.');

  // -------------------------------------------------------------------
  // 6. VERIFY OPEN-ENDED QUESTION OLLAMA CPU INFERENCE (TEST E)
  // -------------------------------------------------------------------
  console.log('\n[6/6] 🧠 Verifying Open Question Ollama Fallback ("What should I do before my dental appointment?")...');
  const openSession = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    customerId: knownCustomer.id,
    channel: 'MOBILE_WEB',
  });
  assert(openSession.session);

  const openAudio = await piper.synthesize('What should I do before my dental appointment?');
  const turnE = await transportService.processVoiceTurn({
    transportSessionId: openSession.session.transportSessionId,
    businessId: business.id,
    customerId: knownCustomer.id,
    audioFilePath: openAudio.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  assert.strictEqual(turnE.success, true);
  assert.strictEqual(turnE.source, 'llm');
  assert(turnE.responseText.length > 20);

  latencies.push({
    scenario: 'D. Open Question (Ollama llama3.2:3b)',
    source: turnE.source,
    sttMs: turnE.metrics.sttMs,
    convMs: turnE.metrics.conversationMs,
    ttsMs: turnE.metrics.ttsMs,
    overheadMs: turnE.metrics.transportOverheadMs,
    totalMs: turnE.metrics.totalMs,
  });

  console.log(`   ✓ Transcript: "${turnE.transcript}"`);
  console.log(`   ✓ AI Response (Ollama LLM): "${turnE.responseText.slice(0, 90)}..."`);
  console.log(`   ⏱️  Metrics: STT=${turnE.metrics.sttMs.toFixed(1)}ms | Conv=${turnE.metrics.conversationMs.toFixed(1)}ms | TTS=${turnE.metrics.ttsMs.toFixed(1)}ms | Total=${turnE.metrics.totalMs.toFixed(1)}ms`);

  await voiceTransportSessionManager.terminateTransportSession(openSession.session.transportSessionId);

  // -------------------------------------------------------------------
  // COMPREHENSIVE LATENCY SUMMARY TABLE
  // -------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 REAL MEASURED VOICE LATENCY SUMMARY (CPU Inference)');
  console.log('================================================================');
  console.log('Scenario                           | Source        | STT (ms) | Conv/AI (ms) | TTS (ms) | Overh (ms) | Total (ms)');
  console.log('-----------------------------------|---------------|----------|--------------|----------|------------|-----------');
  for (const row of latencies) {
    const scen = row.scenario.padEnd(34, ' ');
    const src = row.source.padEnd(13, ' ');
    const stt = row.sttMs.toFixed(1).padStart(8, ' ');
    const conv = row.convMs.toFixed(1).padStart(12, ' ');
    const tts = row.ttsMs.toFixed(1).padStart(8, ' ');
    const over = row.overheadMs.toFixed(1).padStart(10, ' ');
    const tot = row.totalMs.toFixed(1).padStart(9, ' ');
    console.log(`${scen} | ${src} | ${stt} | ${conv} | ${tts} | ${over} | ${tot}`);
  }
  console.log('================================================================');
  console.log('🎉 ALL LIVE END-TO-END MOBILE VOICE VERIFICATIONS PASSED! 🎉');
  console.log('================================================================\n');
}

if (require.main === module) {
  runMobileVoiceVerification().catch((err) => {
    console.error('Mobile voice verification error:', err);
    process.exit(1);
  });
}
