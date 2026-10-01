/**
 * Global Dental Knowledge Catalogue
 *
 * Provider-independent clinical repository covering the 18 standard CDT/dental
 * specialty domains. Decouples general dental problem understanding from
 * individual clinic service availability.
 *
 * Clinical Safety Mandate:
 * - Receptionist/Triage role only: NEVER issue a definitive diagnosis.
 * - Always use tentative phrasing ("This type of symptom can be associated with...",
 *   "A dental examination would be appropriate...").
 * - CDT codes are internal clinical reference data and are not directly quoted to patients.
 */

export enum DentalClinicalCategory {
  PREVENTIVE_ROUTINE = 'PREVENTIVE_ROUTINE',
  CARIES_RESTORATION = 'CARIES_RESTORATION',
  PULPITIS_ENDODONTICS = 'PULPITIS_ENDODONTICS',
  ABSCESS_ACUTE_INFECTION = 'ABSCESS_ACUTE_INFECTION',
  GINGIVITIS = 'GINGIVITIS',
  PERIODONTITIS_ADVANCED = 'PERIODONTITIS_ADVANCED',
  WISDOM_TOOTH_ORAL_SURGERY = 'WISDOM_TOOTH_ORAL_SURGERY',
  FRACTURED_TOOTH_RESTORATION = 'FRACTURED_TOOTH_RESTORATION',
  IMPLANT_PROSTHODONTICS = 'IMPLANT_PROSTHODONTICS',
  DENTURES_REMOVABLE = 'DENTURES_REMOVABLE',
  AESTHETIC_WHITENING = 'AESTHETIC_WHITENING',
  ORTHODONTICS_ALIGNERS = 'ORTHODONTICS_ALIGNERS',
  BRUXISM_TMJ = 'BRUXISM_TMJ',
  DENTAL_SENSITIVITY = 'DENTAL_SENSITIVITY',
  TRAUMA_EMERGENCY_AVULSION = 'TRAUMA_EMERGENCY_AVULSION',
  ORTHODONTIC_APPLIANCE_EMERGENCY = 'ORTHODONTIC_APPLIANCE_EMERGENCY',
  PEDIATRIC_PREVENTIVE = 'PEDIATRIC_PREVENTIVE',
  COSMETIC_SMILE_DESIGN = 'COSMETIC_SMILE_DESIGN',
}

