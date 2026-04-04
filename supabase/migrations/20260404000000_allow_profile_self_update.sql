-- Drop the old policy (from remote_schema) that lacks WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile." ON "public"."profiles";

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ("auth"."uid"() = "id")
  WITH CHECK ("auth"."uid"() = "id");
