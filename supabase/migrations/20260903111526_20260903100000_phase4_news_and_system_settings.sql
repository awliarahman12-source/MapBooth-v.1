/*
# Phase 4: News table + system_settings key + admin functions

## Purpose
1. Create a `news` table for the News Pop-up system.
2. Store news items with cover photo, title, subtitle, multiple photos, date, active/disabled state.
3. Reuse existing `admin_settings` table for both `system_settings` and `news_settings` keys (no new settings table needed).
4. Reuse existing `system-assets` storage bucket for news images.
5. All admin access goes through SECURITY DEFINER functions with passcode validation.
6. Public users can read active news items (for the user-facing News window).

## 1. New Tables

### news
- `id` (uuid, primary key)
- `title` (text, not null)
- `subtitle` (text, not null default '')
- `cover_url` (text, nullable — cover photo URL)
- `photos` (jsonb, default '[]' — array of photo URLs in order)
- `date` (date, not null default current_date)
- `active` (boolean, not null default true)
- `sort_order` (int, not null default 0)
- `created_at` (timestamptz, default now())

## 2. Security

### RLS on news
- ENABLE RLS.
- Public SELECT policy: anon + authenticated can read rows WHERE active = true.
- No direct INSERT/UPDATE/DELETE for anon or authenticated — all mutations go through SECURITY DEFINER functions.

### SECURITY DEFINER Functions
- `admin_insert_news(p_passcode, p_title, p_subtitle, p_cover_url, p_photos, p_date)` — inserts a news row, returns it
- `admin_update_news(p_passcode, p_id, p_title, p_subtitle, p_cover_url, p_photos, p_date, p_active, p_sort_order)` — updates a news row (NULL params = no change)
- `admin_delete_news(p_passcode, p_id)` — deletes a news row
- `admin_select_news_all(p_passcode)` — returns ALL news rows (admin only, includes inactive)
- `admin_reorder_news(p_passcode, p_id, p_sort_order)` — updates sort order for a single news item

All functions validate the admin passcode server-side.
REVOKE EXECUTE from anon, GRANT EXECUTE to authenticated.

## 3. Storage
- Reuses existing `system-assets` bucket (public read, authenticated insert/delete).
- News images stored under `news/` path prefix.

## 4. Important Notes
1. System settings (device specs, display, system info) are stored as JSON in `admin_settings` under key `system_settings`.
2. News settings (enable, show on startup, etc.) are stored as JSON in `admin_settings` under key `news_settings`.
3. Public users can only read active news items — inactive ones are admin-only.
4. No second database created — extends existing Supabase instance.
5. No new storage buckets — reuses `system-assets`.
*/

-- ============================================================
-- 1. news table
-- ============================================================
CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  cover_url text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  date date NOT NULL DEFAULT CURRENT_DATE,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Public can read active news only
DROP POLICY IF EXISTS "public_select_active_news" ON news;
CREATE POLICY "public_select_active_news" ON news FOR SELECT
  TO anon, authenticated USING (active = true);

-- ============================================================
-- 2. SECURITY DEFINER functions — news
-- ============================================================

CREATE OR REPLACE FUNCTION admin_insert_news(
  p_passcode text,
  p_title text,
  p_subtitle text DEFAULT '',
  p_cover_url text DEFAULT NULL,
  p_photos jsonb DEFAULT '[]'::jsonb,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS news
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row news;
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO news (title, subtitle, cover_url, photos, date, active, sort_order)
  VALUES (p_title, p_subtitle, p_cover_url, p_photos, p_date, true, 999)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_insert_news(text, text, text, text, jsonb, date) FROM anon;
GRANT EXECUTE ON FUNCTION admin_insert_news(text, text, text, text, jsonb, date) TO authenticated;

CREATE OR REPLACE FUNCTION admin_update_news(
  p_passcode text,
  p_id uuid,
  p_title text DEFAULT NULL,
  p_subtitle text DEFAULT NULL,
  p_cover_url text DEFAULT NULL,
  p_photos jsonb DEFAULT NULL,
  p_date date DEFAULT NULL,
  p_active boolean DEFAULT NULL,
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
  UPDATE news SET
    title = COALESCE(p_title, title),
    subtitle = COALESCE(p_subtitle, subtitle),
    cover_url = COALESCE(p_cover_url, cover_url),
    photos = COALESCE(p_photos, photos),
    date = COALESCE(p_date, date),
    active = COALESCE(p_active, active),
    sort_order = COALESCE(p_sort_order, sort_order)
  WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_update_news(text, uuid, text, text, text, jsonb, date, boolean, int) FROM anon;
GRANT EXECUTE ON FUNCTION admin_update_news(text, uuid, text, text, text, jsonb, date, boolean, int) TO authenticated;

CREATE OR REPLACE FUNCTION admin_delete_news(p_passcode text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM news WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_delete_news(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION admin_delete_news(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION admin_select_news_all(p_passcode text)
RETURNS SETOF news
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM news ORDER BY sort_order, created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_select_news_all(text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_select_news_all(text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_reorder_news(p_passcode text, p_id uuid, p_sort_order int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE news SET sort_order = p_sort_order WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_reorder_news(text, uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION admin_reorder_news(text, uuid, int) TO authenticated;
