import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import React, { useState, useCallback } from "react";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import {
  compressImage,
  takePhoto,
  pickGalleryPhoto,
  uploadFile,
} from "../utils/fileService";
import DocumentViewerModal from "../components/DocumentViewerModal";

const IssueCreate = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  // NOVÉ: Musíme si pamatovat původní cestu v DB, abychom ji mohli smazat
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(
    null,
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  const isEditMode = !!id;

  const loadIssue = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setDescription(data.description || "");

        // Uložíme si původní cestu (např. "folder/image.jpg") pro pozdější mazání
        setOriginalImagePath(data.image_path);

        // Načteme URL pro zobrazení existujícího obrázku
        if (data.image_path) {
          // Druhý parametr (3600) je platnost odkazu v sekundách (např. 1 hodina)
          const { data: urlData, error: signedUrlError } =
            await supabase.storage
              .from("issue-images")
              .createSignedUrl(data.image_path, 3600);

          if (signedUrlError) {
            console.error("Chyba při získávání podepsané URL:", signedUrlError);
          }

          // createSignedUrl vrací objekt { signedUrl: string }, ne { publicUrl: string }
          if (urlData?.signedUrl) {
            setImageUri(urlData.signedUrl);
          }
        }
      }
    } catch (error: any) {
      showToast("Chyba při načítání závady: " + error.message, "error");
      console.error(error);
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useFocusEffect(
    useCallback(() => {
      loadIssue();
    }, [loadIssue]),
  );

  // ... funkce handlePickImage a handleTakePhoto zůstávají stejné ...
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
      if (isEditMode && id) {
        let finalImagePath: string | null = originalImagePath; // Výchozí je stará cesta

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
          .eq("id", id);

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

  // ... zbytek renderu (JSX) zůstává stejný ...
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* ... Zbytek JSX kódu je v pořádku ... */}
      {/* ... Zkopírujte zbytek z vašeho původního kódu ... */}
      <Text style={styles.title}>
        {isEditMode ? "Upravit závadu" : "Nahlásit závadu"}
      </Text>

      <View style={styles.form}>
        {/* ... INPUTY ... */}
        <Text style={styles.label}>Název závady *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Např. Nefunguje topení"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Popis</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Popište problém..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* ... Sekce obrázku - Zůstává stejná ... */}
        <Text style={styles.label}>Fotografie (volitelné)</Text>
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imagePreview}>
              <TouchableOpacity
                onPress={() => setViewerVisible(true)}
                activeOpacity={0.8}
                style={{ width: "100%" }}
              >
                <Image source={{ uri: imageUri }} style={styles.image} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="close-circle" size={32} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera" size={32} color="#007AFF" />
                <Text style={styles.imageButtonText}>Vyfotit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={handlePickImage}
              >
                <Ionicons name="images" size={32} color="#007AFF" />
                <Text style={styles.imageButtonText}>Z galerie</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ... Tlačítka ... */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isUploading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? "Uložit změny" : "Odeslat"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isUploading}
        >
          <Text style={styles.cancelButtonText}>Zrušit</Text>
        </TouchableOpacity>
      </View>

      <DocumentViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        imageUri={imageUri}
        fileName="Náhled fotografie"
      />
    </ScrollView>
  );
};

export default IssueCreate;

// Styles zůstávají stejné
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    marginTop: 20,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  imageButton: {
    width: "48%",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#F0F8FF",
  },
  imageButtonText: {
    marginTop: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  imagePreview: {
    position: "relative",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
