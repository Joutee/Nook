# Interval Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify chore and recurring expense intervals into a shared `recurring_intervals` DB table, extend the `RecurringIntervalPicker` with a custom-days option, rewrite chore views, and update all interval display/form UI.

**Architecture:** New `recurring_intervals` table holds interval definitions (type + day/month/custom_days). Both `chores` and `recurring_expenses` reference it via FK. DB views are rewritten to compute cycles per interval type. A shared `formatInterval()` utility replaces all inline formatting. The existing `RecurringIntervalPicker` component gains a 5th "Vlastni" (custom) button.

**Tech Stack:** Supabase PostgreSQL (migrations), React Native + Expo Router, TypeScript, NativeWind

---

### Task 1: Add `custom` to `RecurringInterval` type and update `RecurringIntervalPicker`

**Files:**
- Modify: `types/finance.ts:44` — add `"custom"` to union
- Modify: `components/expenses/RecurringIntervalPicker.tsx` — add custom button + input
- Modify: `types/finance.ts:46-60` — update `RecurringExpense` interface

- [ ] **Step 1: Update the RecurringInterval type**

In `types/finance.ts`, change line 44:

```typescript
export type RecurringInterval = "daily" | "weekly" | "monthly" | "yearly" | "custom";
```

- [ ] **Step 2: Update RecurringIntervalPicker props and INTERVALS array**

In `components/expenses/RecurringIntervalPicker.tsx`, update the interface to add custom props:

```typescript
interface RecurringIntervalPickerProps {
  interval: RecurringInterval;
  onIntervalChange: (interval: RecurringInterval) => void;
  intervalDay: number;
  onIntervalDayChange: (day: number) => void;
  intervalMonth: number;
  onIntervalMonthChange: (month: number) => void;
  customDays: number;
  onCustomDaysChange: (days: number) => void;
}
```

Add `"custom"` to the INTERVALS array:

```typescript
const INTERVALS: { value: RecurringInterval; label: string }[] = [
  { value: "daily", label: "Denně" },
  { value: "weekly", label: "Týdně" },
  { value: "monthly", label: "Měsíčně" },
  { value: "yearly", label: "Ročně" },
  { value: "custom", label: "Vlastní" },
];
```

- [ ] **Step 3: Add custom days UI section to RecurringIntervalPicker**

Add the `customDays` and `onCustomDaysChange` to the destructured props. Then add a new section after the yearly block (before the closing `</CardContent>`):

```tsx
{/* Custom: number of days input */}
{interval === "custom" && (
  <View className="gap-2">
    <Label>Počet dní</Label>
    <View className="flex-row items-center gap-3">
      <Input
        className="w-20"
        keyboardType="number-pad"
        maxLength={3}
        value={String(customDays)}
        onChangeText={(text) => {
          const num = parseInt(text, 10);
          if (!isNaN(num) && num >= 1 && num <= 365) {
            onCustomDaysChange(num);
          } else if (text === "") {
            onCustomDaysChange(1);
          }
        }}
      />
      <Text className="text-muted-foreground text-sm flex-1">
        {customDays === 1 ? "den" : "dní"}
      </Text>
    </View>
  </View>
)}
```

- [ ] **Step 4: Update ExpenseForm to pass new customDays props**

In `components/expenses/ExpenseForm.tsx`, add state (after line 71, the `intervalMonth` state):

```typescript
const [customDays, setCustomDays] = useState(1);
```

Update the `<RecurringIntervalPicker>` usage (around line 575) to pass the new props:

```tsx
<RecurringIntervalPicker
  interval={recurringInterval}
  onIntervalChange={setRecurringInterval}
  intervalDay={intervalDay}
  onIntervalDayChange={setIntervalDay}
  intervalMonth={intervalMonth}
  onIntervalMonthChange={setIntervalMonth}
  customDays={customDays}
  onCustomDaysChange={setCustomDays}
/>
```

- [ ] **Step 5: Update recurring expense detail to pass new customDays props**

In `app/expenses/recurring/[id].tsx`, add state for customDays (after the `intervalMonth` state around line 35):

```typescript
const [customDays, setCustomDays] = useState(1);
```

This file currently has an inline interval picker (not using the component). We will refactor it later in Task 6. For now just add the state.

- [ ] **Step 6: Commit**

```bash
git add types/finance.ts components/expenses/RecurringIntervalPicker.tsx components/expenses/ExpenseForm.tsx app/expenses/recurring/[id].tsx
git commit -m "feat: add custom interval type to RecurringIntervalPicker"
```

---

### Task 2: Create shared `formatInterval` utility

**Files:**
- Create: `lib/intervalUtils.ts`
- Modify: `app/expenses/recurring.tsx` — replace inline `formatInterval`

- [ ] **Step 1: Create `lib/intervalUtils.ts`**

```typescript
import { RecurringInterval } from "@/types/finance";

const DAY_NAMES = ["", "Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = [
  "",
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

export function formatInterval(
  type: RecurringInterval,
  intervalDay?: number | null,
  intervalMonth?: number | null,
  customDays?: number | null,
): string {
  switch (type) {
    case "daily":
      return "Denně";
    case "weekly":
      return `Týdně, ${DAY_NAMES[intervalDay ?? 1]}`;
    case "monthly":
      return `Měsíčně, ${intervalDay ?? 1}. dne`;
    case "yearly":
      return `Ročně, ${intervalDay ?? 1}. ${MONTH_NAMES[intervalMonth ?? 1]}`;
    case "custom":
      if (!customDays || customDays === 1) return "Každý den";
      return `Každých ${customDays} dní`;
    default:
      return "";
  }
}

/**
 * Calculate the number of days for a given interval type.
 * Used for next-cycle-date calculations in client code.
 */
export function intervalToDays(
  type: RecurringInterval,
  customDays?: number | null,
): number {
  switch (type) {
    case "daily":
      return 1;
    case "weekly":
      return 7;
    case "monthly":
      return 30;
    case "yearly":
      return 365;
    case "custom":
      return customDays ?? 1;
    default:
      return 1;
  }
}
```

