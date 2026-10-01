import {
  ClinicKnowledgeProfile,
  DoctorCabinInfo,
  DentalSymptomTriageRule,
  ClinicFAQItem,
} from './clinic-knowledge.types';
import {
  CategoryEvidence,
  DentalTriageProfile,
  PatientGoalType,
  RecommendedNextStep,
} from '../conversation/conversation-session.types';
import {
  extractTriageFacts,
  mergeTriageFacts,
  selectNextFollowUpQuestion,
} from './triage-extractor';
import {
  matchGlobalDentalComplaint,
  matchGlobalDentalComplaintsWithEvidence,
  isLifeThreateningDentalEmergency,
  isSpreadingFacialSwelling,
  getAmbiguousSymptomFollowUp,
  DentalClinicalCategory,
  GLOBAL_DENTAL_CATALOGUE,
  RankedCategoryEvidence,
} from './global-dental-catalogue';
import {
  checkClinicCapability,
  generateUnavailableCapabilityResponse,
  LUMINA_DENTAL_BUSINESS_ID,
  APEX_ENDODONTICS_BUSINESS_ID,
  ZENITH_IMPLANTS_BUSINESS_ID,
  RADIANCE_PEDIATRIC_BUSINESS_ID,
} from './clinic-capabilities';
import { APEX_ENDODONTICS_PROFILE } from './profiles/apex-endodontics.profile';
import { ZENITH_IMPLANTS_PROFILE } from './profiles/zenith-implants.profile';
import { RADIANCE_PEDIATRIC_PROFILE } from './profiles/radiance-pediatric.profile';

