/*
# Grant EXECUTE to anon on all admin RPC functions

## Problem
All admin RPC functions were granted only to `authenticated`, but the app uses
passcode-based admin auth with no Supabase auth session — all requests run as `anon`.
Every RPC call fails with permission denied.

## Fix
Grant EXECUTE to `anon` on all admin functions. Safe because every function
validates the admin passcode server-side via admin_verify_passcode.

## Security
- admin_verify_passcode validates passcode in every function.
- RLS on admin_media/admin_settings tables unchanged (no anon policies).
- admin-media storage bucket SELECT remains authenticated-only.
*/

GRANT EXECUTE ON FUNCTION admin_verify_passcode(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_select_media(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_insert_media(text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_media(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_update_media_name(text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_setting(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_set_setting(text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION admin_insert_news(text, text, text, text, jsonb, date) TO anon;
GRANT EXECUTE ON FUNCTION admin_update_news(text, uuid, text, text, text, jsonb, date, boolean, int) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_news(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_select_news_all(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_reorder_news(text, uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION admin_insert_photo(text, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_update_photo(text, uuid, text, uuid, boolean, boolean, int, int) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_photo(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_insert_album(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_album(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_rename_wallpaper(text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_wallpaper(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_select_filters(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_insert_filter(text, text, text, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION admin_update_filter(text, uuid, text, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_filter(text, uuid) TO anon;