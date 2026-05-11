import React, { useState } from "react";
import { View, ActivityIndicator, Image, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { router } from "expo-router";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import {
  takePhoto,
  pickFile,
  uploadFile,
  compressImage,
} from "@/lib/fileService";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import DocumentViewerModal from "@/components/documents/DocumentViewerModal";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import logger from "@/lib/logger";

const DocumentAdd = () => {
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [documentName, setDocumentName] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [file, setFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size: number;
  } | null>(null);

  const handlePickFile = async () => {
    try {
      const file = await pickFile();
      if (file) {
        // Compress images; keep other files such as PDFs unchanged.
        if (file.mimeType.startsWith("image/")) {
          const compressed = await compressImage(file.uri);
          setFile({ ...file, uri: compressed });
        } else {
          setFile(file);
        }
      }
    } catch (error: any) {
      showToast("Chyba při výběru souboru: " + error.message, "error");
      logger.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!currentFlat) {
      showToast("Není vybrán žádný byt", "error");
      return;
    }

    if (!file) {
      showToast("Vyberte prosím soubor nebo vyfotěte dokument", "error");
      return;
    }

    setIsUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Nejste přihlášeni");

      const documentPath = await uploadFile({
        bucket: "documents",
        flatId: currentFlat.id,
        fileUri: file.uri,
        fileName: file.name,
        mimeType: file.mimeType,
      });

      const { error } = await supabase.from("documents").insert({
        flat_id: currentFlat.id,
        document_path: documentPath,
        name: documentName || file.name,
        description: documentDescription || null,
      });

      if (error) throw error;

      showToast("Dokument úspěšně nahrán", "success");
      router.back();
    } catch (error: any) {
      showToast("Chyba při nahrávání: " + error.message, "error");
      setIsUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photoUri = await takePhoto();
      if (photoUri) {
        const compressed = await compressImage(photoUri);
        const fileName = `photo_${Date.now()}.jpg`;
        setFile({
          uri: compressed,
          name: fileName,
          mimeType: "image/jpeg",
          size: 0,
        });
      }
    } catch (error: any) {
      showToast("Chyba při focení: " + error.message, "error");
      logger.error(error);
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
            <Label nativeID="documentName" className="mb-2">
              Název dokumentu (volitelné)
            </Label>
            <Input
              aria-labelledby="documentName"
              placeholder="např. Nájemní smlouva"
              value={documentName}
              onChangeText={setDocumentName}
              editable={!isUploading}
              className="mb-5"
            />

            <Label nativeID="documentDescription" className="mb-2">
              Popis (volitelné)
            </Label>
            <Input
              aria-labelledby="documentDescription"
              placeholder="Popis dokumentu..."
              value={documentDescription}
              onChangeText={setDocumentDescription}
              multiline
              numberOfLines={4}
              editable={!isUploading}
              className="mb-5 h-24"
              style={{ textAlignVertical: "top" }}
            />

            <Label nativeID="file" className="mb-4 mt-2">
              Soubor
            </Label>
            <View className="mb-5">
              {file ? (
                <Card className="bg-input">
                  <CardContent className="p-3">
                    {file.mimeType.startsWith("image/") && (
                      <Pressable
                        onPress={() => setViewerVisible(true)}
                        className="w-full mb-3"
                      >
                        <Image
                          source={{ uri: file.uri }}
                          className="w-full h-64 rounded-lg bg-background"
                        />
                      </Pressable>
                    )}
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={
                          file.mimeType.startsWith("image/")
                            ? "image"
                            : "document-text"
                        }
                        size={24}
                        className="text-foreground"
                      />
                      <Text className="text-base text-foreground flex-1">
                        {file.name}
                      </Text>
                    </View>
                    <Pressable
                      className="absolute top-2 right-2 bg-input rounded-full"
                      onPress={() => setFile(null)}
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
                    className="w-[48%] rounded-lg p-3 items-center justify-center bg-secondary active:opacity-60"
                    onPress={handleTakePhoto}
                    disabled={isUploading}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={22}
                      className="text-foreground"
                    />
                    <Text className="mt-1 text-sm text-foreground text-center font-semibold">
                      Vyfotit
                    </Text>
                  </Pressable>
                  <Pressable
                    className="w-[48%] rounded-lg p-3 items-center justify-center bg-secondary active:opacity-60"
                    onPress={handlePickFile}
                    disabled={isUploading}
                  >
                    <Ionicons
                      name="document-outline"
                      size={22}
                      className="text-foreground"
                    />
                    <Text className="mt-1 text-sm text-foreground text-center font-semibold">
                      Vybrat soubor
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
                <ActivityIndicator className="text-primary" />
              ) : (
                <Text>Nahrát dokument</Text>
              )}
            </Button>

            <Button
              variant="secondary"
              onPress={() => router.back()}
              disabled={isUploading}
              className="mt-2"
            >
              <Text>Zrušit</Text>
            </Button>
          </CardContent>
        </Card>

        {file?.mimeType.startsWith("image/") && (
          <DocumentViewerModal
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
            imageUri={file.uri}
            fileName={file.name}
          />
        )}
      </View>
    </KeyboardAwareScrollView>
  );
};

export default DocumentAdd;
