import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { Issue } from "@/types/issues";
import { getStatusColor, getStatusText } from "@/lib/issueUtils";
import { Separator } from "@/components/ui/separator";
import logger from "@/lib/logger";

export const IssuesWidget = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat } = useFlatContext();

  useEffect(() => {
    // 1. Prvotní načtení dat
    loadIssues();

    // Pokud nemáme flat_id, nemá smysl nic poslouchat
    if (!currentFlat?.id) return;

    // 2. Vytvoření Realtime kanálu
    const issuesChannel = supabase
      .channel("public:issues") // Název kanálu (může být cokoliv)
      .on(
        "postgres_changes",
        {
          event: "*", // Chceme poslouchat vše (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "issues",
          filter: `flat_id=eq.${currentFlat.id}`, // MAGIE: Posloucháme jen náš byt!
        },
        (payload) => {
          logger.log("Změna v závadách detekována!", payload);
          // Když se něco změní (někdo přidá/upraví závadu), přenačteme widget
          loadIssues();
        },
      )
      .subscribe();

    // 3. Úklid při opuštění obrazovky (zavře trubku a šetří limit 200 připojení)
    return () => {
      supabase.removeChannel(issuesChannel);
    };
  }, [currentFlat]);

  const loadIssues = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("flat_id", currentFlat.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        logger.error("Error loading issues:", error);
      } else {
        setIssues(data || []);
      }
    } catch (error) {
      logger.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ");
  };

  return (
    <Pressable onPress={() => router.push("/(tabs)/issues")}>
      <Card className="mb-4">
        <CardHeader className="flex-row items-center gap-2">
          <Ionicons
            name="warning-outline"
            size={24}
            className="text-foreground"
          />
          <CardTitle>Poslední závady</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : issues.length === 0 ? (
            <Text className="text-muted-foreground text-sm">Žádné závady</Text>
          ) : (
            <View>
              {issues.map((issue, index) => (
                <React.Fragment key={issue.id}>
                  <Pressable
                    onPress={() => router.push(`/issues/${issue.id}`)}
                    className="py-2 border-b border-border last:border-b-0 flex flex-row justify-between mb-1 items-center"
                  >
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold text-foreground flex-1 mr-2 w-full"
                        numberOfLines={1}
                      >
                        {issue.title}
                      </Text>

                      <Text className="text-xs text-muted-foreground mt-1 w-full">
                        {formatDate(issue.created_at)}
                      </Text>
                    </View>
                    <View
                      className="px-2 py-0.5 rounded-full ml-3"
                      style={{
                        backgroundColor: getStatusColor(issue.status),
                      }}
                    >
                      <Text className="text-white text-xs font-semibold">
                        {getStatusText(issue.status)}
                      </Text>
                    </View>
                  </Pressable>
                  {index < issues.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
};
