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
  NameParser,
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

    // Safe cancellation: ONLY on explicit cancellation phrases
    const isExplicitCancel =
      /\b(?:cancel|abort|stop)\s+(?:this\s+|my\s+)?(?:booking|appointment)\b/i.test(rawInput) ||
      /\b(?:cancel booking|cancel appointment|cancel my booking|cancel my appointment|abort booking|stop booking)\b/i.test(rawInput) ||
      /\b(?:never\s*mind|nevermind|forget\s*it|don'?t\s*bother)\b/i.test(rawInput) ||
      ((rawInput.toLowerCase() === 'cancel' || rawInput.toLowerCase() === 'stop') &&
        session.step !== BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME &&
        session.step !== BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE &&
        session.step !== BookingConversationStep.BOOKING_CONFIRM);

    if (isExplicitCancel) {
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
    // UNIVERSAL USER CORRECTION ROUTING
    // ----------------------------------------------------
    const correction = ConfirmationParser.parseCorrectionIntent(rawInput);
    if (
      correction.isCorrection &&
      session.step !== BookingConversationStep.IDLE &&
      session.step !== BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME &&
      session.step !== BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE
    ) {
      // 1. Date Correction
      if (correction.field === 'date') {
        const dateResult = DateParser.parseDate(rawInput);
        if (dateResult.parsedDate && !dateResult.error) {
          const duration = session.serviceDurationMinutes || 30;
          const availableSlots = await AppointmentSlotFinder.findAvailableSlots({
            businessId,
            dateStr: dateResult.parsedDate,
            durationMinutes: duration,
            staffId: session.selectedStaffId,
          });

          if (availableSlots.length > 0) {
            const slotLabels = availableSlots.map((s) => s.timeLabel).join(', ');
            const updated = await this.sessionStore.updateSession(sessionId, {
              step: BookingConversationStep.BOOKING_SELECT_SLOT,
              selectedDate: dateResult.parsedDate,
              availableSlots,
              selectedStartTime: undefined,
              selectedEndTime: undefined,
              selectedSlot: undefined,
              selectedTimeLabel: undefined,
            });
            return {
              response: {
                success: true,
                response: `No problem! I updated the date to ${dateResult.formattedLabel}. Available times are ${slotLabels}. Which one would you prefer?`,
                action: AIAction.CHECK_AVAILABILITY,
                intent: AIIntent.BOOK_APPOINTMENT,
                sessionId,
                source: 'deterministic',
                latencyMs: performance.now() - startTime,
              },
              updatedSession: updated,
            };
          }
        }

        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_DATE,
          selectedDate: undefined,
          availableSlots: [],
          selectedStartTime: undefined,
          selectedEndTime: undefined,
          selectedSlot: undefined,
          selectedTimeLabel: undefined,
        });
        return {
          response: {
            success: true,
            response: "Sure, let's pick a different date. What date would you prefer?",
            action: AIAction.CHECK_AVAILABILITY,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 2. Time Correction
      if (correction.field === 'time') {
        if (session.selectedDate) {
          const slots =
            session.availableSlots && session.availableSlots.length > 0
              ? session.availableSlots
              : await AppointmentSlotFinder.findAvailableSlots({
                  businessId,
                  dateStr: session.selectedDate,
                  durationMinutes: session.serviceDurationMinutes || 30,
                  staffId: session.selectedStaffId,
                });

          const timeMatch = TimeParser.matchSlot(rawInput, slots);
          if (timeMatch.matchedSlot) {
            const slot = timeMatch.matchedSlot;
            const assignedStaffId = slot.staffId || session.selectedStaffId || null;
            const assignedStaffName = slot.staffName || session.selectedStaffName || null;

            if (session.customerName && session.customerPhone) {
              const updated = await this.sessionStore.updateSession(sessionId, {
                step: BookingConversationStep.BOOKING_CONFIRM,
                selectedSlot: slot,
                selectedTimeLabel: slot.timeLabel,
                selectedStartTime: slot.startTime,
                selectedEndTime: slot.endTime,
                selectedStaffId: assignedStaffId,
                selectedStaffName: assignedStaffName,
              });
              const staffClause =
                assignedStaffName && assignedStaffName !== 'Any Available Specialist'
                  ? ` with ${assignedStaffName}`
                  : '';
              return {
                response: {
                  success: true,
                  response: `Updated your appointment time to ${slot.timeLabel}. Please confirm: ${session.selectedServiceName}${staffClause} on ${session.selectedDate} at ${slot.timeLabel} for ${session.customerName}. Should I confirm this booking?`,
                  action: AIAction.CREATE_APPOINTMENT,
                  intent: AIIntent.BOOK_APPOINTMENT,
                  sessionId,
                  source: 'deterministic',
                  latencyMs: performance.now() - startTime,
                },
                updatedSession: updated,
              };
            } else {
              const updated = await this.sessionStore.updateSession(sessionId, {
                step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME,
                selectedSlot: slot,
                selectedTimeLabel: slot.timeLabel,
                selectedStartTime: slot.startTime,
                selectedEndTime: slot.endTime,
                selectedStaffId: assignedStaffId,
                selectedStaffName: assignedStaffName,
              });
              return {
                response: {
                  success: true,
                  response: `Updated your appointment time to ${slot.timeLabel}! May I have your full name, please?`,
                  action: AIAction.SEARCH_CUSTOMER,
                  intent: AIIntent.BOOK_APPOINTMENT,
                  sessionId,
                  source: 'deterministic',
                  latencyMs: performance.now() - startTime,
                },
                updatedSession: updated,
              };
            }
          }

          const updated = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.BOOKING_SELECT_SLOT,
            selectedStartTime: undefined,
            selectedEndTime: undefined,
            selectedSlot: undefined,
            selectedTimeLabel: undefined,
            availableSlots: slots,
          });
          return {
            response: {
              success: true,
              response: `Sure! The available times on ${session.selectedDate} are ${slots.map((s) => s.timeLabel).join(', ')}. Which one works best?`,
              action: AIAction.CHECK_AVAILABILITY,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }
      }

      // 3. Service Correction
      if (correction.field === 'service') {
        const resetSession = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
          selectedServiceId: undefined,
          selectedServiceName: undefined,
          selectedStaffId: undefined,
          selectedStaffName: undefined,
          selectedDate: undefined,
          selectedStartTime: undefined,
          selectedEndTime: undefined,
          selectedSlot: undefined,
          selectedTimeLabel: undefined,
          availableSlots: [],
        });
        return {
          response: {
            success: true,
            response: "Sure, let's select a different service. Which service would you like to book?",
            action: AIAction.GET_SERVICES,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: resetSession,
        };
      }

      // 4. Specialist Correction
      if (correction.field === 'staff') {
        const resetSession = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_STAFF,
          selectedStaffId: undefined,
          selectedStaffName: undefined,
          selectedDate: undefined,
          selectedStartTime: undefined,
          selectedEndTime: undefined,
          selectedSlot: undefined,
          selectedTimeLabel: undefined,
          availableSlots: [],
        });
        return {
          response: {
            success: true,
            response: 'No problem. Which specialist would you prefer, or is anyone okay?',
            action: AIAction.GET_STAFF,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: resetSession,
        };
      }

      // 5. Name Correction
      if (correction.field === 'name') {
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME,
          customerName: undefined,
        });
        return {
          response: {
            success: true,
            response: 'No problem. Could you please tell me your first and last name?',
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 6. Phone Correction
      if (correction.field === 'phone') {
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE,
          customerPhone: undefined,
        });
        return {
          response: {
            success: true,
            response: 'No problem. What is your 10-digit phone number?',
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }
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
            response: `Got it, ${s.name}. Do you have a preferred specialist, or is anyone okay?`,
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
            response: 'Sounds good. What date would you prefer?',
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
            selectedSlot: slot,
            selectedTimeLabel: slot.timeLabel,
            selectedStartTime: slot.startTime,
            selectedEndTime: slot.endTime,
            selectedStaffId: assignedStaffId,
            selectedStaffName: assignedStaffName,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
          });

          const staffClause =
            assignedStaffName && assignedStaffName !== 'Any Available Specialist'
              ? ` with ${assignedStaffName}`
              : '';
          return {
            response: {
              success: true,
              response: `Please confirm your appointment: ${session.selectedServiceName}${staffClause} on ${session.selectedDate} at ${slot.timeLabel} for ${customer.name}, phone ${customer.phone}. Would you like me to book it?`,
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

      // If customer is not identified yet, save exact slot identity and ask for customer full name first
      const updated = await this.sessionStore.updateSession(sessionId, {
        step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME,
        selectedSlot: slot,
        selectedTimeLabel: slot.timeLabel,
        selectedStartTime: slot.startTime,
        selectedEndTime: slot.endTime,
        selectedStaffId: assignedStaffId,
        selectedStaffName: assignedStaffName,
      });

      return {
        response: {
          success: true,
          response: `Got it for ${slot.timeLabel}! May I have your full name, please?`,
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
    // STEP 5A: COLLECT CUSTOMER NAME
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME) {
      const nameResult = NameParser.parseName(rawInput);

      if (!nameResult.isValid || !nameResult.name) {
        return {
          response: {
            success: true,
            response: 'Could you please tell me your first and last name?',
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      const customerName = nameResult.name;
      const inlinePhone = nameResult.phone || NameParser.extractPhone(rawInput);

      if (inlinePhone) {
        const digits = inlinePhone.replace(/[^0-9]/g, '');
        const formattedPhone = digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : inlinePhone;
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME,
          customerName,
          customerPhone: formattedPhone,
        });

        return {
          response: {
            success: true,
            response: `Just to make sure I got that right, your name is ${customerName} and your phone number is ${formattedPhone}, correct?`,
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // Transition to explicit name confirmation
      const updated = await this.sessionStore.updateSession(sessionId, {
        step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME,
        customerName,
      });

      return {
        response: {
          success: true,
          response: `Just to make sure I got that right, your name is ${customerName}, correct?`,
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
    // STEP 5A-2: CONFIRM CUSTOMER NAME
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME) {
      const nameConfirm = ConfirmationParser.parseConfirmation(rawInput);

      if (nameConfirm === 'CONFIRMED') {
        if (session.customerPhone) {
          const updated = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE,
          });
          return {
            response: {
              success: true,
              response: `I heard your phone number as ${session.customerPhone}. Is that correct?`,
              action: AIAction.SEARCH_CUSTOMER,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }

        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE,
        });

        return {
          response: {
            success: true,
            response: `Thank you, ${session.customerName}! Could you please provide your phone number so we can confirm your booking?`,
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      if (nameConfirm === 'REJECTED' || ConfirmationParser.parseCorrectionIntent(rawInput).isCorrection) {
        // Check if caller provided the corrected name in the same utterance (e.g. "No, my name is Alex Turner")
        const inlineNewName = NameParser.parseName(rawInput);
        const cleanedName = inlineNewName.name
          ? inlineNewName.name.replace(/\b(no|wrong|not|incorrect|misheard|that'?s not|it'?s not)\b/gi, '').trim()
          : '';

        if (inlineNewName.isValid && cleanedName.length >= 2) {
          const updated = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME,
            customerName: cleanedName,
          });
          return {
            response: {
              success: true,
              response: `I apologize! Just to confirm, your name is ${cleanedName}, correct?`,
              action: AIAction.SEARCH_CUSTOMER,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }

        // Otherwise, caller said "No, you got it wrong" / "That's not my name" -> discard and re-prompt
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME,
          customerName: undefined,
        });

        return {
          response: {
            success: true,
            response: 'I apologize for the misunderstanding. Could you please repeat your first and last name?',
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      return {
        response: {
          success: true,
          response: `Please say "Yes" if your name is ${session.customerName}, or tell me your correct name.`,
          action: AIAction.SEARCH_CUSTOMER,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: session,
      };
    }

    // ----------------------------------------------------
    // STEP 5B: COLLECT CUSTOMER PHONE
    // ----------------------------------------------------
    if (
      session.step === BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE ||
      session.step === BookingConversationStep.BOOKING_COLLECT_CUSTOMER
    ) {
      const extractedPhone = NameParser.extractPhone(rawInput);

      if (!extractedPhone) {
        return {
          response: {
            success: true,
            response: 'Please provide a valid 10-digit phone number so we can confirm your booking.',
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      const digits = extractedPhone.replace(/[^0-9]/g, '');
      const formattedPhone = digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : extractedPhone;

      const updated = await this.sessionStore.updateSession(sessionId, {
        step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE,
        customerPhone: formattedPhone,
      });

      return {
        response: {
          success: true,
          response: `I heard your phone number as ${formattedPhone}. Is that correct?`,
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
    // STEP 5B-2: CONFIRM CUSTOMER PHONE
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE) {
      const phoneConfirm = ConfirmationParser.parseConfirmation(rawInput);

      if (phoneConfirm === 'CONFIRMED') {
        const customerName = session.customerName || 'Guest Customer';
        const customer = await this.resolveOrCreateCustomer(businessId, customerName, session.customerPhone!);

        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_CONFIRM,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
        });

        const timeLabel = session.selectedTimeLabel || session.selectedSlot?.timeLabel || 'your selected time';
        const staffClause =
          session.selectedStaffId && session.selectedStaffName && session.selectedStaffName !== 'Any Available Specialist'
            ? ` with ${session.selectedStaffName}`
            : '';

        return {
          response: {
            success: true,
            response: `Thank you, ${customer.name}! Please confirm: ${session.selectedServiceName}${staffClause} on ${session.selectedDate} at ${timeLabel} for ${customer.name}, phone ${customer.phone}. Should I confirm this appointment?`,
            action: AIAction.CREATE_APPOINTMENT,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      if (phoneConfirm === 'REJECTED' || ConfirmationParser.parseCorrectionIntent(rawInput).isCorrection) {
        // Check if caller repeated a new phone number inline (e.g. "No, it's 555-987-6543")
        const inlineNewPhone = NameParser.extractPhone(rawInput);
        if (inlineNewPhone) {
          const digits = inlineNewPhone.replace(/[^0-9]/g, '');
          const formattedNewPhone = digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : inlineNewPhone;
          const updated = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE,
            customerPhone: formattedNewPhone,
          });
          return {
            response: {
              success: true,
              response: `Got it, I updated your phone number to ${formattedNewPhone}. Is that correct?`,
              action: AIAction.SEARCH_CUSTOMER,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }

        // Caller said "No, you got it wrong" / "Wrong number" -> discard previous phone and re-prompt
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE,
          customerPhone: undefined,
        });

        return {
          response: {
            success: true,
            response: "I apologize. Let's try that again. What is your phone number?",
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      return {
        response: {
          success: true,
          response: `Please say "Yes" if ${session.customerPhone} is your correct phone number, or say "No" to correct it.`,
          action: AIAction.SEARCH_CUSTOMER,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: session,
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

        if (createResult.success && (createResult.data as any)?.id) {
          const appointmentId = (createResult.data as any).id;
          await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.BOOKING_COMPLETE,
            expiresAt: new Date(Date.now() + 60 * 1000), // Keep available for 1 min for client reference
          });

          const timeLabel = session.selectedTimeLabel || session.selectedSlot?.timeLabel || 'your requested time';
          const staffClause =
            session.selectedStaffName && session.selectedStaffName !== 'Any Available Specialist'
              ? ` with ${session.selectedStaffName}`
              : '';

          return {
            response: {
              success: true,
              response: `Your appointment for ${session.selectedServiceName}${staffClause} on ${session.selectedDate} at ${timeLabel} has been successfully booked! We look forward to seeing you, ${session.customerName || 'valued customer'}.`,
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
              response: `I'm sorry, I wasn't able to complete the booking due to: ${createResult.error?.message || 'a scheduling conflict'}. Would you like to select another time?`,
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

  /**
   * Deterministically resolves an existing customer or creates a new customer profile,
   * strictly adhering to multi-tenant business isolation and global phone uniqueness.
   */
  public async resolveOrCreateCustomer(
    businessId: string,
    name: string,
    phoneInput: string
  ): Promise<{ id: string; name: string; phone: string }> {
    const cleanPhone = phoneInput.trim();
    const digits = cleanPhone.replace(/[^0-9]/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

    // 1. Look for existing customer in the active business tenant
    let customer = await prisma.customer.findFirst({
      where: {
        businessId,
        OR: [
          { phone: cleanPhone },
          ...(last10.length >= 7 ? [{ phone: { contains: last10 } }] : []),
        ],
      },
    });

    if (customer) {
      if (name && name !== 'Guest Customer' && (!customer.name || customer.name === 'Guest Customer')) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { name },
        });
      }
      return customer;
    }

    // 2. Look for existing customer globally by phone
    const globalCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          ...(last10.length >= 7 ? [{ phone: { contains: last10 } }] : []),
        ],
      },
    });

    if (globalCustomer) {
      customer = await prisma.customer.update({
        where: { id: globalCustomer.id },
        data: {
          businessId,
          ...(name && name !== 'Guest Customer' ? { name } : {}),
        },
      });
      return customer;
    }

    // 3. Create a new customer record scoped to businessId
    const formattedPhone = cleanPhone.startsWith('+') || cleanPhone.includes('-')
      ? cleanPhone
      : digits.length === 10
        ? `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
        : cleanPhone;

    try {
      customer = await prisma.customer.create({
        data: {
          businessId,
          name: name || 'Guest Customer',
          phone: formattedPhone,
        },
      });
      return customer;
    } catch (err: any) {
      // Concurrency / unique constraint safety
      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: formattedPhone },
            { phone: cleanPhone },
            ...(last10.length >= 7 ? [{ phone: { contains: last10 } }] : []),
          ],
        },
      });
      if (existing) {
        if (existing.businessId !== businessId) {
          return await prisma.customer.update({
            where: { id: existing.id },
            data: { businessId, ...(name && name !== 'Guest Customer' ? { name } : {}) },
          });
        }
        return existing;
      }
      throw err;
    }
  }
}

// Export singleton global state machine
import { sessionStore } from './in-memory-session-store';
export const appointmentStateMachine = new AppointmentStateMachine(sessionStore);
