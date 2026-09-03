export interface DateParseResult {
  parsedDate: string | null; // YYYY-MM-DD
  formattedLabel: string;
  isPast: boolean;
  error?: string;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

export class DateParser {
  /**
   * Deterministically parses natural conversational date expressions.
   * Reference date defaults to now (can be injected for deterministic testing).
   */
  public static parseDate(input: string, referenceDate: Date = new Date()): DateParseResult {
    if (!input || typeof input !== 'string') {
      return { parsedDate: null, formattedLabel: '', isPast: false, error: 'Empty date input.' };
    }

    const raw = input.trim().toLowerCase();
    const clean = raw.replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();

    const todayStart = new Date(referenceDate);
    todayStart.setHours(0, 0, 0, 0);

    let targetDate: Date | null = null;

    // 1. "Today"
    if (/\btoday\b/.test(clean)) {
      targetDate = new Date(todayStart);
    }
    // 2. "Tomorrow"
    else if (/\btomorrow\b/.test(clean)) {
      targetDate = new Date(todayStart);
      targetDate.setDate(targetDate.getDate() + 1);
    }
    // 3. "Day after tomorrow"
    else if (/\bday after tomorrow\b/.test(clean)) {
      targetDate = new Date(todayStart);
      targetDate.setDate(targetDate.getDate() + 2);
    }
    // 4. Weekday matching (e.g. "monday", "next friday")
    else {
      for (const [dayName, dayIndex] of Object.entries(WEEKDAYS)) {
        const regex = new RegExp(`\\b(next\\s+)?${dayName}\\b`, 'i');
        if (regex.test(clean)) {
          const currentDay = todayStart.getDay();
          let diff = dayIndex - currentDay;
          if (diff <= 0) {
            diff += 7; // Next occurrence
          }
          if (/next\s+/i.test(clean) && diff <= 7) {
            diff += 7;
          }
          targetDate = new Date(todayStart);
          targetDate.setDate(targetDate.getDate() + diff);
          break;
        }
      }
    }

    // 5. ISO format: YYYY-MM-DD
    if (!targetDate) {
      const isoMatch = clean.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        targetDate = new Date(year, month, day);
      }
    }

    // 6. Month name and day (e.g. "September 15", "15th of Sep", "Sep 15 2026")
    if (!targetDate) {
      for (const [monthName, monthIndex] of Object.entries(MONTHS)) {
        const monthRegex = new RegExp(`\\b${monthName}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?\\b`, 'i');
        const mMatch = clean.match(monthRegex);
        if (mMatch) {
          const day = parseInt(mMatch[1], 10);
          const year = mMatch[2] ? parseInt(mMatch[2], 10) : todayStart.getFullYear();
          targetDate = new Date(year, monthIndex, day);
          break;
        }

        // Reverse: "15th September"
        const revRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${monthName}(?:\\s+(\\d{4}))?\\b`, 'i');
        const revMatch = clean.match(revRegex);
        if (revMatch) {
          const day = parseInt(revMatch[1], 10);
          const year = revMatch[2] ? parseInt(revMatch[2], 10) : todayStart.getFullYear();
          targetDate = new Date(year, monthIndex, day);
          break;
        }
      }
    }

    // 7. MM/DD or MM/DD/YYYY format
    if (!targetDate) {
      const slashMatch = clean.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
      if (slashMatch) {
        const month = parseInt(slashMatch[1], 10) - 1;
        const day = parseInt(slashMatch[2], 10);
        let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : todayStart.getFullYear();
        if (year < 100) year += 2000;
        targetDate = new Date(year, month, day);
      }
    }

    if (!targetDate || isNaN(targetDate.getTime())) {
      return {
        parsedDate: null,
        formattedLabel: '',
        isPast: false,
        error: "I couldn't understand that date. You can say 'today', 'tomorrow', a day like 'Friday', or a date like 'September 15'.",
      };
    }

    targetDate.setHours(0, 0, 0, 0);

    // Check past date
    if (targetDate < todayStart) {
      return {
        parsedDate: null,
        formattedLabel: '',
        isPast: true,
        error: 'That date is in the past. Please choose today or a future date.',
      };
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const parsedDate = `${yyyy}-${mm}-${dd}`;

    const formattedLabel = targetDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      parsedDate,
      formattedLabel,
      isPast: false,
    };
  }
}
