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
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
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
      const { data, error } = await supabase.rpc("join_flat_by_code", {
        flat_code: code.trim(),
      });

      if (error) {
        showToast("Nepodařilo se připojit k bytu", "error");
        setLoading(false);
        return;
      }

      if (data.error === "flat_not_found") {
        showToast("Byt s tímto kódem neexistuje", "error");
        setLoading(false);
        return;
      }

      if (data.error === "already_member") {
        showToast("Už jste aktivním členem tohoto bytu", "info");
        setLoading(false);
        return;
      }

      if (data.error === "not_authenticated") {
        showToast("Nejste přihlášeni", "error");
        setLoading(false);
        return;
      }

      if (data.success && data.flat) {
        setCurrentFlat(data.flat);
        await refreshFlats();
        showToast(
          data.is_rejoining
            ? "Úspěšně jste se znovu připojili k bytu!"
            : "Úspěšně jste se připojili k bytu!",
          "success",
        );
      }
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
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
                  onPress={() => router.push("/(setup)/create-flat")}
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
