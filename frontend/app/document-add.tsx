import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { takePhoto, pickFile, uploadFile } from "../utils/fileService";
import { Ionicons } from "@expo/vector-icons";

const DocumentAdd = () => {
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [documentName, setDocumentName] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!currentFlat) {
      showToast("Není vybrán žádný byt", "error");
      return;
    }

    setIsUploading(true);
    try {
      const file = await pickFile();

      if (!file) {
        setIsUploading(false);
        return;
      }

      await uploadFile({
        bucket: "documents",
        flatId: currentFlat.id,
        fileUri: file.uri,
        fileName: file.name,
        mimeType: file.mimeType,
        tableName: "documents",
        pathColumnName: "document_path",
        additionalData: {
          name: documentName || file.name,
          description: documentDescription,
        },
      });

      showToast("Dokument úspěšně nahrán", "success");
      router.back();
    } catch (error: any) {
      showToast("Chyba při nahrávání: " + error.message, "error");
      setIsUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!currentFlat) {
      showToast("Není vybrán žádný byt", "error");
      return;
    }

    setIsUploading(true);
    try {
      const photoUri = await takePhoto();

      if (!photoUri) {
        setIsUploading(false);
        return;
      }

      const fileName = `photo_${Date.now()}.jpg`;

      await uploadFile({
        bucket: "documents",
        flatId: currentFlat.id,
        fileUri: photoUri,
        fileName: fileName,
        mimeType: "image/jpeg",
        tableName: "documents",
        pathColumnName: "document_path",
        additionalData: {
          name: documentName || fileName,
          description: documentDescription,
        },
      });

      showToast("Dokument úspěšně nahrán", "success");
      router.back();
    } catch (error: any) {
      showToast("Chyba při fotografování: " + error.message, "error");
      setIsUploading(false);
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

        <Text style={styles.sectionTitle}>Vyberte způsob přidání</Text>

        <TouchableOpacity
          style={[styles.button, isUploading && styles.buttonDisabled]}
          onPress={handleTakePhoto}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.buttonText}>Vyfotit dokument</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonSecondary, isUploading && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="document" size={24} color="#007AFF" />
              <Text style={styles.buttonSecondaryText}>Nahrát ze souboru</Text>
            </View>
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
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  buttonSecondaryText: { color: "#007AFF", fontSize: 18, fontWeight: "600" },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: { color: "#333", fontSize: 18, fontWeight: "600" },
});
