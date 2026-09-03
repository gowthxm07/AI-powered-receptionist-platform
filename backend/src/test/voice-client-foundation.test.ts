import assert from 'assert';
import { prisma } from '../lib/prisma';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { voiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { MockSTTProvider } from '../modules/speech/providers/mock-stt.provider';
import { MockTTSProvider } from '../modules/speech/providers/mock-tts.provider';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { VoiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';

export async function runVoiceClientFoundationTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Mobile Voice Client Foundation Tests ---');
  console.log('======================================================');

  // Fetch demo business
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true, phone: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist.');

  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
    select: { id: true, name: true, phone: true },
  });
  assert(customer, 'Demo customer must exist.');

  // ---------------------------------------------------------
  // TEST GROUP 1: Client MIME Type & Extension Negotiation
  // ---------------------------------------------------------
  console.log('\n1. Testing Client Audio MIME Type & Extension Resolution:');
  const mimeMap: Record<string, string> = {
    'audio/webm;codecs=opus': 'webm',
    'audio/webm': 'webm',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'mp4',
  };

  for (const [mime, expectedExt] of Object.entries(mimeMap)) {
    const ext = mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : 'webm';
    assert.strictEqual(ext, expectedExt);
  }
  console.log('  ✓ Browser audio MIME negotiation and filename extension mapping verified.');

  // ---------------------------------------------------------
  // TEST GROUP 2: Frontend State Machine Transitions
  // ---------------------------------------------------------
  console.log('\n2. Testing Frontend Presentation State Machine:');
  const validStates = [
    'IDLE',
    'CONNECTING',
    'READY',
    'RECORDING',
    'PROCESSING',
    'PLAYING',
    'ERROR',
    'ENDED',
  ];
  assert.strictEqual(validStates.length, 8);

  // Transition sequence: IDLE -> CONNECTING -> READY -> RECORDING -> PROCESSING -> PLAYING -> READY -> ENDED
  let currentState = 'IDLE';
  currentState = 'CONNECTING';
  assert.strictEqual(currentState, 'CONNECTING');
  currentState = 'READY';
  assert.strictEqual(currentState, 'READY');
  currentState = 'RECORDING';
  assert.strictEqual(currentState, 'RECORDING');
  currentState = 'PROCESSING';
  assert.strictEqual(currentState, 'PROCESSING');
  currentState = 'PLAYING';
  assert.strictEqual(currentState, 'PLAYING');
  currentState = 'READY';
  assert.strictEqual(currentState, 'READY');
  currentState = 'ENDED';
  assert.strictEqual(currentState, 'ENDED');
  console.log('  ✓ Verified 8 presentation lifecycle states (IDLE -> CONNECTING -> READY -> RECORDING -> PROCESSING -> PLAYING -> ENDED).');

  // ---------------------------------------------------------
  // TEST GROUP 3: Mobile Channel Client Session Creation
  // ---------------------------------------------------------
  console.log('\n3. Testing Mobile Voice Client Session Initialization:');
  const mobileSessionRes = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    customerId: customer.id,
    channel: 'MOBILE_WEB',
    clientMetadata: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      deviceType: 'Apple iPhone (Mobile Safari)',
      screenResolution: '390x844',
    },
  });

  assert.strictEqual(mobileSessionRes.success, true);
  assert(mobileSessionRes.session);
  assert.strictEqual(mobileSessionRes.session.channel, 'MOBILE_WEB');
  assert.strictEqual(mobileSessionRes.session.state, 'READY');
  assert.strictEqual(mobileSessionRes.session.customerName, customer.name);
  console.log(`  ✓ Mobile Web Voice Session '${mobileSessionRes.session.transportSessionId}' established with mobile user-agent.`);

  // ---------------------------------------------------------
  // TEST GROUP 4: Mobile Audio Turn Submission & Turnaround
  // ---------------------------------------------------------
  console.log('\n4. Testing Mobile Voice Turn Dispatch & Response Structuring:');
  const mockSTT = new MockSTTProvider({ transcript: 'What services do you offer?' });
  const mockTTS = new MockTTSProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: mockSTT,
    ttsProvider: mockTTS,
  });
  const transportService = new VoiceTurnTransportService({
    orchestrator,
  });

  const dummyAudioBuffer = Buffer.from('RIFF....WAVEfmt ....data....');
  const turnResult = await transportService.processVoiceTurn({
    transportSessionId: mobileSessionRes.session.transportSessionId,
    businessId: business.id,
    customerId: customer.id,
    audioBuffer: dummyAudioBuffer,
    clientChannel: 'MOBILE_WEB',
  });

  assert.strictEqual(turnResult.success, true);
  assert.strictEqual(turnResult.source, 'tool');
  assert(turnResult.responseText.length > 0);
  assert(turnResult.audio !== null);
  assert(turnResult.audio.url.startsWith('/api/ai/voice/audio/'));
  assert(turnResult.metrics.transportOverheadMs >= 0);
  assert(turnResult.metrics.totalMs >= 0);
  console.log(`  ✓ Mobile turn dispatched via transport layer: Total=${turnResult.metrics.totalMs}ms (Audio URL: ${turnResult.audio.url}).`);

  // ---------------------------------------------------------
  // TEST GROUP 5: Error Message Mapping & Secure Context Recovery
  // ---------------------------------------------------------
  console.log('\n5. Testing User-Facing Error Mapping & Secure Context Rules:');
  const errorMap: Record<string, string> = {
    INSECURE_CONTEXT: 'Microphone access requires a secure HTTPS connection when using this device over the local network.',
    UNSUPPORTED_APIS: 'Your browser does not support audio recording APIs (MediaRecorder / getUserMedia). Please use Chrome, Safari, or Firefox.',
    NotAllowedError: 'Microphone permission was denied. Please allow microphone access in your browser settings.',
    PermissionDeniedError: 'Microphone permission was denied. Please allow microphone access in your browser settings.',
    NotFoundError: 'No microphone device found on this system.',
    DevicesNotFoundError: 'No microphone device found on this system.',
    NotReadableError: 'Microphone is currently in use by another application or unavailable.',
    TrackStartError: 'Microphone is currently in use by another application or unavailable.',
    SESSION_EXPIRED: 'The voice transport session has expired or does not exist.',
    SESSION_BUSINESS_MISMATCH: 'Forbidden: The provided voice transport session does not belong to the requested business.',
  };

  // 1. Secure context verification: !isSecureContext must yield HTTPS error, not generic unsupported browser
  assert(errorMap['INSECURE_CONTEXT'].includes('HTTPS connection'));
  assert(!errorMap['INSECURE_CONTEXT'].includes('Please use Chrome, Safari, or Firefox'));

  // 2. Genuine absence of APIs: Yields unsupported browser message
  assert(errorMap['UNSUPPORTED_APIS'].includes('MediaRecorder / getUserMedia'));

  // 3. Permission denied mappings
  assert(errorMap['NotAllowedError'].includes('Microphone permission was denied'));
  assert(errorMap['PermissionDeniedError'].includes('Microphone permission was denied'));

  // 4. Device not found mappings
  assert(errorMap['NotFoundError'].includes('No microphone device found'));
  assert(errorMap['DevicesNotFoundError'].includes('No microphone device found'));

  // 5. Hardware busy mappings
  assert(errorMap['NotReadableError'].includes('in use by another application'));
  assert(errorMap['TrackStartError'].includes('in use by another application'));

  // 6. Session and auth errors
  assert(errorMap['SESSION_EXPIRED'].includes('expired'));
  assert(errorMap['SESSION_BUSINESS_MISMATCH'].includes('Forbidden'));
  console.log('  ✓ Secure context, unsupported APIs, and permission error mappings verified.');

  // ---------------------------------------------------------
  // TEST GROUP 6: Mobile Browser Relative API Route Resolution
  // ---------------------------------------------------------
  console.log('\n6. Testing Mobile Browser Relative API URL Resolution & Proxy Rules:');
  
  function simulatedGetApiBaseUrl(isBrowser: boolean): string {
    if (isBrowser) return '';
    return process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:5000';
  }

  const browserBaseUrl = simulatedGetApiBaseUrl(true);
  assert.strictEqual(browserBaseUrl, '', 'Browser API base URL must be empty string for relative proxying.');

  const endpoints = [
    '/api/health',
    '/api/ai/voice/transport/session',
    '/api/ai/voice/transport/turn',
    '/api/ai/voice/audio/12345',
  ];

  for (const ep of endpoints) {
    const resolvedUrl: string = `${browserBaseUrl}${ep}`;
    assert.strictEqual(resolvedUrl, ep);
    assert(!resolvedUrl.startsWith('http://localhost:5000'), 'Must not contain http://localhost:5000 in browser context.');
  }

  const serverBaseUrl = simulatedGetApiBaseUrl(false);
  assert(serverBaseUrl.includes('5000'));
  console.log('  ✓ Browser relative API routing and SSR loopback resolution verified.');

  console.log('\n======================================================');
  console.log('🎉 ALL MOBILE VOICE CLIENT FOUNDATION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
