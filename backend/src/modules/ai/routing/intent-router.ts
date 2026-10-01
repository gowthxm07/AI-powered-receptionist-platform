import { AIIntent } from '../types/intent.types';
import { findClinicFAQ, isUnrelatedInquiry } from '../knowledge/faq-matcher';
import { LUMINA_DENTAL_BUSINESS_ID } from '../knowledge/clinic-capabilities';
import {
  isLifeThreateningDentalEmergency,
  matchGlobalDentalComplaint,
} from '../knowledge/global-dental-catalogue';

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
  public static routeIntent(rawInput: string, businessId?: string): IntentMatchResult {
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

    // 3. Emergency Dental Triaging (Highest Priority Safety)
    if (
      isLifeThreateningDentalEmergency(text) ||
      /\b(uncontrolled bleeding|heavy bleeding|bleeding heavily|face is swollen|face is badly swollen|badly swollen|facial swelling|severe swelling|cannot breathe|can't breathe|trouble breathing|difficulty breathing|knocked out(?:\s+a)?\s+tooth|knocked-out(?:\s+a)?\s+tooth|avulsed tooth|dental emergency|emergency dental|fever\s+and(?:\s+severe)?\s+swelling|severe\s+swelling\s+and(?:\s+a)?\s+fever)\b/i.test(
        normalized
      )
    ) {
      return {
        intent: AIIntent.EMERGENCY_DENTAL,
        confidence: 0.99,
        extractedParams: { query: text },
      };
    }

    // 3b. Unrelated Inquiries (Early filter to avoid false service/booking matches)
    if (isUnrelatedInquiry(text)) {
      return {
        intent: AIIntent.UNRELATED_INQUIRY,
        confidence: 0.98,
        extractedParams: { query: text },
      };
    }

    // 4. Clinic Navigation & Directions from Entrance / General Building Wayfinding
    if (
      /\b(from the entrance|from entrance|from outside|enter the building|where is reception|where is the reception|where is the front desk|reception desk|main lobby|entrance directions)\b/i.test(
        normalized
      )
    ) {
      return {
        intent: AIIntent.CLINIC_DIRECTIONS,
        confidence: 0.95,
        extractedParams: { query: text },
      };
    }

    // 5. Doctor Room / Cabin Location (Specific doctor/cabin wayfinding before general clinic directions)
    if (
      /\b(hygiene bay|which room|where is room|which cabin|where is cabin|doctor's room|doctor's cabin|where can i meet|where can i find|where to find dr|where is dr|cabin number|reach the doctor|reach doctor)\b/i.test(
        normalized
      ) ||
      (/\b(where|reach|find|get to)\b/i.test(normalized) && /\b(cabin|doctor'?s room|dr |doctor |thorne|chen|jenkins|hygiene)\b/i.test(normalized))
    ) {
      return {
        intent: AIIntent.CABIN_ROOM_LOCATION,
        confidence: 0.96,
        extractedParams: { query: text },
      };
    }

    // 6. Clinic Navigation & Directions (General building wayfinding)
    if (
      /\b(how do i reach|how to reach|how to get to|directions to|way to|how to find the)\b/i.test(
        normalized
      )
    ) {
      return {
        intent: AIIntent.CLINIC_DIRECTIONS,
        confidence: 0.95,
        extractedParams: { query: text },
      };
    }

    // 6. Appointment Preparation / Instructions / What to Bring (Prioritize specific prep queries)
    if (
      /\b(prepare|preparation|how should i prepare|what should i bring|what to bring|need to bring|do i need to bring|photo id|insurance card|should i arrive early|before my visit|before the appointment|dress code|fasting|empty stomach|first-time patient|first time patient)\b/i.test(
        normalized
      )
    ) {
      return {
        intent: AIIntent.APPOINTMENT_PREPARATION,
        confidence: 0.94,
        extractedParams: { query: text },
      };
    }

    // 7. Waiting Area & Patient Arrival Policy
    if (
      /\b(where should i wait|where do i wait|where to wait|waiting area|waiting lounge|waiting room|arrive\s+(?:\d+\s+)?minutes?\s+early|arriving\s+(?:\d+\s+)?minutes?\s+early|if i arrive early|arriving early|arrive early|running late|late arrival|when i arrive|check in|checking in|check-in procedure|self-check-in|after entering the clinic)\b/i.test(
        normalized
      )
    ) {
      return {
        intent: AIIntent.WAITING_AREA_POLICY,
        confidence: 0.95,
        extractedParams: { query: text },
      };
    }

    // 8. Dental Symptoms & Visit Reason Understanding
    if (
      matchGlobalDentalComplaint(text).matched ||
      /\b(tooth pain|tooth ache|toothache|teeth hurt|tooth hurts|pain in my tooth|hurts when i chew|hurts to chew|pain while biting|pain when biting|sensitive to cold|sensitive to hot|cold sensitivity|hot sensitivity|bleeding gums|swollen gum|gums bleeding|chipped tooth|broken tooth|cracked tooth|lost filling|lost crown|cavity|decay|teeth whitening|yellow teeth|whiten my teeth|teeth cleaning|tooth cleaning|dental cleaning|clean my teeth|routine cleaning|plaque removal|tartar removal|tartar|plaque|prophylaxis|periodontal|baby tooth|baby teeth|pediatric dental|child checkup|back tooth is troubling me|tooth is troubling me|troubling me|uncomfortable in my mouth|discomfort in my mouth|routine dental checkup|routine checkup|dental checkup|screw tooth|dental implant|implants|false teeth|denture|dentures|braces|aligners|invisalign|jaw clicks|night guard|bleeding when i brush|hole in my tooth|filling fell out)\b/i.test(
        normalized
      ) ||
      (/\b(pain|hurts|hurting|ache|aching|sensitive|sensitivity|swollen|chipped|broken|bleeding|cleaning|clean|whiten|whitening|checkup|discomfort|uncomfortable|troubling)\b/i.test(normalized) &&
        /\b(tooth|teeth|gum|gums|mouth|jaw|chew|chewing|biting|child|kid|baby)\b/i.test(normalized))
    ) {
      return {
        intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
        confidence: 0.95,
        extractedParams: { query: text },
      };
    }

    // 8. Greetings (Fast Exact / Regex Match)
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy)(\s+(there|receptionist|bot|lumina|apex|zenith))?$/i.test(normalized) ||
        /^(hi|hello|hey)$/i.test(normalized)) {
      return {
        intent: AIIntent.GREETING,
        confidence: 0.99,
      };
    }

    // 9. Goodbyes
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
      (/\b(appointment|appointments)\b/i.test(normalized) && /\b(want|need|like|make|get|set|new)\b/i.test(normalized)) ||
      (/\b(want|need|like|request)\b/i.test(normalized) && /\b(exam|cleaning|whitening|crown|checkup|prophylaxis|oral exam|digital x-rays|consultation)\b/i.test(normalized))
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
    if (/\b(staff|specialist|specialists|doctor|doctors|physician|practitioner|practitioners|hygienist|dentist|dentists|orthodontist|periodontist|endodontist|surgeon|who works|team members|employees)\b/i.test(normalized)) {
      return {
        intent: AIIntent.STAFF_INFORMATION,
        confidence: 0.93,
      };
    }

    // 12. Services Information
    if (
      (/\b(service|services|treatment|treatments|menu|offerings|price|prices|pricing|cost|rates|packages|what do you do|what do you provide)\b/i.test(normalized) ||
        /\b(what do you offer|what services)\b/i.test(normalized)) &&
      !/\b(parking|park|valet|wheelchair|mother|family|husband|wife|caregiver)\b/i.test(normalized)
    ) {
      return {
        intent: AIIntent.SERVICE_INFORMATION,
        confidence: 0.94,
      };
    }

    // 13. Business Information (Location, Phone, Address)
    if (
      (/\b(location|address|where are you|where is|website)\b/i.test(normalized) ||
        /\b(your|clinic|office|reception)\s+(phone|contact|number)\b/i.test(normalized) ||
        /\bwhat is your (phone|number|contact)\b/i.test(normalized)) &&
      !/\bmy\s+(phone|number|name|contact)\b/i.test(normalized) &&
      !/\b(cabin|room|dr |doctor|thorne|chen|jenkins|reception|waiting|park|parking|wheelchair)\b/i.test(normalized)
    ) {
      return {
        intent: AIIntent.BUSINESS_INFORMATION,
        confidence: 0.92,
      };
    }

    // 14. Second-Stage Semantic Clinic FAQ & Knowledge Matcher
    const effectiveBiz = businessId || LUMINA_DENTAL_BUSINESS_ID;

    if (isUnrelatedInquiry(text)) {
      return {
        intent: AIIntent.UNRELATED_INQUIRY,
        confidence: 0.95,
        extractedParams: { query: text },
      };
    }

    const faqRes = findClinicFAQ(effectiveBiz, text);
    if (faqRes.matched) {
      return {
        intent: AIIntent.CLINIC_FAQ,
        confidence: faqRes.confidence,
        extractedParams: { query: text },
      };
    }

    // 15. Fallback to Unknown / General Question
    return {
      intent: AIIntent.UNKNOWN,
      confidence: 0.1,
      extractedParams: { query: text },
    };
  }
}
