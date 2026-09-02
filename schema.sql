-- SQL Schema for Supabase Setup
-- Medical Appointment Booking Application (Arabic RTL)

-- 1. Create Appointment Status Enum
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'canceled', 'expired');

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

-- 3. Create Blacklisted Phones Table
CREATE TABLE IF NOT EXISTS blacklisted_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast phone lookup
CREATE INDEX IF NOT EXISTS idx_blacklisted_phones ON blacklisted_phones(phone_number);

-- 4. Enable Row Level Security (RLS) - Public Read/Write with Appropriate Access
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_phones ENABLE ROW LEVEL SECURITY;

-- Allow anonymous select/insert/update for public appointment booking & confirmation
CREATE POLICY "Allow public insert appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY "Allow public update appointments" ON appointments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete appointments" ON appointments FOR DELETE USING (true);

-- Allow public check on blacklist
CREATE POLICY "Allow public select blacklisted_phones" ON blacklisted_phones FOR SELECT USING (true);
CREATE POLICY "Allow public insert blacklisted_phones" ON blacklisted_phones FOR INSERT WITH CHECK (true);

-- 5. Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
