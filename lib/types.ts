export type AppointmentStatus = 'pending' | 'confirmed' | 'canceled' | 'expired';

export interface Appointment {
  id: string;
  full_name: string;
  phone_number: string;
  appointment_time: string; // ISO String / TIMESTAMPTZ
  booking_code: string;
  status: AppointmentStatus;
  is_flash_booking: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlacklistedPhone {
  id: string;
  phone_number: string;
  reason?: string;
  created_at: string;
}

export interface TimeSlot {
  time: Date;
  formattedTime: string;
  isAvailable: boolean;
  isFlashSlot: boolean; // < 3 Hours away
  status?: AppointmentStatus;
}
