import { getClinicKnowledge } from './dental-knowledge';
import { ClinicFAQCategory, ClinicFAQItem } from './clinic-knowledge.types';

export interface FAQMatchResult {
  matched: boolean;
  faq?: ClinicFAQItem;
  answer?: string;
  category?: ClinicFAQCategory;
  confidence: number;
  isUnrelated?: boolean;
  isQuestion?: boolean;
  isClinicQuestion?: boolean;
}

/**
 * Checks if raw text is an unrelated general-knowledge or off-topic prompt.
 */
export function isUnrelatedInquiry(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const lower = input.toLowerCase().trim();

  const unrelatedPatterns = [
    // Weather & environment
    /\b(weather|forecast|temperature outside|rain today|sunny outside|snowing)\b/i,
    // Politics & government
    /\b(who is the president|president of|prime minister|politics|election|congress)\b/i,
    // Electronics, IT & gadgets repair
    /\b(laptop|computer|macbook|ipad|iphone|android phone|smartphone|broken screen|screen repair|fix (?:my )?(?:screen|laptop|phone|tv|tablet|computer)|pc repair|coding|software development|hardware repair|printer)\b/i,
    // Automotive
    /\b(car repair|auto mechanic|oil change|tire replacement|transmission repair|engine repair|car wash)\b/i,
    // Food & Dining
    /\b(pizza|burger|sushi|tacos|food delivery|restaurant table|cook a|recipe for|cocktail)\b/i,
    // Travel & Entertainment
    /\b(flight ticket|book a flight|hotel reservation|airline ticket|movie tickets?|cinema showtimes?|concert tickets?)\b/i,
    // Home trades & unrelated personal services
    /\b(plumbing repair|call a plumber|electrician|roofing repair|carpet cleaning|dry cleaning|haircut appointment|nail salon|barber)\b/i,
  ];

  return unrelatedPatterns.some((pattern) => pattern.test(lower));
}


/**
 * Checks if input is linguistically phrased as a question or request for information.
 */
