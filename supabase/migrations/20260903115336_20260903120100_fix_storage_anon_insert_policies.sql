/*
# Fix storage INSERT policies for anon role

## Problem
The app uses a passcode-based admin system (not Supabase auth), so all requests
run as the `anon` role. But storage INSERT policies for `system-assets` and
`public-photos` buckets are `TO authenticated` only, meaning uploads fail silently.

## Fix
Add `anon, authenticated` INSERT policies for `system-assets` and `public-photos`
buckets, matching the existing pattern used for the `wallpapers` bucket.

## Security
- SELECT (read) policies are unchanged — `admin-media` remains authenticated-only for reads.
- DELETE remains authenticated-only (deletions go through RPC functions).
- The admin UI is gated by the passcode. Storage paths are organized by purpose.
- This does not expose admin private data — the `admin-media` bucket SELECT policy
  remains authenticated-only, and admin_media table RLS blocks all anon access.
*/

-- system-assets: allow anon insert (for news images, icons, branding assets)
DROP POLICY IF EXISTS "anon_insert_system_assets" ON storage.objects;
CREATE POLICY "anon_insert_system_assets" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'system-assets');

-- public-photos: allow anon insert (for admin photo uploads)
DROP POLICY IF EXISTS "anon_insert_photos_storage" ON storage.objects;
CREATE POLICY "anon_insert_photos_storage" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'public-photos');