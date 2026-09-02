import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Appointment, AppointmentStatus } from './types';
import { getHoursUntilAppointment } from './utils';

// ==========================================
// Lazy Supabase Client (initialized on first use, not at module load)
// This prevents build-time failures when env vars are not yet available.
// ==========================================

const FALLBACK_SUPABASE_URL = 'https://ddyafitpiyglnyhaudix.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_eiA0TUDqeoP5oyKapFL6KA_lumJo8qU';

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  if (!rawUrl.startsWith('http')) rawUrl = FALLBACK_SUPABASE_URL;

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  _supabase = createClient(rawUrl, key);
  return _supabase;
}

// Convenience export — same as calling getSupabaseClient()
export const supabase = {
  from: (table: string) => getSupabaseClient().from(table),
};

// Clear legacy demo storage on load (client only)
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('rendezvous_appointments');
    localStorage.removeItem('rendezvous_blacklist');
  } catch (e) {}

  // Automatic cleanup of demo patients in Supabase database
  getSupabaseClient()
    .from('appointments')
    .delete()
    .in('full_name', ['أحمد محمود', 'سارة خالد', 'Ahmed Mahmoud', 'Sara Khaled'])
    .then(({ error }) => {
      if (error) console.error('Supabase DB cleanup error:', error.message);
    });
}

// ==========================================
// Working Days Management (Stored in Supabase clinic_settings)
// ==========================================

const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4, 6];

export async function getWorkingDays(): Promise<number[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('clinic_settings')
      .select('value')
      .eq('key', 'working_days')
      .maybeSingle();

    if (!error && data && Array.isArray(data.value)) {
      return data.value as number[];
    }
  } catch (err) {
    console.warn('Could not fetch working_days from Supabase:', err);
  }

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
    const { error } = await getSupabaseClient()
      .from('clinic_settings')
      .upsert({ key: 'working_days', value: days, updated_at: new Date().toISOString() });

    if (error) {
      console.error('Save working days error:', error.message);
    } else {
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

export async function isPhoneBlacklisted(phoneNumber: string): Promise<boolean> {
  const cleanPhone = phoneNumber.trim();
  try {
    const { data, error } = await getSupabaseClient()
      .from('blacklisted_phones')
      .select('phone_number')
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    if (!error && data) return true;
    if (error) console.error('Blacklist query error:', error.message);
  } catch (err) {
    console.error('Blacklist query exception:', err);
  }
  return false;
}

export async function createAppointment(data: {
  full_name: string;
  phone_number: string;
  appointment_time: string;
  booking_code: string;
  status: AppointmentStatus;
  is_flash_booking: boolean;
}): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
  const blacklisted = await isPhoneBlacklisted(data.phone_number);
  if (blacklisted) {
    return { success: false, error: 'عذراً، هذا الرقم محظور من إجراء الحجوزات بسبب سجل سابق من عدم الحضور.' };
  }

  const apptPayload = {
    full_name: data.full_name,
    phone_number: data.phone_number,
    appointment_time: data.appointment_time,
    booking_code: data.booking_code,
    status: data.status,
    is_flash_booking: data.is_flash_booking,
  };

  try {
    const { data: inserted, error } = await getSupabaseClient()
      .from('appointments')
      .insert([apptPayload])
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return { success: false, error: `خطأ أثناء الحفظ في قاعدة البيانات: ${error.message}` };
    }

    if (inserted && inserted.length > 0) {
      return { success: true, appointment: inserted[0] as Appointment };
    }

    // Fallback: try to fetch the inserted row by booking_code
    const { data: fetchedAppt } = await getSupabaseClient()
      .from('appointments')
      .select('*')
      .eq('booking_code', data.booking_code)
      .maybeSingle();

    if (fetchedAppt) return { success: true, appointment: fetchedAppt as Appointment };

    return { success: false, error: 'لم نتمكن من تأكيد حفظ الحجز. يُرجى تشغيل schema.sql في Supabase.' };
  } catch (err: any) {
    console.error('Supabase Insert Exception:', err);
    return { success: false, error: err?.message || 'حدث خطأ عند الاتصال بقاعدة البيانات.' };
  }
}

export async function confirmAppointment(bookingCode: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
  const cleanCode = bookingCode.trim().toUpperCase();
  const cleanPhone = phoneNumber.trim();

  try {
    const { data, error } = await getSupabaseClient()
      .from('appointments')
      .select('*')
      .eq('booking_code', cleanCode)
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Confirm fetch error:', error.message);
      return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته.' };
    }

    const appt = data as Appointment;

    if (appt.status === 'confirmed') return { success: true, message: 'حضورك مؤكد بالفعل لهذا الموعد!' };
    if (appt.status === 'canceled' || appt.status === 'expired') {
      return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته.' };
    }

    const hoursUntil = getHoursUntilAppointment(appt.appointment_time);
    if (hoursUntil < 3) {
      await getSupabaseClient()
        .from('appointments')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', appt.id);
      return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته.' };
    }

    const { error: updateErr } = await getSupabaseClient()
      .from('appointments')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', appt.id);

    if (!updateErr) return { success: true, message: 'تم تأكيد حضورك بنجاح!' };
  } catch (err) {
    console.error('Error confirming appointment:', err);
  }

  return { success: false, message: 'رمز الحجز غير صحيح أو انتهت صلاحيته.' };
}

export async function fetchAppointments(): Promise<Appointment[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('appointments')
      .select('*')
      .order('appointment_time', { ascending: true });

    if (!error && data) return data as Appointment[];
    if (error) console.error('Fetch appointments error:', error.message);
  } catch (err) {
    console.error('Error fetching appointments:', err);
  }
  return [];
}

export async function cancelAppointment(appointmentId: string): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient()
      .from('appointments')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    if (!error) return true;
    if (error) console.error('Cancel appointment error:', error.message);
  } catch (err) {
    console.error('Error canceling appointment:', err);
  }
  return false;
}

export async function markPatientNoShow(appointmentId: string, phoneNumber: string, reason = 'تسجيل عدم حضور من قبل الطبيب'): Promise<boolean> {
  const cleanPhone = phoneNumber.trim();
  try {
    await getSupabaseClient()
      .from('blacklisted_phones')
      .upsert({ phone_number: cleanPhone, reason }, { onConflict: 'phone_number' });

    const { error } = await getSupabaseClient()
      .from('appointments')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    if (!error) return true;
    if (error) console.error('Mark no-show error:', error.message);
  } catch (err) {
    console.error('Error marking no-show:', err);
  }
  return false;
}

export async function cleanupExpiredAppointments(): Promise<{ expiredCount: number; updatedIds: string[] }> {
  const now = new Date();
  const updatedIds: string[] = [];

  try {
    const { data: pendingAppts, error } = await getSupabaseClient()
      .from('appointments')
      .select('*')
      .eq('status', 'pending');

    if (!error && pendingAppts) {
      for (const appt of pendingAppts as Appointment[]) {
        const diffHours = (new Date(appt.appointment_time).getTime() - now.getTime()) / (1000 * 60 * 60);
        if (diffHours < 3) {
          await getSupabaseClient()
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
