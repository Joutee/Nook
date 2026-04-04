# Recurring Expenses — Design Spec

## Overview

Users can mark an expense as recurring when creating it. A database-level cron job (`pg_cron`) automatically generates new expense records at the configured interval. Users manage recurring templates from a dedicated screen accessible via the finance tab.

## Data Model

### New table: `recurring_expenses`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `flat_id` | uuid | FK -> flats, NOT NULL | |
| `created_by` | uuid | FK -> profiles, NOT NULL | Who created the template |
| `payer_id` | uuid | FK -> profiles, NOT NULL | Who pays |
| `title` | text | NOT NULL | Expense name |
| `amount` | numeric(10,2) | NOT NULL, > 0 | Total amount |
| `currency` | text | DEFAULT 'CZK' | |
| `interval` | text | NOT NULL, CHECK in ('daily','weekly','monthly','yearly') | Recurrence interval |
| `interval_day` | int | nullable | Day of week (1-7) for weekly, day of month (1-31) for monthly, day of month for yearly |
| `interval_month` | int | nullable | Month (1-12) for yearly only |
| `next_occurrence` | date | NOT NULL | When the next expense will be generated |
| `is_paused` | boolean | DEFAULT false | Paused templates are skipped by the cron job |
| `created_at` | timestamptz | DEFAULT now() | |

### New table: `recurring_expense_members`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `recurring_expense_id` | uuid | FK -> recurring_expenses ON DELETE CASCADE, NOT NULL | |
| `profile_id` | uuid | FK -> profiles, NOT NULL | Member included in split |

### Modified table: `expenses`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `recurring_expense_id` | uuid | FK -> recurring_expenses, nullable | Links generated expense back to its template |

## Cron Job: `generate_recurring_expenses()`

**Schedule:** Daily at 00:05 UTC via `pg_cron`.

**Logic:**

1. Select all rows from `recurring_expenses` where `is_paused = false` AND `next_occurrence <= CURRENT_DATE`
2. For each template, loop with `WHILE next_occurrence <= CURRENT_DATE` (catches up missed days):
   a. Load member list from `recurring_expense_members`
   b. Check `flat_profile.active` for each member
   c. If no active members, skip (do not generate)
   d. Calculate shares: total split among active members only. Inactive members' shares are redistributed equally among active members. Last member gets the remainder for cent precision.
   e. INSERT into `expenses` with `recurring_expense_id` reference, `happened_at = next_occurrence`
   f. INSERT into `expense_shares` for each active member
   g. Advance `next_occurrence`:
      - daily: +1 day
      - weekly: +7 days
      - monthly: +1 month (clamp to end of month, e.g. 31st in February -> 28th/29th)
      - yearly: +1 year

**Runs as:** `SECURITY DEFINER` (bypasses RLS, since pg_cron has no user session).

## RLS Policies

Same pattern as `expenses` — flat membership check via `flat_profile`:

| Table | Operation | Rule |
|-------|-----------|------|
| `recurring_expenses` | SELECT, INSERT, UPDATE, DELETE | User is member of `flat_id` (via `flat_profile`) |
| `recurring_expense_members` | SELECT, INSERT, UPDATE, DELETE | JOIN to `recurring_expenses.flat_id`, user is member |

Any member of the flat can view, create, edit, pause, and delete any recurring expense in that flat.

## TypeScript Types

In `types/finance.ts`:

```typescript
export interface RecurringExpense {
  id: string;
  flat_id: string;
  created_by: string;
  payer_id: string;
  title: string;
  amount: number;
  currency: string;
  interval: "daily" | "weekly" | "monthly" | "yearly";
  interval_day: number | null;
  interval_month: number | null;
  next_occurrence: string;
  is_paused: boolean;
  created_at: string;
}

export interface RecurringExpenseMember {
  id: string;
  recurring_expense_id: string;
  profile_id: string;
}

export interface RecurringExpenseWithDetails extends RecurringExpense {
  payer: {
    name: string;
    surname: string;
    avatar_url: string | null;
  };
}
```

## UI Changes

### ExpenseForm (create mode only)

- New toggle "Opakovat" (switch), default off
- When enabled, shows:
  - Interval picker: segmented control with daily / weekly / monthly / yearly
  - For weekly: day-of-week picker (Mon-Sun)
  - For monthly: day-of-month picker (1-31)
  - For yearly: day + month pickers
- On save:
  1. Create `recurring_expenses` record
  2. Create `recurring_expense_members` records for selected members
  3. Create the first `expenses` + `expense_shares` immediately (same logic as current save)
  4. Set `next_occurrence` to one interval ahead from today

### Finance tab (`app/(tabs)/finance.tsx`)

- In the header of the "Historie" card: add a link "Opakujici se" with a recurring icon that navigates to `app/expenses/recurring.tsx`

### New screen: `app/expenses/recurring.tsx`

- List of all recurring expenses for the current flat
- Each item shows: title, amount, human-readable interval (e.g. "Mesicne, 15. dne"), next occurrence date, status (active/paused)
- Active items have purple left border, paused items are dimmed with gray border
- Tap navigates to detail/edit screen

### New screen: `app/expenses/recurring/[id].tsx`

- Edit template: title, amount, payer, members, interval, interval_day/month
- Pause / Resume button
- Delete button with confirmation dialog
- When interval changes, `next_occurrence` is recalculated from today (not from last generated expense)
- Editing a template only affects future generated expenses. Already generated expenses remain unchanged.

## Supabase Queries (client-side)

No RPC needed. Standard builder pattern:

- **List:** `.from('recurring_expenses').select('*, payer:profiles!payer_id(name, surname, avatar_url)').eq('flat_id', flatId)`
- **Create:** Insert `recurring_expenses` + insert `recurring_expense_members` + create first expense (existing logic)
- **Update:** Update `recurring_expenses` + delete old members + insert new `recurring_expense_members`
- **Pause/Resume:** `.update({ is_paused: true/false })`
- **Delete:** `.delete()` (CASCADE removes `recurring_expense_members`)

## What Does NOT Change

- `view_flat_balances` — works automatically since it reads from `expenses` + `expense_shares`
- Existing expense edit screen — works as before, can edit individual generated expenses
- Settlement logic — unchanged
- `financeUtils.ts` — no changes needed
