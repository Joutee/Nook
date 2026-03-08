import { View, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import React, { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { Issue } from "@/types/issues";
import { getStatusColor, getStatusText } from "@/lib/issueUtils";

const Issues = () => {
  const { currentFlat, userRole } = useFlatContext();
  const { showToast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadIssues = async () => {
    if (!currentFlat) return;
    console.log("Načítám závady pro flat ID:", currentFlat.id);
    try {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("flat_id", currentFlat.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setIssues(data || []);
    } catch (error: any) {
      showToast("Chyba při načítání závad", "error");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadIssues();
      }
    }, [currentFlat]),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ");
  };

  const renderIssue = (item: Issue) => (
    <Card key={item.id} className="mb-3 ">
      <Pressable onPress={() => router.push(`/issue-detail?id=${item.id}`)}>
        <CardContent className="px-4">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-lg font-semibold text-foreground flex-1 mr-2">
              {item.title}
            </Text>
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getStatusColor(item.status) }}
            >
              <Text className="text-white text-xs font-semibold">
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          {item.description && (
            <Text
              className="text-sm text-muted-foreground mb-2"
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-1">
              <Ionicons
                name="calendar-outline"
                size={12}
                className="text-muted-foreground"
              />
              <Text className="text-xs text-muted-foreground w-6/12">
                {formatDate(item.created_at)}
              </Text>
            </View>
            {item.image_path && (
              <Ionicons
                name="image-outline"
                size={16}
                className="text-muted-foreground"
              />
            )}
          </View>
        </CardContent>
      </Pressable>
    </Card>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <Text className="text-3xl font-bold text-foreground mb-4">Závady</Text>
        {issues.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons
              name="warning-outline"
              size={64}
              className="text-muted-foreground"
            />
            <Text className="text-base text-muted-foreground mt-4 text-center w-full">
              Žádné závady
            </Text>
          </View>
        ) : (
          <>{issues.map(renderIssue)}</>
        )}
      </ScrollView>

      {/* Floating Action Button pro nájemce */}
      {userRole === "najemce" && (
        <Pressable
          className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
          onPress={() => router.push("/issue-create")}
        >
          <Ionicons name="add" size={28} className="text-primary-foreground" />
        </Pressable>
      )}
    </View>
  );
};

export default Issues;