- [ ] **Step 2: Replace inline `formatInterval` in `app/expenses/recurring.tsx`**

Remove the local `DAY_NAMES`, `MONTH_NAMES`, and `formatInterval` function (lines 14-44). Replace with import:

```typescript
import { formatInterval } from "@/lib/intervalUtils";
```

Update the usage at line 109 from `formatInterval(item)` to:

```typescript
formatInterval(item.interval, item.interval_day, item.interval_month)
```

- [ ] **Step 3: Commit**

```bash
git add lib/intervalUtils.ts app/expenses/recurring.tsx
git commit -m "feat: create shared formatInterval utility"
```

---

### Task 3: Supabase migration — create `recurring_intervals` table and migrate data

**Files:**
- Create: `supabase/migrations/20260404150000_recurring_intervals.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260404150000_recurring_intervals.sql`:

```sql
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

-- RLS: allow authenticated users to read/write
ALTER TABLE "public"."recurring_intervals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on recurring_intervals"
    ON "public"."recurring_intervals"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE "public"."recurring_intervals" TO "anon";
GRANT ALL ON TABLE "public"."recurring_intervals" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_intervals" TO "service_role";

-- ============================================================
-- 2. Add FK columns
-- ============================================================
ALTER TABLE "public"."chores"
    ADD COLUMN "recurring_interval_id" uuid REFERENCES "public"."recurring_intervals"("id");

ALTER TABLE "public"."recurring_expenses"
    ADD COLUMN "recurring_interval_id" uuid REFERENCES "public"."recurring_intervals"("id");

-- ============================================================
-- 3. Migrate existing chores data
-- ============================================================
-- For each chore, create a recurring_interval and link it
INSERT INTO "public"."recurring_intervals" ("id", "type", "interval_day", "custom_days")
SELECT
    gen_random_uuid(),
    CASE
        WHEN c."interval_days" = 1 THEN 'daily'
        WHEN c."interval_days" = 7 THEN 'weekly'
        WHEN c."interval_days" = 30 THEN 'monthly'
        WHEN c."interval_days" = 365 THEN 'yearly'
        ELSE 'custom'
    END,
    CASE
        WHEN c."interval_days" = 7 THEN 1   -- default Monday
        WHEN c."interval_days" = 30 THEN 1  -- default 1st
        WHEN c."interval_days" = 365 THEN 1 -- default 1st
        ELSE NULL
    END,
    CASE
        WHEN c."interval_days" NOT IN (1, 7, 30, 365) THEN c."interval_days"
        ELSE NULL
    END
FROM "public"."chores" c;

-- This two-step approach avoids the need for a temp column:
-- We match by interval_days value since each chore maps to exactly one pattern
-- Use a CTE to create intervals with chore IDs for linking
WITH new_intervals AS (
    INSERT INTO "public"."recurring_intervals" ("id", "type", "interval_day", "interval_month", "custom_days")
    SELECT
        gen_random_uuid(),
        CASE
            WHEN c."interval_days" = 1 THEN 'daily'
            WHEN c."interval_days" = 7 THEN 'weekly'
            WHEN c."interval_days" = 30 THEN 'monthly'
            WHEN c."interval_days" = 365 THEN 'yearly'
            ELSE 'custom'
        END,
        CASE
            WHEN c."interval_days" = 7 THEN 1
            WHEN c."interval_days" = 30 THEN 1
            WHEN c."interval_days" = 365 THEN 1
            ELSE NULL
        END,
        CASE
            WHEN c."interval_days" = 365 THEN 1
            ELSE NULL
        END,
        CASE
            WHEN c."interval_days" NOT IN (1, 7, 30, 365) THEN c."interval_days"
            ELSE NULL
        END
    FROM "public"."chores" c
    WHERE c."recurring_interval_id" IS NULL
    RETURNING *
)
SELECT 1; -- CTE must be consumed

-- Actually, a DO block is cleaner for row-by-row migration:
DO $$
DECLARE
    r RECORD;
    new_id uuid;
BEGIN
    -- Migrate chores
    FOR r IN SELECT * FROM "public"."chores" WHERE "recurring_interval_id" IS NULL LOOP
        INSERT INTO "public"."recurring_intervals" ("type", "interval_day", "interval_month", "custom_days")
        VALUES (
            CASE
                WHEN r."interval_days" = 1 THEN 'daily'
                WHEN r."interval_days" = 7 THEN 'weekly'
                WHEN r."interval_days" = 30 THEN 'monthly'
                WHEN r."interval_days" = 365 THEN 'yearly'
                ELSE 'custom'
            END,
            CASE
                WHEN r."interval_days" = 7 THEN 1
                WHEN r."interval_days" = 30 THEN 1
                WHEN r."interval_days" = 365 THEN 1
                ELSE NULL
            END,
            CASE
                WHEN r."interval_days" = 365 THEN 1
                ELSE NULL
            END,
            CASE
                WHEN r."interval_days" NOT IN (1, 7, 30, 365) THEN r."interval_days"
                ELSE NULL
            END
        )
        RETURNING "id" INTO new_id;

        UPDATE "public"."chores" SET "recurring_interval_id" = new_id WHERE "id" = r."id";
    END LOOP;

    -- Migrate recurring_expenses
    FOR r IN SELECT * FROM "public"."recurring_expenses" WHERE "recurring_interval_id" IS NULL LOOP
        INSERT INTO "public"."recurring_intervals" ("type", "interval_day", "interval_month", "custom_days")
        VALUES (
            r."interval",
            r."interval_day",
            r."interval_month",
            NULL
        )
        RETURNING "id" INTO new_id;

        UPDATE "public"."recurring_expenses" SET "recurring_interval_id" = new_id WHERE "id" = r."id";
    END LOOP;
END;
$$;

-- ============================================================
-- 4. Drop old columns
-- ============================================================

-- Remove the first INSERT that was duplicated (clean up the broken CTE above)
-- The DO block handled everything.

-- Drop old columns from chores
ALTER TABLE "public"."chores" DROP COLUMN IF EXISTS "interval_days";

-- Drop old columns from recurring_expenses
ALTER TABLE "public"."recurring_expenses" DROP COLUMN IF EXISTS "interval";
ALTER TABLE "public"."recurring_expenses" DROP COLUMN IF EXISTS "interval_day";
ALTER TABLE "public"."recurring_expenses" DROP COLUMN IF EXISTS "interval_month";

-- Drop the old constraint
ALTER TABLE "public"."recurring_expenses" DROP CONSTRAINT IF EXISTS "recurring_expenses_interval_check";

-- Make FKs NOT NULL now that data is migrated
ALTER TABLE "public"."chores"
    ALTER COLUMN "recurring_interval_id" SET NOT NULL;

ALTER TABLE "public"."recurring_expenses"
    ALTER COLUMN "recurring_interval_id" SET NOT NULL;

-- ============================================================
-- 5. Recreate view_chore_dashboard with interval-type-aware cycle calculation
-- ============================================================
DROP VIEW IF EXISTS "public"."view_chore_dashboard";

CREATE OR REPLACE VIEW "public"."view_chore_dashboard" WITH ("security_invoker"='on') AS
WITH "chore_calculations" AS (
    SELECT
        "c"."id" AS "chore_id",
        "c"."flat_id",
        "c"."name",
        "c"."description",
        "c"."start_date",
        "c"."recurring_interval_id",
        "ri"."type" AS "interval_type",
        "ri"."interval_day",
        "ri"."interval_month",
        "ri"."custom_days",
        CASE
            WHEN "ri"."type" = 'daily' THEN
                FLOOR(EXTRACT(EPOCH FROM (now() - "c"."start_date")) / 86400)::integer
            WHEN "ri"."type" = 'weekly' THEN
                FLOOR(EXTRACT(EPOCH FROM (now() - "c"."start_date")) / (86400 * 7))::integer
            WHEN "ri"."type" = 'monthly' THEN
                ((EXTRACT(YEAR FROM now())::integer - EXTRACT(YEAR FROM "c"."start_date")::integer) * 12
                + EXTRACT(MONTH FROM now())::integer - EXTRACT(MONTH FROM "c"."start_date")::integer)
            WHEN "ri"."type" = 'yearly' THEN
                (EXTRACT(YEAR FROM now())::integer - EXTRACT(YEAR FROM "c"."start_date")::integer)
            WHEN "ri"."type" = 'custom' THEN
                FLOOR(EXTRACT(EPOCH FROM (now() - "c"."start_date")) / (86400 * "ri"."custom_days"))::integer
            ELSE 0
        END AS "current_cycle_index"
    FROM "public"."chores" "c"
    JOIN "public"."recurring_intervals" "ri" ON "ri"."id" = "c"."recurring_interval_id"
),
"assignments_aggregated" AS (
    SELECT
        "chore_profile"."chore_id",
        count(*) AS "total_assignees",
        array_agg("chore_profile"."profile_id" ORDER BY "chore_profile"."rotation_order") AS "assignee_ids"
    FROM "public"."chore_profile"
    GROUP BY "chore_profile"."chore_id"
),
"current_assignments" AS (
    SELECT
        "cc"."chore_id",
        "cc"."flat_id",
        "cc"."name",
        "cc"."description",
        "cc"."start_date",
        "cc"."recurring_interval_id",
        "cc"."interval_type",
        "cc"."interval_day",
        "cc"."interval_month",
        "cc"."custom_days",
        "cc"."current_cycle_index",
        CASE
            WHEN ("aa"."total_assignees" > 0) THEN
                CASE
                    WHEN ("cc"."current_cycle_index" < 0) THEN "aa"."assignee_ids"[1]
                    ELSE "aa"."assignee_ids"[(("cc"."current_cycle_index"::bigint % "aa"."total_assignees") + 1)]
                END
            ELSE NULL::uuid
        END AS "calculated_assignee_id"
    FROM "chore_calculations" "cc"
    LEFT JOIN "assignments_aggregated" "aa" ON "aa"."chore_id" = "cc"."chore_id"
)
SELECT
    "ca"."chore_id" AS "id",
    "ca"."flat_id",
    "ca"."name",
    "ca"."description",
    "ca"."start_date",
    "ca"."recurring_interval_id",
    "ca"."interval_type",
    "ca"."interval_day",
    "ca"."interval_month",
    "ca"."custom_days",
    "ca"."current_cycle_index",
    "ca"."calculated_assignee_id" AS "current_assignee_id",
    "p"."name" AS "assignee_name",
    "p"."surname" AS "assignee_surname",
    "p"."avatar_url" AS "assignee_avatar",
    "p"."id" AS "assignee_user_id",
    EXISTS (
        SELECT 1
        FROM "public"."chore_completions" "comp"
        WHERE "comp"."chore_id" = "ca"."chore_id"
          AND "comp"."cycle_index" = "ca"."current_cycle_index"
    ) AS "is_completed_current_cycle"
FROM "current_assignments" "ca"
LEFT JOIN "public"."profiles" "p" ON "p"."id" = "ca"."calculated_assignee_id";

ALTER VIEW "public"."view_chore_dashboard" OWNER TO "postgres";
GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."view_chore_dashboard" TO "service_role";

-- ============================================================
-- 6. Recreate view_chore_history with interval-type-aware cycle generation
-- ============================================================
DROP VIEW IF EXISTS "public"."view_chore_history";

CREATE OR REPLACE VIEW "public"."view_chore_history" WITH ("security_invoker"='on') AS
WITH RECURSIVE "cycle_series" AS (
    SELECT
        "c"."id" AS "chore_id",
        "c"."flat_id",
        0 AS "cycle_index",
        "c"."start_date",
        "c"."recurring_interval_id",
        "ri"."type" AS "interval_type",
        "ri"."custom_days"
    FROM "public"."chores" "c"
    JOIN "public"."recurring_intervals" "ri" ON "ri"."id" = "c"."recurring_interval_id"
    WHERE "c"."start_date" <= now()
    UNION ALL
    SELECT
        "cs"."chore_id",
        "cs"."flat_id",
        "cs"."cycle_index" + 1,
        "cs"."start_date",
        "cs"."recurring_interval_id",
        "cs"."interval_type",
        "cs"."custom_days"
    FROM "cycle_series" "cs"
    WHERE (
        CASE
            WHEN "cs"."interval_type" = 'daily' THEN
                "cs"."start_date" + (("cs"."cycle_index" + 1) * INTERVAL '1 day')
            WHEN "cs"."interval_type" = 'weekly' THEN
                "cs"."start_date" + (("cs"."cycle_index" + 1) * INTERVAL '7 days')
            WHEN "cs"."interval_type" = 'monthly' THEN
                "cs"."start_date" + (("cs"."cycle_index" + 1) * INTERVAL '1 month')
            WHEN "cs"."interval_type" = 'yearly' THEN
                "cs"."start_date" + (("cs"."cycle_index" + 1) * INTERVAL '1 year')
            WHEN "cs"."interval_type" = 'custom' THEN
                "cs"."start_date" + (("cs"."cycle_index" + 1) * "cs"."custom_days" * INTERVAL '1 day')
            ELSE
                now() + INTERVAL '1 day'  -- fallback: stop recursion
        END
    ) <= now()
),
"assignments_count" AS (
    SELECT
        "chore_profile"."chore_id",
        count(*) AS "total",
        array_agg("chore_profile"."profile_id" ORDER BY "chore_profile"."rotation_order") AS "profiles"
    FROM "public"."chore_profile"
    GROUP BY "chore_profile"."chore_id"
)
SELECT
    "cs"."chore_id"::text AS "chore_id",
    "cs"."flat_id"::text AS "flat_id",
    "cs"."cycle_index",
    (CASE
        WHEN "cs"."interval_type" = 'daily' THEN
            "cs"."start_date" + ("cs"."cycle_index" * INTERVAL '1 day')
        WHEN "cs"."interval_type" = 'weekly' THEN
            "cs"."start_date" + ("cs"."cycle_index" * INTERVAL '7 days')
        WHEN "cs"."interval_type" = 'monthly' THEN
            "cs"."start_date" + ("cs"."cycle_index" * INTERVAL '1 month')
        WHEN "cs"."interval_type" = 'yearly' THEN
            "cs"."start_date" + ("cs"."cycle_index" * INTERVAL '1 year')
        WHEN "cs"."interval_type" = 'custom' THEN
            "cs"."start_date" + ("cs"."cycle_index" * "cs"."custom_days" * INTERVAL '1 day')
        ELSE "cs"."start_date"
    END)::text AS "cycle_start_date",
    "ac"."profiles"[(("cs"."cycle_index"::bigint % "ac"."total") + 1)]::text AS "expected_profile_id",
    "ep"."name" AS "expected_profile_name",
    "ep"."surname" AS "expected_profile_surname",
    "ep"."avatar_url" AS "expected_profile_avatar",
    CASE WHEN "cc"."id" IS NOT NULL THEN true ELSE false END AS "is_done",
    "cc"."profile_id"::text AS "completed_by_profile_id",
    "cp"."name" AS "completed_by_name",
    "cp"."surname" AS "completed_by_surname",
    "cc"."completed_at"::text AS "completed_at"
FROM "cycle_series" "cs"
JOIN "assignments_count" "ac" ON "ac"."chore_id" = "cs"."chore_id"
LEFT JOIN "public"."chore_completions" "cc"
    ON "cc"."chore_id" = "cs"."chore_id" AND "cc"."cycle_index" = "cs"."cycle_index"
LEFT JOIN "public"."profiles" "ep"
    ON "ep"."id" = "ac"."profiles"[(("cs"."cycle_index"::bigint % "ac"."total") + 1)]
LEFT JOIN "public"."profiles" "cp"
    ON "cp"."id" = "cc"."profile_id";

ALTER VIEW "public"."view_chore_history" OWNER TO "postgres";
GRANT ALL ON TABLE "public"."view_chore_history" TO "anon";
GRANT ALL ON TABLE "public"."view_chore_history" TO "authenticated";
GRANT ALL ON TABLE "public"."view_chore_history" TO "service_role";
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260404150000_recurring_intervals.sql
git commit -m "feat: add recurring_intervals table and migrate chores + expenses data"
```

