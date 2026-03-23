import React from "react";
import { View, ScrollView, Pressable, useColorScheme } from "react-native";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@/components/shared/BottomSheet";
import { Member } from "@/types/members";
import { THEME } from "@/lib/theme";

interface MemberSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  selectedMembers: Member[];
  onToggleMember: (member: Member) => void;
  multiSelect?: boolean;
  title?: string;
}

export const MemberSelectorSheet: React.FC<MemberSelectorSheetProps> = ({
  visible,
  onClose,
  members,
  selectedMembers,
  onToggleMember,
  multiSelect = true,
  title,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const borderColor = isDark ? THEME.dark.border : THEME.light.border;

  const isMemberSelected = (memberId: string) => {
    return selectedMembers.some((m) => m.id === memberId);
  };

  const handleMemberPress = (member: Member) => {
    onToggleMember(member);
    if (!multiSelect) {
      // For single select, close the bottom sheet after selection
      onClose();
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title || (multiSelect ? "Vyberte uživatele" : "Vyberte uživatele")}
    >
      <ScrollView style={{ maxHeight: 400 }}>
        <View className="mx-4">
          {members.map((member) => (
            <Pressable
              key={member.id}
              className={`flex-row items-center py-3 px-3 bg-card border border-border rounded-lg mb-2 gap-3 ${
                isMemberSelected(member.id)
                  ? "bg-primary/10 border-primary"
                  : "border-border"
              }`}
              onPress={() => handleMemberPress(member)}
            >
              <View className="flex-row items-center flex-1">
                <Avatar name={member.name} size="lg" className="mr-2" />
                <Text className="text-base text-foreground font-medium flex-1">
                  {member.surname
                    ? `${member.name} ${member.surname}`
                    : member.name}
                </Text>
              </View>
              {multiSelect ? (
                <Ionicons
                  name={
                    isMemberSelected(member.id) ? "checkbox" : "square-outline"
                  }
                  size={24}
                  color={isMemberSelected(member.id) ? undefined : borderColor}
                  className={
                    isMemberSelected(member.id) ? "text-primary" : undefined
                  }
                />
              ) : (
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isMemberSelected(member.id)
                      ? "border-primary"
                      : "border-border"
                  }`}
                >
                  {isMemberSelected(member.id) && (
                    <View className="w-3 h-3 rounded-full bg-primary" />
                  )}
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};
