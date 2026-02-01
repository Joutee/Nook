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
import { uploadDocument } from "../utils/documentUpload";

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
      const result = await uploadDocument(
        currentFlat.id,
        documentName,
        documentDescription,
      );

      if (result) {
        showToast("Dokument úspěšně nahrán", "success");
        router.back();
      } else {
        setIsUploading(false);
      }
    } catch (error: any) {
      showToast("Chyba při nahrávání: " + error.message, "error");
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

        <TouchableOpacity
          style={[styles.button, isUploading && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Vybrat a nahrát soubor</Text>
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
  },
  cancelButtonText: { color: "#333", fontSize: 18, fontWeight: "600" },
});
