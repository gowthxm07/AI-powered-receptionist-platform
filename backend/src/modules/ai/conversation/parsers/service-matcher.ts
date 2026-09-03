import { SafeServiceSummary } from '../../tools/service.tools';

export interface ServiceMatchResult {
  matchedService: SafeServiceSummary | null;
  ambiguous: SafeServiceSummary[];
}

export class ServiceMatcher {
  /**
   * Deterministically matches user natural language against the active business's services.
   * Prioritizes exact matches, then substring containment, then token overlap.
   */
  public static matchService(
    input: string,
    services: SafeServiceSummary[]
  ): ServiceMatchResult {
    if (!input || !services || services.length === 0) {
      return { matchedService: null, ambiguous: [] };
    }

    const raw = input.trim().toLowerCase();
    const clean = raw.replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Exact case-insensitive match
    for (const service of services) {
      if (service.name.toLowerCase() === clean) {
        return { matchedService: service, ambiguous: [] };
      }
    }

    // 2. Direct Substring Containment (either input contains service name or service name contains input)
    const substringMatches: SafeServiceSummary[] = [];
    for (const service of services) {
      const sName = service.name.toLowerCase();
      if (clean.includes(sName) || (clean.length >= 3 && sName.includes(clean))) {
        substringMatches.push(service);
      }
    }

    if (substringMatches.length === 1) {
      return { matchedService: substringMatches[0], ambiguous: [] };
    }
    if (substringMatches.length > 1) {
      return { matchedService: null, ambiguous: substringMatches };
    }

    // 3. Significant Token Overlap (ignoring common stop words)
    const stopWords = new Set([
      'i', 'want', 'a', 'an', 'the', 'book', 'need', 'like', 'to', 'for', 'service',
      'treatment', 'please', 'appointment', 'schedule', 'get', 'have'
    ]);

    const inputTokens = clean
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));

    if (inputTokens.length === 0) {
      return { matchedService: null, ambiguous: [] };
    }

    let bestScore = 0;
    let bestMatch: SafeServiceSummary | null = null;
    const tokenMatches: SafeServiceSummary[] = [];

    for (const service of services) {
      const serviceTokens = service.name
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 2 && !stopWords.has(t));

      let matchedTokens = 0;
      for (const inTok of inputTokens) {
        if (serviceTokens.some((sTok) => sTok.includes(inTok) || inTok.includes(sTok))) {
          matchedTokens++;
        }
      }

      if (matchedTokens > 0) {
        tokenMatches.push(service);
        if (matchedTokens > bestScore) {
          bestScore = matchedTokens;
          bestMatch = service;
        }
      }
    }

    if (bestMatch && tokenMatches.length === 1) {
      return { matchedService: bestMatch, ambiguous: [] };
    }

    if (tokenMatches.length > 1) {
      // If one service has strictly more token matches than all others
      const topMatches = tokenMatches.filter((s) => {
        const sTokens = s.name.toLowerCase().split(/\s+/);
        return inputTokens.some((t) => sTokens.some((st) => st.includes(t)));
      });
      if (topMatches.length === 1) {
        return { matchedService: topMatches[0], ambiguous: [] };
      }
      return { matchedService: null, ambiguous: tokenMatches };
    }

    return { matchedService: null, ambiguous: [] };
  }
}
