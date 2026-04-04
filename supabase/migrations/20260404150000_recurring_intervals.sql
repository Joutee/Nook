-- ============================================================
-- Recurring Intervals
-- Extracts recurring interval data into a dedicated lookup table,
-- shared by chores and recurring_expenses, and updates views.
-- ============================================================

-- ============================================================
-- 1. Create recurring_intervals table
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."recurring_intervals" (
    "id"             uuid    DEFAULT gen_random_uuid() NOT NULL,
    "type"           text    NOT NULL,
    "interval_day"   integer,
    "interval_month" integer,
    "custom_days"    integer,
    CONSTRAINT "recurring_intervals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recurring_intervals_type_check"
        CHECK ("type" IN ('daily','weekly','monthly','yearly','custom'))
);

ALTER TABLE "public"."recurring_intervals" OWNER TO "postgres";

ALTER TABLE "public"."recurring_intervals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage recurring intervals"
    ON "public"."recurring_intervals"
    FOR ALL TO "authenticated"
    USING (true)
    WITH CHECK (true);

GRANT ALL ON TABLE "public"."recurring_intervals" TO "anon";
GRANT ALL ON TABLE "public"."recurring_intervals" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_intervals" TO "service_role";

-- ============================================================
-- 2. Add FK columns to chores and recurring_expenses
-- ============================================================

ALTER TABLE "public"."chores"
    ADD COLUMN "recurring_interval_id" uuid REFERENCES "public"."recurring_intervals"("id");

ALTER TABLE "public"."recurring_expenses"
    ADD COLUMN "recurring_interval_id" uuid REFERENCES "public"."recurring_intervals"("id");

-- ============================================================
-- 3. Migrate existing data
-- ============================================================

DO $$
DECLARE
    v_chore           RECORD;
    v_expense         RECORD;
    v_interval_type   text;
    v_interval_day    integer;
    v_interval_month  integer;
    v_custom_days     integer;
    v_new_id          uuid;
BEGIN

    -- ---- Chores ----
    FOR v_chore IN
        SELECT id, interval_days
        FROM public.chores
        WHERE recurring_interval_id IS NULL
    LOOP
        -- Map interval_days to interval type
        CASE v_chore.interval_days
            WHEN 1   THEN v_interval_type := 'daily';
            WHEN 7   THEN v_interval_type := 'weekly';
            WHEN 30  THEN v_interval_type := 'monthly';
            WHEN 365 THEN v_interval_type := 'yearly';
            ELSE          v_interval_type := 'custom';
        END CASE;

        -- interval_day: 1 for weekly/monthly/yearly, NULL otherwise
        CASE v_interval_type
            WHEN 'weekly'  THEN v_interval_day := 1;
            WHEN 'monthly' THEN v_interval_day := 1;
            WHEN 'yearly'  THEN v_interval_day := 1;
            ELSE                v_interval_day := NULL;
        END CASE;

        -- interval_month: 1 for yearly, NULL otherwise
        IF v_interval_type = 'yearly' THEN
            v_interval_month := 1;
        ELSE
            v_interval_month := NULL;
        END IF;

        -- custom_days: original value for 'custom', NULL otherwise
        IF v_interval_type = 'custom' THEN
            v_custom_days := v_chore.interval_days::integer;
        ELSE
            v_custom_days := NULL;
        END IF;

        INSERT INTO public.recurring_intervals (type, interval_day, interval_month, custom_days)
        VALUES (v_interval_type, v_interval_day, v_interval_month, v_custom_days)
        RETURNING id INTO v_new_id;

        UPDATE public.chores
        SET recurring_interval_id = v_new_id
        WHERE id = v_chore.id;

    END LOOP;

    -- ---- Recurring Expenses ----
    FOR v_expense IN
        SELECT id, interval, interval_day, interval_month
        FROM public.recurring_expenses
        WHERE recurring_interval_id IS NULL
    LOOP
        INSERT INTO public.recurring_intervals (type, interval_day, interval_month, custom_days)
        VALUES (v_expense.interval, v_expense.interval_day, v_expense.interval_month, NULL)
        RETURNING id INTO v_new_id;

        UPDATE public.recurring_expenses
        SET recurring_interval_id = v_new_id
        WHERE id = v_expense.id;

    END LOOP;

END;
$$;

-- ============================================================
-- 4. Drop old columns and make FKs NOT NULL
-- ============================================================

