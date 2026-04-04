import { ActivityIndicator, View } from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { KeyForm } from "@/components/keys/KeyForm";
import { Key } from "@/types/keys";
import logger from "@/lib/logger";

const KeyEdit = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<Pick<
    Key,
    "name" | "description"
  > | null>(null);

  useEffect(() => {
    if (id) {
      loadKeyData();
    }
  }, [id]);

  const loadKeyData = async () => {
    if (!id) return;

    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("keys")
        .select("name, description")
        .eq("id", id)
        .single();

      if (error) {
        showToast("Nepodařilo se načíst klíč: " + error.message, "error");
        router.back();
        return;
      }

      setInitialData({
        name: data.name,
        description: data.description,
      });
    } catch (error) {
      logger.error("Error:", error);
      showToast("Nepodařilo se načíst klíč", "error");
      router.back();
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoadingData) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  if (!initialData) return null;

  return <KeyForm key={id} mode="edit" keyId={id} initialData={initialData} />;
};

export default KeyEdit;
