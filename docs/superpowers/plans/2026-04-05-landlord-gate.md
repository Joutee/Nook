# Landlord Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block Keys and Issues modules when no landlord exists in the flat, showing an informational empty state on screens and hiding dashboard widgets.

**Architecture:** A new `useFlatHasLandlord` hook queries `flat_profile` for an active landlord. Screens (Keys, Issues) use it to conditionally render a blocking empty state. Widgets (KeysWidget, IssuesWidget) use it to return `null` when no landlord exists.

**Tech Stack:** React Native, Expo Router, Supabase JS client, NativeWind

---

### File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `hooks/useFlatHasLandlord.ts` | Hook that checks if current flat has an active landlord |
| Modify | `app/(tabs)/keys.tsx` | Add landlord gate before rendering content |
| Modify | `app/(tabs)/issues.tsx` | Add landlord gate before rendering content |
| Modify | `components/dashboard_widgets/KeysWidget.tsx` | Return null when no landlord |
| Modify | `components/dashboard_widgets/IssuesWidget.tsx` | Return null when no landlord |

---

### Task 1: Create `useFlatHasLandlord` hook

**Files:**
- Create: `hooks/useFlatHasLandlord.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import logger from "@/lib/logger";

export const useFlatHasLandlord = () => {
  const { currentFlat } = useFlatContext();
  const [hasLandlord, setHasLandlord] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const check = async () => {
        if (!currentFlat?.id) {
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          const { data, error } = await supabase
            .from("flat_profile")
            .select("id")
            .eq("flat_id", currentFlat.id)
            .eq("role", "pronajimatel")
            .eq("active", true)
            .limit(1);

          if (error) {
            logger.error("Error checking landlord:", error);
            setHasLandlord(true); // fail open — don't block on error
            return;
          }

          setHasLandlord((data?.length ?? 0) > 0);
        } finally {
          setIsLoading(false);
        }
      };

      check();
    }, [currentFlat?.id]),
  );

  return { hasLandlord, isLoading };
};
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useFlatHasLandlord.ts
git commit -m "feat: add useFlatHasLandlord hook"
```

---

### Task 2: Add landlord gate to Keys screen

**Files:**
- Modify: `app/(tabs)/keys.tsx`

- [ ] **Step 1: Add the gate**

Add import at top of file:

```ts
import { useFlatHasLandlord } from "@/hooks/useFlatHasLandlord";
```

Inside `Keys` component, after existing hook calls (`useFlatContext`, `useToast`), add:

```ts
const { hasLandlord, isLoading: landlordLoading } = useFlatHasLandlord();
```

After the existing loading check (`if (isLoading) { ... }`), add a second early return:

```tsx
if (!landlordLoading && !hasLandlord) {
  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <Text className="text-3xl font-bold text-foreground mb-4">Klíče</Text>
        <View className="flex-1 justify-center items-center py-20">
          <Ionicons
            name="key-outline"
            size={64}
            className="text-muted-foreground"
          />
          <Text className="text-lg font-semibold text-foreground mt-4 text-center">
            V domácnosti chybí pronajímatel
          </Text>
          <Text className="text-sm text-muted-foreground mt-2 text-center px-8">
            Pro používání této funkce musí být v domácnosti alespoň jeden
            pronajímatel.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `npx expo start` — check no TypeScript errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/keys.tsx
git commit -m "feat: add landlord gate to Keys screen"
```

---

### Task 3: Add landlord gate to Issues screen

**Files:**
- Modify: `app/(tabs)/issues.tsx`

- [ ] **Step 1: Add the gate**

Add import at top of file:

```ts
import { useFlatHasLandlord } from "@/hooks/useFlatHasLandlord";
```

Inside `Issues` component, after existing hook calls, add:

```ts
const { hasLandlord, isLoading: landlordLoading } = useFlatHasLandlord();
```

After the existing loading check (`if (isLoading) { ... }`), add a second early return:

```tsx
if (!landlordLoading && !hasLandlord) {
  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <Text className="text-3xl font-bold text-foreground mb-4">Závady</Text>
        <View className="flex-1 justify-center items-center py-20">
          <Ionicons
            name="warning-outline"
            size={64}
            className="text-muted-foreground"
          />
          <Text className="text-lg font-semibold text-foreground mt-4 text-center">
            V domácnosti chybí pronajímatel
          </Text>
          <Text className="text-sm text-muted-foreground mt-2 text-center px-8">
            Pro používání této funkce musí být v domácnosti alespoň jeden
            pronajímatel.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `npx expo start` — check no TypeScript errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/issues.tsx
git commit -m "feat: add landlord gate to Issues screen"
```

---

### Task 4: Hide KeysWidget when no landlord

**Files:**
- Modify: `components/dashboard_widgets/KeysWidget.tsx`

- [ ] **Step 1: Add the gate**

Add import at top of file:

```ts
import { useFlatHasLandlord } from "@/hooks/useFlatHasLandlord";
```

Inside `KeysWidget` component, after existing hook calls, add:

```ts
const { hasLandlord } = useFlatHasLandlord();
```

At the start of the return, before the existing `<Pressable>`, add an early return:

```ts
if (!hasLandlord) return null;
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard_widgets/KeysWidget.tsx
git commit -m "feat: hide KeysWidget when no landlord in flat"
```

---

### Task 5: Hide IssuesWidget when no landlord

**Files:**
- Modify: `components/dashboard_widgets/IssuesWidget.tsx`

- [ ] **Step 1: Add the gate**

Add import at top of file:

```ts
import { useFlatHasLandlord } from "@/hooks/useFlatHasLandlord";
```

Inside `IssuesWidget` component, after existing hook calls, add:

```ts
const { hasLandlord } = useFlatHasLandlord();
```

At the start of the return, before the existing `<Pressable>`, add an early return:

```ts
if (!hasLandlord) return null;
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard_widgets/IssuesWidget.tsx
git commit -m "feat: hide IssuesWidget when no landlord in flat"
```