ALTER TABLE "public"."chores" DROP COLUMN IF EXISTS "interval_days";

ALTER TABLE "public"."recurring_expenses" DROP COLUMN IF EXISTS "interval";
ALTER TABLE "public"."recurring_expenses" DROP COLUMN IF EXISTS "interval_day";
ALTER TABLE "public"."recurring_expenses" DROP COLUMN IF EXISTS "interval_month";
ALTER TABLE "public"."recurring_expenses" DROP CONSTRAINT IF EXISTS "recurring_expenses_interval_check";

ALTER TABLE "public"."chores" ALTER COLUMN "recurring_interval_id" SET NOT NULL;
ALTER TABLE "public"."recurring_expenses" ALTER COLUMN "recurring_interval_id" SET NOT NULL;

-- ============================================================
-- 5. Recreate view_chore_dashboard
-- ============================================================

DROP VIEW IF EXISTS "public"."view_chore_dashboard";

CREATE VIEW "public"."view_chore_dashboard" WITH ("security_invoker"='on') AS
 WITH "chore_calculations" AS (
         SELECT c.id AS chore_id,
            c.flat_id,
            c.name,
            c.description,
            c.start_date,
            c.recurring_interval_id,
            ri.type           AS interval_type,
            ri.interval_day,
            ri.interval_month,
            ri.custom_days,
            CASE ri.type
                WHEN 'daily'   THEN FLOOR(EXTRACT(EPOCH FROM (now() - c.start_date)) / 86400)::integer
                WHEN 'weekly'  THEN FLOOR(EXTRACT(EPOCH FROM (now() - c.start_date)) / (86400 * 7))::integer
                WHEN 'monthly' THEN (
                    (EXTRACT(YEAR  FROM now())::integer - EXTRACT(YEAR  FROM c.start_date)::integer) * 12
                  + (EXTRACT(MONTH FROM now())::integer - EXTRACT(MONTH FROM c.start_date)::integer)
                )
                WHEN 'yearly'  THEN (
                    EXTRACT(YEAR FROM now())::integer - EXTRACT(YEAR FROM c.start_date)::integer
                )
                WHEN 'custom'  THEN FLOOR(EXTRACT(EPOCH FROM (now() - c.start_date)) / (86400 * ri.custom_days))::integer
                ELSE 0
            END AS current_cycle_index
           FROM public.chores c
           JOIN public.recurring_intervals ri ON ri.id = c.recurring_interval_id
        ), "assignments_aggregated" AS (
         SELECT chore_profile.chore_id,
            count(*)                                                              AS total_assignees,
            array_agg(chore_profile.profile_id ORDER BY chore_profile.rotation_order) AS assignee_ids
           FROM public.chore_profile
          GROUP BY chore_profile.chore_id
        ), "current_assignments" AS (
         SELECT cc.chore_id,
            cc.flat_id,
            cc.name,
            cc.description,
            cc.start_date,
            cc.recurring_interval_id,
            cc.interval_type,
            cc.interval_day,
            cc.interval_month,
            cc.custom_days,
            cc.current_cycle_index,
                CASE
                    WHEN (aa.total_assignees > 0) THEN
                    CASE
                        WHEN (cc.current_cycle_index < 0) THEN aa.assignee_ids[1]
                        ELSE aa.assignee_ids[((cc.current_cycle_index::bigint % aa.total_assignees) + 1)]
                    END
                    ELSE NULL::uuid
                END AS calculated_assignee_id
           FROM (chore_calculations cc
             LEFT JOIN assignments_aggregated aa ON (aa.chore_id = cc.chore_id))
        )
 SELECT ca.chore_id AS id,
    ca.flat_id,
    ca.name,
    ca.description,
    ca.start_date,
    ca.recurring_interval_id,
    ca.interval_type,
    ca.interval_day,
    ca.interval_month,
    ca.custom_days,
    ca.current_cycle_index,
    ca.calculated_assignee_id AS current_assignee_id,
    p.name                    AS assignee_name,
    p.surname                 AS assignee_surname,
    p.avatar_url              AS assignee_avatar,
    p.id                      AS assignee_user_id,
    (EXISTS ( SELECT 1
           FROM public.chore_completions comp
          WHERE comp.chore_id = ca.chore_id
            AND comp.cycle_index = ca.current_cycle_index)) AS is_completed_current_cycle
   FROM (current_assignments ca
     LEFT JOIN public.profiles p ON (p.id = ca.calculated_assignee_id));

