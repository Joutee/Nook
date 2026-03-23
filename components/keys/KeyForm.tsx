import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Key } from "@/types/keys";

interface KeyFormProps {
  mode: "create" | "edit";
  keyId?: string;
  initialData?: Pick<Key, "name" | "description">;
}

export const KeyForm: React.FC<KeyFormProps> = ({
  mode,
  keyId,
  initialData,
}) => {
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast("Vyplňte název klíče", "error");
      return;
    }

    if (!currentFlat) {
      showToast("Není vybrán žádný byt", "error");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Nejste přihlášeni");

      if (isEditMode && keyId) {
        const { error } = await supabase
          .from("keys")
          .update({
            name: name.trim(),
            description: description.trim() || null,
          })
          .eq("id", keyId);

        if (error) throw error;
        showToast("Klíč aktualizován", "success");
      } else {
        const { error } = await supabase.from("keys").insert({
          name: name.trim(),
          description: description.trim() || null,
          flat_id: currentFlat.id,
          created_by: session.user.id,
          assigned_to: session.user.id,
        });

        if (error) throw error;
        showToast("Klíč přidán", "success");
      }

      router.back();
    } catch (error: any) {
      showToast("Chyba: " + error.message, "error");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
      <View className="flex-1 p-5 bg-background">
        <Card>
          <CardContent className="px-5">
            <Label nativeID="keyName" className="mb-2">
              Název klíče *
            </Label>
            <Input
              aria-labelledby="keyName"
              value={name}
              onChangeText={setName}
              placeholder="Např. Klíč od vchodu"
              className="mb-5"
            />

            <Label nativeID="keyDescription" className="mb-2">
              Popis (volitelné)
            </Label>
            <Input
              aria-labelledby="keyDescription"
              value={description}
              onChangeText={setDescription}
              placeholder="Např. Hlavní vstup do budovy"
              multiline
              numberOfLines={4}
              className="mb-5 h-24"
              style={{ textAlignVertical: "top" }}
            />

            <Button
              onPress={handleSubmit}
              disabled={isSaving}
              className="mb-3 bg-primary"
            >
              {isSaving ? (
                <ActivityIndicator className="text-foreground" />
              ) : (
                <Text>{isEditMode ? "Uložit změny" : "Přidat klíč"}</Text>
              )}
            </Button>

            <Button
              variant="outline"
              onPress={() => router.back()}
              disabled={isSaving}
              className="mt-2"
            >
              <Text>Zrušit</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
};
