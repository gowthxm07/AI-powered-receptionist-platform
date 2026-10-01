import {
  AnatomicalScope,
  CategoryEvidence,
  DentalTriageProfile,
  PainPattern,
  PatientGoalType,
  RecommendedNextStep,
  UrgencySeverity,
} from '../conversation/conversation-session.types';

/**
 * Extracts typed patient goals from natural language statements.
 * Distinguishes what the patient is experiencing from what the patient wants.
 */
export function extractPatientGoal(clean: string): {
  primaryGoal: PatientGoalType;
  goals: PatientGoalType[];
} {
  const goals: PatientGoalType[] = [];

  if (
    /\b(how much (does|is|are|would)|cost of|price of|how expensive|what is the cost|what are the rates|pricing|rates? for)\b/i.test(
      clean
    )
  ) {
    goals.push('COST_INFORMATION');
  }

  if (
    /\b(can a broken tooth be fixed|can you tell me|do you offer|tell me about|information on|wondering if|curious about|don't know if i need|can you help explain)\b/i.test(
      clean
    )
  ) {
    goals.push('INFORMATION_ONLY');
  }

  if (
    /\b((replace|replacing) (my |the )?(missing )?tooth|(replace|replacing) it|want to replace|tooth replacement|lost a tooth|missing tooth|missing teeth|false teeth|denture|dentures|dental implant|implants)\b/i.test(
      clean
    )
  ) {
    goals.push('REPLACE_MISSING_TOOTH');
  }

  if (
    /\b(whiten(ing)? (my |our )?teeth|teeth (are |look )?yellow|brighten my smile|smile makeover|cosmetic whitening|whiter|whiten)\b/i.test(
      clean
    )
  ) {
    goals.push('WHITEN_TEETH');
  }

  if (
    /\b(clean(ing)? (my |our )?teeth|routine cleaning|prophylaxis|hygiene cleaning|tartar removal|plaque removal)\b/i.test(
      clean
    )
  ) {
    goals.push('ROUTINE_CLEANING');
  }

  if (
    /\b(fix (my |the )?(broken|chipped|cracked) tooth|repair (my |the )?tooth|restore (my |the )?tooth|broken tooth|tooth broke|chipped tooth|cracked tooth|piece of my tooth broke)\b/i.test(
      clean
    )
  ) {
    goals.push('REPAIR_BROKEN_TOOTH');
  }

  if (/\b(braces|aligners|invisalign|straighten my teeth|orthodontic)\b/i.test(clean)) {
    goals.push('ORTHODONTIC_ALIGNMENT');
  }

  if (/\b(wisdom tooth|wisdom teeth|back tooth trouble opening mouth)\b/i.test(clean)) {
    goals.push('WISDOM_TOOTH_EVALUATION');
  }

  if (/\b(bracket came off|loose bracket|poking wire|broken wire|appliance)\b/i.test(clean)) {
    goals.push('REPLACE_OR_REPAIR_APPLIANCE');
  }

  if (
    /\b(pain relief|stop the pain|severe toothache|throbbing|killing me|hurts badly|unbearable pain)\b/i.test(
      clean
    )
  ) {
    goals.push('PAIN_RELIEF');
  }

  if (
    /\b(checkup|evaluation|exam|have it looked at|examination|look at my tooth|check it|someone to check|don't know what('s| is) wrong|not sure what i need|just want someone to check it)\b/i.test(
      clean
    )
  ) {
    goals.push('EVALUATION');
  }

  if (
    /\b(book an appointment|schedule an appointment|make an appointment|see a dentist|want to schedule|want to book)\b/i.test(
      clean
    )
  ) {
    goals.push('APPOINTMENT_BOOKING');
  }

  const primaryGoal = goals.length > 0 ? goals[0] : 'EVALUATION';
  return { primaryGoal, goals };
}

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
  const goalResult = extractPatientGoal(clean);
  if (goalResult.goals.length > 0) {
    facts.patientGoal = goalResult.primaryGoal;
    facts.patientGoals = goalResult.goals;
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
  // 5. Pain Pattern Extraction (With Patient Corrections & Cleared Pain)
  // ---------------------------------------------------------
  const isPainCleared =
    /\b(actually,?\s*)?(it\s+)?(does\s*not|doesn'?t|no|not)\s*(hurt|hurting|pain|ache)\b/i.test(
      clean
    ) ||
    /\bno pain (now|anymore|at all)\b/i.test(clean) ||
    /\bpain (has )?stopped\b/i.test(clean) ||
    /\bdoesn't hurt now\b/i.test(clean);

  if (isPainCleared) {
    facts.painPattern = undefined;
    facts.severity = undefined;
  } else if (/\bactually,?\s*(it\s+)?hurts?\s*constantly\b/i.test(clean) || /\bhurts?\s*constantly now\b/i.test(clean)) {
    facts.painPattern = 'constant';
  } else if (/\bactually,?\s*(it\s+)?(throbs|is throbbing)\b/i.test(clean) || /\bthrobs constantly\b/i.test(clean)) {
    facts.painPattern = 'throbbing';
  } else if (/\b(throbbing|throbs|thrombs|thrombing|thribs|thribbing|pulsing|pounding|now it (throbs|thrombs|thribs|drops)|it (throbs|thrombs|thribs|drops))\b/i.test(clean)) {
    facts.painPattern = 'throbbing';
  } else if (/\b(sharp|zinger|stabbing|piercing)\b/i.test(clean)) {
    facts.painPattern = 'sharp';
  } else if (/\b(dull|aching|constant ache)\b/i.test(clean)) {
    facts.painPattern = 'dull';
  } else if (
    /\b(comes and goes|stops quickly|goes away quickly|intermittent|brief|lasts a few seconds|stops right away|sometimes|occasionally|on and off)\b/i.test(
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
    /\b(no|not|don'?t|do not|doesn'?t|without|zero|never|haven'?t)\s+(?:have\s+|had\s+|noticed?\s+|seen?\s+)?(?:any\s+)?(?:signs?\s+of\s+)?(?:puffiness|swelling|swell|swollen)\b/i.test(
      clean
    ) ||
    /\b(not swollen|not puffed up|no swell)\b/i.test(clean)
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
  } else if (/\bactually,?\s*(there is )?(no|not)\s*(any\s+)?swelling\b/i.test(clean)) {
    facts.swellingPresent = false;
  }

  // ---------------------------------------------------------
  // 8. Bleeding Extraction (Positive & Negative)
  // ---------------------------------------------------------
  if (
    /\b(no|not|don'?t|do not|doesn'?t|without|zero|never)\s+(?:have\s+|had\s+|noticed?\s+|seen?\s+)?(?:any\s+)?(?:signs?\s+of\s+)?(?:bleeding|blood|bleed)\b/i.test(
      clean
    ) ||
    /\b(not bleeding|doesn't bleed|does not bleed)\b/i.test(clean)
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
  if (
    /\b(no|not|don'?t|haven'?t|without)\s+(?:have\s+|had\s+)?(?:any\s+)?(?:fever|temp|temperature)\b/i.test(
      clean
    ) ||
    /\b(no fever|haven't had a fever|no temp|temperature is normal)\b/i.test(clean)
  ) {
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
    /\b(broken tooth|chipped tooth|piece broke off|cracked tooth|tooth broke|tooth is broken|tooth broken|tooth chipped|piece of my tooth broke)\b/i
  );

  if (!isPainCleared) {
    checkAndAdd(
      'throbbing tooth pain',
      /\b(throbbing (tooth )?(pain|ache)|tooth throbs|throbbing toothache|now it (throbs|thrombs|thribs|drops)|it (throbs|thrombs|thribs|drops)|throbs|throbbing|thrombs|thrombing|thribs|thribbing)\b/i
    );
    checkAndAdd('toothache', /\b(toothache|tooth ache|tooth hurts|tooth is hurting|pain in my tooth|killing me)\b/i);
  }

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
 * honoring latest patient updates, corrections, and resolved complaints.
 */
export function mergeTriageFacts(
  existing: DentalTriageProfile,
  newFacts: Partial<DentalTriageProfile>,
  userStatement: string
): DentalTriageProfile {
  const clean = userStatement.toLowerCase().trim();
  const isPainCleared =
    /\b(actually,?\s*)?(it\s+)?(does\s*not|doesn'?t|no|not)\s*(hurt|hurting|pain|ache)\b/i.test(clean) ||
    /\bno pain (now|anymore|at all)\b/i.test(clean) ||
    /\bpain (has )?stopped\b/i.test(clean) ||
    /\bdoesn't hurt now\b/i.test(clean);

  // If pain was explicitly cleared, filter out pain-related symptoms from existing
  let mergedSymptoms = Array.from(
    new Set([...(existing.reportedSymptoms || []), ...(newFacts.reportedSymptoms || [])])
  );
  if (isPainCleared) {
    mergedSymptoms = mergedSymptoms.filter(
      (s) => !s.includes('pain') && !s.includes('toothache') && !s.includes('throbbing')
    );
  }

  // Accumulate patient goals, with latest primary goal taking precedence
  const mergedGoals = Array.from(
    new Set([...(existing.patientGoals || []), ...(newFacts.patientGoals || [])])
  );

  const updated: DentalTriageProfile = {
    ...existing,
    ...newFacts,
    reportedSymptoms: mergedSymptoms,
    patientGoal: newFacts.patientGoal || existing.patientGoal,
    patientGoals: mergedGoals,
    triggers: Array.from(
      new Set([...(existing.triggers || []), ...(newFacts.triggers || [])])
    ),
    symptomCategories: Array.from(
      new Set([...(existing.symptomCategories || []), ...(newFacts.symptomCategories || [])])
    ),
    followUpHistory: existing.followUpHistory ? [...existing.followUpHistory] : [],
  };

  if (isPainCleared) {
    updated.painPattern = undefined;
    updated.severity = undefined;
  }

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

/**
 * Selects the next clinical follow-up question using the triage profile.
 * Strictly avoids asking questions whose answers are already known (e.g. if cold trigger
 * is known, avoids asking about triggers and instead asks about lingering duration).
 */
export function selectNextFollowUpQuestion(profile: DentalTriageProfile): string | null {
  // If complaint is completely ambiguous without specific symptoms
  if (profile.isAmbiguous && (!profile.reportedSymptoms || profile.reportedSymptoms.length === 0)) {
    return 'I can help with that. Are you noticing pain, sensitivity, swelling, bleeding, a broken tooth, or something else?';
  }

  // 1. Swelling follow-up
  if (profile.swellingPresent === true) {
    if (profile.breathingDifficulty === undefined && profile.swallowingDifficulty === undefined) {
      return 'Is the swelling spreading, and are you having any difficulty swallowing or breathing?';
    }
  }

  // 2. Sensitivity follow-up (avoid asking triggers if trigger already known!)
  const hasSensitivity =
    profile.reportedSymptoms?.includes('cold sensitivity') ||
    profile.reportedSymptoms?.includes('heat sensitivity') ||
    profile.triggers?.includes('cold') ||
    profile.triggers?.includes('hot');

  if (hasSensitivity) {
    // If we don't know the pain pattern (lingering vs quick)
    if (!profile.painPattern) {
      return 'Does the sensitivity stop quickly after the cold liquid is gone, or does it continue for a while?';
    }
    // If anatomical scope is unknown
    if (!profile.anatomicalScope || profile.anatomicalScope === 'unspecified') {
      return 'Is the sensitivity affecting one specific tooth, or several teeth across your mouth?';
    }
  }

  // 3. Toothache / Pain follow-up
  const hasToothache =
    profile.reportedSymptoms?.includes('toothache') ||
    profile.reportedSymptoms?.includes('throbbing tooth pain');

  if (hasToothache) {
    // If duration/onset is unknown
    if (!profile.duration && !profile.onset) {
      return 'How long have you had this toothache, and is the discomfort constant or does it come and go?';
    }
    // If swelling is unknown
    if (profile.swellingPresent === undefined) {
      return 'Have you noticed any swelling in your gums or around your cheek?';
    }
  }

  // 4. Broken tooth follow-up
  const hasBrokenTooth =
    profile.traumaPresent === true || profile.reportedSymptoms?.includes('broken tooth');

  if (hasBrokenTooth) {
    if (!profile.painPattern && !hasToothache) {
      return 'Are you feeling any sharp pain or throbbing from the broken tooth, or is it mostly rough to the tongue?';
    }
  }

  // 5. Bleeding gums follow-up
  if (profile.reportedSymptoms?.includes('bleeding gums')) {
    if (!profile.painPattern) {
      return 'Has the bleeding been happening mainly during brushing, and have you noticed any teeth feeling slightly loose?';
    }
  }

  return null;
}
