import React, { useState, useRef, useEffect } from "react";
import { View, TextInput } from "react-native";
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
import { useToast } from "@/contexts/ToastContext";

interface EmailVerificationProps {
  mode: "change" | "verify";
  email?: string; // Pro verify mód
  currentEmail?: string; // Pro change mód - kontrola duplikátu
  onSuccess: () => void;
}

export default function EmailVerification({
  mode,
  email: initialEmail,
  currentEmail,
  onSuccess,
}: EmailVerificationProps) {
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">(
    mode === "verify" ? "code" : "email",
  );
  const [loading, setLoading] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState(
    initialEmail || "",
  );

  const { showToast } = useToast();
  const codeInputRef = useRef<TextInput>(null);

  // Pro verify mód - nastavit step na "code" při načtení
  useEffect(() => {
    if (mode === "verify" && initialEmail && step !== "code") {
      setStep("code");
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    }
  }, [mode, initialEmail]);

  // Odeslat verifikační kód (pro verify mód)
  const sendVerificationCode = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      showToast(getErrorMessage(error.message), "error");
    } else {
      showToast("Ověřovací kód byl odeslán na váš e-mail", "success");
      setStep("code");
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    }
    setLoading(false);
  };

  // Požádat o změnu e-mailu (pro change mód)
  const handleRequestChange = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      showToast("Zadejte platný nový e-mail", "error");
      return;
    }

    if (currentEmail && newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      showToast("Tento e-mail již používáte", "error");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      showToast(getErrorMessage(error.message), "error");
    } else {
      showToast("Kód byl odeslán na nový e-mail", "success");
      setEmailForVerification(newEmail);
      setStep("code");
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    }
    setLoading(false);
  };

  // Ověřit kód
  const handleVerifyCode = async () => {
    if (!code || code.length < 8) {
      showToast("Zadejte platný kód", "error");
      return;
    }

    setLoading(true);

    const verifyEmail = mode === "verify" ? emailForVerification : newEmail;

    const { error } = await supabase.auth.verifyOtp({
      email: verifyEmail,
      token: code,
      type: mode === "verify" ? "signup" : "email_change",
    });

    if (error) {
      showToast("Neplatný nebo vypršelý kód", "error");
      setLoading(false);
    } else {
      showToast(
        mode === "verify"
          ? "E-mail byl úspěšně ověřen!"
          : "E-mail byl úspěšně změněn!",
        "success",
      );
      setLoading(false);
      onSuccess();
    }
  };

  // Znovu odeslat kód
  const handleResendCode = async () => {
    if (mode === "verify") {
      await sendVerificationCode(emailForVerification);
    } else {
      await handleRequestChange();
    }
  };

  const getTitle = () => {
    if (mode === "verify") return "Ověření e-mailu";
    return "Změna e-mailu";
  };

  const getDescription = () => {
    if (mode === "verify" && step === "code") {
      return `Zadejte 8místný kód, který jsme zaslali na ${emailForVerification}`;
    }
    if (mode === "change" && step === "email") {
      return "Zadejte vaši novou e-mailovou adresu.";
    }
    if (mode === "change" && step === "code") {
      return `Zadejte 8místný kód, který jsme zaslali na ${newEmail}`;
    }
    return "";
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-center text-2xl">{getTitle()}</CardTitle>
        <CardDescription className="text-center">
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-6">
        {step === "email" && mode === "change" ? (
          // --- FORMULÁŘ: ZADÁNÍ NOVÉHO E-MAILU ---
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="newEmail">Nová e-mailová adresa</Label>
              <Input
                className="bg-background"
                id="newEmail"
                placeholder="novy@email.cz"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
                maxLength={254}
                onSubmitEditing={handleRequestChange}
                autoFocus
              />
            </View>
            <Button
              className="w-full"
              onPress={handleRequestChange}
              disabled={loading}
            >
              <Text>Pokračovat</Text>
            </Button>
          </View>
        ) : (
          // --- FORMULÁŘ: OVĚŘENÍ KÓDU ---
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="code">Ověřovací kód</Label>
              <Input
                className="bg-background"
                ref={codeInputRef}
                id="code"
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={8}
                value={code}
                onChangeText={setCode}
                onSubmitEditing={handleVerifyCode}
                autoFocus={mode === "verify"}
              />
            </View>
            <Button
              className="w-full"
              onPress={handleVerifyCode}
              disabled={loading}
            >
              <Text>
                {mode === "verify" ? "Ověřit e-mail" : "Ověřit a změnit e-mail"}
              </Text>
            </Button>

            {mode === "change" && (
              <Button
                variant="ghost"
                className="w-full"
                onPress={() => setStep("email")}
                disabled={loading}
              >
                <Text>Zadat jiný e-mail</Text>
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full"
              onPress={handleResendCode}
              disabled={loading}
            >
              <Text>Odeslat kód znovu</Text>
            </Button>
          </View>
        )}
      </CardContent>
    </Card>
  );
}
