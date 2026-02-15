import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/ui/text"
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../utils/supabase";
import { useFlatContext } from "../../contexts/FlatContext";
import { useToast } from "../../contexts/ToastContext";
import { DatePickerInput } from "../DatePickerInput";
import { MemberSelector } from "../MemberSelector";
import { MemberOrderList } from "./MemberOrderList";
import { Member } from "../../types/members";

interface ChoreFormProps {
  mode: "create" | "edit";
  choreId?: string;
  initialData?: {
    name: string;
    description: string;
    intervalDays: string;
    startDate: Date;
    selectedMembers: Member[];
  };
}

export const ChoreForm: React.FC<ChoreFormProps> = ({
  mode,
  choreId,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [intervalDays, setIntervalDays] = useState(
    initialData?.intervalDays || "",
  );
  const [startDate, setStartDate] = useState(
    initialData?.startDate || new Date(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>(
    initialData?.selectedMembers || [],
  );
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useEffect(() => {
    if (currentFlat?.id) {
      loadMembers();
    }
  }, [currentFlat]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setIntervalDays(initialData.intervalDays);
      setStartDate(initialData.startDate);
      setSelectedMembers(initialData.selectedMembers);
    }
  }, [initialData]);

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

  const validateForm = (): boolean => {
    if (!currentFlat?.id) {
      showToast("Nejste přihlášeni do žádného bytu", "error");
      return false;
    }

    if (!name.trim()) {
      showToast("Vyplňte název úkolu", "error");
      return false;
    }

    if (
      !intervalDays ||
      isNaN(Number(intervalDays)) ||
      Number(intervalDays) < 1
    ) {
      showToast("Zadejte platný interval (číslo větší než 0)", "error");
      return false;
    }

    if (!startDate || isNaN(startDate.getTime())) {
      showToast("Zadejte platné datum začátku", "error");
      return false;
    }

    if (selectedMembers.length === 0) {
      showToast("Vyberte alespoň jednoho uživatele", "error");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (mode === "create") {
        await handleCreate();
      } else {
        await handleUpdate();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    const { data: choreData, error: choreError } = await supabase
      .from("chores")
      .insert({
        flat_id: currentFlat!.id,
        name: name.trim(),
        description: description.trim() || null,
        interval_days: Number(intervalDays),
        start_date: startDate.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (choreError) {
      showToast("Nepodařilo se vytvořit úkol: " + choreError.message, "error");
      return;
    }

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
  };

  const handleUpdate = async () => {
    if (!choreId) return;

    const { error: choreError } = await supabase
      .from("chores")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        interval_days: Number(intervalDays),
        start_date: startDate.toISOString().split("T")[0],
      })
      .eq("id", choreId);

    if (choreError) {
      showToast(
        "Nepodařilo se aktualizovat úkol: " + choreError.message,
        "error",
      );
      return;
    }

    const { error: deleteError } = await supabase
      .from("chore_profile")
      .delete()
      .eq("chore_id", choreId);

    if (deleteError) {
      showToast(
        "Nepodařilo se aktualizovat přiřazení: " + deleteError.message,
        "error",
      );
      return;
    }

    const assignments = selectedMembers.map((member, index) => ({
      chore_id: choreId,
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
      showToast("Úkol aktualizován!", "success");
      router.back();
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
          <Text style={styles.label}>Interval (dnů) *</Text>
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
          <DatePickerInput
            value={startDate}
            onChange={setStartDate}
            showIcon={false}
          />
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
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading
              ? mode === "create"
                ? "Vytváření..."
                : "Ukládání..."
              : mode === "create"
                ? "Vytvořit úkol"
                : "Uložit změny"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

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
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
