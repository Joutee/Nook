import React from "react";
import { View, ScrollView, Pressable, useColorScheme } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "./BottomSheet";
import { Member } from "../types/members";
import { THEME } from "../lib/theme";

interface MemberSelectorProps {
  members: Member[];
  selectedMembers: Member[];
  onToggleMember: (member: Member) => void;
  multiSelect?: boolean;
  buttonText?: string;
  title?: string;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({
  members,
  selectedMembers,
  onToggleMember,
  multiSelect = true,
  buttonText,
  title,
}) => {
  const [showBottomSheet, setShowBottomSheet] = React.useState(false);
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
      setShowBottomSheet(false);
    }
  };

  const getButtonText = () => {
    if (buttonText) return buttonText;

    if (selectedMembers.length === 0) {
      return multiSelect ? "Vyberte uživatele" : "Vyberte uživatele";
    }

    if (multiSelect) {
      return `Vybráno: ${selectedMembers.length} uživatelů`;
    } else {
      const member = selectedMembers[0];
      if (member) {
        return member.surname
          ? `${member.name} ${member.surname}`
          : member.name;
      }
      return "Vyberte uživatele";
    }
  };

  return (
    <>
      <Pressable
        className="flex-row items-center justify-between rounded-md p-3 border border-border dark:bg-input shadow-sm shadow-black/5"
        onPress={() => setShowBottomSheet(true)}
      >
        <Text className="text-base text-foreground flex-1 mr-2">
          {getButtonText()}
        </Text>
        <Ionicons
          name={multiSelect ? "people" : "person"}
          size={20}
          className={
            selectedMembers.length > 0 ? "text-primary" : "text-foreground"
          }
        />
      </Pressable>

      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title={
          title || (multiSelect ? "Vyberte uživatele" : "Vyberte uživatele")
        }
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
                  <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2">
                    <Text className="text-primary-foreground text-sm font-semibold">
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-sm text-foreground font-medium flex-1">
                    {member.surname
                      ? `${member.name} ${member.surname}`
                      : member.name}
                  </Text>
                </View>
                {multiSelect ? (
                  <Ionicons
                    name={
                      isMemberSelected(member.id)
                        ? "checkbox"
                        : "square-outline"
                    }
                    size={24}
                    color={
                      isMemberSelected(member.id) ? undefined : borderColor
                    }
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
    </>
  );
};
