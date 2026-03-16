import React from "react";
import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { Member } from "../types/members";

interface MemberSelectorButtonProps {
  selectedMembers: Member[];
  onPress: () => void;
  multiSelect?: boolean;
  buttonText?: string;
}

export const MemberSelectorButton: React.FC<MemberSelectorButtonProps> = ({
  selectedMembers,
  onPress,
  multiSelect = true,
  buttonText,
}) => {
  const getButtonText = () => {
    if (buttonText !== undefined) return buttonText;

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
    <Pressable
      className="flex-row items-center justify-between rounded-md p-3 border border-border dark:bg-input shadow-sm shadow-black/5"
      onPress={onPress}
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
  );
};
