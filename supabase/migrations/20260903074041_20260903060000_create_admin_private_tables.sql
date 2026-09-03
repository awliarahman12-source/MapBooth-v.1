/*
# Create Admin Private data tables with RLS

## Purpose
Establishes the database foundation for Admin Private data separation.
Public users (anon key) cannot read or write Admin Private data.
Only SECURITY DEFINER functions that validate the admin passcode server-side can access these tables.

## 1. New Tables

### admin_media
Stores Admin Private captures (photos, videos) that are NOT accessible to public users.
- `id` (uuid, primary key)
- `type` (text: 'image' | 'video')
- `url` (text — storage URL of the private media file)
- `name` (text — display name)
- `filter` (text, nullable — Photo Booth filter used for the capture)
- `category` (text — 'photo' | 'video' | 'capture')
- `created_at` (timestamptz, default now)

### admin_settings
Stores Admin Private settings key-value pairs.
- `id` (uuid, primary key)
- `key` (text, unique — setting key)
- `value` (text — setting value, JSON-encoded for complex values)
- `updated_at` (timestamptz, default now)

## 2. Security

### RLS
- Both tables have RLS ENABLED.
- NO policies are created for anon or authenticated roles.
- This means direct CRUD via the Supabase Data API returns zero rows for anon/authenticated.
- All access goes through SECURITY DEFINER functions that validate the admin passcode.

### SECURITY DEFINER Functions
- `admin_verify_passcode(p_passcode text)` — returns boolean
- `admin_select_media(p_passcode text)` — returns admin_media rows
- `admin_insert_media(p_passcode text, p_type text, p_url text, p_name text, p_filter text, p_category text)` — inserts a row
- `admin_delete_media(p_passcode text, p_id uuid)` — deletes a row
- `admin_get_setting(p_passcode text, p_key text)` — returns a setting value
- `admin_set_setting(p_passcode text, p_key text, p_value text)` — upserts a setting

All functions:
- Derive authorization from the passcode parameter (validated server-side).
- Use SET search_path = public to prevent search_path attacks.
- REVOKE EXECUTE from anon, GRANT EXECUTE to authenticated (callers must have a valid Supabase session token, even if the actual auth is the passcode).

## 3. Storage
- Create a PRIVATE storage bucket `admin-media` (public = false).
- Only SECURITY DEFINER functions and service-role can access it.
- No storage policies for anon on this bucket.

## 4. Important Notes
1. The admin passcode is validated SERVER-SIDE in every function, not just in the UI.
2. Public users using the anon key CANNOT read admin_media or admin_settings.
3. This does NOT create a second database — it extends the existing Supabase instance.
4. The existing wallpapers table and its public policies are unchanged.
5. Public Photo Booth captures remain in-memory (mediaStore.ts) and are NOT persisted to any database table.
*/
