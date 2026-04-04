# Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native Google Sign-In (Android + iOS) using `@react-native-google-signin/google-signin` with Supabase `signInWithIdToken()`.

**Architecture:** Native Google One-Tap SDK provides `idToken`, which is passed to Supabase's `signInWithIdToken()`. A nonce (via `expo-crypto`) prevents replay attacks. The existing DB trigger `handle_new_user` creates profiles automatically — we update it to handle Google's metadata key names (`given_name`/`family_name`/`picture`). No navigation changes needed.

**Tech Stack:** `@react-native-google-signin/google-signin`, `expo-crypto`, Supabase Auth, Expo config plugin

**Spec:** `docs/superpowers/specs/2026-04-04-google-oauth-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/googleAuth.ts` | Create | Google Sign-In configuration, nonce generation, signIn flow, Supabase token exchange |
| `app/(auth)/index.tsx` | Modify | Wire Google button to `googleAuth` utility |
| `app.json` | Modify | Add `@react-native-google-signin/google-signin` Expo plugin with `iosUrlScheme` |
| `lib/errorTranslations.ts` | Modify | Add Google OAuth error messages |
| `supabase/migrations/YYYYMMDDHHMMSS_google_oauth_profile_trigger.sql` | Create | Update `handle_new_user` trigger to handle Google metadata keys |

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npx expo install @react-native-google-signin/google-signin expo-crypto
```

- [ ] **Step 2: Verify installation**

```bash
cat package.json | grep -E "google-signin|expo-crypto"
```

Expected: Both packages appear in `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @react-native-google-signin/google-signin and expo-crypto"
```

---

### Task 2: Configure Expo plugin in app.json

**Files:**
- Modify: `app.json`

The `iosUrlScheme` is the reversed iOS Client ID from Google Cloud Console. It looks like `com.googleusercontent.apps.YOUR_IOS_CLIENT_ID`. This value won't be known until Task 7 (Google Cloud setup), so use a placeholder that must be replaced.

- [ ] **Step 1: Add plugin to app.json**

In `app.json`, add `@react-native-google-signin/google-signin` to the `plugins` array and add `expo-crypto` as well. The full `plugins` array should be:

```json
"plugins": [
  "expo-router",
  "expo-sqlite",
  "expo-secure-store",
  "expo-crypto",
  [
    "@react-native-google-signin/google-signin",
    {
      "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_HERE"
    }
  ]
]
```

Note: `YOUR_IOS_CLIENT_ID_HERE` must be replaced with the actual reversed iOS Client ID after completing Google Cloud Console setup (Task 7).

- [ ] **Step 2: Commit**

```bash
git add app.json
git commit -m "chore: add google-signin and expo-crypto expo plugins"
```

---

### Task 3: Update handle_new_user DB trigger

**Files:**
- Create: `supabase/migrations/20260404120000_google_oauth_profile_trigger.sql`

The existing `handle_new_user` trigger reads `name`, `surname`, `avatar_url` from `raw_user_meta_data`. Google's ID token provides `given_name`, `family_name`, `picture` instead. We need `COALESCE` to handle both providers.

Key mapping:
- Email signup: `{name: "Jan", surname: "Novák"}` → `name` is first name
- Google: `{name: "Jan Novák", given_name: "Jan", family_name: "Novák", picture: "https://..."}` → `name` is FULL name

So we must prioritize `given_name` over `name` (because Google's `name` is the full name).

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/20260404120000_google_oauth_profile_trigger.sql`:

```sql
-- Update handle_new_user to support Google OAuth metadata
-- Google provides: given_name, family_name, picture
-- Email signup provides: name, surname, avatar_url
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin
  insert into public.profiles (id, name, surname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'given_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'surname', new.raw_user_meta_data->>'family_name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;$$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260404120000_google_oauth_profile_trigger.sql
git commit -m "feat: update handle_new_user trigger for Google OAuth metadata"
```

---

### Task 4: Create lib/googleAuth.ts

**Files:**
- Create: `lib/googleAuth.ts`

