import { ActivityIndicator, View } from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { IssueForm } from "@/components/issues/IssueForm";
import logger from "@/lib/logger";

const IssueEdit = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<{
    title: string;
    description: string;
    imageUri: string | null;
    originalImagePath: string | null;
  } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      loadIssueData();
    }
  }, [id]);

  const loadIssueData = async () => {
    if (!id) return;

    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        showToast("Nepodařilo se načíst závadu: " + error.message, "error");
        router.back();
        return;
      }

      let imageUri: string | null = null;

      // Načteme URL pro zobrazení existujícího obrázku
      if (data.image_path) {
        const { data: urlData, error: signedUrlError } = await supabase.storage
          .from("issue-images")
          .createSignedUrl(data.image_path, 3600);

        if (signedUrlError) {
          logger.error("Chyba při získávání podepsané URL:", signedUrlError);
        }

        if (urlData?.signedUrl) {
          imageUri = urlData.signedUrl;
        }
      }

      setInitialData({
        title: data.title,
        description: data.description || "",
        imageUri: imageUri,
        originalImagePath: data.image_path,
      });
    } catch (error) {
      logger.error("Error:", error);
      showToast("Nepodařilo se načíst závadu", "error");
      router.back();
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoadingData) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(270, 89.1%, 49%)" />
      </View>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <IssueForm key={id} mode="edit" issueId={id} initialData={initialData} />
  );
};

export default IssueEdit;
