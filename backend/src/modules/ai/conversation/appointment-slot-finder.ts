import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { AvailableSlot } from './conversation-session.types';

export interface FindSlotsInput {
  businessId: string;
  dateStr: string; // YYYY-MM-DD
  durationMinutes: number;
  staffId?: string | null;
}

export class AppointmentSlotFinder {
  /**
   * Queries real PostgreSQL database records to discover open, conflict-free
   * appointment slots for a given date, service duration, and staff preference.
   */
  public static async findAvailableSlots(
    input: FindSlotsInput
  ): Promise<AvailableSlot[]> {
    const { businessId, dateStr, durationMinutes, staffId } = input;

    // 1. Get eligible active staff
    const staffList = await prisma.staff.findMany({
      where: {
        businessId,
        isActive: true,
        ...(staffId ? { id: staffId } : {}),
      },
      select: { id: true, name: true },
    });

    if (staffList.length === 0) {
      return [];
    }

    // 2. Query all existing booked appointments for these staff on this day
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        businessId,
        staffId: { in: staffList.map((s) => s.id) },
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { gte: dayStart, lte: dayEnd },
      },
      select: {
        staffId: true,
        startTime: true,
        endTime: true,
      },
    });

    // 3. Generate candidate slot hours (09:00, 10:00, 11:00, 13:00, 14:00, 15:00, 16:00)
    const candidateHours = [9, 10, 11, 13, 14, 15, 16];
    const availableSlots: AvailableSlot[] = [];
    const now = new Date();

    for (const hour of candidateHours) {
      const slotStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00.000Z`);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // If slot is in the past for today, skip it
      if (slotStart <= now) {
        continue;
      }

      // Check if ANY of the eligible staff are free during this interval
      for (const staff of staffList) {
        const hasConflict = existingAppointments.some(
          (apt) =>
            apt.staffId === staff.id &&
            apt.startTime < slotEnd &&
            apt.endTime > slotStart
        );

        if (!hasConflict) {
          // Format 12-hour time label (e.g. "10:00 AM", "02:00 PM")
          const h12 = hour % 12 === 0 ? 12 : hour % 12;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const timeLabel = `${String(h12).padStart(2, '0')}:00 ${ampm}`;

          availableSlots.push({
            timeLabel,
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            staffId: staff.id,
            staffName: staff.name,
          });
          break; // Found an available staff member for this time slot
        }
      }

      if (availableSlots.length >= 4) {
        break; // Return up to 4 convenient options for speech clarity
      }
    }

    return availableSlots;
  }
}