export const LUMINA_DENTAL_PROFILE: ClinicKnowledgeProfile = {
  businessId: LUMINA_DENTAL_BUSINESS_ID,
  businessName: 'Lumina Dental Care',
  address: '742 Evergreen Terrace, Suite 100, Metropolis',
  phone: '+1-555-019-2831',
  email: 'appointments@luminadental.demo',
  openingHours: 'Monday to Friday: 8:00 AM – 6:00 PM, Saturday: 9:00 AM – 2:00 PM, Sunday: Closed',
  facilities: [
    'Digital Panoramic 3D X-Ray Suite',
    'Operatories 1 & 2 (West Wing)',
    'Dedicated Hygiene Bay 3 (East Wing)',
    'Children’s Play & Education Nook',
    'Wheelchair Accessible Entrance & Restrooms',
    'Free Designated Patient Parking in Rear',
  ],
  navigation: {
    entrance: 'Enter through the main glass doors on Evergreen Terrace into the central ground-floor lobby.',
    receptionDesk: 'The reception desk is located directly in front of you as you enter the main lobby.',
    waitingLounge:
      'The patient waiting lounge is immediately to the left of the reception desk. It features comfortable seating, complimentary chilled water, herbal tea, high-speed Wi-Fi, and self-check-in tablets.',
    amenities: [
      'Complimentary chilled water and herbal tea',
      'High-speed Wi-Fi',
      'Digital self-check-in tablets',
      'Children’s books and quiet activities',
    ],
    wingDirections: {
      'West Wing':
        'Proceed down the corridor to your right from the reception desk. Cabin 1 (Dr. Marcus Thorne) and Cabin 2 (Dr. Emily Chen) are located in this wing.',
      'East Wing':
        'Follow the corridor to your left past the waiting lounge. Hygiene Bay 3 (Sarah Jenkins, RDH) is located here.',
    },
  },
  patientGuidance: {
    checkInProcedure:
      'When you arrive, please check in with our front-desk receptionist or tap your name on the digital check-in tablet in the waiting area.',
    earlyArrivalPolicy:
      'If you arrive early, please make yourself comfortable in our patient waiting lounge to the left of reception. Our clinical assistant will greet you and guide you to your operatory when ready.',
    lateArrivalPolicy:
      'If you are running more than 15 minutes late, please call reception at +1-555-019-2831 right away so our dental team can adjust your schedule and minimize your wait time.',
    firstTimePatientInstructions:
      'First-time patients should arrive 10 minutes prior to their appointment time to complete digital health intake forms. Please bring a valid photo ID and your dental insurance card.',
    parkingInfo:
      'Free designated patient parking is available directly behind our building off Evergreen Terrace with accessible ramp access to the main entrance.',
  },
  emergencyPolicy: {
    emergencySigns: [
      'Severe or rapidly spreading facial swelling closing an eye or affecting the jaw',
      'Difficulty breathing or swallowing due to oral swelling',
      'Continuous, uncontrolled bleeding following dental trauma',
      'A permanent tooth that has been completely knocked out (avulsed)',
    ],
    immediateInstruction:
      'If you are experiencing difficulty breathing, throat swelling, or continuous uncontrolled bleeding, please call 911 or go to the nearest emergency room immediately.',
    emergencyPhone: '+1-555-019-2831 (Option 9 for Emergency Triage)',
    erInstruction:
      'For severe dental trauma during clinic hours, call our emergency line at +1-555-019-2831 (Option 9) immediately so our clinical team can prepare an urgent care operatory for your arrival.',
  },
  doctors: [
    {
      staffId: 's0000001-0000-0000-0000-000000000001',
      name: 'Dr. Marcus Thorne',
      title: 'Lead General & Cosmetic Dentist',
      cabin: 'Cabin 1',
      wing: 'West Wing',
      floor: 'Ground Floor',
      workingDays: 'Monday through Friday',
      workingHours: '8:00 AM – 5:00 PM',
      handledServices: [
        'Comprehensive Oral Exam & Digital X-Rays',
        'Laser Enamel Whitening & Brightening',
        'Ceramic Crown Preparation & Digital 3D Scan',
      ],
      directions:
        'From the reception desk, turn right down the West corridor. Dr. Marcus Thorne’s consultation room, Cabin 1, is the first door on your left.',
    },
    {
      staffId: 's0000002-0000-0000-0000-000000000002',
      name: 'Dr. Emily Chen',
      title: 'Orthodontist & Pediatric Specialist',
      cabin: 'Cabin 2',
      wing: 'Pediatric & Orthodontic Wing',
      floor: 'Ground Floor',
      workingDays: 'Monday, Wednesday, Friday, Saturday',
      workingHours: '9:00 AM – 4:00 PM',
      handledServices: [
        'Pediatric Preventive Dental Evaluation',
        'Orthodontic Alignment Consultations',
      ],
      directions:
        'From the reception desk, walk down the West corridor past Cabin 1. Dr. Emily Chen’s operatory, Cabin 2, is on your right in the Pediatric Wing.',
    },
    {
      staffId: 's0000003-0000-0000-0000-000000000003',
      name: 'Sarah Jenkins, RDH',
      title: 'Senior Dental Hygienist',
      cabin: 'Hygiene Bay 3',
      wing: 'East Wing',
      floor: 'Ground Floor',
      workingDays: 'Tuesday through Saturday',
      workingHours: '8:30 AM – 4:30 PM',
      handledServices: ['Ultrasonic Prophylaxis Hygiene Scaling'],
      directions:
        'From the reception desk, turn left past the waiting lounge into the East Wing corridor. Hygiene Bay 3 is the first operatory on your left.',
    },
    {
      staffId: 's0000004-0000-0000-0000-000000000004',
      name: 'David Miller',
      title: 'Clinical Assistant & Lab Tech',
      cabin: 'Clinical Support & Lab',
      wing: 'Central Clinical Core',
      floor: 'Ground Floor',
      workingDays: 'Monday through Friday',
      workingHours: '8:00 AM – 6:00 PM',
      handledServices: ['Chairside Clinical Support', 'Digital 3D Scans', 'Sterilization'],
      directions:
        'Located in the central clinical corridor between the West and East wings behind the staff station.',
    },
  ],
  symptomTriageRules: [
    {
      symptomKeywords: [
        'pain',
        'toothache',
        'hurts',
        'hurting',
        'chew',
        'chewing',
        'ache',
        'aching',
        'sensitive',
        'sensitivity',
        'cold',
        'hot',
        'sweet',
        'throbbing',
        'decay',
        'cavity',
        'swollen gum',
      ],
      suggestedServiceId: 'sv000001-0000-0000-0000-000000000001',
      suggestedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
      recommendedSpecialistId: 's0000001-0000-0000-0000-000000000001',
      recommendedSpecialistName: 'Dr. Marcus Thorne',
      triageCategory: 'Dental Pain & Diagnostic Evaluation',
      clinicalExplanation:
        'Tooth pain or sensitivity when eating, drinking, or chewing requires a professional dental examination to assess your oral health.',
      clinicalSafetyDisclaimer:
        'A dentist must examine you in person with digital imaging to determine the cause. A Comprehensive Oral Exam and Digital X-Rays is the recommended starting point.',
    },
    {
      symptomKeywords: [
        'clean',
        'cleaning',
        'hygiene',
        'scale',
        'scaling',
        'tartar',
        'plaque',
        'stain',
        'prophylaxis',
        'bleeding gums',
        'bad breath',
      ],
      suggestedServiceId: 'sv000002-0000-0000-0000-000000000002',
      suggestedServiceName: 'Ultrasonic Prophylaxis Hygiene Scaling',
      recommendedSpecialistId: 's0000003-0000-0000-0000-000000000003',
      recommendedSpecialistName: 'Sarah Jenkins, RDH',
      triageCategory: 'Preventive Hygiene & Gum Care',
      clinicalExplanation:
        'Ultrasonic prophylaxis gently removes hardened tartar, bacterial plaque, and surface stains to preserve gum health and prevent periodontal disease.',
      clinicalSafetyDisclaimer:
        'Our senior dental hygienist will evaluate your gum health and provide thorough ultrasonic scaling and polishing.',
    },
    {
      symptomKeywords: [
        'whiten',
        'whitening',
        'brighten',
        'brightening',
        'yellow',
        'discolor',
        'discolored',
        'bleach',
        'bleaching',
        'cosmetic',
        'smile makeover',
      ],
      suggestedServiceId: 'sv000003-0000-0000-0000-000000000003',
      suggestedServiceName: 'Laser Enamel Whitening & Brightening',
      recommendedSpecialistId: 's0000001-0000-0000-0000-000000000001',
      recommendedSpecialistName: 'Dr. Marcus Thorne',
      triageCategory: 'Cosmetic Dentistry',
      clinicalExplanation:
        'Our in-office light-activated laser treatment safely penetrates enamel to lift years of coffee, tea, and age-related discoloration by up to 8 shades.',
      clinicalSafetyDisclaimer:
        'The dentist will first inspect your teeth and gums to confirm that cosmetic whitening is safe and suitable for your enamel.',
    },
    {
      symptomKeywords: [
        'chip',
        'chipped',
        'broken',
        'broke',
        'crack',
        'cracked',
        'fracture',
        'fractured',
        'crown',
        'cap',
        'lost filling',
        'lost crown',
      ],
      suggestedServiceId: 'sv000004-0000-0000-0000-000000000004',
      suggestedServiceName: 'Ceramic Crown Preparation & Digital 3D Scan',
      recommendedSpecialistId: 's0000001-0000-0000-0000-000000000001',
      recommendedSpecialistName: 'Dr. Marcus Thorne',
      triageCategory: 'Restorative Care',
      clinicalExplanation:
        'A fractured, chipped, or compromised tooth requires prompt examination to protect the tooth and restore comfortable chewing.',
      clinicalSafetyDisclaimer:
        'Dr. Marcus Thorne will evaluate the tooth with optical 3D imaging to determine whether a custom crown or conservative restoration is appropriate.',
    },
    {
      symptomKeywords: [
        'child',
        'children',
        'kid',
        'kids',
        'baby tooth',
        'baby teeth',
        'son',
        'daughter',
        'pediatric',
        'toddler',
      ],
      suggestedServiceId: 'sv000005-0000-0000-0000-000000000005',
      suggestedServiceName: 'Pediatric Preventive Dental Evaluation',
      recommendedSpecialistId: 's0000002-0000-0000-0000-000000000002',
      recommendedSpecialistName: 'Dr. Emily Chen',
      triageCategory: 'Pediatric Dental Care',
      clinicalExplanation:
        'Our gentle pediatric evaluations ensure young patients have a positive, anxiety-free experience while assessing tooth development, bite alignment, and cavity prevention.',
      clinicalSafetyDisclaimer:
        'Dr. Emily Chen specializes in pediatric dentistry, early orthodontics, and protective sealants for developing smiles.',
    },
  ],
  faqs: [
    {
      id: 'faq-visitor-policy',
      category: 'visitor_policy',
      topic: 'Visitor, Family & Companion Policy',
      keywords: [
        'alone', 'mother', 'mom', 'father', 'dad', 'parent', 'parents', 'husband',
        'wife', 'spouse', 'partner', 'family', 'caregiver', 'caretaker', 'companion',
        'chaperone', 'friend', 'someone', 'somebody', 'anyone', 'escort', 'accompany',
        'bring someone', 'come with me', 'stay with me', 'come alone', 'by myself',
      ],
      semanticPhrases: [
        'can i bring my mother with me',
        'can my mother come with me',
        'can i bring my mother',
        'can my husband accompany me',
        'can someone come with me',
        'do i need to come alone',
        'can my caregiver come',
        'can my caregiver come inside',
        'can i come with someone',
        'is it okay if my husband accompanies me',
        'can somebody stay with me',
        'i don\'t want to come alone',
        'can my friend come',
        'can i bring a family member',
      ],
      answer:
        'You are very welcome to bring a family member, parent, caregiver, or companion with you for support. They may relax in our patient waiting lounge or accompany you into the operatory.',
    },
    {
      id: 'faq-accessibility',
      category: 'accessibility',
      topic: 'Wheelchair Accessibility & Facilities',
      keywords: [
        'wheelchair', 'accessible', 'accessibility', 'handicap', 'handicapped',
        'disabled', 'disability', 'ramp', 'lift', 'elevator', 'stairs', 'steps', 'walker',
      ],
      semanticPhrases: [
        'is the clinic wheelchair accessible',
        'do you have a lift',
        'do you have an elevator',
        'is there wheelchair access',
        'can i enter with a wheelchair',
        'are there stairs',
        'do i need to climb stairs',
      ],
      answer:
        'Our clinic is fully wheelchair accessible on the ground floor, featuring step-free ramp access directly from the rear parking lot, wide corridors, and accessible restrooms. An elevator is not needed since all consultation rooms are on the ground floor.',
    },
    {
      id: 'faq-arrival-waiting',
      category: 'arrival_and_waiting',
      topic: 'Arrival Time, Check-In & Waiting Lounge',
      keywords: [
        'early', 'arrive early', 'waiting lounge', 'waiting area', 'late',
        'running late', 'check in', 'check-in', 'tablets', 'lounge amenities',
      ],
      semanticPhrases: [
        'how early should i arrive',
        'can i arrive early',
        'where should i wait',
        'what if i am running late',
        'is there a waiting lounge',
        'what should i do when i arrive',
      ],
      answer:
        'You may arrive up to 30 minutes early and relax in our patient waiting lounge with complimentary tea, chilled water, and Wi-Fi. Please check in at the reception desk or use our self-check-in tablet upon entering. If you are running more than 15 minutes late, please call our front desk at +1-555-019-2831 so our clinical team can adjust your schedule.',
    },
    {
      id: 'faq-appointment-policy',
      category: 'appointment_policy',
      topic: 'Walk-ins, Rescheduling & Consultation Duration',
      keywords: [
        'walk-in', 'walk in', 'walk-ins', 'walkins', 'without appointment',
        'without booking', 'just show up', 'reschedule', 'how long',
        'consultation take', 'duration', 'cancel policy', 'cancellation',
      ],
      semanticPhrases: [
        'do you accept walk-ins',
        'can i walk in',
        'do you take walk in patients',
        'can i reschedule my appointment',
        'how long does a consultation take',
        'how long is the appointment',
        'how many minutes is a checkup',
      ],
      answer:
        'We prioritize scheduled appointments to avoid patient waiting times, though dedicated same-day emergency slots are reserved daily. We recommend calling ahead or scheduling online rather than walking in. Comprehensive consultations and routine exams typically take 30 to 45 minutes.',
    },
    {
      id: 'faq-preparation',
      category: 'preparation',
      topic: 'Appointment Preparation & Required Documents',
      keywords: [
        'report', 'reports', 'dental report', 'records', 'dental records', 'x-ray',
        'xrays', 'x-rays', 'id', 'photo id', 'identification', 'insurance card',
        'prepare', 'preparation', 'fasting', 'empty stomach', 'what to bring', 'need to bring',
      ],
      semanticPhrases: [
        'do i need to bring previous dental reports',
        'should i bring dental reports',
        'do i need to bring my x-rays',
        'do i need an id',
        'what should i bring',
        'do i need to fast',
        'should i bring my records',
        'what documents do i need',
      ],
      answer:
        'Please arrive 10 minutes early with a valid government photo ID and your dental insurance card. You are welcome to bring previous dental reports, treatment notes, or X-rays if you have them, though our clinic has a full Digital Panoramic 3D X-Ray Suite on-site. Routine examinations do not require fasting.',
    },
    {
      id: 'faq-payment',
      category: 'payment',
      topic: 'Payment Methods & Digital Payments',
      keywords: [
        'payment', 'pay', 'payment methods', 'upi', 'gpay', 'apple pay',
        'credit card', 'debit card', 'cash', 'contactless', 'hsa', 'fsa',
      ],
      semanticPhrases: [
        'do you accept upi',
        'what payment methods do you accept',
        'can i pay with credit card',
        'can i pay cash',
        'do you accept cards',
        'how can i pay',
      ],
      answer:
        'We accept all major credit and debit cards, cash, contactless mobile payments, HSA/FSA cards, and digital transfers including UPI. Payment is processed at the reception desk following your visit.',
    },
    {
      id: 'faq-insurance',
      category: 'insurance',
      topic: 'Dental Insurance Coverage & Verification',
      keywords: [
        'insurance', 'dental insurance', 'accept insurance', 'ppo', 'coverage',
        'medicare', 'medicaid', 'co-pay', 'copay',
      ],
      semanticPhrases: [
        'do you accept insurance',
        'does insurance cover this',
        'what insurance do you take',
        'do you accept dental insurance',
        'will my insurance cover the visit',
      ],
      answer:
        'We accept most major dental PPO insurance plans. Our front desk team will gladly verify your coverage, deductible, and eligible benefits when you present your dental insurance card at check-in.',
    },
    {
      id: 'faq-parking',
      category: 'parking',
      topic: 'Designated Patient Parking',
      keywords: [
        'parking', 'park', 'car', 'vehicle', 'parking lot', 'valet',
        'where to park', 'free parking', 'parking space',
      ],
      semanticPhrases: [
        'is parking available',
        'where can i park',
        'is there parking',
        'do you have parking',
        'where do i park my car',
        'is parking free',
      ],
      answer:
        'Free designated patient parking is located directly behind our building off Evergreen Terrace, with direct wheelchair ramp access to our main lobby entrance.',
    },
    {
      id: 'faq-clinic-hours',
      category: 'clinic_hours',
      topic: 'Operating & Opening Hours',
      keywords: [
        'hours', 'operating hours', 'opening hours', 'open today', 'what time do you open',
        'when do you close', 'weekend', 'saturday', 'sunday', 'business hours',
      ],
      semanticPhrases: [
        'what are your opening hours',
        'what time do you open',
        'when do you close',
        'are you open on saturday',
        'are you open on sunday',
        'what are your business hours',
      ],
      answer:
        'We are open Monday to Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 2:00 PM. We are closed on Sundays.',
    },
    {
      id: 'faq-facilities',
      category: 'facilities',
      topic: 'Clinic Amenities & Patient Facilities',
      keywords: [
        'children', 'play area', 'kids', 'nook', 'amenities', 'facilities',
        'wifi', 'wi-fi', 'tea', 'water', 'refreshments', 'restroom',
      ],
      semanticPhrases: [
        'do you have a children\'s play area',
        'is there a play area for kids',
        'do you have wifi',
        'what amenities do you have',
        'is there a kids area',
      ],
      answer:
        'Our clinic features a Children\'s Play & Education Nook, a full Digital Panoramic 3D X-Ray Suite, complimentary herbal tea, chilled water, and high-speed Wi-Fi in our patient lounge.',
    },
    {
      id: 'faq-directions',
      category: 'directions',
      topic: 'Building Location, Floors & Finding Reception',
      keywords: [
        'floor', 'which floor', 'what floor', 'entrance', 'where is reception',
        'front desk', 'suite', 'address', 'directions', 'lobby',
      ],
      semanticPhrases: [
        'which floor are you on',
        'where is the reception',
        'what floor are you located on',
        'how do i find the reception',
        'where is your front desk',
      ],
      answer:
        'We are located on the ground floor at 742 Evergreen Terrace, Suite 100. As you enter through the main glass doors into the central lobby, the reception desk is located directly in front of you.',
    },
    {
      id: 'faq-doctors',
      category: 'doctors',
      topic: 'Specialists & Dental Team Directory',
      keywords: [
        'doctors', 'specialists', 'dentists', 'who works here', 'dr thorne',
        'dr chen', 'hygienist', 'staff directory', 'team',
      ],
      semanticPhrases: [
        'who are your doctors',
        'who is the dentist',
        'what specialists do you have',
        'tell me about your dentists',
      ],
      answer:
        'Our clinical team includes Dr. Marcus Thorne (Lead Dentist in Cabin 1), Dr. Emily Chen (Pediatric & Orthodontic Specialist in Cabin 2), Sarah Jenkins, RDH (Senior Dental Hygienist in Bay 3), and David Miller (Clinical Assistant).',
    },
    {
      id: 'faq-general-info',
      category: 'general_business_information',
      topic: 'Clinic Contact & Business Information',
      keywords: [
        'contact', 'clinic phone', 'office phone', 'your phone', 'reception phone', 'email', 'address', 'call you', 'lumina dental care',
      ],
      semanticPhrases: [
        'what is your phone number',
        'what is your address',
        'how can i contact you',
        'what is your email',
      ],
      answer:
        'Lumina Dental Care is located at 742 Evergreen Terrace, Suite 100, Metropolis. You can reach our office by phone at +1-555-019-2831 or email at appointments@luminadental.demo.',
    },
  ],
};

