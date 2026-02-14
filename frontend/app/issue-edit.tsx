import { ActivityIndicator, View, StyleSheet } from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../utils/supabase";
import { useToast } from "../contexts/ToastContext";
import { IssueForm } from "../components/IssueForm";

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
          console.error("Chyba při získávání podepsané URL:", signedUrlError);
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
      console.error("Error:", error);
      showToast("Nepodařilo se načíst závadu", "error");
      router.back();
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
