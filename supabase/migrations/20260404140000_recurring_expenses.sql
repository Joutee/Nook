-- ============================================================
-- Recurring Expenses
-- Adds recurring expense templates that auto-generate expense
-- records via a daily pg_cron job.
-- ============================================================

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";

-- ============================================================
-- 2. recurring_expenses table
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."recurring_expenses" (
    "id"               uuid              DEFAULT gen_random_uuid() NOT NULL,
    "flat_id"          uuid              NOT NULL,
    "created_by"       uuid              NOT NULL,
    "payer_id"         uuid              NOT NULL,
    "title"            text              NOT NULL,
    "amount"           numeric(10,2)     NOT NULL,
    "currency"         text              DEFAULT 'CZK',
    "interval"         text              NOT NULL,
    "interval_day"     integer,
    "interval_month"   integer,
    "next_occurrence"  date              NOT NULL,
    "is_paused"        boolean           DEFAULT false,
    "created_at"       timestamptz       DEFAULT now(),
    CONSTRAINT "recurring_expenses_pkey"            PRIMARY KEY ("id"),
    CONSTRAINT "recurring_expenses_amount_check"    CHECK ("amount" > 0),
    CONSTRAINT "recurring_expenses_interval_check"  CHECK ("interval" IN ('daily','weekly','monthly','yearly'))
);