/**
 * Registry of clinic knowledge profiles keyed by tenant businessId.
 * Multi-tenant safe: only configured businesses have detailed profiles.
 */
const CLINIC_PROFILES: Record<string, ClinicKnowledgeProfile> = {
  [LUMINA_DENTAL_BUSINESS_ID]: LUMINA_DENTAL_PROFILE,
  [APEX_ENDODONTICS_BUSINESS_ID]: APEX_ENDODONTICS_PROFILE,
  [ZENITH_IMPLANTS_BUSINESS_ID]: ZENITH_IMPLANTS_PROFILE,
  [RADIANCE_PEDIATRIC_BUSINESS_ID]: RADIANCE_PEDIATRIC_PROFILE,
};

/**
 * Retrieves the clinic knowledge profile for a specific business tenant.
 * Guarantees strict multi-tenant isolation.
 */
export function getClinicKnowledge(businessId: string): ClinicKnowledgeProfile | null {
  if (!businessId) return null;
  return CLINIC_PROFILES[businessId] || null;
}

/**
 * Resolves a doctor or room cabin inquiry for a specific business tenant.
 */
export function findDoctorCabin(
  businessId: string,
  query: string
): { doctor?: DoctorCabinInfo; directions?: string; notFound?: boolean } | null {
  const profile = getClinicKnowledge(businessId);
  if (!profile) return null;

  const q = query.toLowerCase().trim();

  // Search by doctor name or title or cabin number
  for (const doc of profile.doctors) {
    const dName = doc.name.toLowerCase();
    const dTitle = doc.title.toLowerCase();
    const dCabin = doc.cabin.toLowerCase();

    const dClean = dName.replace(/dr\.?\s*/i, '').trim();
    const qClean = q.replace(/dr\.?\s*/i, '').trim();

    const nameParts = dClean.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    const qWords = qClean.split(/\s+/);
    const matchesFullName = qClean.includes(dClean) || dClean.includes(qClean);
    const matchesLastName = lastName.length >= 3 && qClean.includes(lastName);
    const matchesOnlyFirstName = qWords.length === 1 && qWords[0] === nameParts[0];
    const matchesName = matchesFullName || matchesLastName || matchesOnlyFirstName;
    const matchesCabin = q.includes(dCabin) || (dCabin.includes('cabin') && q.includes('room ' + dCabin.replace('cabin ', '')));
    const matchesSpecialty =
      (dTitle.includes('orthodontist') && q.includes('orthodont')) ||
      (dTitle.includes('pediatric') && (q.includes('pediatric') || q.includes('child'))) ||
      (dTitle.includes('hygienist') && (q.includes('hygienist') || q.includes('cleaning'))) ||
      (dTitle.includes('endodont') && q.includes('endodont')) ||
      (dTitle.includes('surgeon') && (q.includes('surgeon') || q.includes('surgery'))) ||
      (dTitle.includes('periodont') && q.includes('periodont')) ||
      (dTitle.includes('implant') && q.includes('implant')) ||
      (dTitle.includes('prosthodont') && q.includes('prosthodont')) ||
      (dTitle.includes('cosmetic') && q.includes('cosmetic'));

    if (matchesName || matchesCabin || matchesSpecialty) {
      return {
        doctor: doc,
        directions: `${doc.name} (${doc.title}) is located in ${doc.cabin} in the ${doc.wing} on the ${doc.floor}. ${doc.directions}`,
      };
    }
  }

  // Directions to rooms from reception
  if (/\b(reach|get to|way to|how do i get|how do i reach|from reception)\b/i.test(q)) {
    return {
      directions: `From the reception desk, consultation rooms are located down the central corridor: please ask our front-desk reception staff who will gladly guide you.`,
    };
  }

  // General cabin / room inquiry without a specific name
  if (q.includes('cabin') || q.includes('room') || q.includes('where')) {
    const cabinList = profile.doctors
      .map((d) => `${d.cabin} (${d.name})`)
      .join(', ');
    return {
      directions: `Our consultation rooms include ${cabinList}. Which specialist or room are you looking for?`,
    };
  }

  return { notFound: true };
}

