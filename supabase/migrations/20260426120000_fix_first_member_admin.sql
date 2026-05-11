-- ============================================================
-- FIX: set_first_user_as_admin handles the very first member
--
-- Bug: BEFORE INSERT triggers run before the row is in the table,
-- so (SELECT MIN(joined_at) FROM flat_profile WHERE flat_id = NEW.flat_id)
-- returns NULL for the very first member of a flat. The comparison
-- "NEW.joined_at = NULL" evaluates to NULL (not TRUE), so the trigger
-- fell through to the ELSE branch and set is_admin = false.
--
-- Result: the flat creator was inserted with is_admin = false. When
-- they later picked their role on /select-role, the auto_set_admin_on_update
-- trigger (alphabetically first) recomputed is_admin = true, and then
-- check_flat_profile_privilege_escalation_trigger raised
-- "Only flat admins can change admin status" because the user is not
-- (yet) an admin.
--
-- Fix: explicitly treat "no other members exist" as the first-member
-- case and grant is_admin = true. Exclude the row itself when running
-- under UPDATE to keep the trigger reentrant.
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."set_first_user_as_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Landlords are always admins.
  IF NEW.role = 'pronajimatel' THEN
    NEW.is_admin = true;
    RETURN NEW;
  END IF;

  -- First or only member of the flat becomes admin.
  IF NOT EXISTS (
    SELECT 1 FROM flat_profile
    WHERE flat_id = NEW.flat_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
  ) THEN
    NEW.is_admin = true;
    RETURN NEW;
  END IF;

  -- Otherwise: oldest joined_at wins
  IF NEW.joined_at = (
    SELECT MIN(joined_at)
    FROM flat_profile
    WHERE flat_id = NEW.flat_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
  ) THEN
    NEW.is_admin = true;
  ELSE
    NEW.is_admin = false;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- BACKFILL: any flat where no member has is_admin = true (caused
-- by the bug above); promote the oldest member.
--
-- Disable the privilege-escalation trigger for the backfill;
-- it relies on auth.uid(), which is NULL in migration context
-- and would falsely raise.
-- ============================================================

ALTER TABLE "public"."flat_profile"
  DISABLE TRIGGER check_flat_profile_privilege_escalation_trigger;

WITH oldest_per_flat AS (
  SELECT DISTINCT ON (flat_id) id
  FROM flat_profile
  WHERE flat_id NOT IN (
    SELECT DISTINCT flat_id FROM flat_profile WHERE is_admin = true
  )
  ORDER BY flat_id, joined_at ASC
)
UPDATE flat_profile
SET is_admin = true
WHERE id IN (SELECT id FROM oldest_per_flat);

ALTER TABLE "public"."flat_profile"
  ENABLE TRIGGER check_flat_profile_privilege_escalation_trigger;
