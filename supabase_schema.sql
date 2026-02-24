-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  slot_id INTEGER UNIQUE NOT NULL,
  voice_part TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create config table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default max slots if not exists
INSERT INTO config (key, value)
VALUES ('max_slots', '60')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Policies for registrations
DROP POLICY IF EXISTS "Public read registrations" ON registrations;
CREATE POLICY "Public read registrations" ON registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert registrations" ON registrations;
CREATE POLICY "Public insert registrations" ON registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update registrations" ON registrations;
CREATE POLICY "Public update registrations" ON registrations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete registrations" ON registrations;
CREATE POLICY "Public delete registrations" ON registrations FOR DELETE USING (true);

-- Policies for config
DROP POLICY IF EXISTS "Public read config" ON config;
CREATE POLICY "Public read config" ON config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin update config" ON config;
CREATE POLICY "Admin update config" ON config FOR ALL USING (true); -- Simplified for public access; ideally restricted by role or secret.
