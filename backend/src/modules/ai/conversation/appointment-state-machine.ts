import { prisma } from '../../../lib/prisma';
import { toolRouter } from '../tools/router';
import { AIAction } from '../types/action.types';
import { AIConversationContext } from '../types/context.types';
import { AIIntent } from '../types/intent.types';
import { AIReceptionistResponse } from '../types/request-response.types';
import {
  BookingConversationStep,
  ConversationSessionData,
  DentalTriageProfile,
  PatientGoalType,
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
import { FastIntentRouter } from '../routing/intent-router';
import {
  getClinicKnowledge,
  findDoctorCabin,
  findClinicFAQ,
  isUnrelatedInquiry,
  isQuestionLike,
  triageDentalInquiry,
  findNetworkClinicRecommendation,
  formatNetworkRecommendationPrompt,
} from '../knowledge';
import { extractTriageFacts, mergeTriageFacts } from '../knowledge/triage-extractor';
import { isSpreadingFacialSwelling } from '../knowledge/global-dental-catalogue';

export interface StateMachineResult {
  response: AIReceptionistResponse;
  updatedSession: ConversationSessionData | null;
}

function isSisterPracticeQuery(rawInput: string): boolean {
  const normalized = rawInput.toLowerCase().trim();
  if (/\b(lumina|this clinic|here|current clinic)\b/i.test(normalized)) {
    return false;
  }
  return (
    /\b(where\s+(?:are\s+they|is\s+(?:that|it|the\s+clinic)|are\s+they\s+located)|what\s+is\s+their\s+address|location|address)\b/i.test(normalized) ||
    /\b(who\s+is\s+the\s+(?:doctor|specialist|dentist|surgeon)|tell\s+me\s+about\s+the\s+(?:doctor|specialist|dentist)|doctor\s+name|specialist\s+name)\b/i.test(normalized) ||
    /\b(what('?s| is) their (?:phone|number)|phone\s*number|how (?:do|can) i call|how (?:do|can) i contact|how (?:do|can) i reach)\b/i.test(normalized) ||
    /\b(when\s+are\s+they\s+open|their\s+hours|what\s+time\s+do\s+they\s+close|what\s+are\s+their\s+hours|opening\s+hours)\b/i.test(normalized) ||
    /\b(which\s+clinic|what\s+clinic|what\s+is\s+the\s+name\s+of\s+the\s+clinic|what\s+do\s+they\s+specialize\s+in|specialty)\b/i.test(normalized) ||
    /\b(tell\s+me\s+about\s+(?:them|it|the\s+other\s+clinic|the\s+sister\s+clinic|apex|zenith|radiance)|tell\s+me\s+more(?:\s+first)?|what\s+do\s+you\s+mean)\b/i.test(normalized)
  );
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
      session.step !== BookingConversationStep.TRIAGE_CLARIFICATION &&
      session.step !== BookingConversationStep.BOOKING_SYMPTOM_TRIAGE &&
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
        const inlineNewName = NameParser.parseName(rawInput);
        const cleanedName = inlineNewName.name
          ? inlineNewName.name.replace(/\b(no|wrong|not|incorrect|misheard|that'?s not|it'?s not|actually|wait)\b/gi, '').trim()
          : '';

        if (inlineNewName.isValid && cleanedName.length >= 2) {
          const updated = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME,
            customerName: cleanedName,
          });
          return {
            response: {
              success: true,
              response: `I've updated your name to ${cleanedName}. Just to make sure I got that right, your name is ${cleanedName}, correct?`,
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
    // MID-BOOKING FAQ INTERRUPTION & SEAMLESS RESUMPTION
    // ----------------------------------------------------
    // ----------------------------------------------------
    // MID-BOOKING FAQ INTERRUPTION & SEAMLESS RESUMPTION
    // ----------------------------------------------------
    const midIntentMatch = FastIntentRouter.routeIntent(rawInput, businessId);
    const faqLookup = findClinicFAQ(businessId, rawInput);
    const isUnrelated = isUnrelatedInquiry(rawInput) || midIntentMatch.intent === AIIntent.UNRELATED_INQUIRY;
    const isQuestion = isQuestionLike(rawInput);

    const isTriageStep =
      session.step === BookingConversationStep.TRIAGE_CLARIFICATION ||
      session.step === BookingConversationStep.BOOKING_SYMPTOM_TRIAGE ||
      session.step === BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED;

    const isFaqIntent =
      [
        AIIntent.CABIN_ROOM_LOCATION,
        AIIntent.CLINIC_DIRECTIONS,
        AIIntent.WAITING_AREA_POLICY,
        AIIntent.EMERGENCY_DENTAL,
        AIIntent.APPOINTMENT_PREPARATION,
        AIIntent.PAYMENT_POLICY,
        AIIntent.BUSINESS_INFORMATION,
        AIIntent.CLINIC_FAQ,
      ].includes(midIntentMatch.intent) ||
      (midIntentMatch.intent === AIIntent.DENTAL_SYMPTOM_INQUIRY &&
        !isTriageStep &&
        session.step !== BookingConversationStep.BOOKING_COLLECT_SERVICE) ||
      faqLookup.matched ||
      faqLookup.isClinicQuestion ||
      isUnrelated ||
      (midIntentMatch.intent === AIIntent.STAFF_INFORMATION && session.step !== BookingConversationStep.BOOKING_COLLECT_STAFF);

    // Guard: Do not intercept simple YES/NO or explicit data inputs at confirmation steps,
    // nor queries specifically directed at the sister clinic recommendation
    const isSisterQuery =
      session.step === BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED &&
      isSisterPracticeQuery(rawInput);

    const isSimpleConfirmTurn =
      ((session.step === BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME ||
        session.step === BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE ||
        session.step === BookingConversationStep.BOOKING_CONFIRM ||
        session.step === BookingConversationStep.BOOKING_SYMPTOM_TRIAGE ||
        session.step === BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED) &&
        (confirmCheck === 'CONFIRMED' || confirmCheck === 'REJECTED')) ||
      isSisterQuery;

    if ((isFaqIntent || isQuestion) && !isSimpleConfirmTurn) {
      const clinicProfile = getClinicKnowledge(businessId);
      let faqAnswer = '';
      let matchedIntent = midIntentMatch.intent;

      // Emergency overrides booking completely without asking to resume
      if (midIntentMatch.intent === AIIntent.EMERGENCY_DENTAL) {
        const emergencyAnswer = clinicProfile
          ? `${clinicProfile.emergencyPolicy.immediateInstruction} ${clinicProfile.emergencyPolicy.erInstruction}`
          : 'If you are experiencing difficulty breathing, severe facial swelling, or continuous heavy bleeding, please call 911 or go to the nearest emergency room immediately.';

        return {
          response: {
            success: true,
            response: emergencyAnswer,
            action: AIAction.EMERGENCY_ESCALATION,
            intent: AIIntent.EMERGENCY_DENTAL,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      if (isUnrelated) {
        matchedIntent = AIIntent.UNRELATED_INQUIRY;
        faqAnswer = `I'm here to help with ${clinicProfile?.businessName || 'our dental clinic'}, appointments, and clinic information.`;
      } else if (midIntentMatch.intent === AIIntent.DENTAL_SYMPTOM_INQUIRY) {
        const triageRes = triageDentalInquiry(businessId, rawInput);
        if (triageRes.isEmergency) {
          const emergencyAnswer = clinicProfile
            ? `${clinicProfile.emergencyPolicy.immediateInstruction} ${clinicProfile.emergencyPolicy.erInstruction}`
            : triageRes.responsePrompt ||
              'If you are experiencing difficulty breathing, severe facial swelling, or continuous heavy bleeding, please call 911 or go to the nearest emergency room immediately.';

          return {
            response: {
              success: true,
              response: emergencyAnswer,
              action: AIAction.EMERGENCY_ESCALATION,
              intent: AIIntent.EMERGENCY_DENTAL,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: session,
          };
        }

        if (!triageRes.isSupportedByClinic) {
          faqAnswer =
            triageRes.unavailableExplanation ||
            `${clinicProfile?.businessName || 'This clinic'} does not currently list that specialized treatment among its available services.`;
        } else if (triageRes.isAmbiguous && triageRes.ambiguousQuestion) {
          faqAnswer = triageRes.ambiguousQuestion;
        } else {
          faqAnswer =
            triageRes.cautiousExplanation ||
            'A dental clinical examination would be an appropriate place to start so our dentist can evaluate this concern.';
        }
      } else if (faqLookup.matched && faqLookup.answer) {
        matchedIntent = AIIntent.CLINIC_FAQ;
        faqAnswer = faqLookup.answer;
      } else if (midIntentMatch.intent === AIIntent.CABIN_ROOM_LOCATION) {
        const cabinRes = findDoctorCabin(businessId, rawInput);
        if (cabinRes && cabinRes.directions) {
          faqAnswer = cabinRes.directions;
        } else if (clinicProfile) {
          const list = clinicProfile.doctors.map((d) => `${d.cabin} (${d.name})`).join(', ');
          faqAnswer = `Our consultation rooms include ${list}.`;
        } else {
          faqAnswer = 'Our doctor cabins are located on the ground floor of our clinic.';
        }
      } else if (midIntentMatch.intent === AIIntent.CLINIC_DIRECTIONS) {
        if (clinicProfile) {
          faqAnswer = `${clinicProfile.navigation.receptionDesk} ${clinicProfile.navigation.waitingLounge}`;
        } else {
          faqAnswer = 'Our reception desk is directly inside the entrance, and our staff will guide you to your room.';
        }
      } else if (midIntentMatch.intent === AIIntent.WAITING_AREA_POLICY) {
        if (clinicProfile) {
          if (/\b(check in|after entering|when i arrive|enter the clinic)\b/i.test(rawInput)) {
            faqAnswer = clinicProfile.patientGuidance.checkInProcedure;
          } else if (/\b(early|arrive early|arriving early)\b/i.test(rawInput)) {
            faqAnswer = clinicProfile.patientGuidance.earlyArrivalPolicy;
          } else if (/\b(late|running late)\b/i.test(rawInput)) {
            faqAnswer = clinicProfile.patientGuidance.lateArrivalPolicy;
          } else {
            faqAnswer = `${clinicProfile.navigation.waitingLounge} ${clinicProfile.patientGuidance.earlyArrivalPolicy}`;
          }
        } else {
          faqAnswer = 'You are welcome to relax in our waiting area before your visit. If running late, please call our office.';
        }
      } else if (midIntentMatch.intent === AIIntent.APPOINTMENT_PREPARATION) {
        if (clinicProfile) {
          faqAnswer = clinicProfile.patientGuidance.firstTimePatientInstructions;
        } else {
          faqAnswer = 'Please arrive 10 minutes early with a valid photo ID and your dental insurance card or payment method.';
        }
      } else if (midIntentMatch.intent === AIIntent.PAYMENT_POLICY) {
        faqAnswer = 'We accept most major dental insurance plans, credit cards, debit cards, and cash. Please bring your card to your visit.';
      } else if (midIntentMatch.intent === AIIntent.STAFF_INFORMATION) {
        if (clinicProfile) {
          const docList = clinicProfile.doctors.map((d) => `${d.name} (${d.title})`).join(', ');
          faqAnswer = `Our specialists include ${docList}.`;
        } else {
          faqAnswer = 'Our certified specialists are here to assist with your care.';
        }
      } else if (midIntentMatch.intent === AIIntent.BUSINESS_INFORMATION) {
        if (clinicProfile) {
          faqAnswer = `${clinicProfile.businessName} is located at ${clinicProfile.address}. Our hours are: ${clinicProfile.openingHours}.`;
        } else {
          faqAnswer = 'Our clinic is open during standard operating hours Monday through Friday.';
        }
      } else if (faqLookup.isClinicQuestion || isQuestion) {
        matchedIntent = AIIntent.CLINIC_FAQ;
        faqAnswer = "I don't have specific information about that policy on file, but our front desk will be happy to assist you upon your arrival.";
      }

      // Compose seamless resumption question based on active session step
      let resumeQuestion = 'Continuing with your appointment, how can I assist you?';
      if (session.step === BookingConversationStep.TRIAGE_CLARIFICATION) {
        resumeQuestion = session.triageProfile?.activeFollowUpQuestion
          ? `Returning to your dental concern, ${session.triageProfile.activeFollowUpQuestion}`
          : 'Returning to your dental concern, could you tell me a little more about what you are experiencing?';
      } else if (session.step === BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED) {
        const candidateName = session.pendingRecommendation?.candidateClinicName || 'our sister practice';
        resumeQuestion = `Returning to our sister practice, would you like more information about ${candidateName}?`;
      } else if (session.step === BookingConversationStep.BOOKING_SYMPTOM_TRIAGE) {
        resumeQuestion = `Returning to your dental concern, would you like to schedule an appointment for ${session.suggestedServiceName || 'a comprehensive exam'}?`;
      } else if (session.step === BookingConversationStep.BOOKING_COLLECT_SERVICE) {
        resumeQuestion = 'Returning to your booking, which service would you like to schedule?';
      } else if (session.step === BookingConversationStep.BOOKING_COLLECT_STAFF) {
        resumeQuestion = `Returning to your booking for ${session.selectedServiceName}, do you have a preferred specialist, or is anyone okay?`;
      } else if (session.step === BookingConversationStep.BOOKING_COLLECT_DATE) {
        resumeQuestion = 'Now, returning to your appointment, what date would you prefer?';
      } else if (session.step === BookingConversationStep.BOOKING_SELECT_SLOT) {
        const slotLabels = session.availableSlots?.map((s) => s.timeLabel).join(', ') || 'our available times';
        resumeQuestion = `Returning to your appointment on ${session.selectedDate}, which time works best: ${slotLabels}?`;
      } else if (session.step === BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME) {
        resumeQuestion = 'Returning to your booking, may I have your full name, please?';
      } else if (session.step === BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME) {
        resumeQuestion = `Returning to your booking, please confirm: is your name ${session.customerName}?`;
      } else if (session.step === BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE) {
        resumeQuestion = `Returning to your booking for ${session.customerName}, what is your 10-digit phone number?`;
      } else if (session.step === BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE) {
        resumeQuestion = `Returning to your booking, please confirm: is your phone number ${session.customerPhone}?`;
      } else if (session.step === BookingConversationStep.BOOKING_CONFIRM) {
        resumeQuestion = `Returning to your appointment confirmation for ${session.selectedServiceName} on ${session.selectedDate} at ${session.selectedTimeLabel}, should I confirm this booking?`;
      }

      return {
        response: {
          success: true,
          response: `${faqAnswer} ${resumeQuestion}`,
          action: AIAction.NONE,
          intent: matchedIntent,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: session,
      };
    }

    // ----------------------------------------------------
    // STEP: NETWORK RECOMMENDATION OFFERED
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED) {
      const rec = session.pendingRecommendation;
      const clinicProfile = getClinicKnowledge(businessId);
      const currentClinicName = clinicProfile?.businessName || 'our clinic';

      if (!rec) {
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
        });
        return {
          response: {
            success: true,
            response: `How may I assist you with your booking at ${currentClinicName}?`,
            action: AIAction.NONE,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 1. Natural Decline / Rejection
      const isDecline =
        confirmCheck === 'REJECTED' ||
        /\b(no\s+thanks|no\s+thank\s+you|nah|nope|not\s+interested|don'?t\s+bother|never\s*mind|nevermind)\b/i.test(rawInput) ||
        /\b(?:i'?ll\s+stay\s+here|stay\s+here|stay\s+with\s+(?:lumina|this clinic|here)|rather\s+stay|see\s+someone\s+here|continue\s+here|let'?s\s+continue\s+here|stick\s+with\s+lumina|stay\s+at\s+lumina)\b/i.test(rawInput) ||
        /^(no|nope|nah)$/i.test(rawInput.trim());

      if (isDecline) {
        const evalServiceId = 'sv000001-0000-0000-0000-000000000001';
        const evalServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
        const evalStaffId = 's0000001-0000-0000-0000-000000000001';
        const evalStaffName = 'Dr. Marcus Thorne';

        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_SYMPTOM_TRIAGE,
          pendingRecommendation: undefined,
          suggestedServiceId: evalServiceId,
          suggestedServiceName: evalServiceName,
          selectedServiceId: evalServiceId,
          selectedServiceName: evalServiceName,
          selectedStaffId: evalStaffId,
          selectedStaffName: evalStaffName,
        });

        return {
          response: {
            success: true,
            response: `Of course. We can continue with ${currentClinicName}. I can help arrange a comprehensive examination so our dentist can evaluate your concerns and discuss available options. Would you like to schedule an appointment for ${evalServiceName}?`,
            action: AIAction.NONE,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 2. Specific Sister Clinic Clarification Queries
      // 2a. Address / Location
      if (
        /\b(where\s+(?:are\s+they|is\s+(?:that|it|the\s+clinic)|are\s+they\s+located)|what\s+is\s+their\s+address|location|address)\b/i.test(rawInput)
      ) {
        return {
          response: {
            success: true,
            response: `${rec.candidateClinicName} is located at ${rec.address}. Would you like more information about their services, or would you prefer care options here at ${currentClinicName}?`,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // 2b. Doctor / Specialist
      if (
        /\b(who\s+is\s+the\s+(?:doctor|specialist|dentist|surgeon)|tell\s+me\s+about\s+the\s+(?:doctor|specialist|dentist)|doctor\s+name|specialist\s+name)\b/i.test(rawInput)
      ) {
        const specialistPart = rec.recommendedSpecialistName
          ? `${rec.recommendedSpecialistName} is the specialist for ${rec.recommendedServiceName.toLowerCase()} at ${rec.candidateClinicName}.`
          : `${rec.candidateClinicName} has specialized practitioners offering ${rec.recommendedServiceName.toLowerCase()}.`;
        return {
          response: {
            success: true,
            response: `${specialistPart} Would you like more information about this clinic, or would you prefer options here at ${currentClinicName}?`,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // 2c. Phone / Contact
      if (
        /\b(phone|number|phone\s*number|what('?s| is) their (?:phone|number)|how (?:do|can) i call|how (?:do|can) i contact|how (?:do|can) i reach)\b/i.test(rawInput)
      ) {
        return {
          response: {
            success: true,
            response: `You can reach ${rec.candidateClinicName} directly at ${rec.phone}. Would you like any other details, or would you prefer to explore options at ${currentClinicName}?`,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // 2d. Opening Hours
      if (
        /\b(when\s+are\s+they\s+open|their\s+hours|what\s+time\s+do\s+they\s+close|what\s+are\s+their\s+hours|opening\s+hours)\b/i.test(rawInput)
      ) {
        return {
          response: {
            success: true,
            response: `${rec.candidateClinicName} is open ${rec.openingHours}. Would you like more information, or would you prefer care options here at ${currentClinicName}?`,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // 2e. Clinic Name / Specialty / What do you mean / Tell me more first
      if (
        /\b(which\s+clinic|what\s+clinic|what\s+is\s+the\s+name\s+of\s+the\s+clinic|what\s+do\s+they\s+specialize\s+in|specialty|what\s+do\s+you\s+mean|tell\s+me\s+more\s+first)\b/i.test(rawInput)
      ) {
        return {
          response: {
            success: true,
            response: `${rec.candidateClinicName}. They specialize in ${rec.candidateSpecialty.toLowerCase()} and offer ${rec.recommendedServiceName}. Would you like more details about them, or would you prefer options at ${currentClinicName}?`,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // 3. Natural Acceptance / Patient requests details / Yes
      const isAcceptance =
        confirmCheck === 'CONFIRMED' ||
        /\b(yes|sure|yeah|yep|please|tell\s+me|tell\s+me\s+about\s+(?:them|it|the\s+other\s+clinic|the\s+sister\s+clinic)|tell\s+me\s+more|okay|ok|sounds\s+good|more\s+information|more\s+info|i\s+would\s+like\s+to\s+know\s+more)\b/i.test(rawInput) ||
        rawInput.toLowerCase().includes(rec.candidateClinicName.toLowerCase()) ||
        /\b(zenith|apex|radiance)\b/i.test(rawInput);

      if (isAcceptance) {
        const specialistClause = rec.recommendedSpecialistName
          ? ` with ${rec.recommendedSpecialistName}`
          : '';
        const fullDetails =
          `${rec.candidateClinicName} specializes in ${rec.candidateSpecialty.toLowerCase()} and offers ${rec.recommendedServiceName}${specialistClause}. ` +
          `They are located at ${rec.address}, open ${rec.openingHours}, and can be reached directly at ${rec.phone}. ` +
          `Since each clinic manages its own appointments directly, you can contact them to schedule. ` +
          `Would you like to explore care options available at ${currentClinicName}?`;

        return {
          response: {
            success: true,
            response: fullDetails,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // 4. Hesitant / Thinking
      if (/\b(maybe|think\s+about\s+it|i'?ll\s+think|not\s+sure)\b/i.test(rawInput)) {
        return {
          response: {
            success: true,
            response: `Take your time. If you would like more details about ${rec.candidateClinicName} or wish to schedule an evaluation here at ${currentClinicName}, just let me know.`,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // 5. Default re-prompt preserving recommendation state
      return {
        response: {
          success: true,
          response: `Would you like me to share more details about ${rec.candidateClinicName}, or would you prefer to explore care options here at ${currentClinicName}?`,
          action: AIAction.NONE,
          intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: session,
      };
    }

    // ----------------------------------------------------
    // STEP -1: TRIAGE CLARIFICATION (Ambiguous Symptom Follow-Up)
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.TRIAGE_CLARIFICATION) {
      const newFacts = extractTriageFacts(rawInput, session.triageProfile);
      const existingProfile: DentalTriageProfile = session.triageProfile || {
        originalPatientStatement: session.reportedSymptom || rawInput,
        reportedSymptoms: [],
        symptomCategories: [],
        triggers: [],
        urgencyLevel: 'ROUTINE',
        followUpHistory: [],
        isAmbiguous: true,
      };

      const updatedProfile = mergeTriageFacts(existingProfile, newFacts, rawInput);
      const combinedStatement = `${updatedProfile.originalPatientStatement}. ${rawInput}`.trim();
      let triageRes = triageDentalInquiry(businessId, rawInput);
      if (!triageRes.matched || triageRes.isAmbiguous) {
        const combinedRes = triageDentalInquiry(businessId, combinedStatement);
        if (combinedRes.matched && !combinedRes.isAmbiguous) {
          triageRes = combinedRes;
        } else if (!triageRes.matched) {
          triageRes = combinedRes;
        }
      }

      // 1. Life-safety emergency priority
      if (triageRes.isEmergency) {
        const clinicProfile = getClinicKnowledge(businessId);
        const emergencyResponse =
          clinicProfile?.emergencyPolicy?.immediateInstruction
            ? `${clinicProfile.emergencyPolicy.immediateInstruction} ${clinicProfile.emergencyPolicy.erInstruction}`
            : 'If you are experiencing difficulty breathing, severe facial swelling, or continuous heavy bleeding, please call 911 or go to the nearest emergency room immediately.';

        return {
          response: {
            success: true,
            response: emergencyResponse,
            action: AIAction.EMERGENCY_ESCALATION,
            intent: AIIntent.EMERGENCY_DENTAL,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: session,
        };
      }

      // 2. Urgent Spreading Swelling
      if (isSpreadingFacialSwelling(combinedStatement) || isSpreadingFacialSwelling(rawInput)) {
        updatedProfile.swellingPresent = true;
        updatedProfile.urgencyLevel = 'HIGH';
        updatedProfile.isAmbiguous = false;

        const urgentServiceName = 'Comprehensive Oral Exam & Digital X-Rays';
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_SYMPTOM_TRIAGE,
          triageProfile: updatedProfile,
          suggestedServiceId: 'sv000001-0000-0000-0000-000000000001',
          suggestedServiceName: urgentServiceName,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: urgentServiceName,
        });

        return {
          response: {
            success: true,
            response: `Facial or cheek swelling can indicate an active dental infection that requires prompt professional attention. If you develop any difficulty breathing, swallowing, or fever, please seek emergency medical care immediately. For your dental care, we strongly recommend an urgent examination today. Would you like to schedule an appointment for ${urgentServiceName}?`,
            action: AIAction.TRIAGE_SYMPTOM,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 3. Still Ambiguous (No concrete symptoms/scope/triggers extracted)
      const hasClinicalClarity =
        Boolean(updatedProfile.anatomicalScope) ||
        Boolean(updatedProfile.anatomicalLocation) ||
        Boolean(updatedProfile.painPattern) ||
        Boolean(updatedProfile.triggers && updatedProfile.triggers.length > 0) ||
        Boolean(updatedProfile.reportedSymptoms && updatedProfile.reportedSymptoms.length > 0) ||
        triageRes.matched;

      if (!hasClinicalClarity && triageRes.isAmbiguous && triageRes.ambiguousQuestion) {
        updatedProfile.activeFollowUpQuestion = triageRes.ambiguousQuestion;
        const updated = await this.sessionStore.updateSession(sessionId, {
          triageProfile: updatedProfile,
        });
        return {
          response: {
            success: true,
            response: triageRes.ambiguousQuestion,
            action: AIAction.NONE,
            intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 4. Clinical clarity established -> Advance to BOOKING_SYMPTOM_TRIAGE
      updatedProfile.isAmbiguous = false;
      if (triageRes.category && !updatedProfile.symptomCategories.includes(triageRes.category)) {
        updatedProfile.symptomCategories.push(triageRes.category);
      }

      // Check if service is NOT supported by clinic, but sister clinic recommendation exists
      if (!triageRes.isSupportedByClinic && triageRes.category) {
        const recMatch = findNetworkClinicRecommendation(
          businessId,
          triageRes.category,
          updatedProfile.patientGoal as PatientGoalType,
          updatedProfile.urgencyLevel
        );

        if (recMatch) {
          const clinicProfile = getClinicKnowledge(businessId);
          const offerPrompt = formatNetworkRecommendationPrompt(
            recMatch,
            clinicProfile?.businessName || 'our clinic'
          );

          const updated = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED,
            triageProfile: updatedProfile,
            pendingRecommendation: recMatch,
          });

          return {
            response: {
              success: true,
              response: offerPrompt,
              action: AIAction.TRIAGE_SYMPTOM,
              intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }
      }

      const targetServiceId = triageRes.suggestedServiceId || 'sv000001-0000-0000-0000-000000000001';
      const targetServiceName = triageRes.suggestedServiceName || 'Comprehensive Oral Exam & Digital X-Rays';
      const targetSpecialistId = triageRes.suggestedStaffId || 's0000001-0000-0000-0000-000000000001';
      const targetSpecialistName = triageRes.suggestedStaffName || 'Dr. Marcus Thorne';

      const updated = await this.sessionStore.updateSession(sessionId, {
        step: BookingConversationStep.BOOKING_SYMPTOM_TRIAGE,
        triageProfile: updatedProfile,
        suggestedServiceId: targetServiceId,
        suggestedServiceName: targetServiceName,
        selectedServiceId: targetServiceId,
        selectedServiceName: targetServiceName,
        selectedStaffId: targetSpecialistId,
        selectedStaffName: targetSpecialistName,
      });

      const responseText =
        triageRes.responsePrompt ||
        `Thank you for providing those details. A dental examination and digital X-rays would be the appropriate starting point to evaluate the tooth. Would you like to schedule an appointment for ${targetServiceName}?`;

      return {
        response: {
          success: true,
          response: responseText,
          action: AIAction.TRIAGE_SYMPTOM,
          intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: updated,
      };
    }

    // ----------------------------------------------------
    // STEP 0: SYMPTOM TRIAGE CONFIRMATION / GUIDANCE
    // ----------------------------------------------------
    if (session.step === BookingConversationStep.BOOKING_SYMPTOM_TRIAGE) {
      // 1. Check if user provided natural clinical triage details
      const facts = extractTriageFacts(rawInput, session.triageProfile);
      const hasClinicalInfo =
        Boolean(facts.anatomicalScope) ||
        Boolean(facts.anatomicalLocation) ||
        Boolean(facts.duration) ||
        Boolean(facts.onset) ||
        Boolean(facts.painPattern) ||
        Boolean(facts.triggers && facts.triggers.length > 0) ||
        facts.swellingPresent !== undefined ||
        facts.bleedingPresent !== undefined ||
        facts.traumaPresent !== undefined ||
        facts.patientGoal !== undefined;

      if (hasClinicalInfo) {
        const existingProfile: DentalTriageProfile = session.triageProfile || {
          originalPatientStatement: session.reportedSymptom || rawInput,
          reportedSymptoms: [],
          symptomCategories: [],
          triggers: [],
          urgencyLevel: 'ROUTINE',
          followUpHistory: [],
          isAmbiguous: false,
        };

        const updatedProfile = mergeTriageFacts(existingProfile, facts, rawInput);
        const targetServiceName = session.suggestedServiceName || 'Comprehensive Oral Exam & Digital X-Rays';

        // Urgency check (swelling reported)
        if (facts.swellingPresent === true || isSpreadingFacialSwelling(rawInput)) {
          updatedProfile.swellingPresent = true;
          updatedProfile.urgencyLevel = 'HIGH';

          const updated = await this.sessionStore.updateSession(sessionId, {
            triageProfile: updatedProfile,
          });

          return {
            response: {
              success: true,
              response: `I note that swelling is present. Facial swelling should be evaluated promptly by a dentist to prevent spread. Would you like to schedule an urgent evaluation for ${targetServiceName}?`,
              action: AIAction.NONE,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }

        // Check if patient goal changed (e.g. replacing a missing tooth)
        if (facts.patientGoal === 'REPLACE_MISSING_TOOTH' || updatedProfile.patientGoal === 'REPLACE_MISSING_TOOTH') {
          const triageRes = triageDentalInquiry(businessId, rawInput, updatedProfile);
          const updated = await this.sessionStore.updateSession(sessionId, {
            triageProfile: updatedProfile,
            suggestedServiceName: triageRes.suggestedServiceName || targetServiceName,
            suggestedServiceId: triageRes.suggestedServiceId,
          });
          return {
            response: {
              success: true,
              response:
                triageRes.responsePrompt ||
                `Certainly. Replacing a missing tooth can involve options like an implant, bridge, or partial denture depending on your oral health. While Lumina does not perform surgical implant placement in-house, our dentists can perform a comprehensive oral evaluation to assess your options. Would you like to schedule an examination with Dr. Marcus Thorne?`,
              action: AIAction.NONE,
              intent: AIIntent.BOOK_APPOINTMENT,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }

        if (facts.patientGoal === 'COST_INFORMATION' || facts.patientGoal === 'INFORMATION_ONLY') {
          const triageRes = triageDentalInquiry(businessId, rawInput, updatedProfile);
          const updated = await this.sessionStore.updateSession(sessionId, {
            triageProfile: updatedProfile,
          });
          return {
            response: {
              success: true,
              response: triageRes.responsePrompt || 'I can help provide information about our clinic.',
              action: AIAction.NONE,
              intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }

        // Formulate natural acknowledgement
        const acknowledgements: string[] = [];
        if (facts.anatomicalScope === 'single tooth') {
          acknowledgements.push('it is localized to a single tooth');
        }
        if (facts.anatomicalLocation) {
          acknowledgements.push(`located on the ${facts.anatomicalLocation}`);
        }
        if (facts.duration) {
          acknowledgements.push(`has been present for ${facts.duration}`);
        }
        if (facts.onset && !facts.duration) {
          acknowledgements.push(`started ${facts.onset}`);
        }
        if (facts.painPattern === 'constant') {
          acknowledgements.push('the discomfort is constant');
        } else if (facts.painPattern === 'throbbing') {
          acknowledgements.push('it has a throbbing pattern');
        } else if (facts.painPattern === 'intermittent') {
          acknowledgements.push('the pain stops quickly and comes intermittently');
        }
        if (facts.triggers && facts.triggers.includes('cold')) {
          acknowledgements.push('it reacts to cold');
        }
        if (facts.triggers && facts.triggers.includes('sweet')) {
          acknowledgements.push('it reacts to sweets');
        }
        if (facts.swellingPresent === false) {
          acknowledgements.push('there is no swelling');
        }

        const ackText =
          acknowledgements.length > 0
            ? `Thank you for sharing that ${acknowledgements.join(' and ')}.`
            : 'Thank you for providing those details.';

        const updated = await this.sessionStore.updateSession(sessionId, {
          triageProfile: updatedProfile,
        });

        return {
          response: {
            success: true,
            response: `${ackText} A dental examination and digital X-rays will help our dentist inspect the tooth and determine the cause. Would you like to schedule an appointment for ${targetServiceName}?`,
            action: AIAction.NONE,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 2. Caller agreed to book the suggested service
      if (
        confirmCheck === 'CONFIRMED' ||
        /\b(yes|sure|yeah|yep|please|let's do that|book it|schedule it|sounds good|okay|ok|continue)\b/i.test(
          rawInput
        )
      ) {
        const targetServiceId = session.suggestedServiceId || session.selectedServiceId;
        const targetServiceName = session.suggestedServiceName || session.selectedServiceName;

        let duration = session.serviceDurationMinutes || 30;
        if (targetServiceId) {
          try {
            const s = await prisma.service.findUnique({
              where: { id: targetServiceId },
              select: { id: true, name: true, durationMinutes: true },
            });
            if (s) {
              duration = s.durationMinutes;
            }
          } catch {
            // Graceful fallback to default duration when database is offline
          }
        }

        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_STAFF,
          selectedServiceId: targetServiceId,
          selectedServiceName: targetServiceName,
          serviceDurationMinutes: duration,
        });

        const specialistPrompt = session.selectedStaffName
          ? `Dr. Marcus Thorne handles oral examinations, or would you prefer any available dentist?`
          : `Do you have a preferred specialist, or is anyone okay?`;

        return {
          response: {
            success: true,
            response: `Wonderful! I've selected ${targetServiceName}. ${specialistPrompt}`,
            action: AIAction.GET_STAFF,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 3. Caller rejected or requested a different service
      if (
        confirmCheck === 'REJECTED' ||
        /\b(different service|different treatment|not that service|don'?t want that|no thanks|nah)\b/i.test(
          rawInput
        ) ||
        /^(no|nope)$/i.test(rawInput.trim())
      ) {
        const services = await prisma.service.findMany({
          where: { businessId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
        const serviceNames = services.slice(0, 4).map((s) => s.name).join(', ');
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
          suggestedServiceId: undefined,
          suggestedServiceName: undefined,
          selectedServiceId: undefined,
          selectedServiceName: undefined,
        });

        return {
          response: {
            success: true,
            response: `No problem at all. We offer: ${serviceNames}. Which dental service would you prefer to schedule?`,
            action: AIAction.GET_SERVICES,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

      // 4. Check if user directly named a specific service
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

      // Re-prompt for triage confirmation
      return {
        response: {
          success: true,
          response: `Would you like to schedule an appointment for ${session.suggestedServiceName || 'a comprehensive exam'}, or would you prefer a different service?`,
          action: AIAction.NONE,
          intent: AIIntent.BOOK_APPOINTMENT,
          sessionId,
          source: 'deterministic',
          latencyMs: performance.now() - startTime,
        },
        updatedSession: session,
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

      // Check if service inquiry matches an unsupported category with a sister clinic recommendation
      const triageRes = triageDentalInquiry(businessId, rawInput, session.triageProfile);
      if (!triageRes.isSupportedByClinic && triageRes.category) {
        const recMatch = findNetworkClinicRecommendation(
          businessId,
          triageRes.category,
          triageRes.patientGoal || (session.triageProfile?.patientGoal as any),
          triageRes.urgencyLevel || session.triageProfile?.urgencyLevel
        );

        if (recMatch) {
          const clinicProfile = getClinicKnowledge(businessId);
          const offerPrompt = formatNetworkRecommendationPrompt(
            recMatch,
            clinicProfile?.businessName || 'our clinic'
          );

          const updated = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.NETWORK_RECOMMENDATION_OFFERED,
            pendingRecommendation: recMatch,
          });

          return {
            response: {
              success: true,
              response: offerPrompt,
              action: AIAction.TRIAGE_SYMPTOM,
              intent: AIIntent.DENTAL_SYMPTOM_INQUIRY,
              sessionId,
              source: 'deterministic',
              latencyMs: performance.now() - startTime,
            },
            updatedSession: updated,
          };
        }
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
      // Check if user provided their phone number directly during name confirmation
      const inlinePhone = NameParser.extractPhone(rawInput);
      if (inlinePhone) {
        const digits = inlinePhone.replace(/[^0-9]/g, '');
        const formattedPhone =
          digits.length === 10
            ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
            : inlinePhone;
        const updated = await this.sessionStore.updateSession(sessionId, {
          step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE,
          customerPhone: formattedPhone,
        });

        return {
          response: {
            success: true,
            response: `Got it, ${session.customerName}! I heard your phone number as ${formattedPhone}. Is that correct?`,
            action: AIAction.SEARCH_CUSTOMER,
            intent: AIIntent.BOOK_APPOINTMENT,
            sessionId,
            source: 'deterministic',
            latencyMs: performance.now() - startTime,
          },
          updatedSession: updated,
        };
      }

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
          const completedSession = await this.sessionStore.updateSession(sessionId, {
            step: BookingConversationStep.BOOKING_COMPLETE,
            confirmedAppointmentId: appointmentId,
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
            updatedSession: completedSession,
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
      if (name && name !== 'Guest Customer' && customer.name !== name) {
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
