import { z } from 'zod';
import { AITool, AIToolResult } from '../types/tool.types';
import { AIConversationContext } from '../types/context.types';
import { toolRegistry } from './registry';
import {
  getClinicKnowledge,
  findDoctorCabin,
  ClinicNavigationInfo,
  PatientGuidanceInfo,
  EmergencyPolicyInfo,
} from '../knowledge';

// ----------------------------------------------------------------------------
// TOOL 1: GET CLINIC DIRECTIONS & WAYFINDING
// ----------------------------------------------------------------------------
export const getClinicDirectionsSchema = z.object({
  destination: z.string().optional(),
});

export type GetClinicDirectionsInput = z.infer<typeof getClinicDirectionsSchema>;

export const getClinicDirectionsTool: AITool<GetClinicDirectionsInput, ClinicNavigationInfo | null> = {
  name: 'get_clinic_directions',
  description: 'Retrieves navigation directions from entrance to reception desk, waiting lounge, and medical wings.',
  schema: getClinicDirectionsSchema,
  definition: {
    name: 'get_clinic_directions',
    description: 'Retrieves navigation directions from entrance to reception desk, waiting lounge, and medical wings.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'Optional destination like reception, waiting area, or doctor room',
        },
      },
    },
  },
  async execute(
    _input: GetClinicDirectionsInput,
    context: AIConversationContext
  ): Promise<AIToolResult<ClinicNavigationInfo | null>> {
    const profile = getClinicKnowledge(context.businessId);
    if (!profile) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PROFILE_NOT_CONFIGURED',
          message: `Clinic directions not configured for business ID '${context.businessId}'.`,
        },
      };
    }

    return {
      success: true,
      data: profile.navigation,
    };
  },
};

// ----------------------------------------------------------------------------
// TOOL 2: GET DOCTOR CABIN / ROOM LOCATION
// ----------------------------------------------------------------------------
export const getCabinLocationSchema = z.object({
  query: z.string(),
});

export type GetCabinLocationInput = z.infer<typeof getCabinLocationSchema>;

export interface CabinLocationResult {
  doctorName?: string;
  cabin?: string;
  wing?: string;
  floor?: string;
  directions?: string;
}

export const getCabinLocationTool: AITool<GetCabinLocationInput, CabinLocationResult | null> = {
  name: 'get_cabin_location',
  description: 'Finds the consultation room, cabin number, floor, and directions for a specific doctor or specialist.',
  schema: getCabinLocationSchema,
  definition: {
    name: 'get_cabin_location',
    description: 'Finds the consultation room, cabin number, floor, and directions for a specific doctor or specialist.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Doctor name, specialty, or room number query',
        },
      },
      required: ['query'],
    },
  },
  async execute(
    input: GetCabinLocationInput,
    context: AIConversationContext
  ): Promise<AIToolResult<CabinLocationResult | null>> {
    const result = findDoctorCabin(context.businessId, input.query);
    if (!result || result.notFound) {
      return {
        success: false,
        data: null,
        error: {
          code: 'CABIN_NOT_FOUND',
          message: `No specific doctor cabin found matching '${input.query}'.`,
        },
      };
    }

    if (result.doctor) {
      return {
        success: true,
        data: {
          doctorName: result.doctor.name,
          cabin: result.doctor.cabin,
          wing: result.doctor.wing,
          floor: result.doctor.floor,
          directions: result.directions,
        },
      };
    }

    return {
      success: true,
      data: {
        directions: result.directions,
      },
    };
  },
};

// ----------------------------------------------------------------------------
// TOOL 3: GET WAITING AREA & PATIENT ARRIVAL POLICY
// ----------------------------------------------------------------------------
export const getWaitingPolicySchema = z.object({});

export type GetWaitingPolicyInput = z.infer<typeof getWaitingPolicySchema>;

export const getWaitingPolicyTool: AITool<GetWaitingPolicyInput, PatientGuidanceInfo | null> = {
  name: 'get_waiting_policy',
  description: 'Retrieves patient guidance regarding waiting area, check-in, early arrival, and late arrival policies.',
  schema: getWaitingPolicySchema,
  definition: {
    name: 'get_waiting_policy',
    description: 'Retrieves patient guidance regarding waiting area, check-in, early arrival, and late arrival policies.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  async execute(
    _input: GetWaitingPolicyInput,
    context: AIConversationContext
  ): Promise<AIToolResult<PatientGuidanceInfo | null>> {
    const profile = getClinicKnowledge(context.businessId);
    if (!profile) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PROFILE_NOT_CONFIGURED',
          message: `Patient guidance not configured for business ID '${context.businessId}'.`,
        },
      };
    }

    return {
      success: true,
      data: profile.patientGuidance,
    };
  },
};

// ----------------------------------------------------------------------------
// TOOL 4: GET EMERGENCY DENTAL PROTOCOL
// ----------------------------------------------------------------------------
export const getEmergencyPolicySchema = z.object({});

export type GetEmergencyPolicyInput = z.infer<typeof getEmergencyPolicySchema>;

export const getEmergencyPolicyTool: AITool<GetEmergencyPolicyInput, EmergencyPolicyInfo | null> = {
  name: 'get_emergency_policy',
  description: 'Retrieves urgent triage warnings and emergency instructions for acute dental trauma.',
  schema: getEmergencyPolicySchema,
  definition: {
    name: 'get_emergency_policy',
    description: 'Retrieves urgent triage warnings and emergency instructions for acute dental trauma.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  async execute(
    _input: GetEmergencyPolicyInput,
    context: AIConversationContext
  ): Promise<AIToolResult<EmergencyPolicyInfo | null>> {
    const profile = getClinicKnowledge(context.businessId);
    if (!profile) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PROFILE_NOT_CONFIGURED',
          message: `Emergency policy not configured for business ID '${context.businessId}'.`,
        },
      };
    }

    return {
      success: true,
      data: profile.emergencyPolicy,
    };
  },
};

// Register clinic info tools into global registry
toolRegistry.register(getClinicDirectionsTool);
toolRegistry.register(getCabinLocationTool);
toolRegistry.register(getWaitingPolicyTool);
toolRegistry.register(getEmergencyPolicyTool);
