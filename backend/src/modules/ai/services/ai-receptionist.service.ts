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

export class AIReceptionistService {
  private toolRouter: AIToolRouter;
  private aiModel: AIModel;

  constructor(options?: {
    toolRouter?: AIToolRouter;
    aiModel?: AIModel;
  }) {
    this.toolRouter = options?.toolRouter || toolRouter;
    this.aiModel = options?.aiModel || ollamaModelAdapter;
  }

  /**
   * Main entry point for processing an inbound natural language inquiry.
   * Prioritizes fast deterministic paths (< 1ms) and database tools (< 50ms)
   * before falling back to local Ollama LLM reasoning.
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

    // 3. Fast Deterministic Intent Matching (< 1ms, 0 LLM calls)
    const match = FastIntentRouter.routeIntent(trimmedMessage);

    switch (match.intent) {
      // ----------------------------------------------------
      // FAST DETERMINISTIC PATH 1: GREETING
      // ----------------------------------------------------
      case AIIntent.GREETING: {
        const businessName = request.context.metadata?.businessName || 'our office';
        return {
          success: true,
          response: `Hello! Welcome to ${businessName}. How may I assist you today?`,
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
          const list = toolRes.data
            .slice(0, 4)
            .map((s: any) => `${s.name} (${s.durationMinutes} mins)`)
            .join(', ');
          naturalText = `We offer ${list}. Would you like to schedule an appointment for one of these?`;
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
      // DETERMINISTIC PATH 3: BOOK APPOINTMENT
      // ----------------------------------------------------
      case AIIntent.BOOK_APPOINTMENT: {
        return {
          success: true,
          response: "I'd be happy to help you schedule an appointment. Which service would you like to book, and what day and time works best for you?",
          action: AIAction.CREATE_APPOINTMENT,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
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
      // LOCAL OLLAMA LLM REASONING & FALLBACK
      // ----------------------------------------------------
      case AIIntent.UNKNOWN:
      default: {
        try {
          const aiRes = await this.aiModel.generate({
            prompt: trimmedMessage,
            systemPrompt: DEFAULT_RECEPTIONIST_SYSTEM_PROMPT,
            maxTokens: 60,
            temperature: 0.2,
          });

          return {
            success: true,
            response: aiRes.text || "I'm here to assist with services, specialists, and appointments. How may I help you?",
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
            response: 'I am your virtual receptionist. I can assist you with our services, staff specialists, or booking and managing appointments. How may I help you today?',
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
