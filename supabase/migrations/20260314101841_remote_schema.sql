


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."defect_status" AS ENUM (
    'new',
    'in_progress',
    'resolved',
    'cancelled'
);


ALTER TYPE "public"."defect_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'najemce',
    'pronajimatel'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_assignee_for_chore_cycle"("p_chore_id" "uuid", "p_cycle_index" bigint) RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_assignee_id uuid;
  v_total_assignees int;
BEGIN
  -- 1. Count people in the rotation.
  SELECT count(*) INTO v_total_assignees
  FROM chore_profile
  WHERE chore_id = p_chore_id;

  IF v_total_assignees = 0 OR v_total_assignees IS NULL THEN RETURN NULL; END IF;

  -- 2. Find the assignee.
  IF p_cycle_index < 0 THEN
     SELECT profile_id INTO v_assignee_id
     FROM chore_profile
     WHERE chore_id = p_chore_id
     ORDER BY rotation_order
     LIMIT 1;
  ELSE
     -- Cast bigint to int for modulo and offset because PostgreSQL offsets require integer.
     SELECT profile_id INTO v_assignee_id
     FROM chore_profile
     WHERE chore_id = p_chore_id
     ORDER BY rotation_order
     OFFSET (p_cycle_index % v_total_assignees)::int LIMIT 1;
  END IF;

  RETURN v_assignee_id;
END;
$$;


ALTER FUNCTION "public"."get_assignee_for_chore_cycle"("p_chore_id" "uuid", "p_cycle_index" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin
  insert into public.profiles (id, name, surname, avatar_url)
  values (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'surname', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reassign_admin_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If the deleted member was an admin.
  IF OLD.is_admin = true THEN
    -- Promote the oldest remaining member to admin.
    UPDATE flat_profile
    SET is_admin = true
    WHERE flat_id = OLD.flat_id
    AND id = (
      SELECT id 
      FROM flat_profile 
      WHERE flat_id = OLD.flat_id
      ORDER BY joined_at ASC
      LIMIT 1
    );
  END IF;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."reassign_admin_on_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_first_user_as_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  -- Landlords are always admins.
  IF NEW.role = 'pronajimatel' THEN
    NEW.is_admin = true;
  ELSE
    -- Check whether this is the oldest member in the flat by joined_at.
    IF NEW.joined_at = (
      SELECT MIN(joined_at) 
      FROM flat_profile 
      WHERE flat_id = NEW.flat_id
    ) THEN
      NEW.is_admin = true;
    ELSE
      NEW.is_admin = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."set_first_user_as_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chore_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "chore_id" "uuid" DEFAULT "gen_random_uuid"(),
    "profile_id" "uuid" DEFAULT "gen_random_uuid"(),
    "cycle_index" bigint,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."chore_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chore_profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_id" "uuid" DEFAULT "gen_random_uuid"(),
    "chore_id" "uuid" DEFAULT "gen_random_uuid"(),
    "rotation_order" bigint
);


ALTER TABLE "public"."chore_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "flat_id" "uuid" DEFAULT "gen_random_uuid"(),
    "name" "text",
    "description" "text",
    "start_date" timestamp with time zone,
    "interval_days" bigint
);


ALTER TABLE "public"."chores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "flat_id" "uuid" DEFAULT "gen_random_uuid"(),
    "document_path" "text",
    "name" "text",
    "description" "text"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "owed_amount" numeric(10,2) NOT NULL,
    CONSTRAINT "expense_shares_owed_amount_check" CHECK (("owed_amount" >= (0)::numeric))
);


ALTER TABLE "public"."expense_shares" OWNER TO "postgres";


COMMENT ON TABLE "public"."expense_shares" IS 'Rozdělení výdaje mezi jednotlivé členy bytu';



CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "happened_at" timestamp with time zone DEFAULT "now"(),
    "flat_id" "uuid" NOT NULL,
    "payer_id" "uuid",
    "title" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'CZK'::"text",
    "is_settlement" boolean DEFAULT false,
    CONSTRAINT "expenses_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


COMMENT ON TABLE "public"."expenses" IS 'Hlavní záznam o výdaji nebo vyrovnání dluhu';



CREATE TABLE IF NOT EXISTS "public"."flat_profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "flat_id" "uuid",
    "profile_id" "uuid",
    "is_admin" boolean,
    "role" "public"."user_role",
    "active" boolean,
    "dashboard_layout" "jsonb"
);