This utility wraps the entire Google Sign-In → Supabase flow. It uses `GoogleOneTapSignIn` (the modern API), generates a nonce for security, and handles all error cases.

- [ ] **Step 1: Create the file**

Create `lib/googleAuth.ts`:

```ts
import {
  GoogleOneTapSignIn,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { digestStringAsync, CryptoDigestAlgorithm, getRandomBytes } from "expo-crypto";
import { supabase } from "@/lib/supabase";

/**
 * Configure Google Sign-In. Call once at app startup.
 * webClientId is the Web Client ID from Google Cloud Console
 * (same one used in Supabase dashboard).
 */
export function configureGoogleSignIn() {
  GoogleOneTapSignIn.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
  });
}

/**
 * Generate a cryptographic nonce pair for Supabase + Google Sign-In.
 * rawNonce → Supabase signInWithIdToken
 * nonceDigest (SHA-256) → Google Sign-In SDK (embedded in ID token)
 */
async function generateNonce(): Promise<{
  rawNonce: string;
  nonceDigest: string;
}> {
  const randomBytes = getRandomBytes(32);
  const rawNonce = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const nonceDigest = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  return { rawNonce, nonceDigest };
}

/**
 * Full Google Sign-In flow:
 * 1. Generate nonce
 * 2. Show native Google dialog (One-Tap → createAccount → explicitSignIn fallback)
 * 3. Exchange idToken with Supabase
 *
 * Returns: { success: true } or { success: false, error: string, cancelled?: true }
 */
export async function signInWithGoogle(): Promise<
  | { success: true }
  | { success: false; error: string; cancelled?: boolean }
> {
  try {
    const { rawNonce, nonceDigest } = await generateNonce();

    // Try One-Tap sign-in first
    let idToken: string | null = null;

    const signInResponse = await GoogleOneTapSignIn.signIn({ nonce: nonceDigest });

    if (isNoSavedCredentialFoundResponse(signInResponse)) {
      // No saved credential — try creating account (shows account picker)
      const createResponse = await GoogleOneTapSignIn.createAccount({ nonce: nonceDigest });

      if (isNoSavedCredentialFoundResponse(createResponse)) {
        // Fallback: explicit sign-in dialog
        const explicitResponse = await GoogleOneTapSignIn.presentExplicitSignIn({ nonce: nonceDigest });
        idToken = explicitResponse.data?.idToken ?? null;
      } else {
        idToken = createResponse.data?.idToken ?? null;
      }
    } else {
      idToken = signInResponse.data?.idToken ?? null;
    }

    if (!idToken) {
      return { success: false, error: "Google neposkytl autentizační token." };
    }

    // Exchange Google idToken for Supabase session
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      nonce: rawNonce,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { success: false, error: "", cancelled: true };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return {
            success: false,
            error: "Google Play služby nejsou dostupné.",
          };
        default:
          return {
            success: false,
            error: "Přihlášení přes Google selhalo.",
          };
      }
    }
    return { success: false, error: "Nepodařilo se připojit k Google." };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/googleAuth.ts
git commit -m "feat: add Google Sign-In utility with Supabase integration"
```

---

### Task 5: Add Google error translations

**Files:**
- Modify: `lib/errorTranslations.ts`

- [ ] **Step 1: Add Google-specific error messages**

In `lib/errorTranslations.ts`, add the following entries to the `errorMap` object, after the existing network errors section (after the `timeout` entry, before the `// Validation errors` comment):

```ts
    // Google OAuth errors
    "Invalid ID token": "Neplatný Google token. Zkuste to prosím znovu.",
    "OAuth identity already linked to a different user":
      "Tento Google účet je již propojen s jiným uživatelem.",
    "Unacceptable audience in ID token":
      "Chyba konfigurace Google přihlášení.",
```

- [ ] **Step 2: Commit**

```bash
git add lib/errorTranslations.ts
git commit -m "feat: add Google OAuth error translations"
```

---

### Task 6: Wire up Google button in auth entry screen

