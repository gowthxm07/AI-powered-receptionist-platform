import { DentalClinicalCategory } from './global-dental-catalogue';

export interface ServiceMappingInfo {
  serviceId: string;
  serviceName: string;
  defaultStaffId?: string;
  defaultStaffName?: string;
}

export interface ClinicCapabilityProfile {
  businessId: string;
  clinicName: string;
  supportedCategories: DentalClinicalCategory[];
  categoryToServiceMap: Partial<Record<DentalClinicalCategory, ServiceMappingInfo>>;
  categoryLabels: Partial<Record<DentalClinicalCategory, string>>;
}

export const LUMINA_DENTAL_BUSINESS_ID = 'b0000001-0000-0000-0000-000000000001';
export const APEX_ENDODONTICS_BUSINESS_ID = 'b0000002-0000-0000-0000-000000000002';
export const ZENITH_IMPLANTS_BUSINESS_ID = 'b0000003-0000-0000-0000-000000000003';
export const RADIANCE_PEDIATRIC_BUSINESS_ID = 'b0000004-0000-0000-0000-000000000004';

export const CLINIC_CAPABILITY_PROFILES: Record<string, ClinicCapabilityProfile> = {
  // 1. Lumina Dental Care (Family & Cosmetic General Dentistry)
  [LUMINA_DENTAL_BUSINESS_ID]: {
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    clinicName: 'Lumina Dental Care',
    supportedCategories: [
      DentalClinicalCategory.PREVENTIVE_ROUTINE,
      DentalClinicalCategory.CARIES_RESTORATION,
      DentalClinicalCategory.AESTHETIC_WHITENING,
      DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION,
      DentalClinicalCategory.PEDIATRIC_PREVENTIVE,
      DentalClinicalCategory.DENTAL_SENSITIVITY,
      DentalClinicalCategory.GINGIVITIS,
    ],
    categoryToServiceMap: {
      [DentalClinicalCategory.PREVENTIVE_ROUTINE]: {
        serviceId: 'sv000002-0000-0000-0000-000000000002',
        serviceName: 'Ultrasonic Prophylaxis Hygiene Scaling',
        defaultStaffId: 's0000003-0000-0000-0000-000000000003',
        defaultStaffName: 'Sarah Jenkins, RDH',
      },
      [DentalClinicalCategory.CARIES_RESTORATION]: {
        serviceId: 'sv000001-0000-0000-0000-000000000001',
        serviceName: 'Comprehensive Oral Exam & Digital X-Rays',
        defaultStaffId: 's0000001-0000-0000-0000-000000000001',
        defaultStaffName: 'Dr. Marcus Thorne',
      },
      [DentalClinicalCategory.AESTHETIC_WHITENING]: {
        serviceId: 'sv000003-0000-0000-0000-000000000003',
        serviceName: 'Laser Enamel Whitening & Brightening',
        defaultStaffId: 's0000001-0000-0000-0000-000000000001',
        defaultStaffName: 'Dr. Marcus Thorne',
      },
      [DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION]: {
        serviceId: 'sv000004-0000-0000-0000-000000000004',
        serviceName: 'Ceramic Crown Preparation & Digital 3D Scan',
        defaultStaffId: 's0000001-0000-0000-0000-000000000001',
        defaultStaffName: 'Dr. Marcus Thorne',
      },
      [DentalClinicalCategory.PEDIATRIC_PREVENTIVE]: {
        serviceId: 'sv000005-0000-0000-0000-000000000005',
        serviceName: 'Pediatric Preventive Dental Evaluation',
        defaultStaffId: 's0000002-0000-0000-0000-000000000002',
        defaultStaffName: 'Dr. Emily Chen',
      },
      [DentalClinicalCategory.DENTAL_SENSITIVITY]: {
        serviceId: 'sv000001-0000-0000-0000-000000000001',
        serviceName: 'Comprehensive Oral Exam & Digital X-Rays',
        defaultStaffId: 's0000001-0000-0000-0000-000000000001',
        defaultStaffName: 'Dr. Marcus Thorne',
      },
      [DentalClinicalCategory.GINGIVITIS]: {
        serviceId: 'sv000002-0000-0000-0000-000000000002',
        serviceName: 'Ultrasonic Prophylaxis Hygiene Scaling',
        defaultStaffId: 's0000003-0000-0000-0000-000000000003',
        defaultStaffName: 'Sarah Jenkins, RDH',
      },
    },
    categoryLabels: {
      [DentalClinicalCategory.IMPLANT_PROSTHODONTICS]: 'dental implant treatment',
      [DentalClinicalCategory.DENTURES_REMOVABLE]: 'denture prosthodontics',
      [DentalClinicalCategory.PULPITIS_ENDODONTICS]: 'root canal and endodontic surgery',
      [DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY]: 'wisdom tooth oral surgery',
      [DentalClinicalCategory.PERIODONTITIS_ADVANCED]: 'advanced periodontal surgery',
      [DentalClinicalCategory.ORTHODONTICS_ALIGNERS]: 'comprehensive clear aligner therapy',
    },
  },

  // 2. Apex Endodontics & Oral Surgery
  [APEX_ENDODONTICS_BUSINESS_ID]: {
    businessId: APEX_ENDODONTICS_BUSINESS_ID,
    clinicName: 'Apex Endodontics & Oral Surgery',
    supportedCategories: [
      DentalClinicalCategory.PULPITIS_ENDODONTICS,
      DentalClinicalCategory.ABSCESS_ACUTE_INFECTION,
      DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY,
      DentalClinicalCategory.TRAUMA_EMERGENCY_AVULSION,
      DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION,
    ],
    categoryToServiceMap: {
      [DentalClinicalCategory.PULPITIS_ENDODONTICS]: {
        serviceId: 'sv000006-0000-0000-0000-000000000006',
        serviceName: 'Microscopic Root Canal Therapy',
        defaultStaffId: 's0000005-0000-0000-0000-000000000005',
        defaultStaffName: 'Dr. Alistair Sterling',
      },
      [DentalClinicalCategory.ABSCESS_ACUTE_INFECTION]: {
        serviceId: 'sv000007-0000-0000-0000-000000000007',
        serviceName: 'Surgical Apicoectomy & Retrograde Filling',
        defaultStaffId: 's0000005-0000-0000-0000-000000000005',
        defaultStaffName: 'Dr. Alistair Sterling',
      },
      [DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY]: {
        serviceId: 'sv000008-0000-0000-0000-000000000008',
        serviceName: 'Impacted Wisdom Tooth Extraction',
        defaultStaffId: 's0000006-0000-0000-0000-000000000006',
        defaultStaffName: 'Dr. Marcus Vance',
      },
      [DentalClinicalCategory.TRAUMA_EMERGENCY_AVULSION]: {
        serviceId: 'sv000009-0000-0000-0000-000000000009',
        serviceName: 'Dental Trauma Stabilization & Splinting',
        defaultStaffId: 's0000006-0000-0000-0000-000000000006',
        defaultStaffName: 'Dr. Marcus Vance',
      },
      [DentalClinicalCategory.FRACTURED_TOOTH_RESTORATION]: {
        serviceId: 'sv000010-0000-0000-0000-000000000010',
        serviceName: 'Emergency Pulpotomy & Coronal Seal',
        defaultStaffId: 's0000005-0000-0000-0000-000000000005',
        defaultStaffName: 'Dr. Alistair Sterling',
      },
    },
    categoryLabels: {
      [DentalClinicalCategory.IMPLANT_PROSTHODONTICS]: 'dental implant surgery',
      [DentalClinicalCategory.AESTHETIC_WHITENING]: 'cosmetic whitening',
      [DentalClinicalCategory.ORTHODONTICS_ALIGNERS]: 'clear aligners and braces',
      [DentalClinicalCategory.DENTURES_REMOVABLE]: 'removable dentures',
      [DentalClinicalCategory.PEDIATRIC_PREVENTIVE]: 'pediatric oral care',
    },
  },

  // 3. Zenith Dental Implants & Periodontics
  [ZENITH_IMPLANTS_BUSINESS_ID]: {
    businessId: ZENITH_IMPLANTS_BUSINESS_ID,
    clinicName: 'Zenith Dental Implants & Periodontics',
    supportedCategories: [
      DentalClinicalCategory.IMPLANT_PROSTHODONTICS,
      DentalClinicalCategory.PERIODONTITIS_ADVANCED,
      DentalClinicalCategory.DENTURES_REMOVABLE,
      DentalClinicalCategory.GINGIVITIS,
      DentalClinicalCategory.PREVENTIVE_ROUTINE,
    ],
    categoryToServiceMap: {
      [DentalClinicalCategory.IMPLANT_PROSTHODONTICS]: {
        serviceId: 'sv000011-0000-0000-0000-000000000011',
        serviceName: 'Dental Implant Consultation & 3D Cone Beam Scan',
        defaultStaffId: 's0000009-0000-0000-0000-000000000009',
        defaultStaffName: 'Dr. Elena Rostova',
      },
      [DentalClinicalCategory.PERIODONTITIS_ADVANCED]: {
        serviceId: 'sv000012-0000-0000-0000-000000000012',
        serviceName: 'Periodontal Flap Debridement & Regenerative Therapy',
        defaultStaffId: 's0000009-0000-0000-0000-000000000009',
        defaultStaffName: 'Dr. Elena Rostova',
      },
      [DentalClinicalCategory.DENTURES_REMOVABLE]: {
        serviceId: 'sv000013-0000-0000-0000-000000000013',
        serviceName: 'Precision Removable Denture Evaluation',
        defaultStaffId: 's0000010-0000-0000-0000-000000000010',
        defaultStaffName: 'Dr. Liam O’Connor',
      },
      [DentalClinicalCategory.GINGIVITIS]: {
        serviceId: 'sv000014-0000-0000-0000-000000000014',
        serviceName: 'Deep Ultrasonic Periodontal Maintenance',
        defaultStaffId: 's0000011-0000-0000-0000-000000000011',
        defaultStaffName: 'Nina Kowalski, RDH',
      },
      [DentalClinicalCategory.PREVENTIVE_ROUTINE]: {
        serviceId: 'sv000015-0000-0000-0000-000000000015',
        serviceName: 'Periodontal Preventive Recall Examination',
        defaultStaffId: 's0000010-0000-0000-0000-000000000010',
        defaultStaffName: 'Dr. Liam O’Connor',
      },
    },
    categoryLabels: {
      [DentalClinicalCategory.ORTHODONTICS_ALIGNERS]: 'orthodontic aligners and braces',
      [DentalClinicalCategory.PEDIATRIC_PREVENTIVE]: 'pediatric dentistry',
      [DentalClinicalCategory.AESTHETIC_WHITENING]: 'laser enamel whitening',
      [DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY]: 'wisdom tooth extractions',
    },
  },

  // 4. Radiance Pediatric & Orthodontic Dental
  [RADIANCE_PEDIATRIC_BUSINESS_ID]: {
    businessId: RADIANCE_PEDIATRIC_BUSINESS_ID,
    clinicName: 'Radiance Pediatric & Orthodontic Dental',
    supportedCategories: [
      DentalClinicalCategory.PEDIATRIC_PREVENTIVE,
      DentalClinicalCategory.ORTHODONTICS_ALIGNERS,
      DentalClinicalCategory.ORTHODONTIC_APPLIANCE_EMERGENCY,
      DentalClinicalCategory.PREVENTIVE_ROUTINE,
      DentalClinicalCategory.DENTAL_SENSITIVITY,
    ],
    categoryToServiceMap: {
      [DentalClinicalCategory.PEDIATRIC_PREVENTIVE]: {
        serviceId: 'sv000016-0000-0000-0000-000000000016',
        serviceName: 'Pediatric Comprehensive Dental Examination & Sealants',
        defaultStaffId: 's0000013-0000-0000-0000-000000000013',
        defaultStaffName: 'Dr. Maya Lin',
      },
      [DentalClinicalCategory.ORTHODONTICS_ALIGNERS]: {
        serviceId: 'sv000017-0000-0000-0000-000000000017',
        serviceName: 'Clear Aligner Orthodontic Digital Assessment',
        defaultStaffId: 's0000014-0000-0000-0000-000000000014',
        defaultStaffName: 'Dr. Jordan Lee',
      },
      [DentalClinicalCategory.ORTHODONTIC_APPLIANCE_EMERGENCY]: {
        serviceId: 'sv000018-0000-0000-0000-000000000018',
        serviceName: 'Emergency Orthodontic Bracket & Wire Adjustment',
        defaultStaffId: 's0000014-0000-0000-0000-000000000014',
        defaultStaffName: 'Dr. Jordan Lee',
      },
      [DentalClinicalCategory.PREVENTIVE_ROUTINE]: {
        serviceId: 'sv000019-0000-0000-0000-000000000019',
        serviceName: 'Gentle Child & Teen Hygiene Prophylaxis',
        defaultStaffId: 's0000015-0000-0000-0000-000000000015',
        defaultStaffName: 'Chloe Bennett, RDH',
      },
      [DentalClinicalCategory.DENTAL_SENSITIVITY]: {
        serviceId: 'sv000020-0000-0000-0000-000000000020',
        serviceName: 'Enamel Remineralization & Fluoride Therapy',
        defaultStaffId: 's0000013-0000-0000-0000-000000000013',
        defaultStaffName: 'Dr. Maya Lin',
      },
    },
    categoryLabels: {
      [DentalClinicalCategory.IMPLANT_PROSTHODONTICS]: 'dental implants',
      [DentalClinicalCategory.DENTURES_REMOVABLE]: 'removable dentures',
      [DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY]: 'wisdom tooth surgery',
      [DentalClinicalCategory.PULPITIS_ENDODONTICS]: 'adult root canal treatment',
    },
  },
};

