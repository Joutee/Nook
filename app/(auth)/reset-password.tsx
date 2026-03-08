import React, { useState, useRef } from "react";
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
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errorTranslations";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useToast } from "@/contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function ResetPassword() {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const newPasswordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  async function resendCode() {
    setButtonLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email as string,
    );

    if (error) {
      showToast(getErrorMessage(error.message), "error");
    } else {
      showToast("Kód byl odeslán znovu na váš email", "success");
    }

    setButtonLoading(false);
  }

  async function resetPassword() {
    if (!code) {
      showToast("Zadejte prosím kód z emailu", "error");
      return;
    }

    if (!newPassword || !confirmPassword) {
      showToast("Vyplňte prosím všechna pole", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Hesla se neshodují", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Heslo musí mít alespoň 6 znaků", "error");
      return;
    }

    setButtonLoading(true);

    // Nejdřív ověříme OTP kód a pak změníme heslo
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email as string,
      token: code,
      type: "recovery",
    });

    if (verifyError) {
      showToast("Neplatný nebo expirovaný kód", "error");
      setButtonLoading(false);
      return;
    }

    // Teď změníme heslo
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      showToast(getErrorMessage(error.message), "error");
      setButtonLoading(false);
    } else {
      showToast("Heslo bylo úspěšně změněno", "success");
      setButtonLoading(false);
      // Odhlásit uživatele a poslat ho na login
      await supabase.auth.signOut();
      router.replace("/(auth)/login");
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
            <CardTitle className="text-center text-2xl">
              Obnovení hesla
            </CardTitle>
            <CardDescription className="text-center">
              Zadejte kód z emailu a své nové heslo
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-6">
            <View className="gap-6">
              <View className="gap-1.5">
                <Label htmlFor="code">Ověřovací kód</Label>
                <Input
                  className="bg-background"
                  id="code"
                  placeholder="Zadejte 8-místný kód"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  onChangeText={setCode}
                  value={code}
                  maxLength={8}
                  returnKeyType="next"
                  onSubmitEditing={() => newPasswordInputRef.current?.focus()}
                />
              </View>

              <View className="gap-1.5">
                <Label htmlFor="newPassword">Nové heslo</Label>
                <View className="relative">
                  <Input
                    className="bg-background pr-12"
                    ref={newPasswordInputRef}
                    id="newPassword"
                    placeholder="Zadejte nové heslo"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    onChangeText={setNewPassword}
                    value={newPassword}
                    returnKeyType="next"
                    onSubmitEditing={() =>
                      confirmPasswordInputRef.current?.focus()
                    }
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      className="text-muted-foreground"
                    />
                  </Pressable>
                </View>
              </View>

              <View className="gap-1.5">
                <Label htmlFor="confirmPassword">Potvrzení hesla</Label>
                <View className="relative">
                  <Input
                    className="bg-background pr-12"
                    ref={confirmPasswordInputRef}
                    id="confirmPassword"
                    placeholder="Potvrďte nové heslo"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    onChangeText={setConfirmPassword}
                    value={confirmPassword}
                    returnKeyType="send"
                    onSubmitEditing={resetPassword}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      className="text-muted-foreground"
                    />
                  </Pressable>
                </View>
              </View>
              <Button
                variant="outline"
                className="w-full"
                onPress={resendCode}
                disabled={buttonLoading}
              >
                <Text className="text-center flex-1">Odeslat kód znovu</Text>
              </Button>

              <Button
                className="w-full"
                onPress={resetPassword}
                disabled={buttonLoading}
              >
                <Text className="text-center flex-1">Změnit heslo</Text>
              </Button>
            </View>

            <Button
              variant="secondary"
              className="w-full"
              onPress={() => router.replace("/login")}
            >
              <Text className="text-center flex-1">Zpět na přihlášení</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
}
