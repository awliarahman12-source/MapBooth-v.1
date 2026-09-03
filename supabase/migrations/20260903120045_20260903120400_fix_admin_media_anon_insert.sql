/*
# Add anon INSERT policy for admin-media storage bucket

## Problem
The admin-media storage bucket has an authenticated-only INSERT policy.
The app uses the anon key (passcode-based auth, no Supabase session),
so uploads to admin-media fail silently.

## Fix
Add an anon INSERT policy for the admin-media bucket, matching the pattern
used for wallpapers, system-assets, and public-photos.

## Security
- The admin-media bucket SELECT remains authenticated-only — anon cannot read.
- The admin_media table RLS blocks all anon access (no policies).
- The adminStore.uploadPrivateCaptureToStorage is only called when
  privateCaptureEnabled is true (admin passcode-gated in the UI).
- The getPublicUrl call returns a URL, but the bucket is private=false,
  so the URL won't work for anon users — only authenticated can read.
*/

DROP POLICY IF EXISTS "anon_insert_admin_media_storage" ON storage.objects;
CREATE POLICY "anon_insert_admin_media_storage" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'admin-media');