---

### Task 4: Update TypeScript types for new DB schema

**Files:**
- Modify: `types/chores.ts` — replace `interval_days` with interval fields
- Modify: `types/finance.ts:46-74` — replace inline interval columns with FK

- [ ] **Step 1: Update Chore type**

Replace `types/chores.ts` entirely:

```typescript
import { RecurringInterval } from "./finance";

export interface Chore {
  id: string;
  flat_id: string;
  name: string;
  description: string | null;
  recurring_interval_id: string;
  interval_type: RecurringInterval;
  interval_day: number | null;
  interval_month: number | null;
  custom_days: number | null;
  current_cycle_index: number;
  current_assignee_id: string | null;
  assignee_name: string | null;
  assignee_surname: string | null;
  assignee_avatar: string | null;
  assignee_user_id: string | null;
  is_completed_current_cycle: boolean;
  start_date: string | null;
}

export interface HistoryItem {
  chore_id: string;
  flat_id: string;
  cycle_index: number;
  cycle_start_date: string;
  expected_profile_id: string | null;
  expected_profile_name: string | null;
  expected_profile_surname: string | null;
  expected_profile_avatar: string | null;
  is_done: boolean;
  completed_by_profile_id: string | null;
  completed_by_name: string | null;
  completed_by_surname: string | null;
  completed_at: string | null;
}
```

