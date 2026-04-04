import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
} from "react-native";
import { Text } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons"; // Pro křížek na zavření
import { supabase } from "@/lib/supabase";
import logger from "@/lib/logger";

type Props = {
  visible: boolean;
  onClose: () => void;
  filePath?: string | null; // Cesta v Supabase (např. "flat_1/smlouva.pdf")
  imageUri?: string | null; // Přímé URI pro lokální obrázky (před nahráním)
  fileName?: string;
};

export default function DocumentViewerModal({
  visible,
  onClose,
  filePath,
  imageUri,
  fileName,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileType, setFileType] = useState<"image" | "pdf" | "unknown">(
    "unknown",
  );

  // Načtení URL ze Supabase při otevření
  useEffect(() => {
    // Pokud máme přímé imageUri, použijeme ho rovnou
    if (visible && imageUri) {
      setUrl(imageUri);
      setFileType("image");
      setLoading(false);
    } else if (visible && filePath) {
      loadDocumentUrl();
    } else {
      // Reset při zavření
      setUrl(null);
      setLoading(true);
    }
  }, [visible, filePath, imageUri]);

  const loadDocumentUrl = async () => {
    if (!filePath) return;
    setLoading(true);

    try {
      // 1. Zjistíme typ souboru podle koncovky
      const lowerPath = filePath.toLowerCase();
      if (lowerPath.endsWith(".pdf")) setFileType("pdf");
      else if (lowerPath.match(/\.(jpg|jpeg|png|heic|webp)$/))
        setFileType("image");
      else setFileType("unknown");

      // 2. Získáme podepsanou URL (platnou 1 hodinu)
      const { data, error } = await supabase.storage
        .from("documents") // Tvůj bucket
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      if (data?.signedUrl) setUrl(data.signedUrl);
    } catch (err) {
      logger.error("Chyba při načítání dokumentu:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="hsl(270, 89.1%, 49%)" />
        </View>
      );
    }

    if (!url) {
      return (
        <View className="flex-1 justify-center items-center">
          <Text className="text-destructive text-center">
            Nepodařilo se načíst dokument.
          </Text>
        </View>
      );
    }

    if (fileType === "image") {
      return (
        <Image
          source={{ uri: url }}
          className="flex-1 w-full h-full"
          resizeMode="contain"
        />
      );
    }

    if (fileType === "pdf") {
      const pdfUrl =
        Platform.OS === "android"
          ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`
          : url;

      return (
        <WebView
          source={{ uri: pdfUrl }}
          className="flex-1"
          startInLoadingState={true}
          renderLoading={() => (
            <View className="absolute h-full w-full justify-center items-center">
              <ActivityIndicator size="large" color="hsl(270, 89.1%, 49%)" />
            </View>
          )}
        />
      );
    }

    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-muted-foreground">
          Tento typ souboru nelze zobrazit v náhledu.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-background">
        {/* Hlavička s tlačítkem Zavřít */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
          <Text
            className="text-lg font-bold text-foreground max-w-[80%]"
            numberOfLines={1}
          >
            {fileName || "Dokument"}
          </Text>
          <Pressable onPress={onClose} className="p-1">
            <Ionicons name="close" size={28} className="text-foreground" />
          </Pressable>
        </View>

        {/* Obsah */}
        <View className="flex-1 bg-muted/30">{renderContent()}</View>
      </SafeAreaView>
    </Modal>
  );
}