/**
 * Checks if a specific clinical category is supported by the tenant clinic.
 */
export function checkClinicCapability(
  businessId: string,
  category: DentalClinicalCategory
): {
  isSupported: boolean;
  serviceMapping?: ServiceMappingInfo;
  clinicProfile: ClinicCapabilityProfile;
} {
  const profile = CLINIC_CAPABILITY_PROFILES[businessId] || CLINIC_CAPABILITY_PROFILES[LUMINA_DENTAL_BUSINESS_ID];
  const isSupported = profile.supportedCategories.includes(category);
  const serviceMapping = profile.categoryToServiceMap[category];

  return {
    isSupported,
    serviceMapping,
    clinicProfile: profile,
  };
}

/**
 * Generates an empathetic, non-diagnostic response when a requested dental service
 * is not offered by the current clinic, without inventing fake clinics.
 */
export function generateUnavailableCapabilityResponse(
  clinicName: string,
  category: DentalClinicalCategory,
  userUtterance?: string
): string {
  const serviceName = getCategoryFriendlyName(category);

  return (
    `A consultation may be appropriate for evaluating ${serviceName}, depending on a dentist's clinical examination. ` +
    `${clinicName} does not currently list ${serviceName} among its available services. ` +
    `Since we don't currently provide that treatment here, you may want to look for a dental clinic in or near your area that offers ${serviceName}, which may be more convenient for you. ` +
    `I can also help you with the dental services available at ${clinicName}.`
  );
}

function getCategoryFriendlyName(category: DentalClinicalCategory): string {
  switch (category) {
    case DentalClinicalCategory.IMPLANT_PROSTHODONTICS:
      return 'dental implant treatment';
    case DentalClinicalCategory.DENTURES_REMOVABLE:
      return 'removable dentures';
    case DentalClinicalCategory.PULPITIS_ENDODONTICS:
      return 'root canal therapy';
    case DentalClinicalCategory.WISDOM_TOOTH_ORAL_SURGERY:
      return 'wisdom tooth oral surgery';
    case DentalClinicalCategory.PERIODONTITIS_ADVANCED:
      return 'advanced periodontal surgery';
    case DentalClinicalCategory.ORTHODONTICS_ALIGNERS:
      return 'clear aligners and orthodontic treatment';
    case DentalClinicalCategory.AESTHETIC_WHITENING:
      return 'teeth whitening treatments';
    case DentalClinicalCategory.PEDIATRIC_PREVENTIVE:
      return 'pediatric dental care';
    default:
      return 'this specialized dental service';
  }
}
