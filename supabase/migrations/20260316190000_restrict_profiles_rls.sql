-- Drop the overly permissive "public" read policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON "public"."profiles";

-- Allow users to always read their own profile (e.g. before joining a flat)
CREATE POLICY "Users can view own profile"
  ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (("auth"."uid"() = "id"));

-- "Users can view profiles of flatmates" already exists and stays unchanged
