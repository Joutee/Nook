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
