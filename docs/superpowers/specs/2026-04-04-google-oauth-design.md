# Google OAuth Design — Nook

## Overview

Add native Google Sign-In to the Nook app (Android + iOS) using `@react-native-google-signin/google-signin` with Supabase `signInWithIdToken()`. No navigation or auth guard changes needed — the existing session-based redirect logic handles Google sessions identically to email sessions.

## Platforms

- Android (native Google Sign-In dialog)
- iOS (native Google Sign-In dialog)

## Auth Flow

1. User taps "Pokračovat s Google" on `app/(auth)/index.tsx`
2. `@react-native-google-signin` displays native Google account picker
3. User selects account → SDK returns `idToken`
4. Call `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`
5. Supabase verifies token, creates or finds user, returns session
6. Existing `onAuthStateChange` listener in `app/_layout.tsx` picks up the new session
7. If new user → extract `given_name`/`family_name` from Google profile and save to `profiles` table
8. Existing redirect logic sends user to `/(setup)/join-flat` or `/(tabs)/`

## Account Linking

Automatic — Supabase links identities with the same email. A user who registered via email/password and later signs in with Google (same email) gets the same account. Enabled via Supabase dashboard setting.

## New User Profile

For first-time Google users, `given_name` and `family_name` from the Google account are automatically saved to the `profiles` table (`name` and `surname` columns). If a profile record already has these fields populated, they are not overwritten.

## Files

### New

- **`lib/googleAuth.ts`** — Utility wrapping `@react-native-google-signin` + Supabase `signInWithIdToken`. Handles:
  - Google Sign-In configuration
  - Invoking native sign-in dialog
  - Passing `idToken` to Supabase
  - Extracting and saving Google profile name for new users
  - Error mapping to user-facing messages

### Modified

- **`app/(auth)/index.tsx`** — Replace TODO in Google button `onPress` with call to `googleAuth` utility
- **`app.json`** — Add `@react-native-google-signin/google-signin` to `plugins` array with Client IDs

### Unchanged

- `lib/supabase.ts` — existing config works as-is
- `app/_layout.tsx` — auth guard handles Google sessions without changes
- Navigation structure — no new screens needed

### New Dependencies

- `@react-native-google-signin/google-signin` — native SDK with Expo config plugin

## External Setup (Outside Codebase)

### Google Cloud Console

1. Create a new project (or use existing)
2. Configure OAuth consent screen (external, testing mode is fine for dev)
3. Create OAuth 2.0 Client IDs:
   - **Android** — with SHA-1 fingerprint from signing key and package name `com.anonymous.nook`
   - **iOS** — with bundle identifier
   - **Web** — needed by Supabase as the "server" client (Client ID + Client Secret)
4. Note: The Web Client ID is what Supabase uses; the Android/iOS Client IDs are for the native SDK

### Supabase Dashboard

1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Enter Web Client ID and Web Client Secret (from Google Cloud Console)
4. Automatic account linking is handled by default when emails match

## Error Handling

| Scenario | Behavior |
|----------|----------|
| User cancels Google dialog | Silent — no error shown |
| Network error | Toast: "Nepodařilo se připojit k Google" via `ToastContext` |
| Supabase `signInWithIdToken` fails | Toast with translated error via `errorTranslations.ts` |
| Google access revoked | Next sign-in attempt shows consent dialog again |

## What This Does NOT Include

- No web platform support (Android + iOS only)
- No changes to registration flow (Google is sign-in only, auto-creates account)
- No manual account linking UI
- No offline handling or retry logic
