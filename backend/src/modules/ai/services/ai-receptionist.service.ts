import { FastIntentRouter } from '../routing/intent-router';
import { toolRouter, AIToolRouter } from '../tools';
import { AIAction } from '../types/action.types';
import { AIIntent } from '../types/intent.types';
import {
  AIReceptionistRequest,
  AIReceptionistResponse,
} from '../types/request-response.types';
import {
  AIModel,
  DEFAULT_RECEPTIONIST_SYSTEM_PROMPT,
  ollamaModelAdapter,
} from '../model';
import {
  BookingConversationStep,
  ConversationSessionData,
  DentalTriageProfile,
  IConversationSessionStore,
  sessionStore,
  appointmentStateMachine,
  AppointmentStateMachine,
} from '../conversation';
import {
  getClinicKnowledge,
  findDoctorCabin,
  triageDentalSymptom,
  triageDentalInquiry,
  findClinicFAQ,
  buildGroundedClinicPrompt,
  isUnrelatedInquiry,
  LUMINA_DENTAL_BUSINESS_ID,
} from '../knowledge';
import { extractTriageFacts } from '../knowledge/triage-extractor';

export class AIReceptionistService {
  private toolRouter: AIToolRouter;
  private aiModel: AIModel;
  private sessionStore: IConversationSessionStore;
  private stateMachine: AppointmentStateMachine;

  constructor(options?: {
    toolRouter?: AIToolRouter;
    aiModel?: AIModel;
    sessionStore?: IConversationSessionStore;
    stateMachine?: AppointmentStateMachine;
  }) {
    this.toolRouter = options?.toolRouter || toolRouter;
    this.aiModel = options?.aiModel || ollamaModelAdapter;
    this.sessionStore = options?.sessionStore || sessionStore;
    this.stateMachine = options?.stateMachine || (options?.sessionStore ? new AppointmentStateMachine(options.sessionStore) : appointmentStateMachine);
  }

