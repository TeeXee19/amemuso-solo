import fs from 'fs';

const path = 'supabase_schema.sql';
let content = fs.readFileSync(path, 'utf8');

const rpcSQL = `
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

  SELECT row_to_json(m) INTO v_member FROM members m WHERE portal_id = p_portal_id AND portal_pin = p_pin;
  
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
  SELECT * INTO v_member FROM members WHERE portal_id = p_portal_id AND portal_pin = p_pin;
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
    photo_url = COALESCE(p_updates->>'photo_url', photo_url)
  WHERE portal_id = p_portal_id 
  RETURNING row_to_json(members.*) INTO v_updated;

  -- Also update linked registration if needed
  IF (p_updates ? 'full_name' OR p_updates ? 'voice_part') THEN
    UPDATE registrations 
    SET 
      full_name = COALESCE(p_updates->>'full_name', full_name),
      voice_part = COALESCE(p_updates->>'voice_part', voice_part)
    WHERE id = v_member.registration_id;
  END IF;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

if (!content.includes('SECURE PORTAL API (RPC)')) {
    fs.appendFileSync(path, '\n' + rpcSQL);
    console.log('Appended securely');
} else {
    console.log('Already appended');
}