export enum DentalUrgencyLevel {
  ROUTINE = 'ROUTINE',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export interface DentalKnowledgeEntry {
  category: DentalClinicalCategory;
  name: string;
  cdtReferences: string[];
  urgency: DentalUrgencyLevel;
  isEmergency: boolean;
  keywords: string[];
  patientPhrases: string[];
  cautiousExplanation: string;
  suggestedAction: string;
  ambiguousFollowUp?: string;
}

export const GLOBAL_DENTAL_CATALOGUE: Record<DentalClinicalCategory, DentalKnowledgeEntry> = {
  [DentalClinicalCategory.PREVENTIVE_ROUTINE]: {
    category: DentalClinicalCategory.PREVENTIVE_ROUTINE,
    name: 'Preventive Care & Routine Prophylaxis',
    cdtReferences: ['D0120', 'D1110', 'D1120'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'cleaning',
      'routine cleaning',
      'prophylaxis',
      'hygiene',
      'tartar',
      'plaque',
      'clean teeth',
      'checkup',
      'routine checkup',
      'dental exam',
      'six month checkup',
      'annual checkup',
      'scale and polish',
    ],
    patientPhrases: [
      'i need a cleaning',
      'want to clean my teeth',
      'book a routine checkup',
      'six month dental cleaning',
      'plaque removal',
      'scale and polish my teeth',
      'checkup and cleaning',
    ],
    cautiousExplanation:
      'Routine cleanings and preventative checkups help remove plaque and tartar and maintain overall gum and tooth health.',
    suggestedAction: 'A dental cleaning and routine examination would be an appropriate appointment.',
  },

  [DentalClinicalCategory.CARIES_RESTORATION]: {
    category: DentalClinicalCategory.CARIES_RESTORATION,
    name: 'Dental Caries & Restorative Filling Evaluation',
    cdtReferences: ['D2140', 'D2330', 'D2391'],
    urgency: DentalUrgencyLevel.MEDIUM,
    isEmergency: false,
    keywords: [
      'cavity',
      'filling',
      'hole in tooth',
      'hole in my tooth',
      'hole in my back tooth',
      'hole in a tooth',
      'hole',
      'decay',
      'caries',
      'lost filling',
      'black spot on tooth',
      'food getting stuck',
      'food keeps getting stuck',
      'food stuck',
      'food trapping',
      'food getting stuck in tooth',
      'need a filling',
      'tooth has a hole',
    ],
    patientPhrases: [
      "there's a hole in my tooth",
      "there's a hole in my back tooth",
      "there's a hole in my back tooth and food keeps getting stuck",
      'food keeps getting stuck in my tooth',
      'food keeps getting stuck',
      'i think i need a filling',
      'food gets stuck in my back tooth',
      'my filling fell out',
      'i have a cavity',
      'black spot on my molar',
      'tooth decay',
    ],
    cautiousExplanation:
      'A hole in a tooth or lost restoration can be associated with dental decay or wear, though a dentist would need to examine the tooth to determine whether a restoration or filling is indicated.',
    suggestedAction: 'An oral examination with digital imaging would allow the dentist to evaluate the tooth and discuss restoration options.',
    ambiguousFollowUp:
      'Is the tooth currently causing any sensitivity to temperature or sweet foods, or is it mostly food trapping in the area?',
  },

  [DentalClinicalCategory.PULPITIS_ENDODONTICS]: {
    category: DentalClinicalCategory.PULPITIS_ENDODONTICS,
    name: 'Pulpal Inflammation & Endodontic Care',
    cdtReferences: ['D3310', 'D3320', 'D3330'],
    urgency: DentalUrgencyLevel.HIGH,
    isEmergency: false,
    keywords: [
      'throbbing tooth',
      'throbbing at night',
      'root canal',
      'deep toothache',
      'hot coffee hurts',
      'lingering hot pain',
      'nerve pain in tooth',
      'pulpitis',
      'spontaneous tooth pain',
      'tooth wakes me up at night',
      'severe toothache',
      'constant aching tooth',
    ],
    patientPhrases: [
      'my tooth is throbbing at night',
      'hot coffee makes the pain much worse',
      'lingering pain after hot food',
      'think i need a root canal',
      'severe deep toothache',
      'tooth pain that wakes me up',
      'unbearable tooth pain',
    ],
    cautiousExplanation:
      'Persistent throbbing or lingering discomfort to warmth can be associated with irritation or inflammation of the inner dental pulp, which an endodontic or restorative examination can properly evaluate.',
    suggestedAction: 'An urgent clinical exam and periapical X-ray are recommended to identify the source of the discomfort.',
    ambiguousFollowUp:
      'Does the pain linger for several minutes after you have hot liquids, or does it throb constantly even without temperature triggers?',
  },

  [DentalClinicalCategory.ABSCESS_ACUTE_INFECTION]: {
    category: DentalClinicalCategory.ABSCESS_ACUTE_INFECTION,
    name: 'Acute Periapical Abscess & Local Swelling',
    cdtReferences: ['D7510', 'D0140'],
    urgency: DentalUrgencyLevel.URGENT,
    isEmergency: false,
    keywords: [
      'gum boil',
      'pus in gum',
      'swollen gum bump',
      'abscess',
      'pimple on gum',
      'localized swelling',
      'gum bubble',
      'bad taste and swelling',
      'facial tenderness with toothache',
    ],
    patientPhrases: [
      'i have a pimple on my gum that hurts',
      'swelling around my tooth with bad taste',
      'there is a bump on my gum releasing fluid',
      'gum abscess',
      'swollen lump near my tooth',
    ],
    cautiousExplanation:
      'A tender bump on the gum or localized fluid can suggest a localized infection or periodontal pocket that requires prompt clinical attention to prevent spreading.',
    suggestedAction: 'A prompt clinical evaluation and targeted imaging are strongly advised to inspect the area.',
    ambiguousFollowUp:
      'Are you noticing any facial swelling outside your cheek or jaw, or difficulty swallowing or breathing?',
  },

  [DentalClinicalCategory.GINGIVITIS]: {
    category: DentalClinicalCategory.GINGIVITIS,
    name: 'Gingivitis & Superficial Gum Inflammation',
    cdtReferences: ['D1110', 'D4346'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'bleeding gums',
      'gums bleed',
      'red gums',
      'puffy gums',
      'tender gums when brushing',
      'blood when i floss',
      'gingivitis',
      'bleeding when brushing',
    ],
    patientPhrases: [
      'my gums bleed when i brush',
      'blood in the sink after flossing',
      'my gums are tender and reddish',
      'bleeding gums',
      'puffy gum line',
    ],
    cautiousExplanation:
      'Bleeding during brushing or flossing is frequently associated with early gum inflammation (gingivitis), which typically responds well to professional dental hygiene and targeted home care.',
    suggestedAction: 'A professional hygiene scaling and periodontal assessment are recommended.',
    ambiguousFollowUp:
      'Has the bleeding been happening for a while when brushing, or are any teeth feeling slightly loose or tender to chew on?',
  },

  [DentalClinicalCategory.PERIODONTITIS_ADVANCED]: {
    category: DentalClinicalCategory.PERIODONTITIS_ADVANCED,
    name: 'Periodontitis & Deep Periodontal Therapy',
    cdtReferences: ['D4341', 'D4342', 'D4260'],
    urgency: DentalUrgencyLevel.MEDIUM,
    isEmergency: false,
    keywords: [
      'loose tooth',
      'teeth feel loose',
      'receding gums',
      'deep cleaning',
      'gum disease',
      'periodontitis',
      'periodontal scaling',
      'teeth shifting',
      'bone loss around teeth',
      'root planing',
    ],
    patientPhrases: [
      'my teeth feel loose when i chew',
      'my dentist said i need a deep cleaning',
      'receding gums exposing roots',
      'gum disease treatment',
      'periodontal pockets',
      'teeth look longer and are loose',
    ],
    cautiousExplanation:
      'Tooth mobility, gum recession, or deep gum pockets can indicate chronic periodontal condition, which requires specialized deep periodontal scaling and root planing to stabilize supporting bone.',
    suggestedAction: 'A comprehensive periodontal charting and evaluation would be the appropriate first step.',
    ambiguousFollowUp:
      'Are you experiencing active tenderness in the gums, or have you noticed teeth shifting position over time?',
  },

  [DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY]: {
    category: DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY,
    name: 'Third Molar (Wisdom Tooth) & Surgical Extractions',
    cdtReferences: ['D7210', 'D7220', 'D7240'],
    urgency: DentalUrgencyLevel.MEDIUM,
    isEmergency: false,
    keywords: [
      'wisdom tooth',
      'wisdom teeth',
      'back tooth hurts to open mouth',
      'jaw stiffness back molar',
      'pericoronitis',
      'impacted tooth',
      'tooth extraction',
      'pull my tooth',
      'back molar emerging',
      'wisdom tooth pain',
    ],
    patientPhrases: [
      'my back tooth hurts and i have trouble opening my mouth',
      'my wisdom teeth are coming in and hurting',
      'need my wisdom tooth removed',
      'pain in the very back of my jaw',
      'impacted molar',
      'wisdom tooth swollen gum flap',
    ],
    cautiousExplanation:
      'Discomfort behind the rear molars and stiffness in opening can be associated with an emerging or impacted third molar (wisdom tooth), which a dental surgeon evaluates with panoramic imaging.',
    suggestedAction: 'An oral surgery consultation with panoramic radiography is recommended to assess the position of the molar.',
    ambiguousFollowUp:
      'Are you able to swallow comfortably, and is the jaw stiffness preventing you from eating normally?',
  },

  [DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION]: {
    category: DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION,
    name: 'Fractured Tooth & Indirect Crown Restoration',
    cdtReferences: ['D2740', 'D2750', 'D2950'],
    urgency: DentalUrgencyLevel.HIGH,
    isEmergency: false,
    keywords: [
      'cracked tooth',
      'chipped tooth',
      'broken tooth',
      'tooth broke off',
      'broke off',
      'piece broke off',
      'lost a piece of tooth',
      'sharp tooth edge',
      'crown fell off',
      'lost my crown',
      'bit down on something hard and tooth broke',
      'fractured molar',
      'fractured tooth',
      'broken',
      'chipped',
      'cracked',
      'broke',
    ],
    patientPhrases: [
      'i cracked my tooth while eating',
      'a piece of my tooth broke off',
      'my crown fell off while chewing',
      'sharp edge on my chipped tooth',
      'broken tooth hurts when i bite',
    ],
    cautiousExplanation:
      'A chipped or cracked tooth can leave sensitive internal dentin exposed or affect bite integrity; a dentist will determine whether smoothing, bonding, or a protective crown is most suitable.',
    suggestedAction: 'A restorative dental examination to evaluate structural tooth integrity and preserve the tooth.',
    ambiguousFollowUp:
      'Is the broken tooth sharp against your tongue, or is there sharp pain whenever you release your bite?',
  },

  [DentalClinicalCategory.IMPLANT_PROSTHODONTICS]: {
    category: DentalClinicalCategory.IMPLANT_PROSTHODONTICS,
    name: 'Dental Implant Consultation & Surgical Replacement',
    cdtReferences: ['D6010', 'D6058', 'D6065'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'dental implant',
      'dental implants',
      'screw tooth',
      'replace missing tooth',
      'tooth implant',
      'implant consultation',
      'artificial tooth root',
      'permanent tooth replacement',
      'implant bridge',
      'lost a tooth',
      'lost tooth',
      'missing tooth',
      'replace it',
      'replace a tooth',
      'tooth replacement',
    ],
    patientPhrases: [
      'i want a screw tooth',
      'i need a dental implant for a missing tooth',
      'can i get an implant consultation',
      'replace my missing front tooth with an implant',
      'how much are dental implants',
      'implant tooth replacement',
      'lost a tooth a few months ago and want to replace it',
      'lost a tooth and want to replace it',
      'i lost a tooth',
    ],
    cautiousExplanation:
      'A dental implant consultation evaluates bone density and space to determine whether a biocompatible implant fixture and custom crown are suitable for replacing a missing tooth.',
    suggestedAction: 'A dedicated dental implant assessment including 3D imaging is typically the first step.',
  },

  [DentalClinicalCategory.DENTURES_REMOVABLE]: {
    category: DentalClinicalCategory.DENTURES_REMOVABLE,
    name: 'Removable Dentures & Prosthodontic Prostheses',
    cdtReferences: ['D5110', 'D5120', 'D5213', 'D5410'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'denture',
      'dentures',
      'false teeth',
      'loose dentures',
      'partial denture',
      'full dentures',
      'denture sore',
      'reline dentures',
      'new false teeth',
    ],
    patientPhrases: [
      'my dentures are loose and rubbing',
      'i need new false teeth',
      'partial denture adjustment',
      'my lower denture slips when i talk',
      'denture consultation',
    ],
    cautiousExplanation:
      'Loose or uncomfortable dentures can stem from natural ridge resorption or prosthesis wear; a prosthodontic examination can identify if an adjustment, reline, or new appliance is needed.',
    suggestedAction: 'A prosthodontic consultation for denture fit and ridge evaluation.',
  },

  [DentalClinicalCategory.AESTHETIC_WHITENING]: {
    category: DentalClinicalCategory.AESTHETIC_WHITENING,
    name: 'Aesthetic Enamel Bleaching & Whitening',
    cdtReferences: ['D9972', 'D9975'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'teeth whitening',
      'tooth whitening',
      'yellow teeth',
      'stained teeth',
      'bleach teeth',
      'whiten my smile',
      'laser whitening',
      'in-office whitening',
      'brighten my teeth',
      'coffee stains on teeth',
    ],
    patientPhrases: [
      'i want to whiten my teeth',
      'my teeth look yellow and stained',
      'teeth whitening consultation',
      'do you do laser whitening',
      'brighten my smile',
    ],
    cautiousExplanation:
      'Professional in-office or take-home whitening safely lifts surface and deeper enamel stains under dental supervision following an initial oral health check.',
    suggestedAction: 'A cosmetic whitening consultation to confirm enamel health and determine the optimal shade treatment.',
  },

  [DentalClinicalCategory.ORTHODONTICS_ALIGNERS]: {
    category: DentalClinicalCategory.ORTHODONTICS_ALIGNERS,
    name: 'Orthodontic Alignment & Clear Aligners',
    cdtReferences: ['D8080', 'D8090', 'D8660'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'braces',
      'invisible braces',
      'clear aligners',
      'invisalign',
      'crooked teeth',
      'straighten teeth',
      'gap between teeth',
      'orthodontist',
      'orthodontic consult',
      'underbite',
      'overbite',
      'crowded teeth',
    ],
    patientPhrases: [
      'i want invisible braces',
      'can i get clear aligners to straighten my teeth',
      'orthodontic consultation for crooked teeth',
      'gap between my front teeth',
      'do you provide braces for adults',
    ],
    cautiousExplanation:
      'Orthodontic treatment plans assess bite alignment, crowding, and jaw mechanics to identify whether clear aligners or specialized brackets are appropriate.',
    suggestedAction: 'An orthodontic assessment with diagnostic digital scanning.',
  },

  [DentalClinicalCategory.BRUXISM_TMJ]: {
    category: DentalClinicalCategory.BRUXISM_TMJ,
    name: 'Temporomandibular Joint (TMJ) & Night Guards',
    cdtReferences: ['D7880', 'D9944'],
    urgency: DentalUrgencyLevel.MEDIUM,
    isEmergency: false,
    keywords: [
      'jaw clicking',
      'jaw popping',
      'clicking when chewing',
      'grinding teeth',
      'teeth clenching',
      'night guard',
      'jaw pain waking up',
      'tmj',
      'tmd',
      'tight jaw muscles',
      'bite splint',
    ],
    patientPhrases: [
      'my jaw clicks when i chew',
      'i wake up with jaw soreness and clenched teeth',
      'my partner says i grind my teeth at night',
      'need a night guard for grinding',
      'clicking sound near my ear when opening mouth',
    ],
    cautiousExplanation:
      'Jaw clicking, morning muscle fatigue, or wear facets can be associated with nighttime bruxism or TMJ joint dynamics, which a clinical evaluation can assess.',
    suggestedAction: 'A clinical TMJ and occlusal evaluation to discuss diagnostic findings and protective splint therapy.',
    ambiguousFollowUp:
      'Does your jaw ever lock in place where you cannot close or open it, or is it mainly clicking with mild tightness?',
  },

  [DentalClinicalCategory.DENTAL_SENSITIVITY]: {
    category: DentalClinicalCategory.DENTAL_SENSITIVITY,
    name: 'Dentin Hypersensitivity & Enamel Desensitization',
    cdtReferences: ['D9910', 'D0140'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'sensitive to cold',
      'cold sensitivity',
      'sensitive to cold water',
      'sharp zinger from ice',
      'sensitive teeth when breathing cold air',
      'enamel erosion sensitivity',
      'dentin sensitivity',
    ],
    patientPhrases: [
      'cold water gives me a sharp pain that quickly goes away',
      'my teeth are sensitive to cold ice',
      'sharp zinger when i drink cold juice',
      'brushing with cold water hurts my teeth',
    ],
    cautiousExplanation:
      'Brief, sharp sensation to cold that subsides immediately can suggest exposed root dentin, micro-wear, or enamel recession rather than deep nerve pathology.',
    suggestedAction: 'A targeted dental examination to evaluate enamel margins and recommend professional desensitizing therapy.',
    ambiguousFollowUp:
      'Does the sensitivity go away immediately once the cold liquid is gone, or does it throb for a few minutes afterwards?',
  },

  [DentalClinicalCategory.TRAUMA_EMERGENCY_AVULSION]: {
    category: DentalClinicalCategory.TRAUMA_EMERGENCY_AVULSION,
    name: 'Acute Dental Trauma, Luxation & Tooth Avulsion',
    cdtReferences: ['D7270', 'D0140'],
    urgency: DentalUrgencyLevel.CRITICAL,
    isEmergency: true,
    keywords: [
      'knocked out',
      'tooth knocked out',
      'tooth got knocked out',
      'knocked-out tooth',
      'avulsed tooth',
      'avulsed',
      'avulsion',
      'tooth fell out after hit',
      'tooth came out',
      'hit in the face tooth loose',
      'dental trauma',
      'sports injury to mouth',
      'permanent tooth knocked out',
      'permanent tooth got knocked out',
      'tooth pushed back into gum',
    ],
    patientPhrases: [
      'my permanent tooth got knocked out completely during sports',
      'my permanent tooth got knocked out',
      'my tooth got knocked out completely',
      'hit in the mouth and tooth came out',
      'permanent tooth was knocked out during sports',
      'dental trauma tooth fell out',
    ],
    cautiousExplanation:
      'A knocked-out (avulsed) permanent tooth is a time-critical dental emergency where reimplantation within 30 to 60 minutes offers the highest chance of saving the tooth.',
    suggestedAction: 'Handle the tooth only by the crown, keep it moist in cold milk or saliva, and seek urgent clinical emergency care immediately.',
  },

  [DentalClinicalCategory.ORTHODONTIC_APPLIANCE_EMERGENCY]: {
    category: DentalClinicalCategory.ORTHODONTIC_APPLIANCE_EMERGENCY,
    name: 'Orthodontic Appliance Poking Wire & Loose Bracket',
    cdtReferences: ['D8680', 'D0140'],
    urgency: DentalUrgencyLevel.MEDIUM,
    isEmergency: false,
    keywords: [
      'bracket came off',
      'loose bracket',
      'poking wire',
      'wire poking my cheek',
      'broken braces wire',
      'orthodontic wire loose',
      'broken expander',
    ],
    patientPhrases: [
      'one of my braces brackets came off',
      'wire is poking into my cheek',
      'bracket is spinning on the wire',
      'broken wire on my braces',
    ],
    cautiousExplanation:
      'A loose orthodontic bracket or protruding wire can be associated with soft tissue irritation; orthodontic wax provides immediate temporary relief until an adjustment appointment.',
    suggestedAction: 'An orthodontic repair appointment to trim the wire and securely rebond the bracket.',
  },

  [DentalClinicalCategory.PEDIATRIC_PREVENTIVE]: {
    category: DentalClinicalCategory.PEDIATRIC_PREVENTIVE,
    name: 'Pediatric Dental Care & Primary Tooth Evaluation',
    cdtReferences: ['D0145', 'D1206', 'D1351'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'baby tooth',
      'child checkup',
      'toddler dentist',
      'pediatric dental',
      'child cavity',
      'baby tooth not falling out',
      'kid teeth cleaning',
      'fluoride treatment child',
      'sealants child',
      'pediatric specialist',
    ],
    patientPhrases: [
      "my child's baby tooth is not falling out",
      'need a pediatric checkup for my five year old',
      'first dental visit for my toddler',
      'baby tooth has a dark spot',
      'sealants for my kid',
    ],
    cautiousExplanation:
      'Pediatric dental visits focus on gentle developmental monitoring of primary teeth, eruption sequence, cavity prevention, and habit guidance in a comfortable setting.',
    suggestedAction: 'A specialized pediatric preventive examination and gentle evaluation.',
    ambiguousFollowUp:
      'Is your child feeling any discomfort or swelling around the tooth, or is it primarily a routine milestone check?',
  },

  [DentalClinicalCategory.COSMETIC_SMILE_DESIGN]: {
    category: DentalClinicalCategory.COSMETIC_SMILE_DESIGN,
    name: 'Cosmetic Veneers & Smile Makeover Design',
    cdtReferences: ['D2962', 'D9972'],
    urgency: DentalUrgencyLevel.ROUTINE,
    isEmergency: false,
    keywords: [
      'veneers',
      'porcelain veneers',
      'smile makeover',
      'composite bonding',
      'cosmetic dentistry',
      'uneven smile',
      'fix my smile',
      'cosmetic consult',
    ],
    patientPhrases: [
      'i want veneers for my front teeth',
      'smile makeover consultation',
      'fix gap and uneven shape with veneers',
      'cosmetic bonding for chipped front tooth',
    ],
    cautiousExplanation:
      'A cosmetic smile consultation evaluates facial symmetry, tooth proportion, and enamel thickness to explore ceramic veneers or aesthetic bonding.',
    suggestedAction: 'A comprehensive aesthetic dental consultation with digital smile imaging.',
  },
};

/**
 * High-risk systemic emergency triggers that MUST bypass booking immediately.
 */
export const CRITICAL_EMERGENCY_TRIGGERS: string[] = [
  'trouble breathing',
  'difficulty breathing',
  'cannot breathe',
  'cant breathe',
  'airway',
  'choking',
  'throat is swelling',
  'throat swelling',
  'face is swelling closing my eye',
  'eye is swollen shut',
  'severe facial swelling',
  'rapidly spreading swelling',
  'uncontrolled bleeding',
  'bleeding wont stop',
  'bleeding will not stop',
  'continuous heavy bleeding',
  'tooth knocked out',
  'tooth got knocked out',
  'knocked-out tooth',
  'avulsed tooth',
];

/**
 * Checks whether an utterance indicates an urgent, life-safety dental emergency.
 */
export function isLifeThreateningDentalEmergency(input: string): boolean {
  if (!input) return false;
  const clean = input.toLowerCase();
  return (
    CRITICAL_EMERGENCY_TRIGGERS.some((trig) => clean.includes(trig)) ||
    /\b(cannot breathe|can't breathe|trouble breathing|difficulty breathing|throat swelling|throat is swelling|closing my eye|eye is swollen shut)\b/i.test(
      clean
    )
  );
}

/**
 * Checks whether an utterance indicates spreading facial or cheek swelling requiring
 * urgent dental infection evaluation rather than routine or service-unavailable dismissal.
 */
export function isSpreadingFacialSwelling(input: string): boolean {
  if (!input) return false;
  const clean = input.toLowerCase();
  return /\b(cheek is starting to swell|cheek is swelling|face is getting swollen|face is swelling|swelling is spreading|swelling in my cheek|cheek is swollen and gum|gum is swollen and my cheek|swollen cheek and gum|gum is swollen and cheek)\b/i.test(
    clean
  );
}

/**
 * Matches a patient's natural language complaint to the global dental knowledge catalogue.
 */
export function matchGlobalDentalComplaint(input: string): {
  matched: boolean;
  entry?: DentalKnowledgeEntry;
  score: number;
  matchedCategories?: DentalClinicalCategory[];
} {
  if (!input) return { matched: false, score: 0 };
  const clean = input.toLowerCase().replace(/[?!,.]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = clean.split(/\s+/);

  let bestEntry: DentalKnowledgeEntry | null = null;
  let bestScore = 0;
  const scoredEntries: Array<{ entry: DentalKnowledgeEntry; score: number }> = [];

  for (const entry of Object.values(GLOBAL_DENTAL_CATALOGUE)) {
    let score = 0;

    // Check high-fidelity exact patient phrase matches
    for (const phrase of entry.patientPhrases) {
      if (clean.includes(phrase)) {
        score += 8;
      }
    }

    // Check keyword and synonym matches
    for (const kw of entry.keywords) {
      if (kw.includes(' ')) {
        if (clean.includes(kw)) score += 4;
      } else {
        if (tokens.includes(kw)) score += 2;
        else if (clean.includes(kw)) score += 1;
      }
    }

    if (score >= 2) {
      scoredEntries.push({ entry, score });
    }

    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  scoredEntries.sort((a, b) => b.score - a.score);
  const matchedCategories = scoredEntries.map((s) => s.entry.category);

  if (bestEntry && bestScore >= 2) {
    return {
      matched: true,
      entry: bestEntry,
      score: bestScore,
      matchedCategories,
    };
  }

  return { matched: false, score: 0, matchedCategories: [] };
}

/**
 * Checks whether a complaint is too generic (e.g. "my tooth hurts") and warrants
 * a gentle receptionist follow-up question before committing to an examination category.
 */
export function getAmbiguousSymptomFollowUp(input: string): string | null {
  if (!input) return null;
  const clean = input.toLowerCase().trim();

  // Vague oral or mouth sensation ("something feels weird", "something is wrong") without specific symptoms
  if (
    /\b(something (feels? (weird|off|strange|wrong|different|uncomfortable)|is wrong)|don't know what's wrong|not feeling right in my mouth|issue in my mouth|trouble in my mouth|problem with my mouth)\b/i.test(
      clean
    ) &&
    !/\b(hurts?|pain|ache|aching|throbbing|sensitive|sensitivity|cold|hot|swollen|swelling|bleeding|broke|broken|chipped)\b/i.test(
      clean
    )
  ) {
    return 'I can help with that. Are you noticing pain, sensitivity, swelling, bleeding, a broken tooth, or something else?';
  }

  // Generic toothache without specific trigger
  if (
    /^(my )?(tooth|teeth) (hurts?|is hurting|pains?|ache|aching)$/i.test(clean) ||
    /^(i have (a )?(tooth ache|toothache|tooth pain|pain in my tooth))$/i.test(clean)
  ) {
    return 'Is the discomfort constant and throbbing, or does it mainly happen when you bite down or drink something hot or cold?';
  }

  // Generic jaw pain
  if (/^(my )?jaw hurts?|pain in my jaw$/i.test(clean)) {
    return 'Does the jaw discomfort occur when opening and chewing, or is there swelling or difficulty swallowing?';
  }

  // Generic mouth pain
  if (/^my mouth hurts|discomfort in my mouth$/i.test(clean)) {
    return 'Could you tell me if the discomfort is located around a specific tooth, your gums, or when chewing food?';
  }

  return null;
}