  /**
   * Main entry point for processing an inbound natural language inquiry.
   * 1. Checks active multi-turn conversation session (booking state machine).
   * 2. Runs fast deterministic routing (< 1ms).
   * 3. Executes database micro-tools (< 15ms).
   * 4. Falls back to local Ollama LLM for open questions.
   */
  public async processMessage(
    request: AIReceptionistRequest
  ): Promise<AIReceptionistResponse> {
    const startTime = performance.now();

    // 1. Validate Input Message
    if (!request || typeof request.message !== 'string' || !request.message.trim()) {
      return {
        success: false,
        response: "I didn't catch that. How can I help you today?",
        action: AIAction.NONE,
        intent: AIIntent.UNKNOWN,
        sessionId: request?.context?.sessionId || 'unknown',
        source: 'deterministic',
        latencyMs: performance.now() - startTime,
        error: {
          code: 'EMPTY_MESSAGE',
          message: 'Inbound message cannot be empty or whitespace.',
        },
      };
    }

    // 2. Validate Context Guardrails
    if (!request.context || !request.context.businessId) {
      return {
        success: false,
        response: 'Sorry, I am having trouble identifying the business context. Please try again.',
        action: AIAction.NONE,
        intent: AIIntent.UNKNOWN,
        sessionId: request?.context?.sessionId || 'unknown',
        source: 'deterministic',
        latencyMs: performance.now() - startTime,
        error: {
          code: 'INVALID_CONTEXT',
          message: 'Missing required businessId in conversation context.',
        },
      };
    }

    const trimmedMessage = request.message.trim();
    const sessionId = request.context.sessionId || 'session-default';
    const businessId = request.context.businessId;

    // 3. Check for Active Multi-Turn Conversation Session
    const activeSession = await this.sessionStore.getSession(sessionId);

    if (
      activeSession &&
      activeSession.step !== BookingConversationStep.IDLE &&
      activeSession.step !== BookingConversationStep.BOOKING_COMPLETE &&
      activeSession.step !== BookingConversationStep.BOOKING_CANCELLED
    ) {
      // Check for mid-flow informational interruptions (e.g. "What services do you offer?")
      const sideMatch = FastIntentRouter.routeIntent(trimmedMessage, businessId);
      if (
        sideMatch.intent === AIIntent.SERVICE_INFORMATION &&
        activeSession.step !== BookingConversationStep.BOOKING_COLLECT_SERVICE
      ) {
        const toolRes = await this.toolRouter.executeTool({
          tool: 'get_services',
          input: { isActiveOnly: true },
          context: request.context,
        });

        let naturalText: string;
        if (toolRes.success && Array.isArray(toolRes.data) && toolRes.data.length > 0) {
          const list = toolRes.data.slice(0, 4).map((s: any) => `${s.name} (${s.durationMinutes} mins)`).join(', ');
          naturalText = `We offer ${list}. Continuing with your booking, what date would you prefer?`;
        } else {
          naturalText = 'I can help with our services, but currently no active services are cataloged.';
        }

        return {
          success: true,
          response: naturalText,
          action: AIAction.GET_SERVICES,
          intent: AIIntent.SERVICE_INFORMATION,
          sessionId,
          source: 'tool',
          toolUsed: 'get_services',
          data: toolRes.data,
          latencyMs: performance.now() - startTime,
        };
      }

      // Delegate to deterministic appointment state machine
      const smResult = await this.stateMachine.handleTurn(
        trimmedMessage,
        activeSession,
        request.context,
        startTime
      );
      if (smResult.updatedSession) {
        smResult.response.conversationState = {
          step: smResult.updatedSession.step,
          selectedService: smResult.updatedSession.selectedServiceName
            ? { id: smResult.updatedSession.selectedServiceId, name: smResult.updatedSession.selectedServiceName }
            : undefined,
          selectedStaff: smResult.updatedSession.selectedStaffName
            ? { id: smResult.updatedSession.selectedStaffId, name: smResult.updatedSession.selectedStaffName }
            : undefined,
          selectedDate: smResult.updatedSession.selectedDate,
          selectedTime: smResult.updatedSession.selectedTimeLabel || smResult.updatedSession.selectedSlot?.timeLabel,
          customerName: smResult.updatedSession.customerName,
          customerPhone: smResult.updatedSession.customerPhone,
          appointmentId: smResult.updatedSession.confirmedAppointmentId,
          isCompleted: smResult.updatedSession.step === BookingConversationStep.BOOKING_COMPLETE,
        };
      }
      return smResult.response;
    }

    // 4. Fast Deterministic Intent Matching (< 1ms, 0 LLM calls)
    const match = FastIntentRouter.routeIntent(trimmedMessage, businessId);

    switch (match.intent) {
      // ----------------------------------------------------
      // FAST DETERMINISTIC PATH 1: GREETING
      // ----------------------------------------------------
      case AIIntent.GREETING: {
        const businessName = request.context.metadata?.businessName || 'our office';
        const isLumina =
          businessId === LUMINA_DENTAL_BUSINESS_ID ||
          (typeof businessName === 'string' && businessName.toLowerCase().includes('lumina'));

        const greetingText = isLumina
          ? 'Hello! Welcome to Lumina Dental Care. Are you calling for a routine checkup or cleaning, or are you experiencing tooth pain or a specific concern today?'
          : `Hello! Welcome to ${businessName}. How may I assist you today?`;

        return {
          success: true,
          response: greetingText,
          action: AIAction.NONE,
          intent: AIIntent.GREETING,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // FAST DETERMINISTIC PATH 2: GOODBYE
      // ----------------------------------------------------
      case AIIntent.GOODBYE: {
        return {
          success: true,
          response: 'Thank you for contacting us! Have a wonderful day.',
          action: AIAction.NONE,
          intent: AIIntent.GOODBYE,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // HIGH-PRIORITY SAFETY: DENTAL EMERGENCY
      // ----------------------------------------------------
      case AIIntent.EMERGENCY_DENTAL: {
        const clinicProfile = getClinicKnowledge(businessId);
        let emergencyResponse: string;

        if (clinicProfile) {
          emergencyResponse = `${clinicProfile.emergencyPolicy.immediateInstruction} ${clinicProfile.emergencyPolicy.erInstruction}`;
        } else {
          emergencyResponse =
            'If you are experiencing difficulty breathing, throat swelling, or continuous heavy bleeding, please call 911 or go to the nearest emergency room immediately.';
        }

        return {
          success: true,
          response: emergencyResponse,
          action: AIAction.EMERGENCY_ESCALATION,
          intent: AIIntent.EMERGENCY_DENTAL,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DENTAL DOMAIN INTELLIGENCE: SYMPTOM & VISIT REASON TRIAGE
      // ----------------------------------------------------
      case AIIntent.DENTAL_SYMPTOM_INQUIRY: {
        const triageRes = triageDentalInquiry(businessId, trimmedMessage);
        const clinicProfile = getClinicKnowledge(businessId);
        const now = new Date();

        // 1. Life-safety emergency priority
        if (triageRes.isEmergency) {
          const emergencyResponse =
            clinicProfile?.emergencyPolicy?.immediateInstruction
              ? `${clinicProfile.emergencyPolicy.immediateInstruction} ${clinicProfile.emergencyPolicy.erInstruction}`
              : triageRes.responsePrompt ||
                'If you are experiencing difficulty breathing, severe facial swelling, or continuous heavy bleeding, please call 911 or go to the nearest emergency room immediately.';

          return {
            success: true,
            response: emergencyResponse,
            action: AIAction.EMERGENCY_ESCALATION,
            intent: AIIntent.EMERGENCY_DENTAL,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          };
        }

        // 2. Ambiguous symptom: Gentle receptionist follow-up with persistent state
        if (triageRes.isAmbiguous && triageRes.ambiguousQuestion) {
          const initialFacts = extractTriageFacts(trimmedMessage);
          const triageProfile: DentalTriageProfile = {
            originalPatientStatement: trimmedMessage,
            reportedSymptoms: initialFacts.reportedSymptoms || [trimmedMessage],
            symptomCategories: triageRes.category ? [triageRes.category] : [],
            triggers: initialFacts.triggers || [],
            anatomicalLocation: initialFacts.anatomicalLocation,
            anatomicalScope: initialFacts.anatomicalScope,
            onset: initialFacts.onset,
            duration: initialFacts.duration,
            painPattern: initialFacts.painPattern,
            swellingPresent: initialFacts.swellingPresent,
            bleedingPresent: initialFacts.bleedingPresent,
            traumaPresent: initialFacts.traumaPresent,
            patientGoal: initialFacts.patientGoal,
            urgencyLevel: 'ROUTINE',
            activeFollowUpQuestion: triageRes.ambiguousQuestion,
            followUpHistory: [
              {
                question: triageRes.ambiguousQuestion,
                answer: '',
                timestamp: now.toISOString(),
              },
            ],
            isAmbiguous: true,
          };

          await this.sessionStore.setSession({
            sessionId,
            businessId,
            step: BookingConversationStep.TRIAGE_CLARIFICATION,
            customerId: request.context.customerId || undefined,
            reportedSymptom: trimmedMessage,
            triageProfile,
            createdAt: now,
            updatedAt: now,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          });

          return {
            success: true,
            response: triageRes.ambiguousQuestion,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
            conversationState: {
              step: BookingConversationStep.TRIAGE_CLARIFICATION,
            },
          };
        }

        // 3. Clinic Capability Check: Service is NOT offered by current clinic
        if (!triageRes.isSupportedByClinic) {
          const unavailableMsg =
            triageRes.unavailableExplanation ||
            `This clinic does not currently list that specialized treatment among its available services. Since we don't currently provide that treatment here, you may want to look for a dental clinic in or near your area that offers it, which may be more convenient for you. I can also help you with the dental services available at ${clinicProfile?.businessName || 'this clinic'}.`;

          return {
            success: true,
            response: unavailableMsg,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          };
        }

        // 4. Supported service: Propose appointment and stage into BOOKING_SYMPTOM_TRIAGE
        let targetServiceId = triageRes.suggestedServiceId || 'sv000001-0000-0000-0000-000000000001';
        let targetServiceName = triageRes.suggestedServiceName || 'Comprehensive Oral Exam & Digital X-Rays';
        let targetSpecialistId = triageRes.suggestedStaffId || 's0000001-0000-0000-0000-000000000001';
        let targetSpecialistName = triageRes.suggestedStaffName || 'Dr. Marcus Thorne';
        let responseText = triageRes.responsePrompt;

        if (!responseText) {
          if (triageRes.triageRule) {
            responseText = `I'm sorry to hear that. ${triageRes.triageRule.clinicalExplanation} ${triageRes.triageRule.clinicalSafetyDisclaimer} Would you like to schedule an appointment for ${targetServiceName}?`;
          } else {
            responseText = `I'm sorry to hear you're experiencing dental discomfort. A clinical examination would be an appropriate place to start so our dentist can evaluate the cause. Would you like to schedule an appointment for ${targetServiceName}?`;
          }
        }

        const stagedFacts = extractTriageFacts(trimmedMessage);
        const stagedTriageProfile: DentalTriageProfile = {
          originalPatientStatement: trimmedMessage,
          reportedSymptoms: stagedFacts.reportedSymptoms || [trimmedMessage],
          symptomCategories: triageRes.category ? [triageRes.category] : [],
          triggers: stagedFacts.triggers || [],
          anatomicalLocation: stagedFacts.anatomicalLocation,
          anatomicalScope: stagedFacts.anatomicalScope,
          onset: stagedFacts.onset,
          duration: stagedFacts.duration,
          painPattern: stagedFacts.painPattern,
          swellingPresent: stagedFacts.swellingPresent,
          bleedingPresent: stagedFacts.bleedingPresent,
          traumaPresent: stagedFacts.traumaPresent,
          patientGoal: stagedFacts.patientGoal,
          urgencyLevel: triageRes.category === 'ABSCESS_ACUTE_INFECTION' ? 'HIGH' : 'MEDIUM',
          followUpHistory: [],
          isAmbiguous: false,
          recommendedNextStep: targetServiceName,
        };

        // Pre-stage the suggested service into the session at BOOKING_SYMPTOM_TRIAGE step
        await this.sessionStore.setSession({
          sessionId,
          businessId,
          step: BookingConversationStep.BOOKING_SYMPTOM_TRIAGE,
          customerId: request.context.customerId || undefined,
          reportedSymptom: trimmedMessage,
          triageProfile: stagedTriageProfile,
          suggestedServiceId: targetServiceId,
          suggestedServiceName: targetServiceName,
          selectedServiceId: targetServiceId,
          selectedServiceName: targetServiceName,
          selectedStaffId: targetSpecialistId,
          selectedStaffName: targetSpecialistName,
          createdAt: now,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        });

        return {
          success: true,
          response: responseText,
          action: AIAction.TRIAGE_SYMPTOM,
          intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
          conversationState: {
            step: BookingConversationStep.BOOKING_SYMPTOM_TRIAGE,
            selectedService: targetServiceName ? { id: targetServiceId, name: targetServiceName } : undefined,
            selectedStaff: targetSpecialistName ? { id: targetSpecialistId, name: targetSpecialistName } : undefined,
          },
        };
      }

      // ----------------------------------------------------
      // CLINIC KNOWLEDGE: DOCTOR CABIN & ROOM LOCATION
      // ----------------------------------------------------
      case AIIntent.CABIN_ROOM_LOCATION: {
        const cabinResult = findDoctorCabin(businessId, trimmedMessage);
        const clinicProfile = getClinicKnowledge(businessId);
        let cabinResponse = '';

        if (cabinResult && cabinResult.directions) {
          cabinResponse = cabinResult.directions;
        } else if (clinicProfile) {
          const list = clinicProfile.doctors
            .filter((d) => d.cabin.startsWith('Cabin') || d.cabin.startsWith('Hygiene'))
            .map((d) => `${d.cabin} (${d.name})`)
            .join(', ');
          cabinResponse = `Our consultation rooms include ${list}. Which specialist or room are you looking for?`;
        } else {
          cabinResponse = 'Our consultation rooms are located on the ground floor of our clinic.';
        }

        return {
          success: true,
          response: cabinResponse,
          action: AIAction.GET_CABIN_LOCATION,
          intent: AIIntent.CABIN_ROOM_LOCATION,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // CLINIC KNOWLEDGE: NAVIGATION & DIRECTIONS
      // ----------------------------------------------------
      case AIIntent.CLINIC_DIRECTIONS: {
        const clinicProfile = getClinicKnowledge(businessId);
        let directionsResponse: string;

        if (clinicProfile) {
          directionsResponse = `${clinicProfile.navigation.entrance} ${clinicProfile.navigation.receptionDesk} ${clinicProfile.navigation.waitingLounge}`;
        } else {
          directionsResponse = 'Our reception desk is located directly inside the main entrance.';
        }

        return {
          success: true,
          response: directionsResponse,
          action: AIAction.GET_CLINIC_DIRECTIONS,
          intent: AIIntent.CLINIC_DIRECTIONS,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // CLINIC KNOWLEDGE: WAITING AREA & ARRIVAL GUIDANCE
      // ----------------------------------------------------
      case AIIntent.WAITING_AREA_POLICY: {
        const clinicProfile = getClinicKnowledge(businessId);
        let waitingResponse: string;

        if (clinicProfile) {
          if (/\b(early|arrive early|arriving early)\b/i.test(trimmedMessage)) {
            waitingResponse = clinicProfile.patientGuidance.earlyArrivalPolicy;
          } else if (/\b(late|running late)\b/i.test(trimmedMessage)) {
            waitingResponse = clinicProfile.patientGuidance.lateArrivalPolicy;
          } else {
            waitingResponse = `${clinicProfile.navigation.waitingLounge} ${clinicProfile.patientGuidance.earlyArrivalPolicy}`;
          }
        } else {
          waitingResponse =
            'You are welcome to relax in our waiting area before your visit. If you are running late, please contact our office.';
        }

        return {
          success: true,
          response: waitingResponse,
          action: AIAction.GET_WAITING_POLICY,
          intent: AIIntent.WAITING_AREA_POLICY,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // MULTI-TURN INITIATION: BOOK APPOINTMENT
      // ----------------------------------------------------
      case AIIntent.BOOK_APPOINTMENT: {
        const now = new Date();
        const initialSession: ConversationSessionData = {
          sessionId,
          businessId,
          step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
          customerId: request.context.customerId || undefined,
          createdAt: now,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        };
        await this.sessionStore.setSession(initialSession);

        // Attempt to match and advance if the caller already specified a service in this turn
        const smTurn = await this.stateMachine.handleTurn(
          trimmedMessage,
          initialSession,
          request.context,
          startTime
        );

        if (smTurn.updatedSession && smTurn.updatedSession.step !== BookingConversationStep.BOOKING_COLLECT_SERVICE) {
          smTurn.response.conversationState = {
            step: smTurn.updatedSession.step,
            selectedService: smTurn.updatedSession.selectedServiceName
              ? { id: smTurn.updatedSession.selectedServiceId, name: smTurn.updatedSession.selectedServiceName }
              : undefined,
            selectedStaff: smTurn.updatedSession.selectedStaffName
              ? { id: smTurn.updatedSession.selectedStaffId, name: smTurn.updatedSession.selectedStaffName }
              : undefined,
            selectedDate: smTurn.updatedSession.selectedDate,
            selectedTime: smTurn.updatedSession.selectedTimeLabel || smTurn.updatedSession.selectedSlot?.timeLabel,
            customerName: smTurn.updatedSession.customerName,
            customerPhone: smTurn.updatedSession.customerPhone,
            appointmentId: smTurn.updatedSession.confirmedAppointmentId,
            isCompleted: smTurn.updatedSession.step === BookingConversationStep.BOOKING_COMPLETE,
          };
          return smTurn.response;
        }

        return {
          success: true,
          response: 'Sure! Which service would you like to book?',
          action: AIAction.CREATE_APPOINTMENT,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
          conversationState: {
            step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
          },
        };
      }

      // ----------------------------------------------------
      // DATABASE TOOL PATH 1: SERVICE INFORMATION
      // ----------------------------------------------------
      case AIIntent.SERVICE_INFORMATION: {
        const toolRes = await this.toolRouter.executeTool({
          tool: 'get_services',
          input: { isActiveOnly: true },
          context: request.context,
        });

        let naturalText: string;
        if (toolRes.success && Array.isArray(toolRes.data) && toolRes.data.length > 0) {
          const serviceNames = toolRes.data.slice(0, 4).map((s: any) => s.name);
          const list = serviceNames.length > 1
            ? `${serviceNames.slice(0, -1).join(', ')}, and ${serviceNames[serviceNames.length - 1]}`
            : serviceNames[0];
          naturalText = `We offer ${list}. Which one would you like?`;
        } else {
          naturalText = 'I can help with our services, but currently no active services are cataloged.';
        }

        return {
          success: true,
          response: naturalText,
          action: AIAction.GET_SERVICES,
          intent: AIIntent.SERVICE_INFORMATION,
          sessionId,
          source: 'tool',
          toolUsed: 'get_services',
          data: toolRes.data,
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DATABASE TOOL PATH 2: STAFF INFORMATION
      // ----------------------------------------------------
      case AIIntent.STAFF_INFORMATION: {
        const toolRes = await this.toolRouter.executeTool({
          tool: 'get_staff',
          input: { isActiveOnly: true },
          context: request.context,
        });

        let naturalText: string;
        if (toolRes.success && Array.isArray(toolRes.data) && toolRes.data.length > 0) {
          const list = toolRes.data
            .slice(0, 4)
            .map((s: any) => `${s.name}${s.role ? ` (${s.role})` : ''}`)
            .join(', ');
          naturalText = `Our specialists include ${list}. Would you like to check availability with one of our specialists?`;
        } else {
          naturalText = 'Our staff directory is currently unavailable.';
        }

        return {
          success: true,
          response: naturalText,
          action: AIAction.GET_STAFF,
          intent: AIIntent.STAFF_INFORMATION,
          sessionId,
          source: 'tool',
          toolUsed: 'get_staff',
          data: toolRes.data,
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DATABASE TOOL PATH 3: BUSINESS INFORMATION
      // ----------------------------------------------------
      case AIIntent.BUSINESS_INFORMATION: {
        const toolRes = await this.toolRouter.executeTool({
          tool: 'get_business_info',
          input: {},
          context: request.context,
        });

        let naturalText: string;
        if (toolRes.success && toolRes.data) {
          const b = toolRes.data as any;
          naturalText = `${b.name} is located at ${b.address || 'our main location'}. You can also reach us at ${b.phone || 'our direct line'}.`;
        } else {
          naturalText = 'I can provide business details once you are connected to our staff.';
        }

        return {
          success: true,
          response: naturalText,
          action: AIAction.GET_BUSINESS_INFO,
          intent: AIIntent.BUSINESS_INFORMATION,
          sessionId,
          source: 'tool',
          toolUsed: 'get_business_info',
          data: toolRes.data,
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DATABASE TOOL PATH 4: CUSTOMER LOOKUP
      // ----------------------------------------------------
      case AIIntent.CUSTOMER_LOOKUP: {
        const query = match.extractedParams?.phone || match.extractedParams?.query || trimmedMessage;
        const toolRes = await this.toolRouter.executeTool({
          tool: 'search_customer',
          input: { query },
          context: request.context,
        });

        let naturalText: string;
        if (toolRes.success && Array.isArray(toolRes.data) && toolRes.data.length > 0) {
          const customer = toolRes.data[0];
          naturalText = `I found your profile under ${customer.name}. How can I assist with your appointment today?`;
        } else {
          naturalText = "I couldn't locate an existing profile with that number. Would you like me to help you schedule a new appointment?";
        }

        return {
          success: true,
          response: naturalText,
          action: AIAction.SEARCH_CUSTOMER,
          intent: AIIntent.CUSTOMER_LOOKUP,
          sessionId,
          source: 'tool',
          toolUsed: 'search_customer',
          data: toolRes.data,
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DETERMINISTIC PATH 4: APPOINTMENT AVAILABILITY
      // ----------------------------------------------------
      case AIIntent.APPOINTMENT_AVAILABILITY: {
        const dateNote = match.extractedParams?.dateText ? ` for ${match.extractedParams.dateText}` : '';
        return {
          success: true,
          response: `I can check availability${dateNote}. Could you please specify which service or specialist you'd like to see, and your preferred time?`,
          action: AIAction.CHECK_AVAILABILITY,
          intent: AIIntent.APPOINTMENT_AVAILABILITY,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DETERMINISTIC PATH 5: CANCEL APPOINTMENT
      // ----------------------------------------------------
      case AIIntent.CANCEL_APPOINTMENT: {
        return {
          success: true,
          response: 'I can assist you with canceling your appointment. Could you please provide your appointment date and time or your phone number?',
          action: AIAction.CANCEL_APPOINTMENT,
          intent: AIIntent.CANCEL_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DETERMINISTIC PATH 6: RESCHEDULE APPOINTMENT
      // ----------------------------------------------------
      case AIIntent.RESCHEDULE_APPOINTMENT: {
        return {
          success: true,
          response: 'I can help you reschedule your visit. What is your current appointment date, and what new time would you prefer?',
          action: AIAction.RESCHEDULE_APPOINTMENT,
          intent: AIIntent.RESCHEDULE_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DATABASE TOOL PATH 5: VIEW APPOINTMENTS
      // ----------------------------------------------------
      case AIIntent.VIEW_APPOINTMENTS: {
        const toolRes = await this.toolRouter.executeTool({
          tool: 'get_appointments',
          input: { customerId: request.context.customerId },
          context: request.context,
        });

        let naturalText: string;
        if (toolRes.success && Array.isArray(toolRes.data) && toolRes.data.length > 0) {
          const appt = toolRes.data[0];
          naturalText = `You have an appointment on ${new Date(appt.startTime).toLocaleString()}. Would you like to keep, reschedule, or cancel it?`;
        } else {
          naturalText = 'I could not find any active upcoming appointments under your account.';
        }

        return {
          success: true,
          response: naturalText,
          action: AIAction.GET_APPOINTMENTS,
          intent: AIIntent.VIEW_APPOINTMENTS,
          sessionId,
          source: 'tool',
          toolUsed: 'get_appointments',
          data: toolRes.data,
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DETERMINISTIC PATH 7: APPOINTMENT PREPARATION
      // ----------------------------------------------------
      case AIIntent.APPOINTMENT_PREPARATION: {
        return {
          success: true,
          response: 'Please arrive 10 minutes early with a valid photo ID and your insurance card or payment method.',
          action: AIAction.NONE,
          intent: AIIntent.APPOINTMENT_PREPARATION,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DETERMINISTIC PATH 8: PAYMENT & INSURANCE POLICY
      // ----------------------------------------------------
      case AIIntent.PAYMENT_POLICY: {
        return {
          success: true,
          response: 'We accept most major dental insurance plans, credit cards, debit cards, and cash. Please bring your card to your visit.',
          action: AIAction.NONE,
          intent: AIIntent.PAYMENT_POLICY,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DETERMINISTIC PATH 9: GENERAL CLINIC FAQ & KNOWLEDGE
      // ----------------------------------------------------
      case AIIntent.CLINIC_FAQ: {
        const faqRes = findClinicFAQ(businessId, trimmedMessage);
        const faqAnswer =
          faqRes.matched && faqRes.answer
            ? faqRes.answer
            : "I don't have specific information about that policy on file, but our front desk will be happy to assist you upon your arrival.";

        return {
          success: true,
          response: faqAnswer,
          action: AIAction.NONE,
          intent: AIIntent.CLINIC_FAQ,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // DETERMINISTIC PATH 10: UNRELATED INQUIRY REDIRECTION
      // ----------------------------------------------------
      case AIIntent.UNRELATED_INQUIRY: {
        const clinicProfile = getClinicKnowledge(businessId);
        const clinicName = clinicProfile?.businessName || 'Lumina Dental Care';
        return {
          success: true,
          response:
            `I'm here to help with ${clinicName}, appointments, and dental clinic information. How can I assist you with your dental care today?`,
          action: AIAction.NONE,
          intent: AIIntent.UNRELATED_INQUIRY,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        };
      }

      // ----------------------------------------------------
      // GROUNDED LOCAL OLLAMA LLM REASONING & FALLBACK
      // ----------------------------------------------------
      case AIIntent.UNKNOWN:
      default: {
        // If it's an unrelated inquiry not caught by regex, redirect safely
        if (isUnrelatedInquiry(trimmedMessage)) {
          const clinicProfile = getClinicKnowledge(businessId);
          const clinicName = clinicProfile?.businessName || 'Lumina Dental Care';
          return {
            success: true,
            response:
              `I'm here to help with ${clinicName}, appointments, and dental clinic information. How can I assist you with your dental care today?`,
            action: AIAction.NONE,
            intent: AIIntent.UNRELATED_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          };
        }

        // Build grounded clinic context so LLM answers only from verified facts
        const groundedSystemPrompt = buildGroundedClinicPrompt(businessId);

        try {
          const aiRes = await this.aiModel.generate({
            prompt: trimmedMessage,
            systemPrompt: groundedSystemPrompt,
            maxTokens: 60,
            temperature: 0.2,
          });

          let responseText =
            aiRes.text?.trim() ||
            "I don't have specific information about that policy on file, but our front desk will be happy to assist you upon your arrival.";

          // Anti-hallucination guardrail: LLM cannot fabricate appointment confirmations without database execution
          const confirmationPattern =
            /(?:appointment\s+(?:is|has been)\s+(?:confirmed|booked|scheduled)|successfully\s+(?:confirmed|booked|scheduled)\s+your\s+appointment|i(?:'ve|\s+have)\s+(?:booked|confirmed|scheduled)\s+your\s+appointment)/i;
          if (confirmationPattern.test(responseText)) {
            responseText =
              "I would be delighted to help you book that appointment! To get started, please tell me which service you are looking to book.";
          }

          return {
            success: true,
            response: responseText,
            action: AIAction.NONE,
            intent: AIIntent.GENERAL_CONVERSATION,
            sessionId,
            source: 'llm',
            latencyMs: performance.now() - startTime,
          };
        } catch (err) {
          // Graceful fallback if Ollama is offline or timed out - NEVER CRASH
          return {
            success: true,
            response:
              'I am your virtual receptionist. I can assist you with our services, staff specialists, or booking and managing appointments. How may I help you today?',
            action: AIAction.NONE,
            intent: AIIntent.GENERAL_CONVERSATION,
            sessionId,
            source: 'fallback',
            latencyMs: performance.now() - startTime,
          };
        }
      }
    }
  }
}

// Export singleton global receptionist orchestrator
export const aiReceptionistService = new AIReceptionistService();
