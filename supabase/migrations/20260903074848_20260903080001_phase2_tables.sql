/*
# Phase 2: Create admin_filters, public_photos, public_albums tables + functions
*/

-- ============================================================
-- 1. admin_filters table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_id text UNIQUE NOT NULL,
  name text NOT NULL,
  css text NOT NULL DEFAULT 'none',
  is_builtin boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_filters ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. public_albums table
-- ============================================================
CREATE TABLE IF NOT EXISTS public_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public_albums ENABLE ROW LEVEL SECURITY;

-- Public can read albums
DROP POLICY IF EXISTS "public_select_albums" ON public_albums;
CREATE POLICY "public_select_albums" ON public_albums FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 3. public_photos table
-- ============================================================
CREATE TABLE IF NOT EXISTS public_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  name text NOT NULL,
  file_type text NOT NULL DEFAULT 'jpg',
  album_id uuid REFERENCES public_albums(id) ON DELETE SET NULL,
  featured boolean NOT NULL DEFAULT false,
  display_enabled boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public_photos ENABLE ROW LEVEL SECURITY;

-- Public can read photos
DROP POLICY IF EXISTS "public_select_photos" ON public_photos;
CREATE POLICY "public_select_photos" ON public_photos FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 4. Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-photos', 'public-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for public-photos bucket
DROP POLICY IF EXISTS "public_read_photos_storage" ON storage.objects;
CREATE POLICY "public_read_photos_storage" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'public-photos');

-- Public write (uploads go through admin functions, but storage needs a policy for authenticated uploads)
DROP POLICY IF EXISTS "auth_insert_photos_storage" ON storage.objects;
CREATE POLICY "auth_insert_photos_storage" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'public-photos');

DROP POLICY IF EXISTS "auth_delete_photos_storage" ON storage.objects;
CREATE POLICY "auth_delete_photos_storage" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'public-photos');

-- Also allow admin-media storage writes for authenticated
DROP POLICY IF EXISTS "auth_insert_admin_media_storage" ON storage.objects;
CREATE POLICY "auth_insert_admin_media_storage" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'admin-media');

DROP POLICY IF EXISTS "auth_read_admin_media_storage" ON storage.objects;
CREATE POLICY "auth_read_admin_media_storage" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'admin-media');

DROP POLICY IF EXISTS "auth_delete_admin_media_storage" ON storage.objects;
CREATE POLICY "auth_delete_admin_media_storage" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'admin-media');

-- ============================================================
-- 5. SECURITY DEFINER functions — admin_filters
-- ============================================================

CREATE OR REPLACE FUNCTION admin_select_filters(p_passcode text)
RETURNS SETOF admin_filters
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM admin_filters ORDER BY sort_order, created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_select_filters(text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_select_filters(text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_insert_filter(
  p_passcode text,
  p_filter_id text,
  p_name text,
  p_css text,
  p_is_builtin boolean DEFAULT false
)
RETURNS admin_filters
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row admin_filters;
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO admin_filters (filter_id, name, css, is_builtin, enabled, sort_order)
  VALUES (p_filter_id, p_name, p_css, p_is_builtin, true, 999)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_insert_filter(text, text, text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION admin_insert_filter(text, text, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION admin_update_filter(
  p_passcode text,
  p_id uuid,
  p_name text DEFAULT NULL,
  p_css text DEFAULT NULL,
  p_enabled boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE admin_filters SET
    name = COALESCE(p_name, name),
    css = COALESCE(p_css, css),
    enabled = COALESCE(p_enabled, enabled)
  WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_update_filter(text, uuid, text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION admin_update_filter(text, uuid, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION admin_delete_filter(p_passcode text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM admin_filters WHERE id = p_id AND is_builtin = false;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_delete_filter(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION admin_delete_filter(text, uuid) TO authenticated;

-- ============================================================
-- 6. SECURITY DEFINER functions — public_photos
-- ============================================================

CREATE OR REPLACE FUNCTION admin_insert_photo(
  p_passcode text,
  p_url text,
  p_name text,
  p_file_type text,
  p_album_id uuid DEFAULT NULL
)
RETURNS public_photos
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row public_photos;
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public_photos (url, name, file_type, album_id, sort_order)
  VALUES (p_url, p_name, p_file_type, p_album_id, 999)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_insert_photo(text, text, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION admin_insert_photo(text, text, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION admin_update_photo(
  p_passcode text,
  p_id uuid,
  p_name text DEFAULT NULL,
  p_album_id uuid DEFAULT NULL,
  p_featured boolean DEFAULT NULL,
  p_display_enabled boolean DEFAULT NULL,
  p_display_order int DEFAULT NULL,
  p_sort_order int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public_photos SET
    name = COALESCE(p_name, name),
    album_id = COALESCE(p_album_id, album_id),
    featured = COALESCE(p_featured, featured),
    display_enabled = COALESCE(p_display_enabled, display_enabled),
    display_order = COALESCE(p_display_order, display_order),
    sort_order = COALESCE(p_sort_order, sort_order)
  WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_update_photo(text, uuid, text, uuid, boolean, boolean, int, int) FROM anon;
GRANT EXECUTE ON FUNCTION admin_update_photo(text, uuid, text, uuid, boolean, boolean, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION admin_delete_photo(p_passcode text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public_photos WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_delete_photo(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION admin_delete_photo(text, uuid) TO authenticated;

-- ============================================================
-- 7. SECURITY DEFINER functions — public_albums
-- ============================================================

CREATE OR REPLACE FUNCTION admin_insert_album(p_passcode text, p_name text)
RETURNS public_albums
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row public_albums;
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public_albums (name, sort_order)
  VALUES (p_name, 999)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_insert_album(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_insert_album(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_delete_album(p_passcode text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public_albums WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_delete_album(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION admin_delete_album(text, uuid) TO authenticated;

-- ============================================================
-- 8. Seed built-in filters
-- ============================================================
INSERT INTO admin_filters (filter_id, name, css, is_builtin, enabled, sort_order) VALUES
  ('normal', 'Normal', 'none', true, true, 0),
  ('thermal', 'Thermal', 'invert(100%) hue-rotate(180deg) saturate(300%)', true, true, 1),
  ('xray', 'X-Ray', 'invert(100%) grayscale(100%)', true, true, 2),
  ('popart', 'Pop Art', 'contrast(200%) saturate(300%) hue-rotate(90deg)', true, true, 3),
  ('glow', 'Glow', 'brightness(130%) contrast(120%) drop-shadow(0 0 10px rgba(255,255,255,0.8))', true, true, 4),
  ('comic', 'Comic', 'contrast(300%) grayscale(50%)', true, true, 5),
  ('scifi', 'Sci-Fi', 'hue-rotate(240deg) saturate(200%) contrast(150%)', true, true, 6),
  ('tunnel', 'Tunnel', 'contrast(150%) hue-rotate(300deg)', true, true, 7),
  ('bw', 'B&W', 'grayscale(100%) contrast(120%)', true, true, 8),
  ('sepia', 'Sepia', 'sepia(100%)', true, true, 9),
  ('hue', 'Hue Shift', 'hue-rotate(180deg)', true, true, 10),
  ('invert', 'Invert', 'invert(100%)', true, true, 11),
  ('blur', 'Soft Blur', 'blur(3px)', true, true, 12),
  ('saturate', 'Vivid', 'saturate(500%)', true, true, 13),
  ('contrast', 'High Contrast', 'contrast(300%)', true, true, 14)
ON CONFLICT (filter_id) DO NOTHING;
