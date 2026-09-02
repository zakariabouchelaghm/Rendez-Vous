import { createClient } from '@supabase/supabase-js';
import { Appointment, BlacklistedPhone, AppointmentStatus } from './types';
import { getHoursUntilAppointment } from './utils';

// Clean Supabase URL if trailing /rest/v1/ was included in .env
let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(rawUrl, supabaseAnonKey);

// Clear any legacy demo appointments stored in browser local storage & Supabase DB
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('rendezvous_appointments');
    localStorage.removeItem('rendezvous_blacklist');
  } catch (e) {}
}

// Issue direct delete query to Supabase DB to remove demo patients
if (supabase) {
  supabase
    .from('appointments')
    .delete()
    .in('full_name', ['أحمد محمود', 'سارة خالد', 'Ahmed Mahmoud', 'Sara Khaled'])
    .then(({ error }) => {
      if (error) console.warn('Supabase demo cleanup warning:', error.message);
    });
}

// ==========================================
// Working Days Management (Stored in Supabase clinic_settings)
// ==========================================

// Default working days: Sunday(0), Monday(1), Tuesday(2), Wednesday(3), Thursday(4), Saturday(6) - Friday(5) closed
const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4, 6];

export async function getWorkingDays(): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('clinic_settings')
      .select('value')
      .eq('key', 'working_days')
      .maybeSingle();

    if (!error && data && Array.isArray(data.value)) {
      return data.value as number[];
    }
  } catch (err) {
    console.warn('Could not fetch working_days from Supabase, using default working days:', err);
  }

  // Fallback to local storage or defaults if table not created yet
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('rendezvous_working_days');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
  }

  return DEFAULT_WORKING_DAYS;
}

export async function saveWorkingDays(days: number[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('clinic_settings')
      .upsert({ key: 'working_days', value: days, updated_at: new Date().toISOString() });

    if (!error) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('rendezvous_working_days', JSON.stringify(days));
      }
      return true;
    }
  } catch (err) {
    console.warn('Could not save working_days to Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('rendezvous_working_days', JSON.stringify(days));
  }
  return true;
}

// ==========================================
// Core Database Integration (Supabase)
// ==========================================

/**
 * Check if a phone number is blacklisted in Supabase
 */
export async function isPhoneBlacklisted(phoneNumber: string): Promise<boolean> {
  const cleanPhone = phoneNumber.trim();

  try {
    const { data, error } = await supabase
      .from('blacklisted_phones')
      .select('phone_number')
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    if (!error && data) return true;
  } catch (err) {
    console.error('Blacklist query error:', err);
  }

  return false;
}

/**
 * Create a new appointment in Supabase
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

  // 2. Insert into Supabase
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

    return {
      success: false,
      error: error?.message || 'فشل حفظ الحجز في قاعدة البيانات، يُرجى التأكد من تشغيل الـ SQL Schema.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'حدث خطأ عند الاتصال بقاعدة البيانات.'
    };
  }
}

/**
 * Confirm an existing appointment by booking code and phone number in Supabase
 */
export async function confirmAppointment(bookingCode: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
  const cleanCode = bookingCode.trim().toUpperCase();
  const cleanPhone = phoneNumber.trim();

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('booking_code', cleanCode)
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    if (error || !data) {
      return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته بسبب التأخر في التأكيد.' };
    }

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
  } catch (err) {
    console.error('Error confirming appointment:', err);
  }

  return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته بسبب التأخر في التأكيد.' };
}

/**
 * Fetch all appointments from Supabase
 */
export async function fetchAppointments(): Promise<Appointment[]> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_time', { ascending: true });

    if (!error && data) {
      return data as Appointment[];
    }
  } catch (err) {
    console.error('Error fetching appointments from Supabase:', err);
  }

  return [];
}

/**
 * Update appointment status to 'canceled' in Supabase
 */
export async function cancelAppointment(appointmentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    if (!error) return true;
  } catch (err) {
    console.error('Error canceling appointment:', err);
  }

  return false;
}

/**
 * Mark patient as No-Show: Adds phone number to blacklisted_phones and sets status to 'canceled' in Supabase
 */
export async function markPatientNoShow(appointmentId: string, phoneNumber: string, reason = 'تسجيل عدم حضور من قبل الطبيب'): Promise<boolean> {
  const cleanPhone = phoneNumber.trim();

  try {
    // 1. Add to blacklisted_phones table in Supabase
    await supabase
      .from('blacklisted_phones')
      .upsert({ phone_number: cleanPhone, reason }, { onConflict: 'phone_number' });

    // 2. Update appointment status to canceled
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    if (!error) return true;
  } catch (err) {
    console.error('Error marking no-show:', err);
  }

  return false;
}

/**
 * Automated Cron Cleanup: Find pending records < 3 hours away and mark them as expired in Supabase
 */
export async function cleanupExpiredAppointments(): Promise<{ expiredCount: number; updatedIds: string[] }> {
  const now = new Date();
  const updatedIds: string[] = [];

  try {
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
    }
  } catch (err) {
    console.error('Cron cleanup error:', err);
  }

  return { expiredCount: updatedIds.length, updatedIds };
}