- [ ] **Step 2: Update RecurringExpense type**

In `types/finance.ts`, replace the `RecurringExpense` interface (lines 46-60):

```typescript
export interface RecurringExpense {
  id: string;
  flat_id: string;
  created_by: string;
  payer_id: string;
  title: string;
  amount: number;
  currency: string;
  recurring_interval_id: string;
  next_occurrence: string;
  is_paused: boolean;
  created_at: string;
}
```

Update `RecurringExpenseWithDetails` to include interval fields from the join:

```typescript
export interface RecurringExpenseWithDetails extends RecurringExpense {
  payer: {
    name: string;
    surname: string;
    avatar_url: string | null;
  };
  recurring_interval: {
    type: RecurringInterval;
    interval_day: number | null;
    interval_month: number | null;
    custom_days: number | null;
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add types/chores.ts types/finance.ts
git commit -m "feat: update TypeScript types for recurring_intervals FK schema"
```

---

### Task 5: Update `ChoreForm` to use `RecurringIntervalPicker`

**Files:**
- Modify: `components/chores/ChoreForm.tsx`

- [ ] **Step 1: Replace interval state and imports**

In `components/chores/ChoreForm.tsx`, add imports:

```typescript
import { RecurringInterval } from "@/types/finance";
import { RecurringIntervalPicker } from "@/components/expenses/RecurringIntervalPicker";
```

