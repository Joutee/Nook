import {
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { Text } from "@/components/ui/text"
import React, { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { Issue } from "../types/issues";

const Issues = () => {
  const { currentFlat, userRole } = useFlatContext();
  const { showToast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadIssues = async () => {
    if (!currentFlat) return;
    console.log("Načítám závady pro flat ID:", currentFlat.id);
    try {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("flat_id", currentFlat.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setIssues(data || []);
    } catch (error: any) {
      showToast("Chyba při načítání závad", "error");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadIssues();
      }
    }, [currentFlat]),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "#1953ff";
      case "in_progress":
        return "#FF9500";
      case "resolved":
        return "#34C759";
      case "cancelled":
        return "#FF3B30";
      default:
        return "#999";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Nová";
      case "in_progress":
        return "Řeší se";
      case "resolved":
        return "Vyřešená";
      case "cancelled":
        return "Zrušená";
      default:
        return status;
    }
  };

  const renderIssue = ({ item }: { item: Issue }) => (
    <View style={styles.issueItem}>
      <TouchableOpacity
        onPress={() => router.push(`/issue-detail?id=${item.id}`)}
      >
        <View style={styles.issueHeader}>
          <Text style={styles.issueTitle}>{item.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        {item.description && (
          <Text style={styles.issueDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.issueFooter}>
          <Text style={styles.issueDate}>
            Vytvořena: {formatDate(item.created_at)}
          </Text>
          {item.image_path && (
            <Ionicons name="image-outline" size={16} color="#666" />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Závady</Text>

      {userRole === "najemce" && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/issue-create")}
        >
          <Text style={styles.addButtonText}>+ Nahlásit závadu</Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : issues.length === 0 ? (
        <Text style={styles.emptyText}>Žádné závady</Text>
      ) : (
        <FlatList
          data={issues}
          renderItem={renderIssue}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

export default Issues;

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
  issueItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  issueTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  issueDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  issueFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  issueDate: {
    fontSize: 12,
    color: "#999",
  },
});
