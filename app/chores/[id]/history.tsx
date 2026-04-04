import { View, FlatList, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { ChoreHistoryItem } from "@/components/chores/ChoreHistoryItem";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { HistoryItem } from "@/types/chores";
import logger from "@/lib/logger";

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
        logger.error("Error loading chore name:", error);
      } else {
        setChoreName(data.name);
      }
    } catch (error) {
      logger.error("Error:", error);
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
        logger.error("Error loading history:", error);
        showToast("Nepodařilo se načíst historii: " + error.message, "error");
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      logger.error("Error:", error);
      showToast("Nepodařilo se načíst historii", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <ChoreHistoryItem item={item} />
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {history.length === 0 ? (
        <View className="flex-1 justify-center items-center p-10">
          <Ionicons
            name="time-outline"
            size={64}
            className="text-muted-foreground"
          />
          <Text className="text-base text-muted-foreground mt-4 w-full text-center">
            Zatím žádná historie
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => `${item.chore_id}-${item.cycle_index}`}
          renderItem={renderHistoryItem}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
};

export default ChoreHistory;