Replace the `initialData` interface to use the new fields:

```typescript
interface ChoreFormProps {
  mode: "create" | "edit";
  choreId?: string;
  initialData?: {
    name: string;
    description: string;
    intervalType: RecurringInterval;
    intervalDay: number;
    intervalMonth: number;
    customDays: number;
    recurringIntervalId?: string;
    startDate: Date;
    selectedMembers: Member[];
  };
}
```

Replace the `intervalDays` state with:

```typescript
const [intervalType, setIntervalType] = useState<RecurringInterval>(
  initialData?.intervalType || "weekly",
);
const [intervalDay, setIntervalDay] = useState(initialData?.intervalDay || 1);
const [intervalMonth, setIntervalMonth] = useState(initialData?.intervalMonth || 1);
const [customDays, setCustomDays] = useState(initialData?.customDays || 7);
```

Update the `useEffect` for `initialData` to set the new fields instead of `intervalDays`.

- [ ] **Step 2: Replace the interval input in the JSX**

Replace the `<View className="gap-2">` block with `<Label>Interval (dnů) *</Label>` and the `<Input>` (around lines 280-289) with:

```tsx
<View className="gap-2">
  <Label>Interval *</Label>
  <RecurringIntervalPicker
    interval={intervalType}
    onIntervalChange={setIntervalType}
    intervalDay={intervalDay}
    onIntervalDayChange={setIntervalDay}
    intervalMonth={intervalMonth}
    onIntervalMonthChange={setIntervalMonth}
    customDays={customDays}
    onCustomDaysChange={setCustomDays}
  />
</View>
```

- [ ] **Step 3: Update form validation**

Replace the `intervalDays` validation block (lines 119-126) with:

```typescript
if (intervalType === "custom" && (!customDays || customDays < 1)) {
  showToast("Zadejte platný počet dní", "error");
  return false;
}
```

- [ ] **Step 4: Update handleCreate to create recurring_interval first**

Replace the `handleCreate` function body:

```typescript
const handleCreate = async () => {
  // 1. Create recurring_interval row
  const { data: intervalData, error: intervalError } = await supabase
    .from("recurring_intervals")
    .insert({
      type: intervalType,
      interval_day: intervalType === "weekly" || intervalType === "monthly" || intervalType === "yearly"
        ? intervalDay : null,
      interval_month: intervalType === "yearly" ? intervalMonth : null,
      custom_days: intervalType === "custom" ? customDays : null,
    })
    .select()
    .single();

  if (intervalError) {
    showToast("Nepodařilo se vytvořit interval: " + intervalError.message, "error");
    return;
  }

  // 2. Create chore with FK
  const { data: choreData, error: choreError } = await supabase
    .from("chores")
    .insert({
      flat_id: currentFlat!.id,
      name: name.trim(),
      description: description.trim() || null,
      recurring_interval_id: intervalData.id,
      start_date: startDate.toISOString().split("T")[0],
    })
    .select()
    .single();

  if (choreError) {
    showToast("Nepodařilo se vytvořit úkol: " + choreError.message, "error");
    return;
  }

  const assignments = selectedMembers.map((member, index) => ({
    chore_id: choreData.id,
    profile_id: member.id,
    rotation_order: index + 1,
  }));

  const { error: assignError } = await supabase
    .from("chore_profile")
    .insert(assignments);

  if (assignError) {
    showToast("Nepodařilo se přiřadit uživatele: " + assignError.message, "error");
  } else {
    showToast("Úkol vytvořen!", "success");
    router.back();
  }
};
```

- [ ] **Step 5: Update handleUpdate similarly**

Replace the update payload:

