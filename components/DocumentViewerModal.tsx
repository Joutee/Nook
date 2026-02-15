import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { Text } from "@/components/ui/text"
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons"; // Pro křížek na zavření
import { supabase } from "../utils/supabase";

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
      console.error("Chyba při načítání dokumentu:", err);
    } finally {
      setLoading(false);
    }
  };

  // Funkce pro renderování obsahu
  // Funkce pro renderování obsahu
  const renderContent = () => {
    // 1. ZMĚNA: Loading ikona je nyní obalená ve View s centrováním
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    if (!url) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Nepodařilo se načíst dokument.</Text>
        </View>
      );
    }

    if (fileType === "image") {
      return (
        <Image
          source={{ uri: url }}
          style={styles.image}
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
          style={styles.webview}
          startInLoadingState={true}
          // 2. ZMĚNA: I při načítání samotného PDF (WebView) to bude uprostřed
          renderLoading={() => (
            <View
              style={[
                styles.center,
                { position: "absolute", height: "100%", width: "100%" },
              ]}
            >
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
        />
      );
    }

    return (
      <View style={styles.center}>
        <Text>Tento typ souboru nelze zobrazit v náhledu.</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Hlavička s tlačítkem Zavřít */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {fileName || "Dokument"}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Obsah */}
        <View style={styles.content}>{renderContent()}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 18, fontWeight: "bold", maxWidth: "80%" },
  closeButton: { padding: 5 },
  content: { flex: 1, backgroundColor: "#f5f5f5" },
  image: { flex: 1, width: "100%", height: "100%" },
  webview: { flex: 1 },
  errorText: { textAlign: "center", marginTop: 50, color: "red" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
