/*
# Fix admin_settings.value column type and function overloads

## Problem
The admin_settings table was created with `value text` in an earlier migration,
but later functions expect `value jsonb`. This caused settings read/write failures.

## Fix
1. Drop the text default, alter column to jsonb, set jsonb default.
2. Recreate both admin_get_setting overloads to return jsonb.
3. Recreate admin_set_setting to accept jsonb.
*/

-- 1. Alter value column from text to jsonb
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'admin_settings'
    AND column_name = 'value'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE admin_settings ALTER COLUMN value DROP DEFAULT;
    ALTER TABLE admin_settings ALTER COLUMN value TYPE jsonb USING value::jsonb;
    ALTER TABLE admin_settings ALTER COLUMN value SET DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 2. Drop both existing admin_get_setting overloads
DROP FUNCTION IF EXISTS admin_get_setting(text, text);
DROP FUNCTION IF EXISTS admin_get_setting(text);

-- 3. admin_get_setting(p_key) — public read, returns jsonb
CREATE OR REPLACE FUNCTION admin_get_setting(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_value jsonb;
BEGIN
  SELECT value INTO v_value FROM admin_settings WHERE key = p_key;
  RETURN COALESCE(v_value, '{}'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_get_setting(text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_get_setting(text) TO authenticated;

-- 4. admin_get_setting(p_passcode, p_key) — admin read, returns jsonb
CREATE OR REPLACE FUNCTION admin_get_setting(p_passcode text, p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_value jsonb;
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT value INTO v_value FROM admin_settings WHERE key = p_key;
  RETURN COALESCE(v_value, '{}'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_get_setting(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_get_setting(text, text) TO authenticated;

-- 5. Drop and recreate admin_set_setting to accept jsonb
DROP FUNCTION IF EXISTS admin_set_setting(text, text, text);
DROP FUNCTION IF EXISTS admin_set_setting(text, text, jsonb);

CREATE OR REPLACE FUNCTION admin_set_setting(p_passcode text, p_key text, p_value jsonb)
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
  ON CONFLICT (key) DO UPDATE SET value = p_value, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_set_setting(text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION admin_set_setting(text, text, jsonb) TO authenticated;