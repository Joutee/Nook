import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { HistoryItem } from "@/types/chores";
import { Avatar } from "@/components/ui/avatar";

interface MemberStats {
  profile_id: string;
  name: string;
  surname: string;
  avatar_url: string | null;
  total_chores: number;
  completed_chores: number;
  completion_rate: number;
}

export const ChoreLeaderBoardWidget = () => {
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat } = useFlatContext();

  useEffect(() => {
    // 1. Prvotní načtení dat
    loadChoreStats();

    // Pokud nemáme flat_id, nemá smysl nic poslouchat
    if (!currentFlat?.id) return;

    // 2. Vytvoření Realtime kanálu pro změny v dokončení úkolů
    const completionsChannel = supabase
      .channel("public:chore_completions_leaderboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chore_completions",
        },
        (payload) => {
          console.log("Změna v dokončení úkolů detekována!", payload);
          loadChoreStats();
        },
      )
      .subscribe();

    // 3. Kanál pro změny v úkolech (nové úkoly, změny assignee atd.)
    const choresChannel = supabase
      .channel("public:chores_leaderboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chores",
          filter: `flat_id=eq.${currentFlat.id}`,
        },
        (payload) => {
          console.log("Změna v úkolech detekována!", payload);
          loadChoreStats();
        },
      )
      .subscribe();

    // 4. Úklid při opuštění obrazovky
    return () => {
      supabase.removeChannel(completionsChannel);
      supabase.removeChannel(choresChannel);
    };
  }, [currentFlat]);

  const loadChoreStats = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Načíst všechny členy bytu
      const { data: membersData, error: membersError } = await supabase
        .from("flat_profile")
        .select(
          `
          profile_id,
          profiles:profile_id (
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
        console.error("Error loading members:", membersError);
        setIsLoading(false);
        return;
      }

      // 2. Načíst historii všech úkolů pro tento byt
      const { data: historyData, error: historyError } = await supabase
        .from("view_chore_history")
        .select("*")
        .eq("flat_id", currentFlat.id);

      if (historyError) {
        console.error("Error loading chore history:", historyError);
        setIsLoading(false);
        return;
      }

      // 3. Vypočítat statistiky pro každého člena
      const stats: MemberStats[] = membersData
        .map((member: any) => {
          const profileId = member.profile_id;
          const profile = member.profiles;

          // Filtrovat úkoly přiřazené tomuto členovi
          const memberChores = (historyData as HistoryItem[]).filter(
            (item) => item.expected_profile_id === profileId,
          );

          // Spočítat dokončené úkoly
          const completedChores = memberChores.filter(
            (item) => item.is_done,
          ).length;

          // Vypočítat procento úspěšnosti
          const completionRate =
            memberChores.length > 0
              ? (completedChores / memberChores.length) * 100
              : 0;

          return {
            profile_id: profileId,
            name: profile.name,
            surname: profile.surname,
            avatar_url: profile.avatar_url,
            total_chores: memberChores.length,
            completed_chores: completedChores,
            completion_rate: completionRate,
          };
        })
        .filter((stat) => stat.total_chores > 0) // Zobrazit jen členy, kteří mají nějaké úkoly
        .sort((a, b) => b.completion_rate - a.completion_rate); // Seřadit od nejvyššího procenta

      setMemberStats(stats);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompletionColor = (rate: number): string => {
    if (rate >= 80) return "text-success";
    if (rate >= 60) return "text-warning";
    return "text-destructive";
  };

  const getCompletionBarColor = (rate: number): string => {
    if (rate >= 80) return "bg-success";
    if (rate >= 60) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <Pressable onPress={() => router.push("/(tabs)/chores")}>
      <Card className="mb-4">
        <CardHeader className="flex-row items-center gap-2">
          <Ionicons
            name="trophy-outline"
            size={24}
            className="text-foreground"
          />
          <CardTitle>Úspěšnost plnění úkolů</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : memberStats.length === 0 ? (
            <View className="py-4">
              <Text className="text-sm text-muted-foreground text-center">
                Zatím nejsou žádné dokončené úkoly
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {memberStats.map((stat, index) => (
                <View
                  key={stat.profile_id}
                  className="flex-row items-center gap-2"
                >
                  {/* Position Number */}
                  <View className="w-8">
                    <Text
                      className="text-lg text-primary text-left
                     font-semibold"
                    >
                      {index + 1}.
                    </Text>
                  </View>

                  {/* Avatar */}
                  <Avatar
                    name={stat.name}
                    imageUrl={stat.avatar_url}
                    size="xl"
                  />

                  {/* Name and Stats */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-sm font-semibold text-foreground">
                        {stat.name} {stat.surname}
                      </Text>
                      <Text
                        className={`text-sm font-bold ${getCompletionColor(stat.completion_rate)}`}
                      >
                        {stat.completion_rate.toFixed(0)}%
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View className="h-2 bg-secondary rounded-full overflow-hidden">
                      <View
                        className={`h-full rounded-full ${getCompletionBarColor(stat.completion_rate)}`}
                        style={{
                          width: `${stat.completion_rate}%`,
                        }}
                      />
                    </View>

                    {/* Chore Count */}
                    <Text className="text-xs text-muted-foreground mt-1">
                      {stat.completed_chores} z {stat.total_chores} úkolů
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
};
