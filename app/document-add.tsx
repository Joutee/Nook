import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { Text } from "@/components/ui/text"
import { router } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import {
  takePhoto,
  pickFile,
  uploadFile,
  compressImage,
} from "../utils/fileService";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../utils/supabase";
import DocumentViewerModal from "../components/DocumentViewerModal";

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
        // Pokud je to obrázek, zkomprimuj ho, jinak (např. PDF) použij originál
        if (file.mimeType.startsWith("image/")) {
          const compressed = await compressImage(file.uri);
          setFile({ ...file, uri: compressed });
        } else {
          setFile(file);
        }
      }
    } catch (error: any) {
      showToast("Chyba při výběru souboru: " + error.message, "error");
      console.error(error);
    }
  };

  const handleSubmit = async () => {
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

      if (!file) {
        setIsUploading(false);
        return;
      }

      // Nahrajeme soubor do storage
      const documentPath = await uploadFile({
        bucket: "documents",
        flatId: currentFlat.id,
        fileUri: file.uri,
        fileName: file.name,
        mimeType: file.mimeType,
      });

      // Přidáme záznam do databáze
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
          size: 0, // velikost není k dispozici při přímém focení
        });
      }
    } catch (error: any) {
      showToast("Chyba při focení: " + error.message, "error");
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Přidat dokument</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Název dokumentu (volitelné)</Text>
        <TextInput
          style={styles.input}
          placeholder="např. Nájemní smlouva"
          value={documentName}
          onChangeText={setDocumentName}
          editable={!isUploading}
        />

        <Text style={styles.label}>Popis (volitelné)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Popis dokumentu..."
          value={documentDescription}
          onChangeText={setDocumentDescription}
          multiline
          numberOfLines={4}
          editable={!isUploading}
        />

        <Text style={styles.sectionTitle}>Soubor (volitelné)</Text>
        <View style={styles.fileSection}>
          {file ? (
            <View style={styles.filePreview}>
              {file.mimeType.startsWith("image/") && (
                <TouchableOpacity
                  onPress={() => setViewerVisible(true)}
                  activeOpacity={0.8}
                  style={{ width: "100%" }}
                >
                  <Image source={{ uri: file.uri }} style={styles.image} />
                </TouchableOpacity>
              )}
              <View style={styles.fileInfo}>
                <Ionicons
                  name={
                    file.mimeType.startsWith("image/") ? "image" : "document"
                  }
                  size={24}
                  color="#007AFF"
                />
                <Text style={styles.fileName}>{file.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeFileButton}
                onPress={() => setFile(null)}
              >
                <Ionicons name="close-circle" size={32} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fileButtons}>
              <TouchableOpacity
                style={styles.fileButton}
                onPress={handleTakePhoto}
                disabled={isUploading}
              >
                <Ionicons name="camera" size={32} color="#007AFF" />
                <Text style={styles.fileButtonText}>Vyfotit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fileButton}
                onPress={handlePickFile}
                disabled={isUploading}
              >
                <Ionicons name="document" size={32} color="#007AFF" />
                <Text style={styles.fileButtonText}>Vybrat soubor</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!file || isUploading) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Nahrát dokument</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, isUploading && styles.buttonDisabled]}
          onPress={() => router.back()}
          disabled={isUploading}
        >
          <Text style={styles.cancelButtonText}>Zrušit</Text>
        </TouchableOpacity>
      </View>

      {file?.mimeType.startsWith("image/") && (
        <DocumentViewerModal
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          imageUri={file.uri}
          fileName={file.name}
        />
      )}
    </View>
  );
};

export default DocumentAdd;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  form: { flex: 1 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    marginTop: 10,
    color: "#333",
  },
  fileSection: {
    marginBottom: 20,
  },
  fileButtons: {
    flexDirection: "row",
    width: "100%", // 1. Zaručí, že kontejner drží šířku
    justifyContent: "space-between", // 2. Roztáhne tlačítka od sebe (nahrazuje gap)
    // gap: 16,                    // SMAZAT (pro jistotu, space-between je bezpečnější)
  },
  fileButton: {
    width: "48%", // 3. Pevná šířka (ignoruje délku textu uvnitř)
    // flexBasis: 0,               // SMAZAT
    // flexGrow: 1,                // SMAZAT
    // flexShrink: 1,              // SMAZAT
    // flex: 1,                    // SMAZAT

    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#F0F8FF",
  },
  fileButtonText: {
    marginTop: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  filePreview: {
    position: "relative",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    marginBottom: 12,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fileName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  removeFileButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: { color: "#333", fontSize: 18, fontWeight: "600" },
});
