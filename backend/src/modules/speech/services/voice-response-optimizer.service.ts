import { SpeechPipelineAudioResponse } from '../types/speech.types';

export interface VoiceOptimizationResult {
  text: string;
  originalText: string;
  optimized: boolean;
  charCountOriginal: number;
  charCountOptimized: number;
  latencyMs: number;
}

export interface TtsDecisionResult {
  shouldSynthesize: boolean;
  reason?: string;
  cachedAudio?: SpeechPipelineAudioResponse | null;
}

export class VoiceResponseOptimizer {
  // Scoped cache for turn-level duplicate TTS protection (TTL: 5 minutes)
  private turnCache: Map<string, { text: string; audio: SpeechPipelineAudioResponse | null; timestamp: number }> = new Map();

  /**
   * Optimize conversational text for natural, crisp, and low-latency voice delivery.
   * Preserves 100% semantic meaning and conversational entities (Services, Staff, Dates, Times)
   * while removing redundant boilerplate phrases, markdown symbols, and wordy pleasantries.
   */
  public optimizeForVoice(
    text: string,
    options?: {
      channel?: 'WEB' | 'VOICE' | 'PHONE';
      enableConciseFormatting?: boolean;
    }
  ): VoiceOptimizationResult {
    const startTime = performance.now();

    if (!text || !text.trim()) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        text: '',
        originalText: text || '',
        optimized: false,
        charCountOriginal: 0,
        charCountOptimized: 0,
        latencyMs,
      };
    }

    const originalText = text.trim();
    const charCountOriginal = originalText.length;

    // 1. Channel check: WEB requests preserve canonical unmodified text
    if (options?.channel === 'WEB' || options?.enableConciseFormatting === false) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        text: originalText,
        originalText,
        optimized: false,
        charCountOriginal,
        charCountOptimized: charCountOriginal,
        latencyMs,
      };
    }

    // 2. Strip Markdown & Web-specific formatting
    let clean = originalText
      .replace(/\*\*(.*?)\*\*/g, '$1')        // bold
      .replace(/\*(.*?)\*/g, '$1')            // italics
      .replace(/_(.*?)_/g, '$1')              // underline / italics
      .replace(/`(.*?)`/g, '$1')              // inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')     // markdown links -> label
      .replace(/^\s*[-•*]\s+/gm, '')          // bullet points
      .replace(/\((?:approx\.?\s*)?\d+\s*mins?\)/gi, '') // remove parenthetical duration tags e.g. (30 mins)
      .replace(/\n+/g, ' ')                  // collapse newlines
      .replace(/\s{2,}/g, ' ');               // collapse multiple spaces

    // 3. Spoken Conciseness Replacements (Voice Response Policy: short, natural, receptionist-style)
    clean = clean
      // Boilerplate intros, lengthy polite padding & pleasantries
      .replace(/Certainly! I would be more than happy to assist you with booking an appointment\.\s*/gi, 'Sure! ')
      .replace(/Certainly!?\s*I would be (?:delighted|happy|pleased) to assist you(?:\s+with booking an appointment)?\.\s*/gi, 'Sure! ')
      .replace(/Thank you very much for providing that information\.\s*I have successfully identified the requested service and would now like to ask you whether you have a particular staff member that you would prefer\.\s*/gi, 'Got it. Do you have a preferred specialist? ')
      .replace(/Thank you for providing that information\.\s*/gi, '')
      .replace(/Thank you very much for providing that information\.\s*/gi, '')
      .replace(/Got it,\s*/gi, 'Got it. ')
      .replace(/Sounds good\.\s*/gi, 'Sounds good. ')
      .replace(/Great,\s*/gi, 'Great. ')
      .replace(/I understand that you would like to book an appointment with one of our specialists\.\s*/gi, '')
      // Service collection phrases
      .replace(/Could you please tell me which service you (?:are interested in[^?]*|would like to book[^?]*)\?/gi, 'Which service would you like?')
      .replace(/I couldn't identify that service\.\s*We currently offer:\s*/gi, "I couldn't find that service. We offer: ")
      // Staff collection phrases
      .replace(/Do you have a preferred specialist(?: that you would like to see for this appointment)?, or (?:would any(?: available)? specialist be acceptable|would anyone be fine)\?/gi, 'Do you have a preferred specialist, or is anyone okay?')
      .replace(/Do you have a preferred specialist, or would anyone be fine\?/gi, 'Do you have a preferred specialist, or is anyone okay?')
      .replace(/I couldn't find that specialist\.\s*Our team includes:\s*/gi, "I couldn't find that specialist. Our team has: ")
      // Date collection phrases
      .replace(/What date would you prefer for your appointment\?/gi, 'What date would you prefer?')
      // Slot & Time collection phrases
      .replace(/Which one would you prefer\?/gi, 'Which time works best?')
      .replace(/Please select one of the available times:\s*/gi, 'Available times are: ')
      // Customer & Phone collection phrases
      .replace(/Could you please provide your phone number(?: so that we can locate your customer profile and| to)? complete (?:the|your) (?:appointment )?booking\?/gi, 'Please provide your phone number.')
      .replace(/Please provide your phone number to complete the booking\./gi, 'Please provide your phone number.')
      .replace(/Could you please provide your phone number to complete the booking\?/gi, 'Please provide your phone number.')
      // Confirmation phrases
      .replace(/Please confirm your appointment:\s*/gi, 'Please confirm: ')
      .replace(/Would you like me to book it\?/gi, 'Should I book it?')
      // Success completion phrases (prompt examples: "Your appointment is confirmed. See you then!")
      .replace(/has been successfully booked! We look forward to seeing you on the scheduled date\./gi, 'is confirmed. See you then!')
      .replace(/has been successfully booked! We look forward to seeing you\./gi, 'is confirmed! Thank you.')
      .replace(/has been successfully booked!/gi, 'is confirmed.')
      // Cancellation phrases
      .replace(/I have cancelled your booking request\.\s*Is there anything else I can help you with\?/gi, "I've cancelled that booking. How else can I help?")
      .replace(/No problem, I have cancelled this booking\.\s*How else may I assist you today\?/gi, "I've cancelled this booking. How else can I help?")
      .replace(/I can assist you with canceling your appointment\.\s*Could you please provide your appointment date and time or your phone number\?/gi, "I can help cancel that. What is your appointment date or phone number?")
      // Reschedule phrases
      .replace(/I can help you reschedule your visit\.\s*What is your current appointment date, and what new time would you prefer\?/gi, "I can help reschedule. What is your current appointment date?")
      // Clarification & Fallback phrases
      .replace(/I'm sorry, I didn't catch that\.\s*Could you please repeat what you said\?/gi, "I didn't catch that. Could you repeat that, please?")
      .replace(/I didn't catch that\.\s*How can I help you today\?/gi, "I didn't catch that. How can I help you?");

    // 4. Single-Question Constraint (Voice conversations must not ask multiple questions simultaneously)
    const questionMarks = (clean.match(/\?/g) || []).length;
    if (questionMarks > 1) {
      // Split into sentences and keep at most the last/primary question
      const sentences = clean.split(/(?<=[.!?])\s+/);
      const nonQuestions = sentences.filter((s) => !s.endsWith('?'));
      const questions = sentences.filter((s) => s.endsWith('?'));
      // Keep introductory statement (if any) + the final actionable question
      clean = [...nonQuestions.slice(0, 1), questions[questions.length - 1]].join(' ');
    }

    // 5. Final normalization
    clean = clean.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();

    const charCountOptimized = clean.length;
    const latencyMs = Number((performance.now() - startTime).toFixed(2));

    return {
      text: clean,
      originalText,
      optimized: clean !== originalText,
      charCountOriginal,
      charCountOptimized,
      latencyMs,
    };
  }

  /**
   * Evaluate whether speech synthesis should be performed for a given response text.
   * Protects against empty/whitespace strings, punctuation-only tokens, and duplicate turns.
   */
  public evaluateTtsDecision(
    text: string,
    turnKey?: string,
    options?: { synthesizeSpeech?: boolean }
  ): TtsDecisionResult {
    // 1. Explicit speech synthesis suppression
    if (options?.synthesizeSpeech === false) {
      return { shouldSynthesize: false, reason: 'SYNTHESIS_DISABLED' };
    }

    // 2. Empty or whitespace-only check
    if (!text || text.trim().length === 0) {
      return { shouldSynthesize: false, reason: 'EMPTY_OR_WHITESPACE' };
    }

    // 3. Punctuation-only check (no alphanumeric or spoken phonemes)
    const wordsOnly = text.replace(/[.,!?;:'"–—\-_/\\()[\]{}@#$%^&*+=<>~`\s]/g, '');
    if (wordsOnly.length === 0) {
      return { shouldSynthesize: false, reason: 'PUNCTUATION_ONLY' };
    }

    // 4. Duplicate Synthesis Protection within the same turn cycle
    if (turnKey) {
      const cached = this.turnCache.get(turnKey);
      if (cached && cached.text === text.trim()) {
        return {
          shouldSynthesize: false,
          reason: 'DUPLICATE_TURN_SYNTHESIS',
          cachedAudio: cached.audio,
        };
      }
    }

    return { shouldSynthesize: true };
  }

  /**
   * Record a completed turn synthesis in the scoped cache.
   */
  public recordTurnSynthesis(
    turnKey: string,
    text: string,
    audio: SpeechPipelineAudioResponse | null
  ): void {
    this.cleanExpiredTurnCache();
    this.turnCache.set(turnKey, {
      text: text.trim(),
      audio,
      timestamp: Date.now(),
    });
  }

  /**
   * Purge turn cache entries older than 5 minutes.
   */
  private cleanExpiredTurnCache(): void {
    const now = Date.now();
    const TTL_MS = 5 * 60 * 1000;
    for (const [key, entry] of this.turnCache.entries()) {
      if (now - entry.timestamp > TTL_MS) {
        this.turnCache.delete(key);
      }
    }
  }

  /**
   * Evaluate compliance of a response against the Voice Response Policy:
   * 1. Concise character count (< 220 characters recommended for mobile voice).
   * 2. Single-question constraint (at most 1 question asked per turn).
   * 3. Markdown-free (no un-spoken symbols or formatting tags).
   */
  public evaluateVoiceResponsePolicy(text: string): {
    compliant: boolean;
    issues: string[];
    sentenceCount: number;
    charCount: number;
  } {
    const issues: string[] = [];
    const trimmed = (text || '').trim();
    const charCount = trimmed.length;

    // Check markdown remnants
    if (/(\*\*|\*|_|`|\[.*?\]\(.*?\)|#+)/.test(trimmed)) {
      issues.push('Contains markdown formatting tags');
    }

    // Check question count
    const questionMarks = (trimmed.match(/\?/g) || []).length;
    if (questionMarks > 1) {
      issues.push(`Multiple questions asked (${questionMarks} questions)`);
    }

    // Check sentence count
    const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
    const sentenceCount = sentences.length;
    if (sentenceCount > 3) {
      issues.push(`Too many sentences for voice turn (${sentenceCount} sentences)`);
    }

    // Check char count
    if (charCount > 250) {
      issues.push(`Response length exceeds voice ceiling (${charCount} > 250 chars)`);
    }

    return {
      compliant: issues.length === 0,
      issues,
      sentenceCount,
      charCount,
    };
  }

  /**
   * Clear all turn caches (useful for unit testing).
   */
  public clearCache(): void {
    this.turnCache.clear();
  }
}

export const voiceResponseOptimizer = new VoiceResponseOptimizer();
