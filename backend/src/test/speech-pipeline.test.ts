import assert from 'assert';
import { prisma } from '../lib/prisma';
import { speechConfig } from '../modules/speech/speech.config';
import { SpeechDetectorService } from '../modules/speech/speech-detector.service';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';
import { WhisperCppProvider } from '../modules/speech/providers/whisper-cpp.provider';
import { PiperProvider } from '../modules/speech/providers/piper.provider';
import { MockSTTProvider } from '../modules/speech/providers/mock-stt.provider';
import { MockTTSProvider } from '../modules/speech/providers/mock-tts.provider';
import { audioConverterService, AudioConverterService } from '../modules/speech/services/audio-converter.service';
import { SpeechPipelineService } from '../modules/speech/services/speech-pipeline.service';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';

export async function runSpeechPipelineTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Speech Pipeline & Integration Tests ---');
  console.log('======================================================');

  // Fetch demo business
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist in database.');

  const otherBusiness = await prisma.business.findFirst({
    where: { NOT: { id: business.id } },
    select: { id: true, name: true },
  });
  assert(otherBusiness, 'Second demo business must exist for isolation tests.');

  // Fetch demo customer
  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
    select: { id: true, name: true, phone: true },
  });
  assert(customer, 'Demo customer must exist for business.');

  // ---------------------------------------------------------
  // TEST GROUP 1: Configuration & Runtime Detection
  // ---------------------------------------------------------
  console.log('\n1. Testing Speech Configuration & Runtime Detection:');
  assert.strictEqual(typeof speechConfig.stt.threads, 'number');
  assert.strictEqual(typeof speechConfig.tts.maxTextLength, 'number');
  assert(speechConfig.storage.outputDir.length > 0);

  const status = SpeechDetectorService.checkAvailability();
  assert.strictEqual(typeof status.stt.available, 'boolean');
  assert.strictEqual(typeof status.tts.available, 'boolean');
  console.log('  ✓ Speech configuration and runtime detection verified.');

  // ---------------------------------------------------------
  // TEST GROUP 2: STT Provider Defenses & Mock Tests
  // ---------------------------------------------------------
  console.log('\n2. Testing STT Provider Guardrails:');
  const whisperProvider = new WhisperCppProvider();

  // Non-existent audio file rejection
  const nonExistentResult = await whisperProvider.transcribe('invalid/path/to/missing.wav');
  assert.strictEqual(nonExistentResult.success, false);
  assert.strictEqual(nonExistentResult.error?.code, 'INVALID_AUDIO_FILE');
  console.log('  ✓ Missing audio file gracefully rejected without exceptions.');

  // Mock STT provider execution
  const mockSTT = new MockSTTProvider({ transcript: 'What services do you offer?' });
  const mockSTTRes = await mockSTT.transcribe('sample.wav');
  assert.strictEqual(mockSTTRes.success, true);
  assert.strictEqual(mockSTTRes.transcript, 'What services do you offer?');
  assert(mockSTTRes.latencyMs >= 0);

  // Mock STT error handling
  mockSTT.setShouldFail(true);
  const mockFailRes = await mockSTT.transcribe('sample.wav');
  assert.strictEqual(mockFailRes.success, false);
  assert.strictEqual(mockFailRes.error?.code, 'STT_PROCESSING_FAILED');
  console.log('  ✓ STT provider error handling and mock behaviors verified.');

  // ---------------------------------------------------------
  // TEST GROUP 2.5: Audio Format Conversion & 16kHz PCM Detection
  // ---------------------------------------------------------
  console.log('\n2.5. Testing Audio Format Conversion & Header Inspection:');
  
  // Missing file handling
  const missingConv = await audioConverterService.convertTo16kMonoWav('non/existent/audio.webm');
  assert.strictEqual(missingConv.success, false);
  assert(missingConv.error?.includes('does not exist'));

  // Non-existent file format check
  assert.strictEqual(audioConverterService.is16kMonoPcmWav('non/existent.wav'), false);
  console.log('  ✓ AudioConverterService defenses and format check verified.');

  // ---------------------------------------------------------
  // TEST GROUP 3: TTS Provider Defenses & Mock Tests
  // ---------------------------------------------------------
  console.log('\n3. Testing TTS Provider Guardrails:');
  const piperProvider = new PiperProvider();

  // Empty text rejection
  const emptyTtsRes = await piperProvider.synthesize('');
  assert.strictEqual(emptyTtsRes.success, false);
  assert.strictEqual(emptyTtsRes.error?.code, 'EMPTY_TEXT_ERROR');

  const whitespaceTtsRes = await piperProvider.synthesize('   ');
  assert.strictEqual(whitespaceTtsRes.success, false);
  assert.strictEqual(whitespaceTtsRes.error?.code, 'EMPTY_TEXT_ERROR');
  console.log('  ✓ Empty text synthesis cleanly rejected.');

  // Mock TTS provider execution
  const mockTTS = new MockTTSProvider();
  const mockTTSRes = await mockTTS.synthesize('Your appointment is confirmed.');
  assert.strictEqual(mockTTSRes.success, true);
  assert(mockTTSRes.audioId.length > 0);
  assert(mockTTSRes.audioFileName.endsWith('.wav'));
  assert(mockTTSRes.latencyMs >= 0);
  console.log('  ✓ TTS provider unique output generation verified.');

  // ---------------------------------------------------------
  // TEST GROUP 4: Audio Storage & Path Traversal Security
  // ---------------------------------------------------------
  console.log('\n4. Testing Audio Storage & Security:');
  const { audioId, fullPath } = AudioStorageService.createAudioPath('test');
  assert(audioId.startsWith('test_'));
  assert(fullPath.endsWith('.wav'));

  // Test invalid audio ID
  const invalidRes = AudioStorageService.getAudioPathById('../../etc/passwd');
  assert.strictEqual(invalidRes.exists, false);
  assert(invalidRes.error?.includes('Invalid audio ID') || invalidRes.error?.includes('Access denied'));

  const specialCharRes = AudioStorageService.getAudioPathById('audio<script>alert(1)</script>');
  assert.strictEqual(specialCharRes.exists, false);
  console.log('  ✓ Audio storage directory traversal defenses verified.');

  // ---------------------------------------------------------
  // TEST GROUP 5: Speech Pipeline Service End-to-End
  // ---------------------------------------------------------
  console.log('\n5. Testing End-to-End Speech Pipeline:');
  const pipeline = new SpeechPipelineService({
    sttProvider: new MockSTTProvider({ transcript: 'Hello there!' }),
    ttsProvider: new MockTTSProvider(),
  });

  const turn1 = await pipeline.processVoiceTurn({
    audioFilePath: 'dummy_turn1.wav',
    businessId: business.id,
  });

  assert.strictEqual(turn1.success, true);
  assert(turn1.sessionId.startsWith('sess_voice_'));
  assert.strictEqual(turn1.transcript, 'Hello there!');
  assert(turn1.response.includes('Lumina Dental Care'));
  assert.strictEqual(turn1.source, 'deterministic');
  assert(turn1.audio !== null);
  assert(turn1.metrics.sttMs >= 0);
  assert(turn1.metrics.conversationMs >= 0);
  assert(turn1.metrics.ttsMs >= 0);
  assert(turn1.metrics.totalMs >= 0);
  console.log(`  ✓ Turn 1 (Greeting): STT=${turn1.metrics.sttMs}ms, Conv=${turn1.metrics.conversationMs}ms, TTS=${turn1.metrics.ttsMs}ms, Total=${turn1.metrics.totalMs}ms`);

  // Turn 2 with session continuation
  const mockSTT2 = new MockSTTProvider({ transcript: 'What services do you offer?' });
  const pipelineTurn2 = new SpeechPipelineService({
    sttProvider: mockSTT2,
    ttsProvider: new MockTTSProvider(),
  });

  const turn2 = await pipelineTurn2.processVoiceTurn({
    audioFilePath: 'dummy_turn2.wav',
    businessId: business.id,
    sessionId: turn1.sessionId,
  });

  assert.strictEqual(turn2.success, true);
  assert.strictEqual(turn2.sessionId, turn1.sessionId);
  assert.strictEqual(turn2.source, 'tool');
  assert(turn2.response.includes('Comprehensive Oral Exam') || turn2.response.includes('Dental'));
  console.log('  ✓ Turn 2: Preserved session ID and executed database services tool.');

  // ---------------------------------------------------------
  // TEST GROUP 6: Multi-Tenant Business & Customer Isolation
  // ---------------------------------------------------------
  console.log('\n6. Testing Multi-Tenant Security & Isolation:');

  // Cross-tenant session hijacking attempt
  const crossTenantRes = await pipeline.processVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: otherBusiness.id,
    sessionId: turn1.sessionId,
  });
  assert.strictEqual(crossTenantRes.success, false);
  assert.strictEqual(crossTenantRes.error?.code, 'SESSION_BUSINESS_MISMATCH');
  console.log('  ✓ Cross-tenant session hijacking blocked cleanly with SESSION_BUSINESS_MISMATCH.');

  // Invalid customer business mismatch
  const crossCustRes = await pipeline.processVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: otherBusiness.id,
    customerId: customer.id, // belongs to business 1
  });
  assert.strictEqual(crossCustRes.success, false);
  assert.strictEqual(crossCustRes.error?.code, 'INVALID_CUSTOMER_BUSINESS_MISMATCH');
  console.log('  ✓ Cross-tenant customer parameter injection cleanly blocked.');

  // Non-existent business
  const fakeBizRes = await pipeline.processVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: '00000000-0000-0000-0000-000000000000',
  });
  assert.strictEqual(fakeBizRes.success, false);
  assert.strictEqual(fakeBizRes.error?.code, 'BUSINESS_NOT_FOUND');
  console.log('  ✓ Non-existent business ID cleanly rejected.');

  // ---------------------------------------------------------
  // TEST GROUP 7: Multi-Turn Voice Booking Flow
  // ---------------------------------------------------------
  console.log('\n7. Testing Multi-Turn Voice Booking Conversation Flow:');
  const mockSTTRunner = new MockSTTProvider();
  const bookingPipeline = new SpeechPipelineService({
    sttProvider: mockSTTRunner,
    ttsProvider: new MockTTSProvider(),
  });

  let createdAppointmentId: string | null = null;

  try {
    // Turn 1: Initiation
    mockSTTRunner.setTranscript('I want to book an appointment.');
    const bTurn1 = await bookingPipeline.processVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      customerId: customer.id,
    });
    assert.strictEqual(bTurn1.success, true);
    assert.strictEqual(bTurn1.source, 'deterministic');
    const bSessionId = bTurn1.sessionId;

    // Turn 2: Service selection
    mockSTTRunner.setTranscript('Comprehensive Oral Exam & Digital X-Rays');
    const bTurn2 = await bookingPipeline.processVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(bTurn2.success, true);
    assert.strictEqual(bTurn2.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_STAFF);

    // Turn 3: Staff preference
    mockSTTRunner.setTranscript('Anyone is fine');
    const bTurn3 = await bookingPipeline.processVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(bTurn3.success, true);
    assert.strictEqual(bTurn3.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_DATE);

    // Turn 4: Date selection (Tomorrow)
    mockSTTRunner.setTranscript('Tomorrow');
    const bTurn4 = await bookingPipeline.processVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(bTurn4.success, true);
    assert.strictEqual(bTurn4.metadata?.conversationStep, BookingConversationStep.BOOKING_SELECT_SLOT);

    // Turn 5: Slot selection (09:00 AM)
    mockSTTRunner.setTranscript('09:00 AM');
    const bTurn5 = await bookingPipeline.processVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(bTurn5.success, true);
    assert.strictEqual(bTurn5.metadata?.conversationStep, BookingConversationStep.BOOKING_CONFIRM);

    // Turn 6: Confirm booking
    mockSTTRunner.setTranscript('Yes, please confirm my booking');
    const bTurn6 = await bookingPipeline.processVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(bTurn6.success, true);
    assert.strictEqual(bTurn6.source, 'tool');
    assert(bTurn6.response.toLowerCase().includes('confirmed') || bTurn6.response.toLowerCase().includes('successfully booked'));

    // Check appointment in PostgreSQL
    const createdAppt = await prisma.appointment.findFirst({
      where: { customerId: customer.id, businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(createdAppt, 'Appointment must be created in PostgreSQL.');
    createdAppointmentId = createdAppt.id;
    console.log(`  ✓ 6-Turn Voice Booking Completed: Appointment '${createdAppointmentId}' created in PostgreSQL.`);
  } finally {
    if (createdAppointmentId) {
      await prisma.appointment.delete({ where: { id: createdAppointmentId } }).catch(() => {});
      console.log(`  ✓ Cleaned up test appointment '${createdAppointmentId}'.`);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 ALL SPEECH PIPELINE INTEGRATION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
