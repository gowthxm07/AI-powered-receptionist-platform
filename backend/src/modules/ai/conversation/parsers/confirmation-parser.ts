export type ConfirmationStatus = 'CONFIRMED' | 'REJECTED' | 'START_OVER' | 'UNCLEAR';

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
      /\b(yes|yeah|yep|yup|sure|confirm|book it|book|go ahead|proceed|correct|ok|okay|please do|sounds good|that works|do it)\b/,
      /^y$/i,
    ];

    for (const pat of confirmPatterns) {
      if (pat.test(clean)) {
        return 'CONFIRMED';
      }
    }

    // 3. Rejections / cancellations
    const rejectPatterns = [
      /\b(no|nope|cancel|never mind|nevermind|stop|don'?t|do not|abort|quit|not now|no thanks|nah)\b/,
      /^n$/i,
    ];

    for (const pat of rejectPatterns) {
      if (pat.test(clean)) {
        return 'REJECTED';
      }
    }

    return 'UNCLEAR';
  }
}
