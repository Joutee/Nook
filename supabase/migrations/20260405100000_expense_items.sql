-- ============================================================
-- Expense Items (receipt line items)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."expense_items" (
    "id"         uuid           DEFAULT gen_random_uuid() NOT NULL,
    "expense_id" uuid           NOT NULL,
    "name"       text           NOT NULL,
    "price"      numeric(10,2)  NOT NULL,
    "position"   integer        NOT NULL,
    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."expense_items" OWNER TO "postgres";

ALTER TABLE ONLY "public"."expense_items"
    ADD CONSTRAINT "expense_items_expense_id_fkey"
        FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_expense_items_expense_id"
    ON "public"."expense_items" USING btree ("expense_id");

-- ============================================================
-- Expense Item Members (who owns each item)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."expense_item_members" (
    "id"         uuid  DEFAULT gen_random_uuid() NOT NULL,
    "item_id"    uuid  NOT NULL,
    "profile_id" uuid  NOT NULL,
    CONSTRAINT "expense_item_members_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."expense_item_members" OWNER TO "postgres";

ALTER TABLE ONLY "public"."expense_item_members"
    ADD CONSTRAINT "expense_item_members_item_id_fkey"
        FOREIGN KEY ("item_id") REFERENCES "public"."expense_items"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."expense_item_members"
    ADD CONSTRAINT "expense_item_members_profile_id_fkey"
        FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_expense_item_members_item_id"
    ON "public"."expense_item_members" USING btree ("item_id");

-- ============================================================
-- RLS policies — expense_items
-- ============================================================

ALTER TABLE "public"."expense_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expense items in their flat"
    ON "public"."expense_items"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can create expense items in their flat"
    ON "public"."expense_items"
    FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can update expense items in their flat"
    ON "public"."expense_items"
    FOR UPDATE TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can delete expense items in their flat"
    ON "public"."expense_items"
    FOR DELETE TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

-- ============================================================
-- RLS policies — expense_item_members
-- ============================================================

ALTER TABLE "public"."expense_item_members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expense item members in their flat"
    ON "public"."expense_item_members"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expense_items" ei
        JOIN "public"."expenses" e ON e.id = ei.expense_id
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE ei.id = "expense_item_members"."item_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can create expense item members in their flat"
    ON "public"."expense_item_members"
    FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1
        FROM "public"."expense_items" ei
        JOIN "public"."expenses" e ON e.id = ei.expense_id
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE ei.id = "expense_item_members"."item_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can delete expense item members in their flat"
    ON "public"."expense_item_members"
    FOR DELETE TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expense_items" ei
        JOIN "public"."expenses" e ON e.id = ei.expense_id
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE ei.id = "expense_item_members"."item_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));
