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
import { Profile } from "../types/finance";
import DateTimePicker from "@react-native-community/datetimepicker";

const ExpenseAdd = () => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [payerId, setPayerId] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );
  const [flatMembers, setFlatMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useEffect(() => {
    loadFlatMembers();
    getCurrentUser();
  }, [currentFlat]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      // Default payer to current user
      setPayerId(user.id);
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
          avatar_url: m.profiles.avatar_url,
        }));
        setFlatMembers(members);
        // Pre-select all members by default
        setSelectedMembers(new Set(members.map((m) => m.id)));
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst členy bytu", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
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

    if (!payerId) {
      showToast("Vyberte plátce", "error");
      return;
    }

    if (selectedMembers.size === 0) {
      showToast("Vyberte alespoň jednoho člena pro rozdělení", "error");
      return;
    }

    if (!currentFlat?.id) {
      showToast("Není vybrán žádný byt", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Calculate share per person
      const shareAmount = amountNum / selectedMembers.size;

      // 1. Insert the expense
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          flat_id: currentFlat.id,
          payer_id: payerId,
          title: finalTitle,
          amount: amountNum,
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
      const expenseShares = Array.from(selectedMembers).map((memberId) => ({
        expense_id: expenseData.id,
        profile_id: memberId,
        owed_amount: shareAmount,
      }));

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
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
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
          {flatMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberItem,
                payerId === member.id && styles.memberItemSelected,
              ]}
              onPress={() => setPayerId(member.id)}
            >
              <View style={styles.memberLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>{member.name}</Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  payerId === member.id && styles.radioButtonSelected,
                ]}
              >
                {payerId === member.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* For Whom (Split) */}
        <View style={styles.section}>
          <Text style={styles.label}>Rozdělit mezi</Text>
          <Text style={styles.helperText}>
            {selectedMembers.size > 0 &&
              `Každý zaplatí: ${(parseFloat(amount) / selectedMembers.size || 0).toFixed(2)} Kč`}
          </Text>
          {flatMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberItem}
              onPress={() => toggleMemberSelection(member.id)}
            >
              <View style={styles.memberLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>{member.name}</Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  selectedMembers.has(member.id) && styles.checkboxSelected,
                ]}
              >
                {selectedMembers.has(member.id) && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
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
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
  },
  memberItemSelected: {
    backgroundColor: "#e7f3ff",
    borderWidth: 2,
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
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    borderColor: "#007AFF",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
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
