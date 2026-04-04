# Profile Phone Number — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional phone number field to the profile page with inline editing, visible to all users, editable only by the profile owner.

**Architecture:** New migration adds `phone` column to `profiles` table. Extend `app/profile.tsx` with phone state, handlers, and JSX in the "Informace" section — identical pattern to existing IBAN/name/surname inline edits.

**Tech Stack:** Supabase (migration), React Native, Expo Router, NativeWind

---

### Task 1: Add phone column migration

**Files:**
- Create: `supabase/migrations/20260404100000_add_phone_to_profiles.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Add optional phone number to profiles
ALTER TABLE "public"."profiles"
  ADD COLUMN "phone" VARCHAR(20);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260404100000_add_phone_to_profiles.sql
git commit -m "feat: add phone column to profiles table"
```

---

### Task 2: Add phone state, validation, and handlers

**Files:**
- Modify: `app/profile.tsx`

- [ ] **Step 1: Add `phone` to the Profile interface**

Change the `Profile` interface (line 17-22) to:

```typescript
interface Profile {
  name: string | null;
  surname: string | null;
  email: string | null;
  iban: string | null;
  phone: string | null;
}
```

- [ ] **Step 2: Add phone validation helper**

After the `validateName` function (line 39), add:

```typescript
const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // phone is optional
  if (!PHONE_REGEX.test(trimmed)) return "Neplatný formát telefonního čísla";
  return null;
}
```

- [ ] **Step 3: Add state variables**

After the surname state variables (line 55), add:

```typescript
const [isEditingPhone, setIsEditingPhone] = useState(false);
const [phoneInput, setPhoneInput] = useState("");
const [isSavingPhone, setIsSavingPhone] = useState(false);
```

- [ ] **Step 4: Update the Supabase select query to include phone**

Change the select query (line 77) from:

```typescript
.select("name, surname, iban")
```

to:

```typescript
.select("name, surname, iban, phone")
```

- [ ] **Step 5: Add phone to the profile state setter**

Change the setProfile call (lines 81-86) from:

```typescript
setProfile({
  name: data?.name ?? null,
  surname: data?.surname ?? null,
  email: ownProfile ? (user?.email ?? null) : null,
  iban: data?.iban ?? null,
});
```

to:

```typescript
setProfile({
  name: data?.name ?? null,
  surname: data?.surname ?? null,
  email: ownProfile ? (user?.email ?? null) : null,
  iban: data?.iban ?? null,
  phone: data?.phone ?? null,
});
```

- [ ] **Step 6: Add handler functions**

After `handleSaveSurname` (line 239), add:

```typescript
const handleEditPhone = () => {
  if (isEditingName) handleCancelName();
  if (isEditingSurname) handleCancelSurname();
  if (isEditingIban) handleCancelIban();
  setPhoneInput(profile?.phone ?? "");
  setIsEditingPhone(true);
};

const handleCancelPhone = () => {
  setIsEditingPhone(false);
  setPhoneInput("");
};

const handleSavePhone = async () => {
  const trimmed = phoneInput.trim();
  const error = validatePhone(trimmed);
  if (error) {
    showToast(error, "error");
    return;
  }

  setIsSavingPhone(true);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setIsSavingPhone(false);
    showToast("Relace vypršela, přihlaste se znovu", "error");
    return;
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ phone: trimmed || null })
    .eq("id", user.id);

  setIsSavingPhone(false);

  if (dbError) {
    showToast("Nepodařilo se uložit telefonní číslo", "error");
  } else {
    setProfile((prev) => (prev ? { ...prev, phone: trimmed || null } : prev));
    setIsEditingPhone(false);
    showToast("Telefonní číslo bylo aktualizováno", "success");
  }
};
```

- [ ] **Step 7: Update existing handleEdit functions to cancel phone**

Add `if (isEditingPhone) handleCancelPhone();` to `handleEditIban`, `handleEditName`, and `handleEditSurname`.

In `handleEditIban` (line 98), add after the existing cancel lines:

```typescript
if (isEditingPhone) handleCancelPhone();
```

In `handleEditName` (line 147), add after the existing cancel lines:

```typescript
if (isEditingPhone) handleCancelPhone();
```

In `handleEditSurname` (line 194), add after the existing cancel lines:

```typescript
if (isEditingPhone) handleCancelPhone();
```

- [ ] **Step 8: Commit**

```bash
git add app/profile.tsx
git commit -m "feat: add phone edit state, validation, and handlers"
```

---

### Task 3: Add phone field JSX in Informace section

**Files:**
- Modify: `app/profile.tsx`

- [ ] **Step 1: Add phone field JSX after the email row**

After the email conditional block's closing `</>` and before the Card's closing `</Card>` (after line 427), add:

```tsx
<Separator />

<View className="py-4 px-6 gap-3">
  <View className="flex-row items-center gap-3">
    <Ionicons
      name="call-outline"
      size={24}
      className="text-foreground"
    />
    <View className="flex-1">
      <Text className="text-xs text-muted-foreground mb-0.5">
        Telefon
      </Text>
      {!isEditingPhone && (
        <Text className="text-base text-foreground">
          {profile?.phone || "Nenastaveno"}
        </Text>
      )}
    </View>
    {isOwnProfile && !isEditingPhone && (
      <Button variant="ghost" size="icon" onPress={handleEditPhone}>
        <Ionicons
          name="pencil-outline"
          size={18}
          className="text-muted-foreground"
        />
      </Button>
    )}
  </View>

  {isOwnProfile && isEditingPhone && (
    <View className="gap-2">
      <Input
        value={phoneInput}
        onChangeText={setPhoneInput}
        placeholder="+420 123 456 789"
        keyboardType="phone-pad"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSavePhone}
      />
      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          onPress={handleSavePhone}
          disabled={isSavingPhone}
        >
          <Text>Uložit</Text>
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onPress={handleCancelPhone}
          disabled={isSavingPhone}
        >
          <Text>Zrušit</Text>
        </Button>
      </View>
    </View>
  )}
</View>
```

Note: The phone field is placed **outside** the `{isOwnProfile && (<>...</>)}` email block, so it is visible to all users. Only the pencil button and edit form are gated by `isOwnProfile`.

- [ ] **Step 2: Commit**

```bash
git add app/profile.tsx
git commit -m "feat: add phone number inline edit UI to profile"
```
