import { ClinicKnowledgeProfile } from '../clinic-knowledge.types';
import { ZENITH_IMPLANTS_BUSINESS_ID } from '../clinic-capabilities';

export const ZENITH_IMPLANTS_PROFILE: ClinicKnowledgeProfile = {
  businessId: ZENITH_IMPLANTS_BUSINESS_ID,
  businessName: 'Zenith Dental Implants & Periodontics',
  address: '1200 Financial Plaza, Tower 2, Suite 1800, Metropolis',
  phone: '+1-555-019-7733',
  email: 'contact@zenithimplants.demo',
  openingHours: 'Monday to Friday: 8:00 AM – 5:30 PM, Saturday: By Special Implant Consultation, Sunday: Closed',
  facilities: [
    '3D Cone Beam Computed Tomography (CBCT) Scan Center',
    'Dedicated Implant Surgical Operatories 18A & 18B',
    'Periodontal Regenerative Laser Suite',
    'High-Rise Panoramic Patient Consultation Suite',
    'Underground Valet and Self-Parking with Tower 2 Elevators',
  ],
  navigation: {
    entrance: 'Enter Tower 2 of Financial Plaza at 1200 Financial Plaza and take the high-speed express elevators to the 18th Floor.',
    receptionDesk: 'The Zenith Dental Implants reception concierge is immediately visible through glass doors on the 18th Floor, Suite 1800.',
    waitingLounge:
      'Our executive patient consultation lounge provides skyline views, espresso, chilled water, and digital treatment planning displays.',
    amenities: [
      'Complimentary espresso and chilled sparkling water',
      'Panoramic skyline view seating',
      'High-speed patient Wi-Fi',
      'Private consultation consultation rooms',
    ],
    wingDirections: {
      'West Implant Wing': 'Follow the west hallway past reception. Dr. Elena Rostova is located in Suite 18A.',
      'East Prosthodontic Wing': 'Proceed down the east hallway. Dr. Liam O’Connor is located in Suite 18B.',
    },
  },
  patientGuidance: {
    checkInProcedure:
      'Please check in with our front-desk concierge upon arrival at Suite 1800 on the 18th Floor.',
    earlyArrivalPolicy:
      'We recommend arriving 10 minutes early to review medical health disclosures and enjoy our consultation lounge.',
    lateArrivalPolicy:
      'Please notify our concierge at +1-555-019-7733 if you are running late so we can maintain adequate 3D imaging review time.',
    firstTimePatientInstructions:
      'New implant and periodontal patients should bring dental insurance cards and any prior panoramic scans or bone graft history.',
    parkingInfo:
      'Validated garage parking is available in the Financial Plaza Tower 2 underground parking deck off Plaza Way.',
  },
  emergencyPolicy: {
    emergencySigns: [
      'Acute post-surgical bleeding following implant placement',
      'Rapid facial swelling or high fever after periodontal surgery',
      'Loose or dislodged surgical healing abutment with pain',
    ],
    immediateInstruction:
      'If you have severe swelling affecting swallowing or breathing, please call 911 or visit the nearest emergency facility immediately.',
    emergencyPhone: '+1-555-019-7733 (Option 2 for Surgical On-Call)',
    erInstruction:
      'For active implant surgical emergencies during practice hours, contact our clinical desk directly for same-day priority stabilization.',
  },
  doctors: [
    {
      staffId: 's0000009-0000-0000-0000-000000000009',
      name: 'Dr. Elena Rostova',
      title: 'Periodontist & Implantologist',
      cabin: 'Suite 18A',
      wing: 'West Implant Wing',
      floor: '18th Floor',
      workingDays: 'Monday through Thursday',
      workingHours: '8:00 AM – 4:30 PM',
      handledServices: [
        'Dental Implant Consultation & 3D Cone Beam Scan',
        'Periodontal Flap Debridement & Regenerative Therapy',
      ],
      directions:
        'From reception on the 18th Floor, take the west corridor. Dr. Elena Rostova’s consultation room, Suite 18A, is the second door on your left.',
    },
    {
      staffId: 's0000010-0000-0000-0000-000000000010',
      name: 'Dr. Liam O’Connor',
      title: 'Prosthodontist & Implant Specialist',
      cabin: 'Suite 18B',
      wing: 'East Prosthodontic Wing',
      floor: '18th Floor',
      workingDays: 'Tuesday through Friday',
      workingHours: '8:30 AM – 5:00 PM',
      handledServices: [
        'Precision Removable Denture Evaluation',
        'Periodontal Preventive Recall Examination',
      ],
      directions:
        'From reception on the 18th Floor, proceed down the east hallway. Suite 18B, Dr. Liam O’Connor’s prosthodontic room, is at the end of the hall.',
    },
  ],
  symptomTriageRules: [
    {
      symptomKeywords: ['implant', 'missing tooth', 'screw tooth', 'replace tooth', 'artificial tooth root'],
      suggestedServiceId: 'sv000011-0000-0000-0000-000000000011',
      suggestedServiceName: 'Dental Implant Consultation & 3D Cone Beam Scan',
      recommendedSpecialistId: 's0000009-0000-0000-0000-000000000009',
      recommendedSpecialistName: 'Dr. Elena Rostova',
      triageCategory: 'IMPLANT_PROSTHODONTICS',
      clinicalExplanation:
        'An implant consultation evaluates jawbone density, sinus anatomy, and space to plan biocompatible titanium fixtures for missing teeth.',
      clinicalSafetyDisclaimer: 'A 3D cone-beam radiograph and clinical exam are required to assess bone quality before implant placement.',
    },
    {
      symptomKeywords: ['denture', 'dentures', 'false teeth', 'loose denture', 'partial denture'],
      suggestedServiceId: 'sv000013-0000-0000-0000-000000000013',
      suggestedServiceName: 'Precision Removable Denture Evaluation',
      recommendedSpecialistId: 's0000010-0000-0000-0000-000000000010',
      recommendedSpecialistName: 'Dr. Liam O’Connor',
      triageCategory: 'DENTURES_REMOVABLE',
      clinicalExplanation:
        'Loose or slipping prostheses can cause gum sores and chewing difficulty; an evaluation determines if a reline, refitting, or implant-supported overdenture is indicated.',
      clinicalSafetyDisclaimer: 'A prosthodontist evaluates ridge contours to ensure proper fit and bite harmony.',
    },
  ],
  faqs: [
    {
      id: 'faq-zenith-visitor-01',
      category: 'visitor_policy',
      topic: 'Companion and Visitor Policy',
      keywords: ['visitor', 'family', 'companion', 'bring someone', 'alone'],
      semanticPhrases: ['can my spouse come', 'can i bring someone', 'can my family wait'],
      answer:
        'Companions and family members are welcome to accompany patients to implant consultations and wait in our executive 18th-floor lounge.',
    },
    {
      id: 'faq-zenith-parking-01',
      category: 'parking',
      topic: 'Garage Parking',
      keywords: ['parking', 'garage', 'park', 'valet'],
      semanticPhrases: ['where is parking', 'do you validate parking'],
      answer:
        'We offer validated parking in the Financial Plaza Tower 2 underground parking garage. Bring your parking ticket to reception for validation.',
    },
  ],
};
