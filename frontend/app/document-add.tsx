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
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer"; // Důležité: Import nové knihovny
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";

// Upravená funkce pro nahrávání
const uploadDocument = async (
  flatId: string,
  documentName: string,
  documentDescription: string,
) => {
  try {
    // 1. Otevřít výběr souboru
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true, // Toto musí být true
    });

    if (result.canceled) return false; // Vrátíme false, pokud zrušeno

    const file = result.assets[0];
    const fileName = file.name;
    const fileUri = file.uri;

    console.log("Vybrán soubor:", fileName);

    // 2. OPRAVA: Přečtení souboru pomocí FileSystem místo fetch
    // Přečteme soubor jako Base64 řetězec
    const base64 = await readAsStringAsync(fileUri, {
      // Místo složitého EncodingType.Base64 napiš jen string:
      encoding: "base64",
    });

    // Převedeme Base64 na ArrayBuffer (to Supabase miluje)
    const fileData = decode(base64);

    // 3. Vytvoření cesty
    // Nahradíme mezery v názvu, aby to nedělalo problémy v URL
    const safeFileName = fileName.replace(/\s+/g, "_");
    const filePath = `${flatId}/${Date.now()}_${safeFileName}`;

    // 4. Určení typu souboru (Fix pro octet-stream)
    let contentType = file.mimeType;
    if (!contentType || contentType === "application/octet-stream") {
      // Pokud systém neví, zkusíme odhadnout podle koncovky, nebo dáme PDF jako fallback
      if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))
        contentType = "image/jpeg";
      else if (fileName.endsWith(".png")) contentType = "image/png";
      else contentType = "application/pdf";
    }

    console.log("Nahrávám...", filePath, contentType);

    // 5. Odeslání do Supabase Storage
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(filePath, fileData, {
        contentType: contentType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase Storage Error:", error);
      throw error;
    }

    console.log("Nahráno do Storage:", data.path);

    // 6. Uložení informace do databáze (SQL tabulka)
    // Předpokládám, že máš tabulku 'documents'
    const { error: dbError } = await supabase.from("documents").insert({
      flat_id: flatId,
      path: data.path, // Ukládáme cestu, ne URL
      name: documentName || fileName, // Pokud uživatel nezadal název, použijeme název souboru
      description: documentDescription,
    });

    if (dbError) {
      console.error("Supabase DB Error:", dbError);
      throw dbError;
    }

    console.log("Dokument uložen do DB úspěšně");
    return true;
  } catch (error: any) {
    console.error("Kritická chyba při nahrávání:", error.message);
    throw error;
  }
};

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

    // Poznámka: Logic UX je trochu zvláštní - uživatel klikne "Nahrát" a teprve
    // pak vybírá soubor. Pokud to tak chceš, je to OK.
    // Lepší UX by bylo: 1. Tlačítko "Vybrat soubor", 2. Zobrazit jméno souboru, 3. Tlačítko "Odeslat".

    // Ale pro zachování tvé logiky:
    setIsUploading(true);
    try {
      // Pokud uživatel nezadá jméno, použijeme pak jméno souboru v upload funkci
      const result = await uploadDocument(
        currentFlat.id,
        documentName,
        documentDescription,
      );

      if (result) {
        showToast("Dokument úspěšně nahrán", "success");
        router.back();
      } else {
        // Uživatel zrušil výběr souboru
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

// ... styles zůstávají stejné ...
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
