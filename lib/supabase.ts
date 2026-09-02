import { createClient } from '@supabase/supabase-js';
import { Appointment, BlacklistedPhone, AppointmentStatus } from './types';
import { getHoursUntilAppointment } from './utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isRealSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

export const supabase = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Default Working Days: Sunday(0), Monday(1), Tuesday(2), Wednesday(3), Thursday(4), Saturday(6). Friday(5) is CLOSED by default.
let memoryWorkingDays: number[] = [0, 1, 2, 3, 4, 6];

// ==========================================
// In-Memory / LocalStorage Fallback Store
// ==========================================
let memoryAppointments: Appointment[] = [
  {
    id: 'demo-1',
    full_name: 'أحمد محمود',
    phone_number: '01012345678',
    appointment_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours away
    booking_code: 'MED-9981',
    status: 'pending',
    is_flash_booking: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    full_name: 'سارة خالد',
    phone_number: '01198765432',
    appointment_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours away (Flash)
    booking_code: 'MED-3342',
    status: 'confirmed',
    is_flash_booking: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

let memoryBlacklist: BlacklistedPhone[] = [
  {
    id: 'blk-1',
    phone_number: '01000000000',
    reason: 'عدم حضور متكرر',
    created_at: new Date().toISOString(),
  }
];

// Load from LocalStorage if browser environment
if (typeof window !== 'undefined') {
  try {
    const savedAppts = localStorage.getItem('rendezvous_appointments');
    if (savedAppts) memoryAppointments = JSON.parse(savedAppts);

    const savedBlk = localStorage.getItem('rendezvous_blacklist');
    if (savedBlk) memoryBlacklist = JSON.parse(savedBlk);

    const savedDays = localStorage.getItem('rendezvous_working_days');
    if (savedDays) memoryWorkingDays = JSON.parse(savedDays);
  } catch (e) {
    console.error('Failed loading local storage fallback:', e);
  }
}

function persistFallbackData() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('rendezvous_appointments', JSON.stringify(memoryAppointments));
      localStorage.setItem('rendezvous_blacklist', JSON.stringify(memoryBlacklist));
      localStorage.setItem('rendezvous_working_days', JSON.stringify(memoryWorkingDays));
    } catch (e) {
      console.error('Failed saving to local storage:', e);
    }
  }
}

// ==========================================
// Working Days Management
// ==========================================
export async function getWorkingDays(): Promise<number[]> {
  return [...memoryWorkingDays];
}

export async function saveWorkingDays(days: number[]): Promise<boolean> {
  memoryWorkingDays = days;
  persistFallbackData();
  return true;
}

// ==========================================
// Service Functions (Dual-Mode Supported)
// ==========================================

/**
 * Check if a phone number is blacklisted
 */
export async function isPhoneBlacklisted(phoneNumber: string): Promise<boolean> {
  const cleanPhone = phoneNumber.trim();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('blacklisted_phones')
        .select('phone_number')
        .eq('phone_number', cleanPhone)
        .single();
      
      if (!error && data) return true;
    } catch (err) {
      console.warn('Supabase blacklist check fallback:', err);
    }
  }

  // Fallback memory check
  return memoryBlacklist.some(b => b.phone_number === cleanPhone);
}

/**
 * Create a new appointment
 */
export async function createAppointment(data: {
  full_name: string;
  phone_number: string;
  appointment_time: string;
  booking_code: string;
  status: AppointmentStatus;
  is_flash_booking: boolean;
}): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
  // 1. Check Blacklist
  const blacklisted = await isPhoneBlacklisted(data.phone_number);
  if (blacklisted) {
    return {
      success: false,
      error: 'عذراً، هذا الرقم محظور من إجراء الحجوزات بسبب سجل سابق من عدم الحضور.'
    };
  }

  // 2. Try Supabase insert
  if (supabase) {
    try {
      const { data: inserted, error } = await supabase
        .from('appointments')
        .insert([{
          full_name: data.full_name,
          phone_number: data.phone_number,
          appointment_time: data.appointment_time,
          booking_code: data.booking_code,
          status: data.status,
          is_flash_booking: data.is_flash_booking,
        }])
        .select()
        .single();

      if (!error && inserted) {
        return { success: true, appointment: inserted as Appointment };
      }
      console.warn('Supabase insert failed, using fallback mode:', error?.message);
    } catch (err) {
      console.warn('Supabase insert exception, using fallback:', err);
    }
  }

  // 3. Fallback insert
  const newAppt: Appointment = {
    id: `appt-${Date.now()}`,
    full_name: data.full_name,
    phone_number: data.phone_number,
    appointment_time: data.appointment_time,
    booking_code: data.booking_code,
    status: data.status,
    is_flash_booking: data.is_flash_booking,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryAppointments.push(newAppt);
  persistFallbackData();

  return { success: true, appointment: newAppt };
}

/**
 * Confirm an existing appointment by booking code and phone number
 */
