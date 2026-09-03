import { prisma } from '../../../lib/prisma';
import { toolRouter } from '../tools/router';
import { AIAction } from '../types/action.types';
import { AIConversationContext } from '../types/context.types';
import { AIIntent } from '../types/intent.types';
import { AIReceptionistResponse } from '../types/request-response.types';
import {
  BookingConversationStep,
  ConversationSessionData,
} from './conversation-session.types';
import { IConversationSessionStore } from './session-store.interface';
import { AppointmentSlotFinder } from './appointment-slot-finder';
import {
  ServiceMatcher,
  StaffMatcher,
  DateParser,
  TimeParser,
  ConfirmationParser,
} from './parsers';

export interface StateMachineResult {
  response: AIReceptionistResponse;
  updatedSession: ConversationSessionData | null;
}

export class AppointmentStateMachine {
  private sessionStore: IConversationSessionStore;

  constructor(sessionStore: IConversationSessionStore) {
    this.sessionStore = sessionStore;
  }

  /**
   * Main multi-turn appointment processing loop.
   * Advances the active conversation step deterministically without LLM overhead.
   */
  public async handleTurn(
    message: string,
    session: ConversationSessionData,
    context: AIConversationContext,
    startTime: number
  ): Promise<StateMachineResult> {
    const rawInput = message.trim();
    const sessionId = session.sessionId;
    const businessId = session.businessId || context.businessId;

    // ----------------------------------------------------
    // GLOBAL INTERRUPTION & CANCELLATION CHECK
    // ----------------------------------------------------
    const confirmCheck = ConfirmationParser.parseConfirmation(rawInput);
    if (confirmCheck === 'START_OVER') {
      const resetSession = await this.sessionStore.updateSession(sessionId, {
        step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
        selectedServiceId: undefined,
        selectedServiceName: undefined,
        selectedStaffId: undefined,
        selectedStaffName: undefined,
        selectedDate: undefined,
        selectedStartTime: undefined,
        selectedEndTime: undefined,
        availableSlots: [],
      });

      return {
        response: {
          success: true,
          response: "Sure, let's start over. Which service would you like to book?",
          action: AIAction.CREATE_APPOINTMENT,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: resetSession,
      };
    }

    if (
      confirmCheck === 'REJECTED' &&
      session.step !== BookingConversationStep.BOOKING_CONFIRM
    ) {
      await this.sessionStore.deleteSession(sessionId);
      return {
        response: {
          success: true,
          response: 'I have cancelled your booking request. Is there anything else I can help you with?',
          action: AIAction.NONE,
          intent: AIIntent.CANCEL_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: null,
      };
    }

    // ----------------------------------------------------
    // STEP 1: COLLECT SERVICE
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_COLLECT_SERVICE) {
      const services = await prisma.service.findMany({
        where: { businessId, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      if (services.length === 0) {
        await this.sessionStore.deleteSession(sessionId);
        return {
          response: {
            success: true,
            response: 'Sorry, no active services are currently listed for booking. Please contact our office directly.',
            action: AIAction.NONE,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: null,
        };
      }

      const match = ServiceMatcher.matchService(rawInput, services);

      if (match.matchedService) {
        const s = match.matchedService;
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_STAFF,
          selectedServiceId: s.id,
          selectedServiceName: s.name,
          serviceDurationMinutes: s.durationMinutes,
        });

        return {
          response: {
            success: true,
            response: `Got it, ${s.name} (${s.durationMinutes} mins). Do you have a preferred specialist, or would anyone be fine?`,
            action: AIAction.GET_STAFF,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      if (match.ambiguous.length > 1) {
        const names = match.ambiguous.map((s) => s.name).join(', ');
        return {
          response: {
            success: true,
            response: `I found multiple matching services: ${names}. Which one would you prefer?`,
            action: AIAction.GET_SERVICES,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      const availableNames = services.slice(0, 4).map((s) => s.name).join(', ');
      return {
        response: {
          success: true,
          response: `I couldn't identify that service. We currently offer: ${availableNames}. Which one would you like?`,
          action: AIAction.GET_SERVICES,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: session,
      };
    }

    // ----------------------------------------------------
    // STEP 2: COLLECT STAFF PREFERENCE
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_COLLECT_STAFF) {
      const staffList = await prisma.staff.findMany({
        where: { businessId, isActive: true },
        select: { id: true, name: true, role: true, email: true, phone: true, isActive: true },
        orderBy: { name: 'asc' },
      });

      const match = StaffMatcher.matchStaff(rawInput, staffList);

      if (match.isAnyone) {
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_DATE,
          selectedStaffId: null,
          selectedStaffName: 'Any Available Specialist',
        });

        return {
          response: {
            success: true,
            response: 'Sounds good. What date would you prefer for your appointment?',
            action: AIAction.CHECK_AVAILABILITY,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      if (match.matchedStaff) {
        const staff = match.matchedStaff;
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_DATE,
          selectedStaffId: staff.id,
          selectedStaffName: staff.name,
        });

        return {
          response: {
            success: true,
            response: `Great, with ${staff.name}. What date would you prefer?`,
            action: AIAction.CHECK_AVAILABILITY,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      const staffNames = staffList.map((s) => s.name).join(', ');
      return {
        response: {
          success: true,
          response: `I couldn't find that specialist. Our team includes: ${staffNames} (or you can say 'anyone'). Who would you prefer?`,
          action: AIAction.GET_STAFF,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: session,
      };
    }

    // ----------------------------------------------------
    // STEP 3: COLLECT DATE & COMPUTE SLOTS
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_COLLECT_DATE) {
      const dateResult = DateParser.parseDate(rawInput);

      if (dateResult.error || !dateResult.parsedDate) {
        return {
          response: {
            success: true,
            response: dateResult.error || "Please choose a valid date, such as 'tomorrow', 'Friday', or 'September 15'.",
            action: AIAction.CHECK_AVAILABILITY,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // Query available slots from real PostgreSQL database records
      const duration = session.serviceDurationMinutes || 30;
      const availableSlots = await AppointmentSlotFinder.findAvailableSlots({
        businessId,
        dateStr: dateResult.parsedDate,
        durationMinutes: duration,
        staffId: session.selectedStaffId,
      });

      if (availableSlots.length === 0) {
        return {
          response: {
            success: true,
            response: `Unfortunately, there are no open openings on ${dateResult.formattedLabel}. Would you like to try another date?`,
            action: AIAction.CHECK_AVAILABILITY,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      const slotLabels = availableSlots.map((s) => s.timeLabel).join(', ');
      const updated = await this.sessionStore.updateSession(sessionId, {
        step: BookingConversationStep.BOOKING_SELECT_SLOT,
        selectedDate: dateResult.parsedDate,
        availableSlots,
      });

      return {
        response: {
          success: true,
          response: `Available times on ${dateResult.formattedLabel} are ${slotLabels}. Which one would you prefer?`,
          action: AIAction.CHECK_AVAILABILITY,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: updated,
      };
    }

    // ----------------------------------------------------
    // STEP 4: SELECT SLOT
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_SELECT_SLOT) {
      const slots = session.availableSlots || [];
      const match = TimeParser.matchSlot(rawInput, slots);

      if (!match.matchedSlot) {
        return {
          response: {
            success: true,
            response: match.error || `Please select one of the available times: ${slots.map((s) => s.timeLabel).join(', ')}.`,
            action: AIAction.CHECK_AVAILABILITY,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      const slot = match.matchedSlot;
      const assignedStaffId = slot.staffId || session.selectedStaffId || null;
      const assignedStaffName = slot.staffName || session.selectedStaffName || null;

      // Check if customer is already identified
      const activeCustomerId = session.customerId || context.customerId;

      if (activeCustomerId) {
        const customer = await prisma.customer.findFirst({
          where: { id: activeCustomerId, businessId },
        });

        if (customer) {
          const updated = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.BOOKING_CONFIRM,
            selectedStartTime: slot.startTime,
            selectedEndTime: slot.endTime,
            selectedStaffId: assignedStaffId,
            selectedStaffName: assignedStaffName,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
          });

          const staffClause = assignedStaffName ? ` with ${assignedStaffName}` : '';
          return {
            response: {
              success: true,
              response: `Please confirm your appointment: ${session.selectedServiceName}${staffClause} on ${session.selectedDate} at ${slot.timeLabel}. Would you like me to book it?`,
              action: AIAction.CREATE_APPOINTMENT,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }
      }

      // If customer is not identified yet, ask for customer phone/name
      const updated = await this.sessionStore.updateSession(sessionId, {
        step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER,
        selectedStartTime: slot.startTime,
        selectedEndTime: slot.endTime,
        selectedStaffId: assignedStaffId,
        selectedStaffName: assignedStaffName,
      });

      return {
        response: {
          success: true,
          response: `Got it for ${slot.timeLabel}! Could you please provide your phone number to complete the booking?`,
          action: AIAction.SEARCH_CUSTOMER,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: updated,
      };
    }

    // ----------------------------------------------------
    // STEP 5: COLLECT CUSTOMER IDENTITY
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_COLLECT_CUSTOMER) {
      // Look up customer by phone / text
      const phoneMatch = rawInput.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      const query = phoneMatch ? phoneMatch[0].trim() : rawInput;

      let customer = await prisma.customer.findFirst({
        where: {
          businessId,
          OR: [
            { phone: query },
            { phone: { contains: query.replace(/[^0-9]/g, '') } },
            { name: { contains: rawInput, mode: 'insensitive' } },
          ],
        },
      });

      // If customer does not exist, create a default customer profile
      if (!customer) {
        const fallbackName = rawInput.length < 30 ? rawInput : 'Guest Customer';
        const fallbackPhone = phoneMatch ? phoneMatch[0].trim() : `+1-555-${Math.floor(1000 + Math.random() * 9000)}`;
        customer = await prisma.customer.create({
          data: {
            businessId,
            name: fallbackName,
            phone: fallbackPhone,
          },
        });
      }

      const updated = await this.sessionStore.updateSession(sessionId, {
        step: BookingConversationStep.BOOKING_CONFIRM,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
      });

      const timeSlot = session.availableSlots?.find((s) => s.startTime === session.selectedStartTime);
      const timeLabel = timeSlot?.timeLabel || 'your selected time';
      const staffClause = session.selectedStaffName ? ` with ${session.selectedStaffName}` : '';

      return {
        response: {
          success: true,
          response: `Thank you, ${customer.name}! Please confirm: ${session.selectedServiceName}${staffClause} on ${session.selectedDate} at ${timeLabel}. Should I book it?`,
          action: AIAction.CREATE_APPOINTMENT,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: updated,
      };
    }

    // ----------------------------------------------------
    // STEP 6: CONFIRM & EXECUTE APPOINTMENT CREATION
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_CONFIRM) {
      if (confirmCheck === 'CONFIRMED') {
        if (!session.customerId || !session.selectedServiceId || !session.selectedStartTime) {
          await this.sessionStore.deleteSession(sessionId);
          return {
            response: {
              success: false,
              response: 'Sorry, some appointment details were lost. Please start over by saying "I want to book an appointment".',
              action: AIAction.NONE,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: null,
          };
        }

        // Execute creation via tool router
        const createResult = await toolRouter.executeTool({
          tool: 'create_appointment',
          input: {
            customerId: session.customerId,
            serviceId: session.selectedServiceId,
            staffId: session.selectedStaffId || undefined,
            startTime: session.selectedStartTime,
            endTime: session.selectedEndTime,
            notes: 'Booked via AI Smart Receptionist (Multi-Turn)',
          },
          context,
        });

        if (createResult.success) {
          await this.sessionStore.deleteSession(sessionId);
          const timeSlot = session.availableSlots?.find((s) => s.startTime === session.selectedStartTime);
          const timeLabel = timeSlot?.timeLabel || 'your requested time';

          return {
            response: {
              success: true,
              response: `Your appointment for ${session.selectedServiceName} on ${session.selectedDate} at ${timeLabel} has been successfully booked! We look forward to seeing you.`,
              action: AIAction.CREATE_APPOINTMENT,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'tool',
              toolUsed: 'create_appointment',
              data: createResult.data,
              latencyMs: performance.now() - startTime,
            },
            updatedSession: null,
          };
        } else {
          return {
            response: {
              success: false,
              response: `Could not complete booking: ${createResult.error?.message || 'Scheduling conflict'}. Would you like to select another time?`,
              action: AIAction.CREATE_APPOINTMENT,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'tool',
              toolUsed: 'create_appointment',
              error: createResult.error,
              latencyMs: performance.now() - startTime,
            },
            updatedSession: session,
          };
        }
      }

      if (confirmCheck === 'REJECTED') {
        await this.sessionStore.deleteSession(sessionId);
        return {
          response: {
            success: true,
            response: 'No problem, I have cancelled this booking. How else may I assist you today?',
            action: AIAction.NONE,
            intent: AIIntent.CANCEL_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: null,
        };
      }

      return {
        response: {
          success: true,
          response: `Please say "Yes" to confirm booking ${session.selectedServiceName} on ${session.selectedDate}, or "No" to cancel.`,
          action: AIAction.CREATE_APPOINTMENT,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: session,
      };
    }

    // Default fallback
    return {
      response: {
        success: true,
        response: 'How can I assist you with your appointment booking?',
        action: AIAction.NONE,
        intent: AIIntent.BOOK_APPOINTMENT,
        sessionId,
        source: 'deterministic',
        latencyMs: performance.now() - startTime,
      },
      updatedSession: session,
    };
  }
}

// Export singleton global state machine
import { sessionStore } from './in-memory-session-store';
export const appointmentStateMachine = new AppointmentStateMachine(sessionStore);