```typescript
const handleUpdate = async () => {
  if (!choreId) return;

  // Update the linked recurring_interval
  if (initialData?.recurringIntervalId) {
    const { error: intervalError } = await supabase
      .from("recurring_intervals")
      .update({
        type: intervalType,
        interval_day: intervalType === "weekly" || intervalType === "monthly" || intervalType === "yearly"
          ? intervalDay : null,
        interval_month: intervalType === "yearly" ? intervalMonth : null,
        custom_days: intervalType === "custom" ? customDays : null,
      })
      .eq("id", initialData.recurringIntervalId);

    if (intervalError) {
      showToast("Nepodařilo se aktualizovat interval: " + intervalError.message, "error");
      return;
    }
  }

  const { error: choreError } = await supabase
    .from("chores")
    .update({
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate.toISOString().split("T")[0],
    })
    .eq("id", choreId);

  if (choreError) {
    showToast("Nepodařilo se aktualizovat úkol: " + choreError.message, "error");
    return;
  }

  const { error: deleteError } = await supabase
    .from("chore_profile")
    .delete()
    .eq("chore_id", choreId);

  if (deleteError) {
    showToast("Nepodařilo se aktualizovat přiřazení: " + deleteError.message, "error");
    return;
  }

  const assignments = selectedMembers.map((member, index) => ({
    chore_id: choreId,
    profile_id: member.id,
    rotation_order: index + 1,
  }));

  const { error: assignError } = await supabase
    .from("chore_profile")
    .insert(assignments);

  if (assignError) {
    showToast("Nepodařilo se přiřadit uživatele: " + assignError.message, "error");
  } else {
    showToast("Úkol aktualizován!", "success");
    router.back();
  }
};
```

- [ ] **Step 6: Commit**

```bash
git add components/chores/ChoreForm.tsx
git commit -m "feat: replace interval days input with RecurringIntervalPicker in ChoreForm"
```

---

### Task 6: Update chore edit screen to pass new initialData

**Files:**
- Modify: `app/chores/[id]/edit.tsx`

- [ ] **Step 1: Read the current edit screen**

Read `app/chores/[id]/edit.tsx` to understand how initialData is loaded and passed to ChoreForm.

- [ ] **Step 2: Update the initialData construction**

When loading chore data for editing, the query now returns interval fields from the view (or needs a direct join). Update the query to fetch from `chores` table joining `recurring_intervals`:

```typescript
const { data, error } = await supabase
  .from("chores")
  .select("*, recurring_interval:recurring_intervals(*)")
  .eq("id", id)
  .single();
```

Update the initialData passed to ChoreForm:

```typescript
initialData={{
  name: choreData.name,
  description: choreData.description || "",
  intervalType: choreData.recurring_interval.type,
  intervalDay: choreData.recurring_interval.interval_day ?? 1,
  intervalMonth: choreData.recurring_interval.interval_month ?? 1,
  customDays: choreData.recurring_interval.custom_days ?? 7,
  recurringIntervalId: choreData.recurring_interval_id,
  startDate: new Date(choreData.start_date),
  selectedMembers: members,
}}
```

- [ ] **Step 3: Commit**

```bash
git add app/chores/[id]/edit.tsx
git commit -m "feat: update chore edit screen for new interval schema"
```

---

### Task 7: Update chore detail and list UI to display formatted intervals

**Files:**
- Modify: `app/chores/[id].tsx` — chore detail screen
- Modify: `app/(tabs)/chores.tsx` — chore list screen

- [ ] **Step 1: Update chore detail interval display**

In `app/chores/[id].tsx`, add import:

```typescript
import { formatInterval } from "@/lib/intervalUtils";
```

Replace the interval display text (around line 236-238):

```tsx
<Text className="text-sm text-foreground ml-7">
  {formatInterval(
    chore.interval_type,
    chore.interval_day,
    chore.interval_month,
    chore.custom_days,
  )}
</Text>
```

- [ ] **Step 2: Update chore list interval display**

In `app/(tabs)/chores.tsx`, add import:

```typescript
import { formatInterval } from "@/lib/intervalUtils";
```

Replace the interval text (around lines 203-204):

```tsx
<Text className="text-xs text-muted-foreground min-w-24 text-right">
  {formatInterval(
    item.interval_type,
    item.interval_day,
    item.interval_month,
    item.custom_days,
  )}
</Text>
```

- [ ] **Step 3: Update `calculateNextCycleDate` in chore list**

In `app/(tabs)/chores.tsx`, update `calculateNextCycleDate` (around line 128-139) to use `intervalToDays`:

```typescript
import { formatInterval, intervalToDays } from "@/lib/intervalUtils";
```

```typescript
const calculateNextCycleDate = (chore: Chore): Date | null => {
  if (!chore.start_date) return null;

  const startDate = new Date(chore.start_date);
  const days = intervalToDays(chore.interval_type, chore.custom_days);
  const nextCycleDate = new Date(startDate);
  nextCycleDate.setDate(
    startDate.getDate() + (chore.current_cycle_index + 1) * days,
  );

  return nextCycleDate;
};
```

- [ ] **Step 4: Commit**

```bash
git add app/chores/[id].tsx app/(tabs)/chores.tsx
git commit -m "feat: display formatted intervals on chore detail and list screens"
```

---

### Task 8: Update MyChoresWidget

**Files:**
- Modify: `components/dashboard_widgets/MyChoresWidget.tsx`

- [ ] **Step 1: Update the calculateNextCycleDate and getDaysUntilNextCycle**

Add import:

```typescript
import { intervalToDays } from "@/lib/intervalUtils";
```

Update `calculateNextCycleDate` (around line 194-205):

