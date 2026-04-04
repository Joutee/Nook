import { View, Pressable, Modal } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { Balance, Settlement } from "@/types/finance";
import { formatCurrency as formatCurrencyUtil } from "@/lib/financeUtils";
import { Separator } from "@/components/ui/separator";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { supabase } from "@/lib/supabase";
import logger from "@/lib/logger";

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
    .map((b) => ({
      profileId: b.profile_id,
      name: b.name,
      surname: b.surname,
      amount: Math.abs(b.net_balance),
    }))
    .sort((a, b) => b.amount - a.amount); // Sort descending

  const creditors = balances
    .filter((b) => b.net_balance > 0)
    .map((b) => ({
      profileId: b.profile_id,
      name: b.name,
      surname: b.surname,
      amount: b.net_balance,
    }))
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
      fromName: debtor.name,
      fromSurname: debtor.surname,
      toName: creditor.name,
      toSurname: creditor.surname,
      toProfileId: creditor.profileId,
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

const formatIban = (iban: string) => {
  return iban.replace(/(.{4})/g, "$1 ").trim();
};

export const SettlementList = ({
  balances,
  formatCurrency = formatCurrencyUtil,
  maxItems,
}: SettlementListProps) => {
  const [selectedSettlement, setSelectedSettlement] =
    useState<Settlement | null>(null);
  const [iban, setIban] = useState<string | null>(null);
  const [loadingIban, setLoadingIban] = useState(false);
  const [copied, setCopied] = useState(false);
  const ibanCache = useRef<Map<string, string | null>>(new Map());
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const settlements = calculateSettlements(balances).slice(0, maxItems);

  const handlePress = useCallback(async (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setCopied(false);

    const cached = ibanCache.current.get(settlement.toProfileId);
    if (cached !== undefined) {
      setIban(cached);
      return;
    }

    setIban(null);
    setLoadingIban(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("iban")
        .eq("id", settlement.toProfileId)
        .single();

      const value = !error && data ? data.iban : null;
      ibanCache.current.set(settlement.toProfileId, value);
      setIban(value);
    } catch (err) {
      logger.error("Error loading IBAN:", err);
    } finally {
      setLoadingIban(false);
    }
  }, []);

  const handleCopyIban = async () => {
    if (!iban) return;
    await Clipboard.setStringAsync(iban);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

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
        <View key={index}>
          <Pressable onPress={() => handlePress(settlement)} className="py-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-foreground flex-1">
                {settlement.fromName} {settlement.fromSurname}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                className="text-primary mx-4"
              />
              <Text className="font-semibold text-foreground flex-1 text-right">
                {settlement.toName} {settlement.toSurname}
              </Text>
            </View>
            <Text className="font-bold text-foreground text-xs text-center">
              {formatCurrency(settlement.amount)}
            </Text>
          </Pressable>
          {index < settlements.length - 1 && <Separator />}
        </View>
      ))}

      <Modal
        visible={!!selectedSettlement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSettlement(null)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50"
          onPress={() => setSelectedSettlement(null)}
        >
          <Pressable
            className="bg-card rounded-2xl p-6 mx-8 w-[85%] shadow-lg"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-foreground text-center mb-1">
              {selectedSettlement?.toName} {selectedSettlement?.toSurname}
            </Text>
            <Text className="text-sm text-muted-foreground text-center mb-4">
              {formatCurrency(selectedSettlement?.amount ?? 0)}
            </Text>

            {loadingIban ? (
              <Text className="text-sm text-muted-foreground text-center">
                Načítání...
              </Text>
            ) : iban ? (
              <View>
                <Text className="text-xs text-muted-foreground mb-1">IBAN</Text>
                <Pressable
                  onPress={handleCopyIban}
                  className="flex-row items-center justify-between bg-muted/50 rounded-xl px-4 py-3"
                >
                  <Text className="text-base font-mono text-foreground">
                    {formatIban(iban)}
                  </Text>
                  <Ionicons
                    name={copied ? "checkmark-circle" : "copy-outline"}
                    size={22}
                    className={copied ? "text-green-500" : "text-muted-foreground"}
                  />
                </Pressable>
                {copied && (
                  <Text className="text-xs text-green-500 text-center mt-1">
                    Zkopírováno!
                  </Text>
                )}
              </View>
            ) : (
              <Text className="text-sm text-muted-foreground text-center">
                IBAN není nastaven
              </Text>
            )}

            <Pressable
              onPress={() => setSelectedSettlement(null)}
              className="mt-5 bg-primary rounded-xl py-3"
            >
              <Text className="text-primary-foreground text-center font-semibold">
                Zavřít
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
