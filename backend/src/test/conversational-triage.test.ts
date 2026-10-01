import assert from 'assert';
import { AIReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';
import { sessionStore } from '../modules/ai/conversation';
import { LUMINA_DENTAL_BUSINESS_ID, ZENITH_IMPLANTS_BUSINESS_ID } from '../modules/ai/knowledge/clinic-capabilities';
import { extractTriageFacts, mergeTriageFacts } from '../modules/ai/knowledge/triage-extractor';
import { isSpreadingFacialSwelling, isLifeThreateningDentalEmergency } from '../modules/ai/knowledge/global-dental-catalogue';
import { triageDentalInquiry, getEmpatheticOpening } from '../modules/ai/knowledge/dental-knowledge';
import { DentalClinicalCategory } from '../modules/ai/knowledge/global-dental-catalogue';
import { AIAction } from '../modules/ai/types/action.types';
import { AIIntent } from '../modules/ai/types/intent.types';

export async function runConversationalTriageTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- RUNNING CONVERSATIONAL DENTAL TRIAGE TEST SUITE ---');
  console.log('======================================================\n');

  const aiReceptionistService = new AIReceptionistService();

  // --------------------------------------------------------------------------
  // TEST A: Ambiguous First Turn Persistence
  // --------------------------------------------------------------------------
  console.log('A. Testing Ambiguous First Turn Persistence:');
  const sessA = 'test-triage-ambiguous-sess';
  const resA = await aiReceptionistService.processMessage({
    message: 'Something feels weird in my mouth.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessA,
    },
  });

  assert.strictEqual(resA.success, true);
  assert.strictEqual(resA.intent, AIIntent.DENTAL_SYMPTOM_INQUIRY);
  assert.ok(
    resA.response.includes('pain') ||
      resA.response.includes('sensitivity') ||
      resA.response.includes('swelling'),
    `Clarification question expected, got: "${resA.response}"`
  );

  const storedA = await sessionStore.getSession(sessA);
  assert.ok(storedA, 'Session must be persisted after ambiguous symptom');
  assert.strictEqual(storedA.step, BookingConversationStep.TRIAGE_CLARIFICATION);
  assert.ok(storedA.triageProfile, 'triageProfile must be attached to session');
  assert.strictEqual(storedA.triageProfile?.isAmbiguous, true);
  assert.ok(storedA.triageProfile?.activeFollowUpQuestion);
  console.log('  ✓ Ambiguous first turn persisted in TRIAGE_CLARIFICATION step with triageProfile.');

  // --------------------------------------------------------------------------
  // TEST B: Follow-Up Answer Combining Turns
  // --------------------------------------------------------------------------
  console.log('\nB. Testing Follow-up Clarification Answer in TRIAGE_CLARIFICATION:');
  const resB = await aiReceptionistService.processMessage({
    message: 'My lower right tooth hurts when I drink cold juice.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessA,
    },
  });

  assert.strictEqual(resB.success, true);
  assert.ok(
    resB.response.includes('Comprehensive Oral Exam') || resB.response.includes('examination'),
    `Expected recommendation of examination, got: "${resB.response}"`
  );

  const storedB = await sessionStore.getSession(sessA);
  assert.ok(storedB);
  assert.strictEqual(storedB.step, BookingConversationStep.BOOKING_SYMPTOM_TRIAGE);
  assert.strictEqual(storedB.triageProfile?.isAmbiguous, false);
  assert.ok(storedB.triageProfile?.triggers.includes('cold'), 'Should record cold trigger');
  assert.ok(storedB.triageProfile?.anatomicalLocation?.includes('lower right'), 'Should record lower right');
  console.log('  ✓ Follow-up answer smoothly merged into triageProfile and advanced to BOOKING_SYMPTOM_TRIAGE.');

  // --------------------------------------------------------------------------
  // TEST C: Natural Clinical Answer during BOOKING_SYMPTOM_TRIAGE (Non-Binary)
  // --------------------------------------------------------------------------
  console.log('\nC. Testing Natural Clinical Answer during BOOKING_SYMPTOM_TRIAGE:');
  const resC = await aiReceptionistService.processMessage({
    message: 'It is only one tooth.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessA,
    },
  });

  assert.strictEqual(resC.success, true);
  // Must NOT repeat the robotic binary prompt: "Would you like to schedule an appointment for Comprehensive Oral Exam & Digital X-Rays, or would you prefer a different service?"
  assert.ok(
    !resC.response.includes('or would you prefer a different service?'),
    'Must NOT repeat rigid binary choice when patient provides clinical information'
  );
  assert.ok(
    resC.response.toLowerCase().includes('single tooth') || resC.response.toLowerCase().includes('details'),
    `Response should acknowledge clinical detail, got: "${resC.response}"`
  );

  const storedC = await sessionStore.getSession(sessA);
  assert.ok(storedC);
  assert.strictEqual(storedC.triageProfile?.anatomicalScope, 'single tooth');
  console.log('  ✓ Conversational clinical answer acknowledged intelligently without binary repetition.');

  // --------------------------------------------------------------------------
  // TEST D, E, F: Duration, Pain Pattern, and Negative Findings Extraction
  // --------------------------------------------------------------------------
  console.log('\nD, E, F. Testing Duration, Pain Pattern, and Negative Findings:');
  const sessDEF = 'test-triage-def-sess';
  await aiReceptionistService.processMessage({
    message: 'I have a toothache.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessDEF,
    },
  });

  const resDEF = await aiReceptionistService.processMessage({
    message: 'It throbs since yesterday and I have no swelling.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessDEF,
    },
  });

  assert.strictEqual(resDEF.success, true);
  const storedDEF = await sessionStore.getSession(sessDEF);
  assert.ok(storedDEF?.triageProfile);
  assert.strictEqual(storedDEF.triageProfile.painPattern, 'throbbing');
  assert.strictEqual(storedDEF.triageProfile.onset, 'yesterday');
  assert.strictEqual(storedDEF.triageProfile.swellingPresent, false);
  console.log('  ✓ Duration ("since yesterday"), PainPattern ("throbbing"), and Negative Swelling (false) verified.');

  // --------------------------------------------------------------------------
  // TEST G: Patient Correction
  // --------------------------------------------------------------------------
  console.log('\nG. Testing Patient Clinical Correction:');
  const resG = await aiReceptionistService.processMessage({
    message: 'Actually, it started five days ago, not yesterday.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessDEF,
    },
  });

  assert.strictEqual(resG.success, true);
  const storedG = await sessionStore.getSession(sessDEF);
  assert.ok(storedG?.triageProfile);
  assert.ok(
    storedG.triageProfile.onset?.includes('5 days') || storedG.triageProfile.duration?.includes('5 days'),
    `Expected updated duration/onset 5 days, got onset: "${storedG.triageProfile.onset}", duration: "${storedG.triageProfile.duration}"`
  );
  console.log('  ✓ Patient correction cleanly updated onset/duration to latest statement.');

  // --------------------------------------------------------------------------
  // TEST H: Broken Tooth -> Evaluation-First Mapping
  // --------------------------------------------------------------------------
  console.log('\nH. Testing Broken Tooth Evaluation-First Service Mapping:');
  const sessH = 'test-triage-broken-tooth-sess';
  const resH = await aiReceptionistService.processMessage({
    message: 'A piece of my back tooth broke off while eating dinner.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessH,
    },
  });

  assert.strictEqual(resH.success, true);
  // Must recommend examination rather than immediately booking a $850 Crown Preparation!
  assert.ok(
    resH.response.includes('Comprehensive Oral Exam') || resH.response.includes('evaluation'),
    `Expected evaluation-first mapping, got: "${resH.response}"`
  );
  assert.ok(
    !resH.response.includes('Ceramic Crown Preparation & Digital 3D Scan'),
    'Must NOT directly book Ceramic Crown Preparation without examination for initial broken tooth'
  );

  const storedH = await sessionStore.getSession(sessH);
  assert.strictEqual(storedH?.selectedServiceName, 'Comprehensive Oral Exam & Digital X-Rays');
  console.log('  ✓ Broken tooth appropriately mapped to Comprehensive Oral Exam evaluation.');

  // --------------------------------------------------------------------------
  // TEST I: Missing Tooth / Tooth Replacement Goal
  // --------------------------------------------------------------------------
  console.log('\nI. Testing Missing Tooth / Replacement Goal at Lumina:');
  const sessI = 'test-triage-missing-tooth-sess';
  const resI = await aiReceptionistService.processMessage({
    message: 'I lost a tooth a few months ago and want to replace it.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessI,
    },
  });

  assert.strictEqual(resI.success, true);
  assert.ok(
    resI.response.includes('evaluation') || resI.response.includes('examination'),
    `Expected evaluation consultation guidance, got: "${resI.response}"`
  );
  console.log('  ✓ Missing tooth goal handled with evaluation guidance and replacement options.');

  // --------------------------------------------------------------------------
  // TEST J: Swelling / Urgency Triage
  // --------------------------------------------------------------------------
  console.log('\nJ. Testing Spreading Facial Swelling Triage:');
  const isSwelling = isSpreadingFacialSwelling('My gum is swollen and my cheek is starting to swell.');
  assert.strictEqual(isSwelling, true, 'Should detect spreading cheek swelling');

  const sessJ = 'test-triage-swelling-sess';
  const resJ = await aiReceptionistService.processMessage({
    message: 'My gum is swollen and my cheek is starting to swell.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessJ,
    },
  });

  assert.strictEqual(resJ.success, true);
  assert.ok(
    resJ.response.toLowerCase().includes('infection') || resJ.response.toLowerCase().includes('urgent'),
    `Urgent infection guidance expected, got: "${resJ.response}"`
  );
  assert.ok(
    !resJ.response.includes('does not currently list that specialized treatment'),
    'Must NOT treat spreading facial swelling as service unavailable!'
  );
  console.log('  ✓ Spreading cheek swelling correctly prioritized with urgent dental infection guidance.');

  // --------------------------------------------------------------------------
  // TEST K: Multi-Symptom Foundation
  // --------------------------------------------------------------------------
  console.log('\nK. Testing Multi-Symptom Retention:');
  const factsK = extractTriageFacts('My tooth broke and now it throbs.');
  assert.ok(factsK.reportedSymptoms?.includes('broken tooth'), 'Should retain broken tooth');
  assert.ok(factsK.reportedSymptoms?.includes('throbbing tooth pain'), 'Should retain throbbing pain');
  assert.strictEqual(factsK.reportedSymptoms?.length, 2);
  console.log('  ✓ Both broken tooth and throbbing tooth pain retained in reportedSymptoms.');

  // --------------------------------------------------------------------------
  // TEST L: Non-Diagnostic Safety
  // --------------------------------------------------------------------------
  console.log('\nL. Testing Non-Diagnostic Language Safety:');
  const complaints = [
    'My tooth hurts when I drink cold water',
    'I have a throbbing toothache',
    'My gums bleed when I brush',
    'A piece of my tooth broke off',
    'My jaw clicks when I chew',
  ];

  for (const c of complaints) {
    const triage = triageDentalInquiry(LUMINA_DENTAL_BUSINESS_ID, c);
    const resp = triage.responsePrompt?.toLowerCase() || '';
    assert.ok(!resp.includes('you have pulpitis'), `Must not diagnose pulpitis for "${c}"`);
    assert.ok(!resp.includes('you have an abscess'), `Must not diagnose abscess for "${c}"`);
    assert.ok(!resp.includes('you need a root canal'), `Must not prescribe root canal for "${c}"`);
    assert.ok(!resp.includes('you definitely have'), `Must not make definitive claim for "${c}"`);
  }
  console.log('  ✓ All triage responses maintain tentative, non-diagnostic clinical boundaries.');

  // --------------------------------------------------------------------------
  // TEST M: Tonal Adaptation for Cosmetic Whitening
  // --------------------------------------------------------------------------
  console.log('\nM. Testing Receptionist Tone Adaptation:');
  const whiteningTriage = triageDentalInquiry(LUMINA_DENTAL_BUSINESS_ID, 'I want to whiten my teeth for an event');
  assert.ok(
    !whiteningTriage.responsePrompt?.toLowerCase().includes("i'm sorry to hear that"),
    'Whitening request should not receive pain apology'
  );
  assert.ok(
    whiteningTriage.responsePrompt?.includes('Certainly') || whiteningTriage.responsePrompt?.includes('explore'),
    `Expected positive professional tone for cosmetic whitening, got: "${whiteningTriage.responsePrompt}"`
  );
  console.log('  ✓ Cosmetic whitening received cheerful, professional tone without pain apology.');

  // --------------------------------------------------------------------------
  // TEST N: FAQ Interruption during TRIAGE_CLARIFICATION
  // --------------------------------------------------------------------------
  console.log('\nN. Testing FAQ Interruption during TRIAGE_CLARIFICATION:');
  const sessN = 'test-faq-interruption-triage-sess';
  await aiReceptionistService.processMessage({
    message: 'Something feels weird in my mouth.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessN,
    },
  });

  const resN = await aiReceptionistService.processMessage({
    message: 'Is parking available?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessN,
    },
  });

  assert.strictEqual(resN.success, true);
  assert.ok(resN.response.includes('Free designated patient parking'), 'Should answer parking FAQ');
  assert.ok(
    resN.response.includes('Returning to your dental concern'),
    'Should prompt seamless resumption of active triage inquiry'
  );

  const storedN = await sessionStore.getSession(sessN);
  assert.strictEqual(storedN?.step, BookingConversationStep.TRIAGE_CLARIFICATION);
  console.log('  ✓ FAQ answered mid-triage and TRIAGE_CLARIFICATION step strictly preserved.');

  // --------------------------------------------------------------------------
  // TEST O: Confirmed Triage Proceeds into Booking
  // --------------------------------------------------------------------------
  console.log('\nO. Testing Confirmed Triage Advances to Staff Selection:');
  const resO = await aiReceptionistService.processMessage({
    message: 'Yes, please schedule that appointment.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessA,
    },
  });

  assert.strictEqual(resO.success, true);
  assert.ok(
    resO.response.includes('Marcus Thorne') || resO.response.includes('specialist'),
    `Expected specialist prompt, got: "${resO.response}"`
  );

  const storedO = await sessionStore.getSession(sessA);
  assert.strictEqual(storedO?.step, BookingConversationStep.BOOKING_COLLECT_STAFF);
  console.log('  ✓ Patient agreement smoothly advanced session to BOOKING_COLLECT_STAFF.');

  // --------------------------------------------------------------------------
  // TEST P: Multi-Tenant Triage Isolation
  // --------------------------------------------------------------------------
  console.log('\nP. Testing Multi-Tenant Triage Isolation:');
  const sessP1 = 'test-tenant-iso-1';
  const sessP2 = 'test-tenant-iso-2';

  await aiReceptionistService.processMessage({
    message: 'My molar is cracked.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessP1,
    },
  });

  await aiReceptionistService.processMessage({
    message: 'I want dental implants.',
    context: {
      businessId: ZENITH_IMPLANTS_BUSINESS_ID,
      sessionId: sessP2,
    },
  });

  const storedP1 = await sessionStore.getSession(sessP1);
  const storedP2 = await sessionStore.getSession(sessP2);

  assert.strictEqual(storedP1?.businessId, LUMINA_DENTAL_BUSINESS_ID);
  assert.strictEqual(storedP2?.businessId, ZENITH_IMPLANTS_BUSINESS_ID);
  assert.strictEqual(storedP1?.triageProfile?.originalPatientStatement, 'My molar is cracked.');
  assert.strictEqual(storedP2?.triageProfile?.originalPatientStatement, 'I want dental implants.');
  console.log('  ✓ Multi-tenant triage sessions strictly isolated between clinics.');

  console.log('\n======================================================');
  console.log('🎉 ALL CONVERSATIONAL DENTAL TRIAGE TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