ALTER VIEW "public"."view_chore_dashboard" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "service_role";

-- ============================================================
-- 6. Recreate view_chore_history
-- ============================================================

DROP VIEW IF EXISTS "public"."view_chore_history";

CREATE VIEW "public"."view_chore_history" WITH ("security_invoker"='on') AS
 WITH RECURSIVE "cycle_series" AS (
         -- Base: cycle 0 for every chore (joined to its interval)
         SELECT c.id AS chore_id,
            c.flat_id,
            0 AS cycle_index,
            c.start_date,
            c.recurring_interval_id,
            ri.type        AS interval_type,
            ri.custom_days
           FROM public.chores c
           JOIN public.recurring_intervals ri ON ri.id = c.recurring_interval_id
        UNION ALL
         -- Recursive: advance one cycle at a time until we pass now()
         SELECT cs.chore_id,
            cs.flat_id,
            cs.cycle_index + 1,
            cs.start_date,
            cs.recurring_interval_id,
            cs.interval_type,
            cs.custom_days
           FROM cycle_series cs
          WHERE CASE cs.interval_type
                    WHEN 'daily'   THEN cs.start_date + ((cs.cycle_index + 1) * INTERVAL '1 day')
                    WHEN 'weekly'  THEN cs.start_date + ((cs.cycle_index + 1) * INTERVAL '7 days')
                    WHEN 'monthly' THEN cs.start_date + ((cs.cycle_index + 1) * INTERVAL '1 month')
                    WHEN 'yearly'  THEN cs.start_date + ((cs.cycle_index + 1) * INTERVAL '1 year')
                    WHEN 'custom'  THEN cs.start_date + ((cs.cycle_index + 1) * cs.custom_days * INTERVAL '1 day')
                    ELSE cs.start_date + ((cs.cycle_index + 1) * INTERVAL '1 day')
                END <= now()
        ), "assignments_count" AS (
         SELECT chore_profile.chore_id,
            count(*)                                                              AS total,
            array_agg(chore_profile.profile_id ORDER BY chore_profile.rotation_order) AS profiles
           FROM public.chore_profile
          GROUP BY chore_profile.chore_id
        )
 SELECT cs.chore_id::text AS chore_id,
    cs.flat_id::text      AS flat_id,
    cs.cycle_index,
    CASE cs.interval_type
        WHEN 'daily'   THEN (cs.start_date + (cs.cycle_index * INTERVAL '1 day'))::text
        WHEN 'weekly'  THEN (cs.start_date + (cs.cycle_index * INTERVAL '7 days'))::text
        WHEN 'monthly' THEN (cs.start_date + (cs.cycle_index * INTERVAL '1 month'))::text
        WHEN 'yearly'  THEN (cs.start_date + (cs.cycle_index * INTERVAL '1 year'))::text
        WHEN 'custom'  THEN (cs.start_date + (cs.cycle_index * cs.custom_days * INTERVAL '1 day'))::text
        ELSE                (cs.start_date + (cs.cycle_index * INTERVAL '1 day'))::text
    END AS cycle_start_date,
    (ac.profiles[((cs.cycle_index::bigint % ac.total) + 1)])::text AS expected_profile_id,
    ep.name                    AS expected_profile_name,
    ep.surname                 AS expected_profile_surname,
    ep.avatar_url              AS expected_profile_avatar,
        CASE
            WHEN cc.id IS NOT NULL THEN true
            ELSE false
        END AS is_done,
    cc.profile_id::text        AS completed_by_profile_id,
    cp.name                    AS completed_by_name,
    cp.surname                 AS completed_by_surname,
    cc.completed_at::text      AS completed_at
   FROM ((((cycle_series cs
     JOIN assignments_count ac ON (ac.chore_id = cs.chore_id))
     LEFT JOIN public.chore_completions cc ON (cc.chore_id = cs.chore_id AND cc.cycle_index = cs.cycle_index))
     LEFT JOIN public.profiles ep ON (ep.id = ac.profiles[((cs.cycle_index::bigint % ac.total) + 1)]))
     LEFT JOIN public.profiles cp ON (cp.id = cc.profile_id));

ALTER VIEW "public"."view_chore_history" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."view_chore_history" TO "anon";
GRANT ALL ON TABLE "public"."view_chore_history" TO "authenticated";
GRANT ALL ON TABLE "public"."view_chore_history" TO "service_role";
