import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog } from "@/components/ui/alert-dialog";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { Member } from "@/types/members";
import { formatCurrency } from "@/lib/financeUtils";
import { MemberSelector } from "@/components/shared/MemberSelector";
import { ExpenseSplitSection } from "@/components/expenses/ExpenseSplitSection";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import logger from "@/lib/logger";
import { RecurringInterval } from "@/types/finance";
import { RecurringIntervalPicker } from "@/components/shared/RecurringIntervalPicker";
import { calculateNextOccurrence } from "@/lib/recurringUtils";
import { Switch } from "@/components/ui/switch";
import { buildIntervalPayload } from "@/lib/intervalUtils";
import BottomSheet from "@/components/shared/BottomSheet";
import { takePhoto, pickGalleryPhoto } from "@/lib/fileService";
import { parseReceipt } from "@/lib/receiptService";
import { ExpenseItem } from "@/types/finance";

interface ExpenseFormProps {
  mode: "create" | "edit";
  expenseId?: string;
  initialData?: {
    title: string;
    amount: string;
    date: Date;
    selectedPayer: Member[];
    selectedMembers: Member[];
    manualAmounts: Record<string, string>;
    splitMode: "auto" | "manual" | "items";
    expenseItems?: ExpenseItem[];
  };
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  mode,
  expenseId,
  initialData,
}) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [amount, setAmount] = useState(initialData?.amount || "0");
  const [date, setDate] = useState(initialData?.date || new Date());
  const [selectedPayer, setSelectedPayer] = useState<Member[]>(
    initialData?.selectedPayer || [],
  );
  const [selectedMembers, setSelectedMembers] = useState<Member[]>(
    initialData?.selectedMembers || [],
  );
  const [flatMembers, setFlatMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<"auto" | "manual" | "items">(
    initialData?.splitMode || "auto",
  );
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(
    initialData?.manualAmounts || {},
  );
  const [touchedMembers, setTouchedMembers] = useState<Set<string>>(new Set());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] =
    useState<RecurringInterval>("monthly");
  const [intervalDay, setIntervalDay] = useState(new Date().getDate());
  const [intervalMonth, setIntervalMonth] = useState(new Date().getMonth() + 1);
  const [customDays, setCustomDays] = useState(1);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(
    initialData?.expenseItems || [],
  );
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);

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

      if (error) {
        logger.error("Error loading flat members:", error);
        showToast("Nepodařilo se načíst členy bytu", "error");
      } else {
        const members: Member[] = data.map((m: any) => ({
          id: m.profiles.id,
          name: m.profiles.name,
          surname: m.profiles.surname || "",
          avatar_url: m.profiles.avatar_url,
          role: m.role,
        }));
        setFlatMembers(members);
        // Pre-select all members by default only in create mode
        if (mode === "create" && selectedMembers.length === 0) {
          setSelectedMembers(members);
        }
      }
    } catch (error) {
      logger.error("Error:", error);
      showToast("Nepodařilo se načíst členy bytu", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayerSelect = (member: Member) => {
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

  const handleReceiptImage = async (imageUri: string | null) => {
    if (!imageUri) return;

    setShowReceiptSheet(false);
    setIsParsingReceipt(true);

    try {
      const result = await parseReceipt(imageUri);

      // Pre-fill form fields
      setTitle(result.store_name || "Účtenka");
      if (result.date) {
        const parsedDate = new Date(result.date);
        if (!isNaN(parsedDate.getTime())) {
          setDate(parsedDate);
        }
      }
      setAmount(result.total.toFixed(2));

      // Check if item sum matches receipt total
      const itemSum = result.items.reduce((sum, item) => sum + item.price, 0);
      if (Math.abs(itemSum - result.total) > 1) {
        showToast(
          `Součet položek (${itemSum.toFixed(2)} Kč) se liší od celkové částky na účtence (${result.total.toFixed(2)} Kč)`,
          "info",
        );
      }

      // Convert to ExpenseItems with all members assigned by default
      const allMemberIds = flatMembers.map((m) => m.id);
      const items: ExpenseItem[] = result.items.map((item, index) => ({
        name: item.name,
        price: item.price,
        position: index,
        memberIds: [...allMemberIds],
      }));

      setExpenseItems(items);
      setSplitMode("items");

      showToast("Účtenka byla načtena", "success");
    } catch (error: any) {
      showToast(error.message || "Nepodařilo se zpracovat účtenku", "error");
    } finally {
      setIsParsingReceipt(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const uri = await takePhoto();
      handleReceiptImage(uri);
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const handlePickGallery = async () => {
    try {
      const uri = await pickGalleryPhoto();
      handleReceiptImage(uri);
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!expenseId) return;

    setIsDeleting(true);
    try {
      // Delete expense (shares will be deleted automatically due to CASCADE)
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) {
        showToast("Nepodařilo se smazat výdaj: " + error.message, "error");
      } else {
        showToast("Výdaj byl smazán", "success");
        router.back();
      }
    } catch (error: any) {
      logger.error("Error deleting expense:", error);
      showToast("Nepodařilo se smazat výdaj: " + error.message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const computeSharesFromItems = (
    items: ExpenseItem[],
  ): Record<string, number> => {
    const shares: Record<string, number> = {};

    for (const item of items) {
      if (item.memberIds.length === 0) continue;
      const perPerson = item.price / item.memberIds.length;
      for (const memberId of item.memberIds) {
        shares[memberId] = (shares[memberId] || 0) + perPerson;
      }
    }

    // Round to 2 decimal places
    for (const key of Object.keys(shares)) {
      shares[key] = Math.round(shares[key] * 100) / 100;
    }

    return shares;
  };

  const saveExpenseItems = async (expenseId: string) => {
    const itemRows = expenseItems.map((item) => ({
      expense_id: expenseId,
      name: item.name,
      price: item.price,
      position: item.position,
    }));

    const { data: savedItems, error: itemsError } = await supabase
      .from("expense_items")
      .insert(itemRows)
      .select();

    if (itemsError) {
      logger.error("Error inserting expense items:", itemsError);
      showToast("Výdaj uložen, ale nepodařilo se uložit položky", "error");
      return;
    }

    if (savedItems) {
      const memberRows = savedItems.flatMap(
        (savedItem: any, idx: number) =>
          expenseItems[idx].memberIds.map((profileId) => ({
            item_id: savedItem.id,
            profile_id: profileId,
          })),
      );

      if (memberRows.length > 0) {
        const { error: membersError } = await supabase
          .from("expense_item_members")
          .insert(memberRows);

        if (membersError) {
          logger.error("Error inserting item members:", membersError);
        }
      }
    }
  };

  const buildExpenseShares = (
    expenseId: string,
    finalAmount: number,
  ): Array<{
    expense_id: string;
    profile_id: string;
    owed_amount: number;
  }> => {
    if (splitMode === "items") {
      const sharesMap = computeSharesFromItems(expenseItems);
      return Object.entries(sharesMap).map(([profileId, amount]) => ({
        expense_id: expenseId,
        profile_id: profileId,
        owed_amount: amount,
      }));
    }

    return selectedMembers.map((member, index) => {
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

    if (splitMode !== "items" && selectedMembers.length === 0) {
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
          `Součet částek (${formatCurrency(totalManual)}) musí odpovídat celkové částce (${formatCurrency(amountNum)})`,
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

    // Validate items mode
    if (splitMode === "items") {
      if (expenseItems.length === 0) {
        showToast("Přidejte alespoň jednu položku", "error");
        return;
      }
      for (const item of expenseItems) {
        if (!item.name.trim()) {
          showToast("Vyplňte název u všech položek", "error");
          return;
        }
        if (item.price <= 0) {
          showToast(`Zadejte platnou cenu pro "${item.name}"`, "error");
          return;
        }
        if (item.memberIds.length === 0) {
          showToast(`Přiřaďte členy k položce "${item.name}"`, "error");
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

      if (splitMode === "items") {
        finalAmount = expenseItems.reduce((sum, item) => sum + item.price, 0);
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
          logger.error("Error updating expense:", expenseError);
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
          logger.error("Error deleting old shares:", deleteSharesError);
          showToast(
            "Nepodařilo se upravit rozdělení: " + deleteSharesError.message,
            "error",
          );
          return;
        }

        // Delete existing expense items (CASCADE deletes item_members too)
        await supabase
          .from("expense_items")
          .delete()
          .eq("expense_id", expenseId);

        const expenseShares = buildExpenseShares(expenseId!, finalAmount);

        const { error: sharesError } = await supabase
          .from("expense_shares")
          .insert(expenseShares);

        if (sharesError) {
          logger.error("Error inserting expense shares:", sharesError);
          showToast(
            "Nepodařilo se uložit rozdělení: " + sharesError.message,
            "error",
          );
          return;
        }

        if (splitMode === "items") {
          await saveExpenseItems(expenseId!);
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
          logger.error("Error inserting expense:", expenseError);
          showToast(
            "Nepodařilo se uložit výdaj: " + expenseError.message,
            "error",
          );
          return;
        }

        const expenseShares = buildExpenseShares(expenseData.id, finalAmount);

        const { error: sharesError } = await supabase
          .from("expense_shares")
          .insert(expenseShares);

        if (sharesError) {
          logger.error("Error inserting expense shares:", sharesError);
          showToast(
            "Nepodařilo se uložit rozdělení: " + sharesError.message,
            "error",
          );
          return;
        }

        if (splitMode === "items") {
          await saveExpenseItems(expenseData.id);
        }

        showToast("Výdaj byl úspěšně přidán", "success");

        // Create recurring expense template if toggle is on
        if (isRecurring) {
          const { data: intervalData, error: intervalError } = await supabase
            .from("recurring_intervals")
            .insert(buildIntervalPayload(recurringInterval, intervalDay, intervalMonth, customDays))
            .select()
            .single();

          if (intervalError) {
            logger.error("Error creating interval:", intervalError);
            showToast("Výdaj byl uložen, ale nepodařilo se nastavit opakování", "error");
          } else {
            const { data: recurringData, error: recurringError } = await supabase
              .from("recurring_expenses")
              .insert({
                flat_id: currentFlat.id,
                created_by: (await supabase.auth.getUser()).data.user!.id,
                payer_id: selectedPayer[0].id,
                title: finalTitle,
                amount: finalAmount,
                recurring_interval_id: intervalData.id,
                next_occurrence: calculateNextOccurrence(
                  recurringInterval,
                  intervalDay,
                  intervalMonth,
                  customDays,
                ),
              })
              .select()
              .single();

            if (recurringError) {
              logger.error("Error creating recurring expense:", recurringError);
              showToast("Výdaj byl uložen, ale nepodařilo se nastavit opakování", "error");
            } else {
              await supabase
                .from("expenses")
                .update({ recurring_expense_id: recurringData.id })
                .eq("id", expenseData.id);

              const memberRows = selectedMembers.map((m) => ({
                recurring_expense_id: recurringData.id,
                profile_id: m.id,
              }));

              const { error: membersError } = await supabase
                .from("recurring_expense_members")
                .insert(memberRows);

              if (membersError) {
                logger.error("Error creating recurring members:", membersError);
              }
            }
          }
        }
      }

      router.back();
    } catch (error) {
      logger.error("Error:", error);
      showToast("Došlo k chybě při ukládání", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Načítám...</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 10,
        paddingTop: 10,
      }}
      enableOnAndroid={true}
      extraScrollHeight={20}
      className="flex-1"
    >
      {/* Receipt Upload */}
      <Card className="mb-4 mx-4">
        <CardContent>
          <Pressable
            onPress={() => setShowReceiptSheet(true)}
            disabled={isParsingReceipt}
            className="flex-row items-center justify-center gap-2 py-3 border border-dashed border-primary rounded-lg"
          >
            {isParsingReceipt ? (
              <>
                <ActivityIndicator size="small" className="text-primary" />
                <Text className="text-primary font-medium">
                  Zpracovávám účtenku...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="receipt-outline"
                  size={20}
                  className="text-primary"
                />
                <Text className="text-primary font-medium">
                  Nahrát účtenku
                </Text>
              </>
            )}
          </Pressable>
        </CardContent>
      </Card>

      {/* Title Input */}
      <Card className="mb-4 mx-4">
        <CardContent className="gap-4">
          <View className="gap-2">
            <Label>Název výdaje</Label>
            <Input
              placeholder="např. Nákup v Albertu"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Amount Input */}

          <View className="gap-2">
            <Label>Částka (Kč)</Label>
            <Input
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              maxLength={10}
              editable={
                !(
                  splitMode === "manual" &&
                  selectedMembers.filter((m) => !touchedMembers.has(m.id))
                    .length === 0 &&
                  selectedMembers.length > 0
                )
              }
              className={
                splitMode === "manual" &&
                selectedMembers.filter((m) => !touchedMembers.has(m.id))
                  .length === 0 &&
                selectedMembers.length > 0
                  ? "bg-muted"
                  : ""
              }
            />
            {splitMode === "manual" &&
              selectedMembers.filter((m) => !touchedMembers.has(m.id))
                .length === 0 &&
              selectedMembers.length > 0 && (
                <Text className="text-xs text-muted-foreground italic">
                  Částka se počítá automaticky z rozdělení
                </Text>
              )}
          </View>

          {/* Date Picker */}

          <View className="gap-2">
            <Label>Datum</Label>
            <DatePickerInput
              value={date}
              onChange={setDate}
              maximumDate={new Date()}
            />
          </View>

          {/* Recurring Toggle */}
          {mode === "create" && (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="repeat-outline"
                    size={20}
                    className="text-foreground"
                  />
                  <Label>Opakovat</Label>
                </View>
                <Switch value={isRecurring} onValueChange={setIsRecurring} />
              </View>

              {isRecurring && (
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
              )}
            </View>
          )}
          {/* Who Paid */}

          <View className="gap-2">
            <Label>Kdo zaplatil</Label>
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
            expenseItems={expenseItems}
            onExpenseItemsChange={setExpenseItems}
          />

          {/* Bottom Actions */}
          <View className="flex-col gap-3">
            {mode === "edit" && expenseId && (
              <Button
                variant="destructive"
                onPress={handleDelete}
                disabled={isDeleting || isSaving}
                className="flex-row gap-2"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" className="text-primary" />
                ) : (
                  <>
                    <Text>Smazat výdaj</Text>
                  </>
                )}
              </Button>
            )}
            <Button
              className="flex-1"
              onPress={handleSave}
              disabled={isSaving || isDeleting}
            >
              {isSaving ? (
                <ActivityIndicator size="small" className="text-primary" />
              ) : (
                <Text>{mode === "edit" ? "Upravit" : "Uložit"}</Text>
              )}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => router.back()}
              disabled={isSaving || isDeleting}
            >
              <Text>Zrušit</Text>
            </Button>

            {/* Delete Button (only in edit mode) */}
          </View>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Smazat výdaj"
        description="Opravdu chcete smazat tento výdaj? Tuto akci nelze vrátit zpět."
        cancelText="Zrušit"
        actionText="Smazat"
        onAction={confirmDelete}
        destructive
      />
      {/* Receipt Source BottomSheet */}
      <BottomSheet
        visible={showReceiptSheet}
        onClose={() => setShowReceiptSheet(false)}
        title="Nahrát účtenku"
      >
        <View className="px-4 gap-3 pb-4">
          <Pressable
            onPress={handleTakePhoto}
            className="flex-row items-center gap-4 py-4 px-4 bg-secondary rounded-lg"
          >
            <Ionicons
              name="camera-outline"
              size={24}
              className="text-foreground"
            />
            <Text className="text-base text-foreground font-medium">
              Vyfotit
            </Text>
          </Pressable>
          <Pressable
            onPress={handlePickGallery}
            className="flex-row items-center gap-4 py-4 px-4 bg-secondary rounded-lg"
          >
            <Ionicons
              name="image-outline"
              size={24}
              className="text-foreground"
            />
            <Text className="text-base text-foreground font-medium">
              Vybrat z galerie
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </KeyboardAwareScrollView>
  );
};