ALTER TABLE "public"."flat_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" "text",
    "address" character varying,
    "name" "text"
);


ALTER TABLE "public"."flats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "flat_id" "uuid" NOT NULL,
    "profile_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "image_path" "text",
    "status" "public"."defect_status" DEFAULT 'new'::"public"."defect_status"
);


ALTER TABLE "public"."issues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flat_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "assigned_to" "uuid"
);


ALTER TABLE "public"."keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "name" "text",
    "avatar_url" "text",
    "surname" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_chore_dashboard" WITH ("security_invoker"='on') AS
 WITH "chore_calculations" AS (
         SELECT "c"."id" AS "chore_id",
            "c"."flat_id",
            "c"."name",
            "c"."description",
            "c"."interval_days",
            "c"."start_date",
            ("floor"((EXTRACT(epoch FROM ("now"() - "c"."start_date")) / ((86400 * "c"."interval_days"))::numeric)))::integer AS "current_cycle_index"
           FROM "public"."chores" "c"
        ), "assignments_aggregated" AS (
         SELECT "chore_profile"."chore_id",
            "count"(*) AS "total_assignees",
            "array_agg"("chore_profile"."profile_id" ORDER BY "chore_profile"."rotation_order") AS "assignee_ids"
           FROM "public"."chore_profile"
          GROUP BY "chore_profile"."chore_id"
        ), "current_assignments" AS (
         SELECT "cc"."chore_id",
            "cc"."flat_id",
            "cc"."name",
            "cc"."description",
            "cc"."interval_days",
            "cc"."start_date",
            "cc"."current_cycle_index",
                CASE
                    WHEN ("aa"."total_assignees" > 0) THEN
                    CASE
                        WHEN ("cc"."current_cycle_index" < 0) THEN "aa"."assignee_ids"[1]
                        ELSE "aa"."assignee_ids"[((("cc"."current_cycle_index")::bigint % "aa"."total_assignees") + 1)]
                    END
                    ELSE NULL::"uuid"
                END AS "calculated_assignee_id"
           FROM ("chore_calculations" "cc"
             LEFT JOIN "assignments_aggregated" "aa" ON (("aa"."chore_id" = "cc"."chore_id")))
        )
 SELECT "ca"."chore_id" AS "id",
    "ca"."flat_id",
    "ca"."name",
    "ca"."description",
    "ca"."interval_days",
    "ca"."start_date",
    "ca"."current_cycle_index",
    "ca"."calculated_assignee_id" AS "current_assignee_id",
    "p"."name" AS "assignee_name",
    "p"."surname" AS "assignee_surname",
    "p"."avatar_url" AS "assignee_avatar",
    "p"."id" AS "assignee_user_id",
    (EXISTS ( SELECT 1
           FROM "public"."chore_completions" "comp"
          WHERE (("comp"."chore_id" = "ca"."chore_id") AND ("comp"."cycle_index" = "ca"."current_cycle_index")))) AS "is_completed_current_cycle"
   FROM ("current_assignments" "ca"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "ca"."calculated_assignee_id")));


