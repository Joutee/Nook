import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Text } from "@/components/ui/text"
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../utils/supabase";
import { useToast } from "../contexts/ToastContext";
import { Chore, HistoryItem } from "../types/chores";

const ChoreDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [chore, setChore] = useState<Chore | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completingChore, setCompletingChore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      getCurrentUser();
      loadChoreDetail();
      loadRecentHistory();
    }
  }, [id]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadChoreDetail = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("view_chore_dashboard")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error loading chore:", error);
        showToast("Nepodařilo se načíst úkol: " + error.message, "error");
        router.back();
      } else {
        setChore(data);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst úkol", "error");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentHistory = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("view_chore_history")
        .select("*")
        .eq("chore_id", id)
        .order("cycle_index", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error loading history:", error);
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleCompleteChore = async () => {
    if (!chore || chore.assignee_user_id !== currentUserId) return;
    if (completingChore) return;

    if (chore.is_completed_current_cycle) {
      showToast("Tento úkol je již dokončen", "info");
      return;
    }

    setCompletingChore(true);
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
        loadChoreDetail();
        loadRecentHistory();
      }
    } catch (error: any) {
      showToast("Nepodařilo se označit jako hotové: " + error.message, "error");
    } finally {
      setCompletingChore(false);
    }
  };

  const renderHistoryItem = (item: HistoryItem) => {
    const cycleDate = new Date(item.cycle_start_date);
    const completedDate = item.completed_at
      ? new Date(item.completed_at)
      : null;

    return (
      <View
        key={`${item.chore_id}-${item.cycle_index}`}
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
            <Ionicons name="checkmark-circle" size={20} color="#28a745" />
          ) : (
            <Ionicons name="ellipse-outline" size={20} color="#ccc" />
          )}
        </View>

        <View style={styles.historyDetails}>
          {item.expected_profile_name && (
            <View style={styles.assigneeRow}>
              <View style={styles.smallAvatar}>
                <Text style={styles.smallAvatarText}>
                  {item.expected_profile_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.assigneeName}>
                {item.expected_profile_name}
                {item.expected_profile_surname &&
                  ` ${item.expected_profile_surname}`}
              </Text>
            </View>
          )}

          {item.is_done && item.completed_by_name && (
            <View style={styles.completionInfo}>
              <Ionicons name="checkmark" size={14} color="#28a745" />
              <Text style={styles.completedText}>
                Splnil: {item.completed_by_name}
                {item.completed_by_surname && ` ${item.completed_by_surname}`}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading || !chore) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const isMyTurn = chore.assignee_user_id === currentUserId;
  const isCompleted = chore.is_completed_current_cycle;
  const isFutureStart =
    chore.start_date && new Date(chore.start_date) > new Date();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.choreName}>{chore.name}</Text>
          {isCompleted && (
            <Ionicons name="checkmark-circle" size={32} color="#28a745" />
          )}
        </View>

        {chore.description && (
          <Text style={styles.choreDescription}>{chore.description}</Text>
        )}

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Na řadě:</Text>
          </View>
          <View style={styles.assigneeCard}>
            <View style={styles.assigneeAvatar}>
              <Text style={styles.assigneeAvatarText}>
                {chore.assignee_name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <Text style={styles.assigneeNameText}>
              {chore.assignee_name && chore.assignee_surname
                ? `${chore.assignee_name} ${chore.assignee_surname}`
                : chore.assignee_name || "Nepřiřazeno"}
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Interval:</Text>
          </View>
          <Text style={styles.infoValue}>
            Každých {chore.interval_days}{" "}
            {chore.interval_days === 1 ? "den" : "dní"}
          </Text>
        </View>

        {isFutureStart && (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Začíná:</Text>
            </View>
            <Text style={styles.infoValue}>
              {new Date(chore.start_date!).toLocaleDateString("cs-CZ")}
            </Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/chore-edit?id=${chore.id}`)}
          >
            <Ionicons name="pencil-outline" size={20} color="#007AFF" />
            <Text style={styles.editButtonText}>Upravit</Text>
          </TouchableOpacity>

          {isMyTurn && !isCompleted && (
            <TouchableOpacity
              style={[
                styles.completeButton,
                completingChore && styles.completeButtonDisabled,
              ]}
              onPress={handleCompleteChore}
              disabled={completingChore}
            >
              {completingChore ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.completeButtonText}>Splnit</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.historySection}>
        <View style={styles.historySectionHeader}>
          <Text style={styles.sectionTitle}>Poslední plnění</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push(`/chore-history?id=${chore.id}`)}
          >
            <Text style={styles.viewAllText}>Zobrazit vše</Text>
            <Ionicons name="chevron-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="time-outline" size={48} color="#ccc" />
            <Text style={styles.emptyHistoryText}>Zatím žádná historie</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((item) => renderHistoryItem(item))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ChoreDetail;

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
  detailCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  choreName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  choreDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    marginLeft: 28,
  },
  assigneeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginLeft: 28,
  },
  assigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  assigneeAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  assigneeNameText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  historySection: {
    margin: 16,
  },
  historySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyItemDone: {
    borderLeftWidth: 3,
    borderLeftColor: "#28a745",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cycleInfo: {
    flex: 1,
  },
  cycleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  dateText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  historyDetails: {
    gap: 6,
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  smallAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  assigneeName: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  completionInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f4",
    padding: 6,
    borderRadius: 4,
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    color: "#28a745",
    fontWeight: "500",
  },
  emptyHistory: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 40,
    alignItems: "center",
  },
  emptyHistoryText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
});
