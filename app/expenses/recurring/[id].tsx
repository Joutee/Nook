import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertDialog } from "@/components/ui/alert-dialog";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { MemberSelector } from "@/components/shared/MemberSelector";
import { Member } from "@/types/members";
import { RecurringInterval } from "@/types/finance";
import logger from "@/lib/logger";

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
  const [interval, setInterval] = useState<RecurringInterval>("monthly");
  const [intervalDay, setIntervalDay] = useState(1);
  const [intervalMonth, setIntervalMonth] = useState(1);
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
      // Fetch flat members
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

      // Fetch recurring expense
      const { data: expenseData, error: expenseError } = await supabase
        .from("recurring_expenses")
        .select(
          "*, payer:profiles!recurring_expenses_payer_id_fkey(id, name, surname, avatar_url)",
        )
        .eq("id", id)
        .single();

      if (expenseError) {
        logger.error("Error loading recurring expense:", expenseError);
        showToast("Nepodařilo se načíst opakující se výdaj", "error");
        router.back();
        return;
      }

      // Fetch recurring expense members
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

      // Set state from fetched data
      setTitle(expenseData.title);
      setAmount(String(expenseData.amount));
      setInterval(expenseData.interval as RecurringInterval);
      setIntervalDay(expenseData.interval_day ?? 1);
      setIntervalMonth(expenseData.interval_month ?? 1);
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

  const calculateNextOccurrence = (): string => {
    const today = new Date();
    let next: Date;

    switch (interval) {
      case "daily":
        next = new Date(today);
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next = new Date(today);
        const currentDay = next.getDay() || 7; // Convert Sunday 0 to 7
        const daysUntil =
          intervalDay > currentDay
            ? intervalDay - currentDay
            : 7 - (currentDay - intervalDay);
        next.setDate(next.getDate() + daysUntil);
        break;
      case "monthly":
        next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const lastDayOfMonth = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0,
        ).getDate();
        next.setDate(Math.min(intervalDay, lastDayOfMonth));
        break;
      case "yearly":
        next = new Date(today.getFullYear() + 1, intervalMonth - 1, 1);
        const lastDay = new Date(next.getFullYear(), intervalMonth, 0).getDate();
        next.setDate(Math.min(intervalDay, lastDay));
        break;
    }

    return next.toISOString().split("T")[0];
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
      const { error: updateError } = await supabase
        .from("recurring_expenses")
        .update({
          title: trimmedTitle,
          amount: amountNum,
          payer_id: selectedPayer[0].id,
          interval,
          interval_day: interval === "daily" ? null : intervalDay,
          interval_month: interval === "yearly" ? intervalMonth : null,
          is_paused: isPaused,
          next_occurrence: calculateNextOccurrence(),
        })
        .eq("id", id);

      if (updateError) {
        logger.error("Error updating recurring expense:", updateError);
        showToast("Nepodařilo se uložit změny", "error");
        return;
      }

      // Delete old members
      const { error: deleteError } = await supabase
        .from("recurring_expense_members")
        .delete()
        .eq("recurring_expense_id", id);

      if (deleteError) {
        logger.error("Error deleting old recurring members:", deleteError);
        showToast("Nepodařilo se uložit změny", "error");
        return;
      }

      // Insert new members
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
            {/* Title */}
            <View className="gap-2">
              <Label>Název výdaje</Label>
              <Input
                placeholder="např. Nájem"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Amount */}
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

            {/* Payer */}
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

            {/* Members */}
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

            {/* Interval picker */}
            <View className="gap-2">
              <Label>Interval</Label>
              <View className="flex-row gap-2">
                {(
                  [
                    { value: "daily", label: "Denně" },
                    { value: "weekly", label: "Týdně" },
                    { value: "monthly", label: "Měsíčně" },
                    { value: "yearly", label: "Ročně" },
                  ] as { value: RecurringInterval; label: string }[]
                ).map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => setInterval(item.value)}
                    className={`flex-1 py-2 rounded-md items-center ${
                      interval === item.value ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        interval === item.value
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Weekly: day-of-week picker */}
            {interval === "weekly" && (
              <View className="gap-2">
                <Label>Den v týdnu</Label>
                <View className="flex-row gap-1">
                  {[
                    { value: 1, label: "Po" },
                    { value: 2, label: "Út" },
                    { value: 3, label: "St" },
                    { value: 4, label: "Čt" },
                    { value: 5, label: "Pá" },
                    { value: 6, label: "So" },
                    { value: 7, label: "Ne" },
                  ].map((day) => (
                    <Pressable
                      key={day.value}
                      onPress={() => setIntervalDay(day.value)}
                      className={`flex-1 py-2 rounded-md items-center ${
                        intervalDay === day.value ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          intervalDay === day.value
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Monthly: day-of-month input */}
            {interval === "monthly" && (
              <View className="gap-2">
                <Label>Den v měsíci</Label>
                <View className="flex-row items-center gap-3">
                  <Input
                    className="w-20"
                    keyboardType="number-pad"
                    maxLength={2}
                    value={String(intervalDay)}
                    onChangeText={(text) => {
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num >= 1 && num <= 31) {
                        setIntervalDay(num);
                      } else if (text === "") {
                        setIntervalDay(1);
                      }
                    }}
                  />
                  <Text className="text-muted-foreground">každého měsíce</Text>
                </View>
              </View>
            )}

            {/* Yearly: day + month picker */}
            {interval === "yearly" && (
              <View className="gap-2">
                <Label>Den a měsíc</Label>
                <View className="flex-row items-center gap-3 mb-2">
                  <Input
                    className="w-20"
                    keyboardType="number-pad"
                    maxLength={2}
                    value={String(intervalDay)}
                    onChangeText={(text) => {
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num >= 1 && num <= 31) {
                        setIntervalDay(num);
                      } else if (text === "") {
                        setIntervalDay(1);
                      }
                    }}
                  />
                  <Text className="text-muted-foreground">dne</Text>
                </View>
                <View className="flex-row flex-wrap gap-1">
                  {[
                    { value: 1, label: "Led" },
                    { value: 2, label: "Úno" },
                    { value: 3, label: "Bře" },
                    { value: 4, label: "Dub" },
                    { value: 5, label: "Kvě" },
                    { value: 6, label: "Čer" },
                    { value: 7, label: "Čvc" },
                    { value: 8, label: "Srp" },
                    { value: 9, label: "Zář" },
                    { value: 10, label: "Říj" },
                    { value: 11, label: "Lis" },
                    { value: 12, label: "Pro" },
                  ].map((month) => (
                    <Pressable
                      key={month.value}
                      onPress={() => setIntervalMonth(month.value)}
                      className={`px-3 py-2 rounded-md items-center ${
                        intervalMonth === month.value ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          intervalMonth === month.value
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {month.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Pause toggle */}
            <Switch
              value={isPaused}
              onValueChange={setIsPaused}
              label="Pozastaveno"
              leftIcon="pause-circle-outline"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <View className="gap-3">
          <Button
            onPress={handleSave}
            disabled={isSaving || isDeleting}
          >
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