export interface DentalTriageResult {
  matched: boolean;
  isEmergency: boolean;
  isAmbiguous: boolean;
  ambiguousQuestion?: string;
  category?: DentalClinicalCategory;
  isSupportedByClinic: boolean;
  unavailableExplanation?: string;
  triageRule?: DentalSymptomTriageRule;
  suggestedServiceId?: string;
  suggestedServiceName?: string;
  suggestedStaffId?: string;
  suggestedStaffName?: string;
  cautiousExplanation?: string;
  responsePrompt?: string;
  triageProfile?: DentalTriageProfile;
  patientGoal?: PatientGoalType;
  patientGoals?: PatientGoalType[];
  recommendedNextStep?: RecommendedNextStep;
  rankedCategories?: CategoryEvidence[];
  urgencyLevel?: string;
}

/**
 * Intelligent dental domain inquiry resolution:
 * 1. Urgency / Emergency safety check
 * 2. Ambiguous symptom follow-up question
 * 3. Global dental problem mapping (18 CDT categories)
 * 4. Tenant clinic capability awareness
 * 5. Appropriate non-diagnostic response generation
 */
/**
 * Formats an empathetic, professional receptionist opening tailored to visit reason
 * (e.g. pain empathy, aesthetic courtesy, gentle reassurance).
 */
export function getEmpatheticOpening(category: DentalClinicalCategory, input?: string): string {
  switch (category) {
    case DentalClinicalCategory.AESTHETIC_WHITENING:
      return 'Certainly! We can help you explore professional whitening options.';
    case DentalClinicalCategory.COSMETIC_SMILE_DESIGN:
      return 'Wonderful! We would be delighted to help you explore cosmetic smile options.';
    case DentalClinicalCategory.PREVENTIVE_ROUTINE:
      return 'Sure, I can help you schedule a dental cleaning.';
    case DentalClinicalCategory.PEDIATRIC_PREVENTIVE:
      return "We'd be glad to help schedule a gentle visit for your child.";
    case DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION:
      return 'That sounds uncomfortable.';
    case DentalClinicalCategory.ABSCESS_ACUTE_INFECTION:
      return "I'm concerned about those symptoms. Swelling can indicate an active infection that needs prompt care.";
    default:
      return "I'm sorry you're dealing with that discomfort.";
  }
}

/**
 * Intelligent dental domain inquiry resolution:
 * 1. Urgency / Emergency safety check
 * 2. Spreading facial swelling triage
 * 3. Ambiguous symptom follow-up question
 * 4. Global dental problem mapping (18 CDT categories)
 * 5. Tenant clinic capability awareness
 * 6. Appropriate non-diagnostic response generation
 */
