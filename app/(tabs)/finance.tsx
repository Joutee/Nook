import {
  View,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SettlementList } from "@/components/expenses/SettlementList";
import React, { useState, useCallback, Fragment } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { Balance, ExpenseWithDetails } from "@/types/finance";
import { formatCurrency } from "@/lib/financeUtils";
import { Avatar } from "@/components/ui/avatar";
import logger from "@/lib/logger";

const Finance = () => {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadFinanceData();
      }
    }, [currentFlat]),
  );

  const loadFinanceData = async () => {
    if (!currentFlat?.id) return;

    setIsLoading(true);
    try {
      // Load balances from the view
      const { data: balancesData, error: balancesError } = await supabase
        .from("view_flat_balances")
        .select("*")
        .eq("flat_id", currentFlat.id);

      if (balancesError) {
        logger.error("Error loading balances:", balancesError);
        showToast(
          "Nepodařilo se načíst zůstatky: " + balancesError.message,
          "error",
        );
      } else {
        setBalances(balancesData || []);
      }

      // Load expense history (join with profiles to get payer name)
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(
          `
          *,
          payer:profiles!expenses_payer_id_fkey(name, avatar_url)
        `,
        )
        .eq("flat_id", currentFlat.id)
        .order("happened_at", { ascending: false })
        .limit(50);

      if (expensesError) {
        logger.error("Error loading expenses:", expensesError);
        showToast(
          "Nepodařilo se načíst historii: " + expensesError.message,
          "error",
        );
      } else {
        // Transform the data to match ExpenseWithDetails interface
        const transformedExpenses: ExpenseWithDetails[] = (
          expensesData || []
        ).map((expense: any) => ({
          ...expense,
          payer_name: expense.payer?.name || "Neznámý",
          payer_avatar: expense.payer?.avatar_url || null,
        }));
        setExpenses(transformedExpenses);
      }
    } catch (error) {
      logger.error("Error:", error);
      showToast("Nepodařilo se načíst finanční data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderBalanceItem = (balance: Balance) => {
    const isPositive = balance.net_balance > 0;
    const isZero = Math.abs(balance.net_balance) < 0.01;

    return (
      <View
        key={balance.profile_id}
        className="flex-row justify-between items-center py-3"
      >
        <View className="flex-row items-center gap-3 flex-1">
          <Avatar name={balance.name} imageUrl={balance.avatar_url} size="xl" />
          <Text className="text-base text-foreground font-medium flex-1">
            {balance.name} {balance.surname}
          </Text>
        </View>
        <View
          className={`items-end py-1 px-3 rounded-3xl  ${
            isPositive
              ? "bg-success"
              : isZero
                ? "bg-muted-foreground"
                : "bg-destructive"
          } `}
        >
          <Text className={"text-sm font-semibold text-primary-foreground"}>
            {isPositive && "+"}
            {formatCurrency(balance.net_balance)}
          </Text>
        </View>
      </View>
    );
  };

  const renderExpenseItem = ({ item }: { item: ExpenseWithDetails }) => {
    return (
      <Pressable
        className="flex-row justify-between items-center py-3"
        onPress={() => router.push(`/expenses/${item.id}/edit`)}
      >
        <View className="flex-row items-center gap-3 flex-1">
          {item.is_settlement ? (
            <View className="w-10 h-10 rounded-full bg-green-600 items-center justify-center">
              <Ionicons name="swap-horizontal" size={20} color="#fff" />
            </View>
          ) : (
            <Ionicons
              name="cart-outline"
              size={24}
              className="text-foreground"
            />
          )}
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground mb-1">
              {item.is_settlement ? " Vyrovnání" : item.title}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Zaplatil: {item.payer_name} • {formatDate(item.happened_at)}
            </Text>
          </View>
        </View>
        <Text className="text-base font-semibold text-foreground">
          {formatCurrency(item.amount)}
        </Text>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(270, 89.1%, 49%)" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 py-4">
        <Text className="text-3xl font-bold text-foreground mb-4">Finance</Text>

        {/* Balances Section */}
        <Card className="mb-3">
          <CardHeader className="flex-row items-center gap-2">
            <Ionicons
              name="wallet-outline"
              size={24}
              className="text-foreground"
            />
            <CardTitle>Zůstatky</CardTitle>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <Text className="text-sm text-muted-foreground text-center py-5">
                Zatím žádné zůstatky
              </Text>
            ) : (
              <>
                {balances.map((balance, index) => (
                  <Fragment key={balance.profile_id}>
                    {renderBalanceItem(balance)}
                    {index < balances.length - 1 && <Separator />}
                  </Fragment>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Settlements Section */}
        {balances.length > 0 && (
          <Card className="mb-3">
            <CardHeader className="flex-row items-center gap-2">
              <Ionicons
                name="git-compare-outline"
                size={24}
                className="text-foreground"
              />
              <CardTitle className="flex-1">Doporučená vyrovnání</CardTitle>
            </CardHeader>
            <CardContent>
              <SettlementList
                balances={balances}
                formatCurrency={formatCurrency}
              />
            </CardContent>
          </Card>
        )}

        {/* History Section */}
        <Card className="mb-4">
          <CardHeader className="flex-row items-center gap-2">
            <Ionicons
              name="time-outline"
              size={24}
              className="text-foreground"
            />
            <CardTitle>Historie</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <Text className="text-sm text-muted-foreground text-center py-5">
                Zatím žádné výdaje
              </Text>
            ) : (
              <FlatList
                data={expenses}
                renderItem={renderExpenseItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View className="h-px bg-border" />
                )}
              />
            )}
          </CardContent>
        </Card>
      </ScrollView>

      {/* Add Expense Button */}
      <Pressable
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        onPress={() => router.push("/expenses/create")}
      >
        <Ionicons name="add" size={28} className="text-primary-foreground" />
      </Pressable>
    </View>
  );
};

export default Finance;
