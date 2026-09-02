import { TimeSlot } from './types';

/**
 * Generate a random 6-character uppercase booking code (e.g., MED-8K2P or MED-4921)
 */
export function generateBookingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MED-${randomPart}`;
}

/**
 * Format a Date object or ISO string to Arabic local time using Western Latin digits (e.g. 10:30 صباحاً / 04:15 مساءً)
 */
export function formatArabicTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'مساءً' : 'صباحاً';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12

  const hoursStr = hours.toString().padStart(2, '0');
  return `${hoursStr}:${minutes} ${period}`;
}

/**
 * Format a Date object or ISO string to Arabic Date using Western Latin digits (e.g., الأربعاء، 2 سبتمبر 2026)
 */
export function formatArabicDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  // Use ar-EG-u-nu-latn to enforce standard Western digits (0-9)
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Short Arabic date format (e.g., 2026-09-02)
 */
export function formatISODateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate difference in hours between target date and now
 */
export function getHoursUntilAppointment(appointmentTimeISO: string | Date): number {
  const appointmentDate = typeof appointmentTimeISO === 'string' ? new Date(appointmentTimeISO) : appointmentTimeISO;
  const now = new Date();
  const diffMs = appointmentDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Check if a slot is a Flash Slot (< 3 Hours from now)
 */
export function isFlashSlot(slotTime: Date): boolean {
  const hoursUntil = getHoursUntilAppointment(slotTime);
  return hoursUntil > 0 && hoursUntil < 3;
}

/**
 * Generate 30-minute time slots for a given date from 09:00 AM to 06:00 PM.
 * Accepts workingDays array (Sunday=0, Monday=1, ..., Friday=5, Saturday=6).
 */
export function generateDayTimeSlots(
  selectedDate: Date, 
  bookedTimes: string[] = [],
  workingDays: number[] = [0, 1, 2, 3, 4, 6] // Friday (5) closed by default
): TimeSlot[] {
  const dayOfWeek = selectedDate.getDay();

  // If selected day is NOT in workingDays (e.g., Friday), return empty slots array
  if (!workingDays.includes(dayOfWeek)) {
    return [];
  }

  const slots: TimeSlot[] = [];
  const startHour = 9; // 09:00 AM
  const endHour = 18; // 06:00 PM
  const now = new Date();

  // Create date object at start of working hours for selectedDate
  const currentSlotTime = new Date(selectedDate);
  currentSlotTime.setSeconds(0);
  currentSlotTime.setMilliseconds(0);

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += 30) {
      currentSlotTime.setHours(hour, min);
      const slotISO = currentSlotTime.toISOString();

      // Past slots (earlier than right now) are unavailable
      const isPast = currentSlotTime.getTime() <= now.getTime();
      
      // Check if slot is already booked
      const isAlreadyBooked = bookedTimes.some(b => {
        const bDate = new Date(b);
        return Math.abs(bDate.getTime() - currentSlotTime.getTime()) < 60 * 1000;
      });

      const hoursUntil = (currentSlotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const flash = hoursUntil > 0 && hoursUntil < 3;

      slots.push({
        time: new Date(currentSlotTime),
        formattedTime: formatArabicTime(currentSlotTime),
        isAvailable: !isPast && !isAlreadyBooked,
        isFlashSlot: flash
      });
    }
  }

  return slots;
}
