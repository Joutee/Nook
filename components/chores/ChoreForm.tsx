import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { MemberSelector } from "@/components/shared/MemberSelector";
import { MemberOrderList } from "@/components/flats/MemberOrderList";
import { Member } from "@/types/members";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import logger from "@/lib/logger";
import { RecurringInterval } from "@/types/finance";
import { RecurringIntervalPicker } from "@/components/shared/RecurringIntervalPicker";

interface ChoreFormProps {
  mode: "create" | "edit";
  choreId?: string;
  initialData?: {
    name: string;
    description: string;
    intervalType: RecurringInterval;
    intervalDay: number;
    intervalMonth: number;
    customDays: number;
    recurringIntervalId?: string;
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
  const [intervalType, setIntervalType] = useState<RecurringInterval>(
    initialData?.intervalType || "weekly",
  );
  const [intervalDay, setIntervalDay] = useState(initialData?.intervalDay || 1);
  const [intervalMonth, setIntervalMonth] = useState(
    initialData?.intervalMonth || 1,
  );
  const [customDays, setCustomDays] = useState(initialData?.customDays || 7);
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
      setIntervalType(initialData.intervalType);
      setIntervalDay(initialData.intervalDay);
      setIntervalMonth(initialData.intervalMonth);
      setCustomDays(initialData.customDays);
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
        logger.error("Error loading members:", error);
      } else if (data) {
        const membersList = data
          .map((item: any) => item.profiles)
          .filter((p: any) => p) as Member[];
        setMembers(membersList);
      }
    } catch (error) {
      logger.error("Error:", error);
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

  const handleMemberReorder = (reorderedMembers: Member[]) => {
    setSelectedMembers(reorderedMembers);
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

    if (intervalType === "custom" && (!customDays || customDays < 1)) {
      showToast("Zadejte platný počet dní", "error");
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
    const { data: intervalData, error: intervalError } = await supabase
      .from("recurring_intervals")
      .insert({
        type: intervalType,
        interval_day:
          intervalType === "weekly" ||
          intervalType === "monthly" ||
          intervalType === "yearly"
            ? intervalDay
            : null,
        interval_month: intervalType === "yearly" ? intervalMonth : null,
        custom_days: intervalType === "custom" ? customDays : null,
      })
      .select()
      .single();

    if (intervalError) {
      showToast(
        "Nepodařilo se vytvořit interval: " + intervalError.message,
        "error",
      );
      return;
    }

    const { data: choreData, error: choreError } = await supabase
      .from("chores")
      .insert({
        flat_id: currentFlat!.id,
        name: name.trim(),
        description: description.trim() || null,
        recurring_interval_id: intervalData.id,
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

    if (initialData?.recurringIntervalId) {
      const { error: intervalError } = await supabase
        .from("recurring_intervals")
        .update({
          type: intervalType,
          interval_day:
            intervalType === "weekly" ||
            intervalType === "monthly" ||
            intervalType === "yearly"
              ? intervalDay
              : null,
          interval_month: intervalType === "yearly" ? intervalMonth : null,
          custom_days: intervalType === "custom" ? customDays : null,
        })
        .eq("id", initialData.recurringIntervalId);

      if (intervalError) {
        showToast(
          "Nepodařilo se aktualizovat interval: " + intervalError.message,
          "error",
        );
        return;
      }
    }

    const { error: choreError } = await supabase
      .from("chores")
      .update({
        name: name.trim(),
        description: description.trim() || null,
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
              maxLength={100}
            />
          </View>

          <View className="gap-2">
            <Label>Popis</Label>
            <Textarea
              value={description}
              onChangeText={setDescription}
              placeholder="Volitelný popis úkolu"
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View className="gap-2">
            <Label>Interval *</Label>
            <RecurringIntervalPicker
              interval={intervalType}
              onIntervalChange={setIntervalType}
              intervalDay={intervalDay}
              onIntervalDayChange={setIntervalDay}
              intervalMonth={intervalMonth}
              onIntervalMonthChange={setIntervalMonth}
              customDays={customDays}
              onCustomDaysChange={setCustomDays}
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
              onReorder={handleMemberReorder}
            />
          </View>

          {/* Bottom Actions */}
          <View className="flex-col gap-3">
            <Button
              className="flex-1"
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" className="text-primary" />
              ) : (
                <Text>{mode === "edit" ? "Upravit" : "Vytvořit úkol"}</Text>
              )}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text>Zrušit</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </KeyboardAwareScrollView>
  );
};
