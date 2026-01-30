import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../utils/supabase";
import BottomSheet from "./BottomSheet";
import { useToast } from "../contexts/ToastContext";

interface FlatMember {
  id: string;
  username: string;
  name: string | null;
  surname: string | null;
  role: string;
}

interface MembersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  flatId: string | null;
}

const MembersBottomSheet: React.FC<MembersBottomSheetProps> = ({
  visible,
  onClose,
  flatId,
}) => {
  const [members, setMembers] = useState<FlatMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (visible && flatId) {
      loadMembers();
    }
  }, [visible, flatId]);

  const loadMembers = async () => {
    if (!flatId) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("flat_profile")
        .select(
          `
          profile_id,
          role,
          profiles:profile_id (
            id,
            username,
            name,
            surname
          )
        `,
        )
        .eq("flat_id", flatId);

      if (error) {
        console.error("Error fetching members:", error);
        showToast("Nepodařilo se načíst členy bytu", "error");
        onClose();
      } else if (data) {
        const formattedMembers = data
          .filter((item: any) => item.profiles && item.profiles.id) // Filtrovat pouze záznamy s platným profilem a ID
          .map((item: any) => ({
            id: item.profiles.id,
            username: item.profiles.username || "Neznámý",
            name: item.profiles.name,
            surname: item.profiles.surname,
            role: item.role || "najemce",
          }));
        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst členy bytu", "error");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Členové bytu">
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberItem}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {item.name
                    ? item.name.charAt(0).toUpperCase()
                    : item.username
                      ? item.username.charAt(0).toUpperCase()
                      : "?"}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {item.name && item.surname
                    ? `${item.name} ${item.surname}`
                    : item.name || item.username || "Neznámý uživatel"}
                </Text>
                <Text style={styles.memberRole}>
                  {item.role === "pronajimatel" ? "Pronajímatel" : "Nájemce"}
                </Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.membersList}
          scrollEnabled={true}
        />
      )}
    </BottomSheet>
  );
};

export default MembersBottomSheet;

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  membersList: {
    padding: 16,
    paddingBottom: 40,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: "#666",
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
  },
});
