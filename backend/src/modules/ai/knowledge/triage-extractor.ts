import {
  AnatomicalScope,
  DentalTriageProfile,
  PainPattern,
  UrgencySeverity,
} from '../conversation/conversation-session.types';

/**
 * Extracts structured, non-diagnostic clinical facts from patient utterances.
 * Designed to accurately preserve patient-reported evidence (symptoms, duration, triggers,
 * anatomical locations, swelling/bleeding presence, and patient goals) without inventing diagnoses.
 */
export function extractTriageFacts(
  input: string,
  existingProfile?: Partial<DentalTriageProfile>
): Partial<DentalTriageProfile> {
  if (!input || !input.trim()) {
    return {};
  }

  const clean = input.toLowerCase().trim();
  const facts: Partial<DentalTriageProfile> = {};

  // ---------------------------------------------------------
  // 1. Patient Goal Extraction
  // ---------------------------------------------------------
  if (
    /\b(replace (my |the )?(missing )?tooth|replace it|want to replace|tooth replacement|lost a tooth and want to replace)\b/i.test(
      clean
    )
  ) {
    facts.patientGoal = 'tooth replacement';
  } else if (
    /\b(whiten(ing)? (my |our )?teeth|teeth (are |look )?yellow|brighten my smile|smile makeover|cosmetic whitening)\b/i.test(
      clean
    )
  ) {
    facts.patientGoal = 'teeth whitening';
  } else if (
    /\b(clean(ing)? (my |our )?teeth|routine cleaning|prophylaxis|hygiene cleaning|tartar removal)\b/i.test(
      clean
    )
  ) {
    facts.patientGoal = 'preventive cleaning';
  } else if (
    /\b(fix (my |the )?(broken|chipped) tooth|repair (my |the )?tooth|restore (my |the )?tooth)\b/i.test(
      clean
    )
  ) {
    facts.patientGoal = 'tooth restoration';
  } else if (
    /\b(checkup|evaluation|exam|have it looked at|examination|look at my tooth)\b/i.test(
      clean
    )
  ) {
    facts.patientGoal = 'dental examination';
  }

  // ---------------------------------------------------------
  // 2. Anatomical Scope Extraction
  // ---------------------------------------------------------
  if (
    /\b(only one tooth|single tooth|just one tooth|just one|only 1 tooth|one tooth|it is only one tooth|it's only one tooth)\b/i.test(
      clean
    )
  ) {
    facts.anatomicalScope = 'single tooth';
  } else if (
    /\b(multiple teeth|several teeth|all my teeth|both sides|a few teeth|all teeth)\b/i.test(
      clean
    )
  ) {
    facts.anatomicalScope = 'multiple teeth';
  } else if (/\b(my jaw|jaw pain|in my jaw|back of my jaw)\b/i.test(clean)) {
    facts.anatomicalScope = 'jaw';
  } else if (/\b(my gums?|in my gums?|gum tissue)\b/i.test(clean)) {
    facts.anatomicalScope = 'gums';
  }

  // ---------------------------------------------------------
  // 3. Anatomical Location Extraction
  // ---------------------------------------------------------
  const locationMatches: string[] = [];
  if (/\blower right\b/i.test(clean) || /\bbottom right\b/i.test(clean)) {
    locationMatches.push('lower right');
  } else if (/\bupper right\b/i.test(clean) || /\btop right\b/i.test(clean)) {
    locationMatches.push('upper right');
  } else if (/\blower left\b/i.test(clean) || /\bbottom left\b/i.test(clean)) {
    locationMatches.push('lower left');
  } else if (/\bupper left\b/i.test(clean) || /\btop left\b/i.test(clean)) {
    locationMatches.push('upper left');
  } else if (/\bright side\b/i.test(clean)) {
    locationMatches.push('right side');
  } else if (/\bleft side\b/i.test(clean)) {
    locationMatches.push('left side');
  }

  if (/\bback (tooth|molar|teeth)\b/i.test(clean) || /\bwisdom tooth\b/i.test(clean)) {
    locationMatches.push('back molar');
  } else if (/\bfront (tooth|teeth)\b/i.test(clean)) {
    locationMatches.push('front tooth');
  }

  if (locationMatches.length > 0) {
    facts.anatomicalLocation = locationMatches.join(' ');
  }

  // ---------------------------------------------------------
  // 4. Onset & Duration Extraction (With Patient Corrections)
  // ---------------------------------------------------------
  const normalizeNumberWords = (str: string): string =>
    str
      .replace(/\bone\b/gi, '1')
      .replace(/\btwo\b/gi, '2')
      .replace(/\bthree\b/gi, '3')
      .replace(/\bfour\b/gi, '4')
      .replace(/\bfive\b/gi, '5')
      .replace(/\bsix\b/gi, '6')
      .replace(/\bseven\b/gi, '7');

  const durationMatch = clean.match(
    /\b(?:for\s+)?(a couple of days|few days|one day|two days|three days|four days|five days|six days|seven days|\d+\s*(?:days?|weeks?|months?))\b/i
  );
  if (durationMatch) {
    facts.duration = normalizeNumberWords(durationMatch[1].trim());
  }

  if (/\bsince yesterday\b/i.test(clean) || /\bstarted yesterday\b/i.test(clean) || /\bbegan yesterday\b/i.test(clean)) {
    facts.onset = 'yesterday';
    if (!facts.duration) facts.duration = '1 day';
  } else if (/\bsince this morning\b/i.test(clean) || /\bstarted today\b/i.test(clean)) {
    facts.onset = 'today';
    if (!facts.duration) facts.duration = 'today';
  } else if (/\bstarted (\d+|one|two|three|four|five|six|seven)\s+days ago\b/i.test(clean)) {
    const num = clean.match(/started (\d+|one|two|three|four|five|six|seven)\s+days ago/i);
    if (num) {
      const n = normalizeNumberWords(num[1]);
      facts.onset = `${n} days ago`;
      facts.duration = `${n} days`;
    }
  }

  // Check explicit patient correction for onset/duration
  if (/\bactually,\s*it started\s+([^,.]+)/i.test(clean)) {
    const corr = clean.match(/\bactually,\s*it started\s+([^,.]+)/i);
    if (corr) {
      facts.onset = normalizeNumberWords(corr[1].trim());
      const durMatch = corr[1].match(/(\d+|one|two|three|four|five|six|seven)\s*days?/i);
      if (durMatch) {
        facts.duration = normalizeNumberWords(durMatch[0].trim());
      }
    }
  }

  // ---------------------------------------------------------
  // 5. Pain Pattern Extraction
  // ---------------------------------------------------------
  if (/\b(throbbing|throbs|pulsing|pounding)\b/i.test(clean)) {
    facts.painPattern = 'throbbing';
  } else if (/\b(sharp|zinger|stabbing|piercing)\b/i.test(clean)) {
    facts.painPattern = 'sharp';
  } else if (/\b(dull|aching|constant ache)\b/i.test(clean)) {
    facts.painPattern = 'dull';
  } else if (
    /\b(comes and goes|stops quickly|goes away quickly|intermittent|brief|lasts a few seconds|stops right away)\b/i.test(
      clean
    )
  ) {
    facts.painPattern = 'intermittent';
  } else if (/\b(constant|continuous|all the time|nonstop)\b/i.test(clean)) {
    facts.painPattern = 'constant';
  } else if (/\b(when (i )?(bite|chew)|on biting|hurts to chew|pain while chewing)\b/i.test(clean)) {
    facts.painPattern = 'on biting';
  }

  // ---------------------------------------------------------
  // 6. Triggers Extraction
  // ---------------------------------------------------------
  const triggers: string[] = [];

  if (/\b(cold water|cold drinks?|cold juice|ice|cold air|cold)\b/i.test(clean)) {
    if (!triggers.includes('cold')) triggers.push('cold');
  }
  if (/\b(hot coffee|hot tea|hot drinks?|hot water|hot food|hot)\b/i.test(clean)) {
    if (!triggers.includes('hot')) triggers.push('hot');
  }
  if (/\b(sweet|sweets|sugar|candy|chocolate)\b/i.test(clean)) {
    if (!triggers.includes('sweet')) triggers.push('sweet');
  }
  if (/\b(chewing|biting|eating|eating dinner|eating hard food)\b/i.test(clean)) {
    if (!triggers.includes('chewing')) triggers.push('chewing');
  }
  if (/\b(brushing|flossing)\b/i.test(clean)) {
    if (!triggers.includes('brushing')) triggers.push('brushing');
  }

  if (triggers.length > 0) {
    facts.triggers = triggers;
  }

  // ---------------------------------------------------------
  // 7. Swelling Extraction (Positive & Negative)
  // ---------------------------------------------------------
  if (
    /\b(no swelling|not swollen|don't have swelling|do not have swelling|no puffiness|without swelling|not puffed up|no swell)\b/i.test(
      clean
    )
  ) {
    facts.swellingPresent = false;
  } else if (
    /\b(cheek is starting to swell|cheek is swollen|cheek is swelling|face is swollen|face is getting swollen|swelling is spreading|gum is swollen|swollen gum|swollen cheek|puffiness|puffy|swelling)\b/i.test(
      clean
    )
  ) {
    facts.swellingPresent = true;
  }

  // Check explicit correction: "Actually, there is swelling" vs "Actually no swelling"
  if (/\bactually,?\s*(there is|have)\s*swelling\b/i.test(clean)) {
    facts.swellingPresent = true;
  } else if (/\bactually,?\s*(there is )?no swelling\b/i.test(clean)) {
    facts.swellingPresent = false;
  }

  // ---------------------------------------------------------
  // 8. Bleeding Extraction (Positive & Negative)
  // ---------------------------------------------------------
  if (
    /\b(no bleeding|not bleeding|doesn't bleed|does not bleed|without bleeding|no blood)\b/i.test(
      clean
    )
  ) {
    facts.bleedingPresent = false;
  } else if (
    /\b(bleeding|bleeds when i brush|gums bleed|blood in mouth|bleeding gums|blood when flossing)\b/i.test(
      clean
    )
  ) {
    facts.bleedingPresent = true;
  }

  // ---------------------------------------------------------
  // 9. Trauma / Fracture Extraction
  // ---------------------------------------------------------
  if (
    /\b(broke|broken|chipped|piece of my tooth broke|cracked|lost a filling|lost a crown|hit in the face|knocked out|sports injury|fell and hit)\b/i.test(
      clean
    )
  ) {
    facts.traumaPresent = true;
  }

  // ---------------------------------------------------------
  // 10. Systemic / Emergency Escalation Extraction
  // ---------------------------------------------------------
  // Breathing
  if (/\b(breathe normally|breathing is fine|can breathe fine|no trouble breathing|no problem breathing)\b/i.test(clean)) {
    facts.breathingDifficulty = false;
  } else if (/\b(trouble breathing|hard to breathe|can't breathe|cannot breathe|difficulty breathing)\b/i.test(clean)) {
    facts.breathingDifficulty = true;
  }

  // Swallowing
  if (/\b(swallow normally|swallowing is fine|can swallow fine|no trouble swallowing|no problem swallowing|swallow comfortably)\b/i.test(clean)) {
    facts.swallowingDifficulty = false;
  } else if (/\b(trouble swallowing|hard to swallow|can't swallow|cannot swallow|difficulty swallowing|hurts to swallow)\b/i.test(clean)) {
    facts.swallowingDifficulty = true;
  }

  // Eye Involvement
  if (/\b(closing my eye|eye is swollen shut|swelling closing my eye|swelling reached my eye)\b/i.test(clean)) {
    facts.eyeInvolvement = true;
  }

  // Fever
  if (/\b(no fever|haven't had a fever|no temp|temperature is normal)\b/i.test(clean)) {
    facts.feverReported = false;
  } else if (/\b(fever|running a temp|chills and fever|high temperature)\b/i.test(clean)) {
    facts.feverReported = true;
  }

  // ---------------------------------------------------------
  // 11. Reported Symptoms (Array Foundation for Multi-Symptom)
  // ---------------------------------------------------------
  const symptoms: string[] = [];

  const checkAndAdd = (symptomName: string, pattern: RegExp) => {
    if (pattern.test(clean) && !symptoms.includes(symptomName)) {
      symptoms.push(symptomName);
    }
  };

  checkAndAdd(
    'broken tooth',
    /\b(broken tooth|chipped tooth|piece broke off|cracked tooth|tooth broke|tooth is broken|tooth chipped|piece of my tooth broke)\b/i
  );
  checkAndAdd(
    'throbbing tooth pain',
    /\b(throbbing (tooth )?(pain|ache)|tooth throbs|throbbing toothache|now it throbs|it throbs|throbs|throbbing)\b/i
  );
  checkAndAdd('toothache', /\b(toothache|tooth ache|tooth hurts|tooth is hurting|pain in my tooth)\b/i);
  checkAndAdd('cold sensitivity', /\b(sensitive to cold|hurts with cold|pain with cold|cold water hurts)\b/i);
  checkAndAdd('heat sensitivity', /\b(sensitive to hot|hurts with hot|hot coffee hurts)\b/i);
  checkAndAdd('swollen gum', /\b(swollen gum|gum is swollen|gums are swollen)\b/i);
  checkAndAdd('facial cheek swelling', /\b(cheek is swollen|cheek is starting to swell|face is swollen|swelling in cheek)\b/i);
  checkAndAdd('bleeding gums', /\b(bleeding gums|gums bleed|bleeding when i brush)\b/i);
  checkAndAdd('loose tooth', /\b(loose tooth|teeth feel loose)\b/i);
  checkAndAdd('missing tooth', /\b(missing tooth|lost a tooth|lost my tooth)\b/i);
  checkAndAdd('tooth discoloration', /\b(teeth look yellow|yellow teeth|stained teeth|discolored teeth)\b/i);

  if (symptoms.length > 0) {
    facts.reportedSymptoms = symptoms;
  }

  return facts;
}

/**
 * Merges newly extracted clinical facts into an existing triage profile,
 * honoring latest patient updates and patient corrections.
 */
export function mergeTriageFacts(
  existing: DentalTriageProfile,
  newFacts: Partial<DentalTriageProfile>,
  userStatement: string
): DentalTriageProfile {
  const updated: DentalTriageProfile = {
    ...existing,
    ...newFacts,
    // Accumulate reported symptoms without duplicates
    reportedSymptoms: Array.from(
      new Set([...(existing.reportedSymptoms || []), ...(newFacts.reportedSymptoms || [])])
    ),
    // Accumulate triggers without duplicates
    triggers: Array.from(
      new Set([...(existing.triggers || []), ...(newFacts.triggers || [])])
    ),
    // Preserve follow-up history
    followUpHistory: existing.followUpHistory ? [...existing.followUpHistory] : [],
  };

  // If there was an active follow-up question, record the answer in history
  if (existing.activeFollowUpQuestion) {
    updated.followUpHistory.push({
      question: existing.activeFollowUpQuestion,
      answer: userStatement,
      timestamp: new Date().toISOString(),
    });
    updated.activeFollowUpQuestion = undefined;
  }

  return updated;
}
