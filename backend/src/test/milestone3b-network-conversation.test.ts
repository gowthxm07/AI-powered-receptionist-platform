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
import { getClinicKnowledge } from '../modules/ai/knowledge/dental-knowledge';
import { AIAction } from '../modules/ai/types/action.types';
import { AIIntent } from '../modules/ai/types/intent.types';

export async function runMilestone3BNetworkConversationTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- RUNNING MILESTONE 3B NETWORK CONVERSATION TESTS ---');
  console.log('======================================================\n');

  const aiService = new AIReceptionistService();

  // --------------------------------------------------------------------------
  // TEST A: Lumina Dental Implant -> Zenith Discovered & Offered
  // --------------------------------------------------------------------------
  console.log('A. Testing Lumina implant -> Zenith recommendation offered:');
  const sessionA = 'test-m3b-session-a-' + Date.now();
  const resA = await aiService.processMessage({
    message: 'I want an implant for my missing tooth.',
    context: { sessionId: sessionA, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  assert.strictEqual(resA.success, true);
  assert.ok(resA.response.includes('Zenith Dental Implants & Periodontics'));
  assert.ok(
    resA.response.includes('Dental Implant Consultation & 3D Cone Beam Scan')
  );
  assert.ok(
    resA.response.includes('Would you like more information about this clinic')
  );

  const storedA = await sessionStore.getSession(sessionA);
  assert.ok(storedA, 'Session A must be saved in store');
  assert.strictEqual(
    storedA.step,
    BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED
  );
  assert.strictEqual(
    storedA.businessId,
    LUMINA_DENTAL_BUSINESS_ID,
    'Session businessId must remain Lumina'
  );
  assert.ok(storedA.pendingRecommendation, 'Pending recommendation must be stored');
  assert.strictEqual(
    storedA.pendingRecommendation.candidateBusinessId,
    ZENITH_IMPLANTS_BUSINESS_ID
  );
  console.log('   ✓ Zenith recommendation offered and stored in session at Lumina');

  // --------------------------------------------------------------------------
  // TEST B: Patient Accepts (Exact "yes")
  // --------------------------------------------------------------------------
  console.log('B. Testing patient accepts ("yes"):');
  const resB = await aiService.processMessage({
    message: 'yes',
    context: { sessionId: sessionA, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.strictEqual(resB.success, true);
  assert.ok(resB.response.includes('Zenith Dental Implants & Periodontics'));
  assert.ok(resB.response.includes('Dr. Elena Rostova'));
  assert.ok(resB.response.includes('1200 Financial Plaza'));
  assert.ok(resB.response.includes('+1-555-019-7733'));
  assert.ok(resB.response.includes('Monday to Friday'));

  const storedB = await sessionStore.getSession(sessionA);
  assert.strictEqual(
    storedB?.businessId,
    LUMINA_DENTAL_BUSINESS_ID,
    'BusinessId must strictly remain Lumina'
  );
  assert.strictEqual(
    storedB?.confirmedAppointmentId,
    undefined,
    'No appointment should be booked'
  );
  console.log('   ✓ Verified Zenith details returned; businessId remained Lumina; no auto-booking');

  // --------------------------------------------------------------------------
  // TEST C: Patient Declines ("no") -> Resumes Lumina Evaluation Flow
  // --------------------------------------------------------------------------
  console.log('C. Testing patient declines ("no"):');
  const sessionC = 'test-m3b-session-c-' + Date.now();
  await aiService.processMessage({
    message: 'I want clear aligners.',
    context: { sessionId: sessionC, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resC = await aiService.processMessage({
    message: 'no',
    context: { sessionId: sessionC, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  assert.strictEqual(resC.success, true);
  assert.ok(
    resC.response.includes('We can continue with Lumina Dental Care'),
    'Response must acknowledge continuing with Lumina'
  );
  assert.ok(
    resC.response.includes('Comprehensive Oral Exam & Digital X-Rays'),
    'Response must offer Lumina comprehensive exam'
  );

  const storedC = await sessionStore.getSession(sessionC);
  assert.strictEqual(storedC?.pendingRecommendation, undefined, 'Pending recommendation cleared');
  assert.strictEqual(storedC?.step, BookingConversationStep.BOOKING_SYMPTOM_TRIAGE);
  assert.strictEqual(storedC?.selectedServiceName, 'Comprehensive Oral Exam & Digital X-Rays');
  assert.strictEqual(storedC?.businessId, LUMINA_DENTAL_BUSINESS_ID);
  console.log('   ✓ Recommendation cleared and Lumina evaluation flow resumed smoothly');

  // --------------------------------------------------------------------------
  // TEST D: Natural Acceptance Phrases ("yes, tell me about them", "sure")
  // --------------------------------------------------------------------------
  console.log('D. Testing natural acceptance phrases:');
  const sessionD1 = 'test-m3b-session-d1-' + Date.now();
  await aiService.processMessage({
    message: 'I want an implant.',
    context: { sessionId: sessionD1, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resD1 = await aiService.processMessage({
    message: 'yes, tell me about them',
    context: { sessionId: sessionD1, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resD1.response.includes('Zenith Dental Implants & Periodontics'));
  assert.ok(resD1.response.includes('Dr. Elena Rostova'));

  const sessionD2 = 'test-m3b-session-d2-' + Date.now();
  await aiService.processMessage({
    message: 'I need a root canal.',
    context: { sessionId: sessionD2, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resD2 = await aiService.processMessage({
    message: 'sure',
    context: { sessionId: sessionD2, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resD2.response.includes('Apex Endodontics & Oral Surgery'));
  assert.ok(resD2.response.includes('Dr. Alistair Sterling'));
  console.log('   ✓ Natural acceptance variations parsed accurately');

  // --------------------------------------------------------------------------
  // TEST E: Natural Rejection Phrases ("I'll stay here", "no thanks")
  // --------------------------------------------------------------------------
  console.log('E. Testing natural rejection phrases:');
  const sessionE1 = 'test-m3b-session-e1-' + Date.now();
  await aiService.processMessage({
    message: 'I want clear aligners.',
    context: { sessionId: sessionE1, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resE1 = await aiService.processMessage({
    message: "I'll stay here",
    context: { sessionId: sessionE1, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resE1.response.includes('We can continue with Lumina Dental Care'));
  assert.ok(resE1.response.includes('Comprehensive Oral Exam & Digital X-Rays'));

  const sessionE2 = 'test-m3b-session-e2-' + Date.now();
  await aiService.processMessage({
    message: 'I want clear aligners.',
    context: { sessionId: sessionE2, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resE2 = await aiService.processMessage({
    message: 'no thanks',
    context: { sessionId: sessionE2, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resE2.response.includes('We can continue with Lumina Dental Care'));
  console.log('   ✓ Natural decline phrases parsed and routed to local evaluation');

  // --------------------------------------------------------------------------
  // TEST F: Clarification Handling ("Which clinic?", "Who is the doctor?", "Where is it?")
  // --------------------------------------------------------------------------
  console.log('F. Testing clarification queries without losing recommendation state:');
  const sessionF = 'test-m3b-session-f-' + Date.now();
  await aiService.processMessage({
    message: 'I want an implant.',
    context: { sessionId: sessionF, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resF1 = await aiService.processMessage({
    message: 'Which clinic did you say?',
    context: { sessionId: sessionF, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resF1.response.includes('Zenith Dental Implants & Periodontics'));
  const storedF1 = await sessionStore.getSession(sessionF);
  assert.strictEqual(storedF1?.step, BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED);

  const resF2 = await aiService.processMessage({
    message: 'Who is the doctor?',
    context: { sessionId: sessionF, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resF2.response.includes('Dr. Elena Rostova'));

  const resF3 = await aiService.processMessage({
    message: 'Where is that clinic located?',
    context: { sessionId: sessionF, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resF3.response.includes('1200 Financial Plaza'));
  console.log('   ✓ Clarification inquiries answered with verified details while retaining step');

  // --------------------------------------------------------------------------
  // TEST G: FAQ Interruption during Recommendation -> Accept Sister Clinic
  // --------------------------------------------------------------------------
  console.log('G. Testing FAQ interruption followed by acceptance:');
  const sessionG = 'test-m3b-session-g-' + Date.now();
  await aiService.processMessage({
    message: 'I need a root canal.',
    context: { sessionId: sessionG, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resG1 = await aiService.processMessage({
    message: 'What time does Lumina close?',
    context: { sessionId: sessionG, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resG1.response.includes('Monday to Friday: 8:00 AM – 6:00 PM'));
  assert.ok(
    resG1.response.includes('Apex Endodontics & Oral Surgery'),
    'Must include resumption question for Apex'
  );

  const storedG1 = await sessionStore.getSession(sessionG);
  assert.strictEqual(
    storedG1?.step,
    BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED,
    'Session step must remain NETWORK_RECOMMENDATION_OFFERED'
  );
  assert.strictEqual(
    storedG1?.pendingRecommendation?.candidateBusinessId,
    APEX_ENDODONTICS_BUSINESS_ID
  );

  const resG2 = await aiService.processMessage({
    message: 'Okay, tell me about the other clinic.',
    context: { sessionId: sessionG, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resG2.response.includes('Apex Endodontics & Oral Surgery'));
  assert.ok(resG2.response.includes('Dr. Alistair Sterling'));
  assert.ok(resG2.response.includes('Microscopic Root Canal Therapy'));
  console.log('   ✓ FAQ answered with seamless sister practice resumption and acceptance');

  // --------------------------------------------------------------------------
  // TEST H: FAQ Interruption followed by Decline
  // --------------------------------------------------------------------------
  console.log('H. Testing FAQ interruption followed by decline:');
  const sessionH = 'test-m3b-session-h-' + Date.now();
  await aiService.processMessage({
    message: 'I need a root canal.',
    context: { sessionId: sessionH, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  await aiService.processMessage({
    message: 'What is your parking policy?',
    context: { sessionId: sessionH, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resH = await aiService.processMessage({
    message: "No, I'll stay here at Lumina.",
    context: { sessionId: sessionH, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resH.response.includes('We can continue with Lumina Dental Care'));
  assert.ok(resH.response.includes('Comprehensive Oral Exam & Digital X-Rays'));

  const storedH = await sessionStore.getSession(sessionH);
  assert.strictEqual(storedH?.pendingRecommendation, undefined);
  assert.strictEqual(storedH?.step, BookingConversationStep.BOOKING_SYMPTOM_TRIAGE);
  console.log('   ✓ FAQ answered and subsequent decline smoothly returned to Lumina');

  // --------------------------------------------------------------------------
  // TEST I: Root Canal (Lumina -> Apex)
  // --------------------------------------------------------------------------
  console.log('I. Testing root canal routing: Lumina -> Apex');
  const sessionI = 'test-m3b-session-i-' + Date.now();
  const resI = await aiService.processMessage({
    message: 'I need a root canal.',
    context: { sessionId: sessionI, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resI.response.includes('Apex Endodontics & Oral Surgery'));
  assert.ok(resI.response.includes('Microscopic Root Canal Therapy'));
  console.log('   ✓ Root canal mapped to Apex');

  // --------------------------------------------------------------------------
  // TEST J: Wisdom Tooth (Lumina -> Apex)
  // --------------------------------------------------------------------------
  console.log('J. Testing wisdom tooth routing: Lumina -> Apex');
  const sessionJ = 'test-m3b-session-j-' + Date.now();
  const resJ = await aiService.processMessage({
    message: 'My wisdom tooth is impacted and needs surgical extraction.',
    context: { sessionId: sessionJ, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resJ.response.includes('Apex Endodontics & Oral Surgery'));
  assert.ok(resJ.response.includes('Impacted Wisdom Tooth Extraction'));
  console.log('   ✓ Wisdom tooth mapped to Apex');

  // --------------------------------------------------------------------------
  // TEST K: Implant (Lumina -> Zenith)
  // --------------------------------------------------------------------------
  console.log('K. Testing implant routing: Lumina -> Zenith');
  const sessionK = 'test-m3b-session-k-' + Date.now();
  const resK = await aiService.processMessage({
    message: 'I want dental implants.',
    context: { sessionId: sessionK, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resK.response.includes('Zenith Dental Implants & Periodontics'));
  assert.ok(resK.response.includes('Dental Implant Consultation'));
  console.log('   ✓ Dental implants mapped to Zenith');

  // --------------------------------------------------------------------------
  // TEST L: Advanced Periodontics (Lumina -> Zenith)
  // --------------------------------------------------------------------------
  console.log('L. Testing advanced periodontal routing: Lumina -> Zenith');
  const sessionL = 'test-m3b-session-l-' + Date.now();
  const resL = await aiService.processMessage({
    message: 'I have severe periodontal bone loss and need periodontal flap surgery.',
    context: { sessionId: sessionL, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resL.response.includes('Zenith Dental Implants & Periodontics'));
  assert.ok(resL.response.includes('Periodontal Flap Debridement & Regenerative Therapy'));
  console.log('   ✓ Advanced periodontics mapped to Zenith');

  // --------------------------------------------------------------------------
  // TEST M: Clear Aligners (Lumina -> Radiance)
  // --------------------------------------------------------------------------
  console.log('M. Testing clear aligners routing: Lumina -> Radiance');
  const sessionM = 'test-m3b-session-m-' + Date.now();
  const resM = await aiService.processMessage({
    message: 'I want clear aligners for my teeth.',
    context: { sessionId: sessionM, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(resM.response.includes('Radiance Pediatric & Orthodontic Dental'));
  assert.ok(resM.response.includes('Clear Aligner Orthodontic Digital Assessment'));
  console.log('   ✓ Clear aligners mapped to Radiance');

  // --------------------------------------------------------------------------
  // TEST N: Reverse Discovery (Apex -> Lumina for Whitening)
  // --------------------------------------------------------------------------
  console.log('N. Testing reverse discovery: Apex -> Lumina for whitening:');
  const sessionN = 'test-m3b-session-n-' + Date.now();
  const resN = await aiService.processMessage({
    message: 'I want cosmetic teeth whitening.',
    context: { sessionId: sessionN, businessId: APEX_ENDODONTICS_BUSINESS_ID },
  });
  assert.ok(resN.response.includes('Lumina Dental Care'));
  assert.ok(resN.response.includes('Laser Enamel Whitening & Brightening'));

  const storedN = await sessionStore.getSession(sessionN);
  assert.strictEqual(
    storedN?.businessId,
    APEX_ENDODONTICS_BUSINESS_ID,
    'Active businessId must remain Apex'
  );
  assert.strictEqual(
    storedN?.pendingRecommendation?.candidateBusinessId,
    LUMINA_DENTAL_BUSINESS_ID
  );
  console.log('   ✓ Reverse network discovery verified from Apex to Lumina');

  // --------------------------------------------------------------------------
  // TEST O: Emergency Override Wins over Pending Recommendation
  // --------------------------------------------------------------------------
  console.log('O. Testing emergency override while recommendation is pending:');
  const sessionO = 'test-m3b-session-o-' + Date.now();
  await aiService.processMessage({
    message: 'I want an implant.',
    context: { sessionId: sessionO, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const resO = await aiService.processMessage({
    message: 'Actually my face is swelling and I cannot breathe.',
    context: { sessionId: sessionO, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.strictEqual(resO.action, AIAction.EMERGENCY_ESCALATION);
  assert.strictEqual(resO.intent, AIIntent.EMERGENCY_DENTAL);
  assert.ok(resO.response.includes('911') || resO.response.includes('emergency room'));
  assert.ok(!resO.response.includes('Zenith'), 'Emergency must NOT offer sister clinic');
  console.log('   ✓ Emergency safety priority strictly enforced over recommendation');

  // --------------------------------------------------------------------------
  // TEST P: Tenant Safety — businessId Never Mutated
  // --------------------------------------------------------------------------
  console.log('P. Testing strict tenant isolation (businessId unmutated across turns):');
  const sessionP = 'test-m3b-session-p-' + Date.now();
  await aiService.processMessage({
    message: 'I need a root canal.',
    context: { sessionId: sessionP, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  await aiService.processMessage({
    message: 'Where is it?',
    context: { sessionId: sessionP, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  await aiService.processMessage({
    message: 'Who is the doctor?',
    context: { sessionId: sessionP, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  await aiService.processMessage({
    message: 'Yes, tell me all about them.',
    context: { sessionId: sessionP, businessId: LUMINA_DENTAL_BUSINESS_ID },
  });

  const storedP = await sessionStore.getSession(sessionP);
  assert.strictEqual(
    storedP?.businessId,
    LUMINA_DENTAL_BUSINESS_ID,
    'Session businessId must never change to Apex'
  );
  console.log('   ✓ Active session businessId strictly preserved through multi-turn dialogue');

  // --------------------------------------------------------------------------
  // TEST Q: No Automatic Appointment Creation
  // --------------------------------------------------------------------------
  console.log('Q. Testing no automatic appointment created for sister clinic:');
  assert.strictEqual(
    storedP?.confirmedAppointmentId,
    undefined,
    'Confirmed appointment ID must remain undefined'
  );
  assert.strictEqual(
    storedP?.selectedSlot,
    undefined,
    'Selected slot must remain undefined'
  );
  console.log('   ✓ Zero cross-tenant appointments generated');

  // --------------------------------------------------------------------------
  // TEST R: Verified Configuration Only (No Invented Data)
  // --------------------------------------------------------------------------
  console.log('R. Testing verified configuration truthfulness:');
  const zenithKnowledge = getClinicKnowledge(ZENITH_IMPLANTS_BUSINESS_ID);
  assert.ok(zenithKnowledge);
  assert.strictEqual(
    zenithKnowledge.address,
    '1200 Financial Plaza, Tower 2, Suite 1800, Metropolis'
  );
  assert.strictEqual(zenithKnowledge.phone, '+1-555-019-7733');
  console.log('   ✓ All outputs grounded in authoritative clinic profiles');

  // --------------------------------------------------------------------------
  // TEST S: Existing FAQ Behavior Remains Fully Intact
  // --------------------------------------------------------------------------
  console.log('S. Testing existing Lumina FAQ inquiry standalone:');
  const resS = await aiService.processMessage({
    message: 'Can I bring my mother with me?',
    context: { sessionId: 'standalone-faq-' + Date.now(), businessId: LUMINA_DENTAL_BUSINESS_ID },
  });
  assert.ok(
    resS.response.toLowerCase().includes('welcome to bring') ||
      resS.response.toLowerCase().includes('companion')
  );
  assert.strictEqual(resS.intent, AIIntent.CLINIC_FAQ);
  console.log('   ✓ Standalone FAQ behavior operates identically without regression');

  console.log('\n======================================================');
  console.log('🎉 ALL MILESTONE 3B CONVERSATIONAL TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

// Auto-run if executed directly
if (require.main === module) {
  runMilestone3BNetworkConversationTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}