```typescript
const calculateNextCycleDate = (chore: Chore): Date | null => {
  if (!chore.start_date) return null;

  const startDate = new Date(chore.start_date);
  const days = intervalToDays(chore.interval_type, chore.custom_days);
  const nextCycleDate = new Date(startDate);
  nextCycleDate.setDate(
    startDate.getDate() + (chore.current_cycle_index + 1) * days,
  );

  return nextCycleDate;
};
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard_widgets/MyChoresWidget.tsx
git commit -m "feat: update MyChoresWidget for new interval schema"
```

---

### Task 9: Update recurring expenses screens to use FK-based reads/writes

**Files:**
- Modify: `app/expenses/recurring.tsx` — list screen
- Modify: `app/expenses/recurring/[id].tsx` — detail/edit screen
- Modify: `components/expenses/ExpenseForm.tsx` — create form
- Modify: `lib/recurringUtils.ts` — update calculateNextOccurrence

- [ ] **Step 1: Update recurring expenses list query**

In `app/expenses/recurring.tsx`, update the query (around line 70-77) to join `recurring_intervals`:

```typescript
const { data, error } = await supabase
  .from("recurring_expenses")
  .select(
    "*, payer:profiles!recurring_expenses_payer_id_fkey(name, surname, avatar_url), recurring_interval:recurring_intervals(*)",
  )
  .eq("flat_id", currentFlat.id)
  .order("is_paused", { ascending: true })
  .order("next_occurrence", { ascending: true });
```

Update the `formatInterval` call in `renderItem` (around line 109) to use the joined data:

```typescript
formatInterval(
  item.recurring_interval.type,
  item.recurring_interval.interval_day,
  item.recurring_interval.interval_month,
  item.recurring_interval.custom_days,
)
```

- [ ] **Step 2: Update recurring expense detail/edit screen**

In `app/expenses/recurring/[id].tsx`, this screen currently has inline interval picker UI (lines 339-487). Replace the inline interval picker with the shared component and update reads/writes to use the FK.

Update the state — replace `recurringInterval`, `intervalDay`, `intervalMonth` with:

```typescript
const [intervalType, setIntervalType] = useState<RecurringInterval>("monthly");
const [intervalDay, setIntervalDay] = useState(1);
const [intervalMonth, setIntervalMonth] = useState(1);
const [customDays, setCustomDays] = useState(1);
const [recurringIntervalId, setRecurringIntervalId] = useState<string>("");
```

Update `loadData` to read from the joined interval:

```typescript
const { data: expenseData, error: expenseError } = await supabase
  .from("recurring_expenses")
  .select(
    "*, payer:profiles!recurring_expenses_payer_id_fkey(id, name, surname, avatar_url), recurring_interval:recurring_intervals(*)",
  )
  .eq("id", id)
  .single();
```

Set state from joined data:

```typescript
setIntervalType(expenseData.recurring_interval.type as RecurringInterval);
setIntervalDay(expenseData.recurring_interval.interval_day ?? 1);
setIntervalMonth(expenseData.recurring_interval.interval_month ?? 1);
setCustomDays(expenseData.recurring_interval.custom_days ?? 1);
setRecurringIntervalId(expenseData.recurring_interval_id);
```

Replace the inline interval picker JSX (lines 339-487) with:

```tsx
<RecurringIntervalPicker
  interval={intervalType}
  onIntervalChange={setIntervalType}
  intervalDay={intervalDay}
  onIntervalDayChange={setIntervalDay}
  intervalMonth={intervalMonth}
  onIntervalMonthChange={setIntervalMonth}
  customDays={customDays}
  onCustomDaysChange={setCustomDays}
/>
```

Update `handleSave` to update the linked `recurring_intervals` row instead of inline columns:

```typescript
// Update interval
const { error: intervalError } = await supabase
  .from("recurring_intervals")
  .update({
    type: intervalType,
    interval_day: intervalType === "weekly" || intervalType === "monthly" || intervalType === "yearly"
      ? intervalDay : null,
    interval_month: intervalType === "yearly" ? intervalMonth : null,
    custom_days: intervalType === "custom" ? customDays : null,
  })
  .eq("id", recurringIntervalId);

if (intervalError) {
  showToast("Nepodařilo se aktualizovat interval", "error");
  return;
}

// Update expense (no more interval columns)
const { error: updateError } = await supabase
  .from("recurring_expenses")
  .update({
    title: trimmedTitle,
    amount: amountNum,
    payer_id: selectedPayer[0].id,
    is_paused: isPaused,
    next_occurrence: calculateNextOccurrence(intervalType, intervalDay, intervalMonth, customDays),
  })
  .eq("id", id);
```

Add import for the component:

```typescript
import { RecurringIntervalPicker } from "@/components/expenses/RecurringIntervalPicker";
```

- [ ] **Step 3: Update ExpenseForm create flow**

In `components/expenses/ExpenseForm.tsx`, update the recurring expense creation (around line 417-464).

Replace the insert block with:

