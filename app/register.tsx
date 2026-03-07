import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorTranslations";
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
import { Separator } from "@/components/ui/separator";
import { useRouter } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const { colorScheme } = useColorScheme();

  const surnameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  async function signUpWithEmail() {
    if (password !== confirmPassword) {
      showToast(getErrorMessage("PASSWORDS_DO_NOT_MATCH"), "error");
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
      showToast("Ověřovací kód byl odeslán na váš e-mail", "success");
      setLoading(false);

      //pro testovani vypnuto

      //je potreba to zapnout v supabase auth settings -> Sign In/Providers -> Confirm email
      // Přesměrování na stránku pro ověření e-mailu
      //router.push(`verify-email?email=${encodeURIComponent(email)}`);
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
      extraScrollHeight={20} // O kolik výš nad klávesnici se má input posunout
    >
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Registrace</CardTitle>
          <CardDescription className="text-center">
            Vytvořte si účet a začněte používat aplikaci
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="name">Jméno</Label>
              <Input
                id="name"
                placeholder="Jan"
                autoCapitalize="words"
                onChangeText={setName}
                value={name}
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
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
              />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInputRef}
                id="email"
                placeholder="email@address.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onChangeText={setEmail}
                value={email}
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
            className="w-full h-auto "
            onPress={() => router.push("/login")}
          >
            <Text className="text-foreground w-full text-center">
              Zpět na přihlášení
            </Text>
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
    </KeyboardAwareScrollView>
  );
}
