# Uncomplete Chore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to unmark a chore they accidentally completed in the current cycle.

**Architecture:** Add a DELETE RLS policy on `chore_completions`, a new `uncompleteChore()` utility function, and "uncomplete" UI in all three places where chores can be completed. No schema or view changes needed — existing views use EXISTS checks that automatically reflect deleted rows.

**Tech Stack:** Supabase (RLS policy migration), TypeScript, React Native

---

### Task 1: Database — Add DELETE RLS policy

**Files:**
- Create: `supabase/migrations/<timestamp>_add_uncomplete_chore_policy.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Allow the assigned user to uncomplete (delete) their chore completion
CREATE POLICY "Only the assignee can uncomplete the chore"
ON "public"."chore_completions"
FOR DELETE TO "authenticated"
USING ("auth"."uid"() = "public"."get_assignee_for_chore_cycle"("chore_id", "cycle_index"));
```

- [ ] **Step 2: Apply migration to remote Supabase**

Run via Supabase dashboard SQL editor or CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add DELETE RLS policy for chore uncomplete"
```

---

### Task 2: Backend — Add `uncompleteChore()` function

**Files:**
- Modify: `lib/choreUtils.ts`

- [ ] **Step 1: Add `uncompleteChore` function after existing `completeChore`**

Add this function at the end of `lib/choreUtils.ts` (after line 46):

```typescript
/**
 * Zruší splnění úkolu v aktuálním cyklu (smaže záznam z chore_completions)
 * @param chore - Úkol k odznačení
 * @param currentUserId - ID aktuálního uživatele
 * @param showToast - Funkce pro zobrazení toast notifikace
 * @returns Promise<boolean> - true pokud byl úkol úspěšně odznačen
 */