ALTER TABLE "public"."recurring_expenses" OWNER TO "postgres";

ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_flat_id_fkey"
        FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_payer_id_fkey"
        FOREIGN KEY ("payer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- ============================================================
-- 3. recurring_expense_members table
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."recurring_expense_members" (
    "id"                    uuid  DEFAULT gen_random_uuid() NOT NULL,
    "recurring_expense_id"  uuid  NOT NULL,
    "profile_id"            uuid  NOT NULL,
    CONSTRAINT "recurring_expense_members_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."recurring_expense_members" OWNER TO "postgres";

ALTER TABLE ONLY "public"."recurring_expense_members"
    ADD CONSTRAINT "recurring_expense_members_recurring_expense_id_fkey"
        FOREIGN KEY ("recurring_expense_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."recurring_expense_members"
    ADD CONSTRAINT "recurring_expense_members_profile_id_fkey"
        FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- ============================================================
-- 4. Add recurring_expense_id column to expenses
-- ============================================================

ALTER TABLE "public"."expenses"
    ADD COLUMN IF NOT EXISTS "recurring_expense_id" uuid;

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_recurring_expense_id_fkey"
        FOREIGN KEY ("recurring_expense_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE SET NULL;

-- ============================================================
-- 5. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_recurring_expenses_flat_id"
    ON "public"."recurring_expenses" USING btree ("flat_id");

CREATE INDEX IF NOT EXISTS "idx_recurring_expenses_next_occurrence"
    ON "public"."recurring_expenses" USING btree ("next_occurrence")
    WHERE "is_paused" = false;

CREATE INDEX IF NOT EXISTS "idx_recurring_expense_members_recurring_expense_id"
    ON "public"."recurring_expense_members" USING btree ("recurring_expense_id");

-- ============================================================
-- 6. Enable RLS on new tables
-- ============================================================

ALTER TABLE "public"."recurring_expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recurring_expense_members" ENABLE ROW LEVEL SECURITY;

-- --- recurring_expenses policies ---

CREATE POLICY "Members can view recurring expenses in their flat"
    ON "public"."recurring_expenses"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "public"."flat_profile" fp
        WHERE fp.flat_id = "recurring_expenses"."flat_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can create recurring expenses in their flat"
    ON "public"."recurring_expenses"
    FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1 FROM "public"."flat_profile" fp
        WHERE fp.flat_id = "recurring_expenses"."flat_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can update recurring expenses in their flat"
    ON "public"."recurring_expenses"
    FOR UPDATE TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "public"."flat_profile" fp
        WHERE fp.flat_id = "recurring_expenses"."flat_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "public"."flat_profile" fp
        WHERE fp.flat_id = "recurring_expenses"."flat_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can delete recurring expenses in their flat"
    ON "public"."recurring_expenses"
    FOR DELETE TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "public"."flat_profile" fp
        WHERE fp.flat_id = "recurring_expenses"."flat_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

-- --- recurring_expense_members policies ---
-- Join through recurring_expenses to check flat membership

CREATE POLICY "Members can view recurring expense members in their flat"
    ON "public"."recurring_expense_members"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."recurring_expenses" re
        JOIN "public"."flat_profile" fp ON fp.flat_id = re.flat_id
        WHERE re.id = "recurring_expense_members"."recurring_expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can add recurring expense members in their flat"
    ON "public"."recurring_expense_members"
    FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1
        FROM "public"."recurring_expenses" re
        JOIN "public"."flat_profile" fp ON fp.flat_id = re.flat_id
        WHERE re.id = "recurring_expense_members"."recurring_expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can update recurring expense members in their flat"
    ON "public"."recurring_expense_members"
    FOR UPDATE TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."recurring_expenses" re
        JOIN "public"."flat_profile" fp ON fp.flat_id = re.flat_id
        WHERE re.id = "recurring_expense_members"."recurring_expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1
        FROM "public"."recurring_expenses" re
        JOIN "public"."flat_profile" fp ON fp.flat_id = re.flat_id
        WHERE re.id = "recurring_expense_members"."recurring_expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can delete recurring expense members in their flat"
    ON "public"."recurring_expense_members"
    FOR DELETE TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."recurring_expenses" re
        JOIN "public"."flat_profile" fp ON fp.flat_id = re.flat_id
        WHERE re.id = "recurring_expense_members"."recurring_expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

-- ============================================================
-- 7. generate_recurring_expenses() function
-- Runs as SECURITY DEFINER so the cron job (postgres role) can
-- INSERT into expenses / expense_shares without RLS interference.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_recurring_expenses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template        RECORD;
  v_member          uuid;
  v_members         uuid[];
  v_member_count    int;
  v_expense_id      uuid;
  v_base_share      numeric(10,2);
  v_remainder       numeric(10,2);
  v_share_amount    numeric(10,2);
  v_idx             int;
  v_next            date;
BEGIN
  -- Iterate over every non-paused template that is due
  FOR v_template IN
    SELECT *
    FROM recurring_expenses
    WHERE is_paused = false
      AND next_occurrence <= CURRENT_DATE
  LOOP
    v_next := v_template.next_occurrence;

    -- Catch-up loop: generate one expense per missed occurrence
    WHILE v_next <= CURRENT_DATE LOOP

      -- Collect active members for this template
      SELECT ARRAY(
        SELECT rem.profile_id
        FROM recurring_expense_members rem
        JOIN flat_profile fp
          ON fp.flat_id = v_template.flat_id
         AND fp.profile_id = rem.profile_id
         AND fp.active = true
        WHERE rem.recurring_expense_id = v_template.id
        ORDER BY rem.profile_id   -- deterministic order for remainder assignment
      ) INTO v_members;

      v_member_count := array_length(v_members, 1);

      -- Skip if no active members; just advance the date
      IF v_member_count IS NULL OR v_member_count = 0 THEN
        -- advance date and continue
        CASE v_template.interval
          WHEN 'daily'   THEN v_next := v_next + INTERVAL '1 day';
          WHEN 'weekly'  THEN v_next := v_next + INTERVAL '7 days';
          WHEN 'monthly' THEN v_next := v_next + INTERVAL '1 month';
          WHEN 'yearly'  THEN v_next := v_next + INTERVAL '1 year';
        END CASE;
        CONTINUE;
      END IF;

      -- Calculate equal shares with CEIL rounding; last member absorbs remainder
      v_base_share  := CEIL(v_template.amount / v_member_count * 100) / 100;
      v_remainder   := v_template.amount - v_base_share * (v_member_count - 1);

      -- Insert the parent expense record
      INSERT INTO expenses (
          flat_id,
          payer_id,
          title,
          amount,
          currency,
          happened_at,
          recurring_expense_id,
          is_settlement
      )
      VALUES (
          v_template.flat_id,
          v_template.payer_id,
          v_template.title,
          v_template.amount,
          v_template.currency,
          v_next::timestamptz,
          v_template.id,
          false
      )
      RETURNING id INTO v_expense_id;

      -- Insert a share for each active member
      v_idx := 1;
      FOREACH v_member IN ARRAY v_members LOOP
        IF v_idx = v_member_count THEN
          v_share_amount := v_remainder;
        ELSE
          v_share_amount := v_base_share;
        END IF;

        INSERT INTO expense_shares (expense_id, profile_id, owed_amount)
        VALUES (v_expense_id, v_member, v_share_amount);

        v_idx := v_idx + 1;
      END LOOP;

      -- Advance the occurrence date
      CASE v_template.interval
        WHEN 'daily'   THEN v_next := v_next + INTERVAL '1 day';
        WHEN 'weekly'  THEN v_next := v_next + INTERVAL '7 days';
        WHEN 'monthly' THEN v_next := v_next + INTERVAL '1 month';
        WHEN 'yearly'  THEN v_next := v_next + INTERVAL '1 year';
      END CASE;

    END LOOP; -- end catch-up WHILE

    -- Persist the new next_occurrence back to the template
    UPDATE recurring_expenses
    SET next_occurrence = v_next
    WHERE id = v_template.id;

  END LOOP; -- end template FOR
END;
$$;

-- ============================================================
-- 8. Schedule daily cron job at 00:05 UTC
-- ============================================================

SELECT cron.schedule(
    'generate-recurring-expenses',   -- job name (unique)
    '5 0 * * *',                     -- 00:05 UTC daily
    $$SELECT public.generate_recurring_expenses();$$
);
