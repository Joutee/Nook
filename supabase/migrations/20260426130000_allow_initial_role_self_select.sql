-- ============================================================
-- FIX: privilege-escalation trigger blocked first-time role
-- selection on /select-role for users who joined someone
-- else's flat via code.
--
-- Repro: user joins flat -> flat_profile inserted with role=NULL,
-- is_admin=false. On /select-role they pick "pronajimatel".
-- The auto_set_admin_on_update trigger sets NEW.is_admin=true
-- (because a landlord is always admin). Then
-- check_flat_profile_privilege_escalation raises
-- "Only flat admins can change admin status" because the user
-- is not (yet) an admin in the flat.
--
-- Fix: allow the is_admin diff iff the user is updating their
-- own row AND OLD.role IS NULL (i.e. this is initial onboarding,
-- not a later self-promotion). Subsequent role changes still
-- require admin privileges.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_flat_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    -- Allow during initial onboarding (user picking their own role for the first time)
    IF OLD.profile_id = auth.uid() AND OLD.role IS NULL THEN
      NULL;
    ELSIF NOT EXISTS (
      SELECT 1 FROM public.flat_profile
      WHERE flat_id = OLD.flat_id
        AND profile_id = auth.uid()
        AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Only flat admins can change admin status';
    END IF;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.profile_id = auth.uid() THEN
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
