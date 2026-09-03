/*
# Phase 2: Admin filters, public photos, public albums

## 1. New Tables

### admin_filters
Stores Photo Booth filters managed by Admin. Built-in filters are seeded here.
- id (uuid, pk)
- filter_id (text, unique) — the CSS class suffix used by Photo Booth (e.g. 'thermal')
- name (text) — display name
- css (text) — CSS rule body for the filter (e.g. "invert(100%) hue-rotate(180deg) saturate(300%)")
- is_builtin (boolean) — true for system filters, false for custom imported
- enabled (boolean, default true)
- sort_order (int, default 0)
- created_at (timestamptz)

### public_photos
Permanent public photos managed by Admin for the public website.
- id (uuid, pk)
- url (text) — storage URL in public-photos bucket
- name (text)
- file_type (text) — 'jpg' | 'jpeg' | 'png' | 'webp'
- album_id (uuid, nullable, FK to public_albums)
- featured (boolean, default false)
- display_enabled (boolean, default false)
- display_order (int, default 0)
- sort_order (int, default 0)
- created_at (timestamptz)

### public_albums
Albums/folders for organizing public photos.
- id (uuid, pk)
- name (text)
- sort_order (int, default 0)
- created_at (timestamptz)

## 2. Security

### admin_filters
- RLS enabled, zero policies for anon/authenticated (same pattern as admin_media).
- Access only through SECURITY DEFINER functions that validate passcode.

### public_photos
- RLS enabled.
- SELECT policy for anon, authenticated (public can view managed photos).
- INSERT/UPDATE/DELETE only through SECURITY DEFINER functions (admin-only).

### public_albums
- RLS enabled.
- SELECT for anon, authenticated.
- INSERT/DELETE through SECURITY DEFINER functions.

## 3. Storage
- Create public bucket 'public-photos' for managed public photos.
- Public read access.
- Write access controlled by SECURITY DEFINER functions (admin uploads).

## 4. SECURITY DEFINER Functions
- admin_select_filters(p_passcode) → admin_filters rows
- admin_insert_filter(p_passcode, p_filter_id, p_name, p_css, p_is_builtin) → admin_filters
- admin_update_filter(p_passcode, p_id, p_name, p_css, p_enabled) → void
- admin_delete_filter(p_passcode, p_id) → void
- admin_reorder_filters(p_passcode, p_orders json) → void
- admin_insert_photo(p_passcode, p_url, p_name, p_file_type, p_album_id) → public_photos
- admin_update_photo(p_passcode, p_id, p_name, p_album_id, p_featured, p_display_enabled, p_display_order, p_sort_order) → void
- admin_delete_photo(p_passcode, p_id) → void
- admin_select_photos() → public_photos rows (no passcode needed — public read)
- admin_insert_album(p_passcode, p_name) → public_albums
- admin_delete_album(p_passcode, p_id) → void
- admin_select_albums() → public_albums rows (no passcode needed — public read)

## 5. Seed Data
- 15 built-in filters seeded matching the existing Photo Booth filters.
*/
