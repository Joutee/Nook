import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { Balance, Settlement } from "@/types/finance";
import { formatCurrency as formatCurrencyUtil } from "@/lib/financeUtils";

interface SettlementListProps {
  balances: Balance[];
  formatCurrency?: (amount: number) => string;
  maxItems?: number;
}

/**
 * Calculates optimal settlement transactions to minimize the number of payments.
 * Algorithm: Match the biggest debtor with the biggest creditor until everyone is settled.
 */
const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const settlements: Settlement[] = [];

  // Create mutable copies of balances
  const debtors = balances
    .filter((b) => b.net_balance < 0)
    .map((b) => ({ name: b.name, amount: Math.abs(b.net_balance) }))
    .sort((a, b) => b.amount - a.amount); // Sort descending

  const creditors = balances
    .filter((b) => b.net_balance > 0)
    .map((b) => ({ name: b.name, amount: b.net_balance }))
    .sort((a, b) => b.amount - a.amount); // Sort descending

  let i = 0; // Debtor index
  let j = 0; // Creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Find the minimum of what debtor owes and what creditor is owed
    const settlementAmount = Math.min(debtor.amount, creditor.amount);

    // Create a settlement transaction
    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amount: Math.round(settlementAmount * 100) / 100, // Round to 2 decimal places
    });

    // Update balances
    debtor.amount -= settlementAmount;
    creditor.amount -= settlementAmount;

    // Move to next debtor or creditor if their balance is settled
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return settlements;
};

export const SettlementList = ({
  balances,
  formatCurrency = formatCurrencyUtil,
  maxItems,
}: SettlementListProps) => {
  const settlements = calculateSettlements(balances).slice(0, maxItems);
  if (settlements.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        Všichni jsou vyrovnaní!
      </Text>
    );
  }

  return (
    <View>
      {settlements.map((settlement, index) => (
        <View
          key={index}
          className="flex-row items-center py-3 px-3 bg-card border border-border rounded-lg mb-2 gap-3"
        >
          <Ionicons name="arrow-forward" size={20} className="text-primary" />
          <Text className="text-sm text-foreground flex-1">
            <Text className="font-semibold text-primary">
              {settlement.from}
            </Text>{" "}
            dluží{" "}
            <Text className="font-semibold text-primary">{settlement.to}</Text>{" "}
            <Text className="font-bold text-foreground">
              {formatCurrency(settlement.amount)}
            </Text>
          </Text>
        </View>
      ))}
    </View>
  );
};
