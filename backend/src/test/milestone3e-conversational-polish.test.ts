import assert from 'assert';
import { AIReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';
import { sessionStore } from '../modules/ai/conversation';
import {
  LUMINA_DENTAL_BUSINESS_ID,
  APEX_ENDODONTICS_BUSINESS_ID,
  ZENITH_IMPLANTS_BUSINESS_ID,
  RADIANCE_PEDIATRIC_BUSINESS_ID,
} from '../modules/ai/knowledge/clinic-capabilities';
import {
  isSisterClinicNameQuery,
  isSisterSpecialistQuery,
  isSisterPracticeQuery,
} from '../modules/ai/conversation/appointment-state-machine';
import { AIIntent } from '../modules/ai/types/intent.types';
import { AIAction } from '../modules/ai/types/action.types';
import { prisma } from '../lib/prisma';

export async function runMilestone3EConversationalPolishTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- RUNNING MILESTONE 3E CONVERSATIONAL POLISH TESTS ---');
  console.log('======================================================\n');

  const aiService = new AIReceptionistService();

  // Helper to establish a session with a pending recommendation
  async function createZenithRecommendationSession(idSuffix: string): Promise<string> {
    const sessionId = `test-m3e-zenith-${idSuffix}-${Date.now()}`;
    const res = await aiService.processMessage({
      message: 'I need an implant for my missing tooth.',
      context: { sessionId, businessId: LUMINA_DENTAL_BUSINESS_ID },
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.response.includes('Zenith Dental Implants & Periodontics'));
    const stored = await sessionStore.getSession(sessionId);
    assert.strictEqual(stored?.step, BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED);
    assert.strictEqual(stored?.pendingRecommendation?.candidateBusinessId, ZENITH_IMPLANTS_BUSINESS_ID);
    assert.strictEqual(stored?.businessId, LUMINA_DENTAL_BUSINESS_ID);
    return sessionId;
  }

  async function createApexRecommendationSession(idSuffix: string): Promise<string> {
    const sessionId = `test-m3e-apex-${idSuffix}-${Date.now()}`;
    const res = await aiService.processMessage({
      message: 'I think I need a root canal for my back tooth.',
      context: { sessionId, businessId: LUMINA_DENTAL_BUSINESS_ID },
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.response.includes('Apex Endodontics & Oral Surgery'));
    const stored = await sessionStore.getSession(sessionId);
    assert.strictEqual(stored?.step, BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED);
    assert.strictEqual(stored?.pendingRecommendation?.candidateBusinessId, APEX_ENDODONTICS_BUSINESS_ID);
    assert.strictEqual(stored?.businessId, LUMINA_DENTAL_BUSINESS_ID);
    return sessionId;
  }

  // ==========================================================================
  // PART 1: ISSUE 1 — NATURAL SISTER-CLINIC NAME QUERIES
  // ==========================================================================
  console.log('1. Testing Natural Sister-Clinic Name Query Variants:');

  const clinicNameVariants = [
    "What's the other clinic called?",
    'What is the other clinic called?',
    "What's that clinic called?",
    'What is that clinic called?',
    "What's the name of that clinic?",
    'What is the name of that clinic?',
    "What's the other practice called?",
    'What is the other practice called?',
    "What's their clinic called?",
    "What's the name of the other clinic?",
    "And what's the other clinic called?",
  ];

  for (let i = 0; i < clinicNameVariants.length; i++) {
    const variant = clinicNameVariants[i];
    const sId = await createZenithRecommendationSession(`name-${i}`);
    const res = await aiService.processMessage({
      message: variant,
      context: { sessionId: sId, businessId: LUMINA_DENTAL_BUSINESS_ID },
    });

    assert.strictEqual(res.success, true);
    assert.ok(
      res.response.includes('The recommended clinic is Zenith Dental Implants & Periodontics') ||
      res.response.includes('Zenith Dental Implants & Periodontics'),
      `Variant "${variant}" must directly identify Zenith clinic name`
    );
    assert.ok(
      res.response.includes('Dental Implant Consultation & 3D Cone Beam Scan'),
      `Variant "${variant}" must reference recommended service`
    );

    const stored = await sessionStore.getSession(sId);
    assert.strictEqual(
      stored?.step,
      BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED,
      `Variant "${variant}" must preserve NETWORK_RECOMMENDATION_OFFERED`
    );
    assert.strictEqual(
      stored?.businessId,
      LUMINA_DENTAL_BUSINESS_ID,
      `Variant "${variant}" must preserve Lumina businessId`
    );
    assert.strictEqual(
      stored?.pendingRecommendation?.candidateBusinessId,
      ZENITH_IMPLANTS_BUSINESS_ID,
      `Variant "${variant}" must retain pendingRecommendation`
    );
  }
  console.log('   ✓ All 11 natural clinic-name query variants directly return Zenith name while preserving state');

  // Test clinic name query for Apex root canal recommendation
  console.log('1b. Testing Sister-Clinic Name Query on Apex Session:');
  const apexSessionName = await createApexRecommendationSession('apex-name');
  const resApexName = await aiService.processMessage({
    message: "What's the other clinic called?",
    context: { sessionId: apexSessionName, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(
    resApexName.response.includes('The recommended clinic is Apex Endodontics & Oral Surgery') ||
    resApexName.response.includes('Apex Endodontics & Oral Surgery'),
    'Must identify Apex Endodontics clinic name'
  );
  console.log('   ✓ Clinic-name query accurately identifies Apex on endodontic session');

  // ==========================================================================
  // PART 2: ISSUE 2 — SPECIALIST LOOKUP WHILE RECOMMENDATION IS PENDING
  // ==========================================================================
  console.log('\n2. Testing Specialist Lookup while Recommendation is Pending:');

  const specialistVariants = [
    'Who handles the implant consultation?',
    'Which doctor handles implants?',
    'Who would I see there?',
    'Who is the specialist there?',
    'Which dentist handles this?',
    'Who handles this treatment?',
    'Who does implants there?',
    'Who would perform the consultation?',
    'Who should I ask for?',
    'Which doctor would I see?',
    'Who handles this at that clinic?',
    'Who specializes in this?',
    'Who handles this?',
    'Who is the doctor?',
    'Tell me about the doctor',
  ];

  for (let i = 0; i < specialistVariants.length; i++) {
    const variant = specialistVariants[i];
    const sId = await createZenithRecommendationSession(`spec-${i}`);
    const res = await aiService.processMessage({
      message: variant,
      context: { sessionId: sId, businessId: LUMINA_DENTAL_BUSINESS_ID },
    });

    assert.strictEqual(res.success, true);
    assert.ok(
      res.response.includes('Dr. Elena Rostova'),
      `Variant "${variant}" must return configured specialist Dr. Elena Rostova`
    );
    assert.ok(
      res.response.includes('Periodontist & Implantologist') || res.response.includes('Zenith'),
      `Variant "${variant}" must return specialist title or clinic context`
    );

    const stored = await sessionStore.getSession(sId);
    assert.strictEqual(
      stored?.step,
      BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED,
      `Variant "${variant}" must preserve NETWORK_RECOMMENDATION_OFFERED`
    );
    assert.strictEqual(
      stored?.businessId,
      LUMINA_DENTAL_BUSINESS_ID,
      `Variant "${variant}" must preserve Lumina businessId`
    );
    assert.strictEqual(
      stored?.pendingRecommendation?.candidateBusinessId,
      ZENITH_IMPLANTS_BUSINESS_ID,
      `Variant "${variant}" must retain pendingRecommendation`
    );
  }
  console.log('   ✓ All 15 specialist lookup variants directly return Dr. Elena Rostova with role while preserving state');

  // Test specialist lookup on Apex root canal session
  console.log('2b. Testing Specialist Lookup on Apex Root Canal Session:');
  const apexSessionSpec = await createApexRecommendationSession('apex-spec');
  const resApexSpec = await aiService.processMessage({
    message: 'Who handles this?',
    context: { sessionId: apexSessionSpec, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resApexSpec.response.includes('Dr. Alistair Sterling'), 'Must return Dr. Alistair Sterling');
  assert.ok(
    resApexSpec.response.includes('Endodontic Specialist & Microsurgeon') || resApexSpec.response.includes('Apex'),
    'Must return configured endodontic role'
  );
  console.log('   ✓ Specialist query accurately identifies Dr. Alistair Sterling on Apex session');

  // Test specialist lookup on Radiance clear aligners session
  console.log('2c. Testing Specialist Lookup on Radiance Clear Aligners Session:');
  const radianceSession = 'test-m3e-radiance-' + Date.now();
  await aiService.processMessage({
    message: 'I want clear aligners to straighten my teeth.',
    context: { sessionId: radianceSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  const resRadSpec = await aiService.processMessage({
    message: 'Who handles the consultation?',
    context: { sessionId: radianceSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resRadSpec.response.includes('Dr. Jordan Lee'), 'Must return Dr. Jordan Lee');
  console.log('   ✓ Specialist query accurately identifies Dr. Jordan Lee on Radiance session');

  // ==========================================================================
  // PART 3: UNIT MATCHER TESTS FOR ISOLATED VALIDATION
  // ==========================================================================
  console.log('\n3. Testing Isolated Query Matchers:');

  // isSisterClinicNameQuery
  assert.strictEqual(isSisterClinicNameQuery("what's the other clinic called"), true);
  assert.strictEqual(isSisterClinicNameQuery('what is the other clinic called'), true);
  assert.strictEqual(isSisterClinicNameQuery("what's that clinic called"), true);
  assert.strictEqual(isSisterClinicNameQuery('what is that clinic called'), true);
  assert.strictEqual(isSisterClinicNameQuery("what's the name of that clinic"), true);
  assert.strictEqual(isSisterClinicNameQuery('what is the name of that clinic'), true);
  assert.strictEqual(isSisterClinicNameQuery("what's the other practice called"), true);
  assert.strictEqual(isSisterClinicNameQuery("what's their clinic called"), true);
  assert.strictEqual(isSisterClinicNameQuery('what is the name of the other clinic'), true);
  assert.strictEqual(isSisterClinicNameQuery('which clinic'), true);
  assert.strictEqual(isSisterClinicNameQuery('what clinic'), true);
  // Negative cases for clinic name query
  assert.strictEqual(isSisterClinicNameQuery('what time do you close'), false);
  assert.strictEqual(isSisterClinicNameQuery('what is your address'), false);
  assert.strictEqual(isSisterClinicNameQuery('what services do you offer'), false);
  console.log('   ✓ isSisterClinicNameQuery matcher verified on positive and negative inputs');

  // isSisterSpecialistQuery
  assert.strictEqual(isSisterSpecialistQuery('who handles the implant consultation'), true);
  assert.strictEqual(isSisterSpecialistQuery('who handles this treatment'), true);
  assert.strictEqual(isSisterSpecialistQuery('who would i see there'), true);
  assert.strictEqual(isSisterSpecialistQuery('which doctor handles implants'), true);
  assert.strictEqual(isSisterSpecialistQuery('who does implants there'), true);
  assert.strictEqual(isSisterSpecialistQuery('which dentist handles this'), true);
  assert.strictEqual(isSisterSpecialistQuery('who is the specialist there'), true);
  assert.strictEqual(isSisterSpecialistQuery('who would perform the consultation'), true);
  assert.strictEqual(isSisterSpecialistQuery('who should i ask for'), true);
  assert.strictEqual(isSisterSpecialistQuery('which doctor would i see'), true);
  assert.strictEqual(isSisterSpecialistQuery('who handles this at that clinic'), true);
  assert.strictEqual(isSisterSpecialistQuery('who specializes in this'), true);
  assert.strictEqual(isSisterSpecialistQuery('who handles this'), true);
  // Negative cases for specialist query
  assert.strictEqual(isSisterSpecialistQuery('what time do you open'), false);
  assert.strictEqual(isSisterSpecialistQuery('how much does it cost'), false);
  console.log('   ✓ isSisterSpecialistQuery matcher verified on positive and negative inputs');

  // isSisterPracticeQuery exclusions
  assert.strictEqual(isSisterPracticeQuery('what time does lumina close'), false, 'Must reject Lumina query');
  assert.strictEqual(isSisterPracticeQuery('who is the doctor here'), false, 'Must reject "here" query');
  assert.strictEqual(isSisterPracticeQuery('who is the doctor at this clinic'), false, 'Must reject "this clinic" query');
  console.log('   ✓ isSisterPracticeQuery strictly excludes queries referencing Lumina / here');

  // ==========================================================================
  // PART 4: NEGATIVE & GUARD TESTS (NO LEAKS, NO FALSE ACTIVATIONS)
  // ==========================================================================
  console.log('\n4. Testing Negative & Guard Behaviors:');

  // Guard 4a: Fresh Lumina session without pending recommendation
  const freshSession = 'test-m3e-fresh-' + Date.now();
  const freshRes = await aiService.processMessage({
    message: 'Who is the doctor?',
    context: { sessionId: freshSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  // Must return Lumina's staff information, NOT a sister clinic
  assert.ok(
    freshRes.response.includes('Dr. Marcus Thorne') ||
    freshRes.response.includes('Dr. Emily Chen') ||
    freshRes.response.includes('David Miller'),
    'Fresh session must return Lumina staff FAQ'
  );
  assert.ok(!freshRes.response.includes('Dr. Elena Rostova'), 'Must NOT return Zenith doctor without recommendation');
  assert.ok(!freshRes.response.includes('Dr. Alistair Sterling'), 'Must NOT return Apex doctor without recommendation');
  console.log('   ✓ Fresh session correctly returns Lumina staff FAQ without activating sister clinic logic');

  // Guard 4b: Asking about Lumina doctor while recommendation is pending
  const sessLuminaDoc = await createZenithRecommendationSession('lumina-doc');
  const resLuminaDoc = await aiService.processMessage({
    message: 'Who is the doctor at Lumina?',
    context: { sessionId: sessLuminaDoc, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(
    resLuminaDoc.response.includes('Dr. Marcus Thorne') ||
    resLuminaDoc.response.includes('Dr. Emily Chen'),
    'Must answer Lumina doctors when explicitly asked about Lumina'
  );
  assert.ok(
    resLuminaDoc.response.includes('Zenith Dental Implants & Periodontics'),
    'Must include resumption question for Zenith sister practice'
  );
  console.log('   ✓ Explicit Lumina doctor question during recommendation answers Lumina staff with sister resumption');

  // Guard 4c: Emergency priority during pending recommendation
  const sessEmerg = await createZenithRecommendationSession('emerg');
  const resEmerg = await aiService.processMessage({
    message: "My face is swelling and I can't breathe.",
    context: { sessionId: sessEmerg, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.strictEqual(resEmerg.intent, AIIntent.EMERGENCY_DENTAL);
  assert.strictEqual(resEmerg.action, AIAction.EMERGENCY_ESCALATION);
  assert.ok(
    resEmerg.response.includes('911') || resEmerg.response.includes('emergency room'),
    'Must trigger emergency escalation protocol'
  );
  assert.ok(!resEmerg.response.includes('Zenith'), 'Emergency must NOT promote sister clinic');
  assert.ok(!resEmerg.response.includes('Dr. Elena Rostova'), 'Emergency must NOT return specialist');
  console.log('   ✓ Emergency strictly overrides recommendation; no clinic or specialist query leakage');

  // Guard 4d: Multi-turn preservation and tenant isolation
  const multiSession = 'test-m3e-multi-' + Date.now();
  // Turn 1: Symptom -> Zenith offered
  await aiService.processMessage({
    message: 'I want an implant.',
    context: { sessionId: multiSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  // Turn 2: FAQ Lumina hours
  const t2 = await aiService.processMessage({
    message: 'What time does Lumina close?',
    context: { sessionId: multiSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(t2.response.includes('8') && t2.response.includes('6'));
  assert.ok(t2.response.includes('Zenith'));

  // Turn 3: Clinic Name Query
  const t3 = await aiService.processMessage({
    message: "What's that clinic called?",
    context: { sessionId: multiSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(t3.response.includes('Zenith Dental Implants & Periodontics'));

  // Turn 4: Specialist Query
  const t4 = await aiService.processMessage({
    message: 'Who handles the implant consultation?',
    context: { sessionId: multiSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(t4.response.includes('Dr. Elena Rostova'));

  // Turn 5: Address Query
  const t5 = await aiService.processMessage({
    message: 'Where are they located?',
    context: { sessionId: multiSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(t5.response.includes('1200 Financial Plaza'));

  // Turn 6: Natural Decline
  const t6 = await aiService.processMessage({
    message: "Thanks, I'll stay with Lumina.",
    context: { sessionId: multiSession, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(t6.response.includes('Lumina Dental Care'));
  assert.ok(t6.response.includes('Comprehensive Oral Exam & Digital X-Rays'));

  const finalStored = await sessionStore.getSession(multiSession);
  assert.strictEqual(finalStored?.businessId, LUMINA_DENTAL_BUSINESS_ID, 'Session businessId must remain Lumina throughout');
  assert.strictEqual(finalStored?.pendingRecommendation, undefined, 'Recommendation must be cleared after decline');
  assert.strictEqual(finalStored?.step, BookingConversationStep.BOOKING_SYMPTOM_TRIAGE);
  console.log('   ✓ Multi-turn flow (Implant -> FAQ -> Name -> Specialist -> Location -> Decline) perfectly isolated');

  // Guard 4e: Database safety
  const apptCount = await prisma.appointment.count();
  const custCount = await prisma.customer.count();
  assert.strictEqual(apptCount, 44, 'No appointments created during test suite');
  assert.strictEqual(custCount, 75, 'No customers created during test suite');
  console.log('   ✓ Database safety confirmed: 44 appointments, 75 customers unmutated');

  console.log('\n======================================================');
  console.log('🎉 ALL MILESTONE 3E CONVERSATIONAL POLISH TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
