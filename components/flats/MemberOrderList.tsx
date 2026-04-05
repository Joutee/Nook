import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { Member } from "@/types/members";
import { Avatar } from "@/components/ui/avatar";

interface MemberOrderListProps {
  members: Member[];
  onReorder: (members: Member[]) => void;
}

export const MemberOrderList: React.FC<MemberOrderListProps> = ({
  members,
  onReorder,
}) => {
  if (members.length === 0) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newMembers = [...members];
    [newMembers[index - 1], newMembers[index]] = [
      newMembers[index],
      newMembers[index - 1],
    ];
    onReorder(newMembers);
  };

  const moveDown = (index: number) => {
    if (index === members.length - 1) return;
    const newMembers = [...members];
    [newMembers[index], newMembers[index + 1]] = [
      newMembers[index + 1],
      newMembers[index],
    ];
    onReorder(newMembers);
  };

  return (
    <>
      <Text className="text-sm font-semibold text-foreground mb-3">
        Pořadí rotace:
      </Text>
      {members.map((member, index) => (
        <View
          key={member.id}
          className="flex-row items-center justify-between bg-secondary rounded-lg p-3 mb-2"
        >
          <View className="flex-row items-center flex-1 gap-2">
            <Text className="text-base font-semibold text-primary w-6">
              {index + 1}.
            </Text>
            <Avatar name={member.name} imageUrl={member.avatar_url} size="lg" />
            <Text className="text-sm text-foreground font-medium flex-1">
              {member.name} {member.surname}
            </Text>
          </View>
          <View className="flex-row gap-1">
            <Pressable
              onPress={() => moveUp(index)}
              disabled={index === 0}
              className="p-1"
            >
              <Ionicons
                name="chevron-up"
                size={20}
                className={
                  index === 0 ? "text-muted-foreground" : "text-primary"
                }
              />
            </Pressable>
            <Pressable
              onPress={() => moveDown(index)}
              disabled={index === members.length - 1}
              className="p-1"
            >
              <Ionicons
                name="chevron-down"
                size={20}
                className={
                  index === members.length - 1
                    ? "text-muted-foreground"
                    : "text-primary"
                }
              />
            </Pressable>
          </View>
        </View>
      ))}
    </>
  );
};
