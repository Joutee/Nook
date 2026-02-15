import React from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Text } from "@/components/ui/text"
import { Ionicons } from "@expo/vector-icons";
import { Profile } from "../types/profile";

interface ExpenseSplitSectionProps {
  flatMembers: Profile[];
  selectedMembers: Profile[];
  onSelectedMembersChange: (members: Profile[]) => void;
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

  const handleMemberToggle = (member: Profile) => {
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

  const handleSplitModeChange = () => {
    if (splitMode === "auto") {
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
    <View style={styles.section}>
      <View style={styles.splitHeader}>
        <Text style={styles.label}>Rozdělit mezi</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Automaticky</Text>
          <TouchableOpacity
            style={[
              styles.switch,
              splitMode === "manual" && styles.switchActive,
            ]}
            onPress={handleSplitModeChange}
          >
            <View
              style={[
                styles.switchThumb,
                splitMode === "manual" && styles.switchThumbActive,
              ]}
            />
          </TouchableOpacity>
          <Text style={styles.switchLabel}>Manuálně</Text>
        </View>
      </View>

      {splitMode === "auto" && selectedMembers.length > 0 && (
        <Text style={styles.helperText}>
          {(() => {
            const amountNum = parseFloat(amount) || 0;
            if (selectedMembers.length === 1) {
              return `Jediný člen zaplatí: ${amountNum.toFixed(2)} Kč`;
            }
            const baseShare =
              Math.ceil((amountNum / selectedMembers.length) * 100) / 100;
            const lastShare =
              amountNum - baseShare * (selectedMembers.length - 1);
            if (Math.abs(baseShare - lastShare) < 0.01) {
              return `Každý zaplatí: ${baseShare.toFixed(2)} Kč`;
            }
            return `Každý zaplatí: ${baseShare.toFixed(2)} Kč (poslední ${lastShare.toFixed(2)} Kč)`;
          })()}
        </Text>
      )}

      {splitMode === "manual" && (
        <Text style={styles.helperText}>
          {(() => {
            const total = calculateTotalManualAmount();
            const targetAmount = parseFloat(amount) || 0;
            const untouchedCount = selectedMembers.filter(
              (m) => !touchedMembers.has(m.id),
            ).length;

            if (untouchedCount > 0) {
              return `Součet: ${total.toFixed(2)} Kč / ${targetAmount.toFixed(2)} Kč (${untouchedCount} automaticky přepočítáno)`;
            } else {
              return `Součet: ${total.toFixed(2)} Kč (celková částka se upravuje automaticky)`;
            }
          })()}
        </Text>
      )}

      {flatMembers.map((member) => {
        const isSelected = selectedMembers.some((m) => m.id === member.id);
        return (
          <View key={member.id} style={styles.memberRow}>
            <TouchableOpacity
              style={[
                styles.memberItem,
                isSelected && styles.memberItemSelected,
              ]}
              onPress={() => handleMemberToggle(member)}
            >
              <View style={styles.memberLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>
                  {member.surname
                    ? `${member.name} ${member.surname}`
                    : member.name}
                </Text>
              </View>
              <View
                style={[styles.checkbox, isSelected && styles.checkboxSelected]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            {splitMode === "manual" && isSelected && (
              <View style={styles.amountInputContainer}>
                <TextInput
                  style={[
                    styles.amountInput,
                    touchedMembers.has(member.id) && styles.amountInputTouched,
                  ]}
                  placeholder="0.00"
                  value={manualAmounts[member.id] || ""}
                  onChangeText={(value) =>
                    handleManualAmountChange(member.id, value)
                  }
                  onBlur={() => handleAmountBlur(member.id)}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
                {!touchedMembers.has(member.id) && (
                  <Text style={styles.autoLabel}>Auto</Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#fff",
    marginBottom: 16,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: "#28a745",
    marginBottom: 12,
    fontWeight: "500",
  },
  splitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchLabel: {
    fontSize: 12,
    color: "#666",
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ddd",
    padding: 2,
    justifyContent: "center",
  },
  switchActive: {
    backgroundColor: "#007AFF",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  memberRow: {
    marginBottom: 8,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  memberItemSelected: {
    backgroundColor: "#e7f3ff",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  memberLeft: {
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
  memberName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  amountInputContainer: {
    marginTop: 8,
    position: "relative",
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
  },
  amountInputTouched: {
    borderColor: "#28a745",
    borderWidth: 2,
  },
  autoLabel: {
    position: "absolute",
    top: -8,
    right: 8,
    backgroundColor: "#007AFF",
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
