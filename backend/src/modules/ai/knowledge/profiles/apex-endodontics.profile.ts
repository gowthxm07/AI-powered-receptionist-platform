import { ClinicKnowledgeProfile } from '../clinic-knowledge.types';
import { APEX_ENDODONTICS_BUSINESS_ID } from '../clinic-capabilities';

export const APEX_ENDODONTICS_PROFILE: ClinicKnowledgeProfile = {
  businessId: APEX_ENDODONTICS_BUSINESS_ID,
  businessName: 'Apex Endodontics & Oral Surgery',
  address: '880 Grand Boulevard, 4th Floor, Metropolis',
  phone: '+1-555-019-4920',
  email: 'care@apexendo.demo',
  openingHours: 'Monday to Friday: 7:30 AM – 5:00 PM, Saturday: Emergency Surgical Triage (8:00 AM – 1:00 PM), Sunday: Closed',
  facilities: [
    'Surgical Operating Microscope Suites 401 & 402',
    'High-Resolution 3D Cone Beam CT Imaging Wing',
    'Dedicated Post-Surgical Recovery Lounge',
    'Direct Elevator Access & Barrier-Free Wheelchair Entry',
    'Reserved Patient Parking in Front Courtyard',
  ],
  navigation: {
    entrance: 'Enter through the main glass revolving doors at 880 Grand Boulevard and take Elevator Bank A to the 4th Floor.',
    receptionDesk: 'The reception desk is located directly opposite the elevator lobby on the 4th Floor.',
    waitingLounge:
      'The quiet post-op and surgical waiting lounge is to the right of reception, featuring dimmable recovery lighting and ergonomic seating.',
    amenities: [
      'Filtered iced water and recovery ice packs',
      'Quiet post-surgical waiting lounge',
      'High-speed secure patient Wi-Fi',
      'Digital touchless check-in stations',
    ],
    wingDirections: {
      'Endodontic Wing': 'Proceed down Corridor A to your left from reception. Suite 401 (Dr. Alistair Sterling) is located here.',
      'Surgical Wing': 'Follow Corridor B to your right from reception. Suite 402 (Dr. Marcus Vance) is located here.',
    },
  },
  patientGuidance: {
    checkInProcedure:
      'Upon exiting the elevator on the 4th Floor, please check in at the front desk with your photo ID and referral slip, or tap in on the digital kiosk.',
    earlyArrivalPolicy:
      'Please arrive 15 minutes before your scheduled surgical or root canal procedure so our clinical team can review medical histories and vitals.',
    lateArrivalPolicy:
      'If you are running more than 15 minutes late, please call our desk at +1-555-019-4920 immediately so we can preserve your surgical microscope block.',
    firstTimePatientInstructions:
      'First-time surgical patients should bring any referral slips from their general dentist, prior dental radiographs, and a current list of medications.',
    parkingInfo:
      'Reserved patient parking is located directly in front of the 880 Grand Boulevard building with barrier-free ramp access to the main lobby elevators.',
  },
  emergencyPolicy: {
    emergencySigns: [
      'Severe, throbbing facial swelling spreading toward the jawline or eye',
      'Airway constriction or difficulty breathing/swallowing',
      'Uncontrolled continuous bleeding following dental trauma',
      'A permanent tooth completely knocked out (avulsed)',
    ],
    immediateInstruction:
      'If you are experiencing airway constriction, difficulty swallowing, or uncontrolled bleeding, please call 911 or go to the nearest emergency department immediately.',
    emergencyPhone: '+1-555-019-4920 (Option 1 for Urgent Surgical Triage)',
    erInstruction:
      'For acute endodontic infections or dental trauma during practice hours, call our urgent triage line at +1-555-019-4920 so our surgeons can prepare an operatory.',
  },
  doctors: [
    {
      staffId: 's0000005-0000-0000-0000-000000000005',
      name: 'Dr. Alistair Sterling',
      title: 'Board-Certified Endodontist',
      cabin: 'Suite 401',
      wing: 'Endodontic Wing',
      floor: '4th Floor',
      workingDays: 'Monday through Friday',
      workingHours: '7:30 AM – 4:30 PM',
      handledServices: [
        'Microscopic Root Canal Therapy',
        'Surgical Apicoectomy & Retrograde Filling',
        'Emergency Pulpotomy & Coronal Seal',
      ],
      directions:
        'From reception on the 4th Floor, turn left down Corridor A. Dr. Alistair Sterling’s operatory, Suite 401, is the first door on your right.',
    },
    {
      staffId: 's0000006-0000-0000-0000-000000000006',
      name: 'Dr. Marcus Vance',
      title: 'Oral & Maxillofacial Surgeon',
      cabin: 'Suite 402',
      wing: 'Surgical Wing',
      floor: '4th Floor',
      workingDays: 'Monday, Tuesday, Thursday, Friday, Saturday',
      workingHours: '8:00 AM – 5:00 PM',
      handledServices: [
        'Impacted Wisdom Tooth Extraction',
        'Dental Trauma Stabilization & Splinting',
      ],
      directions:
        'From reception on the 4th Floor, turn right down Corridor B. Dr. Marcus Vance’s surgical suite, Suite 402, is at the end of the hall.',
    },
  ],
  symptomTriageRules: [
    {
      symptomKeywords: ['root canal', 'throbbing', 'deep pain', 'hot hurts', 'night pain', 'nerve pain'],
      suggestedServiceId: 'sv000006-0000-0000-0000-000000000006',
      suggestedServiceName: 'Microscopic Root Canal Therapy',
      recommendedSpecialistId: 's0000005-0000-0000-0000-000000000005',
      recommendedSpecialistName: 'Dr. Alistair Sterling',
      triageCategory: 'PULPITIS_ENDODONTICS',
      clinicalExplanation:
        'Persistent throbbing or severe lingering pain to warmth may suggest pulpal inflammation requiring microscopic endodontic therapy.',
      clinicalSafetyDisclaimer: 'A clinical examination and digital periapical imaging are required to determine the exact tooth source.',
    },
    {
      symptomKeywords: ['wisdom tooth', 'wisdom teeth', 'back tooth', 'jaw stiffness', 'trouble opening mouth', 'third molar'],
      suggestedServiceId: 'sv000008-0000-0000-0000-000000000008',
      suggestedServiceName: 'Impacted Wisdom Tooth Extraction',
      recommendedSpecialistId: 's0000006-0000-0000-0000-000000000006',
      recommendedSpecialistName: 'Dr. Marcus Vance',
      triageCategory: 'WISDOM_TOOTH_ORAL_SURGERY',
      clinicalExplanation:
        'Rear molar discomfort and jaw opening restriction are frequently associated with impacted wisdom teeth or pericoronal inflammation.',
      clinicalSafetyDisclaimer: 'Our oral surgeon evaluates 3D imaging to assess nerve proximity and recommend appropriate surgical care.',
    },
  ],
  faqs: [
    {
      id: 'faq-apex-visitor-01',
      category: 'visitor_policy',
      topic: 'Visitor and Companion Policy',
      keywords: ['visitor', 'family', 'companion', 'bring someone', 'alone', 'driver'],
      semanticPhrases: ['can someone come with me', 'do i need a driver', 'can family come'],
      answer:
        'Patients undergoing surgical extractions or oral surgery with sedation must be accompanied by an adult companion or driver. Companions may wait comfortably in our 4th floor recovery lounge.',
    },
    {
      id: 'faq-apex-parking-01',
      category: 'parking',
      topic: 'Parking Availability',
      keywords: ['parking', 'park', 'garage'],
      semanticPhrases: ['is parking available', 'where do i park'],
      answer:
        'Reserved patient parking is available directly in front of the 880 Grand Boulevard building with barrier-free elevator access to the 4th floor.',
    },
    {
      id: 'faq-apex-access-01',
      category: 'accessibility',
      topic: 'Elevator and Accessibility',
      keywords: ['wheelchair', 'accessible', 'elevator', 'lift'],
      semanticPhrases: ['is there an elevator', 'are you wheelchair accessible'],
      answer:
        'Yes, our facility at 880 Grand Boulevard has elevator access (Elevator Bank A) directly to our 4th-floor surgical suite and wheelchair-accessible restrooms.',
    },
  ],
};