ALTER VIEW "public"."view_chore_dashboard" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_chore_history" WITH ("security_invoker"='on') AS
 WITH RECURSIVE "cycle_series" AS (
         SELECT "chores"."id" AS "chore_id",
            "chores"."flat_id",
            0 AS "cycle_index",
            "chores"."start_date",
            "chores"."interval_days"
           FROM "public"."chores"
          WHERE ("chores"."interval_days" > 0)
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


ALTER VIEW "public"."view_chore_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_flat_balances" WITH ("security_invoker"='on') AS
 WITH "paid_per_flat" AS (
         SELECT "expenses"."payer_id",
            "expenses"."flat_id",
            "sum"("expenses"."amount") AS "total_paid"
           FROM "public"."expenses"
          GROUP BY "expenses"."payer_id", "expenses"."flat_id"
        ), "owed_per_flat" AS (
         SELECT "es"."profile_id",
            "e"."flat_id",
            "sum"("es"."owed_amount") AS "total_owed"
           FROM ("public"."expense_shares" "es"
             JOIN "public"."expenses" "e" ON (("es"."expense_id" = "e"."id")))
          GROUP BY "es"."profile_id", "e"."flat_id"
        )
 SELECT "fp"."flat_id",
    "fp"."profile_id",
    "p"."name",
    "p"."surname",
    "p"."avatar_url",
    COALESCE("ppf"."total_paid", (0)::numeric) AS "total_paid",
    COALESCE("opf"."total_owed", (0)::numeric) AS "total_share",
    (COALESCE("ppf"."total_paid", (0)::numeric) - COALESCE("opf"."total_owed", (0)::numeric)) AS "net_balance"
   FROM ((("public"."flat_profile" "fp"
     JOIN "public"."profiles" "p" ON (("fp"."profile_id" = "p"."id")))
     LEFT JOIN "paid_per_flat" "ppf" ON ((("ppf"."payer_id" = "fp"."profile_id") AND ("ppf"."flat_id" = "fp"."flat_id"))))
     LEFT JOIN "owed_per_flat" "opf" ON ((("opf"."profile_id" = "fp"."profile_id") AND ("opf"."flat_id" = "fp"."flat_id"))));


ALTER VIEW "public"."view_flat_balances" OWNER TO "postgres";


ALTER TABLE ONLY "public"."flat_profile"
    ADD CONSTRAINT "Flat_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chore_completions"
    ADD CONSTRAINT "chore_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chore_profile"
    ADD CONSTRAINT "chore_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "defects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_shares"
    ADD CONSTRAINT "expense_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flats"
    ADD CONSTRAINT "flats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."keys"
    ADD CONSTRAINT "keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



CREATE INDEX "idx_expense_shares_expense_id" ON "public"."expense_shares" USING "btree" ("expense_id");



CREATE INDEX "idx_expense_shares_profile_id" ON "public"."expense_shares" USING "btree" ("profile_id");



CREATE INDEX "idx_expenses_flat_id" ON "public"."expenses" USING "btree" ("flat_id");



CREATE INDEX "idx_expenses_happened_at" ON "public"."expenses" USING "btree" ("happened_at" DESC);



CREATE INDEX "idx_expenses_payer_id" ON "public"."expenses" USING "btree" ("payer_id");



CREATE OR REPLACE TRIGGER "auto_reassign_admin" AFTER DELETE ON "public"."flat_profile" FOR EACH ROW EXECUTE FUNCTION "public"."reassign_admin_on_delete"();



CREATE OR REPLACE TRIGGER "auto_set_admin" BEFORE INSERT ON "public"."flat_profile" FOR EACH ROW EXECUTE FUNCTION "public"."set_first_user_as_admin"();



CREATE OR REPLACE TRIGGER "auto_set_admin_on_update" BEFORE UPDATE ON "public"."flat_profile" FOR EACH ROW WHEN (("old"."role" IS DISTINCT FROM "new"."role")) EXECUTE FUNCTION "public"."set_first_user_as_admin"();



ALTER TABLE ONLY "public"."chore_completions"
    ADD CONSTRAINT "chore_completions_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_completions"
    ADD CONSTRAINT "chore_completions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_profile"
    ADD CONSTRAINT "chore_profile_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_profile"
    ADD CONSTRAINT "chore_profile_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_flat_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "defects_flat_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "defects_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_flat_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_shares"
    ADD CONSTRAINT "expense_shares_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_shares"
    ADD CONSTRAINT "expense_shares_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_flat_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flat_profile"
    ADD CONSTRAINT "flat_profile_flat_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flat_profile"
    ADD CONSTRAINT "flat_profile_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."keys"
    ADD CONSTRAINT "keys_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."keys"
    ADD CONSTRAINT "keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."keys"
    ADD CONSTRAINT "keys_flat_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete their flats" ON "public"."flats" FOR DELETE TO "authenticated" USING (("id" IN ( SELECT "flat_profile"."flat_id"
   FROM "public"."flat_profile"
  WHERE (("flat_profile"."profile_id" = "auth"."uid"()) AND ("flat_profile"."is_admin" = true)))));



CREATE POLICY "Admins can update their flats" ON "public"."flats" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "flat_profile"."flat_id"
   FROM "public"."flat_profile"
  WHERE (("flat_profile"."profile_id" = "auth"."uid"()) AND ("flat_profile"."is_admin" = true)))));



