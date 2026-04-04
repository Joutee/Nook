# Profile Name/Surname Inline Edit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to inline-edit their first name and last name on the profile page, matching the existing IBAN edit pattern.

**Architecture:** Add RLS UPDATE policy for profiles table. Extend `app/profile.tsx` with per-field edit state, validation, and save logic for name and surname fields — same pattern as the existing IBAN inline edit.

**Tech Stack:** Supabase (RLS migration), React Native, Expo Router, NativeWind

---

### Task 1: Add RLS UPDATE policy migration

**Files:**
- Create: `supabase/migrations/20260404000000_allow_profile_self_update.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ("auth"."uid"() = "id")
  WITH CHECK ("auth"."uid"() = "id");
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260404000000_allow_profile_self_update.sql
git commit -m "feat: add RLS policy allowing users to update own profile"
```

---

### Task 2: Add name edit state and handlers to profile page

**Files:**
- Modify: `app/profile.tsx`

- [ ] **Step 1: Add state variables for name and surname editing**

After the existing IBAN state variables (lines 38-40), add:

```typescript
const [isEditingName, setIsEditingName] = useState(false);
const [nameInput, setNameInput] = useState("");
const [isSavingName, setIsSavingName] = useState(false);
const [isEditingSurname, setIsEditingSurname] = useState(false);
const [surnameInput, setSurnameInput] = useState("");
const [isSavingSurname, setIsSavingSurname] = useState(false);
```

- [ ] **Step 2: Add a validation helper**

After the `formatIban` function (line 30), add:

```typescript
const NAME_REGEX = /^[\p{L}\s'-]+$/u;

function validateName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} nesmí být prázdné`;
  if (!NAME_REGEX.test(trimmed)) return `${label} smí obsahovat pouze písmena`;
  return null;
}
```

- [ ] **Step 3: Add handler functions for name editing**

After the `handleCopyIban` function (lines 124-128), add:

```typescript
const handleEditName = () => {
  setNameInput(profile?.name ?? "");
  setIsEditingName(true);
};

const handleCancelName = () => {
  setIsEditingName(false);
  setNameInput("");
};

const handleSaveName = async () => {
  const trimmed = nameInput.trim();
  const error = validateName(trimmed, "Jméno");
  if (error) {
    showToast(error, "error");
    return;
  }

  setIsSavingName(true);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ name: trimmed })
    .eq("id", user!.id);

  setIsSavingName(false);

  if (dbError) {
    showToast("Nepodařilo se uložit jméno", "error");
  } else {
    setProfile((prev) => (prev ? { ...prev, name: trimmed } : prev));
    setIsEditingName(false);
    showToast("Jméno bylo aktualizováno", "success");
  }
};

const handleEditSurname = () => {
  setSurnameInput(profile?.surname ?? "");
  setIsEditingSurname(true);
};

const handleCancelSurname = () => {
  setIsEditingSurname(false);
  setSurnameInput("");
};

