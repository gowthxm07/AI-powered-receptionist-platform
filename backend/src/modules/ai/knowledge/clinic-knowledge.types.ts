export interface DoctorCabinInfo {
  staffId: string;
  name: string;
  title: string;
  cabin: string;
  wing: string;
  floor: string;
  workingDays: string;
  workingHours: string;
  handledServices: string[];
  directions: string;
}

export interface ClinicNavigationInfo {
  entrance: string;
  receptionDesk: string;
  waitingLounge: string;
  amenities: string[];
  wingDirections: Record<string, string>;
}

export interface PatientGuidanceInfo {
  checkInProcedure: string;
  earlyArrivalPolicy: string;
  lateArrivalPolicy: string;
  firstTimePatientInstructions: string;
  parkingInfo: string;
}

export interface EmergencyPolicyInfo {
  emergencySigns: string[];
  immediateInstruction: string;
  emergencyPhone: string;
  erInstruction: string;
}

export interface DentalSymptomTriageRule {
  symptomKeywords: string[];
  suggestedServiceId: string;
  suggestedServiceName: string;
  recommendedSpecialistId?: string;
  recommendedSpecialistName?: string;
  triageCategory: string;
  clinicalExplanation: string;
  clinicalSafetyDisclaimer: string;
}

export type ClinicFAQCategory =
  | 'visitor_policy'
  | 'accessibility'
  | 'arrival_and_waiting'
  | 'appointment_policy'
  | 'preparation'
  | 'payment'
  | 'insurance'
  | 'parking'
  | 'clinic_hours'
  | 'facilities'
  | 'directions'
  | 'doctors'
  | 'general_business_information';

export interface ClinicFAQItem {
  id: string;
  category: ClinicFAQCategory;
  topic: string;
  keywords: string[];
  semanticPhrases: string[];
  answer: string;
}

export interface ClinicKnowledgeProfile {
  businessId: string;
  businessName: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  facilities: string[];
  navigation: ClinicNavigationInfo;
  patientGuidance: PatientGuidanceInfo;
  emergencyPolicy: EmergencyPolicyInfo;
  doctors: DoctorCabinInfo[];
  symptomTriageRules: DentalSymptomTriageRule[];
  faqs?: ClinicFAQItem[];
}
