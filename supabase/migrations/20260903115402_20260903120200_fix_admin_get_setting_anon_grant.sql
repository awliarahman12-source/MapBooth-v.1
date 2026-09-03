/*
# Fix admin_get_setting(p_key) execute grant for anon role

## Problem
The 1-arg admin_get_setting(p_key) is used by the frontend (anon key) to read
public settings like news_settings and system_settings. But it was revoked from
anon and granted only to authenticated. Since the app has no Supabase auth,
these calls fail with permission denied.

The admin_settings table already has a public SELECT policy (public_read_settings),
so the data is already readable by anon. The function just wraps the same query.

## Fix
Grant EXECUTE on admin_get_setting(text) to anon. This is safe because:
- The function only reads settings, it does not mutate.
- The admin_settings table already has a public SELECT policy.
- Sensitive settings (admin passcode) are never stored in this table.
*/

REVOKE EXECUTE ON FUNCTION admin_get_setting(text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_get_setting(text) TO anon, authenticated;