export function triageDentalInquiry(
  businessId: string,
  input: string,
  existingProfile?: DentalTriageProfile
): DentalTriageResult {
  const clinicProfile = getClinicKnowledge(businessId);
  const clinicName = clinicProfile?.businessName || 'our dental clinic';

  // Extract facts and construct or merge triage profile
  const newFacts = extractTriageFacts(input, existingProfile);
  const activeProfile: DentalTriageProfile = existingProfile
    ? mergeTriageFacts(existingProfile, newFacts, input)
    : {
        originalPatientStatement: input,
        reportedSymptoms: newFacts.reportedSymptoms || [],
        symptomCategories: [],
        triggers: newFacts.triggers || [],
        urgencyLevel: 'ROUTINE',
        followUpHistory: [],
        isAmbiguous: false,
        ...newFacts,
      };

  // Rank evidence across categories
  const ranked = matchGlobalDentalComplaintsWithEvidence(input);
  // Also check combined statement if this was a follow-up turn
  if (existingProfile && existingProfile.originalPatientStatement) {
    const combinedRanked = matchGlobalDentalComplaintsWithEvidence(
      `${existingProfile.originalPatientStatement}. ${input}`
    );
    for (const cr of combinedRanked) {
      if (!ranked.some((r) => r.category === cr.category)) {
        ranked.push(cr);
      }
    }
    ranked.sort((a, b) => b.score - a.score);
  }

  const categoryEvidenceList: CategoryEvidence[] = ranked.map((r) => ({
    category: r.category,
    score: r.score,
    evidence: r.evidence,
    matchedPhrases: r.matchedPhrases,
    urgency: r.urgency,
    explanation: r.entry.cautiousExplanation,
  }));

  activeProfile.rankedCategories = categoryEvidenceList;
  activeProfile.symptomCategories = Array.from(
    new Set([...(activeProfile.symptomCategories || []), ...ranked.map((r) => r.category)])
  );

  // 1. Life-threatening emergency triage
  if (
    isLifeThreateningDentalEmergency(input) ||
    isEmergencyDental(input) ||
    activeProfile.breathingDifficulty === true ||
    activeProfile.swallowingDifficulty === true ||
    activeProfile.eyeInvolvement === true
  ) {
    activeProfile.urgencyLevel = 'CRITICAL';
    activeProfile.recommendedNextStep = 'EMERGENCY_ESCALATION';
    const emergencyPrompt =
      clinicProfile?.emergencyPolicy?.immediateInstruction ||
      'If you are experiencing difficulty breathing, severe facial swelling, or continuous heavy bleeding, please call 911 or go to the nearest emergency room immediately.';

    return {
      matched: true,
      isEmergency: true,
      isAmbiguous: false,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'EMERGENCY_ESCALATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'CRITICAL',
      responsePrompt: emergencyPrompt,
    };
  }

  // 2. Urgent Spreading Facial Swelling Triage
  if (
    isSpreadingFacialSwelling(input) ||
    (activeProfile.swellingPresent === true &&
      activeProfile.reportedSymptoms?.includes('facial cheek swelling'))
  ) {
    activeProfile.urgencyLevel = 'URGENT';
    activeProfile.recommendedNextStep = 'URGENT_EVALUATION';
    const urgentPrompt =
      `Facial or cheek swelling can indicate an active dental infection that requires prompt professional attention. ` +
      `If you develop any difficulty breathing, swallowing, or fever, please seek emergency medical care immediately. ` +
      `For your dental care, we strongly recommend an urgent examination today. ` +
      `Would you like to schedule an appointment for Comprehensive Oral Exam & Digital X-Rays?`;

    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      category: DentalClinicalCategory.ABSCESS_ACUTE_INFECTION,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'URGENT_EVALUATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'URGENT',
      suggestedServiceId: 'sv000001-0000-0000-0000-000000000001',
      suggestedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
      suggestedStaffId: 's0000001-0000-0000-0000-000000000001',
      suggestedStaffName: 'Dr. Marcus Thorne',
      cautiousExplanation:
        'Facial or cheek swelling is commonly associated with an active dental infection requiring clinical evaluation and radiographic assessment.',
      responsePrompt: urgentPrompt,
    };
  }

  // 3. Information-Only & Cost Inquiries
  if (activeProfile.patientGoal === 'COST_INFORMATION') {
    activeProfile.recommendedNextStep = 'INFORMATIONAL_GUIDANCE';
    activeProfile.urgencyLevel = 'ROUTINE';

    let costExplanation = '';
    const cleanLower = input.toLowerCase();

    if (/\b(implant|screw tooth|implants)\b/i.test(cleanLower)) {
      if (businessId === LUMINA_DENTAL_BUSINESS_ID) {
        costExplanation =
          'At Lumina Dental Care, we do not perform surgical dental implant placement in-house, but our comprehensive examinations with digital X-rays ($120) with Dr. Marcus Thorne assess your bone, bite, and replacement options before coordinating with an implant specialist.';
      } else if (businessId === ZENITH_IMPLANTS_BUSINESS_ID) {
        costExplanation =
          'At Zenith Dental Implants, a comprehensive dental implant consultation and 3D imaging assessment is $150.';
      } else {
        costExplanation =
          'A dental implant consultation and radiographic evaluation is typically the starting point to determine bone density and provide an exact cost estimate.';
      }
    } else if (/\b(whitening|whiten|bleach)\b/i.test(cleanLower)) {
      costExplanation =
        'At Lumina Dental Care, our professional Laser Enamel Whitening & Brightening is $275, which includes enamel sensitivity evaluation and protective barriers.';
    } else if (/\b(crown|cap)\b/i.test(cleanLower)) {
      costExplanation =
        'At Lumina Dental Care, a Ceramic Crown Preparation & Digital 3D Scan is $850, which includes digital intraoral scanning, tooth preparation, and temporary restoration.';
    } else {
      costExplanation =
        'Our Comprehensive Oral Exam & Digital X-Rays is $120, which allows our dentist to evaluate your teeth and provide a detailed treatment plan with transparent pricing.';
    }

    const costPrompt = `${costExplanation} Would you like more information or to schedule an evaluation?`;
    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: 'COST_INFORMATION',
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'INFORMATIONAL_GUIDANCE',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'ROUTINE',
      suggestedServiceId: 'sv000001-0000-0000-0000-000000000001',
      suggestedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
      suggestedStaffId: 's0000001-0000-0000-0000-000000000001',
      suggestedStaffName: 'Dr. Marcus Thorne',
      cautiousExplanation: costExplanation,
      responsePrompt: costPrompt,
    };
  }

  if (activeProfile.patientGoal === 'INFORMATION_ONLY') {
    activeProfile.recommendedNextStep = 'INFORMATIONAL_GUIDANCE';
    activeProfile.urgencyLevel = 'ROUTINE';

    let infoExplanation = '';
    const cleanLower = input.toLowerCase();

    if (/\b(broken|broke|chipped|fixed|repair)\b/i.test(cleanLower)) {
      infoExplanation =
        'A broken tooth can often be restored using composite bonding, a filling, or a protective ceramic crown depending on the amount of healthy tooth structure remaining. A clinical examination is needed to inspect the tooth first.';
    } else if (/\b(missing|replace|lost a tooth)\b/i.test(cleanLower)) {
      infoExplanation =
        'Replacing a missing tooth typically involves options like a dental implant, fixed bridge, or partial denture depending on your oral health. While Lumina does not perform surgical implant placement in-house, our dentists can perform a comprehensive oral evaluation to assess your options.';
    } else if (/\b(whitening|whiten)\b/i.test(cleanLower)) {
      infoExplanation =
        'Yes, we offer professional Laser Enamel Whitening & Brightening under dental supervision to safely brighten your smile following an oral health check.';
    } else if (/\b(root canal)\b/i.test(cleanLower)) {
      infoExplanation =
        'A root canal treatment is recommended when the nerve or inner pulp of a tooth is severely inflamed or infected. An examination with X-rays is required to determine whether endodontic therapy is indicated.';
    } else {
      infoExplanation =
        'We would be glad to help provide information regarding your dental care.';
    }

    const infoPrompt = `${infoExplanation} We can help you schedule an evaluation. Would you like to schedule an appointment for Comprehensive Oral Exam & Digital X-Rays?`;
    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: 'INFORMATION_ONLY',
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'INFORMATIONAL_GUIDANCE',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'ROUTINE',
      suggestedServiceId: 'sv000001-0000-0000-0000-000000000001',
      suggestedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
      suggestedStaffId: 's0000001-0000-0000-0000-000000000001',
      suggestedStaffName: 'Dr. Marcus Thorne',
      cautiousExplanation: infoExplanation,
      responsePrompt: infoPrompt,
    };
  }

  // 3c. Explicit Patient Goal = EVALUATION (General checkup / evaluation requested without specific symptom category)
  if (activeProfile.patientGoal === 'EVALUATION' && categoryEvidenceList.length === 0) {
    activeProfile.recommendedNextStep = 'DENTAL_EXAMINATION';
    activeProfile.urgencyLevel = 'ROUTINE';
    const evalServiceId = 'sv000001-0000-0000-0000-000000000001';
    const evalServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
    const evalStaffId = 's0000001-0000-0000-0000-000000000001';
    const evalStaffName = 'Dr. Marcus Thorne';
    const evalExplanation =
      'A comprehensive clinical examination and digital radiographs will allow our dental team to assess your complete oral health and determine what may be going on.';
    const evalPrompt = `We would be glad to have our dentists examine that for you. A Comprehensive Oral Exam & Digital X-Rays with Dr. Marcus Thorne allows us to inspect your teeth and gums thoroughly. Would you like to schedule an appointment for ${evalServiceName}?`;

    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      category: DentalClinicalCategory.PREVENTIVE_ROUTINE,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: 'EVALUATION',
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'DENTAL_EXAMINATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'ROUTINE',
      suggestedServiceId: evalServiceId,
      suggestedServiceName: evalServiceName,
      suggestedStaffId: evalStaffId,
      suggestedStaffName: evalStaffName,
      cautiousExplanation: evalExplanation,
      responsePrompt: evalPrompt,
    };
  }

  // 4. Ambiguous symptom check
  const ambiguousPrompt = getAmbiguousSymptomFollowUp(input);
  if (ambiguousPrompt && categoryEvidenceList.length === 0) {
    activeProfile.isAmbiguous = true;
    activeProfile.activeFollowUpQuestion = ambiguousPrompt;
    activeProfile.recommendedNextStep = 'CLARIFICATION_NEEDED';

    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: true,
      ambiguousQuestion: ambiguousPrompt,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'CLARIFICATION_NEEDED',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'ROUTINE',
      responsePrompt: ambiguousPrompt,
    };
  }

  // 5. Multi-Symptom Evidence Synthesis
  const hasFracture =
    categoryEvidenceList.some((c) => c.category === DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION) ||
    activeProfile.reportedSymptoms?.includes('broken tooth');
  const hasPulpitis =
    categoryEvidenceList.some((c) => c.category === DentalClinicalCategory.PULPITIS_ENDODONTICS) ||
    activeProfile.reportedSymptoms?.includes('throbbing tooth pain');
  const hasGingivitis =
    categoryEvidenceList.some((c) => c.category === DentalClinicalCategory.GINGIVITIS) ||
    activeProfile.reportedSymptoms?.includes('bleeding gums');
  const hasSensitivity =
    categoryEvidenceList.some((c) => c.category === DentalClinicalCategory.DENTAL_SENSITIVITY) ||
    activeProfile.reportedSymptoms?.includes('cold sensitivity');
  const hasAbscess =
    categoryEvidenceList.some((c) => c.category === DentalClinicalCategory.ABSCESS_ACUTE_INFECTION) ||
    activeProfile.reportedSymptoms?.includes('facial cheek swelling') ||
    activeProfile.reportedSymptoms?.includes('swollen gum');
  const hasImplantGoal =
    categoryEvidenceList.some((c) => c.category === DentalClinicalCategory.IMPLANT_PROSTHODONTICS) ||
    activeProfile.reportedSymptoms?.includes('missing tooth') ||
    activeProfile.patientGoal === 'REPLACE_MISSING_TOOTH';
  const hasWhiteningGoal =
    categoryEvidenceList.some((c) => c.category === DentalClinicalCategory.AESTHETIC_WHITENING) ||
    activeProfile.reportedSymptoms?.includes('tooth discoloration') ||
    activeProfile.patientGoal === 'WHITEN_TEETH';

  // Combination A: Broken tooth + Throbbing pain
  if (hasFracture && hasPulpitis) {
    activeProfile.urgencyLevel = 'HIGH';
    activeProfile.recommendedNextStep = 'DENTAL_EXAMINATION';
    const evalServiceId = 'sv000001-0000-0000-0000-000000000001';
    const evalServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
    const evalStaffId = 's0000001-0000-0000-0000-000000000001';
    const evalStaffName = 'Dr. Marcus Thorne';
    const cautiousText =
      'A broken tooth that is throbbing can involve both structural damage and irritation or inflammation in the inner tooth pulp. A dentist would need to examine the tooth to determine the cause.';
    const promptText = `That sounds uncomfortable. ${cautiousText} A dental examination and digital X-rays will allow Dr. Marcus Thorne to inspect the fracture, help relieve your discomfort, and discuss treatment options. Would you like to schedule an appointment for ${evalServiceName}?`;

    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      category: DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'DENTAL_EXAMINATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'HIGH',
      suggestedServiceId: evalServiceId,
      suggestedServiceName: evalServiceName,
      suggestedStaffId: evalStaffId,
      suggestedStaffName: evalStaffName,
      cautiousExplanation: cautiousText,
      responsePrompt: promptText,
    };
  }

  // Combination B: Bleeding gums + Cold sensitivity
  if (hasGingivitis && hasSensitivity) {
    activeProfile.urgencyLevel = 'ROUTINE';
    activeProfile.recommendedNextStep = 'DENTAL_EXAMINATION';
    const evalServiceId = 'sv000001-0000-0000-0000-000000000001';
    const evalServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
    const evalStaffId = 's0000001-0000-0000-0000-000000000001';
    const evalStaffName = 'Dr. Marcus Thorne';
    const cautiousText =
      'Bleeding gums when brushing can be associated with early gum inflammation (gingivitis), while sensitivity to cold can suggest exposed root surfaces or enamel wear.';
    const promptText = `I'm sorry you're dealing with that discomfort. ${cautiousText} A comprehensive dental checkup and digital imaging will allow our clinical team to evaluate both your gum health and enamel margins. Would you like to schedule an appointment for ${evalServiceName}?`;

    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      category: DentalClinicalCategory.GINGIVITIS,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'DENTAL_EXAMINATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'ROUTINE',
      suggestedServiceId: evalServiceId,
      suggestedServiceName: evalServiceName,
      suggestedStaffId: evalStaffId,
      suggestedStaffName: evalStaffName,
      cautiousExplanation: cautiousText,
      responsePrompt: promptText,
    };
  }

  // Combination C: Swelling + Severe tooth pain
  if (hasAbscess && (hasPulpitis || activeProfile.reportedSymptoms?.includes('toothache'))) {
    activeProfile.urgencyLevel = 'URGENT';
    activeProfile.recommendedNextStep = 'URGENT_EVALUATION';
    const evalServiceId = 'sv000001-0000-0000-0000-000000000001';
    const evalServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
    const evalStaffId = 's0000001-0000-0000-0000-000000000001';
    const evalStaffName = 'Dr. Marcus Thorne';
    const cautiousText =
      'Facial or gum swelling combined with severe tooth pain can indicate an active dental infection requiring prompt professional attention.';
    const promptText = `Facial swelling combined with severe tooth pain can indicate an active dental infection that requires prompt professional attention. If you develop any difficulty breathing, swallowing, or fever, please seek emergency medical care immediately. For your dental care, we strongly recommend an urgent examination today. Would you like to schedule an appointment for ${evalServiceName}?`;

    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      category: DentalClinicalCategory.ABSCESS_ACUTE_INFECTION,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'URGENT_EVALUATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'URGENT',
      suggestedServiceId: evalServiceId,
      suggestedServiceName: evalServiceName,
      suggestedStaffId: evalStaffId,
      suggestedStaffName: evalStaffName,
      cautiousExplanation: cautiousText,
      responsePrompt: promptText,
    };
  }

  // Combination D: Missing tooth + Yellow teeth
  if (hasImplantGoal && hasWhiteningGoal) {
    activeProfile.urgencyLevel = 'ROUTINE';
    activeProfile.recommendedNextStep = 'DENTAL_EXAMINATION';
    const evalServiceId = 'sv000001-0000-0000-0000-000000000001';
    const evalServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
    const evalStaffId = 's0000001-0000-0000-0000-000000000001';
    const evalStaffName = 'Dr. Marcus Thorne';
    const cautiousText =
      'Replacing a missing tooth can involve options like an implant, bridge, or partial denture depending on your oral health, and professional enamel whitening can safely brighten remaining teeth under dental supervision.';
    const promptText = `We can certainly help you address both concerns. ${cautiousText} A comprehensive oral evaluation will allow Dr. Marcus Thorne to assess your bone, bite, and replacement options, as well as discuss aesthetic whitening. Would you like to schedule an appointment for ${evalServiceName}?`;

    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      category: DentalClinicalCategory.IMPLANT_PROSTHODONTICS,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'DENTAL_EXAMINATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'ROUTINE',
      suggestedServiceId: evalServiceId,
      suggestedServiceName: evalServiceName,
      suggestedStaffId: evalStaffId,
      suggestedStaffName: evalStaffName,
      cautiousExplanation: cautiousText,
      responsePrompt: promptText,
    };
  }

  // 6. Match against Global Dental Knowledge Catalogue (Single Top Match)
  const globalMatch = matchGlobalDentalComplaint(input);
  const localRule = triageDentalSymptom(businessId, input);

  if (globalMatch.matched && globalMatch.entry) {
    const entry = globalMatch.entry;
    const capability = checkClinicCapability(businessId, entry.category);

    // Evaluation-first mapping for tooth replacement at Lumina
    if (
      entry.category === DentalClinicalCategory.IMPLANT_PROSTHODONTICS &&
      businessId === LUMINA_DENTAL_BUSINESS_ID
    ) {
      const explicitImplantProcedureDemand =
        /\b(need an? implant|want an? implant|screw tooth|dental implant|implants|need a dental implant|want a dental implant)\b/i.test(
          input
        );
      if (!explicitImplantProcedureDemand) {
        const evalServiceId = 'sv000001-0000-0000-0000-000000000001';
        const evalServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
        const evalStaffId = 's0000001-0000-0000-0000-000000000001';
        const evalStaffName = 'Dr. Marcus Thorne';
        const cautiousText =
          'Replacing a missing tooth can involve options like an implant, bridge, or partial denture depending on your oral health. While Lumina does not perform surgical implant placement in-house, our dentists can perform a comprehensive oral evaluation to assess your bone, bite, and replacement options.';
        const promptText = `Certainly. ${cautiousText} Would you like to schedule an examination with Dr. Marcus Thorne, or are you looking specifically for surgical implant placement?`;
        return {
          matched: true,
          isEmergency: false,
          isAmbiguous: false,
          category: entry.category,
          isSupportedByClinic: true,
          triageProfile: activeProfile,
          patientGoal: activeProfile.patientGoal as PatientGoalType,
          patientGoals: activeProfile.patientGoals,
          recommendedNextStep: 'DENTAL_EXAMINATION',
          rankedCategories: categoryEvidenceList,
          urgencyLevel: 'ROUTINE',
          suggestedServiceId: evalServiceId,
          suggestedServiceName: evalServiceName,
          suggestedStaffId: evalStaffId,
          suggestedStaffName: evalStaffName,
          cautiousExplanation: cautiousText,
          responsePrompt: promptText,
        };
      }
    }

    // Evaluation-first mapping for toothache / pulpal symptoms at Lumina
    if (
      entry.category === DentalClinicalCategory.PULPITIS_ENDODONTICS &&
      businessId === LUMINA_DENTAL_BUSINESS_ID
    ) {
      const explicitRootCanalDemand =
        /\b(root canal|endodontic therapy|endodontist|endodontics|root canal treatment|need a root canal|do you do root canals)\b/i.test(
          input
        );
      if (!explicitRootCanalDemand) {
        const evalServiceId = 'sv000001-0000-0000-0000-000000000001';
        const evalServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
        const evalStaffId = 's0000001-0000-0000-0000-000000000001';
        const evalStaffName = 'Dr. Marcus Thorne';
        const cautiousText =
          'Persistent throbbing or tooth pain can be associated with irritation of the inner tooth pulp or deep decay. A dentist would need to examine the tooth to determine the cause.';
        const promptText = `I'm sorry you're dealing with that discomfort. ${cautiousText} A dental examination and digital X-rays would be the appropriate starting point so Dr. Marcus Thorne can evaluate the tooth. Would you like to schedule an appointment for ${evalServiceName}?`;
        return {
          matched: true,
          isEmergency: false,
          isAmbiguous: false,
          category: entry.category,
          isSupportedByClinic: true,
          triageProfile: activeProfile,
          patientGoal: activeProfile.patientGoal as PatientGoalType,
          patientGoals: activeProfile.patientGoals,
          recommendedNextStep: 'DENTAL_EXAMINATION',
          rankedCategories: categoryEvidenceList,
          urgencyLevel: 'HIGH',
          suggestedServiceId: evalServiceId,
          suggestedServiceName: evalServiceName,
          suggestedStaffId: evalStaffId,
          suggestedStaffName: evalStaffName,
          cautiousExplanation: cautiousText,
          responsePrompt: promptText,
        };
      }
    }

    if (!capability.isSupported) {
      const explanation = generateUnavailableCapabilityResponse(clinicName, entry.category, input);
      return {
        matched: true,
        isEmergency: entry.isEmergency,
        isAmbiguous: false,
        category: entry.category,
        isSupportedByClinic: false,
        unavailableExplanation: explanation,
        responsePrompt: explanation,
        triageProfile: activeProfile,
        patientGoal: activeProfile.patientGoal as PatientGoalType,
        patientGoals: activeProfile.patientGoals,
        recommendedNextStep: 'SPECIALIST_CONSULTATION',
        rankedCategories: categoryEvidenceList,
        urgencyLevel: 'ROUTINE',
      };
    }

    // Service is supported by current clinic!
    const mapping = capability.serviceMapping;
    let serviceId =
      mapping?.serviceId || localRule?.suggestedServiceId || 'sv000001-0000-0000-0000-000000000001';
    let serviceName =
      mapping?.serviceName || localRule?.suggestedServiceName || 'Comprehensive Oral Exam & Digital X-Rays';
    let staffId =
      mapping?.defaultStaffId || localRule?.recommendedSpecialistId || 's0000001-0000-0000-0000-000000000001';
    let staffName =
      mapping?.defaultStaffName || localRule?.recommendedSpecialistName || 'Dr. Marcus Thorne';
    let cautiousText = entry.cautiousExplanation;
    let actionText = entry.suggestedAction;

    // Evaluation-First Mapping for broken/chipped teeth (Lumina Dental Care)
    if (
      entry.category === DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION &&
      businessId === LUMINA_DENTAL_BUSINESS_ID
    ) {
      const patientExplicitlyWantsCrown =
        /\b(crown prep|prepare a crown|make a crown|need a crown|crown fell off|lost my crown)\b/i.test(
          input
        );
      if (!patientExplicitlyWantsCrown) {
        serviceId = 'sv000001-0000-0000-0000-000000000001';
        serviceName = 'Comprehensive Oral Exam & Digital X-Rays';
        staffId = 's0000001-0000-0000-0000-000000000001';
        staffName = 'Dr. Marcus Thorne';
        cautiousText =
          'A broken tooth can sometimes be treated with bonding, a filling, or a crown depending on how much of the tooth is affected. A dentist would need to examine it first.';
        actionText = 'We can help you schedule an evaluation.';
      }
    }

    const opening = getEmpatheticOpening(entry.category, input);
    const promptText = `${opening} ${cautiousText} ${actionText} Would you like to schedule an appointment for ${serviceName}?`;

    const dynamicRule: DentalSymptomTriageRule = {
      symptomKeywords: entry.keywords,
      suggestedServiceId: serviceId,
      suggestedServiceName: serviceName,
      recommendedSpecialistId: staffId,
      recommendedSpecialistName: staffName,
      triageCategory: entry.category,
      clinicalExplanation: cautiousText,
      clinicalSafetyDisclaimer: 'A dentist would need to examine you to determine the exact cause.',
    };

    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      category: entry.category,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'DENTAL_EXAMINATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'ROUTINE',
      triageRule: dynamicRule,
      suggestedServiceId: serviceId,
      suggestedServiceName: serviceName,
      suggestedStaffId: staffId,
      suggestedStaffName: staffName,
      cautiousExplanation: cautiousText,
      responsePrompt: promptText,
    };
  }

  // 7. Fallback to local rule if global catalogue didn't hit
  if (localRule) {
    let serviceId = localRule.suggestedServiceId;
    let serviceName = localRule.suggestedServiceName;
    let staffId = localRule.recommendedSpecialistId;
    let staffName = localRule.recommendedSpecialistName;
    let explanation = localRule.clinicalExplanation;
    let disclaimer = localRule.clinicalSafetyDisclaimer;

    // Evaluation-First safety for broken tooth if localRule mapped to crown
    if (
      businessId === LUMINA_DENTAL_BUSINESS_ID &&
      serviceId === 'sv000004-0000-0000-0000-000000000004' &&
      !/\b(crown prep|prepare a crown|make a crown|need a crown|crown fell off|lost my crown)\b/i.test(input)
    ) {
      serviceId = 'sv000001-0000-0000-0000-000000000001';
      serviceName = 'Comprehensive Oral Exam & Digital X-Rays';
      staffId = 's0000001-0000-0000-0000-000000000001';
      staffName = 'Dr. Marcus Thorne';
      explanation =
        'A broken tooth can sometimes be treated with bonding, a filling, or a crown depending on how much of the tooth is affected.';
      disclaimer =
        'A dental examination and digital X-rays would be the appropriate first step so Dr. Marcus Thorne can evaluate the tooth.';
    }

    const promptText = `I'm sorry to hear that. ${explanation} ${disclaimer} Would you like to schedule an appointment for ${serviceName}?`;
    return {
      matched: true,
      isEmergency: false,
      isAmbiguous: false,
      isSupportedByClinic: true,
      triageProfile: activeProfile,
      patientGoal: activeProfile.patientGoal as PatientGoalType,
      patientGoals: activeProfile.patientGoals,
      recommendedNextStep: 'DENTAL_EXAMINATION',
      rankedCategories: categoryEvidenceList,
      urgencyLevel: 'ROUTINE',
      triageRule: localRule,
      suggestedServiceId: serviceId,
      suggestedServiceName: serviceName,
      suggestedStaffId: staffId,
      suggestedStaffName: staffName,
      cautiousExplanation: explanation,
      responsePrompt: promptText,
    };
  }

  return {
    matched: false,
    isEmergency: false,
    isAmbiguous: false,
    isSupportedByClinic: true,
    triageProfile: activeProfile,
    patientGoal: activeProfile.patientGoal as PatientGoalType,
    patientGoals: activeProfile.patientGoals,
    recommendedNextStep: 'DENTAL_EXAMINATION',
    rankedCategories: categoryEvidenceList,
    urgencyLevel: 'ROUTINE',
  };
}