export async function confirmAppointment(bookingCode: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
  const cleanCode = bookingCode.trim().toUpperCase();
  const cleanPhone = phoneNumber.trim();

  // Try Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('booking_code', cleanCode)
        .eq('phone_number', cleanPhone)
        .single();

      if (!error && data) {
        const appt = data as Appointment;
        
        if (appt.status === 'confirmed') {
          return { success: true, message: 'حضورك مؤكد بالفعل لهذا الموعد!' };
        }

        if (appt.status === 'canceled' || appt.status === 'expired') {
          return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته بسبب التأخر في التأكيد.' };
        }

        // Check if < 3 hours remaining before appointment time
        const hoursUntil = getHoursUntilAppointment(appt.appointment_time);
        if (hoursUntil < 3) {
          // Expire appointment
          await supabase
            .from('appointments')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('id', appt.id);

          return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته بسبب التأخر في التأكيد.' };
        }

        // Update to confirmed
        const { error: updateErr } = await supabase
          .from('appointments')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', appt.id);

        if (!updateErr) {
          return { success: true, message: 'تم تأكيد حضورك بنجاح!' };
        }
      }
    } catch (err) {
      console.warn('Supabase confirm failed, checking fallback:', err);
    }
  }

  // Fallback memory logic
  const apptIndex = memoryAppointments.findIndex(
    a => a.booking_code.toUpperCase() === cleanCode && a.phone_number === cleanPhone
  );

  if (apptIndex === -1) {
    return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته بسبب التأخر في التأكيد.' };
  }

  const appt = memoryAppointments[apptIndex];

  if (appt.status === 'confirmed') {
    return { success: true, message: 'حضورك مؤكد بالفعل لهذا الموعد!' };
  }

  if (appt.status === 'canceled' || appt.status === 'expired') {
    return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته بسبب التأخر في التأكيد.' };
  }

  const hoursUntil = getHoursUntilAppointment(appt.appointment_time);
  if (hoursUntil < 3) {
    memoryAppointments[apptIndex].status = 'expired';
    memoryAppointments[apptIndex].updated_at = new Date().toISOString();
    persistFallbackData();
    return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته بسبب التأخر في التأكيد.' };
  }

  memoryAppointments[apptIndex].status = 'confirmed';
  memoryAppointments[apptIndex].updated_at = new Date().toISOString();
  persistFallbackData();

  return { success: true, message: 'تم تأكيد حضورك بنجاح!' };
}

/**
 * Get list of appointments (filtered optional by status or date)
 */
export async function fetchAppointments(): Promise<Appointment[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_time', { ascending: true });

      if (!error && data) {
        return data as Appointment[];
      }
    } catch (err) {
      console.warn('Supabase fetch failed, returning fallback memory appts:', err);
    }
  }

  return [...memoryAppointments].sort((a, b) => 
    new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
  );
}

/**
 * Update appointment status to 'canceled'
 */
export async function cancelAppointment(appointmentId: string): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (!error) return true;
    } catch (err) {
      console.warn('Supabase cancel failed, fallbacking:', err);
    }
  }

  const idx = memoryAppointments.findIndex(a => a.id === appointmentId);
  if (idx !== -1) {
    memoryAppointments[idx].status = 'canceled';
    memoryAppointments[idx].updated_at = new Date().toISOString();
    persistFallbackData();
    return true;
  }
  return false;
}

/**
 * Mark patient as No-Show: Adds phone number to blacklisted_phones and sets status to 'canceled'
 */
export async function markPatientNoShow(appointmentId: string, phoneNumber: string, reason = 'تسجيل عدم حضور من قبل الطبيب'): Promise<boolean> {
  const cleanPhone = phoneNumber.trim();

  if (supabase) {
    try {
      // 1. Add to blacklist
      await supabase
        .from('blacklisted_phones')
        .insert([{ phone_number: cleanPhone, reason }]);

      // 2. Update appointment status
      await supabase
        .from('appointments')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      return true;
    } catch (err) {
      console.warn('Supabase no-show mark failed, fallbacking:', err);
    }
  }

  // Fallback memory
  if (!memoryBlacklist.some(b => b.phone_number === cleanPhone)) {
    memoryBlacklist.push({
      id: `blk-${Date.now()}`,
      phone_number: cleanPhone,
      reason,
      created_at: new Date().toISOString(),
    });
  }

  const apptIdx = memoryAppointments.findIndex(a => a.id === appointmentId);
  if (apptIdx !== -1) {
    memoryAppointments[apptIdx].status = 'canceled';
    memoryAppointments[apptIdx].updated_at = new Date().toISOString();
  }

  persistFallbackData();
  return true;
}

/**
 * Automated Cron Cleanup: Find pending records < 3 hours away and mark them as expired
 */
export async function cleanupExpiredAppointments(): Promise<{ expiredCount: number; updatedIds: string[] }> {
  const now = new Date();
  const updatedIds: string[] = [];

  if (supabase) {
    try {
      // Get all pending appointments
      const { data: pendingAppts, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'pending');

      if (!error && pendingAppts) {
        for (const appt of pendingAppts as Appointment[]) {
          const apptTime = new Date(appt.appointment_time);
          const diffHours = (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60);

          // If pending and < 3 hours before appointment time
          if (diffHours < 3) {
            await supabase
              .from('appointments')
              .update({ status: 'expired', updated_at: now.toISOString() })
              .eq('id', appt.id);

            updatedIds.push(appt.id);
          }
        }

        return { expiredCount: updatedIds.length, updatedIds };
      }
    } catch (err) {
      console.warn('Supabase cron cleanup exception, using memory fallback:', err);
    }
  }

  // Fallback cleanup
  memoryAppointments.forEach((appt, idx) => {
    if (appt.status === 'pending') {
      const apptTime = new Date(appt.appointment_time);
      const diffHours = (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < 3) {
        memoryAppointments[idx].status = 'expired';
        memoryAppointments[idx].updated_at = now.toISOString();
        updatedIds.push(appt.id);
      }
    }
  });

  if (updatedIds.length > 0) {
    persistFallbackData();
  }

  return { expiredCount: updatedIds.length, updatedIds };
}
