import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { DatePickerInput } from "../components/CreateChore/DatePickerInput";
import { MemberSelector } from "../components/CreateChore/MemberSelector";
import { MemberOrderList } from "../components/CreateChore/MemberOrderList";

interface Member {
  id: string;
  name: string;
  surname: string;
  avatar_url: string | null;
}

const CreateChore = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useEffect(() => {
    if (currentFlat?.id) {
      loadMembers();
    }
  }, [currentFlat]);

  const loadMembers = async () => {
    if (!currentFlat?.id) return;

    try {
      const { data, error } = await supabase
        .from("flat_profile")
        .select("profile_id, profiles(id, name, surname, avatar_url)")
        .eq("flat_id", currentFlat.id);

      if (error) {
        console.error("Error loading members:", error);
      } else if (data) {
        const membersList = data
          .map((item: any) => item.profiles)
          .filter((p: any) => p) as Member[];
        setMembers(membersList);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const toggleMember = (member: Member) => {
    const isSelected = selectedMembers.some((m) => m.id === member.id);
    if (isSelected) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== member.id));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const moveMemberUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...selectedMembers];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    setSelectedMembers(newOrder);
  };

  const moveMemberDown = (index: number) => {
    if (index === selectedMembers.length - 1) return;
    const newOrder = [...selectedMembers];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];
    setSelectedMembers(newOrder);
  };

  const handleCreateChore = async () => {
    // Zabránit multiple clicks
    if (isLoading) return;

    if (!currentFlat?.id) {
      showToast("Nejste přihlášeni do žádného bytu", "error");
      return;
    }

    if (!name.trim()) {
      showToast("Vyplňte název úkolu", "error");
      return;
    }

    if (
      !intervalDays ||
      isNaN(Number(intervalDays)) ||
      Number(intervalDays) < 1
    ) {
      showToast("Zadejte platný interval (číslo větší než 0)", "error");
      return;
    }

    if (!startDate.trim()) {
      showToast("Zadejte datum začátku", "error");
      return;
    }

    // Validace formátu data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      showToast("Neplatný formát data. Použijte YYYY-MM-DD", "error");
      return;
    }

    if (selectedMembers.length === 0) {
      showToast("Vyberte alespoň jednoho uživatele", "error");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Vytvoříme chore
      const { data: choreData, error: choreError } = await supabase
        .from("chores")
        .insert({
          flat_id: currentFlat.id,
          name: name.trim(),
          description: description.trim() || null,
          interval_days: Number(intervalDays),
          start_date: startDate,
        })
        .select()
        .single();

      if (choreError) {
        showToast(
          "Nepodařilo se vytvořit úkol: " + choreError.message,
          "error",
        );
        return;
      }

      // 2. Přiřadíme uživatele s pořadím
      const assignments = selectedMembers.map((member, index) => ({
        chore_id: choreData.id,
        profile_id: member.id,
        rotation_order: index + 1,
      }));

      const { error: assignError } = await supabase
        .from("chore_profile")
        .insert(assignments);

      if (assignError) {
        showToast(
          "Nepodařilo se přiřadit uživatele: " + assignError.message,
          "error",
        );
      } else {
        showToast("Úkol vytvořen!", "success");
        router.back();
      }
    } catch (error: any) {
      showToast("Nepodařilo se vytvořit úkol: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Název *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="např. Vytřít podlahu"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Popis</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Volitelný popis úkolu"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interval (dnÅ¯) *</Text>
          <TextInput
            style={styles.input}
            value={intervalDays}
            onChangeText={setIntervalDays}
            placeholder="např. 7"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Datum začátku *</Text>
          <DatePickerInput value={startDate} onChange={setStartDate} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Přiřazení uživatelé *</Text>
          <MemberSelector
            members={members}
            selectedMembers={selectedMembers}
            onToggleMember={toggleMember}
          />
          <MemberOrderList
            members={selectedMembers}
            onMoveUp={moveMemberUp}
            onMoveDown={moveMemberDown}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            isLoading && styles.createButtonDisabled,
          ]}
          onPress={handleCreateChore}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? "Vytváření..." : "Vytvořit úkol"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default CreateChore;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  memberAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  memberName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  orderSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginRight: 8,
    width: 24,
  },
  orderControls: {
    flexDirection: "row",
    gap: 4,
  },
  orderButton: {
    padding: 4,
  },
  orderButtonDisabled: {
    opacity: 0.3,
  },
  createButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
