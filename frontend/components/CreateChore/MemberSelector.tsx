import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "../BottomSheet";

interface Member {
  id: string;
  name: string;
  surname: string;
  avatar_url: string | null;
}

interface MemberSelectorProps {
  members: Member[];
  selectedMembers: Member[];
  onToggleMember: (member: Member) => void;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({
  members,
  selectedMembers,
  onToggleMember,
}) => {
  const [showBottomSheet, setShowBottomSheet] = React.useState(false);

  const isMemberSelected = (memberId: string) => {
    return selectedMembers.some((m) => m.id === memberId);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowBottomSheet(true)}
      >
        <Text style={styles.selectButtonText}>
          {selectedMembers.length === 0
            ? "Vyberte uživatele"
            : `Vybráno: ${selectedMembers.length} uživatelů`}
        </Text>
        <Ionicons name="people" size={20} color="#007AFF" />
      </TouchableOpacity>

      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Vyberte uživatele"
      >
        <ScrollView style={styles.bottomSheetContent}>
          {members.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberItem,
                isMemberSelected(member.id) && styles.memberItemSelected,
              ]}
              onPress={() => onToggleMember(member)}
            >
              <View style={styles.memberInfo}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>
                  {member.name} {member.surname}
                </Text>
              </View>
              <Ionicons
                name={
                  isMemberSelected(member.id) ? "checkbox" : "square-outline"
                }
                size={24}
                color={isMemberSelected(member.id) ? "#007AFF" : "#ccc"}
              />
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
});
