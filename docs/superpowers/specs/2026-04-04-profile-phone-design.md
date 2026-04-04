# Profile Phone Number — Design Spec

## Summary

Add an optional phone number field to the profile page in the "Informace" section, with inline editing matching the existing IBAN pattern. Visible to all users, editable only by the profile owner.

## Database

New migration adds a `phone` column to `profiles`:

```sql
ALTER TABLE "public"."profiles"
  ADD COLUMN "phone" VARCHAR(20);
```

No new RLS policies needed — the UPDATE policy from the name/surname feature already covers this.

## Frontend Changes

**File:** `app/profile.tsx`

### Profile Interface

Add `phone: string | null` to the local `Profile` interface.

### Placement

In the "Informace" card, after the email row (or after surname if viewing another user's profile). Icon: `call-outline`.

### Display

- All users see the phone number (read-only on other profiles)
- Shows "Nenastaveno" if null
- Edit pencil icon only on own profile

### Inline Edit

Identical to IBAN pattern:
- State: `isEditingPhone`, `phoneInput`, `isSavingPhone`
- Edit mode: Input + Uložit/Zrušit buttons
- Mutual exclusivity: opening phone edit closes name/surname/IBAN editors (and vice versa)

### Validation

- Regex: `/^\+?[0-9\s\-()]{6,20}$/`
- Allows: optional `+` prefix, digits, spaces, hyphens, parentheses
- Length: 6-20 characters
- Empty value is allowed (saves as `null`)

### Toasts

- Success: "Telefonní číslo bylo aktualizováno"
- Error: "Nepodařilo se uložit telefonní číslo"
- Validation error: "Neplatný formát telefonního čísla"

### What Does NOT Change

- Name/surname/IBAN editing (already implemented)
- Email editing (separate flow)
- Logout section