**Files:**
- Modify: `app/(auth)/index.tsx`

- [ ] **Step 1: Add imports**

Add these imports at the top of `app/(auth)/index.tsx`, after the existing imports:

```ts
import { configureGoogleSignIn, signInWithGoogle } from "@/lib/googleAuth";
import { getErrorMessage } from "@/lib/errorTranslations";
```

- [ ] **Step 2: Add configureGoogleSignIn call**

Inside the `AuthEntry` component, add a `useEffect` to configure Google Sign-In once on mount. Place it right after the existing `useEffect(() => { checkForDefaultAccount(); }, []);` block (after line 36):

```ts
  useEffect(() => {
    configureGoogleSignIn();
  }, []);
```

- [ ] **Step 3: Add Google sign-in handler**

Add the `handleGoogleSignIn` function inside the `AuthEntry` component, after the `handleRegister` function (after line 108):

```ts
  async function handleGoogleSignIn() {
    setIsLoading(true);
    const result = await signInWithGoogle();
    if (!result.success) {
      if (!result.cancelled) {
        showToast(
          result.error ? getErrorMessage(result.error) : "Přihlášení přes Google selhalo.",
          "error",
        );
      }
    }
    setIsLoading(false);
  }
```

- [ ] **Step 4: Replace TODO in Google button**

Replace the Google button's `onPress` handler. Change:

```tsx
            <Button
              variant="outline"
              className="w-full"
              onPress={() => {
                // TODO: Implement Google OAuth
              }}
            >
```

To:

```tsx
            <Button
              variant="outline"
              className="w-full"
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
```

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/index.tsx
git commit -m "feat: wire Google Sign-In button to OAuth flow"
```

---

### Task 7: External setup (manual — not code)

This task is a checklist for the developer to complete outside the codebase.

- [ ] **Step 1: Google Cloud Console — Create OAuth credentials**

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Go to "APIs & Services" → "OAuth consent screen"
4. Configure as External, Testing mode
5. Add scopes: `email`, `profile`, `openid`
6. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
7. Create **Web application** client:
   - Name: "Nook Supabase" (this is used by Supabase, not the app directly)
   - Note the **Client ID** and **Client Secret**
8. Create **Android** client:
   - Package name: `com.anonymous.nook`
   - SHA-1 fingerprint: get it with `cd android && ./gradlew signingReport` (after first build) or `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`
9. Create **iOS** client:
   - Bundle ID: from Xcode or `app.json` ios config
   - Note the **iOS Client ID** — the reversed version goes into `app.json` `iosUrlScheme`

- [ ] **Step 2: Update app.json with real iOS URL scheme**

Replace `YOUR_IOS_CLIENT_ID_HERE` in `app.json` with the reversed iOS Client ID from step 1. The format is: `com.googleusercontent.apps.XXXXX` (Google gives this to you when creating the iOS credential).

- [ ] **Step 3: Add environment variable**

Add to `.env`:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

This is the **Web** Client ID (not Android or iOS).

- [ ] **Step 4: Supabase Dashboard — Enable Google provider**

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Toggle Google provider ON
3. Enter the **Web Client ID** and **Web Client Secret** from step 1
4. Save

- [ ] **Step 5: Apply database migration**

Run from project root:

```bash
npx supabase db push
```

Or apply via Supabase Dashboard SQL editor by pasting the contents of `supabase/migrations/20260404120000_google_oauth_profile_trigger.sql`.

- [ ] **Step 6: Rebuild development client**

Google Sign-In requires native code, so rebuild:

```bash
npx expo prebuild --clean
npx expo run:android
```

- [ ] **Step 7: Test the flow**

1. Open app → Auth entry screen shows "Pokračovat s Google"
2. Tap Google button → native Google account picker appears
3. Select account → app redirects to join-flat (new user) or tabs (existing user)
4. Check Supabase dashboard → new user has `profiles` entry with name/surname from Google
5. Test cancellation → tap back/cancel on Google dialog → no error shown
6. Test existing email → user with same email gets linked account
