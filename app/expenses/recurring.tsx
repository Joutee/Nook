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

const RecurringExpenseItem: React.FC<{
  item: RecurringExpenseWithDetails;
}> = ({ item }) => (
  <Pressable onPress={() => router.push(`/expenses/recurring/${item.id}`)}>
    <Card>
      <CardContent className="px-6 flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-semibold text-foreground">
            {item.title}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            {formatCurrency(item.amount)} · {formatInterval(item)}
          </Text>
          {!item.is_paused && (
            <Text className="text-xs text-muted-foreground mt-0.5">
              Příští: {formatDate(item.next_occurrence)}
            </Text>
          )}
        </View>
        <View
          className={`px-2.5 py-1 rounded-full ${
            item.is_paused ? "bg-destructive" : "bg-success"
          }`}
        >
          <Text className="text-white text-[11px] font-semibold">
            {item.is_paused ? "Pozastaveno" : "Aktivní"}
          </Text>
        </View>
      </CardContent>
    </Card>
  </Pressable>
);

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

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {expenses.length === 0 ? (
        <View className="flex-1 justify-center items-center p-10">
          <Ionicons
            name="repeat-outline"
            size={64}
            className="text-muted-foreground"
          />
          <Text className="text-base text-muted-foreground mt-4 w-full text-center">
            Zatím žádné opakující se výdaje
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecurringExpenseItem item={item} />}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
};

export default RecurringExpensesList;
