import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import { HistoryItem } from "@/types/chores";
import { Avatar } from "@/components/ui/avatar";

interface ChoreHistoryItemProps {
  item: HistoryItem;
}

export const ChoreHistoryItem: React.FC<ChoreHistoryItemProps> = ({ item }) => {
  // Convert PostgreSQL timestamp format to ISO 8601 format
  // "2026-03-15 00:00:00+00" -> "2026-03-15T00:00:00Z"
  const isoDateString = item.cycle_start_date
    .replace(" ", "T")
    .replace("+00", "Z");

  const cycleDate = new Date(isoDateString);
  const completedDate = item.completed_at
    ? new Date(item.completed_at.replace(" ", "T").replace("+00", "Z"))
    : null;

  return (
    <Card>
      <CardContent className="px-6 flex-row items-center justify-between">
        <View>
          <View className="flex-1 mb-2">
            <Text className="text-sm font-semibold text-foreground">
              Cyklus #{item.cycle_index + 1}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {cycleDate.toLocaleDateString("cs-CZ")}
            </Text>
          </View>
          {item.expected_profile_name && (
            <View className="flex-row items-center">
              <Avatar
                name={item.expected_profile_name}
                size="md"
                className="mr-2"
              />
              <Text className="text-xs text-foreground font-medium">
                {item.expected_profile_name}
                {item.expected_profile_surname &&
                  ` ${item.expected_profile_surname}`}
              </Text>
            </View>
          )}
        </View>

        {item.is_done ? (
          <Ionicons
            name="checkmark-circle"
            size={24}
            className="text-success"
          />
        ) : (
          <Ionicons
            name="close-circle"
            size={24}
            className="text-destructive"
          />
        )}
      </CardContent>
    </Card>
  );
};
