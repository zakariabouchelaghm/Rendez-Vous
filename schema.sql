-- SQL Schema for Supabase Setup
-- Medical Appointment Booking Application (Arabic RTL)

-- 1. Create Appointment Status Enum if not exists
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'canceled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    appointment_time TIMESTAMPTZ NOT NULL,
    booking_code VARCHAR(10) UNIQUE NOT NULL,
    status appointment_status NOT NULL DEFAULT 'pending',
    is_flash_booking BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching appointments by booking_code & phone_number
CREATE INDEX IF NOT EXISTS idx_appointments_code_phone ON appointments(booking_code, phone_number);
CREATE INDEX IF NOT EXISTS idx_appointments_status_time ON appointments(status, appointment_time);

-- Delete demo/sample patient records if present
DELETE FROM appointments WHERE full_name IN ('أحمد محمود', 'سارة خالد', 'Ahmed Mahmoud', 'Sara Khaled');

-- 3. Create Blacklisted Phones Table
CREATE TABLE IF NOT EXISTS blacklisted_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast phone lookup
CREATE INDEX IF NOT EXISTS idx_blacklisted_phones ON blacklisted_phones(phone_number);

-- 4. Create Clinic Settings Table (For Doctor Working Days & Configuration)
CREATE TABLE IF NOT EXISTS clinic_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default working days: Sunday(0), Monday(1), Tuesday(2), Wednesday(3), Thursday(4), Saturday(6) - Friday(5) closed
INSERT INTO clinic_settings (key, value)
VALUES ('working_days', '[0, 1, 2, 3, 4, 6]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Disable RLS or Grant Full Access for Anon Role (Solves RLS insert/delete permission issues)
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_phones DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings DISABLE ROW LEVEL SECURITY;

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
