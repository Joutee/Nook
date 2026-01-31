import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";

interface Chore {
  id: string;
  flat_id: string;
  name: string;
  description: string | null;
  interval_days: number;
  current_cycle_index: number;
  current_assignee_id: string | null;
  assignee_name: string | null;
  assignee_surname: string | null;
  assignee_avatar: string | null;
  assignee_user_id: string | null;
  is_completed_current_cycle: boolean;
  start_date: string | null;
}

const Chores = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(
    null,
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useEffect(() => {
    if (currentFlat?.id) {
      loadChores();
      getCurrentUser();
    }
  }, [currentFlat]);

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadChores();
      }
    }, [currentFlat]),
  );

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadChores = async () => {
    if (!currentFlat?.id) return;

    setIsLoading(true);
    try {
      console.log("Loading chores for flat_id:", currentFlat.id);

      // Přidání timestamp aby se vynutilo čerstvé načtení dat
      const { data, error } = await supabase
        .from("view_chore_dashboard")
        .select("*")
        .eq("flat_id", currentFlat.id)
        .order("name");

      console.log("Chores response:", { data, error });

      if (error) {
        console.error("Error loading chores:", error);
        showToast("Nepodařilo se načíst úkoly: " + error.message, "error");
      } else {
        console.log("Loaded chores count:", data?.length || 0);
        console.log("Chores data:", JSON.stringify(data, null, 2));
        setChores(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst úkoly", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteChore = async (chore: Chore) => {
    if (!currentFlat?.id || chore.assignee_user_id !== currentUserId) return;
    if (completingChoreId) return; // Zabránit multiple clicks

    // Zkontrolovat, jestli už není dokončeno
    if (chore.is_completed_current_cycle) {
      showToast("Tento úkol je již dokončen", "info");
      return;
    }
    console.log(chore.is_completed_current_cycle);
    setCompletingChoreId(chore.id);
    try {
      const { error } = await supabase.from("chore_completions").insert({
        chore_id: chore.id,
        profile_id: currentUserId,
        cycle_index: chore.current_cycle_index,
      });

      if (error) {
        showToast(
          "Nepodařilo se označit jako hotové: " + error.message,
          "error",
        );
      } else {
        showToast("Úkol dokončen!", "success");
        loadChores();
      }
    } catch (error: any) {
      showToast("Nepodařilo se označit jako hotové: " + error.message, "error");
    } finally {
      setCompletingChoreId(null);
    }
  };

  const renderChoreItem = ({ item }: { item: Chore }) => {
    const isMyTurn = item.assignee_user_id === currentUserId;
    const isCompleted = item.is_completed_current_cycle;
    const isFutureStart =
      item.start_date && new Date(item.start_date) > new Date();

    return (
      <View
        style={[styles.choreItem, isCompleted && styles.choreItemCompleted]}
      >
        <View style={styles.choreInfo}>
          <View style={styles.choreHeader}>
            <Text style={styles.choreName}>{item.name}</Text>
            <View style={styles.choreHeaderIcons}>
              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => router.push(`/chore-history?id=${item.id}`)}
              >
                <Ionicons name="time-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
              {isCompleted && (
                <Ionicons name="checkmark-circle" size={24} color="#28a745" />
              )}
            </View>
          </View>
          {item.description && (
            <Text style={styles.choreDescription}>{item.description}</Text>
          )}
          <View style={styles.choreDetails}>
            <View style={styles.assigneeInfo}>
              <View style={styles.assigneeAvatar}>
                <Text style={styles.assigneeAvatarText}>
                  {item.assignee_name?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
              <Text style={styles.assigneeName}>
                {item.assignee_name && item.assignee_surname
                  ? `${item.assignee_name} ${item.assignee_surname}`
                  : item.assignee_name || "Nepřiřazeno"}
              </Text>
            </View>
            <View>
              <Text style={styles.intervalText}>
                Každých {item.interval_days}{" "}
                {item.interval_days === 1 ? "den" : "dní"}
              </Text>
              {isFutureStart && (
                <Text style={styles.startDateText}>
                  Začíná:{" "}
                  {new Date(item.start_date!).toLocaleDateString("cs-CZ")}
                </Text>
              )}
            </View>
          </View>
        </View>
        {isMyTurn && !isCompleted && (
          <TouchableOpacity
            style={[
              styles.completeButton,
              completingChoreId === item.id && styles.completeButtonDisabled,
            ]}
            onPress={() => handleCompleteChore(item)}
            disabled={completingChoreId === item.id}
          >
            {completingChoreId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        )}
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
      <View style={styles.header}>
        <Text style={styles.title}>Domácí práce</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/create-chore")}
        >
          <Ionicons name="add" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>
      {chores.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Zatím žádné úkoly</Text>
        </View>
      ) : (
        <FlatList
          data={chores}
          keyExtractor={(item) => item.id}
          renderItem={renderChoreItem}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

export default Chores;

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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    padding: 16,
  },
  choreItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  choreItemCompleted: {
    opacity: 0.6,
  },
  choreInfo: {
    flex: 1,
  },
  choreHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  choreHeaderIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyButton: {
    padding: 4,
  },
  choreName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  choreDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  choreDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assigneeInfo: {
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
  assigneeName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  intervalText: {
    fontSize: 12,
    color: "#999",
  },
  startDateText: {
    fontSize: 11,
    color: "#007AFF",
    marginTop: 2,
    fontWeight: "500",
  },
  completeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#28a745",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  completeButtonDisabled: {
    opacity: 0.6,
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