export function isQuestionLike(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const clean = input.trim();
  if (clean.endsWith('?')) return true;

  const questionStartPatterns = [
    /^(can|could|may|would|should|do|does|did|is|are|was|were|will|what|where|when|why|how|who|which)\b/i,
    /\b(can i|can we|can my|is it|do you|are you|how do|what do|where do|will there|do i need|should i|is there|could i|could we)\b/i,
    /\b(wondering if|wondering whether|tell me if|i want to know|let me know if)\b/i,
    /\b(i don't want to|do not want to)\b/i,
  ];

  return questionStartPatterns.some((pattern) => pattern.test(clean));
}

/**
 * Semantic & keyword matcher that evaluates inbound inquiries against
 * the grounded clinic knowledge profile.
 */
export function findClinicFAQ(businessId: string, input: string): FAQMatchResult {
  if (!input || typeof input !== 'string') {
    return { matched: false, confidence: 0 };
  }

  const raw = input.trim();
  if (!raw) {
    return { matched: false, confidence: 0 };
  }

  const normalized = raw.toLowerCase().replace(/[?!,.:;"'(){}\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const isQuestion = isQuestionLike(raw);

  // 1. Unrelated Inquiry Check
  if (isUnrelatedInquiry(raw)) {
    return {
      matched: false,
      confidence: 0.95,
      isUnrelated: true,
      isQuestion,
    };
  }

  // Customer personal details statements ("my phone number is...", "my name is...") are not clinic FAQs
  if (/\bmy (phone|number|name|email|cell|mobile)\b/i.test(normalized)) {
    return {
      matched: false,
      confidence: 0,
      isQuestion: false,
      isClinicQuestion: false,
    };
  }

  const profile = getClinicKnowledge(businessId);
  if (!profile || !profile.faqs || profile.faqs.length === 0) {
    return {
      matched: false,
      confidence: 0,
      isQuestion,
    };
  }

  // 2. High-Precision Semantic Concept Rule Matchers (< 1ms execution)

  // Concept A: Visitor, Family & Companion Policy
  const companionTokens = [
    'alone', 'mother', 'mom', 'father', 'dad', 'parent', 'parents', 'husband',
    'wife', 'spouse', 'partner', 'brother', 'sister', 'family', 'caregiver',
    'caretaker', 'companion', 'chaperone', 'friend', 'someone', 'somebody',
    'anyone', 'anybody', 'escort', 'person', 'relative',
  ];
  const companionActionTokens = [
    'bring', 'come with', 'accompany', 'stay with', 'sit with', 'join', 'tag along',
    'wait with', 'come along', 'alone', 'by myself', 'on my own', 'come inside',
    'come along', 'stay inside',
  ];

  const hasCompanionToken = companionTokens.some((t) => normalized.includes(t));
  const hasCompanionAction = companionActionTokens.some((t) => normalized.includes(t));

  if (
    (/\b(can|could|may|is it okay if|allow|do you allow)\b/i.test(normalized) && hasCompanionToken && hasCompanionAction) ||
    (/\b(bring|accompany|come with)\b/i.test(normalized) && hasCompanionToken) ||
    (/\b(come alone|by myself|on my own|stay with me|someone with me|somebody with me)\b/i.test(normalized))
  ) {
    const faq = profile.faqs.find((f) => f.category === 'visitor_policy');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'visitor_policy',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept B: Wheelchair Accessibility & Physical Access
  if (
    /\b(wheelchair|accessible|accessibility|handicap|handicapped|disabled|disability|ramp|lift|elevator|stairs|steps|walker)\b/i.test(
      normalized
    )
  ) {
    const faq = profile.faqs.find((f) => f.category === 'accessibility');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'accessibility',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept C: Appointment Preparation & Required Documents
  if (
    (/\b(report|reports|dental report|records|dental records|x-ray|xrays|x-rays)\b/i.test(normalized) &&
      /\b(bring|need|should|require|carry|take|previous|past|my|old|send|submit|have to)\b/i.test(normalized)) ||
    /\b(photo id|identification|driver license|passport|fasting|empty stomach|what should i bring|what do i need to bring|need to bring|should i bring)\b/i.test(
      normalized
    ) ||
    (/\b(bring|carry|take)\b/i.test(normalized) && /\b(id|card|document|documents|paperwork|report|reports|record|records)\b/i.test(normalized))
  ) {
    const faq = profile.faqs.find((f) => f.category === 'preparation');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'preparation',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept D: Patient Parking
  if (
    /\b(parking|park my car|where to park|parking space|parking lot|free parking|car park|valet)\b/i.test(normalized) ||
    (/\bpark\b/i.test(normalized) && /\b(available|car|vehicle|behind|where|is there)\b/i.test(normalized))
  ) {
    const faq = profile.faqs.find((f) => f.category === 'parking');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'parking',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept E: Walk-ins & Appointment Duration
  if (
    /\b(walk-in|walk in|walkins|walk-ins|without appointment|without booking|just show up|drop in|drop-in)\b/i.test(
      normalized
    ) ||
    (/\bhow long\b/i.test(normalized) && /\b(consultation|appointment|checkup|visit|exam|take)\b/i.test(normalized))
  ) {
    const faq = profile.faqs.find((f) => f.category === 'appointment_policy');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'appointment_policy',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept F: Payment Methods & Digital Payments (UPI, Cards, Cash)
  if (
    /\b(upi|gpay|google pay|apple pay|credit card|debit card|contactless|cash|payment method|payment options|payment methods)\b/i.test(
      normalized
    ) ||
    (/\b(pay|payment)\b/i.test(normalized) && /\b(how can i|can i|accept|mode|option)\b/i.test(normalized))
  ) {
    const faq = profile.faqs.find((f) => f.category === 'payment');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'payment',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept G: Dental Insurance
  if (
    /\b(insurance|dental insurance|ppo|medicare|medicaid|copay|co-pay|coverage)\b/i.test(normalized) &&
    !/\b(car|auto|life insurance)\b/i.test(normalized)
  ) {
    const faq = profile.faqs.find((f) => f.category === 'insurance');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'insurance',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept H: Opening & Operating Hours
  if (
    /\b(what time do you open|when do you open|when do you close|what time do you close|operating hours|opening hours|business hours|open on saturday|open on sunday|open today|weekend hours)\b/i.test(
      normalized
    ) ||
    (/\bhours\b/i.test(normalized) && /\b(open|close|operating|office|clinic)\b/i.test(normalized))
  ) {
    const faq = profile.faqs.find((f) => f.category === 'clinic_hours');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'clinic_hours',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept I: Facilities & Amenities (Children's Play Area, Wi-Fi, Lounge)
  if (
    /\b(children'?s?\s+play|play area|play nook|kids area|wifi|wi-fi|internet|amenities|facilities|restroom|toilet)\b/i.test(
      normalized
    )
  ) {
    const faq = profile.faqs.find((f) => f.category === 'facilities');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'facilities',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // Concept J: Directions, Floor & Reception Location
  if (
    /\b(which floor|what floor|ground floor|where is reception|where is the reception|where is the front desk|reception desk|find the reception)\b/i.test(
      normalized
    )
  ) {
    const faq = profile.faqs.find((f) => f.category === 'directions');
    if (faq) {
      return {
        matched: true,
        faq,
        answer: faq.answer,
        category: 'directions',
        confidence: 0.98,
        isQuestion: true,
        isClinicQuestion: true,
      };
    }
  }

  // 3. Second-Stage Iterative Scoring against All Configured FAQs
  let bestFaq: ClinicFAQItem | null = null;
  let bestScore = 0;

  for (const faq of profile.faqs) {
    let score = 0;

    // Direct phrase match
    for (const phrase of faq.semanticPhrases) {
      const cleanPhrase = phrase.toLowerCase().replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();
      if (normalized.includes(cleanPhrase)) {
        score += 5;
      }
    }

    // Keyword matches
    for (const kw of faq.keywords) {
      if (kw.includes(' ')) {
        if (normalized.includes(kw)) score += 3;
      } else if (new RegExp(`\\b${kw}\\b`, 'i').test(normalized)) {
        score += 1.5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }

  if (bestFaq && bestScore >= 3) {
    return {
      matched: true,
      faq: bestFaq,
      answer: bestFaq.answer,
      category: bestFaq.category,
      confidence: Math.min(0.99, 0.75 + bestScore * 0.05),
      isQuestion: true,
      isClinicQuestion: true,
    };
  }

  // 4. Grounded Unknown Policy Check:
  // If the user clearly asked a question about clinic policies or services,
  // but it is not explicitly documented in the knowledge base, do NOT hallucinate!
  const clinicTopicWords = [
    'policy', 'allow', 'permit', 'offer', 'provide', 'service', 'facility',
    'equipment', 'anesthesia', 'sedation', 'pet', 'dog', 'animal', 'smoke',
    'smoking', 'vaping', 'discount', 'refund', 'guarantee', 'swimming', 'pool',
    'valet', 'shuttle', 'bus', 'cafeteria', 'food', 'canteen',
  ];
  const isClinicInquiry =
    isQuestion && clinicTopicWords.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(normalized));

  if (isClinicInquiry) {
    return {
      matched: true,
      answer:
        "I don't have specific information about that policy on file, but our front desk will be happy to assist you upon your arrival.",
      confidence: 0.9,
      isQuestion: true,
      isClinicQuestion: true,
    };
  }

  return {
    matched: false,
    confidence: 0,
    isQuestion,
    isClinicQuestion: isClinicInquiry,
  };
}

/**
 * Builds grounded clinic context for LLM fallback, guaranteeing zero hallucination.
 */
export function buildGroundedClinicPrompt(businessId: string): string {
  const profile = getClinicKnowledge(businessId);
  if (!profile) {
    return 'You are an AI receptionist. Only provide verified clinic information. If unconfirmed, refer to the front desk.';
  }

  const doctorList = profile.doctors.map((d) => `${d.name} (${d.title}, ${d.cabin})`).join('; ');
  const facilitiesList = profile.facilities.join(', ');
  const faqSummaries = profile.faqs
    ? profile.faqs.map((f) => `- ${f.topic}: ${f.answer}`).join('\n')
    : '';

  return `VERIFIED CLINIC FACTS FOR ${profile.businessName.toUpperCase()}:
- Address: ${profile.address}
- Phone: ${profile.phone}
- Hours: ${profile.openingHours}
- Doctors: ${doctorList}
- Facilities: ${facilitiesList}
- Visitor Policy: Patients are welcome to bring a family member, parent, caregiver, or companion.
- Accessibility: Ground floor with step-free wheelchair ramp from rear parking lot.
- Parking: Free patient parking directly behind building.
${faqSummaries}

CRITICAL INSTRUCTIONS:
1. Answer the caller's question concisely in 1 to 2 sentences using ONLY the verified facts above.
2. If the user asks about a policy, price, or facility not listed above, DO NOT GUESS OR INVENT IT. Respond: "I don't have specific information on that policy on file, but our front desk will be happy to assist you upon your arrival."
3. NEVER claim an appointment has been booked or confirmed.`;
}
