import assert from 'assert';
import { prisma } from '../lib/prisma';
import { isOriginAllowed } from '../app';
import { getLocalIpAddresses } from '../scripts/network-info';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { VoiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { MockSTTProvider } from '../modules/speech/providers/mock-stt.provider';
import { MockTTSProvider } from '../modules/speech/providers/mock-tts.provider';

export async function runMobileVoiceIntegrationTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Mobile Voice Integration & LAN Tests ---');
  console.log('======================================================');

  // Fetch demo business
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true, phone: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist.');

  const knownCustomer = await prisma.customer.findFirst({
    where: { businessId: business.id },
    select: { id: true, name: true, phone: true },
  });
  assert(knownCustomer, 'Demo customer must exist.');

  // ---------------------------------------------------------
  // TEST GROUP 1: LAN Network & Dynamic CORS Origin Testing
  // ---------------------------------------------------------
  console.log('\n1. Testing LAN IP Address Discovery & CORS Origins:');
  const localIps = getLocalIpAddresses();
  assert(Array.isArray(localIps), 'Local IPs must be an array.');

  // Verify localhost and loopbacks
  assert.strictEqual(isOriginAllowed('http://localhost:3000'), true);
  assert.strictEqual(isOriginAllowed('http://127.0.0.1:3000'), true);
  assert.strictEqual(isOriginAllowed('http://localhost:5000'), true);

  // Verify private LAN IPv4 patterns in development
  assert.strictEqual(isOriginAllowed('http://192.168.1.100:3000'), true);
  assert.strictEqual(isOriginAllowed('http://10.0.0.50:3000'), true);
  assert.strictEqual(isOriginAllowed('http://172.20.144.1:3000'), true);

  // Verify rejection of malicious external origins
  assert.strictEqual(isOriginAllowed('https://evil-attacker.com'), false);
  assert.strictEqual(isOriginAllowed('http://phishing-site.org:3000'), false);
  console.log('  ✓ Dynamic CORS policy correctly permits development LAN origins and blocks untrusted domains.');

  // ---------------------------------------------------------
  // TEST GROUP 2: Known Customer Multi-Turn Voice Session
  // ---------------------------------------------------------
  console.log('\n2. Testing Known Customer Multi-Turn Booking Flow:');
  const mockSTT = new MockSTTProvider();
  const mockTTS = new MockTTSProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: mockSTT,
    ttsProvider: mockTTS,
  });
  const transportService = new VoiceTurnTransportService({ orchestrator });

  const knownSessionRes = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    customerId: knownCustomer.id,
    channel: 'MOBILE_WEB',
  });
  assert(knownSessionRes.session);
  const knownTransportId = knownSessionRes.session.transportSessionId;

  const turns = [
    { speech: 'I want to book an appointment', expectedStep: 'BOOKING_COLLECT_SERVICE' },
    { speech: 'Comprehensive Oral Exam', expectedStep: 'BOOKING_COLLECT_STAFF' },
    { speech: 'Anyone is fine', expectedStep: 'BOOKING_COLLECT_DATE' },
    { speech: 'Tomorrow', expectedStep: 'BOOKING_SELECT_SLOT' },
    { speech: '10 AM', expectedStep: 'BOOKING_CONFIRM' },
    { speech: 'Yes confirm', expectedStep: 'IDLE' },
  ];

  let knownAppointmentId: string | null = null;
  const dummyBuffer = Buffer.from('RIFF....WAVEfmt ....data....');

  for (let i = 0; i < turns.length; i++) {
    mockSTT.setTranscript(turns[i].speech);
    const turnRes = await transportService.processVoiceTurn({
      transportSessionId: knownTransportId,
      businessId: business.id,
      customerId: knownCustomer.id,
      audioBuffer: dummyBuffer,
      clientChannel: 'MOBILE_WEB',
    });

    assert.strictEqual(turnRes.success, true);
    assert.strictEqual(turnRes.metadata?.conversationStep, turns[i].expectedStep);

    if (i === turns.length - 1) {
      assert(turnRes.metadata?.appointmentId, 'Appointment must be created on final confirmation turn.');
      knownAppointmentId = turnRes.metadata.appointmentId;
    }
  }

  assert(knownAppointmentId);
  const verifyKnownAppt = await prisma.appointment.findUnique({
    where: { id: knownAppointmentId },
    include: { customer: true },
  });
  assert(verifyKnownAppt);
  assert.strictEqual(verifyKnownAppt.customerId, knownCustomer.id);
  console.log(`  ✓ 6-Turn booking confirmed for known customer '${verifyKnownAppt.customer.name}' (ID: ${knownAppointmentId}).`);

  // Clean up
  await prisma.appointment.delete({ where: { id: knownAppointmentId } });
  await voiceTransportSessionManager.terminateTransportSession(knownTransportId);

  // ---------------------------------------------------------
  // TEST GROUP 3: Unknown Customer Phone Collection & Dynamic Profile
  // ---------------------------------------------------------
  console.log('\n3. Testing Unknown Customer Phone Collection Flow:');
  const unknownSessionRes = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    channel: 'MOBILE_WEB',
  });
  assert(unknownSessionRes.session);
  const unknownTransportId = unknownSessionRes.session.transportSessionId;

  const guestPhone = '+1-555-777-2299';
  const guestName = 'Marcus Vance';

  await prisma.customer.deleteMany({ where: { phone: guestPhone } });

  const unknownSequence = [
    { speech: 'I want to book an appointment', expectedStep: 'BOOKING_COLLECT_SERVICE' },
    { speech: 'Comprehensive Oral Exam', expectedStep: 'BOOKING_COLLECT_STAFF' },
    { speech: 'Anyone is fine', expectedStep: 'BOOKING_COLLECT_DATE' },
    { speech: 'Tomorrow', expectedStep: 'BOOKING_SELECT_SLOT' },
    { speech: '10 AM', expectedStep: 'BOOKING_COLLECT_CUSTOMER' },
    { speech: `My phone number is 555-777-2299 and name is ${guestName}`, expectedStep: 'BOOKING_CONFIRM' },
    { speech: 'Yes confirm', expectedStep: 'IDLE' },
  ];

  let guestAppointmentId: string | null = null;

  for (let i = 0; i < unknownSequence.length; i++) {
    mockSTT.setTranscript(unknownSequence[i].speech);
    const turnRes = await transportService.processVoiceTurn({
      transportSessionId: unknownTransportId,
      businessId: business.id,
      audioBuffer: dummyBuffer,
      clientChannel: 'MOBILE_WEB',
    });

    assert.strictEqual(turnRes.success, true);
    assert.strictEqual(turnRes.metadata?.conversationStep, unknownSequence[i].expectedStep);

    if (i === unknownSequence.length - 1) {
      assert(turnRes.metadata?.appointmentId);
      guestAppointmentId = turnRes.metadata.appointmentId;
    }
  }

  assert(guestAppointmentId);
  const verifyGuestAppt = await prisma.appointment.findUnique({
    where: { id: guestAppointmentId },
    include: { customer: true },
  });
  assert(verifyGuestAppt);
  assert.strictEqual(verifyGuestAppt.businessId, business.id);
  assert(verifyGuestAppt.customer.id, 'New customer UUID must be created in PostgreSQL.');
  assert(verifyGuestAppt.customer.phone && verifyGuestAppt.customer.phone.includes('555-777-2299'));
  console.log(`  ✓ 7-Turn booking confirmed with dynamic customer profile '${verifyGuestAppt.customer.name}' (Phone: ${verifyGuestAppt.customer.phone}).`);

  // Clean up
  await prisma.appointment.delete({ where: { id: guestAppointmentId } });
  await prisma.customer.delete({ where: { id: verifyGuestAppt.customer.id } });
  await voiceTransportSessionManager.terminateTransportSession(unknownTransportId);

  // ---------------------------------------------------------
  // TEST GROUP 4: Latency Telemetry Structure Validation
  // ---------------------------------------------------------
  console.log('\n4. Testing Latency Telemetry Structure & Precision:');
  const pingSession = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    customerId: knownCustomer.id,
    channel: 'MOBILE_WEB',
  });
  assert(pingSession.session);

  mockSTT.setTranscript('Hello');
  const pingTurn = await transportService.processVoiceTurn({
    transportSessionId: pingSession.session.transportSessionId,
    businessId: business.id,
    customerId: knownCustomer.id,
    audioBuffer: dummyBuffer,
    clientChannel: 'MOBILE_WEB',
  });

  assert.strictEqual(pingTurn.success, true);
  assert(typeof pingTurn.metrics.transportOverheadMs === 'number');
  assert(typeof pingTurn.metrics.sttMs === 'number');
  assert(typeof pingTurn.metrics.conversationMs === 'number');
  assert(typeof pingTurn.metrics.ttsMs === 'number');
  assert(typeof pingTurn.metrics.totalMs === 'number');
  assert(pingTurn.metrics.totalMs >= pingTurn.metrics.sttMs + pingTurn.metrics.conversationMs + pingTurn.metrics.ttsMs - 1);
  console.log(`  ✓ Measured high-resolution metrics validated: Overhead=${pingTurn.metrics.transportOverheadMs}ms, Total=${pingTurn.metrics.totalMs}ms.`);

  await voiceTransportSessionManager.terminateTransportSession(pingSession.session.transportSessionId);

  console.log('\n======================================================');
  console.log('🎉 ALL MOBILE VOICE INTEGRATION & LAN TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
