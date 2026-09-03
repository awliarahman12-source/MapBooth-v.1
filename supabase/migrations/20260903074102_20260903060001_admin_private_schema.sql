/*
# Create Admin Private data tables with RLS — schema objects

Creates admin_media and admin_settings tables with RLS enabled,
a private storage bucket, and SECURITY DEFINER functions that
validate the admin passcode server-side before any read/write.
*/

-- ============================================================
-- 1. admin_media table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  name text NOT NULL,
  filter text,
  category text NOT NULL DEFAULT 'capture',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_media ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → direct Data API access returns nothing.

-- ============================================================
-- 2. admin_settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → direct Data API access returns nothing.

-- ============================================================
-- 3. Private storage bucket for admin media
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-media', 'admin-media', false)
ON CONFLICT (id) DO NOTHING;

-- No storage policies for anon on admin-media bucket.

-- ============================================================
-- 4. SECURITY DEFINER functions (validate passcode server-side)
-- ============================================================

-- Helper: verify passcode
CREATE OR REPLACE FUNCTION admin_verify_passcode(p_passcode text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN p_passcode = '110106';
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_verify_passcode(text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_verify_passcode(text) TO authenticated;

-- Select all admin media
CREATE OR REPLACE FUNCTION admin_select_media(p_passcode text)
RETURNS SETOF admin_media
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM admin_media ORDER BY created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_select_media(text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_select_media(text) TO authenticated;

-- Insert admin media
CREATE OR REPLACE FUNCTION admin_insert_media(
  p_passcode text,
  p_type text,
  p_url text,
  p_name text,
  p_filter text DEFAULT NULL,
  p_category text DEFAULT 'capture'
)
RETURNS admin_media
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row admin_media;
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_type NOT IN ('image', 'video') THEN
    RAISE EXCEPTION 'Invalid media type';
  END IF;
  INSERT INTO admin_media (type, url, name, filter, category)
  VALUES (p_type, p_url, p_name, p_filter, p_category)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_insert_media(text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_insert_media(text, text, text, text, text, text) TO authenticated;

-- Delete admin media
CREATE OR REPLACE FUNCTION admin_delete_media(p_passcode text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM admin_media WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_delete_media(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION admin_delete_media(text, uuid) TO authenticated;

-- Get a setting
CREATE OR REPLACE FUNCTION admin_get_setting(p_passcode text, p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_value text;
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT value INTO v_value FROM admin_settings WHERE key = p_key;
  RETURN v_value;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_get_setting(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_get_setting(text, text) TO authenticated;

-- Set (upsert) a setting
CREATE OR REPLACE FUNCTION admin_set_setting(p_passcode text, p_key text, p_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO admin_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_set_setting(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_set_setting(text, text, text) TO authenticated;
