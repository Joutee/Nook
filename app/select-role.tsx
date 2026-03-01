import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { useColorScheme } from "nativewind";

export default function SelectRole() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshFlats, currentFlat } = useFlatContext();
  const { showToast } = useToast();

  const handleSelectRole = async (role: "pronajimatel" | "najemce") => {
    if (!currentFlat?.id) {
      showToast("ID bytu není k dispozici", "error");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("Nejste přihlášeni", "error");
        setLoading(false);
        return;
      }

      // Aktualizovat roli v flat_profile
      const { error } = await supabase
        .from("flat_profile")
        .update({ role })
        .eq("flat_id", currentFlat.id)
        .eq("profile_id", user.id)
        .eq("active", true);

      if (error) {
        showToast("Nepodařilo se nastavit roli: " + error.message, "error");
        setLoading(false);
        return;
      }

      // Obnovit kontext - layout se postará o přesměrování
      await refreshFlats();
      setLoading(false);

      showToast("Úspěšně jste si vybrali roli!", "success");
    } catch (error: any) {
      showToast("Chyba: " + error.message, "error");
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background justify-center p-5">
      <Card className="max-w-md w-full mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Vyberte svou roli
          </CardTitle>
          <CardDescription className="text-center">
            Jak se vztahujete k tomuto bytu?
          </CardDescription>
        </CardHeader>

        <CardContent className="gap-4">
          <Button
            onPress={() => handleSelectRole("najemce")}
            disabled={loading}
            className="h-auto py-6"
          >
            <View className="items-center gap-2">
              <Ionicons name="home-outline" size={32} color="white" />
              <Text className="text-lg font-semibold text-primary-foreground">
                Bydlím zde
              </Text>
              <Text className="text-xs text-primary-foreground/80">
                Jsem nájemce tohoto bytu
              </Text>
            </View>
          </Button>

          <Button
            variant="outline"
            onPress={() => handleSelectRole("pronajimatel")}
            disabled={loading}
            className="h-auto py-6"
          >
            <View className="items-center gap-2">
              <Ionicons
                name="key-outline"
                size={32}
                color="hsl(270, 89.1%, 49%)"
              />
              <Text className="text-lg font-semibold">Pronajímám</Text>
              <Text className="text-xs text-muted-foreground">
                Jsem pronajímatel/majitel
              </Text>
            </View>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}
