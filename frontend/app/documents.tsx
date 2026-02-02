import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import React, { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import DocumentViewerModal from "../components/DocumentViewerModal";
import { Ionicons } from "@expo/vector-icons";

interface Document {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  path: string;
}

const documents = () => {
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    path: string;
    name: string;
  } | null>(null);

  const loadDocuments = async () => {
    if (!currentFlat) return;

    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("flat_id", currentFlat.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      showToast("Chyba při načítání dokumentů", "error");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadDocuments();
      }
    }, [currentFlat]),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ");
  };

  const handleOpenDocument = (path: string, name: string = "Dokument") => {
    setSelectedDocument({ path, name });
    setViewerVisible(true);
  };

  const handleDownloadDocument = async (path: string, name: string) => {
    try {
      // Získání podepsané URL s download parametrem
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 3600, {
          download: name, // Nastaví Content-Disposition: attachment; filename="name"
        });

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Nepodařilo se získat URL");

      // Otevřít URL v prohlížeči - soubor se automaticky stáhne díky download parametru
      const canOpen = await Linking.canOpenURL(data.signedUrl);
      if (canOpen) {
        await Linking.openURL(data.signedUrl);
        showToast("Stahování dokumentu...", "success");
      } else {
        throw new Error("Nelze otevřít odkaz");
      }
    } catch (error: any) {
      showToast("Chyba při stahování: " + error.message, "error");
      console.error(error);
    }
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <View style={styles.documentItem}>
      <TouchableOpacity
        style={styles.documentInfo}
        onPress={() => handleOpenDocument(item.path, item.name)}
      >
        <Text style={styles.documentName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.documentDescription}>{item.description}</Text>
        )}
        <Text style={styles.documentDate}>
          Přidáno: {formatDate(item.created_at)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => handleDownloadDocument(item.path, item.name)}
      >
        <Ionicons name="download-outline" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dokumenty</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/document-add")}
      >
        <Text style={styles.addButtonText}>+ Přidat dokument</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : documents.length === 0 ? (
        <Text style={styles.emptyText}>Žádné dokumenty</Text>
      ) : (
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
      <DocumentViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        filePath={selectedDocument?.path || null}
        fileName={selectedDocument?.name}
      />
    </View>
  );
};

export default documents;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 40,
  },
  list: {
    paddingBottom: 20,
  },
  documentItem: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
  },
  documentInfo: {
    flex: 1,
  },
  downloadButton: {
    padding: 8,
    marginLeft: 8,
  },
  documentName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  documentDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  documentDate: {
    fontSize: 12,
    color: "#999",
  },
});
