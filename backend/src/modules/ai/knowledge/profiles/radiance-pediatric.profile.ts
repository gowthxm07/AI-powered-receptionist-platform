import { ClinicKnowledgeProfile } from '../clinic-knowledge.types';
import { RADIANCE_PEDIATRIC_BUSINESS_ID } from '../clinic-capabilities';

export const RADIANCE_PEDIATRIC_PROFILE: ClinicKnowledgeProfile = {
  businessId: RADIANCE_PEDIATRIC_BUSINESS_ID,
  businessName: 'Radiance Pediatric & Orthodontic Dental',
  address: '350 Fashion Island Avenue, Ground Floor, Metropolis',
  phone: '+1-555-019-8844',
  email: 'care@radianceortho.demo',
  openingHours: 'Monday to Friday: 8:30 AM – 5:30 PM, Saturday: 9:00 AM – 3:00 PM, Sunday: Closed',
  facilities: [
    'Interactive Pediatric Sensory Waiting Zone & Arcade',
    'Low-Dose Digital Pediatric X-Ray Suite',
    'Orthodontic Clear Aligner 3D Scan Bar',
    'Dedicated Family & Stroller-Friendly Consultation Rooms',
    'Designated Stroller Parking & Wheelchair Ground-Floor Access',
  ],
  navigation: {
    entrance: 'Enter directly from Fashion Island Avenue through the colorful ground-floor glass entrance.',
    receptionDesk: 'The friendly family reception desk is straight ahead under the rainbow welcome arch.',
    waitingLounge:
      'The waiting lounge features children’s tablets, interactive books, soothing sensory lighting, and complimentary fruit-infused water for parents.',
    amenities: [
      'Fruit-infused chilled water and herbal teas',
      'Interactive children’s play arcade and books',
      'Complimentary family Wi-Fi',
      'Touchless iPad check-in consoles',
    ],
    wingDirections: {
      'Pediatric Wing': 'Head left past the play nook into the Pediatric Wing. Dr. Maya Lin is in Room 1 (The Jungle Suite).',
      'Orthodontic Wing': 'Head right down the bright corridor. Dr. Jordan Lee is in Room 2 (The Horizon Suite).',
    },
  },
  patientGuidance: {
    checkInProcedure:
      'Parents can check in with our front-desk reception coordinator or use our kid-friendly tablet check-in at the entrance.',
    earlyArrivalPolicy:
      'We suggest arriving 10 minutes prior to appointments so young children can explore our play zone and feel relaxed before care.',
    lateArrivalPolicy:
      'Please call +1-555-019-8844 if you are running late so our pediatric team can adjust treatment pacing to keep children comfortable.',
    firstTimePatientInstructions:
      'Please bring your child’s dental insurance information, any pediatric medical notes, and favorite comfort toy if desired.',
    parkingInfo:
      'Free surface parking with dedicated family spaces and stroller ramps is available directly in front of 350 Fashion Island Avenue.',
  },
  emergencyPolicy: {
    emergencySigns: [
      'Acute dental trauma with avulsed child permanent tooth',
      'Severe facial swelling affecting vision or breathing',
      'Poking orthodontic wire or dislodged appliance causing oral bleeding',
    ],
    immediateInstruction:
      'If your child is experiencing breathing restriction or uncontrollable facial trauma bleeding, call 911 or go to pediatric ER immediately.',
    emergencyPhone: '+1-555-019-8844 (Option 1 for Urgent Pediatric Care)',
    erInstruction:
      'For broken braces, poking wires, or pediatric dental accidents during clinic hours, our team provides same-day priority appointments.',
  },
  doctors: [
    {
      staffId: 's0000013-0000-0000-0000-000000000013',
      name: 'Dr. Maya Lin',
      title: 'Pediatric Dental Specialist',
      cabin: 'Room 1 (The Jungle Suite)',
      wing: 'Pediatric Wing',
      floor: 'Ground Floor',
      workingDays: 'Monday through Thursday, Saturday',
      workingHours: '8:30 AM – 4:30 PM',
      handledServices: [
        'Pediatric Comprehensive Dental Examination & Sealants',
        'Enamel Remineralization & Fluoride Therapy',
      ],
      directions:
        'From the front reception desk, turn left past the play area. Dr. Maya Lin’s room, Room 1 (The Jungle Suite), is the first door on your left.',
    },
    {
      staffId: 's0000014-0000-0000-0000-000000000014',
      name: 'Dr. Jordan Lee',
      title: 'Orthodontist & Clear Aligner Specialist',
      cabin: 'Room 2 (The Horizon Suite)',
      wing: 'Orthodontic Wing',
      floor: 'Ground Floor',
      workingDays: 'Tuesday through Friday, Saturday',
      workingHours: '9:00 AM – 5:00 PM',
      handledServices: [
        'Clear Aligner Orthodontic Digital Assessment',
        'Emergency Orthodontic Bracket & Wire Adjustment',
      ],
      directions:
        'From reception, follow the right hallway. Dr. Jordan Lee’s operatory, Room 2 (The Horizon Suite), is located on your right.',
    },
  ],
  symptomTriageRules: [
    {
      symptomKeywords: ['child', 'baby tooth', 'toddler', 'kid', 'pediatric', 'baby tooth not falling out'],
      suggestedServiceId: 'sv000016-0000-0000-0000-000000000016',
      suggestedServiceName: 'Pediatric Comprehensive Dental Examination & Sealants',
      recommendedSpecialistId: 's0000013-0000-0000-0000-000000000013',
      recommendedSpecialistName: 'Dr. Maya Lin',
      triageCategory: 'PEDIATRIC_PREVENTIVE',
      clinicalExplanation:
        'Pediatric dental visits assess developmental milestones, eruption timing of primary teeth, cavity risk, and gentle preventive care.',
      clinicalSafetyDisclaimer: 'A pediatric dental specialist evaluates your child in a gentle, age-appropriate environment.',
    },
    {
      symptomKeywords: ['braces', 'aligners', 'invisalign', 'crooked teeth', 'gap', 'bracket', 'wire'],
      suggestedServiceId: 'sv000017-0000-0000-0000-000000000017',
      suggestedServiceName: 'Clear Aligner Orthodontic Digital Assessment',
      recommendedSpecialistId: 's0000014-0000-0000-0000-000000000014',
      recommendedSpecialistName: 'Dr. Jordan Lee',
      triageCategory: 'ORTHODONTICS_ALIGNERS',
      clinicalExplanation:
        'An orthodontic assessment includes 3D intraoral optical scanning and bite analysis to determine whether clear aligners or braces are suitable.',
      clinicalSafetyDisclaimer: 'Our orthodontic specialist provides diagnostic imaging to create a personalized alignment plan.',
    },
  ],
  faqs: [
    {
      id: 'faq-radiance-visitor-01',
      category: 'visitor_policy',
      topic: 'Parents and Companions',
      keywords: ['parent', 'mom', 'dad', 'family', 'companion', 'alone'],
      semanticPhrases: ['can parents accompany child', 'can i stay with my child'],
      answer:
        'Parents and guardians are always warmly invited to stay right alongside their children inside our examination and treatment suites during every visit.',
    },
    {
      id: 'faq-radiance-parking-01',
      category: 'parking',
      topic: 'Surface Family Parking',
      keywords: ['parking', 'park', 'stroller'],
      semanticPhrases: ['is parking free', 'where do i park with a stroller'],
      answer:
        'We have free surface parking with designated family parking spaces directly in front of our entrance at 350 Fashion Island Avenue.',
    },
  ],
};