const handleSaveSurname = async () => {
  const trimmed = surnameInput.trim();
  const error = validateName(trimmed, "Příjmení");
  if (error) {
    showToast(error, "error");
    return;
  }

  setIsSavingSurname(true);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ surname: trimmed })
    .eq("id", user!.id);

  setIsSavingSurname(false);

  if (dbError) {
    showToast("Nepodařilo se uložit příjmení", "error");
  } else {
    setProfile((prev) => (prev ? { ...prev, surname: trimmed } : prev));
    setIsEditingSurname(false);
    showToast("Příjmení bylo aktualizováno", "success");
  }
};
```

- [ ] **Step 4: Commit**

```bash
git add app/profile.tsx
git commit -m "feat: add name/surname edit state and handlers"
```

---

### Task 3: Update JSX — name field with inline edit

**Files:**
- Modify: `app/profile.tsx`

- [ ] **Step 1: Replace the Jméno (name) field JSX**

Replace the name field block (lines 166-179) with:

```tsx
<View className="py-4 px-6 gap-3">
  <View className="flex-row items-center gap-3">
    <Ionicons
      name="person-outline"
      size={24}
      className="text-foreground"
    />
    <View className="flex-1">
      <Text className="text-xs text-muted-foreground mb-0.5">
        Jméno
      </Text>
      {!isEditingName && (
        <Text className="text-base text-foreground">
          {profile?.name || "—"}
        </Text>
      )}
    </View>
    {isOwnProfile && !isEditingName && (
      <Button variant="ghost" size="icon" onPress={handleEditName}>
        <Ionicons
          name="pencil-outline"
          size={18}
          className="text-muted-foreground"
        />
      </Button>
    )}
  </View>

  {isOwnProfile && isEditingName && (
    <View className="gap-2">
      <Input
        value={nameInput}
        onChangeText={setNameInput}
        placeholder="Zadejte jméno"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSaveName}
      />
      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          onPress={handleSaveName}
          disabled={isSavingName}
        >
          <Text>Uložit</Text>
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onPress={handleCancelName}
          disabled={isSavingName}
        >
          <Text>Zrušit</Text>
        </Button>
      </View>
    </View>
  )}
</View>
```

- [ ] **Step 2: Commit**

```bash
git add app/profile.tsx
git commit -m "feat: add inline edit UI for name field"
```

---

### Task 4: Update JSX — surname field with inline edit

**Files:**
- Modify: `app/profile.tsx`

- [ ] **Step 1: Replace the Příjmení (surname) field JSX**

Replace the surname field block (lines 184-198) with:

```tsx
<View className="py-4 px-6 gap-3">
  <View className="flex-row items-center gap-3">
    <Ionicons
      name="person-outline"
      size={24}
      className="text-foreground"
    />
    <View className="flex-1">
      <Text className="text-xs text-muted-foreground mb-0.5">
        Příjmení
      </Text>
      {!isEditingSurname && (
        <Text className="text-base text-foreground">
          {profile?.surname || "—"}
        </Text>
      )}
    </View>
    {isOwnProfile && !isEditingSurname && (
      <Button variant="ghost" size="icon" onPress={handleEditSurname}>
        <Ionicons
          name="pencil-outline"
          size={18}
          className="text-muted-foreground"
        />
      </Button>
    )}
  </View>

  {isOwnProfile && isEditingSurname && (
    <View className="gap-2">
      <Input
        value={surnameInput}
        onChangeText={setSurnameInput}
        placeholder="Zadejte příjmení"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSaveSurname}
      />
      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          onPress={handleSaveSurname}
          disabled={isSavingSurname}
        >
          <Text>Uložit</Text>
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onPress={handleCancelSurname}
          disabled={isSavingSurname}
        >
          <Text>Zrušit</Text>
        </Button>
      </View>
    </View>
  )}
</View>
```

- [ ] **Step 2: Commit**

```bash
git add app/profile.tsx
git commit -m "feat: add inline edit UI for surname field"
```

---

### Task 5: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm start
```

- [ ] **Step 2: Test on own profile**

1. Open profile page (own profile)
2. Verify pencil icon appears next to Jméno and Příjmení
3. Tap pencil on Jméno → input appears with current value, Uložit/Zrušit buttons
4. Enter empty value → tap Uložit → error toast "Jméno nesmí být prázdné"
5. Enter "123" → tap Uložit → error toast "Jméno smí obsahovat pouze písmena"
6. Enter valid name → tap Uložit → success toast, value updated in display
7. Repeat steps 3-6 for Příjmení
8. Tap Zrušit → input closes, original value remains
9. Verify IBAN editing still works as before

- [ ] **Step 3: Test on another user's profile**

1. Open another user's profile via `?id=<other-user-id>`
2. Verify NO pencil icons appear next to Jméno and Příjmení
3. Fields display as read-only

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke test"
```
