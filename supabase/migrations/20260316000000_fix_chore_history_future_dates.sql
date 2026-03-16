-- Fix view_chore_history to not show cycles for chores that haven't started yet
CREATE OR REPLACE VIEW "public"."view_chore_history" WITH ("security_invoker"='on') AS
 WITH RECURSIVE "cycle_series" AS (
         SELECT "chores"."id" AS "chore_id",
            "chores"."flat_id",
            0 AS "cycle_index",
            "chores"."start_date",
            "chores"."interval_days"
           FROM "public"."chores"
          WHERE ("chores"."interval_days" > 0)
            AND ("chores"."start_date" <= "now"())  -- Only include chores that have started
        UNION ALL
         SELECT "cycle_series"."chore_id",
            "cycle_series"."flat_id",
            ("cycle_series"."cycle_index" + 1),
            "cycle_series"."start_date",
            "cycle_series"."interval_days"
           FROM "cycle_series"
          WHERE (("cycle_series"."start_date" + (((("cycle_series"."cycle_index" + 1) * "cycle_series"."interval_days"))::double precision * '1 day'::interval)) <= "now"())
        ), "assignments_count" AS (
         SELECT "chore_profile"."chore_id",
            "count"(*) AS "total",
            "array_agg"("chore_profile"."profile_id" ORDER BY "chore_profile"."rotation_order") AS "profiles"
           FROM "public"."chore_profile"
          GROUP BY "chore_profile"."chore_id"
        )
 SELECT ("cs"."chore_id")::"text" AS "chore_id",
    ("cs"."flat_id")::"text" AS "flat_id",
    "cs"."cycle_index",
    (("cs"."start_date" + ((("cs"."cycle_index" * "cs"."interval_days"))::double precision * '1 day'::interval)))::"text" AS "cycle_start_date",
    ("ac"."profiles"[((("cs"."cycle_index")::bigint % "ac"."total") + 1)])::"text" AS "expected_profile_id",
    "ep"."name" AS "expected_profile_name",
    "ep"."surname" AS "expected_profile_surname",
    "ep"."avatar_url" AS "expected_profile_avatar",
        CASE
            WHEN ("cc"."id" IS NOT NULL) THEN true
            ELSE false
        END AS "is_done",
    ("cc"."profile_id")::"text" AS "completed_by_profile_id",
    "cp"."name" AS "completed_by_name",
    "cp"."surname" AS "completed_by_surname",
    ("cc"."completed_at")::"text" AS "completed_at"
   FROM (((("cycle_series" "cs"
     JOIN "assignments_count" "ac" ON (("ac"."chore_id" = "cs"."chore_id")))
     LEFT JOIN "public"."chore_completions" "cc" ON ((("cc"."chore_id" = "cs"."chore_id") AND ("cc"."cycle_index" = "cs"."cycle_index"))))
     LEFT JOIN "public"."profiles" "ep" ON (("ep"."id" = "ac"."profiles"[((("cs"."cycle_index")::bigint % "ac"."total") + 1)])))
     LEFT JOIN "public"."profiles" "cp" ON (("cp"."id" = "cc"."profile_id")));
