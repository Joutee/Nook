import { View, Image, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import {
  compressImage,
  takePhoto,
  pickGalleryPhoto,
  uploadFile,
} from "../lib/fileService";
import DocumentViewerModal from "./DocumentViewerModal";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

interface IssueFormProps {
  mode: "create" | "edit";
  issueId?: string;
  initialData?: {
    title: string;
    description: string;
    imageUri: string | null;
    originalImagePath: string | null;
  };
}

export const IssueForm: React.FC<IssueFormProps> = ({
  mode,
  issueId,
  initialData,
}) => {
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [imageUri, setImageUri] = useState<string | null>(
    initialData?.imageUri || null,
  );
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(
    initialData?.originalImagePath || null,
  );

  const [isUploading, setIsUploading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setImageUri(initialData.imageUri);
      setOriginalImagePath(initialData.originalImagePath);
    }
  }, [initialData]);

  const handlePickImage = async () => {
    try {
      const uri = await pickGalleryPhoto();
      if (uri) {
        const compressed = await compressImage(uri);
        setImageUri(compressed);
      }
    } catch (error: any) {
      showToast("Chyba při výběru obrázku: " + error.message, "error");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const uri = await takePhoto();
      if (uri) {
        const compressed = await compressImage(uri);
        setImageUri(compressed);
      }
    } catch (error: any) {
      showToast("Chyba při focení: " + error.message, "error");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast("Vyplňte název závady", "error");
      return;
    }

    if (!currentFlat) {
      showToast("Není vybrán žádný byt", "error");
      return;
    }

    setIsUploading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Nejste přihlášeni");

      // === EDIT MODE ===
      if (isEditMode && issueId) {
        let finalImagePath: string | null = originalImagePath;

        // A) Uživatel vybral NOVÝ obrázek (imageUri je lokální cesta 'file://')
        if (imageUri && !imageUri.startsWith("http")) {
          // 1. Smažeme starý, pokud existoval
          if (originalImagePath) {
            await supabase.storage
              .from("issue-images")
              .remove([originalImagePath]);
          }

          // 2. Nahrajeme nový
          finalImagePath = await uploadFile({
            bucket: "issue-images",
            flatId: currentFlat.id,
            fileUri: imageUri,
            fileName: `issue_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
          });
        }
        // B) Uživatel ODSTRANIL obrázek (křížkem)
        else if (!imageUri && originalImagePath) {
          await supabase.storage
            .from("issue-images")
            .remove([originalImagePath]);
          finalImagePath = null;
        }
        // C) Pokud imageUri začíná na "http", uživatel obrázek nezměnil -> neděláme nic se storage

        // 3. Update databáze
        const { error } = await supabase
          .from("issues")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            image_path: finalImagePath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", issueId);

        if (error) throw error;
        showToast("Závada aktualizována", "success");
      }
      // === CREATE MODE ===
      else {
        let imagePath: string | null = null;

        if (imageUri) {
          imagePath = await uploadFile({
            bucket: "issue-images",
            flatId: currentFlat.id,
            fileUri: imageUri,
            fileName: `issue_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
          });
        }

        // Vložíme do databáze
        const { error } = await supabase.from("issues").insert({
          title: title.trim(),
          description: description.trim() || null,
          image_path: imagePath,
          flat_id: currentFlat.id,
          profile_id: session.user.id,
          status: "new",
        });

        if (error) throw error;
        showToast("Závada nahlášena", "success");
      }

      router.back();
    } catch (error: any) {
      showToast("Chyba: " + error.message, "error");
      console.error(error);
    } finally {
      setIsUploading(false);
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
            <Label nativeID="title" className="mb-2">
              Název závady *
            </Label>
            <Input
              aria-labelledby="title"
              value={title}
              onChangeText={setTitle}
              placeholder="Např. Nefunguje topení"
              className="mb-5"
            />

            <Label nativeID="description" className="mb-2">
              Popis (volitelné)
            </Label>
            <Input
              aria-labelledby="description"
              value={description}
              onChangeText={setDescription}
              placeholder="Popište problém..."
              multiline
              numberOfLines={4}
              className="mb-5 h-24"
              style={{ textAlignVertical: "top" }}
            />

            <Label nativeID="photo" className="mb-4 mt-2">
              Fotografie (volitelné)
            </Label>
            <View className="mb-5">
              {imageUri ? (
                <Card className="bg-input">
                  <CardContent className="p-3">
                    <Pressable
                      onPress={() => setViewerVisible(true)}
                      className="w-full mb-3"
                    >
                      <Image
                        source={{ uri: imageUri }}
                        className="w-full h-64 rounded-lg bg-background"
                      />
                    </Pressable>
                    <Pressable
                      className="absolute top-2 right-2 bg-input rounded-full"
                      onPress={() => setImageUri(null)}
                    >
                      <Ionicons
                        name="close-circle"
                        size={32}
                        className="text-destructive"
                      />
                    </Pressable>
                  </CardContent>
                </Card>
              ) : (
                <View className="flex-row justify-between">
                  <Pressable
                    className="w-[48%] border-2 border-primary rounded-lg p-5 items-center bg-secondary active:opacity-60"
                    onPress={handleTakePhoto}
                  >
                    <Ionicons
                      name="camera"
                      size={32}
                      className="text-primary"
                    />
                    <Text className="mt-2 text-base text-primary font-semibold">
                      Vyfotit
                    </Text>
                  </Pressable>
                  <Pressable
                    className="w-[48%] border-2 border-primary rounded-lg p-5 items-center bg-secondary active:opacity-60"
                    onPress={handlePickImage}
                  >
                    <Ionicons
                      name="images"
                      size={32}
                      className="text-primary"
                    />
                    <Text className="mt-2 text-base text-primary font-semibold">
                      Z galerie
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <Button
              onPress={handleSubmit}
              disabled={isUploading}
              className="mb-3 bg-primary"
            >
              {isUploading ? (
                <ActivityIndicator className="text-foreground" />
              ) : (
                <Text>{isEditMode ? "Uložit změny" : "Odeslat"}</Text>
              )}
            </Button>

            <Button
              variant="outline"
              onPress={() => router.back()}
              disabled={isUploading}
              className="mt-2"
            >
              <Text>Zrušit</Text>
            </Button>
          </CardContent>
        </Card>

        <DocumentViewerModal
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          imageUri={imageUri}
          fileName="Náhled fotografie"
        />
      </View>
    </KeyboardAwareScrollView>
  );
};
