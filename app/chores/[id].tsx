import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { ChoreHistoryItem } from "@/components/chores/ChoreHistoryItem";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { Chore, HistoryItem } from "@/types/chores";
import { completeChore, uncompleteChore } from "@/lib/choreUtils";
import { Avatar } from "@/components/ui/avatar";
import logger from "@/lib/logger";
import { formatInterval } from "@/lib/intervalUtils";

const ChoreDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [chore, setChore] = useState<Chore | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completingChore, setCompletingChore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showUncompleteDialog, setShowUncompleteDialog] = useState(false);
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
        logger.error("Error loading chore:", error);
        showToast("Nepodařilo se načíst úkol: " + error.message, "error");
        router.back();
      } else {
        setChore(data);
      }
    } catch (error) {
      logger.error("Error:", error);
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
        logger.error("Error loading history:", error);
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      logger.error("Error:", error);
    }
  };

  const handleCompleteChore = () => {
    if (!chore || completingChore) return;
    setShowCompleteDialog(true);
  };

  const confirmCompleteChore = async () => {
    if (!chore) return;

    setCompletingChore(true);
    setShowCompleteDialog(false);
    const success = await completeChore(chore, currentUserId, showToast);
    if (success) {
      loadChoreDetail();
      loadRecentHistory();
    }
    setCompletingChore(false);
  };

  const handleUncompleteChore = () => {
    if (!chore || completingChore) return;
    setShowUncompleteDialog(true);
  };

  const confirmUncompleteChore = async () => {
    if (!chore) return;

    setCompletingChore(true);
    setShowUncompleteDialog(false);
    const success = await uncompleteChore(chore, currentUserId, showToast);
    if (success) {
      loadChoreDetail();
      loadRecentHistory();
    }
    setCompletingChore(false);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("chores").delete().eq("id", id);

      if (error) {
        showToast("Nepodařilo se smazat úkol: " + error.message, "error");
      } else {
        showToast("Úkol byl smazán", "success");
        // Clean up orphaned interval
        if (chore?.recurring_interval_id) {
          await supabase
            .from("recurring_intervals")
            .delete()
            .eq("id", chore.recurring_interval_id);
        }
        router.replace("/(tabs)/chores");
      }
    } catch (error: any) {
      logger.error("Error deleting chore:", error);
      showToast("Nepodařilo se smazat úkol: " + error.message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading || !chore) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
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
              <Text className="text-base text-muted-foreground leading-6">
                {chore.description}
              </Text>
            )}
          </View>

          {isCompleted && (
            <Ionicons
              name="checkmark-circle"
              size={32}
              className="text-success"
            />
          )}
        </CardHeader>
        <Separator className="my-1" />
        <CardContent className="px-5 w-full">
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1 min-w-[150px] mb-2">
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
              <View className="flex-row items-center rounded-lg h-7 ">
                <Avatar
                  name={chore.assignee_name}
                  size="base"
                  className="mr-3"
                />
                <Text className="text-sm text-foreground font-medium flex-1">
                  {chore.assignee_name && chore.assignee_surname
                    ? `${chore.assignee_name} ${chore.assignee_surname}`
                    : chore.assignee_name || "Nepřiřazeno"}
                </Text>
              </View>
            </View>

            <View className="flex-1 min-w-[150px] mb-2">
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
              <View className="justify-center h-7">
                <Text className="text-sm text-foreground ml-7">
                  {formatInterval(
                    chore.interval_type,
                    chore.interval_day,
                    chore.interval_month,
                    chore.custom_days,
                  )}
                </Text>
              </View>
            </View>
            {isFutureStart && (
              <View className="flex-1 min-w-[150px] mb-2">
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
                <View className="justify-center h-7">
                  <Text className="text-sm text-foreground ml-7">
                    {new Date(chore.start_date!).toLocaleDateString("cs-CZ")}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Separator className="my-4" />

          <View className="gap-3">
            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                className="flex-1 flex-row gap-2"
                onPress={() => router.push(`/chores/${chore.id}/edit`)}
                disabled={isDeleting}
              >
                <Text>Upravit</Text>
              </Button>

              <Button
                variant="destructive"
                className="flex-1 flex-row gap-3"
                onPress={handleDelete}
                disabled={isDeleting || completingChore}
              >
                {isDeleting ? (
                  <ActivityIndicator
                    size="small"
                    className="text-primary"
                  />
                ) : (
                  <>
                    <Text>Smazat úkol</Text>
                  </>
                )}
              </Button>
            </View>
            {isMyTurn && !isCompleted && !isFutureStart && (
              <Button
                variant="default"
                className="flex-1 flex-row gap-2"
                onPress={handleCompleteChore}
                disabled={completingChore || isDeleting}
              >
                {completingChore ? (
                  <ActivityIndicator
                    size="small"
                    className="text-primary"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      className="text-primary-foreground"
                    />
                    <Text>Splnit</Text>
                  </>
                )}
              </Button>
            )}
            {isMyTurn && isCompleted && !isFutureStart && (
              <Button
                variant="secondary"
                className="flex-1 flex-row gap-2"
                onPress={handleUncompleteChore}
                disabled={completingChore || isDeleting}
              >
                {completingChore ? (
                  <ActivityIndicator
                    size="small"
                    className="text-primary"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle"
                      size={22}
                      className="text-secondary-foreground"
                    />
                    <Text>Zrušit splnění</Text>
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
            onPress={() => router.push(`/chores/${chore.id}/history`)}
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
                className="text-muted-foreground"
              />
              <Text className="text-sm text-muted-foreground mt-3 w-full text-center">
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

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Smazat úkol"
        description="Opravdu chcete smazat tento úkol? Tuto akci nelze vrátit zpět."
        cancelText="Zrušit"
        actionText="Smazat"
        onAction={confirmDelete}
        destructive
      />

      <AlertDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        title="Dokončit úkol"
        description={`Opravdu chcete označit úkol "${chore?.name}" jako dokončený?`}
        cancelText="Zrušit"
        actionText="Dokončit"
        onAction={confirmCompleteChore}
      />

      <AlertDialog
        open={showUncompleteDialog}
        onOpenChange={setShowUncompleteDialog}
        title="Zrušit splnění"
        description={`Opravdu chcete zrušit splnění úkolu "${chore?.name}"?`}
        cancelText="Zrušit"
        actionText="Odznačit"
        onAction={confirmUncompleteChore}
      />
    </ScrollView>
  );
};

export default ChoreDetail;
