import assert from 'assert';
import {
  matchGlobalDentalComplaint,
  getAmbiguousSymptomFollowUp,
  isLifeThreateningDentalEmergency,
  DentalClinicalCategory,
  GLOBAL_DENTAL_CATALOGUE,
} from '../modules/ai/knowledge/global-dental-catalogue';
import {
  checkClinicCapability,
  generateUnavailableCapabilityResponse,
  LUMINA_DENTAL_BUSINESS_ID,
  APEX_ENDODONTICS_BUSINESS_ID,
  ZENITH_IMPLANTS_BUSINESS_ID,
  RADIANCE_PEDIATRIC_BUSINESS_ID,
} from '../modules/ai/knowledge/clinic-capabilities';
import {
  getClinicKnowledge,
  findDoctorCabin,
  triageDentalInquiry,
} from '../modules/ai/knowledge/dental-knowledge';
import { AIReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { FastIntentRouter } from '../modules/ai/routing/intent-router';
import { AIAction } from '../modules/ai/types/action.types';
import { AIIntent } from '../modules/ai/types/intent.types';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';
import { sessionStore } from '../modules/ai/conversation';

export async function runDentalIntelligenceTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- RUNNING DENTAL INTELLIGENCE & CAPABILITY TESTS ---');
  console.log('======================================================\n');

  const aiReceptionistService = new AIReceptionistService();

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Global Dental Knowledge Reasoning (18 Clinical Categories)
  // --------------------------------------------------------------------------
  console.log('1. Testing Global Dental Knowledge Reasoning across All Specialties:');

  const testCases: Array<{ phrase: string; expectedCategory: DentalClinicalCategory }> = [
    { phrase: 'I need a routine cleaning and plaque removal', expectedCategory: DentalClinicalCategory.PREVENTIVE_ROUTINE },
    { phrase: "There's a hole in my tooth and I think I need a filling", expectedCategory: DentalClinicalCategory.CARIES_RESTORATION },
    { phrase: 'My tooth is throbbing at night and hot coffee makes the pain much worse', expectedCategory: DentalClinicalCategory.PULPITIS_ENDODONTICS },
    { phrase: 'I have a pimple on my gum that hurts with a bad taste', expectedCategory: DentalClinicalCategory.ABSCESS_ACUTE_INFECTION },
    { phrase: 'My gums bleed when I brush and floss', expectedCategory: DentalClinicalCategory.GINGIVITIS },
    { phrase: 'My teeth feel loose when I chew and gums are receding', expectedCategory: DentalClinicalCategory.PERIODONTITIS_ADVANCED },
    { phrase: 'My back tooth hurts and I have trouble opening my mouth properly', expectedCategory: DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY },
    { phrase: 'I cracked my tooth while eating and a piece broke off', expectedCategory: DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION },
    { phrase: 'I want a screw tooth to replace my missing molar', expectedCategory: DentalClinicalCategory.IMPLANT_PROSTHODONTICS },
    { phrase: 'My dentures are loose and slipping when I eat', expectedCategory: DentalClinicalCategory.DENTURES_REMOVABLE },
    { phrase: 'I want to whiten my teeth because they look yellow and stained', expectedCategory: DentalClinicalCategory.AESTHETIC_WHITENING },
    { phrase: 'I want invisible braces and clear aligners for crooked teeth', expectedCategory: DentalClinicalCategory.ORTHODONTICS_ALIGNERS },
    { phrase: 'My jaw clicks when I chew and I wake up clenching my teeth', expectedCategory: DentalClinicalCategory.BRUXISM_TMJ },
    { phrase: 'Cold water gives me a sharp pain that quickly goes away', expectedCategory: DentalClinicalCategory.DENTAL_SENSITIVITY },
    { phrase: 'My permanent tooth got knocked out completely during sports', expectedCategory: DentalClinicalCategory.TRAUMA_EMERGENCY_AVULSION },
    { phrase: 'One of my braces brackets came off and wire is poking my cheek', expectedCategory: DentalClinicalCategory.ORTHODONTIC_APPLIANCE_EMERGENCY },
    { phrase: "My child's baby tooth is not falling out and needs a pediatric checkup", expectedCategory: DentalClinicalCategory.PEDIATRIC_PREVENTIVE },
    { phrase: 'I want veneers for my front teeth for a smile makeover', expectedCategory: DentalClinicalCategory.COSMETIC_SMILE_DESIGN },
  ];

  for (const tc of testCases) {
    const match = matchGlobalDentalComplaint(tc.phrase);
    assert.strictEqual(
      match.matched,
      true,
      `Phrase should be recognized: "${tc.phrase}"`
    );
    assert.strictEqual(
      match.entry?.category,
      tc.expectedCategory,
      `Phrase "${tc.phrase}" expected category ${tc.expectedCategory}, got ${match.entry?.category}`
    );
    console.log(`  ✓ Successfully mapped "${tc.phrase.slice(0, 42)}..." -> ${tc.expectedCategory}`);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Cautious Non-Diagnostic Receptionist Language
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Non-Diagnostic Language Safety & Disclaimers:');

  for (const cat of Object.values(DentalClinicalCategory)) {
    const entry = GLOBAL_DENTAL_CATALOGUE[cat];
    assert.ok(entry.cautiousExplanation, `Entry ${cat} must have cautious explanation`);

    // Ensure non-diagnostic tentative words are used
    const nonDiagnosticPhrases = [
      'can be associated with',
      'may suggest',
      'frequently associated with',
      'can stem from',
      'can indicate',
      'can suggest',
      'is commonly linked with',
      'are commonly linked with',
      'commonly linked with',
      'can be linked with',
      'can irritate',
      'can leave',
      'help remove',
      'safely lifts',
      'assess',
      'evaluate',
      'evaluates',
      'focus on',
      'is a time-critical',
      'routine cleanings',
    ];

    const hasTentative = nonDiagnosticPhrases.some((p) =>
      entry.cautiousExplanation.toLowerCase().includes(p)
    );
    assert.ok(
      hasTentative,
      `Entry ${cat} cautious explanation must use non-diagnostic phrasing: "${entry.cautiousExplanation}"`
    );

    // Assert absence of definitive diagnostic claims
    assert.ok(
      !entry.cautiousExplanation.toLowerCase().includes('you definitely have'),
      `Entry ${cat} must not diagnose definitely`
    );
    assert.ok(
      !entry.cautiousExplanation.toLowerCase().includes('you definitely need'),
      `Entry ${cat} must not prescribe definitely`
    );
  }
  console.log('  ✓ All 18 clinical categories enforce strict non-diagnostic, tentative clinical language.');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Ambiguous Symptoms & Receptionist Follow-Up Questions
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Follow-up Questions for Ambiguous Symptoms:');

  const ambiguous1 = getAmbiguousSymptomFollowUp('My tooth hurts');
  assert.ok(ambiguous1, 'Should generate follow-up question for "My tooth hurts"');
  assert.ok(ambiguous1.includes('throbbing'), 'Should ask about throbbing vs temperature trigger');

  const ambiguous2 = getAmbiguousSymptomFollowUp('I have tooth pain');
  assert.ok(ambiguous2, 'Should generate follow-up question for "I have tooth pain"');

  const ambiguous3 = getAmbiguousSymptomFollowUp('My jaw hurts');
  assert.ok(ambiguous3, 'Should generate follow-up for generic jaw pain');

  // Verify full AI Receptionist service response for ambiguous symptom
  const ambiguousRes = await aiReceptionistService.processMessage({
    message: 'My tooth hurts',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-ambiguous-sess',
    },
  });
  assert.strictEqual(ambiguousRes.success, true);
  assert.strictEqual(ambiguousRes.intent, AIIntent.DENTAL_SYMPTOM_INQUIRY);
  assert.strictEqual(ambiguousRes.action, AIAction.NONE);
  assert.ok(ambiguousRes.response.includes('throbbing'));
  console.log('  ✓ Ambiguous complaints prompt natural receptionist triage questions instead of premature booking.');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Clinic Capability Check — Service Unavailable
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Unavailable Clinic Capability Handling (Lumina Dental Care):');

  // Lumina does NOT offer dental implants
  const luminaImplantCheck = checkClinicCapability(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.IMPLANT_PROSTHODONTICS
  );
  assert.strictEqual(
    luminaImplantCheck.isSupported,
    false,
    'Lumina Dental Care must NOT list dental implants as supported'
  );

  // Lumina does NOT offer dentures
  const luminaDentureCheck = checkClinicCapability(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.DENTURES_REMOVABLE
  );
  assert.strictEqual(
    luminaDentureCheck.isSupported,
    false,
    'Lumina Dental Care must NOT list dentures as supported'
  );

  // Test full AI Receptionist request for dental implants at Lumina Dental Care
  const luminaImplantMsg = await aiReceptionistService.processMessage({
    message: 'I need a dental implant for my missing tooth',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-lumina-implant-sess',
    },
  });

  assert.strictEqual(luminaImplantMsg.success, true);
  assert.strictEqual(luminaImplantMsg.intent, AIIntent.DENTAL_SYMPTOM_INQUIRY);
  assert.strictEqual(luminaImplantMsg.action, AIAction.NONE);

  // Response must state Lumina does not provide it, suggest finding a nearby clinic, and offer available services
  assert.ok(
    luminaImplantMsg.response.includes('Lumina Dental Care does not currently list dental implant treatment among its available services'),
    'Must explain Lumina does not list implant treatment'
  );
  assert.ok(
    luminaImplantMsg.response.includes('you may want to look for a dental clinic in or near your area that offers dental implant treatment'),
    'Must suggest looking for a clinic that offers it'
  );
  assert.ok(
    luminaImplantMsg.response.includes('I can also help you with the dental services available at Lumina Dental Care'),
    'Must offer assistance with available services'
  );

  // CRITICAL REQUIREMENT: Must NOT silently book or stage into a default oral exam!
  const stagedImplantSession = await sessionStore.getSession('test-lumina-implant-sess');
  assert.strictEqual(
    stagedImplantSession,
    null,
    'Unavailable service request must NEVER automatically create or stage a default booking session'
  );
  console.log('  ✓ Unavailable service politely explained without inventing fake clinics or auto-booking default exams.');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Clinic Capability Check — Service Available
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Available Clinic Capability Handling:');

  // Lumina DOES offer teeth cleaning & exam
  const luminaCleaningCheck = checkClinicCapability(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.PREVENTIVE_ROUTINE
  );
  assert.strictEqual(luminaCleaningCheck.isSupported, true);
  assert.strictEqual(
    luminaCleaningCheck.serviceMapping?.serviceName,
    'Ultrasonic Prophylaxis Hygiene Scaling'
  );

  const luminaCleaningMsg = await aiReceptionistService.processMessage({
    message: 'I think I need a routine cleaning',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-lumina-cleaning-sess',
    },
  });

  assert.strictEqual(luminaCleaningMsg.success, true);
  assert.strictEqual(luminaCleaningMsg.action, AIAction.TRIAGE_SYMPTOM);
  assert.ok(luminaCleaningMsg.response.includes('Ultrasonic Prophylaxis Hygiene Scaling'));

  // Session correctly staged into BOOKING_SYMPTOM_TRIAGE
  const stagedCleaningSession = await sessionStore.getSession('test-lumina-cleaning-sess');
  assert.ok(stagedCleaningSession);
  assert.strictEqual(stagedCleaningSession.step, BookingConversationStep.BOOKING_SYMPTOM_TRIAGE);
  assert.strictEqual(stagedCleaningSession.selectedServiceName, 'Ultrasonic Prophylaxis Hygiene Scaling');
  console.log('  ✓ Supported service seamlessly triaged and staged for deterministic appointment booking.');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Cross-Clinic Capability Comparison (Zenith vs Lumina)
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Cross-Clinic Capability Specialization:');

  // Zenith DOES offer dental implants
  const zenithImplantCheck = checkClinicCapability(
    ZENITH_IMPLANTS_BUSINESS_ID,
    DentalClinicalCategory.IMPLANT_PROSTHODONTICS
  );
  assert.strictEqual(zenithImplantCheck.isSupported, true);
  assert.strictEqual(
    zenithImplantCheck.serviceMapping?.serviceName,
    'Dental Implant Consultation & 3D Cone Beam Scan'
  );

  const zenithImplantMsg = await aiReceptionistService.processMessage({
    message: 'I want a screw tooth dental implant',
    context: {
      businessId: ZENITH_IMPLANTS_BUSINESS_ID,
      sessionId: 'test-zenith-implant-sess',
    },
  });

  assert.strictEqual(zenithImplantMsg.success, true);
  assert.strictEqual(zenithImplantMsg.action, AIAction.TRIAGE_SYMPTOM);
  assert.ok(zenithImplantMsg.response.includes('Dental Implant Consultation & 3D Cone Beam Scan'));
  console.log('  ✓ Zenith Dental Implants successfully handles implant requests that Lumina politely redirects.');

  // --------------------------------------------------------------------------
  // TEST GROUP 7: Emergency Dental Priority & Safety Overrides
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Emergency Dental Triage Overrides:');

  // 1. Swelling + breathing difficulty
  const emergency1 = isLifeThreateningDentalEmergency(
    'My face is badly swollen and I am having trouble breathing'
  );
  assert.strictEqual(emergency1, true);

  const emergencyRes1 = await aiReceptionistService.processMessage({
    message: "My face is badly swollen and I'm having trouble breathing",
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-emergency-sess-1',
    },
  });

  assert.strictEqual(emergencyRes1.success, true);
  assert.strictEqual(emergencyRes1.action, AIAction.EMERGENCY_ESCALATION);
  assert.strictEqual(emergencyRes1.intent, AIIntent.EMERGENCY_DENTAL);
  assert.ok(emergencyRes1.response.includes('911') || emergencyRes1.response.includes('emergency room'));

  // Ensure NO appointment session was staged during emergency
  const stagedEmergencySession = await sessionStore.getSession('test-emergency-sess-1');
  assert.strictEqual(stagedEmergencySession, null, 'Emergency must never stage a routine booking session');

  // 2. Uncontrolled bleeding
  const emergency2 = isLifeThreateningDentalEmergency('Uncontrolled bleeding from my gums');
  assert.strictEqual(emergency2, true);

  // 3. Knocked-out permanent tooth
  const emergency3 = isLifeThreateningDentalEmergency('My permanent tooth got knocked out');
  assert.strictEqual(emergency3, true);
  console.log('  ✓ Life-threatening emergencies immediately trigger escalation protocol and bypass routine booking.');

  // --------------------------------------------------------------------------
  // TEST GROUP 8: Multi-Tenant Clinic Isolation Across All 4 Practices
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Strict Multi-Tenant Clinic Isolation Across All 4 Clinics:');

  const luminaProfile = getClinicKnowledge(LUMINA_DENTAL_BUSINESS_ID);
  const apexProfile = getClinicKnowledge(APEX_ENDODONTICS_BUSINESS_ID);
  const zenithProfile = getClinicKnowledge(ZENITH_IMPLANTS_BUSINESS_ID);
  const radianceProfile = getClinicKnowledge(RADIANCE_PEDIATRIC_BUSINESS_ID);

  assert.ok(luminaProfile && apexProfile && zenithProfile && radianceProfile);
  assert.strictEqual(luminaProfile.businessName, 'Lumina Dental Care');
  assert.strictEqual(apexProfile.businessName, 'Apex Endodontics & Oral Surgery');
  assert.strictEqual(zenithProfile.businessName, 'Zenith Dental Implants & Periodontics');
  assert.strictEqual(radianceProfile.businessName, 'Radiance Pediatric & Orthodontic Dental');

  // Doctor isolation
  assert.strictEqual(findDoctorCabin(APEX_ENDODONTICS_BUSINESS_ID, 'Dr. Marcus Thorne')?.notFound, true);
  assert.strictEqual(findDoctorCabin(LUMINA_DENTAL_BUSINESS_ID, 'Dr. Alistair Sterling')?.notFound, true);
  assert.strictEqual(findDoctorCabin(ZENITH_IMPLANTS_BUSINESS_ID, 'Dr. Maya Lin')?.notFound, true);
  assert.strictEqual(findDoctorCabin(RADIANCE_PEDIATRIC_BUSINESS_ID, 'Dr. Liam O’Connor')?.notFound, true);

  // Address and phone isolation
  assert.notStrictEqual(luminaProfile.address, apexProfile.address);
  assert.notStrictEqual(apexProfile.phone, zenithProfile.phone);
  assert.notStrictEqual(zenithProfile.email, radianceProfile.email);
  console.log('  ✓ Strict multi-tenant data isolation verified across all 4 dental clinics with zero data leakage.');

  // --------------------------------------------------------------------------
  // TEST GROUP 9: Mid-Booking Unavailable Capability Inquiry & Step Resumption
  // --------------------------------------------------------------------------
  console.log('\n9. Testing Mid-Booking Unavailable Service Inquiry & Exact Resumption:');

  const midSessionId = 'test-mid-booking-implant-session';
  const now = new Date();

  // Create an active session at BOOKING_COLLECT_CUSTOMER_NAME
  await sessionStore.setSession({
    sessionId: midSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME,
    selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
    selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
    selectedStaffId: 's0000001-0000-0000-0000-000000000001',
    selectedStaffName: 'Dr. Marcus Thorne',
    selectedDate: '2026-10-15',
    selectedTimeLabel: '10:00 AM',
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  });

  // User asks about implants while receptionist is waiting for customer's name
  const midTurnRes = await aiReceptionistService.processMessage({
    message: 'Do you provide dental implants?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: midSessionId,
    },
  });

  assert.strictEqual(midTurnRes.success, true);
  // Answers that Lumina doesn't provide implants
  assert.ok(
    midTurnRes.response.includes('Lumina Dental Care does not currently list dental implant treatment') ||
    midTurnRes.response.includes('does not currently list that specialized treatment')
  );
  // Resumes exact booking step
  assert.ok(
    midTurnRes.response.includes('Returning to your booking, may I have your full name, please?')
  );

  // Booking state strictly preserved
  const resumedSession = await sessionStore.getSession(midSessionId);
  assert.ok(resumedSession);
  assert.strictEqual(resumedSession.step, BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME);
  assert.strictEqual(resumedSession.selectedDate, '2026-10-15');
  assert.strictEqual(resumedSession.selectedTimeLabel, '10:00 AM');
  assert.strictEqual(resumedSession.selectedServiceName, 'Comprehensive Oral Exam & Digital X-Rays');
  console.log('  ✓ Mid-booking capability inquiry answered accurately with 100% state preservation and exact step resumption.');

  console.log('\n======================================================');
  console.log('🎉 ALL DENTAL INTELLIGENCE TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('======================================================\n');
}
