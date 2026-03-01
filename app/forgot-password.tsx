import React, { useState } from "react";
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
import { supabase } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorTranslations";
import { useRouter } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function sendResetCode() {
    if (!email) {
      showToast("Zadejte prosím email", "error");
      return;
    }

    setButtonLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      showToast(getErrorMessage(error.message), "error");
      setButtonLoading(false);
    } else {
      showToast("Kód byl odeslán na váš email", "success");
      setButtonLoading(false);
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
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
              Zapomenuté heslo
            </CardTitle>
            <CardDescription className="text-center">
              Zadejte svůj email a pošleme vám kód pro obnovení hesla
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
                  onSubmitEditing={sendResetCode}
                  returnKeyType="send"
                />
              </View>

              <Button
                className="w-full"
                onPress={sendResetCode}
                disabled={buttonLoading}
              >
                <Text>Odeslat kód</Text>
              </Button>
            </View>

            <Button
              variant="secondary"
              className="w-full"
              onPress={() => router.replace("/login")}
            >
              <Text className="text-foreground text-center flex-1">
                Zpět na přihlášení
              </Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
}
