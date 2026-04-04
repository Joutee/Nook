import React, { useState, useEffect } from "react";
import { View } from "react-native";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useToast } from "@/contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { supabase } from "@/lib/supabase";
import {
  getDefaultUsedAccount,
  migrateLegacyBiometricCredentials,
} from "@/lib/biometricAuth";
import { configureGoogleSignIn, signInWithGoogle } from "@/lib/googleAuth";
import { getErrorMessage } from "@/lib/errorTranslations";

export default function AuthEntry() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true);
  const { showToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ skipAutoLogin?: string }>();

  useEffect(() => {
    checkForDefaultAccount();
  }, []);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  async function checkForDefaultAccount() {
    try {
      // Nejdřív migrovat stará data
      await migrateLegacyBiometricCredentials();

      // Pokud má parametr skipAutoLogin, nepřesměrovávat automaticky
      if (params.skipAutoLogin === "true") {
        setIsCheckingBiometric(false);
        return;
      }

      // Zkusit najít naposledy použitý účet
      const defaultAccount = await getDefaultUsedAccount();

      if (defaultAccount) {
        // Automaticky přesměrovat na login s naposledy použitým emailem
        router.replace(
          `/(auth)/login?email=${encodeURIComponent(defaultAccount.email)}`,
        );
        return;
      }

      // Žádný účet není uložený - zobrazit formulář pro email
    } catch (error) {
      console.log("Error checking for default account:", error);
    } finally {
      setIsCheckingBiometric(false);
    }
  }

  async function handleContinue() {
    if (!email.trim()) {
      showToast("Zadejte email", "error");
      return;
    }

    // Validace emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Zadejte platný email", "error");
      return;
    }

    setIsLoading(true);

    try {
      // Jednoduše přesměrujeme na login
      router.push(`/(auth)/login?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      console.log("Error:", error);
      showToast("Chyba při přesměrování", "error");
    } finally {
      setIsLoading(false);
    }
  }

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

  async function handleRegister() {
    setIsLoading(true);

    try {
      // Přesměrujeme na registraci (email je volitelný)
      const emailParam = email.trim()
        ? `?email=${encodeURIComponent(email)}`
        : "";
      router.push(`/(auth)/register${emailParam}`);
    } catch (error: any) {
      console.log("Error:", error);
      showToast("Chyba při přesměrování", "error");
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingBiometric) {
    return <View className="flex-1 bg-background" />;
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
            <CardTitle className="text-center text-2xl">Vítejte</CardTitle>
            <CardDescription className="text-center">
              Pro přihlášení zadejte email, nebo pokračujte k registraci
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-6">
            <View className="gap-6">
              <View className="gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  className="bg-background"
                  id="email"
                  placeholder="email@address.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  onChangeText={setEmail}
                  value={email}
                  returnKeyType="next"
                  onSubmitEditing={handleContinue}
                />
              </View>

              <View className="gap-3">
                <Button
                  className="w-full"
                  onPress={handleContinue}
                  disabled={isLoading}
                >
                  <Text>Přihlášení</Text>
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  <Text>Registrace</Text>
                </Button>
              </View>
            </View>

            <View className="flex-row items-center gap-4">
              <Separator className="flex-1" />
              <Text className="text-muted-foreground text-sm shrink-0 px-1">
                nebo
              </Text>
              <Separator className="flex-1" />
            </View>

            <Button
              variant="outline"
              className="w-full"
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Ionicons
                name="logo-google"
                size={20}
                className="text-foreground"
              />
              <Text>Pokračovat s Google</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
}
