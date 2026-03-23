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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errorTranslations";
import { useToast } from "@/contexts/ToastContext";

interface PasswordVerificationProps {
  onVerified: (password?: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  returnPassword?: boolean; // Nová prop pro vrácení hesla
}

export default function PasswordVerification({
  onVerified,
  onCancel,
  title = "Ověření totožnosti",
  description = "Pro pokračování zadejte své heslo",
  returnPassword = false, // Default je false pro zpětnou kompatibilitu
}: PasswordVerificationProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();
  const passwordInputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    if (!password) {
      showToast("Zadejte prosím heslo", "error");
      return;
    }

    setLoading(true);

    // Získat aktuálního uživatele
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      showToast("Nepodařilo se ověřit uživatele", "error");
      setLoading(false);
      return;
    }

    // Ověřit heslo přihlášením
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (error) {
      showToast(getErrorMessage(error.message), "error");
      setLoading(false);
    } else {
      showToast("Heslo bylo ověřeno", "success");
      setLoading(false);
      // Volitelně vrátí heslo, pokud je to požadováno
      onVerified(returnPassword ? password : undefined);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-center text-2xl">{title}</CardTitle>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-6">
        <View className="gap-1.5">
          <Label htmlFor="password">Heslo</Label>
          <View className="relative">
            <Input
              className="bg-background pr-12"
              ref={passwordInputRef}
              id="password"
              placeholder="Zadejte své heslo"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleVerify}
              autoFocus
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

        <Button className="w-full" onPress={handleVerify} disabled={loading}>
          <Text>Ověřit</Text>
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onPress={onCancel}
          disabled={loading}
        >
          <Text className="text-foreground">Zrušit</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
