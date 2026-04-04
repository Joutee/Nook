import { TurboModuleRegistry } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * Check if the native Google Sign-In module is available.
 * Returns false in Expo Go (no native module), true in dev builds.
 */
export function isGoogleSignInAvailable(): boolean {
  return TurboModuleRegistry.get("RNGoogleSignin") != null;
}

/**
 * Configure Google Sign-In. Call once at app startup.
 * No-op if native module is not available (e.g. Expo Go).
 */
export function configureGoogleSignIn() {
  if (!isGoogleSignInAvailable()) {
    console.warn("[googleAuth] Native module not available — skipping configure");
    return;
  }
  const { GoogleOneTapSignIn } = require("@react-native-google-signin/google-signin");
  GoogleOneTapSignIn.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
  });
}

/**
 * Generate a cryptographic nonce pair for Supabase + Google Sign-In.
 */
async function generateNonce(): Promise<{
  rawNonce: string;
  nonceDigest: string;
}> {
  const { digestStringAsync, CryptoDigestAlgorithm, getRandomBytes } = require("expo-crypto");
  const randomBytes = getRandomBytes(32);
  const rawNonce = Array.from(randomBytes as Uint8Array)
    .map((b: number) => b.toString(16).padStart(2, "0"))
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
  if (!isGoogleSignInAvailable()) {
    return {
      success: false,
      error: "Google přihlášení vyžaduje development build.",
    };
  }

  try {
    const {
      GoogleOneTapSignIn,
      isErrorWithCode,
      isNoSavedCredentialFoundResponse,
      statusCodes,
    } = require("@react-native-google-signin/google-signin");

    const { rawNonce, nonceDigest } = await generateNonce();

    let idToken: string | null = null;

    const signInResponse = await GoogleOneTapSignIn.signIn({ nonce: nonceDigest });

    if (isNoSavedCredentialFoundResponse(signInResponse)) {
      const createResponse = await GoogleOneTapSignIn.createAccount({ nonce: nonceDigest });

      if (isNoSavedCredentialFoundResponse(createResponse)) {
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

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      nonce: rawNonce,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    const { isErrorWithCode, statusCodes } = require("@react-native-google-signin/google-signin");
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
