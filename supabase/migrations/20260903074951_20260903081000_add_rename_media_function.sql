/*
# Add admin_update_media_name function + admin_rename_media
*/

CREATE OR REPLACE FUNCTION admin_update_media_name(p_passcode text, p_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify_passcode(p_passcode) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE admin_media SET name = p_name WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_update_media_name(text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_update_media_name(text, uuid, text) TO authenticated;
