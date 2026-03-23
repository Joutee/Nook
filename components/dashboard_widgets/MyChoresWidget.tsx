import {
  View,
  ActivityIndicator,
  Pressable,
  useColorScheme,
} from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertDialog } from "@/components/ui/alert-dialog";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { Chore } from "@/types/chores";
import { completeChore } from "@/lib/choreUtils";
import { THEME } from "@/lib/theme";

export const MyChoresWidget = () => {
  const [myChores, setMyChores] = useState<Chore[]>([]);
  const [allChores, setAllChores] = useState<Chore[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(
    null,
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [choreToComplete, setChoreToComplete] = useState<Chore | null>(null);
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const borderColor = isDark ? THEME.dark.border : THEME.light.border;

  useEffect(() => {
    // 1. Prvotní načtení dat
    loadMyChores();

    // Pokud nemáme flat_id, nemá smysl nic poslouchat
    if (!currentFlat?.id) return;

    // 2. Vytvoření Realtime kanálu
    const choresChannel = supabase
      .channel("public:chores") // Název kanálu (může být cokoliv)
      .on(
        "postgres_changes",
        {
          event: "*", // Chceme poslouchat vše (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "chores",
          filter: `flat_id=eq.${currentFlat.id}`, // MAGIE: Posloucháme jen náš byt!
        },
        (payload) => {
          console.log("Změna v úkolech detekována!", payload);
          // Když se něco změní (někdo přidá/upraví úkol), přenačteme widget
          loadMyChores();
        },
      )
      .subscribe();

    const completionsChannel = supabase
      .channel("public:chore_completions_my")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chore_completions",
        },
        (payload) => {
          console.log("Někdo splnil úkol!", payload);
          loadMyChores();
        },
      )
      .subscribe();

    // 4. Úklid při opuštění obrazovky (zavře kanály a šetří limit 200 připojení)
    return () => {
      supabase.removeChannel(choresChannel);
      supabase.removeChannel(completionsChannel);
    };
  }, [currentFlat]);

  const loadMyChores = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);

        // Načíst všechny úkoly pro správné seřazení
        const { data, error } = await supabase
          .from("view_chore_dashboard")
          .select("*")
          .eq("flat_id", currentFlat.id)
          .eq("assignee_user_id", user.id);

        if (error) {
          console.error("Error loading my chores:", error);
        } else {
          const allChoresData = data || [];
          setTotalCount(allChoresData.length);

          // Seřadit: 1) nesplněné nahoře, 2) podle data nového cyklu (nejbližší nahoře)
          const sorted = allChoresData.sort((a, b) => {
            // Primární řazení: nesplněné nahoře
            if (a.is_completed_current_cycle !== b.is_completed_current_cycle) {
              return a.is_completed_current_cycle ? 1 : -1;
            }

            // Sekundární řazení: podle data nového cyklu
            const dateA = calculateNextCycleDate(a);
            const dateB = calculateNextCycleDate(b);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            return dateA.getTime() - dateB.getTime();
          });

          setAllChores(sorted);
          // Zobrazit pouze prvních 5 pokud není rozbaleno
          setMyChores(isExpanded ? sorted : sorted.slice(0, 5));
        }
      }
    } catch (error) {
      console.error("Error:", error);
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
      loadMyChores();
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

  const getDaysUntilNextCycle = (chore: Chore): number | null => {
    const nextCycleDate = calculateNextCycleDate(chore);
    if (!nextCycleDate) return null;

    const now = new Date();
    const diffTime = nextCycleDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    setMyChores(newExpanded ? allChores : allChores.slice(0, 5));
  };

  return (
    <>
      <Pressable onPress={() => router.push("/(tabs)/chores")}>
        <Card className="mb-4">
          <CardHeader className="flex-row items-center gap-2">
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              className="text-foreground"
            />
            <CardTitle>Moje úkoly</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <View className="py-4">
                <ActivityIndicator size="small" />
              </View>
            ) : myChores.length === 0 ? (
              <Text className="text-muted-foreground text-sm">
                Nemáte žádné úkoly.
              </Text>
            ) : (
              <View>
                {myChores.map((chore) => (
                  <View
                    key={chore.id}
                    className={`flex-row items-center justify-between py-2 border-b border-border last:border-b-0 ${chore.is_completed_current_cycle ? "opacity-60" : ""}`}
                  >
                    <Pressable
                      onPress={() => handleCompleteChore(chore)}
                      disabled={
                        completingChoreId === chore.id ||
                        chore.is_completed_current_cycle
                      }
                      className="mr-3"
                    >
                      {completingChoreId === chore.id ? (
                        <ActivityIndicator size="small" color="#8b5cf6" />
                      ) : (
                        <Ionicons
                          name={
                            chore.is_completed_current_cycle
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={28}
                          color={
                            chore.is_completed_current_cycle
                              ? undefined
                              : borderColor
                          }
                          className={
                            chore.is_completed_current_cycle
                              ? "text-primary"
                              : undefined
                          }
                        />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        router.push(`/chores/${chore.id}`)
                      }
                      className="flex-1"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-foreground">
                            {chore.name}
                          </Text>
                          {chore.description && (
                            <Text
                              className="text-xs text-muted-foreground mt-0.5"
                              numberOfLines={1}
                            >
                              {chore.description}
                            </Text>
                          )}
                        </View>
                        <View className="items-end ml-2">
                          {(() => {
                            const daysLeft = getDaysUntilNextCycle(chore);
                            if (daysLeft === null) return null;

                            return (
                              <Text className="text-xs min-w-24 text-right text-muted-foreground">
                                {daysLeft < 0
                                  ? "Nový cyklus"
                                  : daysLeft === 0
                                    ? "Dnes"
                                    : daysLeft === 1
                                      ? "Zítra"
                                      : `Za ${daysLeft}d`}
                              </Text>
                            );
                          })()}
                        </View>
                      </View>
                    </Pressable>
                  </View>
                ))}
                {totalCount > 5 && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleExpanded();
                    }}
                    className="flex-row items-center justify-center py-3 gap-2"
                  >
                    <Text className="text-xs text-primary font-medium">
                      {isExpanded
                        ? "Zobrazit méně"
                        : `+${totalCount - 5} dalších`}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      className="text-primary"
                    />
                  </Pressable>
                )}
              </View>
            )}
          </CardContent>
        </Card>
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
    </>
  );
};
