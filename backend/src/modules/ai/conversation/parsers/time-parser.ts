import { AvailableSlot } from '../conversation-session.types';

export interface TimeMatchResult {
  matchedSlot: AvailableSlot | null;
  error?: string;
}

export class TimeParser {
  /**
   * Deterministically matches user response against the offered available slots.
   */
  public static matchSlot(
    input: string,
    availableSlots: AvailableSlot[]
  ): TimeMatchResult {
    if (!input || !availableSlots || availableSlots.length === 0) {
      return { matchedSlot: null, error: 'No available slots provided to match against.' };
    }

    const raw = input.trim().toLowerCase();
    const clean = raw.replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Ordinal / Index matching (e.g. "1", "first", "option 2", "2nd", "the third one", "last")
    if (/\b(1|first|1st|option 1|number 1)\b/i.test(clean) && availableSlots.length >= 1) {
      return { matchedSlot: availableSlots[0] };
    }
    if (/\b(2|second|2nd|option 2|number 2)\b/i.test(clean) && availableSlots.length >= 2) {
      return { matchedSlot: availableSlots[1] };
    }
    if (/\b(3|third|3rd|option 3|number 3)\b/i.test(clean) && availableSlots.length >= 3) {
      return { matchedSlot: availableSlots[2] };
    }
    if (/\b(4|fourth|4th|option 4|number 4)\b/i.test(clean) && availableSlots.length >= 4) {
      return { matchedSlot: availableSlots[3] };
    }
    if (/\b(last|last one)\b/i.test(clean)) {
      return { matchedSlot: availableSlots[availableSlots.length - 1] };
    }

    // 2. Exact or normalized time string matching against available slots
    // Normalize slot labels: e.g. "10:00 AM" -> "10:00 am", "10 am", "10:00", "10"
    for (const slot of availableSlots) {
      const label = slot.timeLabel.toLowerCase();
      // Exact label match
      if (clean === label || clean.includes(label)) {
        return { matchedSlot: slot };
      }

      // Check without leading zeros: "02:00 pm" -> "2:00 pm"
      const unpadded = label.replace(/^0/, '');
      if (clean.includes(unpadded)) {
        return { matchedSlot: slot };
      }

      // Check hour-only format: "10:00 am" -> "10 am" or "10am" or "10 in the morning"
      const hourAmPmMatch = label.match(/(\d{1,2}):00\s*(am|pm)/i);
      if (hourAmPmMatch) {
        const hour = parseInt(hourAmPmMatch[1], 10);
        const ampm = hourAmPmMatch[2].toLowerCase();
        if (
          clean.includes(`${hour} ${ampm}`) ||
          clean.includes(`${hour}${ampm}`) ||
          (ampm === 'am' && clean.includes(`${hour} in the morning`)) ||
          (ampm === 'pm' && clean.includes(`${hour} in the afternoon`)) ||
          (ampm === 'pm' && clean.includes(`${hour} in the evening`)) ||
          clean === `${hour}`
        ) {
          return { matchedSlot: slot };
        }
      }

      // Check 24-hour match: "02:00 PM" -> "14:00"
      const slotDate = new Date(slot.startTime);
      const h24 = String(slotDate.getHours()).padStart(2, '0');
      const m24 = String(slotDate.getMinutes()).padStart(2, '0');
      const time24 = `${h24}:${m24}`;
      if (clean.includes(time24) || clean.includes(`${slotDate.getHours()}:${m24}`)) {
        return { matchedSlot: slot };
      }
    }

    const slotLabels = availableSlots.map((s) => s.timeLabel).join(', ');
    return {
      matchedSlot: null,
      error: `I couldn't match that to an available time. Please choose from: ${slotLabels}.`,
    };
  }
}