/**
 * Composite multi-symptom dental triage evaluator.
 * Exposes composite clinical reasoning layer for patient symptoms, goals, and urgency.
 */
export function compositeDentalTriage(
  businessId: string,
  input: string,
  existingProfile?: DentalTriageProfile
): DentalTriageResult {
  return triageDentalInquiry(businessId, input, existingProfile);
}

/**
 * Evaluates patient-reported symptoms against the tenant's triage matrix.
 * Maintained for backwards compatibility.
 */
export function triageDentalSymptom(
  businessId: string,
  input: string
): DentalSymptomTriageRule | null {
  const profile = getClinicKnowledge(businessId);
  if (!profile) return null;

  const clean = input.toLowerCase().replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = clean.split(/\s+/);

  let bestRule: DentalSymptomTriageRule | null = null;
  let maxScore = 0;

  for (const rule of profile.symptomTriageRules) {
    let score = 0;
    for (const kw of rule.symptomKeywords) {
      if (kw.includes(' ')) {
        if (clean.includes(kw)) score += 3;
      } else if (tokens.includes(kw) || clean.includes(kw)) {
        score += 1;
      }
    }

    if (score > maxScore && score >= 1) {
      maxScore = score;
      bestRule = rule;
    }
  }

  if (bestRule) return bestRule;

  // Check global catalogue if local rule didn't hit
  const globalMatch = matchGlobalDentalComplaint(input);
  if (globalMatch.matched && globalMatch.entry) {
    const capability = checkClinicCapability(businessId, globalMatch.entry.category);
    if (capability.isSupported && capability.serviceMapping) {
      return {
        symptomKeywords: globalMatch.entry.keywords,
        suggestedServiceId: capability.serviceMapping.serviceId,
        suggestedServiceName: capability.serviceMapping.serviceName,
        recommendedSpecialistId: capability.serviceMapping.defaultStaffId,
        recommendedSpecialistName: capability.serviceMapping.defaultStaffName,
        triageCategory: globalMatch.entry.category,
        clinicalExplanation: globalMatch.entry.cautiousExplanation,
        clinicalSafetyDisclaimer: 'A dentist would need to examine you to determine the exact cause.',
      };
    }
  }

  return null;
}

/**
 * Checks for high-risk urgent emergency dental symptoms.
 */
export function isEmergencyDental(input: string): boolean {
  if (!input) return false;
  if (isLifeThreateningDentalEmergency(input)) return true;

  const lower = input.toLowerCase();

  const emergencyPhrases = [
    'uncontrolled bleeding',
    'bleeding won\'t stop',
    'bleeding will not stop',
    'severe swelling',
    'eye is swollen',
    'cannot breathe',
    'can\'t breathe',
    'trouble breathing',
    'difficulty breathing',
    'trouble swallowing',
    'knocked out tooth',
    'knocked-out tooth',
    'avulsed tooth',
    'heavy bleeding',
    'emergency dental',
    'dental emergency',
  ];

  return emergencyPhrases.some((phrase) => lower.includes(phrase));
}
