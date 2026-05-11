import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Member } from "@/types/members";
import { ExpenseItem } from "@/types/finance";
import { formatCurrency } from "@/lib/financeUtils";
import { Avatar } from "@/components/ui/avatar";
import { ReceiptItemList } from "@/components/expenses/ReceiptItemList";

interface ExpenseSplitSectionProps {
  flatMembers: Member[];
  selectedMembers: Member[];
  onSelectedMembersChange: (members: Member[]) => void;
  splitMode: "auto" | "manual" | "items";
  onSplitModeChange: (mode: "auto" | "manual" | "items") => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  manualAmounts: Record<string, string>;
  onManualAmountsChange: (amounts: Record<string, string>) => void;
  touchedMembers: Set<string>;
  onTouchedMembersChange: (touched: Set<string>) => void;
  expenseItems: ExpenseItem[];
  onExpenseItemsChange: (items: ExpenseItem[]) => void;
}

export const ExpenseSplitSection: React.FC<ExpenseSplitSectionProps> = ({
  flatMembers,
  selectedMembers,
  onSelectedMembersChange,
  splitMode,
  onSplitModeChange,
  amount,
  onAmountChange,
  manualAmounts,
  onManualAmountsChange,
  touchedMembers,
  onTouchedMembersChange,
  expenseItems,
  onExpenseItemsChange,
}) => {
  const calculateTotalManualAmount = () => {
    return Object.values(manualAmounts).reduce((sum, val) => {
      const num = parseFloat(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  const handleMemberToggle = (member: Member) => {
    const isSelected = selectedMembers.some((m) => m.id === member.id);
    if (isSelected) {
      onSelectedMembersChange(
        selectedMembers.filter((m) => m.id !== member.id),
      );
      const newManualAmounts = { ...manualAmounts };
      delete newManualAmounts[member.id];
      onManualAmountsChange(newManualAmounts);
      const newTouched = new Set(touchedMembers);
      newTouched.delete(member.id);
      onTouchedMembersChange(newTouched);
    } else {
      onSelectedMembersChange([...selectedMembers, member]);
    }
  };

  const handleManualAmountChange = (memberId: string, value: string) => {
    const newManualAmounts = {
      ...manualAmounts,
      [memberId]: value,
    };
    onManualAmountsChange(newManualAmounts);
  };

  const handleAmountBlur = (memberId: string) => {
    const newTouched = new Set(touchedMembers);
    newTouched.add(memberId);
    onTouchedMembersChange(newTouched);

    const valueNum = parseFloat(manualAmounts[memberId]) || 0;

    const untouchedMembers = selectedMembers.filter(
      (m) => !newTouched.has(m.id),
    );

    if (untouchedMembers.length === 0) {
      const newTotal = selectedMembers.reduce((sum, member) => {
        const amt = parseFloat(manualAmounts[member.id]) || 0;
        return sum + amt;
      }, 0);

      onAmountChange(newTotal.toFixed(2));
      return;
    }

    const touchedTotal = Array.from(newTouched).reduce((sum, id) => {
      const amt = parseFloat(manualAmounts[id]) || 0;
      return sum + amt;
    }, 0);

    const amountNum = parseFloat(amount);

    const remaining = amountNum - touchedTotal;

    const untouchedSum = untouchedMembers.reduce((sum, member) => {
      return sum + (parseFloat(manualAmounts[member.id]) || 0);
    }, 0);

    const tmp = remaining - untouchedSum;

    const perMemberAdjustment = tmp / untouchedMembers.length;

    let hasNegative = false;
    untouchedMembers.forEach((member) => {
      const currentAmount = parseFloat(manualAmounts[member.id]) || 0;
      const newAmount = currentAmount + perMemberAdjustment;
      if (newAmount < 0) {
        hasNegative = true;
      }
    });

    const newManualAmounts = { ...manualAmounts };

    if (hasNegative) {
      const newTotalAmount = amountNum + Math.abs(tmp);
      onAmountChange(newTotalAmount.toFixed(2));
    } else {
      untouchedMembers.forEach((member) => {
        const currentAmount = parseFloat(manualAmounts[member.id]) || 0;
        newManualAmounts[member.id] = (
          currentAmount + perMemberAdjustment
        ).toFixed(2);
      });
      onManualAmountsChange(newManualAmounts);
    }
  };

  const handleSplitModeChange = (newMode: "auto" | "manual" | "items") => {
    if (newMode === "manual") {
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum) && selectedMembers.length > 0) {
        const newManualAmounts: Record<string, string> = {};
        const baseShare =
          Math.ceil((amountNum / selectedMembers.length) * 100) / 100;
        let total = 0;

        selectedMembers.forEach((member, index) => {
          if (index === selectedMembers.length - 1) {
            const remainder = amountNum - total;
            newManualAmounts[member.id] = remainder.toFixed(2);
          } else {
            newManualAmounts[member.id] = baseShare.toFixed(2);
            total += baseShare;
          }
        });
        onManualAmountsChange(newManualAmounts);
      }
      onTouchedMembersChange(new Set());
      onSplitModeChange("manual");
    } else if (newMode === "auto") {
      onTouchedMembersChange(new Set());
      onSplitModeChange("auto");
    } else {
      onSplitModeChange("items");
    }
  };

  return (
    <View>
      <View className="mb-2">
        <Label className="mb-2">Rozdělit mezi</Label>
        <View className="flex-row bg-secondary rounded-lg p-0.5">
          {(["auto", "manual", "items"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => handleSplitModeChange(mode)}
              className={`flex-1 py-2 rounded-md items-center ${
                splitMode === mode ? "bg-primary" : ""
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  splitMode === mode
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {mode === "auto"
                  ? "Rovným dílem"
                  : mode === "manual"
                    ? "Ručně"
                    : "Položky"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {splitMode !== "items" && (
        <>
          {flatMembers.map((member) => {
            const isSelected = selectedMembers.some((m) => m.id === member.id);
            return (
              <View key={member.id} className="mb-2">
                <Pressable
                  className={`flex-row justify-between items-center py-3 px-3 rounded-lg ${
                    isSelected
                      ? "bg-secondary border border-primary"
                      : "bg-secondary"
                  }`}
                  onPress={() => handleMemberToggle(member)}
                >
                  <View className="flex-row items-center gap-3">
                    <Avatar name={member.name} imageUrl={member.avatar_url} size="xl" />
                    <Text className="text-base text-foreground font-medium flex-1">
                      {member.name} {member.surname}
                    </Text>
                  </View>
                </Pressable>

                {splitMode === "manual" && isSelected && (
                  <View className="mt-2 relative">
                    <Input
                      placeholder="0.00"
                      value={manualAmounts[member.id] || ""}
                      onChangeText={(value) =>
                        handleManualAmountChange(member.id, value)
                      }
                      onBlur={() => handleAmountBlur(member.id)}
                      keyboardType="decimal-pad"
                      className={
                        touchedMembers.has(member.id)
                          ? "border-2 border-primary"
                          : ""
                      }
                    />
                    {!touchedMembers.has(member.id) && (
                      <View className="absolute -top-2 right-2 bg-primary px-1.5 py-0.5 rounded">
                        <Text className="text-primary-foreground text-[10px] font-semibold">
                          Auto
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {splitMode === "auto" && selectedMembers.length > 0 && (
            <Text className="text-sm text-muted-foreground mb-3 font-light italic">
              {(() => {
                const amountNum = parseFloat(amount) || 0;
                if (selectedMembers.length === 1) {
                  return `Jediný člen zaplatí: ${formatCurrency(amountNum)}`;
                }
                const baseShare =
                  Math.ceil((amountNum / selectedMembers.length) * 100) / 100;
                const lastShare =
                  amountNum - baseShare * (selectedMembers.length - 1);
                if (Math.abs(baseShare - lastShare) < 0.01) {
                  return `Každý zaplatí: ${formatCurrency(baseShare)}`;
                }
                return `Každý zaplatí: ${formatCurrency(baseShare)} (poslední ${formatCurrency(lastShare)})`;
              })()}
            </Text>
          )}

          {splitMode === "manual" && (
            <Text className="text-sm text-muted-foreground mb-3 font-light italic">
              {(() => {
                const total = calculateTotalManualAmount();
                const targetAmount = parseFloat(amount) || 0;
                const untouchedCount = selectedMembers.filter(
                  (m) => !touchedMembers.has(m.id),
                ).length;

                if (untouchedCount > 0) {
                  return `Součet: ${formatCurrency(total)} / ${formatCurrency(targetAmount)}`;
                } else {
                  return `Součet: ${formatCurrency(total)} (celková částka se upravuje automaticky)`;
                }
              })()}
            </Text>
          )}
        </>
      )}

      {splitMode === "items" && (
        <ReceiptItemList
          items={expenseItems}
          onItemsChange={onExpenseItemsChange}
          flatMembers={flatMembers}
        />
      )}
    </View>
  );
};
