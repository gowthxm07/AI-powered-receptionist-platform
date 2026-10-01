export enum BookingConversationStep {
  IDLE = 'IDLE',
  TRIAGE_CLARIFICATION = 'TRIAGE_CLARIFICATION',
  BOOKING_SYMPTOM_TRIAGE = 'BOOKING_SYMPTOM_TRIAGE',
  BOOKING_COLLECT_SERVICE = 'BOOKING_COLLECT_SERVICE',
  BOOKING_COLLECT_STAFF = 'BOOKING_COLLECT_STAFF',
  BOOKING_COLLECT_DATE = 'BOOKING_COLLECT_DATE',
  BOOKING_SELECT_SLOT = 'BOOKING_SELECT_SLOT',
  BOOKING_COLLECT_CUSTOMER = 'BOOKING_COLLECT_CUSTOMER',
  BOOKING_COLLECT_CUSTOMER_NAME = 'BOOKING_COLLECT_CUSTOMER_NAME',
  BOOKING_CONFIRM_CUSTOMER_NAME = 'BOOKING_CONFIRM_CUSTOMER_NAME',
  BOOKING_COLLECT_CUSTOMER_PHONE = 'BOOKING_COLLECT_CUSTOMER_PHONE',
  BOOKING_CONFIRM_CUSTOMER_PHONE = 'BOOKING_CONFIRM_CUSTOMER_PHONE',
  BOOKING_CONFIRM = 'BOOKING_CONFIRM',
  BOOKING_COMPLETE = 'BOOKING_COMPLETE',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
}

export type AnatomicalScope = 'single tooth' | 'multiple teeth' | 'generalized' | 'jaw' | 'gums' | 'unspecified';
export type UrgencySeverity = 'mild' | 'moderate' | 'severe';
export type PainPattern = 'constant' | 'throbbing' | 'sharp' | 'dull' | 'intermittent' | 'on biting' | 'temperature' | 'unspecified';

export interface DentalTriageProfile {
  originalPatientStatement: string;
  reportedSymptoms: string[];
  symptomCategories: string[];
  anatomicalLocation?: string;
  anatomicalScope?: AnatomicalScope;
  onset?: string;
  duration?: string;
  severity?: UrgencySeverity;
  painPattern?: PainPattern;
  triggers: string[];
  swellingPresent?: boolean;
  bleedingPresent?: boolean;
  traumaPresent?: boolean;
  feverReported?: boolean;
  breathingDifficulty?: boolean;
  swallowingDifficulty?: boolean;
  eyeInvolvement?: boolean;
  patientGoal?: string;
  urgencyLevel: string; // 'ROUTINE' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  activeFollowUpQuestion?: string;
  followUpHistory: Array<{
    question: string;
    answer: string;
    timestamp: string;
  }>;
  confidence?: number;
  isAmbiguous?: boolean;
  recommendedNextStep?: string;
}

export interface AvailableSlot {
  timeLabel: string; // e.g. "10:00 AM", "02:00 PM"
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  staffId?: string;  // Assigned staff specialist ID if specific or available
  staffName?: string;
}

export interface ConversationSessionData {
  sessionId: string;
  businessId: string;
  step: BookingConversationStep;
  
  // Structured patient triage profile
  triageProfile?: DentalTriageProfile;

  // Selected appointment attributes
  selectedServiceId?: string;
  selectedServiceName?: string;
  serviceDurationMinutes?: number;
  
  reportedSymptom?: string;
  suggestedServiceId?: string;
  suggestedServiceName?: string;
  
  selectedStaffId?: string | null; // null represents "any / no preference"
  selectedStaffName?: string | null;
  
  selectedDate?: string; // YYYY-MM-DD
  selectedStartTime?: string; // ISO 8601 string
  selectedEndTime?: string;   // ISO 8601 string
  selectedSlot?: AvailableSlot;
  selectedTimeLabel?: string;
  pendingCorrectionField?: 'name' | 'phone' | 'date' | 'time' | 'service' | 'staff';
  
  availableSlots?: AvailableSlot[];
  
  // Customer identity
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  confirmedAppointmentId?: string;
  
  // Metadata & TTL
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}
