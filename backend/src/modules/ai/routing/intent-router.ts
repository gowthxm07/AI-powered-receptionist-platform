import { AIIntent } from '../types/intent.types';

export interface IntentMatchResult {
  intent: AIIntent;
  confidence: number;
  extractedParams?: {
    query?: string;
    phone?: string;
    dateText?: string;
    serviceKeyword?: string;
    staffKeyword?: string;
  };
}

export class FastIntentRouter {
  /**
   * Evaluates inbound natural-language text using fast, deterministic,
   * regex and keyword heuristics (< 1ms execution, 0 LLM calls).
   */
  public static routeIntent(rawInput: string): IntentMatchResult {
    if (!rawInput || typeof rawInput !== 'string') {
      return { intent: AIIntent.UNKNOWN, confidence: 0 };
    }

    const text = rawInput.trim();
    if (!text) {
      return { intent: AIIntent.UNKNOWN, confidence: 0 };
    }

    const normalized = text.toLowerCase().replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Phone number extraction (e.g. (555) 123-4567 or +15551234567 or 555-123-4567)
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const extractedPhone = phoneMatch ? phoneMatch[0].trim() : undefined;

    // 2. Date heuristics (today, tomorrow, monday..sunday)
    let dateText: string | undefined;
    if (/\btomorrow\b/i.test(normalized)) {
      dateText = 'tomorrow';
    } else if (/\btoday\b/i.test(normalized)) {
      dateText = 'today';
    }

    // 3. Greetings (Fast Exact / Regex Match)
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy)(\s+(there|receptionist|bot|lumina|apex|zenith))?$/i.test(normalized) ||
        /^(hi|hello|hey)$/i.test(normalized)) {
      return {
        intent: AIIntent.GREETING,
        confidence: 0.99,
      };
    }

    // 4. Goodbyes
    if (/\b(bye|goodbye|see you|have a nice day|have a good day|farewell|thanks bye|thank you bye)\b/i.test(normalized)) {
      return {
        intent: AIIntent.GOODBYE,
        confidence: 0.98,
      };
    }

    // 5. Customer Identification / Lookup
    if (extractedPhone || /\bmy (phone|number|name|account|profile) is\b/i.test(normalized)) {
      return {
        intent: AIIntent.CUSTOMER_LOOKUP,
        confidence: 0.95,
        extractedParams: {
          phone: extractedPhone,
          query: text,
        },
      };
    }

    // 6. Appointment Rescheduling
    if (/\b(reschedule|change appointment|move appointment|postpone|modify appointment)\b/i.test(normalized)) {
      return {
        intent: AIIntent.RESCHEDULE_APPOINTMENT,
        confidence: 0.92,
        extractedParams: { dateText },
      };
    }

    // 7. Appointment Cancellation
    if (/\b(cancel|cancellation|canceling|remove appointment|delete appointment)\b/i.test(normalized)) {
      return {
        intent: AIIntent.CANCEL_APPOINTMENT,
        confidence: 0.95,
      };
    }

    // 8. Appointment Preparation / Instructions / What to Bring
    if (/\b(prepare|preparation|what should i bring|what to bring|need to bring|photo id|insurance card|arrive early|before my visit|before the appointment|dress code|fasting|empty stomach)\b/i.test(normalized)) {
      return {
        intent: AIIntent.APPOINTMENT_PREPARATION,
        confidence: 0.94,
      };
    }

    // 9. Payment & Insurance Inquiries
    if (/\b(insurance|payment|pay|credit card|cash|coverage|accept medicare|accept medicaid|payment options|payment methods)\b/i.test(normalized)) {
      return {
        intent: AIIntent.PAYMENT_POLICY,
        confidence: 0.93,
      };
    }

    // 10. View / Check Existing Appointments
    if (/\b(my appointment|my appointments|check my appointment|when is my appointment|existing appointment)\b/i.test(normalized)) {
      return {
        intent: AIIntent.VIEW_APPOINTMENTS,
        confidence: 0.92,
      };
    }

    // 9. Booking Intent
    if (
      /\b(book|schedule|make an appointment|new appointment|reserve|booking|set up an appointment|bulk an appointment|get an appointment|want an appointment|need an appointment)\b/i.test(normalized) ||
      (/\b(appointment|appointments)\b/i.test(normalized) && /\b(want|need|like|make|get|set|new)\b/i.test(normalized))
    ) {
      return {
        intent: AIIntent.BOOK_APPOINTMENT,
        confidence: 0.94,
        extractedParams: { dateText },
      };
    }

    // 10. Availability Intent
    if (/\b(available|availability|free slot|open slot|openings|any opening|free tomorrow|available tomorrow|available today)\b/i.test(normalized)) {
      return {
        intent: AIIntent.APPOINTMENT_AVAILABILITY,
        confidence: 0.91,
        extractedParams: { dateText },
      };
    }

    // 11. Staff / Practitioners Information
    if (/\b(staff|specialist|specialists|doctor|doctors|physician|practitioner|practitioners|stylist|stylists|therapist|therapists|who works|team members|employees)\b/i.test(normalized)) {
      return {
        intent: AIIntent.STAFF_INFORMATION,
        confidence: 0.93,
      };
    }

    // 12. Services Information
    if (/\b(service|services|treatment|treatments|menu|offer|offerings|price|prices|pricing|cost|rates|packages|what do you do|what do you provide)\b/i.test(normalized)) {
      return {
        intent: AIIntent.SERVICE_INFORMATION,
        confidence: 0.94,
      };
    }

    // 13. Business Information (Location, Hours, Phone, Address)
    if (/\b(location|address|where are you|where is|operating hours|opening hours|closing hours|business hours|open hours|phone number|contact number|directions|website|are you open|open today|when do you open|when do you close|what time do you close|parking|where to park)\b/i.test(normalized)) {
      return {
        intent: AIIntent.BUSINESS_INFORMATION,
        confidence: 0.92,
      };
    }

    // 14. Fallback to Unknown / General Question
    return {
      intent: AIIntent.UNKNOWN,
      confidence: 0.1,
      extractedParams: { query: text },
    };
  }
}
