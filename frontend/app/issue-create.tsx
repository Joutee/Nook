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
import React, { useState } from "react";
import { router } from "expo-router";
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

const IssueCreate = () => {
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePickImage = async () => {
    try {
      const uri = await pickGalleryPhoto();
      if (uri) {
        const compressed = await compressImage(uri);
        setImageUri(compressed);
      }
    } catch (error: any) {
      showToast("Chyba při výběru obrázku: " + error.message, "error");
      console.error(error);
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
      console.error(error);
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

      let imagePath: string | null = null;
      if (imageUri) {
        imagePath = await uploadFile({
          bucket: "issue-images",
          flatId: currentFlat.id,
          fileUri: imageUri,
          fileName: `issue_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
          tableName: "issues",
          pathColumnName: "image_path",
          additionalData: {
            profile_id: session.user.id,
            title: title.trim(),
            description: description.trim() || null,
            status: "new",
          },
        });
      }

      // Pokud není obrázek, vložíme přímo do databáze
      if (!imagePath) {
        const { error } = await supabase.from("issues").insert({
          title: title.trim(),
          description: description.trim() || null,
          image_path: null,
          flat_id: currentFlat.id,
          profile_id: session.user.id,
          status: "open",
        });

        if (error) throw error;
      }

      showToast("Závada nahlášena", "success");
      router.back();
    } catch (error: any) {
      showToast("Chyba: " + error.message, "error");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nahlásit závadu</Text>

      <View style={styles.form}>
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

        <Text style={styles.label}>Fotografie (volitelné)</Text>
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={styles.image} />
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
            <Text style={styles.submitButtonText}>Odeslat</Text>
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
    </ScrollView>
  );
};

export default IssueCreate;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    justifyContent: "space-around",
    gap: 16,
  },
  imageButton: {
    flex: 1,
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
