import { View, ScrollView, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertDialog } from "@/components/ui/alert-dialog";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { MemberSelector } from "@/components/shared/MemberSelector";
import { Member } from "@/types/members";
import { RecurringInterval } from "@/types/finance";
import { calculateNextOccurrence } from "@/lib/recurringUtils";
import { RecurringIntervalPicker } from "@/components/shared/RecurringIntervalPicker";
import logger from "@/lib/logger";
import { buildIntervalPayload } from "@/lib/intervalUtils";

const RecurringExpenseDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("0");
  const [recurringInterval, setRecurringInterval] =
    useState<RecurringInterval>("monthly");
  const [intervalDay, setIntervalDay] = useState(1);
  const [intervalMonth, setIntervalMonth] = useState(1);
  const [customDays, setCustomDays] = useState(1);
  const [recurringIntervalId, setRecurringIntervalId] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);

  const [selectedPayer, setSelectedPayer] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [flatMembers, setFlatMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id || !currentFlat?.id) return;

    setIsLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from("flat_profile")
        .select(
          `
          profile_id,
          role,
          profiles (
            id,
            name,
            surname,
            avatar_url
          )
        `,
        )
        .eq("flat_id", currentFlat.id)
        .eq("active", true);

      if (membersError) {
        logger.error("Error loading flat members:", membersError);
        showToast("Nepodařilo se načíst členy bytu", "error");
        router.back();
        return;
      }

      const members: Member[] = (membersData || []).map((m: any) => ({
        id: m.profiles.id,
        name: m.profiles.name,
        surname: m.profiles.surname || "",
        avatar_url: m.profiles.avatar_url,
        role: m.role,
      }));
      setFlatMembers(members);

      const { data: expenseData, error: expenseError } = await supabase
        .from("recurring_expenses")
        .select(
          "*, payer:profiles!recurring_expenses_payer_id_fkey(id, name, surname, avatar_url), recurring_interval:recurring_intervals(*)",
        )
        .eq("id", id)
        .single();

      if (expenseError) {
        logger.error("Error loading recurring expense:", expenseError);
        showToast("Nepodařilo se načíst opakující se výdaj", "error");
        router.back();
        return;
      }

      const { data: expenseMembersData, error: expenseMembersError } =
        await supabase
          .from("recurring_expense_members")
          .select("profile_id")
          .eq("recurring_expense_id", id);

      if (expenseMembersError) {
        logger.error(
          "Error loading recurring expense members:",
          expenseMembersError,
        );
        showToast("Nepodařilo se načíst členy výdaje", "error");
        router.back();
        return;
      }

      setTitle(expenseData.title);
      setAmount(String(expenseData.amount));
      setRecurringInterval(expenseData.recurring_interval.type as RecurringInterval);
      setIntervalDay(expenseData.recurring_interval.interval_day ?? 1);
      setIntervalMonth(expenseData.recurring_interval.interval_month ?? 1);
      setCustomDays(expenseData.recurring_interval.custom_days ?? 1);
      setRecurringIntervalId(expenseData.recurring_interval_id);
      setIsPaused(expenseData.is_paused);

      const payer = expenseData.payer;
      if (payer) {
        setSelectedPayer([
          {
            id: payer.id,
            name: payer.name,
            surname: payer.surname || "",
            avatar_url: payer.avatar_url,
            role: "",
          },
        ]);
      }

      const memberIds = new Set(
        (expenseMembersData || []).map((m: any) => m.profile_id),
      );
      const expenseMembers = members.filter((m) => memberIds.has(m.id));
      setSelectedMembers(expenseMembers);
    } catch (error) {
      logger.error("Error loading recurring expense:", error);
      showToast("Nepodařilo se načíst opakující se výdaj", "error");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast("Zadejte název výdaje", "error");
      return;
    }

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
      showToast("Vyberte alespoň jednoho člena", "error");
      return;
    }

    setIsSaving(true);
    try {
      const { error: intervalError } = await supabase
        .from("recurring_intervals")
        .update(buildIntervalPayload(recurringInterval, intervalDay, intervalMonth, customDays))
        .eq("id", recurringIntervalId);

      if (intervalError) {
        logger.error("Error updating interval:", intervalError);
        showToast("Nepodařilo se uložit změny", "error");
        return;
      }

      const { error: updateError } = await supabase
        .from("recurring_expenses")
        .update({
          title: trimmedTitle,
          amount: amountNum,
          payer_id: selectedPayer[0].id,
          is_paused: isPaused,
          next_occurrence: calculateNextOccurrence(
            recurringInterval,
            intervalDay,
            intervalMonth,
            customDays,
          ),
        })
        .eq("id", id);

      if (updateError) {
        logger.error("Error updating recurring expense:", updateError);
        showToast("Nepodařilo se uložit změny", "error");
        return;
      }

      const { error: deleteError } = await supabase
        .from("recurring_expense_members")
        .delete()
        .eq("recurring_expense_id", id);

      if (deleteError) {
        logger.error("Error deleting old recurring members:", deleteError);
        showToast("Nepodařilo se uložit změny", "error");
        return;
      }

      const memberRows = selectedMembers.map((m) => ({
        recurring_expense_id: id,
        profile_id: m.id,
      }));

      const { error: insertError } = await supabase
        .from("recurring_expense_members")
        .insert(memberRows);

      if (insertError) {
        logger.error("Error inserting recurring members:", insertError);
        showToast("Nepodařilo se uložit změny", "error");
        return;
      }

      showToast("Změny byly uloženy", "success");
      router.back();
    } catch (error) {
      logger.error("Error saving recurring expense:", error);
      showToast("Nepodařilo se uložit změny", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Error deleting recurring expense:", error);
        showToast("Nepodařilo se smazat opakující se výdaj", "error");
        return;
      }

      showToast("Opakující se výdaj byl smazán", "success");
      if (recurringIntervalId) {
        await supabase
          .from("recurring_intervals")
          .delete()
          .eq("id", recurringIntervalId);
      }
      router.back();
    } catch (error) {
      logger.error("Error deleting recurring expense:", error);
      showToast("Nepodařilo se smazat opakující se výdaj", "error");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <Card className="mb-4">
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label>Název výdaje</Label>
              <Input
                placeholder="např. Nájem"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            <View className="gap-2">
              <Label>Částka (Kč)</Label>
              <Input
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>

            <View className="gap-2">
              <Label>Kdo zaplatí</Label>
              <MemberSelector
                members={flatMembers}
                selectedMembers={selectedPayer}
                onToggleMember={(member) => setSelectedPayer([member])}
                multiSelect={false}
                title="Vyberte plátce"
              />
            </View>

            <View className="gap-2">
              <Label>Mezi koho rozdělit</Label>
              <MemberSelector
                members={flatMembers}
                selectedMembers={selectedMembers}
                onToggleMember={(member) => {
                  setSelectedMembers((prev) => {
                    const exists = prev.find((m) => m.id === member.id);
                    if (exists) {
                      return prev.filter((m) => m.id !== member.id);
                    }
                    return [...prev, member];
                  });
                }}
                multiSelect={true}
                title="Vyberte členy"
              />
            </View>

            <Switch
              value={isPaused}
              onValueChange={setIsPaused}
              label="Pozastaveno"
              leftIcon="pause-circle-outline"
            />

            <RecurringIntervalPicker
              interval={recurringInterval}
              onIntervalChange={setRecurringInterval}
              intervalDay={intervalDay}
              onIntervalDayChange={setIntervalDay}
              intervalMonth={intervalMonth}
              onIntervalMonthChange={setIntervalMonth}
              customDays={customDays}
              onCustomDaysChange={setCustomDays}
            />
          </CardContent>
        </Card>

        <View className="gap-3">
          <Button onPress={handleSave} disabled={isSaving || isDeleting}>
            {isSaving ? (
              <ActivityIndicator size="small" className="text-primary" />
            ) : (
              <Text>Uložit změny</Text>
            )}
          </Button>

          <Button
            variant="destructive"
            onPress={() => setDeleteDialogOpen(true)}
            disabled={isSaving || isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" className="text-primary" />
            ) : (
              <Text>Smazat opakující se výdaj</Text>
            )}
          </Button>

          <Button
            variant="secondary"
            onPress={() => router.back()}
            disabled={isSaving || isDeleting}
          >
            <Text>Zrušit</Text>
          </Button>
        </View>
      </ScrollView>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Smazat opakující se výdaj"
        description="Opravdu chcete smazat tento opakující se výdaj? Již vygenerované výdaje zůstanou zachovány."
        cancelText="Zrušit"
        actionText="Smazat"
        onAction={handleDelete}
        destructive
      />
    </>
  );
};

export default RecurringExpenseDetail;
