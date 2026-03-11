import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog } from "@/components/ui/alert-dialog";
import React, { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { Chore } from "@/types/chores";
import { completeChore } from "@/lib/choreUtils";

const Chores = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(
    null,
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [choreToComplete, setChoreToComplete] = useState<Chore | null>(null);
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadChores();
        getCurrentUser();
      }
    }, [currentFlat]),
  );

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadChores = async () => {
    if (!currentFlat?.id) return;

    setIsLoading(true);
    try {
      console.log("Loading chores for flat_id:", currentFlat.id);

      // Přidání timestamp aby se vynutilo čerstvé načtení dat
      const { data, error } = await supabase
        .from("view_chore_dashboard")
        .select("*")
        .eq("flat_id", currentFlat.id)
        .order("name");

      console.log("Chores response:", { data, error });

      if (error) {
        console.error("Error loading chores:", error);
        showToast("Nepodařilo se načíst úkoly: " + error.message, "error");
      } else {
        console.log("Loaded chores count:", data?.length || 0);
        console.log("Chores data:", JSON.stringify(data, null, 2));
        setChores(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst úkoly", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteChore = (chore: Chore) => {
    if (!currentFlat?.id || completingChoreId) return;
    setChoreToComplete(chore);
    setShowCompleteDialog(true);
  };

  const confirmCompleteChore = async () => {
    if (!choreToComplete) return;

    setCompletingChoreId(choreToComplete.id);
    setShowCompleteDialog(false);
    const success = await completeChore(
      choreToComplete,
      currentUserId,
      showToast,
    );
    if (success) {
      loadChores();
    }
    setCompletingChoreId(null);
    setChoreToComplete(null);
  };

  const calculateNextCycleDate = (chore: Chore): Date | null => {
    if (!chore.start_date) return null;

    const startDate = new Date(chore.start_date);
    const nextCycleDate = new Date(startDate);
    nextCycleDate.setDate(
      startDate.getDate() +
        (chore.current_cycle_index + 1) * chore.interval_days,
    );

    return nextCycleDate;
  };

  const formatNextCycle = (date: Date | null): string => {
    if (!date) return "";

    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  };

  const renderChoreItem = (item: Chore) => {
    const isMyTurn = item.assignee_user_id === currentUserId;
    const isCompleted = item.is_completed_current_cycle;
    const isFutureStart =
      item.start_date && new Date(item.start_date) > new Date();
    const nextCycleDate = calculateNextCycleDate(item);
    const nextCycleText = formatNextCycle(nextCycleDate);

    return (
      <Card
        key={item.id}
        className={`mb-3 py-0 ${isCompleted ? "opacity-60" : ""}`}
      >
        <CardContent className="p-0">
          <Pressable
            className="p-4"
            onPress={() => router.push(`/chore-detail?id=${item.id}`)}
          >
            <View className="flex-row items-start justify-between mb-3">
              <Text className="text-lg font-semibold text-foreground flex-1">
                {item.name}
              </Text>
              {isCompleted && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  className="text-success"
                />
              )}
            </View>

            {item.description && (
              <>
                <Text className="text-sm text-muted-foreground mb-3">
                  {item.description}
                </Text>
                <Separator className="mb-3" />
              </>
            )}

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                  <Text className="text-primary-foreground text-sm font-semibold">
                    {item.assignee_name?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
                <Text className="text-sm text-foreground font-medium flex-1">
                  {item.assignee_name && item.assignee_surname
                    ? `${item.assignee_name} ${item.assignee_surname}`
                    : item.assignee_name || "Nepřiřazeno"}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-xs text-muted-foreground min-w-24 text-right">
                  Každých {item.interval_days}{" "}
                  {item.interval_days === 1 ? "den" : "dní"}
                </Text>
                {isFutureStart ? (
                  <Text className="text-xs text-primary font-medium mt-0.5">
                    Začíná:{" "}
                    {new Date(item.start_date!).toLocaleDateString("cs-CZ")}
                  </Text>
                ) : nextCycleText ? (
                  <Text className="text-xs text-primary font-medium min-w- mt-0.5">
                    Nový cyklus: {nextCycleText}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>

          {isMyTurn && !isCompleted && (
            <>
              <Separator className="my-3" />
              <View className="px-4 pb-4">
                <Button
                  variant="default"
                  className="w-full flex-row gap-2 py-2 shadow-lg"
                  onPress={() => handleCompleteChore(item)}
                  disabled={completingChoreId === item.id}
                >
                  {completingChoreId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        className="text-primary-foreground"
                      />
                      <Text className="text-primary-foreground font-semibold text-base">
                        Označit jako hotové
                      </Text>
                    </>
                  )}
                </Button>
              </View>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(270, 89.1%, 49%)" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 p-4 bg-background">
        <Text className="text-3xl font-bold text-foreground mb-4">Úkoly</Text>

        {chores.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons
              name="list-outline"
              size={64}
              className="text-muted-foreground"
            />
            <Text className="text-base text-muted-foreground mt-4 w-full text-center text-wrap">
              Zatím žádné úkoly
            </Text>
          </View>
        ) : (
          <>{chores.map(renderChoreItem)}</>
        )}
      </ScrollView>

      {/* Add Chore Button */}
      <Pressable
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        onPress={() => router.push("/chore-create")}
      >
        <Ionicons name="add" size={28} className="text-primary-foreground" />
      </Pressable>

      <AlertDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        title="Dokončit úkol"
        description={`Opravdu chcete označit úkol "${choreToComplete?.name}" jako dokončený? Akci nelze vrátit zpět.`}
        cancelText="Zrušit"
        actionText="Dokončit"
        onAction={confirmCompleteChore}
      />
    </View>
  );
};

export default Chores;
