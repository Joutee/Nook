import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Member } from "@/types/members";
import { formatCurrency } from "@/lib/financeUtils";
import { Avatar } from "@/components/ui/avatar";

interface ExpenseSplitSectionProps {
  flatMembers: Member[];
  selectedMembers: Member[];
  onSelectedMembersChange: (members: Member[]) => void;
  splitMode: "auto" | "manual";
  onSplitModeChange: (mode: "auto" | "manual") => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  manualAmounts: Record<string, string>;
  onManualAmountsChange: (amounts: Record<string, string>) => void;
  touchedMembers: Set<string>;
  onTouchedMembersChange: (touched: Set<string>) => void;
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
      // Remove manual amount if exists
      const newManualAmounts = { ...manualAmounts };
      delete newManualAmounts[member.id];
      onManualAmountsChange(newManualAmounts);
      // Remove from touched members
      const newTouched = new Set(touchedMembers);
      newTouched.delete(member.id);
      onTouchedMembersChange(newTouched);
    } else {
      // Simply add the member - field will be empty/zero until user changes any field
      onSelectedMembersChange([...selectedMembers, member]);
    }
  };

  const handleManualAmountChange = (memberId: string, value: string) => {
    // Just update the value - recalculation happens on blur
    const newManualAmounts = {
      ...manualAmounts,
      [memberId]: value,
    };
    onManualAmountsChange(newManualAmounts);
  };

  const handleAmountBlur = (memberId: string) => {
    // Mark this member as touched
    const newTouched = new Set(touchedMembers);
    newTouched.add(memberId);
    onTouchedMembersChange(newTouched);

    const valueNum = parseFloat(manualAmounts[memberId]) || 0;

    // Find untouched members
    const untouchedMembers = selectedMembers.filter(
      (m) => !newTouched.has(m.id),
    );

    // If no untouched members, just update total amount to sum of all fields
    if (untouchedMembers.length === 0) {
      const newTotal = selectedMembers.reduce((sum, member) => {
        const amt = parseFloat(manualAmounts[member.id]) || 0;
        return sum + amt;
      }, 0);

      onAmountChange(newTotal.toFixed(2));
      return;
    }

    // Calculate total of all touched members (including the one just edited)
    const touchedTotal = Array.from(newTouched).reduce((sum, id) => {
      const amt = parseFloat(manualAmounts[id]) || 0;
      return sum + amt;
    }, 0);

    const amountNum = parseFloat(amount);

    // Calculate remaining for untouched members
    const remaining = amountNum - touchedTotal;

    // Sum of current untouched amounts
    const untouchedSum = untouchedMembers.reduce((sum, member) => {
      return sum + (parseFloat(manualAmounts[member.id]) || 0);
    }, 0);

    // Calculate the difference
    const tmp = remaining - untouchedSum;

    // Calculate adjustment per untouched member
    const perMemberAdjustment = tmp / untouchedMembers.length;

    // Calculate new untouched amounts
    let hasNegative = false;
    untouchedMembers.forEach((member) => {
      const currentAmount = parseFloat(manualAmounts[member.id]) || 0;
      const newAmount = currentAmount + perMemberAdjustment;
      if (newAmount < 0) {
        hasNegative = true;
      }
    });

    const newManualAmounts = { ...manualAmounts };

    // If any untouched would be negative, increase total amount and keep untouched unchanged
    if (hasNegative) {
      const newTotalAmount = amountNum + Math.abs(tmp);
      onAmountChange(newTotalAmount.toFixed(2));
    } else {
      // Apply adjustments to untouched members
      untouchedMembers.forEach((member) => {
        const currentAmount = parseFloat(manualAmounts[member.id]) || 0;
        newManualAmounts[member.id] = (
          currentAmount + perMemberAdjustment
        ).toFixed(2);
      });
      onManualAmountsChange(newManualAmounts);
    }
  };

  const handleSplitModeChange = (isManual: boolean) => {
    if (isManual) {
      // Switching to manual - pre-fill with equal amounts
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum) && selectedMembers.length > 0) {
        const newManualAmounts: Record<string, string> = {};
        const baseShare =
          Math.ceil((amountNum / selectedMembers.length) * 100) / 100;
        let total = 0;

        selectedMembers.forEach((member, index) => {
          if (index === selectedMembers.length - 1) {
            // Last member gets the remainder to ensure exact total
            const remainder = amountNum - total;
            newManualAmounts[member.id] = remainder.toFixed(2);
          } else {
            newManualAmounts[member.id] = baseShare.toFixed(2);
            total += baseShare;
          }
        });
        onManualAmountsChange(newManualAmounts);
      }
      // Reset touched members when switching to manual
      onTouchedMembersChange(new Set());
      onSplitModeChange("manual");
    } else {
      // Switching to auto
      onTouchedMembersChange(new Set());
      onSplitModeChange("auto");
    }
  };

  return (
    <View>
      <View className="flex-row justify-between items-center mb-2">
        <Label>Rozdělit mezi</Label>
        <Switch
          value={splitMode === "manual"}
          onValueChange={handleSplitModeChange}
          leftIcon="calculator-outline"
          rightIcon="hand-right-outline"
        />
      </View>

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
    </View>
  );
};
