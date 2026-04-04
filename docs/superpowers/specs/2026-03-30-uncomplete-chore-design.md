# Uncomplete Chore — Design Spec

## Problem

Users who accidentally mark a chore as completed in the current cycle have no way to undo it. The confirmation dialog states "Akci nelze vrátit zpet." This feature adds the ability to unmark a completed chore within the current cycle.

## Constraints

- Only the assigned user for the current cycle can uncomplete
- Available anytime within the current cycle (no time limit)
- No audit log — the completion row is simply deleted
- Must work everywhere chores can be completed: chores list, chore detail, MyChoresWidget

## Design

### 1. Database: New RLS Policy

Add a DELETE policy on `chore_completions`:

```sql
CREATE POLICY "Only the assignee can uncomplete the chore"
ON "public"."chore_completions"
FOR DELETE TO "authenticated"
USING (auth.uid() = public.get_assignee_for_chore_cycle(chore_id, cycle_index));
```

This reuses the existing `get_assignee_for_chore_cycle()` function — same logic as the INSERT policy. No schema changes, no new columns, no view modifications needed.

Migration file: `supabase/migrations/<timestamp>_add_uncomplete_chore_policy.sql`

### 2. Backend: `uncompleteChore()` function

New function in `lib/choreUtils.ts`:

```typescript
export const uncompleteChore = async (
  chore: { id: string; current_cycle_index: number },
  currentUserId: string
): Promise<{ success: boolean; error: string | null }> => {
  const { error } = await supabase
    .from("chore_completions")
    .delete()
    .eq("chore_id", chore.id)
    .eq("cycle_index", chore.current_cycle_index);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
};
```

### 3. UI Changes

Three files need the same pattern of changes:

- `app/(tabs)/chores.tsx` — main chores list
- `app/chores/[id].tsx` — chore detail page
- `components/dashboard_widgets/MyChoresWidget.tsx` — dashboard widget

**Logic change:** When `isMyTurn && isCompleted`, show an "Označit jako nesplnene" button instead of a disabled/greyed-out state.

**Completion button:** Remove "Akci nelze vratit zpet" from the confirmation dialog text.

**Uncomplete button:** Show confirmation dialog ("Opravdu chcete zrusit splneni ukolu?"), then call `uncompleteChore()`, then refresh data.

### 4. What stays unchanged

- `view_chore_dashboard` — checks `EXISTS` on `chore_completions`, works automatically
- `view_chore_history` — LEFT JOINs completions, works automatically
- `ChoreLeaderBoardWidget` — counts completions, reflects deletions automatically
- Realtime subscriptions — already listen to `*` events on `chore_completions`, will catch DELETE
