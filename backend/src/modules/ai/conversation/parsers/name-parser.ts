export interface NameParseResult {
  name: string | null;
  phone?: string | null;
  isValid: boolean;
}

export class NameParser {
  /**
   * Deterministically parses a caller's full name from natural conversational turns.
   * Strips conversational carrier phrases ("my name is", "this is", "i am", etc.)
   * and normalizes capitalization.
   */
  public static parseName(input: string): NameParseResult {
    if (!input || typeof input !== 'string') {
      return { name: null, isValid: false };
    }

    const raw = input.trim();
    if (raw.length === 0) {
      return { name: null, isValid: false };
    }

    // Check for inline phone number extraction in the same utterance
    // Handles formats: 9876543210, (555) 123-4567, +1-555-123-4567, 555.123.4567
    const phoneMatch = raw.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
    const extractedPhone = phoneMatch ? phoneMatch[0].trim() : null;

    // Remove phone portion from input before name parsing
    let nameTarget = raw;
    if (extractedPhone) {
      nameTarget = nameTarget.replace(extractedPhone, ' ');
    }

    // Clean punctuation and noise
    let clean = nameTarget
      .replace(/[?!,.:;"'(){}\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Strip common conversational carrier phrases
    const carrierPrefixes = [
      /^(?:hello|hi|hey)(?:\s+there)?\s+/i,
      /^(?:good\s+morning|good\s+afternoon|good\s+evening)\s+/i,
      /^(?:no|nope|nah|actually|sorry|no\s+sorry|sorry\s+no)\s+/i,
      /^(?:my\s+name\s+is|my\s+name's|the\s+name\s+is|name\s+is)\s+/i,
      /^(?:i\s+am|i'm|im)\s+/i,
      /^(?:this\s+is|it\s+is|it's)\s+/i,
      /^(?:you\s+can\s+call\s+me|call\s+me|please\s+call\s+me)\s+/i,
      /^(?:sure\s+(?:it's|it\s+is)?|yes\s+(?:it's|it\s+is)?|yeah\s+(?:it's|it\s+is)?|yep\s+(?:it's|it\s+is)?)\s+/i,
      /^(?:well|so|ok|okay|there)\s+/i,
    ];

    let modified = true;
    while (modified) {
      modified = false;
      for (const prefix of carrierPrefixes) {
        if (prefix.test(clean)) {
          clean = clean.replace(prefix, '').trim();
          modified = true;
        }
      }
    }

    // Strip conversational trailers and phone connector phrases
    const carrierTrailers = [
      /\s+(?:please|thanks|thank\s+you|here)$/i,
      /\s+(?:and\s+)?(?:my\s+)?(?:phone|mobile|cell|number|contact)(?:\s+(?:number|is|#))?$/i,
      /\s+(?:call\s+me\s+at|reach\s+me\s+at)$/i,
    ];

    let trailerModified = true;
    while (trailerModified) {
      trailerModified = false;
      for (const trailer of carrierTrailers) {
        if (trailer.test(clean)) {
          clean = clean.replace(trailer, '').trim();
          trailerModified = true;
        }
      }
    }

    // Reject common negative / cancellation / non-name phrases
    const lower = clean.toLowerCase();
    const invalidPhrases = [
      'no', 'nope', 'nah', 'cancel', 'stop', 'quit', 'start over', 'restart', 'never mind',
      'nevermind', 'guest', 'guest customer', 'anonymous', 'unknown', 'none', 'nothing',
      'appointment', 'service', 'booking', 'doctor', 'specialist', 'not now', 'later',
      'wrong', 'incorrect', 'thats wrong', 'that s wrong', 'that is wrong', 'not correct',
      'not right', 'not my name', 'you got it wrong', 'got it wrong', 'misheard',
    ];

    if (
      invalidPhrases.some(
        (phrase) => lower === phrase || lower.startsWith(`${phrase} `) || lower.endsWith(` ${phrase}`) || lower.includes(` ${phrase} `)
      )
    ) {
      return { name: null, phone: extractedPhone, isValid: false };
    }

    // Must contain letters and be between 2 and 50 characters
    if (!/[a-zA-Z]/.test(clean) || clean.length < 2 || clean.length > 50) {
      return { name: null, phone: extractedPhone, isValid: false };
    }

    // Capitalize each word properly (e.g. "rahul sharma" -> "Rahul Sharma")
    const formattedName = clean
      .split(/\s+/)
      .map((word) => {
        if (/^(dr|mr|mrs|ms)\.?$/i.test(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() + (word.endsWith('.') ? '' : '.');
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    return {
      name: formattedName,
      phone: extractedPhone,
      isValid: true,
    };
  }

  /**
   * Sanitizes and extracts a pure digits phone number (e.g., "9876543210")
   */
  public static extractPhone(input: string): string | null {
    if (!input || typeof input !== 'string') return null;

    // Convert spoken number words if present (e.g. "five five five one two three four five six seven")
    const wordMap: Record<string, string> = {
      zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4',
      five: '5', six: '6', seven: '7', eight: '8', nine: '9',
    };
    let normalized = input.toLowerCase();
    for (const [word, digit] of Object.entries(wordMap)) {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    }

    const phoneMatch = normalized.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
    if (phoneMatch) {
      const digitsOnly = phoneMatch[0].replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 10) {
        return digitsOnly.slice(-10); // Standardize 10-digit number
      }
      return phoneMatch[0].trim();
    }

    // Fallback: search for any sequence of 10 digits
    const pureDigits = normalized.replace(/[^0-9]/g, '');
    if (pureDigits.length >= 10) {
      return pureDigits.slice(-10);
    }

    return null;
  }
}
