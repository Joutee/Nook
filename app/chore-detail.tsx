import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChoreHistoryItem } from "@/components/ChoreHistoryItem";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../utils/supabase";
import { useToast } from "../contexts/ToastContext";
import { Chore, HistoryItem } from "../types/chores";

const ChoreDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [chore, setChore] = useState<Chore | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completingChore, setCompletingChore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      getCurrentUser();
      loadChoreDetail();
      loadRecentHistory();
    }
  }, [id]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadChoreDetail = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("view_chore_dashboard")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error loading chore:", error);
        showToast("Nepodařilo se načíst úkol: " + error.message, "error");
        router.back();
      } else {
        setChore(data);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst úkol", "error");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentHistory = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("view_chore_history")
        .select("*")
        .eq("chore_id", id)
        .order("cycle_index", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error loading history:", error);
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleCompleteChore = async () => {
    if (!chore || chore.assignee_user_id !== currentUserId) return;
    if (completingChore) return;

    if (chore.is_completed_current_cycle) {
      showToast("Tento úkol je již dokončen", "info");
      return;
    }

    setCompletingChore(true);
    try {
      const { error } = await supabase.from("chore_completions").insert({
        chore_id: chore.id,
        profile_id: currentUserId,
        cycle_index: chore.current_cycle_index,
      });

      if (error) {
        showToast(
          "Nepodařilo se označit jako hotové: " + error.message,
          "error",
        );
      } else {
        showToast("Úkol dokončen!", "success");
        loadChoreDetail();
        loadRecentHistory();
      }
    } catch (error: any) {
      showToast("Nepodařilo se označit jako hotové: " + error.message, "error");
    } finally {
      setCompletingChore(false);
    }
  };

  if (isLoading || !chore) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="hsl(270, 89.1%, 49%)" />
      </View>
    );
  }

  const isMyTurn = chore.assignee_user_id === currentUserId;
  const isCompleted = chore.is_completed_current_cycle;
  const isFutureStart =
    chore.start_date && new Date(chore.start_date) > new Date();

  return (
    <ScrollView className="flex-1 bg-background">
      <Card className="m-4 px-2 items-center">
        <CardHeader className="px-4 w-full flex-row justify-between items-start">
          <View>
            <Text className="text-2xl font-bold text-foreground flex-1 mr-3">
              {chore.name}
            </Text>

            {chore.description && (
              <>
                <Text className="text-base text-muted-foreground leading-6">
                  {chore.description}
                </Text>
              </>
            )}
          </View>

          {isCompleted && (
            <Ionicons
              name="checkmark-circle"
              size={32}
              color="hsl(142, 76%, 36%)"
            />
          )}
        </CardHeader>
        <Separator className="my-1" />
        <CardContent className="px-5 w-full">
          <View className="mb-4">
            <View className="flex-row items-center mb-2 gap-2">
              <Ionicons
                name="person-outline"
                size={20}
                className="text-muted-foreground"
              />
              <Text className="text-sm text-muted-foreground font-semibold">
                Na řadě:
              </Text>
            </View>
            <View className="flex-row items-center p-3 rounded-lg">
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
                <Text className="text-primary-foreground text-base font-semibold">
                  {chore.assignee_name?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
              <Text className="text-base text-foreground font-medium flex-1">
                {chore.assignee_name && chore.assignee_surname
                  ? `${chore.assignee_name} ${chore.assignee_surname}`
                  : chore.assignee_name || "Nepřiřazeno"}
              </Text>
            </View>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center mb-2 gap-2">
              <Ionicons
                name="time-outline"
                size={20}
                className="text-muted-foreground"
              />
              <Text className="text-sm text-muted-foreground font-semibold">
                Interval:
              </Text>
            </View>
            <Text className="text-base text-foreground ml-7">
              Každých {chore.interval_days}{" "}
              {chore.interval_days === 1 ? "den" : "dní"}
            </Text>
          </View>

          {isFutureStart && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2 gap-2">
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  className="text-muted-foreground"
                />
                <Text className="text-sm text-muted-foreground font-semibold">
                  Začíná:
                </Text>
              </View>
              <Text className="text-base text-foreground ml-7">
                {new Date(chore.start_date!).toLocaleDateString("cs-CZ")}
              </Text>
            </View>
          )}

          <Separator className="my-4" />

          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 flex-row gap-2"
              onPress={() => router.push(`/chore-edit?id=${chore.id}`)}
            >
              <Ionicons
                name="pencil-outline"
                size={20}
                className="text-primary"
              />
              <Text className="text-primary font-semibold">Upravit</Text>
            </Button>

            {isMyTurn && !isCompleted && (
              <Button
                variant="default"
                className="flex-1 flex-row gap-2"
                onPress={handleCompleteChore}
                disabled={completingChore}
              >
                {completingChore ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text className="text-primary-foreground font-semibold">
                      Splnit
                    </Text>
                  </>
                )}
              </Button>
            )}
          </View>
        </CardContent>
      </Card>

      <View className="m-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold text-foreground">
            Poslední plnění
          </Text>
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() => router.push(`/chore-history?id=${chore.id}`)}
          >
            <Text className="text-sm text-primary font-medium">
              Zobrazit vše
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              className="text-primary"
            />
          </Pressable>
        </View>

        {history.length === 0 ? (
          <Card>
            <CardContent className="p-10 items-center">
              <Ionicons
                name="time-outline"
                size={48}
                color="hsl(240, 5%, 64.9%)"
              />
              <Text className="text-sm text-muted-foreground mt-3">
                Zatím žádná historie
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-3">
            {history.map((item) => (
              <ChoreHistoryItem
                key={`${item.chore_id}-${item.cycle_index}`}
                item={item}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ChoreDetail;
