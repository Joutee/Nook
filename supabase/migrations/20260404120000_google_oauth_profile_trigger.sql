-- Update handle_new_user to support Google OAuth metadata
-- Google provides: name (full name), full_name, picture, avatar_url
-- Email signup provides: name (first name), surname, avatar_url
-- When only full_name is available, split on first space into name + surname
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin
  insert into public.profiles (id, name, surname, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'given_name',
      new.raw_user_meta_data->>'name',
      split_part(new.raw_user_meta_data->>'full_name', ' ', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'surname',
      new.raw_user_meta_data->>'family_name',
      nullif(substring(new.raw_user_meta_data->>'full_name' from position(' ' in coalesce(new.raw_user_meta_data->>'full_name', '')) + 1), '')
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;$$;
