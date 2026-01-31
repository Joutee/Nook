import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../utils/supabase";
import { useToast } from "../contexts/ToastContext";

interface HistoryItem {
  chore_id: string;
  flat_id: string;
  cycle_index: number;
  cycle_start_date: string;
  expected_profile_id: string | null;
  expected_profile_name: string | null;
  expected_profile_surname: string | null;
  expected_profile_avatar: string | null;
  is_done: boolean;
  completed_by_profile_id: string | null;
  completed_by_name: string | null;
  completed_by_surname: string | null;
  completed_at: string | null;
}

const ChoreHistory = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [choreName, setChoreName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      loadHistory();
      loadChoreName();
    }
  }, [id]);

  const loadChoreName = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("chores")
        .select("name")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error loading chore name:", error);
      } else {
        setChoreName(data.name);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadHistory = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("view_chore_history")
        .select("*")
        .eq("chore_id", id)
        .order("cycle_index", { ascending: false });

      if (error) {
        console.error("Error loading history:", error);
        showToast("Nepodařilo se načíst historii: " + error.message, "error");
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst historii", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const cycleDate = new Date(item.cycle_start_date);
    const completedDate = item.completed_at
      ? new Date(item.completed_at)
      : null;

    return (
      <View
        style={[styles.historyItem, item.is_done && styles.historyItemDone]}
      >
        <View style={styles.historyHeader}>
          <View style={styles.cycleInfo}>
            <Text style={styles.cycleLabel}>
              Cyklus #{item.cycle_index + 1}
            </Text>
            <Text style={styles.dateText}>
              {cycleDate.toLocaleDateString("cs-CZ")}
            </Text>
          </View>
          {item.is_done ? (
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color="#ccc" />
          )}
        </View>

        <View style={styles.historyDetails}>
          {item.expected_profile_name && (
            <View style={styles.assigneeRow}>
              <View style={styles.assigneeAvatar}>
                <Text style={styles.assigneeAvatarText}>
                  {item.expected_profile_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.assigneeTextContainer}>
                <Text style={styles.assigneeLabel}>Na řadě:</Text>
                <Text style={styles.assigneeName}>
                  {item.expected_profile_name}
                  {item.expected_profile_surname &&
                    ` ${item.expected_profile_surname}`}
                </Text>
              </View>
            </View>
          )}

          {item.is_done && item.completed_by_name && (
            <View style={styles.completionInfo}>
              <Ionicons name="checkmark" size={16} color="#28a745" />
              <Text style={styles.completedText}>
                Splnil: {item.completed_by_name}
                {item.completed_by_surname && ` ${item.completed_by_surname}`}
              </Text>
              {completedDate && (
                <Text style={styles.completedDate}>
                  ({completedDate.toLocaleDateString("cs-CZ")})
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Zatím žádná historie</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => `${item.chore_id}-${item.cycle_index}`}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

export default ChoreHistory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    padding: 16,
  },
  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyItemDone: {
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cycleInfo: {
    flex: 1,
  },
  cycleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  dateText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  historyDetails: {
    gap: 8,
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  assigneeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  assigneeAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  assigneeTextContainer: {
    flex: 1,
  },
  assigneeLabel: {
    fontSize: 11,
    color: "#999",
    textTransform: "uppercase",
  },
  assigneeName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  completionInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f4",
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  completedText: {
    fontSize: 13,
    color: "#28a745",
    fontWeight: "500",
  },
  completedDate: {
    fontSize: 11,
    color: "#666",
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
});
