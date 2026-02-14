import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { Profile } from "../types/profile";
import { MemberSelector } from "./MemberSelector";
import { ExpenseSplitSection } from "./ExpenseSplitSection";
import { DatePickerInput } from "./DatePickerInput";

interface ExpenseFormProps {
  mode: "create" | "edit";
  expenseId?: string;
  initialData?: {
    title: string;
    amount: string;
    date: Date;
    selectedPayer: Profile[];
    selectedMembers: Profile[];
    manualAmounts: Record<string, string>;
    splitMode: "auto" | "manual";
  };
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  mode,
  expenseId,
  initialData,
}) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [amount, setAmount] = useState(initialData?.amount || "");
  const [date, setDate] = useState(initialData?.date || new Date());
  const [selectedPayer, setSelectedPayer] = useState<Profile[]>(
    initialData?.selectedPayer || [],
  );
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>(
    initialData?.selectedMembers || [],
  );
  const [flatMembers, setFlatMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<"auto" | "manual">(
    initialData?.splitMode || "auto",
  );
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(
    initialData?.manualAmounts || {},
  );
  const [touchedMembers, setTouchedMembers] = useState<Set<string>>(new Set());

  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useEffect(() => {
    loadFlatMembers();
    getCurrentUser();
  }, [currentFlat]);

  useEffect(() => {
    // Set default payer when members are loaded and current user is known (only in create mode)
    if (
      mode === "create" &&
      flatMembers.length > 0 &&
      currentUserId &&
      selectedPayer.length === 0
    ) {
      const currentUser = flatMembers.find((m) => m.id === currentUserId);
      if (currentUser) {
        setSelectedPayer([currentUser]);
      }
    }
  }, [flatMembers, currentUserId, mode]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadFlatMembers = async () => {
    if (!currentFlat?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("flat_profile")
        .select(
          `
        profile_id,
        profiles (
          id,
          name,
          surname,
          avatar_url
        )
      `,
        )
        .eq("flat_id", currentFlat.id);

      if (error) {
        console.error("Error loading flat members:", error);
        showToast("Nepodařilo se načíst členy bytu", "error");
      } else {
        const members: Profile[] = data.map((m: any) => ({
          id: m.profiles.id,
          name: m.profiles.name,
          surname: m.profiles.surname,
          avatar_url: m.profiles.avatar_url,
        }));
        setFlatMembers(members);
        // Pre-select all members by default only in create mode
        if (mode === "create" && selectedMembers.length === 0) {
          setSelectedMembers(members);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst členy bytu", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayerSelect = (member: Profile) => {
    // For single select, replace the selection
    setSelectedPayer([member]);
  };

  const calculateTotalManualAmount = () => {
    return Object.values(manualAmounts).reduce((sum, val) => {
      const num = parseFloat(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleSave = async () => {
    // Validation
    const finalTitle = title.trim() || `Výdaj z ${formatDate(date)}`;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Zadejte platnou částku", "error");
      return;
    }

    if (selectedPayer.length === 0) {
      showToast("Vyberte plátce", "error");
      return;
    }

    if (selectedMembers.length === 0) {
      showToast("Vyberte alespoň jednoho člena pro rozdělení", "error");
      return;
    }

    // Validate manual amounts if in manual mode
    if (splitMode === "manual") {
      const totalManual = calculateTotalManualAmount();
      const untouchedCount = selectedMembers.filter(
        (m) => !touchedMembers.has(m.id),
      ).length;

      // Only validate total if there are untouched members
      // If all are touched, the amount has been auto-updated
      if (untouchedCount > 0 && Math.abs(totalManual - amountNum) > 0.01) {
        showToast(
          `Součet částek (${totalManual.toFixed(2)} Kč) musí odpovídat celkové částce (${amountNum.toFixed(2)} Kč)`,
          "error",
        );
        return;
      }

      // Check that all selected members have amounts
      for (const member of selectedMembers) {
        const memberAmount = parseFloat(manualAmounts[member.id] || "0");
        if (isNaN(memberAmount) || memberAmount < 0) {
          showToast(`Zadejte platnou částku pro ${member.name}`, "error");
          return;
        }
      }

      // If all members are touched, use the calculated total as the final amount
      if (untouchedCount === 0) {
        // Update amountNum to the actual total
        const finalAmount = totalManual;
        if (finalAmount <= 0) {
          showToast("Celková částka musí být větší než 0", "error");
          return;
        }
      }
    }

    if (!currentFlat?.id) {
      showToast("Není vybrán žádný byt", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Determine final amount - if all members are touched in manual mode, use their total
      let finalAmount = amountNum;
      if (splitMode === "manual") {
        const untouchedCount = selectedMembers.filter(
          (m) => !touchedMembers.has(m.id),
        ).length;
        if (untouchedCount === 0) {
          finalAmount = calculateTotalManualAmount();
        }
      }

      if (mode === "edit" && expenseId) {
        // Update existing expense
        const { error: expenseError } = await supabase
          .from("expenses")
          .update({
            payer_id: selectedPayer[0].id,
            title: finalTitle,
            amount: finalAmount,
            happened_at: date.toISOString(),
          })
          .eq("id", expenseId);

        if (expenseError) {
          console.error("Error updating expense:", expenseError);
          showToast(
            "Nepodařilo se upravit výdaj: " + expenseError.message,
            "error",
          );
          return;
        }

        // Delete existing shares
        const { error: deleteSharesError } = await supabase
          .from("expense_shares")
          .delete()
          .eq("expense_id", expenseId);

        if (deleteSharesError) {
          console.error("Error deleting old shares:", deleteSharesError);
          showToast(
            "Nepodařilo se upravit rozdělení: " + deleteSharesError.message,
            "error",
          );
          return;
        }

        // Insert new shares
        const expenseShares = selectedMembers.map((member, index) => {
          let shareAmount: number;

          if (splitMode === "auto") {
            if (index === selectedMembers.length - 1) {
              const baseShare =
                Math.ceil((finalAmount / selectedMembers.length) * 100) / 100;
              const totalBeforeLast = baseShare * (selectedMembers.length - 1);
              shareAmount = finalAmount - totalBeforeLast;
            } else {
              shareAmount =
                Math.ceil((finalAmount / selectedMembers.length) * 100) / 100;
            }
          } else {
            shareAmount = parseFloat(manualAmounts[member.id] || "0");
          }

          return {
            expense_id: expenseId,
            profile_id: member.id,
            owed_amount: shareAmount,
          };
        });

        const { error: sharesError } = await supabase
          .from("expense_shares")
          .insert(expenseShares);

        if (sharesError) {
          console.error("Error inserting expense shares:", sharesError);
          showToast(
            "Nepodařilo se uložit rozdělení: " + sharesError.message,
            "error",
          );
          return;
        }

        showToast("Výdaj byl úspěšně upraven", "success");
      } else {
        // Create new expense
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .insert({
            flat_id: currentFlat.id,
            payer_id: selectedPayer[0].id,
            title: finalTitle,
            amount: finalAmount,
            happened_at: date.toISOString(),
            is_settlement: false,
          })
          .select()
          .single();

        if (expenseError) {
          console.error("Error inserting expense:", expenseError);
          showToast(
            "Nepodařilo se uložit výdaj: " + expenseError.message,
            "error",
          );
          return;
        }

        // Insert expense shares for each selected member
        const expenseShares = selectedMembers.map((member, index) => {
          let shareAmount: number;

          if (splitMode === "auto") {
            if (index === selectedMembers.length - 1) {
              const baseShare =
                Math.ceil((finalAmount / selectedMembers.length) * 100) / 100;
              const totalBeforeLast = baseShare * (selectedMembers.length - 1);
              shareAmount = finalAmount - totalBeforeLast;
            } else {
              shareAmount =
                Math.ceil((finalAmount / selectedMembers.length) * 100) / 100;
            }
          } else {
            shareAmount = parseFloat(manualAmounts[member.id] || "0");
          }

          return {
            expense_id: expenseData.id,
            profile_id: member.id,
            owed_amount: shareAmount,
          };
        });

        const { error: sharesError } = await supabase
          .from("expense_shares")
          .insert(expenseShares);

        if (sharesError) {
          console.error("Error inserting expense shares:", sharesError);
          showToast(
            "Nepodařilo se uložit rozdělení: " + sharesError.message,
            "error",
          );
          return;
        }

        showToast("Výdaj byl úspěšně přidán", "success");
      }

      router.back();
    } catch (error) {
      console.error("Error:", error);
      showToast("Došlo k chybě při ukládání", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Název výdaje</Text>
          <TextInput
            style={styles.input}
            placeholder="např. Nákup v Albertu"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Částka (Kč)</Text>
          <TextInput
            style={[
              styles.input,
              splitMode === "manual" &&
                selectedMembers.filter((m) => !touchedMembers.has(m.id))
                  .length === 0 &&
                selectedMembers.length > 0 &&
                styles.inputReadOnly,
            ]}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
            editable={
              !(
                splitMode === "manual" &&
                selectedMembers.filter((m) => !touchedMembers.has(m.id))
                  .length === 0 &&
                selectedMembers.length > 0
              )
            }
          />
          {splitMode === "manual" &&
            selectedMembers.filter((m) => !touchedMembers.has(m.id)).length ===
              0 &&
            selectedMembers.length > 0 && (
              <Text style={styles.readOnlyHint}>
                Částka se počítá automaticky z rozdělení
              </Text>
            )}
        </View>

        {/* Date Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Datum</Text>
          <DatePickerInput
            value={date}
            onChange={setDate}
            maximumDate={new Date()}
          />
        </View>

        {/* Who Paid */}
        <View style={styles.section}>
          <Text style={styles.label}>Kdo zaplatil</Text>
          <MemberSelector
            members={flatMembers}
            selectedMembers={selectedPayer}
            onToggleMember={handlePayerSelect}
            multiSelect={false}
            title="Vyberte plátce"
          />
        </View>

        {/* For Whom (Split) */}
        <ExpenseSplitSection
          flatMembers={flatMembers}
          selectedMembers={selectedMembers}
          onSelectedMembersChange={setSelectedMembers}
          splitMode={splitMode}
          onSplitModeChange={setSplitMode}
          amount={amount}
          onAmountChange={setAmount}
          manualAmounts={manualAmounts}
          onManualAmountsChange={setManualAmounts}
          touchedMembers={touchedMembers}
          onTouchedMembersChange={setTouchedMembers}
        />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <Text style={styles.cancelButtonText}>Zrušit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {mode === "edit" ? "Upravit" : "Uložit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
  },
  inputReadOnly: {
    backgroundColor: "#f0f0f0",
    color: "#666",
  },
  readOnlyHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  bottomActions: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
