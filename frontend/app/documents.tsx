import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";

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

  useEffect(() => {
    loadDocuments();
  }, [currentFlat]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ");
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <View style={styles.documentItem}>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.documentDescription}>{item.description}</Text>
        )}
        <Text style={styles.documentDate}>
          Přidáno: {formatDate(item.created_at)}
        </Text>
      </View>
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
  },
  documentInfo: {
    flex: 1,
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
