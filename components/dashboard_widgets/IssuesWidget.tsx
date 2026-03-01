import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useFlatContext } from "../../contexts/FlatContext";
import { Issue } from "../../types/issues";
import { getStatusColor, getStatusText } from "../../lib/issueUtils";
import { Separator } from "../ui/separator";

export const IssuesWidget = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat } = useFlatContext();

  useEffect(() => {
    loadIssues();
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
        console.error("Error loading issues:", error);
      } else {
        setIssues(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ");
  };

  return (
    <Card className="mb-4">
      <Pressable onPress={() => router.push("/issues")}>
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <CardTitle>Poslední závady</CardTitle>
            <Ionicons name="warning-outline" size={24} color="#ef4444" />
          </View>
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
                    onPress={() => router.push(`/issue-detail?id=${issue.id}`)}
                    className="py-2 border-b border-border last:border-b-0"
                  >
                    <View className="flex-row items-start justify-between mb-1">
                      <Text
                        className="text-sm font-semibold text-foreground flex-1 mr-2"
                        numberOfLines={1}
                      >
                        {issue.title}
                      </Text>
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: getStatusColor(issue.status),
                        }}
                      >
                        <Text className="text-white text-xs font-semibold">
                          {getStatusText(issue.status)}
                        </Text>
                      </View>
                    </View>
                    {issue.description && (
                      <Text
                        className="text-xs text-muted-foreground"
                        numberOfLines={1}
                      >
                        {issue.description}
                      </Text>
                    )}
                    <Text className="text-xs text-muted-foreground mt-1">
                      {formatDate(issue.created_at)}
                    </Text>
                  </Pressable>
                  {index < issues.length - 1 && <Separator />}
                </React.Fragment>
              ))}
              <View className="mt-2">
                <Text className="text-xs text-muted-foreground text-right">
                  Klepněte pro všechny závady →
                </Text>
              </View>
            </View>
          )}
        </CardContent>
      </Pressable>
    </Card>
  );
};
