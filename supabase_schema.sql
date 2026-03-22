-- ==========================================================
-- SAFE SCHEMA UPDATE FOR LIVE AMEMUSO SOLO SYSTEM
-- ==========================================================
-- This script only adds new tables and columns. 
-- It does NOT modify or delete existing data.

-- 1. Update Existing Tables (Add columns safely)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS performance_status TEXT DEFAULT 'pending';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS md_comments TEXT;
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
CREATE POLICY "Public update registrations" ON registrations FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public delete registrations" ON registrations;
CREATE POLICY "Public delete registrations" ON registrations FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Policies for config
DROP POLICY IF EXISTS "Public read config" ON config;
CREATE POLICY "Public read config" ON config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin update config" ON config;
CREATE POLICY "Admin update config" ON config FOR ALL USING (auth.role() = 'authenticated');

-- 7. Policies for performance_weeks (New Table)
DROP POLICY IF EXISTS "Public read weeks" ON performance_weeks;
CREATE POLICY "Public read weeks" ON performance_weeks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all weeks" ON performance_weeks;
CREATE POLICY "Admin all weeks" ON performance_weeks FOR ALL USING (auth.role() = 'authenticated');

-- 8. Policies for repertoire_submissions
DROP POLICY IF EXISTS "Public read submissions" ON repertoire_submissions;
CREATE POLICY "Public read submissions" ON repertoire_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert submissions" ON repertoire_submissions;
CREATE POLICY "Public insert submissions" ON repertoire_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin all submissions" ON repertoire_submissions;
CREATE POLICY "Admin all submissions" ON repertoire_submissions FOR ALL USING (auth.role() = 'authenticated');
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
CREATE POLICY "Admin manage waitlist" ON waitlist FOR ALL USING (auth.role() = 'authenticated');

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
CREATE POLICY "Admin all positions" ON member_positions FOR ALL USING (auth.role() = 'authenticated');

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
  is_on_probation BOOLEAN DEFAULT false,
  probation_until DATE,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists from previous phases
ALTER TABLE members ADD COLUMN IF NOT EXISTS joined_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES member_positions(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_on_probation BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS probation_until DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS has_seen_walkthrough BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS youtube TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_id TEXT UNIQUE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_pin TEXT;

-- 13. Config Updates
INSERT INTO config (key, value)
VALUES ('default_probation_months', '3')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read members" ON members;
CREATE POLICY "Public read members" ON members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all members" ON members;
CREATE POLICY "Admin all members" ON members FOR ALL USING (auth.role() = 'authenticated');

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

-- 14. Attendance System
CREATE TABLE IF NOT EXISTS attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('rehearsal', 'concert', 'other')) DEFAULT 'rehearsal',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  check_in_code TEXT NOT NULL,
  lat DECIMAL,
  lng DECIMAL,
  radius_meters INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  counts_toward_stats BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES attendance_events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(event_id, member_id)
);

ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read attendance_events" ON attendance_events;
CREATE POLICY "Public read attendance_events" ON attendance_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage attendance_events" ON attendance_events;
CREATE POLICY "Admin manage attendance_events" ON attendance_events FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read attendance_records" ON attendance_records;
CREATE POLICY "Public read attendance_records" ON attendance_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert attendance_records" ON attendance_records;
CREATE POLICY "Public insert attendance_records" ON attendance_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage attendance_records" ON attendance_records;
CREATE POLICY "Admin manage attendance_records" ON attendance_records FOR ALL USING (auth.role() = 'authenticated');

-- 15. Check-Out and Lateness (Phase 11)
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;



-- ==========================================================
-- SECURE PORTAL API (RPC)
-- ==========================================================

CREATE TABLE IF NOT EXISTS portal_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delete old attempts
CREATE OR REPLACE FUNCTION clean_old_login_attempts() RETURNS void AS $$
BEGIN
  DELETE FROM portal_login_attempts WHERE attempt_time < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_member_login(p_portal_id TEXT, p_pin TEXT)
RETURNS json
AS $$
DECLARE
  v_member json;
  v_attempts INT;
BEGIN
  PERFORM clean_old_login_attempts();
  
  SELECT COUNT(*) INTO v_attempts FROM portal_login_attempts WHERE portal_id = p_portal_id;
  IF v_attempts >= 5 THEN
    RAISE EXCEPTION 'Too many login attempts. Please wait 15 minutes.';
  END IF;

  SELECT row_to_json(joined_member) INTO v_member 
  FROM (
    SELECT m.*, 
      (SELECT row_to_json(pos) FROM member_positions pos WHERE pos.id = m.position_id) as member_positions,
      (SELECT row_to_json(reg) FROM registrations reg WHERE reg.id = m.registration_id) as registrations
    FROM members m 
    WHERE UPPER(m.portal_id) = UPPER(p_portal_id) AND m.portal_pin = p_pin
  ) joined_member;
  
  IF v_member IS NULL THEN
    INSERT INTO portal_login_attempts (portal_id) VALUES (p_portal_id);
    RAISE EXCEPTION 'Invalid Portal ID or PIN';
  ELSE
    DELETE FROM portal_login_attempts WHERE portal_id = p_portal_id;
    RETURN v_member;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION secure_update_member_profile(p_portal_id TEXT, p_pin TEXT, p_updates jsonb)
