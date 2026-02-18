import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import { HistoryItem } from "../types/chores";

interface ChoreHistoryItemProps {
  item: HistoryItem;
}

export const ChoreHistoryItem: React.FC<ChoreHistoryItemProps> = ({ item }) => {
  const cycleDate = new Date(item.cycle_start_date);
  const completedDate = item.completed_at ? new Date(item.completed_at) : null;

  return (
    <Card className={item.is_done ? "border-l-4 border-l-green-600" : ""}>
      <CardContent className="p-3">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">
              Cyklus #{item.cycle_index + 1}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {cycleDate.toLocaleDateString("cs-CZ")}
            </Text>
          </View>
          {item.is_done ? (
            <Ionicons
              name="checkmark-circle"
              size={20}
              className="text-success"
            />
          ) : (
            <Ionicons
              name="close-circle"
              size={20}
              className="text-destructive"
            />
          )}
        </View>

        <View className="gap-1.5">
          {item.expected_profile_name && (
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-primary items-center justify-center mr-2">
                <Text className="text-primary-foreground text-xs font-semibold">
                  {item.expected_profile_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="text-xs text-foreground font-medium">
                {item.expected_profile_name}
                {item.expected_profile_surname &&
                  ` ${item.expected_profile_surname}`}
              </Text>
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );
};
