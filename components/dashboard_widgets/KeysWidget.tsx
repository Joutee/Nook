import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { KeyWithAssignee } from "@/types/keys";
import { Avatar } from "@/components/ui/avatar";

export const KeysWidget = () => {
  const [keys, setKeys] = useState<KeyWithAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat, userRole } = useFlatContext();

  useEffect(() => {
    loadKeys();

    if (!currentFlat?.id) return;

    const keysChannel = supabase
      .channel("public:keys:widget")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "keys",
          filter: `flat_id=eq.${currentFlat.id}`,
        },
        () => {
          loadKeys();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(keysChannel);
    };
  }, [currentFlat]);

  const loadKeys = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("keys")
        .select(
          "*, assignee:profiles!assigned_to(id, name, surname, avatar_url)",
        )
        .eq("flat_id", currentFlat.id)
        .order("created_at", { ascending: true })
        .limit(4);

      if (error) throw error;
      setKeys((data as KeyWithAssignee[]) || []);
    } catch (error) {
      console.error("Error loading keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const keysPath =
    userRole === "pronajimatel" ? "/(tabs)/keys" : "/(tabs)/more";

  return (
    <Pressable onPress={() => router.push(keysPath as any)}>
      <Card className="mb-4">
        <CardHeader className="flex-row items-center gap-2">
          <Ionicons name="key-outline" size={24} className="text-foreground" />
          <CardTitle>Klíče</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : keys.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              Zatím žádné klíče
            </Text>
          ) : (
            <View>
              {keys.map((key, index) => (
                <React.Fragment key={key.id}>
                  <View className="py-2 flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className="text-sm font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {key.name}
                      </Text>
                      {key.assignee ? (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Avatar name={key.assignee.name} size="xs" />
                          <Text className="text-xs text-muted-foreground">
                            {key.assignee.name} {key.assignee.surname}
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-xs text-muted-foreground italic mt-0.5">
                          Nepřiřazen
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="key-outline"
                      size={16}
                      className="text-muted-foreground ml-2"
                    />
                  </View>
                  {index < keys.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
};
