-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage recurring intervals" ON "public"."recurring_intervals";

-- Create scoped policies
-- SELECT: user must be in the flat that owns the chore or expense
CREATE POLICY "Users can read own flat intervals"
    ON "public"."recurring_intervals"
    FOR SELECT TO "authenticated"
    USING (
        EXISTS (
            SELECT 1 FROM chores c
            JOIN flat_profile fp ON fp.flat_id = c.flat_id
            WHERE c.recurring_interval_id = recurring_intervals.id
              AND fp.profile_id = auth.uid()
              AND fp.active = true
        )
        OR EXISTS (
            SELECT 1 FROM recurring_expenses re
            JOIN flat_profile fp ON fp.flat_id = re.flat_id
            WHERE re.recurring_interval_id = recurring_intervals.id
              AND fp.profile_id = auth.uid()
              AND fp.active = true
        )
        -- Allow reading newly created intervals not yet linked
        OR NOT EXISTS (
            SELECT 1 FROM chores c WHERE c.recurring_interval_id = recurring_intervals.id
            UNION ALL
            SELECT 1 FROM recurring_expenses re WHERE re.recurring_interval_id = recurring_intervals.id
        )
    );

-- INSERT: any authenticated user can create intervals (they'll be linked to a chore/expense right after)
CREATE POLICY "Authenticated users can create intervals"
    ON "public"."recurring_intervals"
    FOR INSERT TO "authenticated"
    WITH CHECK (true);

-- UPDATE: same flat membership check as SELECT
CREATE POLICY "Users can update own flat intervals"
    ON "public"."recurring_intervals"
    FOR UPDATE TO "authenticated"
    USING (
        EXISTS (
            SELECT 1 FROM chores c
            JOIN flat_profile fp ON fp.flat_id = c.flat_id
            WHERE c.recurring_interval_id = recurring_intervals.id
              AND fp.profile_id = auth.uid()
              AND fp.active = true
        )
        OR EXISTS (
            SELECT 1 FROM recurring_expenses re
            JOIN flat_profile fp ON fp.flat_id = re.flat_id
            WHERE re.recurring_interval_id = recurring_intervals.id
              AND fp.profile_id = auth.uid()
              AND fp.active = true
        )
    );

-- DELETE: same flat membership check
CREATE POLICY "Users can delete own flat intervals"
    ON "public"."recurring_intervals"
    FOR DELETE TO "authenticated"
    USING (
        EXISTS (
            SELECT 1 FROM chores c
            JOIN flat_profile fp ON fp.flat_id = c.flat_id
            WHERE c.recurring_interval_id = recurring_intervals.id
              AND fp.profile_id = auth.uid()
              AND fp.active = true
        )
        OR EXISTS (
            SELECT 1 FROM recurring_expenses re
            JOIN flat_profile fp ON fp.flat_id = re.flat_id
            WHERE re.recurring_interval_id = recurring_intervals.id
              AND fp.profile_id = auth.uid()
              AND fp.active = true
        )
        -- Allow deleting unlinked (orphaned) intervals
        OR NOT EXISTS (
            SELECT 1 FROM chores c WHERE c.recurring_interval_id = recurring_intervals.id
            UNION ALL
            SELECT 1 FROM recurring_expenses re WHERE re.recurring_interval_id = recurring_intervals.id
        )
    );
