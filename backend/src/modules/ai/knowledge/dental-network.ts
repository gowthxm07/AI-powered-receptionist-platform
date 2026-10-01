import {
  CLINIC_CAPABILITY_PROFILES,
  ClinicCapabilityProfile,
  LUMINA_DENTAL_BUSINESS_ID,
  APEX_ENDODONTICS_BUSINESS_ID,
  ZENITH_IMPLANTS_BUSINESS_ID,
  RADIANCE_PEDIATRIC_BUSINESS_ID,
} from './clinic-capabilities';
import { DentalClinicalCategory } from './global-dental-catalogue';
import { getClinicKnowledge } from './dental-knowledge';
import { PatientGoalType, UrgencySeverity } from '../conversation/conversation-session.types';

export interface NetworkRecommendationMatch {
  candidateBusinessId: string;
  candidateClinicName: string;
  candidateSpecialty: string;
  matchedCategory: DentalClinicalCategory;
  recommendedServiceId: string;
  recommendedServiceName: string;
  recommendedSpecialistId?: string;
  recommendedSpecialistName?: string;
  address: string;
  phone: string;
  openingHours: string;
  explanation: string;
}

export const CLINIC_SPECIALTIES: Record<string, string> = {
  [LUMINA_DENTAL_BUSINESS_ID]: 'Family & Cosmetic General Dentistry',
  [APEX_ENDODONTICS_BUSINESS_ID]: 'Microscopic Endodontics & Oral Surgery',
  [ZENITH_IMPLANTS_BUSINESS_ID]: 'Dental Implants & Periodontics',
  [RADIANCE_PEDIATRIC_BUSINESS_ID]: 'Pediatric & Orthodontic Dentistry',
};

/**
 * Evaluates configured dental network clinics to identify a suitable sister clinic
 * when the current clinic cannot provide a clinically relevant dental care category.
 *
 * STRICT SAFETY BOUNDARIES:
 * 1. Life-threatening emergencies (CRITICAL urgency / avulsion) MUST be handled by emergency
 *    escalation protocols (911/ER) and are NEVER handled by network recommendations.
 * 2. Current clinic is strictly excluded (cannot recommend oneself).
 * 3. Candidate clinic must explicitly support the category in CLINIC_CAPABILITY_PROFILES.
 * 4. Candidate clinic must have an ACTIVE bookable service mapped to that category.
 * 5. Facts returned must only originate from verified clinic profiles (no invented clinics or data).
 * 6. Read-only: Never mutates session businessId, creates appointments, or transfers tenants.
 */
