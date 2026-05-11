import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errorTranslations";
import { saveUsedAccount } from "@/lib/biometricAuth";
import { View, TextInput, ScrollView, Pressable } from "react-native";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useToast } from "@/contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function Register() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const emailInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const surnameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  async function signUpWithEmail() {
    if (!email.trim()) {
      showToast("Zadejte email", "error");
      emailInputRef.current?.focus();
      return;
    }

    if (!name.trim()) {
      showToast("Zadejte jméno", "error");
      return;
    }

    if (!surname.trim()) {
      showToast("Zadejte příjmení", "error");
      surnameInputRef.current?.focus();
      return;
    }

    if (!password.trim()) {
      showToast("Zadejte heslo", "error");
      passwordInputRef.current?.focus();
      return;
    }

    if (password !== confirmPassword) {
      showToast(getErrorMessage("PASSWORDS_DO_NOT_MATCH"), "error");
      confirmPasswordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          surname: surname,
        },
      },
    });

    if (error) {
      showToast(getErrorMessage(error.message), "error");
      setLoading(false);
    } else {
      await saveUsedAccount(email);
      showToast("Ověřovací kód byl odeslán na váš e-mail", "success");
      setLoading(false);

      // Disabled for testing. Re-enable in Supabase Auth settings:
      // Sign In/Providers -> Confirm email.
      router.push(`/(auth)/verify-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
      }}
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Registrace</CardTitle>
          <CardDescription className="text-center">
            Vytvořte si nový účet
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInputRef}
                id="email"
                placeholder="email@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onChangeText={setEmail}
                value={email}
                maxLength={254}
                returnKeyType="next"
                onSubmitEditing={() => nameInputRef.current?.focus()}
              />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="name">Jméno</Label>
              <Input
                ref={nameInputRef}
                id="name"
                placeholder="Jan"
                autoCapitalize="words"
                onChangeText={setName}
                value={name}
                maxLength={50}
                returnKeyType="next"
                onSubmitEditing={() => surnameInputRef.current?.focus()}
              />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="surname">Příjmení</Label>
              <Input
                ref={surnameInputRef}
                id="surname"
                placeholder="Novák"
                autoCapitalize="words"
                onChangeText={setSurname}
                value={surname}
                maxLength={50}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="password">Heslo</Label>
              <View className="relative">
                <Input
                  ref={passwordInputRef}
                  id="password"
                  placeholder="Zadejte heslo"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onChangeText={setPassword}
                  value={password}
                  maxLength={128}
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    confirmPasswordInputRef.current?.focus()
                  }
                  className="pr-12"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-0 bottom-0 justify-center"
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="hsl(240, 5%, 64.9%)"
                  />
                </Pressable>
              </View>
            </View>

            <View className="gap-1.5">
              <Label htmlFor="confirmPassword">Potvrzení hesla</Label>
              <View className="relative">
                <Input
                  ref={confirmPasswordInputRef}
                  id="confirmPassword"
                  placeholder="Zadejte heslo znovu"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  onChangeText={setConfirmPassword}
                  value={confirmPassword}
                  maxLength={128}
                  returnKeyType="send"
                  onSubmitEditing={signUpWithEmail}
                  className="pr-12"
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
                    color="hsl(240, 5%, 64.9%)"
                  />
                </Pressable>
              </View>
            </View>

            <Button
              className="w-full"
              onPress={signUpWithEmail}
              disabled={loading}
            >
              <Text>Registrovat se</Text>
            </Button>
          </View>

          <Button
            variant="ghost"
            className="w-full"
            onPress={() => router.back()}
          >
            <Text className="text-muted-foreground">Zpět</Text>
          </Button>
        </CardContent>
      </Card>
    </KeyboardAwareScrollView>
  );
}
