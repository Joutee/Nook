-- Update handle_new_user to support Google OAuth metadata
-- Google provides: given_name, family_name, picture
-- Email signup provides: name, surname, avatar_url
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin
  insert into public.profiles (id, name, surname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'given_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'surname', new.raw_user_meta_data->>'family_name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;$$;
