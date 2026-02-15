import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Text } from "@/components/ui/text"
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "./BottomSheet";
import { Member } from "../types/members";

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
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowBottomSheet(true)}
      >
        <Text style={styles.selectButtonText}>{getButtonText()}</Text>
        <Ionicons
          name={multiSelect ? "people" : "person"}
          size={20}
          color="#007AFF"
        />
      </TouchableOpacity>

      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title={
          title || (multiSelect ? "Vyberte uživatele" : "Vyberte uživatele")
        }
      >
        <ScrollView style={styles.bottomSheetContent}>
          {members.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberItem,
                isMemberSelected(member.id) && styles.memberItemSelected,
              ]}
              onPress={() => handleMemberPress(member)}
            >
              <View style={styles.memberInfo}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>
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
                  color={isMemberSelected(member.id) ? "#007AFF" : "#ccc"}
                />
              ) : (
                <View
                  style={[
                    styles.radioButton,
                    isMemberSelected(member.id) && styles.radioButtonSelected,
                  ]}
                >
                  {isMemberSelected(member.id) && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#333",
  },
  bottomSheetContent: {
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  memberItemSelected: {
    backgroundColor: "#e3f2fd",
    borderColor: "#007AFF",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  memberAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  memberName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    borderColor: "#007AFF",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
});
