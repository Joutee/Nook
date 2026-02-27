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
import { Separator } from "@/components/ui/separator";
import { supabase } from "../utils/supabase";
import { getErrorMessage } from "../utils/errorTranslations";
import { useRouter } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);
  const { colorScheme } = useColorScheme();

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function signInWithEmail() {
    setButtonLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) showToast(getErrorMessage(error.message), "error");
    else showToast("Přihlášení bylo úspěšné", "success");

    setButtonLoading(false);
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20} // O kolik výš nad klávesnici se má input posunout
    >
      <View className="flex-1 bg-background justify-center p-5">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Přihlášení</CardTitle>
            <CardDescription className="text-center">
              Vítejte zpět! Přihlaste se prosím k pokračování
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
                  onSubmitEditing={onEmailSubmitEditing}
                  returnKeyType="next"
                />
              </View>

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

              <Button
                className="w-full"
                onPress={signInWithEmail}
                disabled={buttonLoading}
              >
                <Text>Přihlásit se</Text>
              </Button>
            </View>

            <Button
              variant="secondary"
              className="w-full"
              onPress={() => router.push("/register")}
            >
              <Text className="text-foreground">Registrovat se</Text>
            </Button>

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
              onPress={() => {
                // TODO: Implement Google OAuth
              }}
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