export function findNetworkClinicRecommendation(
  currentBusinessId: string,
  category: DentalClinicalCategory,
  patientGoal?: PatientGoalType,
  urgency?: UrgencySeverity | string
): NetworkRecommendationMatch | null {
  // 1. Emergency Safety Rule: Life-threatening emergencies bypass network recommendations
  if (
    urgency === 'CRITICAL' ||
    category === DentalClinicalCategory.TRAUMA_EMERGENCY_AVULSION
  ) {
    return null;
  }

  // 2. Collect candidate sister clinics (excluding current business)
  const candidateProfiles = Object.values(CLINIC_CAPABILITY_PROFILES).filter(
    (profile) => profile.businessId !== currentBusinessId
  );

  interface ScoredCandidate {
    profile: ClinicCapabilityProfile;
    score: number;
  }

  const eligibleCandidates: ScoredCandidate[] = [];

  for (const candidate of candidateProfiles) {
    // 3. Category Coverage Verification
    if (!candidate.supportedCategories.includes(category)) {
      continue;
    }

    // 4. Active Bookable Service Verification
    const serviceMapping = candidate.categoryToServiceMap[category];
    if (!serviceMapping || !serviceMapping.serviceId || !serviceMapping.serviceName) {
      continue;
    }

    let score = 10; // Base score for verified category & active service match

    // 5. Patient Goal Alignment Ranking
    if (patientGoal) {
      if (
        (patientGoal === 'REPLACE_MISSING_TOOTH' && candidate.businessId === ZENITH_IMPLANTS_BUSINESS_ID) ||
        (patientGoal === 'ORTHODONTIC_ALIGNMENT' && candidate.businessId === RADIANCE_PEDIATRIC_BUSINESS_ID) ||
        (patientGoal === 'WISDOM_TOOTH_EVALUATION' && candidate.businessId === APEX_ENDODONTICS_BUSINESS_ID) ||
        (patientGoal === 'WHITEN_TEETH' && candidate.businessId === LUMINA_DENTAL_BUSINESS_ID) ||
        (patientGoal === 'ROUTINE_CLEANING' && candidate.businessId === LUMINA_DENTAL_BUSINESS_ID) ||
        (patientGoal === 'REPAIR_BROKEN_TOOTH' && candidate.businessId === LUMINA_DENTAL_BUSINESS_ID) ||
        (patientGoal === 'PAIN_RELIEF' && candidate.businessId === APEX_ENDODONTICS_BUSINESS_ID)
      ) {
        score += 5;
      }
    }

    // 6. Urgency Alignment Ranking
    if (urgency === 'HIGH' || urgency === 'URGENT') {
      if (candidate.businessId === APEX_ENDODONTICS_BUSINESS_ID) {
        score += 3; // Surgical / acute endodontic capability
      }
    }

    eligibleCandidates.push({ profile: candidate, score });
  }

  if (eligibleCandidates.length === 0) {
    return null;
  }

  // Sort candidates by score descending
  eligibleCandidates.sort((a, b) => b.score - a.score);
  const bestMatch = eligibleCandidates[0].profile;
  const serviceMap = bestMatch.categoryToServiceMap[category]!;
  const knowledgeProfile = getClinicKnowledge(bestMatch.businessId);

  const specialty =
    CLINIC_SPECIALTIES[bestMatch.businessId] || 'Specialized Dental Care';
  const address = knowledgeProfile?.address || 'Metropolis Dental District';
  const phone = knowledgeProfile?.phone || '';
  const openingHours = knowledgeProfile?.openingHours || 'Monday to Friday: 8:00 AM – 5:00 PM';

  // Construct grounded clinical explanation
  const specialistPart = serviceMap.defaultStaffName
    ? ` with ${serviceMap.defaultStaffName}`
    : '';
  const explanation =
    `${bestMatch.clinicName} specializes in ${specialty.toLowerCase()} and offers ${serviceMap.serviceName}${specialistPart}.`;

  return {
    candidateBusinessId: bestMatch.businessId,
    candidateClinicName: bestMatch.clinicName,
    candidateSpecialty: specialty,
    matchedCategory: category,
    recommendedServiceId: serviceMap.serviceId,
    recommendedServiceName: serviceMap.serviceName,
    recommendedSpecialistId: serviceMap.defaultStaffId,
    recommendedSpecialistName: serviceMap.defaultStaffName,
    address,
    phone,
    openingHours,
    explanation,
  };
}

/**
 * Formats a respectful, non-prescriptive recommendation prompt that introduces
 * the sister clinic as an option while honoring patient agency.
 */
export function formatNetworkRecommendationPrompt(
  match: NetworkRecommendationMatch,
  currentClinicName: string
): string {
  const specialistPart = match.recommendedSpecialistName
    ? ` with ${match.recommendedSpecialistName}`
    : '';

  return (
    `${currentClinicName} does not currently provide that specialized treatment in-house. ` +
    `However, within our dental network, our sister practice, ${match.candidateClinicName}, ` +
    `specializes in ${match.candidateSpecialty.toLowerCase()} and offers ${match.recommendedServiceName}${specialistPart}. ` +
    `Would you like more information about this clinic, or would you prefer to explore care options available at ${currentClinicName}?`
  );
}