```typescript
if (isRecurring) {
  // Create interval first
  const { data: intervalData, error: intervalError } = await supabase
    .from("recurring_intervals")
    .insert({
      type: recurringInterval,
      interval_day: recurringInterval === "weekly" || recurringInterval === "monthly" || recurringInterval === "yearly"
        ? intervalDay : null,
      interval_month: recurringInterval === "yearly" ? intervalMonth : null,
      custom_days: recurringInterval === "custom" ? customDays : null,
    })
    .select()
    .single();

  if (intervalError) {
    logger.error("Error creating interval:", intervalError);
    showToast("Výdaj byl uložen, ale nepodařilo se nastavit opakování", "error");
  } else {
    const { data: recurringData, error: recurringError } = await supabase
      .from("recurring_expenses")
      .insert({
        flat_id: currentFlat.id,
        created_by: (await supabase.auth.getUser()).data.user!.id,
        payer_id: selectedPayer[0].id,
        title: finalTitle,
        amount: finalAmount,
        recurring_interval_id: intervalData.id,
        next_occurrence: calculateNextOccurrence(
          recurringInterval,
          intervalDay,
          intervalMonth,
          customDays,
        ),
      })
      .select()
      .single();

    if (recurringError) {
      logger.error("Error creating recurring expense:", recurringError);
      showToast("Výdaj byl uložen, ale nepodařilo se nastavit opakování", "error");
    } else {
      await supabase
        .from("expenses")
        .update({ recurring_expense_id: recurringData.id })
        .eq("id", expenseData.id);

      const memberRows = selectedMembers.map((m) => ({
        recurring_expense_id: recurringData.id,
        profile_id: m.id,
      }));

      const { error: membersError } = await supabase
        .from("recurring_expense_members")
        .insert(memberRows);

      if (membersError) {
        logger.error("Error creating recurring members:", membersError);
      }
    }
  }
}
```

- [ ] **Step 4: Update `calculateNextOccurrence` to accept customDays**

In `lib/recurringUtils.ts`, update the function signature and add custom case:

```typescript
import { RecurringInterval } from "@/types/finance";

export function calculateNextOccurrence(
  recurringInterval: RecurringInterval,
  intervalDay: number,
  intervalMonth: number,
  customDays?: number,
): string {
  const today = new Date();
  let next: Date;

  switch (recurringInterval) {
    case "daily":
      next = new Date(today);
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next = new Date(today);
      const currentDay = next.getDay() || 7;
      const daysUntil =
        intervalDay > currentDay
          ? intervalDay - currentDay
          : 7 - (currentDay - intervalDay);
      next.setDate(next.getDate() + daysUntil);
      break;
    case "monthly":
      next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastDayOfMonth = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0,
      ).getDate();
      next.setDate(Math.min(intervalDay, lastDayOfMonth));
      break;
    case "yearly":
      next = new Date(today.getFullYear() + 1, intervalMonth - 1, 1);
      const lastDay = new Date(
        next.getFullYear(),
        intervalMonth,
        0,
      ).getDate();
      next.setDate(Math.min(intervalDay, lastDay));
      break;
    case "custom":
      next = new Date(today);
      next.setDate(next.getDate() + (customDays ?? 1));
      break;
  }

  return next.toISOString().split("T")[0];
}
```

- [ ] **Step 5: Commit**

```bash
git add app/expenses/recurring.tsx app/expenses/recurring/[id].tsx components/expenses/ExpenseForm.tsx lib/recurringUtils.ts
git commit -m "feat: update recurring expense screens to use recurring_intervals FK"
```

---

### Task 10: Move `RecurringIntervalPicker` to shared location

**Files:**
- Move: `components/expenses/RecurringIntervalPicker.tsx` → `components/shared/RecurringIntervalPicker.tsx`
- Modify: all files that import it (update import paths)

Since this component is now used by both chores and expenses, it belongs in `components/shared/`.

- [ ] **Step 1: Move the file**

```bash
mv components/expenses/RecurringIntervalPicker.tsx components/shared/RecurringIntervalPicker.tsx
```

- [ ] **Step 2: Update imports in all consuming files**

Files to update (change `@/components/expenses/RecurringIntervalPicker` to `@/components/shared/RecurringIntervalPicker`):
- `components/expenses/ExpenseForm.tsx`
- `components/chores/ChoreForm.tsx`
- `app/expenses/recurring/[id].tsx`

- [ ] **Step 3: Commit**

```bash
git add components/expenses/RecurringIntervalPicker.tsx components/shared/RecurringIntervalPicker.tsx components/expenses/ExpenseForm.tsx components/chores/ChoreForm.tsx app/expenses/recurring/[id].tsx
git commit -m "refactor: move RecurringIntervalPicker to shared components"
```

---

### Task 11: Apply migration to Supabase and verify

- [ ] **Step 1: Apply the migration to the remote Supabase project**

Use the Supabase MCP tool `execute_sql` to run the migration SQL from `supabase/migrations/20260404150000_recurring_intervals.sql` against the project.

- [ ] **Step 2: Verify table exists**

```sql
SELECT * FROM recurring_intervals LIMIT 5;
```

- [ ] **Step 3: Verify chore view still works**

```sql
SELECT * FROM view_chore_dashboard LIMIT 3;
```

- [ ] **Step 4: Verify history view still works**

```sql
SELECT * FROM view_chore_history LIMIT 3;
```

- [ ] **Step 5: Verify recurring_expenses data**

```sql
SELECT re.id, re.title, ri.type, ri.interval_day, ri.interval_month, ri.custom_days
FROM recurring_expenses re
JOIN recurring_intervals ri ON ri.id = re.recurring_interval_id
LIMIT 5;
```

---

### Task 12: End-to-end verification

- [ ] **Step 1: Run the app**

```bash
npm start
```

- [ ] **Step 2: Verify chore creation**

Create a new chore with each interval type (daily, weekly with specific day, monthly with specific day, yearly, custom). Verify each saves correctly and appears in the list with the right label.

- [ ] **Step 3: Verify chore editing**

Edit an existing chore, change its interval type. Verify the change persists.

- [ ] **Step 4: Verify chore detail**

Open a chore detail and confirm the interval displays correctly (e.g., "Tydenně, Po" instead of "Každých 7 dní").

- [ ] **Step 5: Verify recurring expense creation**

Create a new expense with "Opakovat" toggle on and custom interval. Verify it appears in recurring expenses list.

- [ ] **Step 6: Verify recurring expense editing**

Edit a recurring expense, change interval. Verify save works.

- [ ] **Step 7: Final commit**

```bash
git commit -m "feat: interval consolidation complete" --allow-empty
```
