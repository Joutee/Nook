import { View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import React, { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { formatCurrency } from "@/lib/financeUtils";
import { RecurringExpenseWithDetails } from "@/types/finance";
import logger from "@/lib/logger";

const DAY_NAMES = ["", "Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = [
  "",
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

function formatInterval(item: RecurringExpenseWithDetails): string {
  switch (item.interval) {
    case "daily":
      return "Denně";
    case "weekly":
      return `Týdně, ${DAY_NAMES[item.interval_day ?? 1]}`;
    case "monthly":
      return `Měsíčně, ${item.interval_day}. dne`;
    case "yearly":
      return `Ročně, ${item.interval_day}. ${MONTH_NAMES[item.interval_month ?? 1]}`;
    default:
      return "";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

const RecurringExpensesList = () => {
  const [expenses, setExpenses] = useState<RecurringExpenseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadRecurringExpenses();
      }
    }, [currentFlat]),
  );

  const loadRecurringExpenses = async () => {
    if (!currentFlat?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select(
          "*, payer:profiles!recurring_expenses_payer_id_fkey(name, surname, avatar_url)",
        )
        .eq("flat_id", currentFlat.id)
        .order("is_paused", { ascending: true })
        .order("next_occurrence", { ascending: true });

      if (error) {
        logger.error("Error loading recurring expenses:", error);
        showToast("Nepodařilo se načíst opakující se výdaje", "error");
      } else {
        setExpenses((data as RecurringExpenseWithDetails[]) || []);
      }
    } catch (error) {
      logger.error("Error:", error);
      showToast("Nepodařilo se načíst opakující se výdaje", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: RecurringExpenseWithDetails }) => {
    const borderColor = item.is_paused ? "#666" : "#7c3aed";

    return (
      <Pressable onPress={() => router.push(`/expenses/recurring/${item.id}`)}>
        <Card
          className={`mb-3 overflow-hidden ${item.is_paused ? "opacity-60" : ""}`}
          style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
        >
          <CardContent className="pt-4">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <Text className="text-base font-semibold text-foreground mb-1">
                  {item.title}
                </Text>
                <Text className="text-sm text-muted-foreground mb-1">
                  {formatInterval(item)}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {item.is_paused
                    ? "Pozastaveno"
                    : `Příští: ${formatDate(item.next_occurrence)}`}
                </Text>
              </View>
              <View className="items-end gap-2">
                <Text className="text-base font-semibold text-foreground">
                  {formatCurrency(item.amount)}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full ${item.is_paused ? "bg-yellow-100" : "bg-green-100"}`}
                >
                  <Text
                    className={`text-xs font-medium ${item.is_paused ? "text-yellow-700" : "text-green-700"}`}
                  >
                    {item.is_paused ? "Pozastaveno" : "Aktivní"}
                  </Text>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={expenses}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          expenses.length === 0
            ? { flex: 1, paddingHorizontal: 16, paddingTop: 16 }
            : { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }
        }
        ListHeaderComponent={
          <Text className="text-3xl font-bold text-foreground mb-4">
            Opakující se výdaje
          </Text>
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center gap-4 pb-20">
            <Ionicons
              name="repeat-outline"
              size={64}
              className="text-muted-foreground"
            />
            <Text className="text-lg font-semibold text-foreground">
              Žádné opakující se výdaje
            </Text>
            <Text className="text-sm text-muted-foreground text-center px-8">
              Opakující se výdaje vám pomohou sledovat pravidelné platby, jako
              je nájem nebo internet.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default RecurringExpensesList;
