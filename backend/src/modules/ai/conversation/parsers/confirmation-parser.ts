export type ConfirmationStatus = 'CONFIRMED' | 'REJECTED' | 'START_OVER' | 'UNCLEAR';

export type CorrectionField = 'date' | 'time' | 'service' | 'staff' | 'name' | 'phone' | 'general';

export interface CorrectionIntentResult {
  isCorrection: boolean;
  field?: CorrectionField;
  extractedValue?: string;
}

export class ConfirmationParser {
  /**
   * Deterministically parses confirmation or cancellation intent.
   */
  public static parseConfirmation(input: string): ConfirmationStatus {
    if (!input || typeof input !== 'string') {
      return 'UNCLEAR';
    }

    const raw = input.trim().toLowerCase();
    const clean = raw.replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. "Start over"
    if (/\b(start over|restart|reset|from the beginning|change everything)\b/.test(clean)) {
      return 'START_OVER';
    }

    // 2. Positive affirmations
    const confirmPatterns = [
      /\b(yes|yeah|yep|yup|sure|confirm|book it|book|go ahead|proceed|correct|ok|okay|please do|sounds good|that works|do it|that'?s right|that is right|it is|that'?s correct|exactly|perfect|y)\b/,
      /^y$/i,
      /^yes please$/i,
      /^sounds great$/i,
    ];

    for (const pat of confirmPatterns) {
      if (pat.test(clean)) {
        return 'CONFIRMED';
      }
    }

    // 3. Rejections / cancellations / corrections
    const rejectPatterns = [
      /\b(no|nope|cancel|never mind|nevermind|stop|don'?t|do not|abort|quit|not now|no thanks|nah|wrong|you got it wrong|got it wrong|misheard|not right|that'?s not right|incorrect|not my number|not my name|let me repeat|repeat it|try again)\b/,
      /^n$/i,
    ];

    for (const pat of rejectPatterns) {
      if (pat.test(clean)) {
        return 'REJECTED';
      }
    }

    return 'UNCLEAR';
  }

  /**
   * Detects if an utterance expresses intent to correct a previously provided piece of information.
   */
  public static parseCorrectionIntent(input: string): CorrectionIntentResult {
    if (!input || typeof input !== 'string') {
      return { isCorrection: false };
    }

    const clean = input.trim().toLowerCase();

    // Specific field corrections
    // 1. Phone correction
    if (/\b(change (my |the )?phone|wrong (phone|number)|different (phone|number)|not my (phone|number)|correct (my |the )?phone|repeat (my |the )?phone)\b/.test(clean)) {
      return { isCorrection: true, field: 'phone' };
    }

    // 2. Name correction
    if (/\b(change (my |the )?name|wrong name|different name|not my name|correct (my |the )?name|my name is actually|actually my name is)\b/.test(clean)) {
      return { isCorrection: true, field: 'name' };
    }

    // 3. Time correction
    if (/\b(change (the )?time|different time|wrong time|another time|different slot|change slot|actually at \d|how about \d|what about \d)\b/.test(clean)) {
      return { isCorrection: true, field: 'time' };
    }

    // 4. Date correction
    if (/\b(change (the )?date|different (date|day)|wrong date|another (date|day)|pick another (date|day)|switch date|actually tomorrow|actually on)\b/.test(clean)) {
      return { isCorrection: true, field: 'date' };
    }

    // 5. Service correction
    if (/\b(change (the )?service|different service|wrong service|another service|switch service)\b/.test(clean)) {
      return { isCorrection: true, field: 'service' };
    }

    // 6. Specialist / Staff correction
    if (/\b(change (the )?(doctor|specialist|staff|dentist|person)|different (doctor|specialist|staff|dentist|person)|someone else|another doctor|another specialist)\b/.test(clean)) {
      return { isCorrection: true, field: 'staff' };
    }

    // General correction triggers: "wait, actually...", "can I change...", "let me change"
    if (/\b(wait|actually|hold on|change that|go back)\b/.test(clean)) {
      if (/\b(phone|number)\b/.test(clean)) return { isCorrection: true, field: 'phone' };
      if (/\b(name)\b/.test(clean)) return { isCorrection: true, field: 'name' };
      if (/\b(time|slot|hour|morning|afternoon)\b/.test(clean)) return { isCorrection: true, field: 'time' };
      if (/\b(date|day|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(clean)) return { isCorrection: true, field: 'date' };
      if (/\b(service|cleaning|exam|checkup|consultation|root canal|crown)\b/.test(clean)) return { isCorrection: true, field: 'service' };
      if (/\b(doctor|specialist|staff|dr|anyone)\b/.test(clean)) return { isCorrection: true, field: 'staff' };
      return { isCorrection: true, field: 'general' };
    }

    return { isCorrection: false };
  }
}

