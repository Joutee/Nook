import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "../utils/supabase";
import { useRouter } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

interface JoinFlatFormProps {
  showCreateOption?: boolean;
  onSuccess?: () => void;
}

export default function JoinFlatForm({
  showCreateOption = true,
  onSuccess,
}: JoinFlatFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshFlats, setCurrentFlat } = useFlatContext();
  const { showToast } = useToast();

  const handleJoinFlat = async () => {
    if (!code.trim()) {
      showToast("Zadejte kód bytu", "error");
      return;
    }

    setLoading(true);

    try {
      // Najít byt podle kódu
      const { data: flat, error: flatError } = await supabase
        .from("flats")
        .select("id")
        .eq("code", code.trim())
        .single();

      if (flatError || !flat) {
        showToast("Byt s tímto kódem neexistuje", "error");
        setLoading(false);
        return;
      }

      // Získat aktuálního uživatele
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("Nejste přihlášeni", "error");
        setLoading(false);
        return;
      }

      // Zkontrolovat, jestli uživatel už není v tomto bytě
      const { data: existingMembership } = await supabase
        .from("flat_profile")
        .select("id")
        .eq("flat_id", flat.id)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (existingMembership) {
        showToast("Už jste členem tohoto bytu", "info");
        setLoading(false);
        return;
      }

      // Přidat uživatele do bytu (flat_profile)
      const { error: joinError } = await supabase.from("flat_profile").insert({
        flat_id: flat.id,
        profile_id: user.id,
        role: null, // Nastaví se na další obrazovce
      });

      if (joinError) {
        showToast(
          "Nepodařilo se přidat do bytu: " + joinError.message,
          "error",
        );
        setLoading(false);
        return;
      }

      // Načíst kompletní info o bytu a nastavit jako currentFlat
      const { data: flatData, error: flatDataError } = await supabase
        .from("flats")
        .select("id, name, address")
        .eq("id", flat.id)
        .single();

      if (!flatDataError && flatData) {
        setCurrentFlat(flatData);
      }

      // Obnovit kontext - layout se postará o přesměrování
      await refreshFlats();
      setLoading(false);
      showToast("Úspěšně jste se připojili k bytu!", "success");
    } catch (error: any) {
      showToast(error.message, "error");
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20} // O kolik výš nad klávesnici se má input posunout
    >
      <View className="flex-1 bg-background justify-center p-5">
        <Card className="max-w-md w-full mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Připojit se k bytu
            </CardTitle>
            <CardDescription className="text-center">
              Zadejte kód bytu, ke kterému se chcete připojit
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-4">
            <View className="gap-2">
              <Label>Kód bytu</Label>
              <Input
                placeholder="Kód bytu"
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <Button onPress={handleJoinFlat} disabled={loading}>
              <Text>{loading ? "Připojování..." : "Připojit se"}</Text>
            </Button>

            {showCreateOption && (
              <>
                <View className="flex-row items-center gap-4">
                  <Separator className="flex-1" />
                  <Text className="text-muted-foreground text-sm shrink-0 px-1">
                    nebo
                  </Text>
                  <Separator className="flex-1" />
                </View>

                <Button
                  variant="outline"
                  onPress={() => router.push("/create-flat")}
                  disabled={loading}
                >
                  <Text>Vytvořit novou domácnost</Text>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
}
