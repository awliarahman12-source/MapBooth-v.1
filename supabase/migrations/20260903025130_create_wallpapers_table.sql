/*
# Create wallpapers table for custom wallpaper persistence

1. New Tables
- `wallpapers`
  - `id` (uuid, primary key)
  - `url` (text, not null) — public URL of the uploaded wallpaper image
  - `name` (text, not null) — display name of the wallpaper
  - `created_at` (timestamptz, default now)
2. Security
- Enable RLS on `wallpapers`.
- Allow anon + authenticated CRUD (single-tenant, no auth — data is intentionally shared).
3. Storage
- Create a public storage bucket `wallpapers` for image uploads.
- Allow public read access to the bucket.
*/

CREATE TABLE IF NOT EXISTS wallpapers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallpapers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_wallpapers" ON wallpapers;
CREATE POLICY "anon_select_wallpapers" ON wallpapers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_wallpapers" ON wallpapers;
CREATE POLICY "anon_insert_wallpapers" ON wallpapers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_wallpapers" ON wallpapers;
CREATE POLICY "anon_delete_wallpapers" ON wallpapers FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('wallpapers', 'wallpapers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_read_wallpapers_storage" ON storage.objects;
CREATE POLICY "anon_read_wallpapers_storage" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "anon_insert_wallpapers_storage" ON storage.objects;
CREATE POLICY "anon_insert_wallpapers_storage" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'wallpapers');
