import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SettlementList } from "@/components/SettlementList";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useFlatContext } from "../../contexts/FlatContext";
import { Balance } from "../../types/finance";
import { Pressable } from "react-native";
import { formatCurrency } from "../../lib/financeUtils";

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
          console.log("Změna v výdajích detekována!", payload);
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
        console.error("Error loading balances:", error);
      } else {
        setBalances(balancesData || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Pressable onPress={() => router.push("/(tabs)/finance")}>
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <CardTitle>Vyrovnání dluhů</CardTitle>
            <Ionicons name="wallet-outline" size={24} color="#3b82f6" />
          </View>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : (
            <View>
              <SettlementList
                balances={balances}
                formatCurrency={formatCurrency}
                maxItems={3}
              />
              {balances.length > 0 && (
                <View className="mt-2">
                  <Text className="text-xs text-muted-foreground text-right">
                    Klepněte pro více detailů →
                  </Text>
                </View>
              )}
            </View>
          )}
        </CardContent>
      </Pressable>
    </Card>
  );
};
