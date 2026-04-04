# Interval Consolidation Design

## Context

Chores currently use a simple `interval_days bigint` column — users type a raw number of days. Recurring expenses already have a richer interval model (`interval`, `interval_day`, `interval_month`) with a dedicated `RecurringIntervalPicker` component. The goal is to:

1. Create a shared `recurring_intervals` DB table so both chores and expenses reference a single interval definition
2. Extend `RecurringIntervalPicker` with a 5th "custom" option (arbitrary number of days)
3. Migrate both chores and recurring_expenses to use the new shared table
4. Rewrite the chore DB views to support all interval types
5. Update all UI that displays intervals to use a shared formatter

## Database

### New table: `recurring_intervals`

```sql
CREATE TABLE recurring_intervals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('daily','weekly','monthly','yearly','custom')),
  interval_day int,       -- day of week (1=Mon..7=Sun) for weekly; day of month (1-31) for monthly/yearly
  interval_month int,     -- month (1-12) for yearly only
  custom_days int         -- number of days for 'custom' type only
);
```

Constraints:
- `weekly`: `interval_day` required (1-7), others null
- `monthly`: `interval_day` required (1-31), others null
- `yearly`: `interval_day` (1-31) and `interval_month` (1-12) required, `custom_days` null
- `daily`: all nullable fields null
- `custom`: `custom_days` required (>0), others null

### Schema changes

- `chores`: add `recurring_interval_id uuid REFERENCES recurring_intervals(id)`, eventually drop `interval_days`
- `recurring_expenses`: add `recurring_interval_id uuid REFERENCES recurring_intervals(id)`, eventually drop `interval`, `interval_day`, `interval_month`

### Migration strategy

Single migration that:
1. Creates `recurring_intervals` table
2. For each existing chore: creates a recurring_interval row (map 1→daily, 7→weekly with interval_day=1 default, 30→monthly with interval_day=1, else→custom) and sets the FK
3. For each existing recurring_expense: creates a recurring_interval row from existing inline columns and sets the FK
4. Drops old columns from both tables
5. Recreates `view_chore_dashboard` and `view_chore_history` to JOIN on `recurring_intervals`

## Views

### `view_chore_dashboard`

The `current_cycle_index` calculation changes per interval type:
- **daily**: `floor(epoch_diff / 86400)`
- **weekly**: `floor(epoch_diff / (86400 * 7))`
- **monthly**: date difference in months using `EXTRACT(YEAR/MONTH)`
- **yearly**: date difference in years
- **custom**: `floor(epoch_diff / (86400 * custom_days))` (same as current logic)

### `view_chore_history`

The recursive CTE cycle generation changes:
- **daily/weekly/custom**: advance by 1/7/N days
- **monthly**: advance by 1 month (using `+ interval '1 month'`)
- **yearly**: advance by 1 year

## Component: `RecurringIntervalPicker`

### Changes
- Add 5th button: "Vlastní" (custom)
- When custom is selected, show an `<Input>` for number of days
- Update `RecurringInterval` type: add `'custom'` to the union
- New props: `customDays: number`, `onCustomDaysChange: (days: number) => void`

### Type change

In `types/finance.ts`:
```typescript
export type RecurringInterval = "daily" | "weekly" | "monthly" | "yearly" | "custom";
```

## UI Display

### Shared `formatInterval` utility

Move to `lib/intervalUtils.ts`:
```typescript
function formatInterval(type: RecurringInterval, intervalDay?: number, intervalMonth?: number, customDays?: number): string
```

Returns Czech strings:
- daily → "Denně"
- weekly → "Týdně, Po" (with day name)
- monthly → "Měsíčně, 15. dne"
- yearly → "Ročně, 15. března"
- custom → "Každých 3 dní" / "Každý 1 den"

### Affected screens
- `app/chores/[id].tsx` — chore detail, currently shows "Každých X dní"
- `app/(tabs)/chores.tsx` — chore list, currently shows "Každých X dní"
- `app/expenses/recurring.tsx` — already has inline formatInterval, replace with shared
- `components/dashboard_widgets/MyChoresWidget.tsx` — uses interval_days for deadline calc

## Forms

### `ChoreForm.tsx`
- Replace `<Input>` for "Interval (dnů)" with `<RecurringIntervalPicker>`
- On submit: create `recurring_intervals` row, then create chore with FK
- On edit: update the linked `recurring_intervals` row

### `ExpenseForm.tsx` (recurring expense create)
- Already uses interval picker inline or component — switch to shared table FK
- On submit: create `recurring_intervals` row, then create expense with FK

### `app/expenses/recurring/[id].tsx` (recurring expense edit)
- Switch from inline columns to FK-based reads/writes

## Backward compatibility

None needed — single migration converts all existing data. No feature flags.
