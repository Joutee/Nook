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
  try {
    if (!isGoogleSignInAvailable()) {
      console.warn("[googleAuth] Native module not available — skipping configure");
      return;
    }
    const { GoogleSignin } = require("@react-native-google-signin/google-signin");
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    });
  } catch (e) {
    console.warn("[googleAuth] Failed to configure:", e);
  }
}

/**
 * Full Google Sign-In flow:
 * 1. Show native Google dialog
 * 2. Get idToken
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
      GoogleSignin,
      isErrorWithCode,
      statusCodes,
    } = require("@react-native-google-signin/google-signin");

    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    const idToken = response.data?.idToken ?? null;

    if (!idToken) {
      return { success: false, error: "Google neposkytl autentizační token." };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
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
