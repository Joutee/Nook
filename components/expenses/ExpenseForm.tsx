import { View, ScrollView, ActivityIndicator } from "react-native";
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
    splitMode: "auto" | "manual";
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
        console.error("Error loading flat members:", error);
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
      console.error("Error:", error);
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
      console.error("Error deleting expense:", error);
      showToast("Nepodařilo se smazat výdaj: " + error.message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
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
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" className="text-muted-foreground" />
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
      {/* Title Input */}
      <Card className="mb-4 mx-4">
        <CardContent className="gap-4">
          <View className="gap-2">
            <Label>Název výdaje</Label>
            <Input
              placeholder="např. Nákup v Albertu"
              value={title}
              onChangeText={setTitle}
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
                  <ActivityIndicator
                    size="small"
                    className="text-primary-foreground"
                  />
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
                <ActivityIndicator size="small" color="#fff" />
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
    </KeyboardAwareScrollView>
  );
};
