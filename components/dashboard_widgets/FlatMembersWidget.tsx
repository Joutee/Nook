import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useFlatContext } from "../../contexts/FlatContext";

interface FlatMember {
  id: string;
  name: string;
  surname: string;
  avatar_url: string | null;
  role: string;
}

export const FlatMembersWidget = () => {
  const [members, setMembers] = useState<FlatMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat } = useFlatContext();

  useEffect(() => {
    loadMembers();
  }, [currentFlat]);

  const loadMembers = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("flat_profile")
        .select(
          `
          profile_id,
          role,
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

      if (error) {
        console.error("Error loading members:", error);
      } else {
        const formattedMembers = (data || []).map((item: any) => ({
          id: item.profiles.id,
          name: item.profiles.name,
          surname: item.profiles.surname || "",
          avatar_url: item.profiles.avatar_url,
          role: item.role,
        }));
        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "pronajimatel":
        return "Pronajímatel";
      case "najemce":
        return "Nájemce";
      default:
        return role;
    }
  };

  return (
    <Card className="mb-4">
      <Pressable onPress={() => router.push("/flat")}>
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <CardTitle>Členové bytu</CardTitle>
            <Ionicons name="people-outline" size={24} color="#6366f1" />
          </View>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : members.length === 0 ? (
            <Text className="text-muted-foreground text-sm">Žádní členové</Text>
          ) : (
            <View>
              {members.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center py-2 border-b border-border last:border-b-0"
                >
                  <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
                    <Text className="text-primary-foreground text-sm font-semibold">
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {member.name} {member.surname}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {getRoleLabel(member.role)}
                    </Text>
                  </View>
                </View>
              ))}
              <View className="mt-2">
                <Text className="text-xs text-muted-foreground text-right">
                  Klepněte pro detail bytu →
                </Text>
              </View>
            </View>
          )}
        </CardContent>
      </Pressable>
    </Card>
  );
};
