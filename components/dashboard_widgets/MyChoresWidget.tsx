import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useFlatContext } from "../../contexts/FlatContext";
import { Chore } from "../../types/chores";

export const ChoresWidget = () => {
  const [myChores, setMyChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat } = useFlatContext();

  useEffect(() => {
    loadMyChores();
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
        const { data, error } = await supabase
          .from("view_chore_dashboard")
          .select("*")
          .eq("flat_id", currentFlat.id)
          .eq("assignee_user_id", user.id)
          .eq("is_completed_current_cycle", false)
          .order("name")
          .limit(3);

        if (error) {
          console.error("Error loading my chores:", error);
        } else {
          setMyChores(data || []);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Pressable onPress={() => router.push("/chores")}>
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <CardTitle>Moje úkoly</CardTitle>
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color="#10b981"
            />
          </View>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : myChores.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              Nemáte žádné úkoly na řadě 🎉
            </Text>
          ) : (
            <View>
              {myChores.map((chore) => (
                <Pressable
                  key={chore.id}
                  onPress={() => router.push(`/chore-detail?id=${chore.id}`)}
                  className="py-2 border-b border-border last:border-b-0"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground">
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
                    <View className="ml-2">
                      <Text className="text-xs text-muted-foreground">
                        Co {chore.interval_days}d
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
              <View className="mt-2">
                <Text className="text-xs text-muted-foreground text-right">
                  Klepněte pro všechny úkoly →
                </Text>
              </View>
            </View>
          )}
        </CardContent>
      </Pressable>
    </Card>
  );
};
