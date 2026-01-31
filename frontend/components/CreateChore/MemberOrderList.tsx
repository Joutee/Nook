import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Member {
  id: string;
  name: string;
  surname: string;
  avatar_url: string | null;
}

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
    <View style={styles.orderSection}>
      <Text style={styles.orderTitle}>Pořadí rotace:</Text>
      {members.map((member, index) => (
        <View key={member.id} style={styles.orderItem}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>{index + 1}.</Text>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.memberName}>
              {member.name} {member.surname}
            </Text>
          </View>
          <View style={styles.orderControls}>
            <TouchableOpacity
              onPress={() => onMoveUp(index)}
              disabled={index === 0}
              style={[
                styles.orderButton,
                index === 0 && styles.orderButtonDisabled,
              ]}
            >
              <Ionicons
                name="chevron-up"
                size={20}
                color={index === 0 ? "#ccc" : "#007AFF"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onMoveDown(index)}
              disabled={index === members.length - 1}
              style={[
                styles.orderButton,
                index === members.length - 1 && styles.orderButtonDisabled,
              ]}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={index === members.length - 1 ? "#ccc" : "#007AFF"}
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  orderSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginRight: 8,
    width: 24,
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
  orderControls: {
    flexDirection: "row",
    gap: 4,
  },
  orderButton: {
    padding: 4,
  },
  orderButtonDisabled: {
    opacity: 0.3,
  },
});
