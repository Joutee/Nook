import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SettlementList } from "@/components/expenses/SettlementList";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { Balance } from "@/types/finance";
import { Pressable } from "react-native";
import { formatCurrency } from "@/lib/financeUtils";
import logger from "@/lib/logger";

export const RepaymentWidget = () => {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat } = useFlatContext();

  useEffect(() => {
    // 1. Prvotní načtení dat
    loadFinanceData();

    // Pokud nemáme flat_id, nemá smysl nic poslouchat
    if (!currentFlat?.id) return;

    // 2. Vytvoření Realtime kanálu
    const expensesChannel = supabase
      .channel("public:expenses") // Název kanálu (může být cokoliv)
      .on(
        "postgres_changes",
        {
          event: "*", // Chceme poslouchat vše (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "expenses",
          filter: `flat_id=eq.${currentFlat.id}`, // MAGIE: Posloucháme jen náš byt!
        },
        (payload) => {
          logger.log("Změna v výdajích detekována!", payload);
          // Když se něco změní (někdo přidá/upraví výdaj), přenačteme widget
          loadFinanceData();
        },
      )
      .subscribe();

    // 3. Úklid při opuštění obrazovky (zavře trubku a šetří limit 200 připojení)
    return () => {
      supabase.removeChannel(expensesChannel);
    };
  }, [currentFlat]);

  const loadFinanceData = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: balancesData, error } = await supabase
        .from("view_flat_balances")
        .select("*")
        .eq("flat_id", currentFlat.id);

      if (error) {
        logger.error("Error loading balances:", error);
      } else {
        setBalances(balancesData || []);
      }
    } catch (error) {
      logger.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Pressable onPress={() => router.push("/(tabs)/finance")}>
      <Card className="mb-4">
        <CardHeader className="flex-row items-center gap-2">
          <Ionicons
            name="wallet-outline"
            size={24}
            className="text-foreground"
          />
          <CardTitle>Vyrovnání dluhů</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : (
            <SettlementList
              balances={balances}
              formatCurrency={formatCurrency}
              maxItems={3}
            />
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
};