RETURNS json
AS $$
DECLARE
  v_member record;
  v_updated json;
BEGIN
  -- Verify credentials
  SELECT * INTO v_member FROM members WHERE UPPER(portal_id) = UPPER(p_portal_id) AND portal_pin = p_pin;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE members 
  SET 
    full_name = COALESCE(p_updates->>'full_name', full_name),
    voice_part = COALESCE(p_updates->>'voice_part', voice_part),
    bio = COALESCE(p_updates->>'bio', bio),
    phone = COALESCE(p_updates->>'phone', phone),
    email = COALESCE(p_updates->>'email', email),
    youtube = COALESCE(p_updates->>'youtube', youtube),
    instagram = COALESCE(p_updates->>'instagram', instagram),
    facebook = COALESCE(p_updates->>'facebook', facebook),
    twitter = COALESCE(p_updates->>'twitter', twitter),
    tiktok = COALESCE(p_updates->>'tiktok', tiktok),
    photo_url = COALESCE(p_updates->>'photo_url', photo_url),
    has_seen_walkthrough = COALESCE((p_updates->>'has_seen_walkthrough')::boolean, has_seen_walkthrough)
  WHERE portal_id = p_portal_id;

  -- Also update linked registration if needed
  IF (p_updates ? 'full_name' OR p_updates ? 'voice_part') THEN
    UPDATE registrations 
    SET 
      full_name = COALESCE(p_updates->>'full_name', full_name),
      voice_part = COALESCE(p_updates->>'voice_part', voice_part)
    WHERE id = v_member.registration_id;
  END IF;

  -- 8. Return updated member with full joins
  SELECT row_to_json(joined_member) INTO v_updated 
  FROM (
    SELECT m.*, 
      (SELECT row_to_json(pos) FROM member_positions pos WHERE pos.id = m.position_id) as member_positions,
      (SELECT row_to_json(reg) FROM registrations reg WHERE reg.id = m.registration_id) as registrations
    FROM members m 
    WHERE m.portal_id = p_portal_id
  ) joined_member;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- SECURE ATTENDANCE CHECK-IN (Phase 2 RPC)
-- ==========================================================

CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
    radius float = 6371000; -- Earth's radius in meters
    dlat float;
    dlon float;
    a float;
    c float;
BEGIN
    lat1 = lat1 * pi() / 180;
    lon1 = lon1 * pi() / 180;
    lat2 = lat2 * pi() / 180;
    lon2 = lon2 * pi() / 180;

    dlat = lat2 - lat1;
    dlon = lon2 - lon1;

    a = sin(dlat/2) * sin(dlat/2) + cos(lat1) * cos(lat2) * sin(dlon/2) * sin(dlon/2);
    c = 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION secure_check_in(p_member_id UUID, p_code TEXT, p_lat FLOAT DEFAULT NULL, p_lng FLOAT DEFAULT NULL)
RETURNS json
AS $$
DECLARE
  v_event record;
  v_distance float;
  v_is_late boolean;
  v_record record;
BEGIN
  -- 1. Find Event by code
  SELECT * INTO v_event FROM attendance_events WHERE UPPER(check_in_code) = UPPER(p_code) AND is_active = true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid check-in code.';
  END IF;

  -- 2. Time validation (Approx 30 hours)
  IF EXTRACT(EPOCH FROM (NOW() - (v_event.date + v_event.start_time))) / 3600 > 30 THEN
    RAISE EXCEPTION 'This event check-in code is no longer valid for today.';
  END IF;

  -- 3. Location validation
  IF v_event.lat IS NOT NULL AND v_event.lng IS NOT NULL THEN
    IF p_lat IS NULL OR p_lng IS NULL THEN
      RAISE EXCEPTION 'This event requires location access. Please allow location access to check in.';
    END IF;
    
    v_distance = calculate_distance(p_lat, p_lng, v_event.lat, v_event.lng);
    IF v_distance > COALESCE(v_event.radius_meters, 150) THEN
      RAISE EXCEPTION 'You must be within %m of the venue to check in. You are %m away.', COALESCE(v_event.radius_meters, 150), ROUND(v_distance::numeric);
    END IF;
  END IF;

  -- 4. Check if already checked in
  PERFORM 1 FROM attendance_records WHERE event_id = v_event.id AND member_id = p_member_id;
  IF FOUND THEN
    RAISE EXCEPTION 'You have already checked in for this event.';
  END IF;

  -- 5. Calculate late status: Only late if AFTER the duration has elapsed
  -- Using WAT (Africa/Lagos) timezone for comparison to matches local event times
  v_is_late = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Lagos') > (v_event.date + v_event.start_time + (COALESCE(v_event.duration_minutes, 60) * interval '1 minute'));

  -- 6. Insert record
  INSERT INTO attendance_records (event_id, member_id, is_late, metadata)
  VALUES (v_event.id, p_member_id, v_is_late, '{"source": "member_portal", "secure_rpc": true}'::jsonb)
  RETURNING * INTO v_record;

  RETURN row_to_json(v_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Public insert attendance_records" ON attendance_records;
