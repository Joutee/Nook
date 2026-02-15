import {
  ActivityIndicator,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Text } from "@/components/ui/text"
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../utils/supabase";
import { useToast } from "../contexts/ToastContext";
import { ExpenseForm } from "../components/ExpenseForm";
import { Profile } from "../types/profile";

const EditExpense = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialData, setInitialData] = useState<{
    title: string;
    amount: string;
    date: Date;
    selectedPayer: Profile[];
    selectedMembers: Profile[];
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
      const selectedMembers: Profile[] = sharesData
        .map((share: any) => share.profile)
        .filter((p: any) => p);

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
        selectedPayer: [expenseData.payer],
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

  const handleDelete = () => {
    Alert.alert(
      "Smazat výdaj",
      "Opravdu chcete smazat tento výdaj? Tuto akci nelze vrátit zpět.",
      [
        {
          text: "Zrušit",
          style: "cancel",
        },
        {
          text: "Smazat",
          style: "destructive",
          onPress: async () => {
            if (!id) return;

            setIsDeleting(true);
            try {
              // Delete expense (shares will be deleted automatically due to CASCADE)
              const { error } = await supabase
                .from("expenses")
                .delete()
                .eq("id", id);

              if (error) {
                showToast(
                  "Nepodařilo se smazat výdaj: " + error.message,
                  "error",
                );
              } else {
                showToast("Výdaj byl smazán", "success");
                router.back();
              }
            } catch (error: any) {
              console.error("Error deleting expense:", error);
              showToast(
                "Nepodařilo se smazat výdaj: " + error.message,
                "error",
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ExpenseForm
        key={id}
        mode="edit"
        expenseId={id}
        initialData={initialData}
      />
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
          style={[
            styles.deleteButton,
            isDeleting && styles.deleteButtonDisabled,
          ]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Smazat výdaj</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EditExpense;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  deleteButtonContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc3545",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
