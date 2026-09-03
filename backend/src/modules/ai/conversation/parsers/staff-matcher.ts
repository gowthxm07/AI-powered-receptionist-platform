import { SafeStaffSummary } from '../../tools/staff.tools';

export interface StaffMatchResult {
  isAnyone: boolean;
  matchedStaff: SafeStaffSummary | null;
  ambiguous: SafeStaffSummary[];
}

export class StaffMatcher {
  /**
   * Deterministically matches user input against staff specialists or "anyone" preference.
   */
  public static matchStaff(
    input: string,
    staffList: SafeStaffSummary[]
  ): StaffMatchResult {
    if (!input || !staffList || staffList.length === 0) {
      return { isAnyone: false, matchedStaff: null, ambiguous: [] };
    }

    const raw = input.trim().toLowerCase();
    const clean = raw.replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Check for "Anyone" / "No preference"
    const anyonePatterns = [
      /\banyone\b/,
      /\bany\b/,
      /\bno preference\b/,
      /\bno one specific\b/,
      /\beither\b/,
      /\bdoesn'?t matter\b/,
      /\bany staff\b/,
      /\bany doctor\b/,
      /\bwhoever is available\b/,
      /\bfirst available\b/,
      /\bno\b/,
    ];

    for (const pat of anyonePatterns) {
      if (pat.test(clean)) {
        return { isAnyone: true, matchedStaff: null, ambiguous: [] };
      }
    }

    // 2. Exact case-insensitive staff name match
    for (const staff of staffList) {
      if (staff.name.toLowerCase() === clean) {
        return { isAnyone: false, matchedStaff: staff, ambiguous: [] };
      }
    }

    // 3. Substring match (e.g. "Dr. Sarah", "Jenkins", "Dr. Chen")
    const substringMatches: SafeStaffSummary[] = [];
    for (const staff of staffList) {
      const staffName = staff.name.toLowerCase();
      // Remove prefixes like "dr.", "dr", "ms.", "mr."
      const cleanStaffName = staffName.replace(/^(dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '');
      const cleanInput = clean.replace(/^(dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '');

      if (
        staffName.includes(clean) ||
        clean.includes(staffName) ||
        cleanStaffName.includes(cleanInput) ||
        cleanInput.includes(cleanStaffName)
      ) {
        substringMatches.push(staff);
      }
    }

    if (substringMatches.length === 1) {
      return { isAnyone: false, matchedStaff: substringMatches[0], ambiguous: [] };
    }
    if (substringMatches.length > 1) {
      return { isAnyone: false, matchedStaff: null, ambiguous: substringMatches };
    }

    // 4. Token overlap match
    const inputTokens = clean.split(/\s+/).filter((t) => t.length > 2);
    const tokenMatches: SafeStaffSummary[] = [];

    for (const staff of staffList) {
      const sTokens = staff.name.toLowerCase().split(/\s+/);
      if (inputTokens.some((it) => sTokens.some((st) => st.includes(it) || it.includes(st)))) {
        tokenMatches.push(staff);
      }
    }

    if (tokenMatches.length === 1) {
      return { isAnyone: false, matchedStaff: tokenMatches[0], ambiguous: [] };
    }
    if (tokenMatches.length > 1) {
      return { isAnyone: false, matchedStaff: null, ambiguous: tokenMatches };
    }

    return { isAnyone: false, matchedStaff: null, ambiguous: [] };
  }
}
