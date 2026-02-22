import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog } from "@/components/ui/alert-dialog";
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import { DatePickerInput } from "./DatePickerInput";
import { MemberSelector } from "./MemberSelector";
import { MemberOrderList } from "./MemberOrderList";
import { Member } from "../types/members";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
        .eq("flat_id", currentFlat.id)
        .eq("active", true);

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

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!choreId) return;

    setIsDeleting(true);
    try {
      // Delete chore (assignments and completions will be deleted automatically due to CASCADE)
      const { error } = await supabase
        .from("chores")
        .delete()
        .eq("id", choreId);

      if (error) {
        showToast("Nepodařilo se smazat úkol: " + error.message, "error");
      } else {
        showToast("Úkol byl smazán", "success");
        router.replace("/chores");
      }
    } catch (error: any) {
      console.error("Error deleting chore:", error);
      showToast("Nepodařilo se smazat úkol: " + error.message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, paddingTop: 10, paddingBottom: 10 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
      className="flex-1 bg-background"
    >
      <Card className="mx-4">
        <CardContent className="gap-4">
          <View className="gap-2">
            <Label>Název *</Label>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="např. Vytřít podlahu"
            />
          </View>

          <View className="gap-2">
            <Label>Popis</Label>
            <Textarea
              value={description}
              onChangeText={setDescription}
              placeholder="Volitelný popis úkolu"
              numberOfLines={4}
            />
          </View>

          <View className="gap-2">
            <Label>Interval (dnů) *</Label>
            <Input
              value={intervalDays}
              onChangeText={setIntervalDays}
              placeholder="např. 7"
              keyboardType="number-pad"
            />
          </View>

          <View className="gap-2">
            <Label>Datum začátku *</Label>
            <DatePickerInput
              value={startDate}
              onChange={setStartDate}
              showIcon={false}
            />
          </View>

          <View className="gap-2">
            <Label>Přiřazení uživatelé *</Label>
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

          {/* Bottom Actions */}
          <View className="flex-row gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => router.back()}
              disabled={isLoading || isDeleting}
            >
              <Text>Zrušit</Text>
            </Button>
            <Button
              className="flex-1"
              onPress={handleSubmit}
              disabled={isLoading || isDeleting}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text>{mode === "edit" ? "Upravit" : "Vytvořit úkol"}</Text>
              )}
            </Button>
          </View>

          {/* Delete Button (only in edit mode) */}
          {mode === "edit" && choreId && (
            <View className=" pt-0">
              <Button
                variant="destructive"
                onPress={handleDelete}
                disabled={isDeleting || isLoading}
                className="flex-row gap-2"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text>Smazat úkol</Text>
                  </>
                )}
              </Button>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Smazat úkol"
        description="Opravdu chcete smazat tento úkol? Tuto akci nelze vrátit zpět."
        cancelText="Zrušit"
        actionText="Smazat"
        onAction={confirmDelete}
        destructive
      />
    </KeyboardAwareScrollView>
  );
};
