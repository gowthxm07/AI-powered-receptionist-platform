export enum BookingConversationStep {
  IDLE = 'IDLE',
  BOOKING_COLLECT_SERVICE = 'BOOKING_COLLECT_SERVICE',
  BOOKING_COLLECT_STAFF = 'BOOKING_COLLECT_STAFF',
  BOOKING_COLLECT_DATE = 'BOOKING_COLLECT_DATE',
  BOOKING_SELECT_SLOT = 'BOOKING_SELECT_SLOT',
  BOOKING_COLLECT_CUSTOMER = 'BOOKING_COLLECT_CUSTOMER',
  BOOKING_CONFIRM = 'BOOKING_CONFIRM',
  BOOKING_COMPLETE = 'BOOKING_COMPLETE',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
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
  
  // Selected appointment attributes
  selectedServiceId?: string;
  selectedServiceName?: string;
  serviceDurationMinutes?: number;
  
  selectedStaffId?: string | null; // null represents "any / no preference"
  selectedStaffName?: string | null;
  
  selectedDate?: string; // YYYY-MM-DD
  selectedStartTime?: string; // ISO 8601 string
  selectedEndTime?: string;   // ISO 8601 string
  
  availableSlots?: AvailableSlot[];
  
  // Customer identity
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  
  // Metadata & TTL
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}