export const uncompleteChore = async (
  chore: Chore,
  currentUserId: string | null,
  showToast: (message: string, type: "success" | "error" | "info") => void,
): Promise<boolean> => {
  if (chore.assignee_user_id !== currentUserId) {
    showToast("Tento úkol není přiřazen vám", "error");
    return false;
  }

  if (!chore.is_completed_current_cycle) {
    showToast("Tento úkol ještě není dokončen", "info");
    return false;
  }

  try {
    const { error } = await supabase
      .from("chore_completions")
      .delete()
      .eq("chore_id", chore.id)
      .eq("cycle_index", chore.current_cycle_index);

    if (error) {
      showToast("Nepodařilo se odznačit úkol: " + error.message, "error");
      return false;
    }

    showToast("Úkol odznačen", "success");
    return true;
  } catch (error: any) {
    showToast("Nepodařilo se odznačit úkol: " + error.message, "error");
    return false;
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/choreUtils.ts
git commit -m "feat: add uncompleteChore utility function"
```

---

### Task 3: UI — Update chores list page (`app/(tabs)/chores.tsx`)

**Files:**
- Modify: `app/(tabs)/chores.tsx`

- [ ] **Step 1: Add import for `uncompleteChore`**

Change the import on line 14 from:
```typescript
import { completeChore } from "@/lib/choreUtils";
```
to:
```typescript
import { completeChore, uncompleteChore } from "@/lib/choreUtils";
```

- [ ] **Step 2: Add uncomplete dialog state**

After line 25 (`const [choreToComplete, setChoreToComplete] = ...`), add:
```typescript
const [showUncompleteDialog, setShowUncompleteDialog] = useState(false);
const [choreToUncomplete, setChoreToUncomplete] = useState<Chore | null>(null);
```

- [ ] **Step 3: Add handler functions**

After `confirmCompleteChore` function (after line 100), add:
```typescript
const handleUncompleteChore = (chore: Chore) => {
  if (!currentFlat?.id || completingChoreId) return;
  setChoreToUncomplete(chore);
  setShowUncompleteDialog(true);
};

const confirmUncompleteChore = async () => {
  if (!choreToUncomplete) return;

  setCompletingChoreId(choreToUncomplete.id);
  setShowUncompleteDialog(false);
  const success = await uncompleteChore(
    choreToUncomplete,
    currentUserId,
    showToast,
  );
  if (success) {
    loadChores();
  }
  setCompletingChoreId(null);
  setChoreToUncomplete(null);
};
```

- [ ] **Step 4: Add uncomplete button in `renderChoreItem`**

After the existing `{isMyTurn && !isCompleted && (...)}` block (after line 221), add:
```tsx
{isMyTurn && isCompleted && (
  <>
    <Separator className="my-3" />
    <View className="px-4 pb-4">
      <Button
        variant="secondary"
        className="w-full flex-row gap-2 py-2"
        onPress={() => handleUncompleteChore(item)}
        disabled={completingChoreId === item.id}
      >
        {completingChoreId === item.id ? (
          <ActivityIndicator size="small" />
        ) : (
          <>
            <Ionicons
              name="close-circle"
              size={24}
              className="text-secondary-foreground"
            />
            <Text className="text-secondary-foreground font-semibold text-base">
              Označit jako nesplněné
            </Text>
          </>
        )}
      </Button>
    </View>
  </>
)}
```

- [ ] **Step 5: Remove "Akci nelze vrátit zpět" from complete dialog**

Change the complete AlertDialog description (line 268) from:
```typescript
description={`Opravdu chcete označit úkol "${choreToComplete?.name}" jako dokončený? Akci nelze vrátit zpět.`}
```
to:
```typescript
description={`Opravdu chcete označit úkol "${choreToComplete?.name}" jako dokončený?`}
```

- [ ] **Step 6: Add uncomplete AlertDialog**

After the existing AlertDialog (after line 272), add:
```tsx
<AlertDialog
  open={showUncompleteDialog}
  onOpenChange={setShowUncompleteDialog}
  title="Zrušit splnění"
  description={`Opravdu chcete zrušit splnění úkolu "${choreToUncomplete?.name}"?`}
  cancelText="Zrušit"
  actionText="Odznačit"
  onAction={confirmUncompleteChore}
/>
```

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/chores.tsx
git commit -m "feat: add uncomplete chore button to chores list"
```

---

### Task 4: UI — Update chore detail page (`app/chores/[id].tsx`)

**Files:**
- Modify: `app/chores/[id].tsx`

- [ ] **Step 1: Add import for `uncompleteChore`**

Change the import on line 14 from:
```typescript
import { completeChore } from "@/lib/choreUtils";
```
to:
```typescript
import { completeChore, uncompleteChore } from "@/lib/choreUtils";
```

- [ ] **Step 2: Add uncomplete state**

After line 26 (`const [showCompleteDialog, setShowCompleteDialog] = ...`), add:
```typescript
const [showUncompleteDialog, setShowUncompleteDialog] = useState(false);
```

- [ ] **Step 3: Add handler functions**

After `confirmCompleteChore` function (after line 110), add:
```typescript
const handleUncompleteChore = () => {
  if (!chore || completingChore) return;
  setShowUncompleteDialog(true);
};

const confirmUncompleteChore = async () => {
  if (!chore) return;

  setCompletingChore(true);
  setShowUncompleteDialog(false);
  const success = await uncompleteChore(chore, currentUserId, showToast);
  if (success) {
    loadChoreDetail();
    loadRecentHistory();
  }
  setCompletingChore(false);
};
```

- [ ] **Step 4: Add uncomplete button**

After the existing `{isMyTurn && !isCompleted && (...)}` block (after line 296), add:
```tsx
{isMyTurn && isCompleted && (
  <Button
    variant="secondary"
    className="flex-1 flex-row gap-2"
    onPress={handleUncompleteChore}
    disabled={completingChore || isDeleting}
  >
    {completingChore ? (
      <ActivityIndicator
        size="small"
        className="text-secondary-foreground"
      />
    ) : (
      <>
        <Ionicons
          name="close-circle"
          size={22}
          className="text-secondary-foreground"
        />
        <Text>Zrušit splnění</Text>
      </>
    )}
  </Button>
)}
```

- [ ] **Step 5: Remove "Akci nelze vrátit zpět" from complete dialog**

Change the complete AlertDialog description (line 361) from:
```typescript
description={`Opravdu chcete označit úkol "${chore?.name}" jako dokončený? Akci nelze vrátit zpět.`}
```
to:
```typescript
description={`Opravdu chcete označit úkol "${chore?.name}" jako dokončený?`}
```

- [ ] **Step 6: Add uncomplete AlertDialog**

After the existing complete AlertDialog (after line 365), add:
```tsx
<AlertDialog
  open={showUncompleteDialog}
  onOpenChange={setShowUncompleteDialog}
  title="Zrušit splnění"
  description={`Opravdu chcete zrušit splnění úkolu "${chore?.name}"?`}
  cancelText="Zrušit"
  actionText="Odznačit"
  onAction={confirmUncompleteChore}
/>
```

- [ ] **Step 7: Commit**

```bash
git add app/chores/[id].tsx
git commit -m "feat: add uncomplete chore button to chore detail"
```

---

### Task 5: UI — Update MyChoresWidget (`components/dashboard_widgets/MyChoresWidget.tsx`)

**Files:**
- Modify: `components/dashboard_widgets/MyChoresWidget.tsx`

- [ ] **Step 1: Add import for `uncompleteChore`**

Change the import on line 17 from:
```typescript
import { completeChore } from "@/lib/choreUtils";
```
to:
```typescript
import { completeChore, uncompleteChore } from "@/lib/choreUtils";
```

- [ ] **Step 2: Add uncomplete dialog state**

After line 31 (`const [choreToComplete, setChoreToComplete] = ...`), add:
```typescript
const [showUncompleteDialog, setShowUncompleteDialog] = useState(false);
const [choreToUncomplete, setChoreToUncomplete] = useState<Chore | null>(null);
```

- [ ] **Step 3: Add handler functions**

After `confirmCompleteChore` function (after line 166), add:
```typescript
const handleUncompleteChore = (chore: Chore) => {
  if (!currentFlat?.id || completingChoreId) return;
  setChoreToUncomplete(chore);
  setShowUncompleteDialog(true);
};

const confirmUncompleteChore = async () => {
  if (!choreToUncomplete) return;

  setCompletingChoreId(choreToUncomplete.id);
  setShowUncompleteDialog(false);
  const success = await uncompleteChore(
    choreToUncomplete,
    currentUserId,
    showToast,
  );
  if (success) {
    loadMyChores();
  }
  setCompletingChoreId(null);
  setChoreToUncomplete(null);
};
```

- [ ] **Step 4: Make the checkbox icon tappable for uncomplete**

The widget uses a circle icon as a checkbox (lines 226-256). Currently when `is_completed_current_cycle` is true, the `Pressable` is disabled. Change the `onPress` and `disabled` props on the checkbox Pressable (line 226-231):

From:
```tsx
<Pressable
  onPress={() => handleCompleteChore(chore)}
  disabled={
    completingChoreId === chore.id ||
    chore.is_completed_current_cycle
  }
  className="mr-3"
>
```

To:
```tsx
<Pressable
  onPress={() =>
    chore.is_completed_current_cycle
      ? handleUncompleteChore(chore)
      : handleCompleteChore(chore)
  }
  disabled={completingChoreId === chore.id}
  className="mr-3"
>
```

- [ ] **Step 5: Remove "Akci nelze vrátit zpět" from complete dialog**

Change the complete AlertDialog description (line 329) from:
```typescript
description={`Opravdu chcete označit úkol "${choreToComplete?.name}" jako dokončený? Akci nelze vrátit zpět.`}
```
to:
```typescript
description={`Opravdu chcete označit úkol "${choreToComplete?.name}" jako dokončený?`}
```

- [ ] **Step 6: Add uncomplete AlertDialog**

After the existing AlertDialog (after line 333), add:
```tsx
<AlertDialog
  open={showUncompleteDialog}
  onOpenChange={setShowUncompleteDialog}
  title="Zrušit splnění"
  description={`Opravdu chcete zrušit splnění úkolu "${choreToUncomplete?.name}"?`}
  cancelText="Zrušit"
  actionText="Odznačit"
  onAction={confirmUncompleteChore}
/>
```

- [ ] **Step 7: Commit**

```bash
git add components/dashboard_widgets/MyChoresWidget.tsx
git commit -m "feat: add uncomplete chore to MyChoresWidget"
```

---

### Task 6: Manual Testing

- [ ] **Step 1: Test complete + uncomplete flow on chores list**

1. Open the app, go to Chores tab
2. Find a chore assigned to you that is not completed
3. Tap "Označit jako hotové" — confirm — chore should show as completed
4. Tap "Označit jako nesplněné" — confirm — chore should show as incomplete again
5. Complete it again to verify re-completion works

- [ ] **Step 2: Test on chore detail page**

1. Tap into a chore detail
2. Complete and uncomplete using the buttons there
3. Verify history section updates correctly

- [ ] **Step 3: Test on MyChoresWidget**

1. Go to dashboard
2. Tap the circle icon on an incomplete chore — confirm — should complete
3. Tap the checkmark icon on a completed chore — confirm — should uncomplete

- [ ] **Step 4: Test permissions**

1. Log in as a different user who is NOT assigned to a chore
2. Verify they do NOT see the uncomplete button on someone else's completed chore

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: uncomplete chore feature complete"
```
