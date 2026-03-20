import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errorTranslations";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useToast } from "@/contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  isBiometricAvailable,
  hasBiometricCredentials,
  authenticateWithBiometrics,
  deleteBiometricCredentials,
  getBiometricCredentials,
  saveUsedAccount,
} from "@/lib/biometricAuth";

export default function Login() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [hasTriedBiometric, setHasTriedBiometric] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    checkBiometricForThisEmail();
  }, [email]);

  // Automaticky spustit biometriku, když je k dispozici
  useEffect(() => {
    if (canUseBiometric && !hasTriedBiometric && !buttonLoading) {
      setHasTriedBiometric(true);
      handleBiometricLogin();
    }
  }, [canUseBiometric, hasTriedBiometric, buttonLoading]);

  async function checkBiometricForThisEmail() {
    if (!email) {
      setCanUseBiometric(false);
      setHasTriedBiometric(false);
      return;
    }

    try {
      const available = await isBiometricAvailable();
      if (!available) {
        setCanUseBiometric(false);
        setHasTriedBiometric(false);
        return;
      }

      const hasSaved = await hasBiometricCredentials(email);
      setCanUseBiometric(hasSaved);
      setHasTriedBiometric(false); // Reset pro nový email
    } catch (error) {
      console.log("Error checking biometric:", error);
      setCanUseBiometric(false);
      setHasTriedBiometric(false);
    }
  }

  async function signInWithEmail() {
    setButtonLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) {
      // Kontrola, jestli email není ověřený
      if (error.message.includes("Email not confirmed")) {
        showToast("Email nebyl ověřen. Přesměrujeme vás na ověření.", "error");
        setButtonLoading(false);
        router.push(`verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      // Pokud uživatel neexistuje nebo má špatné heslo, zobrazit obecnou chybu
      if (error.message.includes("Invalid login credentials")) {
        showToast("Nesprávný email nebo heslo", "error");
        setButtonLoading(false);
        return;
      }

      showToast(getErrorMessage(error.message), "error");
      console.log("Login error:", error);
      setButtonLoading(false);
    } else {
      // Úspěšné přihlášení - uložit účet do seznamu použitých účtů
      await saveUsedAccount(email);
      showToast("Přihlášení bylo úspěšné", "success");
      setButtonLoading(false);
    }
  }

  async function handleBiometricLogin() {
    try {
      setButtonLoading(true);
      const credentials = await authenticateWithBiometrics(email);

      if (!credentials) {
        setButtonLoading(false);
        return;
      }

      // Ověřit, že email odpovídá (dodatečná kontrola)
      if (credentials.email !== email) {
        showToast("Uložený email neodpovídá", "error");
        setButtonLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        showToast("Přihlášení selhalo. Zkuste manuální přihlášení.", "error");
        await deleteBiometricCredentials(email);
        setCanUseBiometric(false);
      } else {
        // Úspěšné biometrické přihlášení - účet už je uložený,
        // ale aktualizujeme čas posledního použití
        await saveUsedAccount(email);
        showToast("Přihlášení bylo úspěšné", "success");
      }
    } catch (error) {
      showToast("Chyba při biometrickém přihlášení", "error");
    } finally {
      setButtonLoading(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
      <View className="flex-1 bg-background justify-center p-5">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Přihlášení</CardTitle>
            <CardDescription className="text-center">
              Zadejte heslo pro {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-6">
            <View className="gap-6">
              <View className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Label htmlFor="password">Heslo</Label>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onPress={() => {
                      router.push("/forgot-password");
                    }}
                  >
                    <Text className="text-xs text-primary">
                      Zapomněli jste heslo?
                    </Text>
                  </Button>
                </View>
                <View className="relative">
                  <Input
                    className="bg-background pr-12"
                    ref={passwordInputRef}
                    id="password"
                    placeholder="Zadejte heslo"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onChangeText={setPassword}
                    value={password}
                    returnKeyType="send"
                    onSubmitEditing={signInWithEmail}
                    autoFocus={!canUseBiometric}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      className="text-muted-foreground"
                    />
                  </Pressable>
                </View>
              </View>

              {canUseBiometric && (
                <Button
                  variant="outline"
                  className="w-full flex-row gap-2"
                  onPress={handleBiometricLogin}
                  disabled={buttonLoading}
                >
                  <Ionicons
                    name="finger-print-outline"
                    size={20}
                    className="text-primary"
                  />
                  <Text>Přihlásit se biometrikou</Text>
                </Button>
              )}

              <Button
                className="w-full"
                onPress={signInWithEmail}
                disabled={buttonLoading}
              >
                <Text>Přihlásit se</Text>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onPress={() => router.replace("/(auth)/?skipAutoLogin=true")}
              >
                <Text className="text-muted-foreground">Změnit email</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
}
