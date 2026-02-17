import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { Member } from "../types/members";

interface MemberOrderListProps {
  members: Member[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export const MemberOrderList: React.FC<MemberOrderListProps> = ({
  members,
  onMoveUp,
  onMoveDown,
}) => {
  if (members.length === 0) return null;

  return (
    <View className="mt-4 p-3 bg-subcard rounded-lg">
      <Text className="text-sm font-semibold text-foreground mb-3">
        Pořadí rotace:
      </Text>
      {members.map((member, index) => (
        <View
          key={member.id}
          className="flex-row items-center justify-between bg-card rounded-lg p-3 mb-2"
        >
          <View className="flex-row items-center flex-1 gap-2">
            <Text className="text-base font-semibold text-primary w-6">
              {index + 1}.
            </Text>
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
              <Text className="text-primary-foreground text-sm font-semibold">
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-sm text-foreground font-medium">
              {member.name} {member.surname}
            </Text>
          </View>
          <View className="flex-row gap-1">
            <Pressable
              onPress={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-1"
            >
              <Ionicons
                name="chevron-up"
                size={20}
                color={
                  index === 0 ? "hsl(240, 5%, 64.9%)" : "hsl(270, 89.1%, 49%)"
                }
              />
            </Pressable>
            <Pressable
              onPress={() => onMoveDown(index)}
              disabled={index === members.length - 1}
              className="p-1"
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={
                  index === members.length - 1
                    ? "hsl(240, 5%, 64.9%)"
                    : "hsl(270, 89.1%, 49%)"
                }
              />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
};
