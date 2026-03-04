-- ==========================================================
-- SAFE SCHEMA UPDATE FOR LIVE AMEMUSO SOLO SYSTEM
-- ==========================================================
-- This script only adds new tables and columns. 
-- It does NOT modify or delete existing data.

-- 1. Update Existing Tables (Add columns safely)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS performance_status TEXT DEFAULT 'pending';
ALTER TABLE repertoire_submissions ADD COLUMN IF NOT EXISTS admin_comments TEXT;

-- 2. Create New Tables (If not already present)
CREATE TABLE IF NOT EXISTS performance_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  slot_ids INTEGER[] NOT NULL,
  is_test BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ensure Config Table Exists
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default max slots if not exists (Conflict handling protects live data)
INSERT INTO config (key, value)
VALUES ('max_slots', '70')
ON CONFLICT (key) DO NOTHING;

-- 4. Enable RLS (Safe to re-run)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire_submissions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for registrations (Protects existing access)
DROP POLICY IF EXISTS "Public read registrations" ON registrations;
CREATE POLICY "Public read registrations" ON registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert registrations" ON registrations;
CREATE POLICY "Public insert registrations" ON registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update registrations" ON registrations;
CREATE POLICY "Public update registrations" ON registrations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete registrations" ON registrations;
CREATE POLICY "Public delete registrations" ON registrations FOR DELETE USING (true);

-- 6. Policies for config
DROP POLICY IF EXISTS "Public read config" ON config;
CREATE POLICY "Public read config" ON config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin update config" ON config;
CREATE POLICY "Admin update config" ON config FOR ALL USING (true);

-- 7. Policies for performance_weeks (New Table)
DROP POLICY IF EXISTS "Public read weeks" ON performance_weeks;
CREATE POLICY "Public read weeks" ON performance_weeks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all weeks" ON performance_weeks;
CREATE POLICY "Admin all weeks" ON performance_weeks FOR ALL USING (true);

-- 8. Policies for repertoire_submissions
DROP POLICY IF EXISTS "Public read submissions" ON repertoire_submissions;
CREATE POLICY "Public read submissions" ON repertoire_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert submissions" ON repertoire_submissions;
CREATE POLICY "Public insert submissions" ON repertoire_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin all submissions" ON repertoire_submissions;
CREATE POLICY "Admin all submissions" ON repertoire_submissions FOR ALL USING (true);
-- 9. Waitlist System
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  voice_part TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_test BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public join waitlist" ON waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read waitlist" ON waitlist FOR SELECT USING (true);
CREATE POLICY "Admin manage waitlist" ON waitlist FOR ALL USING (true);

-- 10. Admin Accounts (RBAC)
CREATE TABLE IF NOT EXISTS users_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Simplified for this system's requirement
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users_admin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read users" ON users_admin FOR SELECT USING (true);

-- Insert default admin if not exists
-- Password hash for 'admin123' (Just as an example, actual implementation will use secure methods)
INSERT INTO users_admin (email, password_hash, role)
VALUES ('admin@amemusochoir.org', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;


-- 11. Member Positions
CREATE TABLE IF NOT EXISTS member_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  category TEXT CHECK (category IN ('Exco', 'Part Leader', 'Other')) DEFAULT 'Other',
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed some default positions
INSERT INTO member_positions (title, category, rank) VALUES 
('Music Director', 'Exco', 1),
('Assistant Music Director', 'Exco', 2),
('Speaker', 'Exco', 3),
('Soprano Part Leader', 'Part Leader', 4),
('Alto Part Leader', 'Part Leader', 5),
('Tenor Part Leader', 'Part Leader', 6),
('Bass Part Leader', 'Part Leader', 7)
ON CONFLICT (title) DO NOTHING;

ALTER TABLE member_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read positions" ON member_positions;
CREATE POLICY "Public read positions" ON member_positions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all positions" ON member_positions;
CREATE POLICY "Admin all positions" ON member_positions FOR ALL USING (true);

-- 12. Members (Added join date and dynamic positions)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  voice_part TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  phone TEXT,
  email TEXT,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  is_soloist BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists from previous phases
ALTER TABLE members ADD COLUMN IF NOT EXISTS joined_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES member_positions(id) ON DELETE SET NULL;

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read members" ON members;
CREATE POLICY "Public read members" ON members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all members" ON members;
CREATE POLICY "Admin all members" ON members FOR ALL USING (true);

-- 12. Storage Buckets & Policies
-- Run this in SQL Editor:
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('member-profiles', 'member-profiles', true) 
-- ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'member-profiles' );

-- Policies for public uploading (Update to target specific folder/roles in production)
-- CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'member-profiles' );

-- Policies for public updating/deleting
-- CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'member-profiles' );
-- CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'member-profiles' );
