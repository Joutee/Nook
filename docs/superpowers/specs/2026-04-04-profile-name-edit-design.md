# Profile Name Edit — Design Spec

## Summary

Add inline editing for first name (jmeno) and last name (prijmeni) on the profile page, consistent with the existing IBAN edit pattern. Users can only edit their own profile.

## Database

New Supabase migration adds an RLS UPDATE policy to the `profiles` table:

```sql
CREATE POLICY "Users can update own profile"
  ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

No new tables or columns needed. The `name` and `surname` text fields already exist.

## Frontend Changes

**File:** `app/profile.tsx`

### State

- `editingName` / `editingSurname` — boolean flags for edit mode
- `tempName` / `tempSurname` — temporary input values during editing

### UI Behavior

Each field (Jmeno, Prijmeni) gets an inline edit button (pencil icon), matching the existing IBAN pattern:

- **Read mode:** Text value + pencil icon button (only on own profile)
- **Edit mode:** Input field + confirm (checkmark) button + cancel (X) button

On another user's profile, fields remain read-only with no edit controls.

### Validation

- Field must not be empty
- Only letters allowed (including diacritics, spaces, hyphens, apostrophes): `/^[\p{L}\s'-]+$/u`
- On validation failure: error toast with specific message

### Save Flow

1. User clicks checkmark to confirm
2. Validate input
3. Call `.from("profiles").update({ name }).eq("id", userId)` (or `surname`)
4. On success: update local state, show success toast ("Jmeno aktualizovano" / "Prijmeni aktualizovano"), exit edit mode
5. On failure: show error toast, stay in edit mode

### What Does NOT Change

- Email editing (separate `/settings/change-email` flow)
- IBAN editing (already works)
- Avatar display
- Profile viewing for other users (read-only)
- Logout section
