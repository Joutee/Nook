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
import DateTimePicker from "@react-native-community/datetimepicker";
import { MemberSelector } from "../components/MemberSelector";

const ExpenseAdd = () => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPayer, setSelectedPayer] = useState<Profile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);
  const [flatMembers, setFlatMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<"auto" | "manual">("auto");
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(
    {},
  );
  const [touchedMembers, setTouchedMembers] = useState<Set<string>>(new Set());

  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useEffect(() => {
    loadFlatMembers();
    getCurrentUser();
  }, [currentFlat]);

  useEffect(() => {
    // Set default payer when members are loaded and current user is known
    if (flatMembers.length > 0 && currentUserId && selectedPayer.length === 0) {
      const currentUser = flatMembers.find((m) => m.id === currentUserId);
      if (currentUser) {
        setSelectedPayer([currentUser]);
      }
    }
  }, [flatMembers, currentUserId]);

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
        .from("flat_profile") // 1. Jdeme do vazební tabulky
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
        ) // 2. Připojíme data z tabulky profiles
        .eq("flat_id", currentFlat.id); // Doplň ID bytu

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
        // Pre-select all members by default
        setSelectedMembers(members);
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

  const handleMemberToggle = (member: Profile) => {
    const isSelected = selectedMembers.some((m) => m.id === member.id);
    if (isSelected) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== member.id));
      // Remove manual amount if exists
      const newManualAmounts = { ...manualAmounts };
      delete newManualAmounts[member.id];
      setManualAmounts(newManualAmounts);
      // Remove from touched members
      const newTouched = new Set(touchedMembers);
      newTouched.delete(member.id);
      setTouchedMembers(newTouched);
    } else {
      const newSelectedMembers = [...selectedMembers, member];
      setSelectedMembers(newSelectedMembers);

      // In manual mode, auto-calculate amount for new member
      if (splitMode === "manual") {
        const amountNum = parseFloat(amount);
        if (!isNaN(amountNum)) {
          // Calculate total of touched members
          const touchedTotal = Array.from(touchedMembers).reduce(
            (sum, memberId) => {
              return sum + (parseFloat(manualAmounts[memberId]) || 0);
            },
            0,
          );

          // Remaining amount to distribute among untouched
          const untouchedCount = newSelectedMembers.filter(
            (m) => !touchedMembers.has(m.id),
          ).length;
          const remaining = amountNum - touchedTotal;

          if (untouchedCount > 0) {
            const baseShare =
              Math.ceil((remaining / untouchedCount) * 100) / 100;
            const newManualAmounts = { ...manualAmounts };
            let distributedTotal = 0;

            newSelectedMembers.forEach((m, index) => {
              if (!touchedMembers.has(m.id)) {
                const isLast = index === newSelectedMembers.length - 1;
                if (isLast) {
                  newManualAmounts[m.id] = (
                    remaining - distributedTotal
                  ).toFixed(2);
                } else {
                  newManualAmounts[m.id] = baseShare.toFixed(2);
                  distributedTotal += baseShare;
                }
              }
            });

            setManualAmounts(newManualAmounts);
          }
        }
      }
    }
  };

  const handleManualAmountChange = (memberId: string, value: string) => {
    // Mark this member as touched
    const newTouched = new Set(touchedMembers);
    newTouched.add(memberId);
    setTouchedMembers(newTouched);

    // Update the manual amount for this member
    const newManualAmounts = {
      ...manualAmounts,
      [memberId]: value,
    };

    const valueNum = parseFloat(value) || 0;

    // Find untouched members
    const untouchedMembers = selectedMembers.filter(
      (m) => !newTouched.has(m.id),
    );

    if (untouchedMembers.length > 0) {
      // Recalculate amounts for untouched members
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum)) {
        // Calculate total of all touched members
        const touchedTotal = Array.from(newTouched).reduce((sum, id) => {
          const amt =
            id === memberId ? valueNum : parseFloat(manualAmounts[id]) || 0;
          return sum + amt;
        }, 0);

        // Remaining amount for untouched members
        const remaining = amountNum - touchedTotal;

        if (remaining > 0) {
          const baseShare =
            Math.ceil((remaining / untouchedMembers.length) * 100) / 100;
          let distributedTotal = 0;

          untouchedMembers.forEach((member, index) => {
            const isLast = index === untouchedMembers.length - 1;
            if (isLast) {
              newManualAmounts[member.id] = (
                remaining - distributedTotal
              ).toFixed(2);
            } else {
              newManualAmounts[member.id] = baseShare.toFixed(2);
              distributedTotal += baseShare;
            }
          });
        } else {
          // If remaining is negative or zero, set untouched to 0
          untouchedMembers.forEach((member) => {
            newManualAmounts[member.id] = "0.00";
          });
        }
      }

      setManualAmounts(newManualAmounts);
    } else {
      // All members are touched - update total amount
      const newTotal = selectedMembers.reduce((sum, member) => {
        const amt =
          member.id === memberId
            ? valueNum
            : parseFloat(manualAmounts[member.id]) || 0;
        return sum + amt;
      }, 0);

      setAmount(newTotal.toFixed(2));
      setManualAmounts(newManualAmounts);
    }
  };

  const calculateTotalManualAmount = () => {
    return Object.values(manualAmounts).reduce((sum, val) => {
      const num = parseFloat(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  const getAutoShareAmount = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || selectedMembers.length === 0) return 0;
    // Return the base share that most members will pay (rounded up)
    return Math.ceil((amountNum / selectedMembers.length) * 100) / 100;
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
        setManualAmounts(newManualAmounts);
      }
      // Reset touched members when switching to manual
      setTouchedMembers(new Set());
      setSplitMode("manual");
    } else {
      // Switching to auto
      setTouchedMembers(new Set());
      setSplitMode("auto");
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate);
    }
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

      // 1. Insert the expense
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

      // 2. Insert expense shares for each selected member
      const expenseShares = selectedMembers.map((member, index) => {
        let shareAmount: number;

        if (splitMode === "auto") {
          if (index === selectedMembers.length - 1) {
            // Last member gets the remainder to ensure exact total
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
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
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
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
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
                        touchedMembers.has(member.id) &&
                          styles.amountInputTouched,
                      ]}
                      placeholder="0.00"
                      value={manualAmounts[member.id] || ""}
                      onChangeText={(value) =>
                        handleManualAmountChange(member.id, value)
                      }
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
            <Text style={styles.saveButtonText}>Uložit</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ExpenseAdd;

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
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
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
