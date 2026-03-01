import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useFlatContext } from "../../contexts/FlatContext";
import { Balance, Settlement } from "../../types/finance";
import { calculateSettlements } from "../../utils/financeUtils";
import { Pressable } from "react-native";

export const FinanceWidget = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat } = useFlatContext();

  useEffect(() => {
    loadFinanceData();
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
        const calculatedSettlements = calculateSettlements(balancesData || []);
        setSettlements(calculatedSettlements.slice(0, 3)); // Zobrazit max 3 vypořádání
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} Kč`;
  };

  return (
    <Card className="mb-4">
      <Pressable onPress={() => router.push("/finance")}>
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <CardTitle>Přehled financí</CardTitle>
            <Ionicons name="wallet-outline" size={24} color="#3b82f6" />
          </View>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : settlements.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              Všichni jsou vyrovnaní!
            </Text>
          ) : (
            <View>
              {settlements.map((settlement, index) => (
                <View
                  key={index}
                  className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0"
                >
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      <Text className="font-semibold">{settlement.from}</Text>
                      {" → "}
                      <Text className="font-semibold">{settlement.to}</Text>
                    </Text>
                  </View>
                  <Text className="text-sm font-semibold text-primary">
                    {formatCurrency(settlement.amount)}
                  </Text>
                </View>
              ))}
              {settlements.length > 0 && (
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
