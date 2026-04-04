-- ============================================================
-- FIX 1: Chores UPDATE policy - tautology bug
-- Bug: WITH CHECK had fp.flat_id = fp.flat_id (always true)
-- Fix: Compare fp.flat_id to chores.flat_id
-- ============================================================

DROP POLICY IF EXISTS "Users can update chores in their flat" ON "public"."chores";
CREATE POLICY "Users can update chores in their flat" ON "public"."chores"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS (
    SELECT 1 FROM "public"."flat_profile" "fp"
    WHERE "fp"."flat_id" = "chores"."flat_id"
      AND "fp"."profile_id" = "auth"."uid"()
  )))
  WITH CHECK ((EXISTS (
    SELECT 1 FROM "public"."flat_profile" "fp"
    WHERE "fp"."flat_id" = "chores"."flat_id"
      AND "fp"."profile_id" = "auth"."uid"()
  )));

-- ============================================================
-- FIX 2: flat_profile UPDATE - privilege escalation guard
-- Problem: No WITH CHECK means users can set is_admin=true or change role
-- Solution: BEFORE UPDATE trigger that only allows admins to change
--           is_admin and role fields
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_flat_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- is_admin can only be changed by flat admins (never by self)
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.flat_profile
      WHERE flat_id = OLD.flat_id
        AND profile_id = auth.uid()
        AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Only flat admins can change admin status';
    END IF;
  END IF;

  -- Role changes: users can set their OWN role, but only admins can change OTHER users' roles
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.profile_id = auth.uid() THEN
      -- User is changing their own role - allowed (e.g. initial role selection)
      NULL;
    ELSIF NOT EXISTS (
      SELECT 1 FROM public.flat_profile
      WHERE flat_id = OLD.flat_id
        AND profile_id = auth.uid()
        AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Only flat admins can change roles of other members';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_flat_profile_privilege_escalation_trigger ON "public"."flat_profile";
CREATE TRIGGER check_flat_profile_privilege_escalation_trigger
  BEFORE UPDATE ON "public"."flat_profile"
  FOR EACH ROW
  EXECUTE FUNCTION public.check_flat_profile_privilege_escalation();

-- ============================================================
-- HELPER: Membership check function (SECURITY DEFINER)
-- Needed because flat_profile SELECT policy cannot reference
-- flat_profile itself (infinite recursion). This function
-- bypasses RLS to check membership.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_member_of_flat(check_flat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flat_profile
    WHERE flat_id = check_flat_id
      AND profile_id = auth.uid()
  );
$$;

-- ============================================================
-- FIX 3: Restrict flat_profile SELECT to user's own flats
-- Was: USING (true) - any authenticated user sees ALL memberships
-- Uses helper function to avoid infinite recursion
-- ============================================================

DROP POLICY IF EXISTS "Users can view flat members" ON "public"."flat_profile";
CREATE POLICY "Users can view flat members" ON "public"."flat_profile"
  FOR SELECT TO "authenticated"
  USING (public.is_member_of_flat(flat_id));

-- ============================================================
-- FIX 4: Restrict flats SELECT to user's own flats
-- Was: USING (true) - any authenticated user sees ALL flats
-- Uses helper function to avoid infinite recursion
-- ============================================================

DROP POLICY IF EXISTS "Users can view their flats" ON "public"."flats";
CREATE POLICY "Users can view their flats" ON "public"."flats"
  FOR SELECT TO "authenticated"
  USING (public.is_member_of_flat(id));

-- ============================================================
-- NEW: join_flat_by_code() SECURITY DEFINER function
-- Required because after FIX 4, non-members can't SELECT flats
-- by code anymore. This function encapsulates the entire join
-- flow server-side.
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_flat_by_code(flat_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flat RECORD;
  v_user_id UUID;
  v_existing RECORD;
  v_is_rejoining BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Find flat by code
  SELECT id, name, address INTO v_flat
  FROM flats WHERE code = UPPER(TRIM(flat_code));

  IF v_flat.id IS NULL THEN
    RETURN json_build_object('error', 'flat_not_found');
  END IF;

  -- Check existing membership
  SELECT id, active, role INTO v_existing
  FROM flat_profile
  WHERE flat_id = v_flat.id AND profile_id = v_user_id;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.active THEN
      RETURN json_build_object('error', 'already_member');
    END IF;
    -- Reactivate inactive membership
    UPDATE flat_profile SET active = true WHERE id = v_existing.id;
    v_is_rejoining := true;
  ELSE
    -- Create new membership
    INSERT INTO flat_profile (flat_id, profile_id, role, active)
    VALUES (v_flat.id, v_user_id, NULL, true);
  END IF;

  RETURN json_build_object(
    'success', true,
    'flat', json_build_object('id', v_flat.id, 'name', v_flat.name, 'address', v_flat.address),
    'is_rejoining', v_is_rejoining
  );
END;
$$;
