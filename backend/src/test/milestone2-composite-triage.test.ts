import assert from 'assert';
import { AIReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';
import { sessionStore } from '../modules/ai/conversation';
import {
  LUMINA_DENTAL_BUSINESS_ID,
  ZENITH_IMPLANTS_BUSINESS_ID,
  RADIANCE_PEDIATRIC_BUSINESS_ID,
} from '../modules/ai/knowledge/clinic-capabilities';
import {
  extractTriageFacts,
  mergeTriageFacts,
  selectNextFollowUpQuestion,
} from '../modules/ai/knowledge/triage-extractor';
import {
  triageDentalInquiry,
  compositeDentalTriage,
} from '../modules/ai/knowledge/dental-knowledge';
import {
  DentalClinicalCategory,
  matchGlobalDentalComplaintsWithEvidence,
} from '../modules/ai/knowledge/global-dental-catalogue';
import { AIAction } from '../modules/ai/types/action.types';
import { AIIntent } from '../modules/ai/types/intent.types';

export async function runMilestone2CompositeTriageTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- RUNNING MILESTONE 2 COMPOSITE TRIAGE TEST SUITE ---');
  console.log('======================================================\n');

  const aiReceptionistService = new AIReceptionistService();

  // --------------------------------------------------------------------------
  // TEST A: Broken Tooth + Throbbing Pain (Multi-Symptom Evidence & High Urgency)
  // --------------------------------------------------------------------------
  console.log('A. Testing Broken Tooth + Throbbing Pain:');
  const utteranceA = 'My tooth broke and now it throbs.';
  const triageA = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceA);

  assert.strictEqual(triageA.matched, true);
  assert.ok(triageA.triageProfile, 'triageProfile must be created');
  assert.ok(
    triageA.triageProfile.reportedSymptoms.includes('broken tooth'),
    'reportedSymptoms must include broken tooth'
  );
  assert.ok(
    triageA.triageProfile.reportedSymptoms.includes('throbbing tooth pain'),
    'reportedSymptoms must include throbbing tooth pain'
  );
  assert.ok(
    triageA.triageProfile.symptomCategories.includes(DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION),
    'symptomCategories must include FRACTURED_TOOTH_RESTORATION'
  );
  assert.ok(
    triageA.triageProfile.symptomCategories.includes(DentalClinicalCategory.PULPITIS_ENDODONTICS),
    'symptomCategories must include PULPITIS_ENDODONTICS'
  );
  assert.ok(
    triageA.rankedCategories && triageA.rankedCategories.length >= 2,
    'rankedCategories must contain both fractured and pulpal evidence'
  );
  assert.strictEqual(triageA.urgencyLevel, 'HIGH');
  assert.strictEqual(triageA.recommendedNextStep, 'DENTAL_EXAMINATION');
  assert.strictEqual(triageA.suggestedServiceName, 'Comprehensive Oral Exam & Digital X-Rays');
  assert.strictEqual(triageA.suggestedStaffName, 'Dr. Marcus Thorne');
  // Non-diagnostic verification:
  assert.ok(
    !triageA.responsePrompt?.toLowerCase().includes('you have pulpitis'),
    'Response must never declare a clinical diagnosis of pulpitis'
  );
  console.log('  ✓ Broken + throbbing retained both symptoms, ranked evidence, and high urgency.');

  // --------------------------------------------------------------------------
  // TEST B: Gums Bleeding + Cold Sensitivity
  // --------------------------------------------------------------------------
  console.log('\nB. Testing Gums Bleeding + Cold Sensitivity:');
  const utteranceB = 'My gums bleed when I brush and my teeth are sensitive to cold.';
  const triageB = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceB);

  assert.strictEqual(triageB.matched, true);
  assert.ok(
    triageB.triageProfile?.reportedSymptoms.includes('bleeding gums'),
    'reportedSymptoms must retain bleeding gums'
  );
  assert.ok(
    triageB.triageProfile?.reportedSymptoms.includes('cold sensitivity'),
    'reportedSymptoms must retain cold sensitivity'
  );
  assert.ok(
    triageB.triageProfile?.symptomCategories.includes(DentalClinicalCategory.GINGIVITIS),
    'Must include GINGIVITIS category'
  );
  assert.ok(
    triageB.triageProfile?.symptomCategories.includes(DentalClinicalCategory.DENTAL_SENSITIVITY),
    'Must include DENTAL_SENSITIVITY category'
  );
  assert.strictEqual(triageB.urgencyLevel, 'ROUTINE');
  assert.strictEqual(triageB.recommendedNextStep, 'DENTAL_EXAMINATION');
  console.log('  ✓ Gums bleeding and cold sensitivity synthesized without discarding either signal.');

  // --------------------------------------------------------------------------
  // TEST C: Swelling + Severe Tooth Pain
  // --------------------------------------------------------------------------
  console.log('\nC. Testing Swelling + Severe Tooth Pain:');
  const utteranceC = 'My face is swollen and my tooth hurts badly.';
  const triageC = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceC);

  assert.strictEqual(triageC.matched, true);
  assert.ok(
    triageC.triageProfile?.reportedSymptoms.includes('facial cheek swelling') ||
      triageC.triageProfile?.swellingPresent === true,
    'Must capture swelling signal'
  );
  assert.ok(
    triageC.triageProfile?.reportedSymptoms.includes('toothache'),
    'Must capture toothache signal'
  );
  assert.strictEqual(triageC.urgencyLevel, 'URGENT');
  assert.strictEqual(triageC.recommendedNextStep, 'URGENT_EVALUATION');
  assert.ok(
    triageC.responsePrompt?.includes('urgent examination today') ||
      triageC.responsePrompt?.includes('prompt professional attention'),
    'Must recommend urgent same-day evaluation'
  );
  console.log('  ✓ Swelling + severe tooth pain triggered elevated urgent triage.');

  // --------------------------------------------------------------------------
  // TEST D: Missing Tooth + Yellow Teeth
  // --------------------------------------------------------------------------
  console.log('\nD. Testing Missing Tooth + Yellow Teeth:');
  const utteranceD = 'I have a missing tooth and my other teeth are yellow.';
  const triageD = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceD);

  assert.strictEqual(triageD.matched, true);
  assert.ok(
    triageD.triageProfile?.reportedSymptoms.includes('missing tooth') ||
      triageD.patientGoals?.includes('REPLACE_MISSING_TOOTH'),
    'Must retain missing tooth goal'
  );
  assert.ok(
    triageD.triageProfile?.reportedSymptoms.includes('tooth discoloration') ||
      triageD.patientGoals?.includes('WHITEN_TEETH'),
    'Must retain whitening/aesthetic goal'
  );
  assert.ok(
    triageD.responsePrompt?.includes('replac') && triageD.responsePrompt?.includes('whiten'),
    'Prompt must address both missing tooth replacement and whitening'
  );
  console.log('  ✓ Missing tooth and yellow teeth coexisted without erasing each other.');

  // --------------------------------------------------------------------------
  // TEST E: Patient Goal = Tooth Replacement
  // --------------------------------------------------------------------------
  console.log('\nE. Testing Patient Goal = Tooth Replacement:');
  const utteranceE = 'I lost a tooth and want to replace it.';
  const factsE = extractTriageFacts(utteranceE);
  assert.strictEqual(factsE.patientGoal, 'REPLACE_MISSING_TOOTH');

  const triageE = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceE);
  assert.strictEqual(triageE.suggestedServiceName, 'Comprehensive Oral Exam & Digital X-Rays');
  assert.ok(
    triageE.responsePrompt?.includes('implant, bridge, or partial denture'),
    'Must explain replacement options cautiously'
  );
  console.log('  ✓ Patient goal cleanly inferred as REPLACE_MISSING_TOOTH with evaluation-first routing.');

  // --------------------------------------------------------------------------
  // TEST F: Patient Goal = Whitening
  // --------------------------------------------------------------------------
  console.log('\nF. Testing Patient Goal = Whitening:');
  const utteranceF = 'I want my teeth whiter.';
  const factsF = extractTriageFacts(utteranceF);
  assert.strictEqual(factsF.patientGoal, 'WHITEN_TEETH');

  const triageF = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceF);
  assert.strictEqual(triageF.suggestedServiceName, 'Laser Enamel Whitening & Brightening');
  assert.strictEqual(triageF.isEmergency, false);
  console.log('  ✓ Patient goal inferred as WHITEN_TEETH and mapped to whitening service.');

  // --------------------------------------------------------------------------
  // TEST G: Patient Goal = Evaluation
  // --------------------------------------------------------------------------
  console.log('\nG. Testing Patient Goal = Evaluation:');
  const utteranceG = "I don't know what's wrong; I just want someone to check it.";
  const factsG = extractTriageFacts(utteranceG);
  assert.strictEqual(factsG.patientGoal, 'EVALUATION');

  const triageG = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceG);
  assert.strictEqual(triageG.suggestedServiceName, 'Comprehensive Oral Exam & Digital X-Rays');
  console.log('  ✓ Patient goal inferred as EVALUATION.');

  // --------------------------------------------------------------------------
  // TEST H: Patient Goal = Cost Information
  // --------------------------------------------------------------------------
  console.log('\nH. Testing Patient Goal = Cost Information:');
  const utteranceH = 'How much does an implant usually cost?';
  const factsH = extractTriageFacts(utteranceH);
  assert.strictEqual(factsH.patientGoal, 'COST_INFORMATION');

  const triageH = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceH);
  assert.strictEqual(triageH.recommendedNextStep, 'INFORMATIONAL_GUIDANCE');
  assert.ok(
    triageH.responsePrompt?.includes('$120') || triageH.responsePrompt?.includes('comprehensive'),
    'Must provide grounded clinic exam fee / consultation guidance'
  );
  console.log('  ✓ Cost inquiry delivered informational guidance without forcing an auto-booking session.');

  // --------------------------------------------------------------------------
  // TEST I: Patient Changes Goal
  // --------------------------------------------------------------------------
  console.log('\nI. Testing Patient Changes Goal:');
  let profileI = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, 'My tooth hurts.').triageProfile!;
  assert.ok(profileI.reportedSymptoms.includes('toothache'));

  const correctionTurn = "Actually, it doesn't hurt now. I just want to know about replacing it.";
  const factsTurn = extractTriageFacts(correctionTurn, profileI);
  profileI = mergeTriageFacts(profileI, factsTurn, correctionTurn);

  assert.strictEqual(profileI.patientGoal, 'REPLACE_MISSING_TOOTH');
  assert.strictEqual(profileI.painPattern, undefined, 'Pain pattern must be cleared');
  assert.ok(
    !profileI.reportedSymptoms.includes('toothache'),
    'Active reported symptoms must not contain resolved toothache'
  );
  console.log('  ✓ Latest explicit statement updated active patient goal and cleared stale pain.');

  // --------------------------------------------------------------------------
  // TEST J: Patient Corrects Symptom (Pain Pattern Update)
  // --------------------------------------------------------------------------
  console.log('\nJ. Testing Patient Corrects Symptom:');
  let profileJ = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, 'It hurts sometimes.').triageProfile!;
  assert.strictEqual(profileJ.painPattern, 'intermittent');

  const correctionPattern = 'Actually, it hurts constantly now.';
  const factsJ2 = extractTriageFacts(correctionPattern, profileJ);
  profileJ = mergeTriageFacts(profileJ, factsJ2, correctionPattern);

  assert.strictEqual(profileJ.painPattern, 'constant', 'Pain pattern must update to constant');
  console.log('  ✓ Pain pattern updated to constant following patient correction.');

  // --------------------------------------------------------------------------
  // TEST K: Follow-Up Engine Avoids Known Facts
  // --------------------------------------------------------------------------
  console.log('\nK. Testing Follow-up Engine Avoids Known Facts:');
  const coldProfile = compositeDentalTriage(
    LUMINA_DENTAL_BUSINESS_ID,
    'My tooth hurts when I drink cold water.'
  ).triageProfile!;

  assert.ok(coldProfile.triggers.includes('cold'));
  const nextColdQuestion = selectNextFollowUpQuestion(coldProfile);
  assert.ok(nextColdQuestion, 'Next follow-up question expected');
  assert.ok(
    !nextColdQuestion.includes('Does anything trigger the pain?'),
    'Must not ask what triggers the pain since cold is already known'
  );
  assert.ok(
    nextColdQuestion.includes('stop quickly') || nextColdQuestion.includes('continue'),
    `Expected lingering sensitivity question, got: "${nextColdQuestion}"`
  );

  const swellingProfile = compositeDentalTriage(
    LUMINA_DENTAL_BUSINESS_ID,
    'My face is swollen.'
  ).triageProfile!;
  assert.strictEqual(swellingProfile.swellingPresent, true);
  const nextSwellingQuestion = selectNextFollowUpQuestion(swellingProfile);
  assert.ok(
    !nextSwellingQuestion?.includes('Is there swelling?'),
    'Must not ask if there is swelling when swelling is already known'
  );
  assert.ok(
    nextSwellingQuestion?.includes('spreading') || nextSwellingQuestion?.includes('swallowing'),
    `Expected spreading/breathing screening question, got: "${nextSwellingQuestion}"`
  );
  console.log('  ✓ Follow-up questions selectively probe missing information without repeating known facts.');

  // --------------------------------------------------------------------------
  // TEST L: Multiple Symptoms Survive Multiple Turns
  // --------------------------------------------------------------------------
  console.log('\nL. Testing Multiple Symptoms Survive Multiple Turns:');
  const sessL = 'test-m2-multi-turn-symptoms';
  const resL1 = await aiReceptionistService.processMessage({
    message: 'A piece of my tooth broke off while eating.',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessL },
  });
  assert.strictEqual(resL1.success, true);

  const resL2 = await aiReceptionistService.processMessage({
    message: 'And now it throbs constantly.',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessL },
  });
  assert.strictEqual(resL2.success, true);

  const storedL = await sessionStore.getSession(sessL);
  assert.ok(storedL?.triageProfile);
  assert.ok(
    storedL.triageProfile.reportedSymptoms.includes('broken tooth'),
    'broken tooth must survive Turn 2'
  );
  assert.ok(
    storedL.triageProfile.reportedSymptoms.includes('throbbing tooth pain'),
    'throbbing tooth pain must be present in Turn 2'
  );
  assert.ok(
    storedL.triageProfile.painPattern === 'constant' || storedL.triageProfile.painPattern === 'throbbing',
    `Expected pain pattern constant or throbbing, got ${storedL.triageProfile.painPattern}`
  );
  console.log('  ✓ Both broken tooth and throbbing pain persisted across conversational turns.');

  // --------------------------------------------------------------------------
  // TEST M: Explicit Service Request Direct Booking
  // --------------------------------------------------------------------------
  console.log('\nM. Testing Explicit Service Request Direct Booking:');
  const sessM = 'test-m2-explicit-service';
  const resM = await aiReceptionistService.processMessage({
    message: 'I want to book an appointment for Laser Enamel Whitening',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessM },
  });

  assert.strictEqual(resM.success, true);
  const storedM = await sessionStore.getSession(sessM);
  assert.strictEqual(storedM?.step, BookingConversationStep.BOOKING_COLLECT_STAFF);
  assert.strictEqual(storedM?.selectedServiceName, 'Laser Enamel Whitening & Brightening');
  console.log('  ✓ Explicit service request transitioned directly to specialist preference.');

  // --------------------------------------------------------------------------
  // TEST N: Unsupported Service Capability Boundary
  // --------------------------------------------------------------------------
  console.log('\nN. Testing Unsupported Service Capability Boundary:');
  const resN = await aiReceptionistService.processMessage({
    message: 'Do you perform surgical dental implants here?',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: 'test-m2-unsupported' },
  });

  assert.strictEqual(resN.success, true);
  assert.ok(
    resN.response.includes('does not currently list dental implant treatment') ||
      resN.response.includes('look for a dental clinic'),
    `Expected boundary response, got: "${resN.response}"`
  );
  console.log('  ✓ Unavailable service boundary enforced honestly.');

  // --------------------------------------------------------------------------
  // TEST O: Tentative Non-Diagnostic Language Safety
  // --------------------------------------------------------------------------
  console.log('\nO. Testing Tentative Non-Diagnostic Language Safety:');
  const testPhrases = [
    'My tooth is throbbing at night.',
    'There is a hole in my back tooth.',
    'My gums bleed when brushing.',
    'My teeth are sensitive to ice.',
    'A piece of my tooth broke.',
  ];

  for (const phrase of testPhrases) {
    const res = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, phrase);
    const text = (res.cautiousExplanation || '') + (res.responsePrompt || '');
    assert.ok(!text.includes('You have pulpitis'), `Forbidden diagnosis in: ${phrase}`);
    assert.ok(!text.includes('You have an abscess'), `Forbidden diagnosis in: ${phrase}`);
    assert.ok(!text.includes('You have gingivitis'), `Forbidden diagnosis in: ${phrase}`);
    assert.ok(
      text.includes('associated with') ||
        text.includes('examine') ||
        text.includes('evaluation') ||
        text.includes('inspect') ||
        text.includes('suggest'),
      `Expected cautious tentative clinical wording for "${phrase}", got "${text}"`
    );
  }
  console.log('  ✓ Non-diagnostic tentativeness strictly maintained across clinical responses.');

  // --------------------------------------------------------------------------
  // TEST P: Emergency Combined-Evidence Handling
  // --------------------------------------------------------------------------
  console.log('\nP. Testing Emergency Combined-Evidence Handling:');
  const utteranceP = 'My face is swollen and I cannot breathe normally.';
  const triageP = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, utteranceP);

  assert.strictEqual(triageP.isEmergency, true);
  assert.strictEqual(triageP.urgencyLevel, 'CRITICAL');
  assert.strictEqual(triageP.recommendedNextStep, 'EMERGENCY_ESCALATION');
  assert.ok(
    triageP.responsePrompt?.includes('911') || triageP.responsePrompt?.includes('emergency room'),
    'Emergency 911 instruction required for respiratory difficulty'
  );
  console.log('  ✓ Severe swelling with airway compromise immediately escalated to ER protocol.');

  // --------------------------------------------------------------------------
  // TEST Q: Mid-Triage FAQ Interruption Preserves Composite Triage State
  // --------------------------------------------------------------------------
  console.log('\nQ. Testing Mid-Triage FAQ Interruption State Preservation:');
  const sessQ = 'test-m2-faq-preserve';
  await aiReceptionistService.processMessage({
    message: 'My tooth broke and now it throbs.',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessQ },
  });

  const resQ = await aiReceptionistService.processMessage({
    message: 'Can I bring someone with me for support?',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessQ },
  });

  assert.ok(resQ.response.includes('waiting lounge') || resQ.response.includes('companion'));
  assert.ok(resQ.response.includes('Returning to your dental concern'));

  const storedQ = await sessionStore.getSession(sessQ);
  assert.ok(storedQ?.triageProfile);
  assert.ok(storedQ.triageProfile.reportedSymptoms.includes('broken tooth'));
  assert.ok(storedQ.triageProfile.reportedSymptoms.includes('throbbing tooth pain'));
  console.log('  ✓ Composite triage state strictly preserved across mid-flow FAQ interruption.');

  // --------------------------------------------------------------------------
  // TEST R: Multi-Tenant Triage Isolation
  // --------------------------------------------------------------------------
  console.log('\nR. Testing Multi-Tenant Triage Isolation:');
  const luminaTriage = compositeDentalTriage(LUMINA_DENTAL_BUSINESS_ID, 'I want a dental implant.');
  const zenithTriage = compositeDentalTriage(ZENITH_IMPLANTS_BUSINESS_ID, 'I want a dental implant.');

  assert.strictEqual(zenithTriage.isSupportedByClinic, true);
  assert.strictEqual(zenithTriage.suggestedStaffName, 'Dr. Elena Rostova');
  assert.strictEqual(luminaTriage.isSupportedByClinic, false);
  console.log('  ✓ Multi-tenant triage isolation verified between Lumina and Zenith.');

  // --------------------------------------------------------------------------
  // TEST S: Existing Multi-Turn Booking Flow Remains Valid
  // --------------------------------------------------------------------------
  console.log('\nS. Testing Existing Multi-Turn Booking Flow Remains Valid:');
  const sessS = 'test-m2-booking-validity';
  const rS1 = await aiReceptionistService.processMessage({
    message: 'I would like to schedule an appointment',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessS },
  });
  assert.strictEqual(rS1.conversationState?.step, BookingConversationStep.BOOKING_COLLECT_SERVICE);

  const rS2 = await aiReceptionistService.processMessage({
    message: 'Comprehensive Oral Exam & Digital X-Rays',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessS },
  });
  assert.strictEqual(rS2.conversationState?.step, BookingConversationStep.BOOKING_COLLECT_STAFF);
  console.log('  ✓ Standard multi-turn booking flow advanced without interruption.');

  console.log('\n======================================================');
  console.log('🎉 ALL MILESTONE 2 COMPOSITE TRIAGE TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

if (process.argv[1]?.includes('milestone2-composite-triage.test')) {
  runMilestone2CompositeTriageTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

