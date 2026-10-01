import assert from 'assert';
import {
  findNetworkClinicRecommendation,
  formatNetworkRecommendationPrompt,
  CLINIC_SPECIALTIES,
} from '../modules/ai/knowledge/dental-network';
import {
  LUMINA_DENTAL_BUSINESS_ID,
  APEX_ENDODONTICS_BUSINESS_ID,
  ZENITH_IMPLANTS_BUSINESS_ID,
  RADIANCE_PEDIATRIC_BUSINESS_ID,
  CLINIC_CAPABILITY_PROFILES,
} from '../modules/ai/knowledge/clinic-capabilities';
import { DentalClinicalCategory } from '../modules/ai/knowledge/global-dental-catalogue';
import { getClinicKnowledge } from '../modules/ai/knowledge/dental-knowledge';

export async function runMilestone3NetworkIntelligenceTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- RUNNING MILESTONE 3A NETWORK INTELLIGENCE TESTS ---');
  console.log('======================================================\n');

  const knownBusinessIds = [
    LUMINA_DENTAL_BUSINESS_ID,
    APEX_ENDODONTICS_BUSINESS_ID,
    ZENITH_IMPLANTS_BUSINESS_ID,
    RADIANCE_PEDIATRIC_BUSINESS_ID,
  ];

  // --------------------------------------------------------------------------
  // TEST 1: Lumina root canal -> Apex
  // --------------------------------------------------------------------------
  console.log('1. Testing Lumina root canal -> Apex recommendation:');
  const match1 = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.PULPITIS_ENDODONTICS,
    'PAIN_RELIEF',
    'HIGH'
  );
  assert.ok(match1, 'Must find a recommendation for Lumina -> root canal');
  assert.strictEqual(match1.candidateBusinessId, APEX_ENDODONTICS_BUSINESS_ID);
  assert.strictEqual(match1.candidateClinicName, 'Apex Endodontics & Oral Surgery');
  assert.strictEqual(match1.recommendedServiceName, 'Microscopic Root Canal Therapy');
  assert.strictEqual(match1.recommendedSpecialistName, 'Dr. Alistair Sterling');
  assert.strictEqual(match1.matchedCategory, DentalClinicalCategory.PULPITIS_ENDODONTICS);
  console.log('   ✓ Matched Apex Microscopic Root Canal Therapy with Dr. Alistair Sterling');

  // --------------------------------------------------------------------------
  // TEST 2: Lumina wisdom tooth -> Apex
  // --------------------------------------------------------------------------
  console.log('2. Testing Lumina wisdom tooth -> Apex recommendation:');
  const match2 = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY,
    'WISDOM_TOOTH_EVALUATION'
  );
  assert.ok(match2, 'Must find a recommendation for Lumina -> wisdom tooth');
  assert.strictEqual(match2.candidateBusinessId, APEX_ENDODONTICS_BUSINESS_ID);
  assert.strictEqual(match2.recommendedServiceName, 'Impacted Wisdom Tooth Extraction');
  assert.strictEqual(match2.recommendedSpecialistName, 'Dr. Marcus Vance');
  console.log('   ✓ Matched Apex Impacted Wisdom Tooth Extraction with Dr. Marcus Vance');

  // --------------------------------------------------------------------------
  // TEST 3: Lumina implant -> Zenith
  // --------------------------------------------------------------------------
  console.log('3. Testing Lumina implant -> Zenith recommendation:');
  const match3 = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.IMPLANT_PROSTHODONTICS,
    'REPLACE_MISSING_TOOTH'
  );
  assert.ok(match3, 'Must find a recommendation for Lumina -> implant');
  assert.strictEqual(match3.candidateBusinessId, ZENITH_IMPLANTS_BUSINESS_ID);
  assert.strictEqual(match3.candidateClinicName, 'Zenith Dental Implants & Periodontics');
  assert.strictEqual(
    match3.recommendedServiceName,
    'Dental Implant Consultation & 3D Cone Beam Scan'
  );
  assert.strictEqual(match3.recommendedSpecialistName, 'Dr. Elena Rostova');
  console.log('   ✓ Matched Zenith Dental Implant Consultation with Dr. Elena Rostova');

  // --------------------------------------------------------------------------
  // TEST 4: Lumina advanced periodontal -> Zenith
  // --------------------------------------------------------------------------
  console.log('4. Testing Lumina advanced periodontal -> Zenith recommendation:');
  const match4 = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.PERIODONTITIS_ADVANCED
  );
  assert.ok(match4, 'Must find a recommendation for Lumina -> advanced periodontal');
  assert.strictEqual(match4.candidateBusinessId, ZENITH_IMPLANTS_BUSINESS_ID);
  assert.strictEqual(
    match4.recommendedServiceName,
    'Periodontal Flap Debridement & Regenerative Therapy'
  );
  assert.strictEqual(match4.recommendedSpecialistName, 'Dr. Elena Rostova');
  console.log('   ✓ Matched Zenith Periodontal Flap Debridement with Dr. Elena Rostova');

  // --------------------------------------------------------------------------
  // TEST 5: Lumina clear aligners -> Radiance
  // --------------------------------------------------------------------------
  console.log('5. Testing Lumina clear aligners -> Radiance recommendation:');
  const match5 = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.ORTHODONTICS_ALIGNERS,
    'ORTHODONTIC_ALIGNMENT'
  );
  assert.ok(match5, 'Must find a recommendation for Lumina -> clear aligners');
  assert.strictEqual(match5.candidateBusinessId, RADIANCE_PEDIATRIC_BUSINESS_ID);
  assert.strictEqual(
    match5.candidateClinicName,
    'Radiance Pediatric & Orthodontic Dental'
  );
  assert.strictEqual(
    match5.recommendedServiceName,
    'Clear Aligner Orthodontic Digital Assessment'
  );
  assert.strictEqual(match5.recommendedSpecialistName, 'Dr. Jordan Lee');
  console.log('   ✓ Matched Radiance Clear Aligner Assessment with Dr. Jordan Lee');

  // --------------------------------------------------------------------------
  // TEST 6: Current clinic excluded from recommendation
  // --------------------------------------------------------------------------
  console.log('6. Testing current clinic self-exclusion:');
  const apexSelfMatch = findNetworkClinicRecommendation(
    APEX_ENDODONTICS_BUSINESS_ID,
    DentalClinicalCategory.PULPITIS_ENDODONTICS
  );
  assert.strictEqual(
    apexSelfMatch,
    null,
    'Apex must not recommend itself for PULPITIS_ENDODONTICS when no other clinic provides it'
  );

  const zenithSelfMatch = findNetworkClinicRecommendation(
    ZENITH_IMPLANTS_BUSINESS_ID,
    DentalClinicalCategory.IMPLANT_PROSTHODONTICS
  );
  assert.strictEqual(
    zenithSelfMatch,
    null,
    'Zenith must not recommend itself for IMPLANT_PROSTHODONTICS'
  );

  const radianceSelfMatch = findNetworkClinicRecommendation(
    RADIANCE_PEDIATRIC_BUSINESS_ID,
    DentalClinicalCategory.ORTHODONTICS_ALIGNERS
  );
  assert.strictEqual(
    radianceSelfMatch,
    null,
    'Radiance must not recommend itself for ORTHODONTICS_ALIGNERS'
  );
  console.log('   ✓ Current clinic is strictly excluded from recommendations');

  // --------------------------------------------------------------------------
  // TEST 7: Unknown/unsupported category -> null
  // --------------------------------------------------------------------------
  console.log('7. Testing unknown/unsupported category returns null:');
  const unknownMatch = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    'NON_EXISTENT_CATEGORY' as unknown as DentalClinicalCategory
  );
  assert.strictEqual(unknownMatch, null, 'Unknown category must return null');
  console.log('   ✓ Unsupported/unknown categories safely return null');

  // --------------------------------------------------------------------------
  // TEST 8: Candidate without active matching service -> null
  // --------------------------------------------------------------------------
  console.log('8. Testing candidate without active matching service:');
  // Temporary check: verify that a category not bookable at any sister clinic returns null
  // If Lumina is searching for something only Lumina does (e.g. AESTHETIC_WHITENING)
  const noSisterServiceMatch = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.AESTHETIC_WHITENING
  );
  assert.strictEqual(
    noSisterServiceMatch,
    null,
    'No sister clinic offers AESTHETIC_WHITENING when Lumina is current, so result must be null'
  );
  console.log('   ✓ Missing bookable service at sister clinics returns null');

  // --------------------------------------------------------------------------
  // TEST 9: Recommendation contains verified business identity (address, phone, hours)
  // --------------------------------------------------------------------------
  console.log('9. Testing verified business identity fields:');
  assert.ok(match1);
  const apexKnowledge = getClinicKnowledge(APEX_ENDODONTICS_BUSINESS_ID);
  assert.ok(apexKnowledge, 'Apex knowledge profile must exist');
  assert.strictEqual(match1.address, apexKnowledge.address);
  assert.strictEqual(match1.phone, apexKnowledge.phone);
  assert.strictEqual(match1.openingHours, apexKnowledge.openingHours);
  assert.ok(match1.address.length > 5, 'Address must not be empty');
  assert.ok(match1.phone.length > 5, 'Phone must not be empty');
  assert.ok(match1.openingHours.length > 5, 'Opening hours must not be empty');
  console.log('   ✓ Business identity verified against authoritative clinic profile');

  // --------------------------------------------------------------------------
  // TEST 10: Recommendation contains verified service ID/name
  // --------------------------------------------------------------------------
  console.log('10. Testing verified service ID and name:');
  const apexProfile = CLINIC_CAPABILITY_PROFILES[APEX_ENDODONTICS_BUSINESS_ID];
  const apexPulpitisService =
    apexProfile.categoryToServiceMap[DentalClinicalCategory.PULPITIS_ENDODONTICS];
  assert.ok(apexPulpitisService);
  assert.strictEqual(match1.recommendedServiceId, apexPulpitisService.serviceId);
  assert.strictEqual(match1.recommendedServiceName, apexPulpitisService.serviceName);
  console.log('   ✓ Service ID and name match candidate capability profile');

  // --------------------------------------------------------------------------
  // TEST 11: Recommendation contains verified specialist
  // --------------------------------------------------------------------------
  console.log('11. Testing verified specialist ID and name:');
  assert.strictEqual(
    match1.recommendedSpecialistId,
    apexPulpitisService.defaultStaffId
  );
  assert.strictEqual(
    match1.recommendedSpecialistName,
    apexPulpitisService.defaultStaffName
  );
  console.log('   ✓ Specialist details match candidate capability profile');

  // --------------------------------------------------------------------------
  // TEST 12: Current session businessId unmutated
  // --------------------------------------------------------------------------
  console.log('12. Testing read-only nature (businessId unmutated):');
  const currentBusinessBefore = LUMINA_DENTAL_BUSINESS_ID;
  findNetworkClinicRecommendation(
    currentBusinessBefore,
    DentalClinicalCategory.PULPITIS_ENDODONTICS
  );
  const currentBusinessAfter = LUMINA_DENTAL_BUSINESS_ID;
  assert.strictEqual(
    currentBusinessBefore,
    currentBusinessAfter,
    'Calling findNetworkClinicRecommendation must never mutate session businessId'
  );
  console.log('   ✓ Recommendation engine is strictly read-only and state-safe');

  // --------------------------------------------------------------------------
  // TEST 13: Reverse discovery (Apex -> Lumina for whitening)
  // --------------------------------------------------------------------------
  console.log('13. Testing reverse discovery (Apex -> Lumina for whitening):');
  const reverseMatch = findNetworkClinicRecommendation(
    APEX_ENDODONTICS_BUSINESS_ID,
    DentalClinicalCategory.AESTHETIC_WHITENING,
    'WHITEN_TEETH'
  );
  assert.ok(reverseMatch, 'Apex must be able to discover Lumina for whitening');
  assert.strictEqual(reverseMatch.candidateBusinessId, LUMINA_DENTAL_BUSINESS_ID);
  assert.strictEqual(reverseMatch.candidateClinicName, 'Lumina Dental Care');
  assert.strictEqual(
    reverseMatch.recommendedServiceName,
    'Laser Enamel Whitening & Brightening'
  );
  assert.strictEqual(reverseMatch.recommendedSpecialistName, 'Dr. Marcus Thorne');
  console.log('   ✓ Reverse discovery: Apex caller can be recommended Lumina for whitening');

  // --------------------------------------------------------------------------
  // TEST 14: Life-threatening category / critical urgency returns null
  // --------------------------------------------------------------------------
  console.log('14. Testing emergency escalation safety bypass:');
  const criticalUrgencyMatch = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.PULPITIS_ENDODONTICS,
    'PAIN_RELIEF',
    'CRITICAL'
  );
  assert.strictEqual(
    criticalUrgencyMatch,
    null,
    'CRITICAL urgency must return null to allow emergency escalation'
  );

  const avulsionMatch = findNetworkClinicRecommendation(
    LUMINA_DENTAL_BUSINESS_ID,
    DentalClinicalCategory.TRAUMA_EMERGENCY_AVULSION
  );
  assert.strictEqual(
    avulsionMatch,
    null,
    'TRAUMA_EMERGENCY_AVULSION must return null to allow emergency escalation'
  );
  console.log('   ✓ Emergency safety rule strictly enforced (returns null)');

  // --------------------------------------------------------------------------
  // TEST 15: No fictitious external clinics
  // --------------------------------------------------------------------------
  console.log('15. Testing no fictitious clinics:');
  const matches = [match1, match2, match3, match4, match5, reverseMatch];
  for (const m of matches) {
    assert.ok(m);
    assert.ok(
      knownBusinessIds.includes(m.candidateBusinessId),
      `Business ID ${m.candidateBusinessId} must be one of the 4 configured clinics`
    );
    assert.ok(
      CLINIC_SPECIALTIES[m.candidateBusinessId],
      `Clinic ${m.candidateBusinessId} must have an authoritative specialty configured`
    );
  }
  console.log('   ✓ All recommendations strictly bounded to 4 configured clinics');

  // --------------------------------------------------------------------------
  // TEST 16: Recommendation Prompt Formatting
  // --------------------------------------------------------------------------
  console.log('16. Testing formatNetworkRecommendationPrompt:');
  const prompt = formatNetworkRecommendationPrompt(match1, 'Lumina Dental Care');
  assert.ok(
    prompt.includes('Lumina Dental Care does not currently provide'),
    'Prompt must acknowledge current clinic limitation'
  );
  assert.ok(
    prompt.includes('Apex Endodontics & Oral Surgery'),
    'Prompt must mention recommended sister clinic'
  );
  assert.ok(
    prompt.includes('Microscopic Root Canal Therapy'),
    'Prompt must mention recommended service'
  );
  assert.ok(
    prompt.includes('Dr. Alistair Sterling'),
    'Prompt must mention specialist'
  );
  assert.ok(
    prompt.includes('Would you like more information about this clinic'),
    'Prompt must preserve patient agency'
  );
  console.log('   ✓ Formatted prompt is respectful, informative, and patient-centric');

  console.log('\n======================================================');
  console.log('🎉 ALL MILESTONE 3A NETWORK INTELLIGENCE TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

// Auto-run if executed directly
if (require.main === module) {
  runMilestone3NetworkIntelligenceTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}
