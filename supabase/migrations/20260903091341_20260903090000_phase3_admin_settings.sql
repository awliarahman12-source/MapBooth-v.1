/*
# Phase 3: admin_settings table for persistent configuration
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON admin_settings;
CREATE POLICY "public_read_settings" ON admin_settings FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('system-assets', 'system-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_system_assets" ON storage.objects;
CREATE POLICY "public_read_system_assets" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'system-assets');

DROP POLICY IF EXISTS "auth_insert_system_assets" ON storage.objects;
CREATE POLICY "auth_insert_system_assets" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'system-assets');

DROP POLICY IF EXISTS "auth_delete_system_assets" ON storage.objects;
CREATE POLICY "auth_delete_system_assets" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'system-assets');

DROP POLICY IF EXISTS "auth_insert_wallpapers_storage" ON storage.objects;
CREATE POLICY "auth_insert_wallpapers_storage" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "auth_delete_wallpapers_storage" ON storage.objects;
CREATE POLICY "auth_delete_wallpapers_storage" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'wallpapers');

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

CREATE OR REPLACE FUNCTION admin_rename_wallpaper(p_passcode text, p_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE wallpapers SET name = p_name WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_rename_wallpaper(text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_rename_wallpaper(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_delete_wallpaper(p_passcode text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM wallpapers WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_delete_wallpaper(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION admin_delete_wallpaper(text, uuid) TO authenticated;
