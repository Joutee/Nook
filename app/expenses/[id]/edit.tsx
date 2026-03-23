import { ActivityIndicator, View } from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Member } from "@/types/members";

const EditExpense = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<{
    title: string;
    amount: string;
    date: Date;
    selectedPayer: Member[];
    selectedMembers: Member[];
    manualAmounts: Record<string, string>;
    splitMode: "auto" | "manual";
  } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      loadExpenseData();
    }
  }, [id]);

  const loadExpenseData = async () => {
    if (!id) return;

    setIsLoadingData(true);
    try {
      // Load expense data
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select(
          `
          *,
          payer:profiles!expenses_payer_id_fkey(id, name, surname, avatar_url)
        `,
        )
        .eq("id", id)
        .single();

      if (expenseError) {
        showToast(
          "Nepodařilo se načíst výdaj: " + expenseError.message,
          "error",
        );
        router.back();
        return;
      }

      // Load expense shares
      const { data: sharesData, error: sharesError } = await supabase
        .from("expense_shares")
        .select(
          `
          profile_id,
          owed_amount,
          profile:profiles(id, name, surname, avatar_url)
        `,
        )
        .eq("expense_id", id);

      if (sharesError) {
        console.error("Error loading shares:", sharesError);
        showToast(
          "Nepodařilo se načíst rozdělení: " + sharesError.message,
          "error",
        );
        router.back();
        return;
      }

      // Process the data
      const selectedMembers: Member[] = sharesData
        .map((share: any) => share.profile)
        .filter((p: any) => p)
        .map((p: any) => ({ ...p, surname: p.surname || "", role: "" }));

      const manualAmounts: Record<string, string> = {};
      sharesData.forEach((share: any) => {
        manualAmounts[share.profile_id] = share.owed_amount.toFixed(2);
      });

      // Determine split mode - if amounts are equal (within 0.01), it's auto mode
      const amounts = Object.values(manualAmounts).map((a) => parseFloat(a));
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const isAutoSplit = amounts.every((a) => Math.abs(a - avgAmount) < 0.5); // Allow small variations for rounding

      setInitialData({
        title: expenseData.title,
        amount: expenseData.amount.toFixed(2),
        date: new Date(expenseData.happened_at),
        selectedPayer: [
          {
            ...expenseData.payer,
            surname: expenseData.payer.surname || "",
            role: "",
          },
        ],
        selectedMembers,
        manualAmounts,
        splitMode: isAutoSplit ? "auto" : "manual",
      });
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst výdaj", "error");
      router.back();
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoadingData) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(270, 89.1%, 49%)" />
      </View>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <View className="flex-1">
      <ExpenseForm
        key={id}
        mode="edit"
        expenseId={id}
        initialData={initialData}
      />
    </View>
  );
};

export default EditExpense;