CREATE POLICY "Authenticated users can insert flats" ON "public"."flats" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Clenove bytu muzou mazat vydaje" ON "public"."expenses" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "expenses"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Clenove bytu muzou pridavat vydaje" ON "public"."expenses" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "expenses"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Clenove bytu muzou upravovat vydaje" ON "public"."expenses" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "expenses"."flat_id") AND ("fp"."profile_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "expenses"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Clenove bytu vidi vydaje" ON "public"."expenses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "expenses"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Mazani podilu dle vydaje" ON "public"."expense_shares" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."expenses" "e"
     JOIN "public"."flat_profile" "fp" ON (("fp"."flat_id" = "e"."flat_id")))
  WHERE (("e"."id" = "expense_shares"."expense_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Only the assignee can complete the chore" ON "public"."chore_completions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "public"."get_assignee_for_chore_cycle"("chore_id", "cycle_index")));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Uprava podilu dle vydaje" ON "public"."expense_shares" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."expenses" "e"
     JOIN "public"."flat_profile" "fp" ON (("fp"."flat_id" = "e"."flat_id")))
  WHERE (("e"."id" = "expense_shares"."expense_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can create issues in their flat" ON "public"."issues" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "issues"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete chores in their flat" ON "public"."chores" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "chores"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete documents in their flat" ON "public"."documents" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "documents"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete issues in their flat" ON "public"."issues" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "issues"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert documents metadata" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "documents"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can join flats" ON "public"."flat_profile" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "Users can remove assignees in their flat" ON "public"."chore_profile" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."chores" "c"
     JOIN "public"."flat_profile" "fp" ON (("fp"."flat_id" = "c"."flat_id")))
  WHERE (("c"."id" = "chore_profile"."chore_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can update chore assignments in their flat" ON "public"."chore_profile" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."chores" "c"
     JOIN "public"."flat_profile" "fp" ON (("fp"."flat_id" = "c"."flat_id")))
  WHERE (("c"."id" = "chore_profile"."chore_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can update chores in their flat" ON "public"."chores" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "chores"."flat_id") AND ("fp"."profile_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "fp"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can update issues in their flat" ON "public"."issues" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "issues"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update their membership" ON "public"."flat_profile" FOR UPDATE TO "authenticated" USING ((("profile_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "flat_profile"."flat_id") AND ("fp"."profile_id" = "auth"."uid"()) AND ("fp"."is_admin" = true))))));



CREATE POLICY "Users can view assignees in their flat" ON "public"."chore_profile" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."chores" "c"
     JOIN "public"."flat_profile" "fp" ON (("fp"."flat_id" = "c"."flat_id")))
  WHERE (("c"."id" = "chore_profile"."chore_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can view chores in their flat" ON "public"."chores" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "chores"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can view completions in their flat" ON "public"."chore_completions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."chores" "c"
     JOIN "public"."flat_profile" "fp" ON (("fp"."flat_id" = "c"."flat_id")))
  WHERE (("c"."id" = "chore_completions"."chore_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can view documents in their flat" ON "public"."documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "documents"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can view flat members" ON "public"."flat_profile" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view issues in their flat" ON "public"."issues" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."flat_profile" "fp"
  WHERE (("fp"."flat_id" = "issues"."flat_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can view profiles of flatmates" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."flat_profile" "fp1"
     JOIN "public"."flat_profile" "fp2" ON (("fp1"."flat_id" = "fp2"."flat_id")))
  WHERE (("fp1"."profile_id" = "auth"."uid"()) AND ("fp2"."profile_id" = "profiles"."id")))));



CREATE POLICY "Users can view their flats" ON "public"."flats" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Viditelnost podilu dle vydaje" ON "public"."expense_shares" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."expenses" "e"
     JOIN "public"."flat_profile" "fp" ON (("fp"."flat_id" = "e"."flat_id")))
  WHERE (("e"."id" = "expense_shares"."expense_id") AND ("fp"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Vkladani podilu dle vydaje" ON "public"."expense_shares" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."expenses" "e"
     JOIN "public"."flat_profile" "fp" ON (("fp"."flat_id" = "e"."flat_id")))
  WHERE (("e"."id" = "expense_shares"."expense_id") AND ("fp"."profile_id" = "auth"."uid"())))));



ALTER TABLE "public"."chore_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chore_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "flat members can view keys" ON "public"."keys" FOR SELECT USING (("flat_id" IN ( SELECT "flat_profile"."flat_id"
   FROM "public"."flat_profile"
  WHERE (("flat_profile"."profile_id" = "auth"."uid"()) AND ("flat_profile"."active" = true)))));



ALTER TABLE "public"."flat_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."issues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "landlords can delete keys" ON "public"."keys" FOR DELETE USING (("flat_id" IN ( SELECT "flat_profile"."flat_id"
   FROM "public"."flat_profile"
  WHERE (("flat_profile"."profile_id" = "auth"."uid"()) AND ("flat_profile"."role" = 'pronajimatel'::"public"."user_role") AND ("flat_profile"."active" = true)))));



