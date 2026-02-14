import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import React, { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { Balance, ExpenseWithDetails, Settlement } from "../types/finance";
import { calculateSettlements } from "../utils/financeUtils";

const Finance = () => {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
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
        .from("flat_balances")
        .select("*")
        .eq("flat_id", currentFlat.id);

      if (balancesError) {
        console.error("Error loading balances:", balancesError);
        showToast(
          "Nepodařilo se načíst zůstatky: " + balancesError.message,
          "error",
        );
      } else {
        setBalances(balancesData || []);
        // Calculate settlements from balances
        const calculatedSettlements = calculateSettlements(balancesData || []);
        setSettlements(calculatedSettlements);
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
        console.error("Error loading expenses:", expensesError);
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
      console.error("Error:", error);
      showToast("Nepodařilo se načíst finanční data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} Kč`;
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
      <View key={balance.profile_id} style={styles.balanceItem}>
        <View style={styles.balanceLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {balance.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.balanceName}>{balance.name}</Text>
        </View>
        <View style={styles.balanceRight}>
          <Text
            style={[
              styles.balanceAmount,
              isPositive && styles.balancePositive,
              isZero && styles.balanceZero,
            ]}
          >
            {isPositive && "+"}
            {formatCurrency(balance.net_balance)}
          </Text>
        </View>
      </View>
    );
  };

  const renderSettlementItem = (item: Settlement, index: number) => {
    return (
      <View key={index} style={styles.settlementItem}>
        <Ionicons name="arrow-forward" size={20} color="#007AFF" />
        <Text style={styles.settlementText}>
          <Text style={styles.settlementName}>{item.from}</Text> dluží{" "}
          <Text style={styles.settlementName}>{item.to}</Text>{" "}
          <Text style={styles.settlementAmount}>
            {formatCurrency(item.amount)}
          </Text>
        </Text>
      </View>
    );
  };

  const renderExpenseItem = ({ item }: { item: ExpenseWithDetails }) => {
    return (
      <View style={styles.expenseItem}>
        <View style={styles.expenseLeft}>
          {item.is_settlement ? (
            <View style={[styles.expenseIcon, styles.settlementIcon]}>
              <Ionicons name="swap-horizontal" size={20} color="#fff" />
            </View>
          ) : (
            <View style={styles.expenseIcon}>
              <Ionicons name="cart-outline" size={20} color="#fff" />
            </View>
          )}
          <View style={styles.expenseDetails}>
            <Text style={styles.expenseTitle}>
              {item.is_settlement ? "🔄 Vyrovnání" : item.title}
            </Text>
            <Text style={styles.expenseSubtitle}>
              Zaplatil: {item.payer_name} • {formatDate(item.happened_at)}
            </Text>
          </View>
        </View>
        <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Načítám finanční data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Balances Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Zůstatky</Text>
          </View>
          {balances.length === 0 ? (
            <Text style={styles.emptyText}>Zatím žádné zůstatky</Text>
          ) : (
            <>{balances.map(renderBalanceItem)}</>
          )}
        </View>

        {/* Settlements Section */}
        {settlements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-compare-outline" size={24} color="#28a745" />
              <Text style={styles.sectionTitle}>Doporučená vyrovnání</Text>
            </View>
            {settlements.map(renderSettlementItem)}
          </View>
        )}

        {/* History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={24} color="#666" />
            <Text style={styles.sectionTitle}>Historie</Text>
          </View>
          {expenses.length === 0 ? (
            <Text style={styles.emptyText}>Zatím žádné výdaje</Text>
          ) : (
            <FlatList
              data={expenses}
              renderItem={renderExpenseItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Expense Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/expense-create")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default Finance;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  balanceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  balanceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  balanceName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  balanceRight: {
    alignItems: "flex-end",
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc3545",
  },
  balancePositive: {
    color: "#28a745",
  },
  balanceZero: {
    color: "#999",
  },
  settlementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  settlementText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  settlementName: {
    fontWeight: "600",
    color: "#007AFF",
  },
  settlementAmount: {
    fontWeight: "700",
    color: "#28a745",
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  expenseLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  settlementIcon: {
    backgroundColor: "#28a745",
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  expenseSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