CREATE POLICY "landlords can insert keys" ON "public"."keys" FOR INSERT WITH CHECK (("flat_id" IN ( SELECT "flat_profile"."flat_id"
   FROM "public"."flat_profile"
  WHERE (("flat_profile"."profile_id" = "auth"."uid"()) AND ("flat_profile"."role" = 'pronajimatel'::"public"."user_role") AND ("flat_profile"."active" = true)))));



CREATE POLICY "landlords can update keys" ON "public"."keys" FOR UPDATE USING (("flat_id" IN ( SELECT "flat_profile"."flat_id"
   FROM "public"."flat_profile"
  WHERE (("flat_profile"."profile_id" = "auth"."uid"()) AND ("flat_profile"."role" = 'pronajimatel'::"public"."user_role") AND ("flat_profile"."active" = true)))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Členové bytu mohou vytvářet úkoly" ON "public"."chores" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."flat_profile"
  WHERE (("flat_profile"."flat_id" = "chores"."flat_id") AND ("flat_profile"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Členové mohou přiřazovat uživatele k úkolům" ON "public"."chore_profile" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."chores"
     JOIN "public"."flat_profile" ON (("chores"."flat_id" = "flat_profile"."flat_id")))
  WHERE (("chores"."id" = "chore_profile"."chore_id") AND ("flat_profile"."profile_id" = "auth"."uid"())))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chore_completions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chores";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."documents";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."expenses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."issues";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."keys";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_assignee_for_chore_cycle"("p_chore_id" "uuid", "p_cycle_index" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_assignee_for_chore_cycle"("p_chore_id" "uuid", "p_cycle_index" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_assignee_for_chore_cycle"("p_chore_id" "uuid", "p_cycle_index" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reassign_admin_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."reassign_admin_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reassign_admin_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_first_user_as_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_first_user_as_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_first_user_as_admin"() TO "service_role";


















GRANT ALL ON TABLE "public"."chore_completions" TO "anon";
GRANT ALL ON TABLE "public"."chore_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."chore_completions" TO "service_role";



GRANT ALL ON TABLE "public"."chore_profile" TO "anon";
GRANT ALL ON TABLE "public"."chore_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."chore_profile" TO "service_role";



GRANT ALL ON TABLE "public"."chores" TO "anon";
GRANT ALL ON TABLE "public"."chores" TO "authenticated";
GRANT ALL ON TABLE "public"."chores" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."expense_shares" TO "anon";
GRANT ALL ON TABLE "public"."expense_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_shares" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."flat_profile" TO "anon";
GRANT ALL ON TABLE "public"."flat_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."flat_profile" TO "service_role";



GRANT ALL ON TABLE "public"."flats" TO "anon";
GRANT ALL ON TABLE "public"."flats" TO "authenticated";
GRANT ALL ON TABLE "public"."flats" TO "service_role";



GRANT ALL ON TABLE "public"."issues" TO "anon";
GRANT ALL ON TABLE "public"."issues" TO "authenticated";
GRANT ALL ON TABLE "public"."issues" TO "service_role";



GRANT ALL ON TABLE "public"."keys" TO "anon";
GRANT ALL ON TABLE "public"."keys" TO "authenticated";
GRANT ALL ON TABLE "public"."keys" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."view_chore_history" TO "anon";
GRANT ALL ON TABLE "public"."view_chore_history" TO "authenticated";
GRANT ALL ON TABLE "public"."view_chore_history" TO "service_role";



GRANT ALL ON TABLE "public"."view_flat_balances" TO "anon";
GRANT ALL ON TABLE "public"."view_flat_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."view_flat_balances" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Anyone can upload an avatar."
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'avatars'::text));



  create policy "Authenticated users can upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'documents'::text));



  create policy "Authenticated users can view"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'documents'::text));



  create policy "Avatar images are publicly accessible."
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Users can delete images in their flat"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'issue-images'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT flat_profile.flat_id
   FROM public.flat_profile
  WHERE (flat_profile.profile_id = auth.uid())))));



  create policy "Users can upload images to their flat"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'issue-images'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT flat_profile.flat_id
   FROM public.flat_profile
  WHERE (flat_profile.profile_id = auth.uid())))));



  create policy "Users can view images from their flat"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'issue-images'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT flat_profile.flat_id
   FROM public.flat_profile
  WHERE (flat_profile.profile_id = auth.uid())))));


