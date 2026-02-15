import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Text } from "@/components/ui/text"
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../utils/supabase";
import BottomSheet from "./BottomSheet";
import { useToast } from "../contexts/ToastContext";
import { useFlatContext } from "../contexts/FlatContext";
import { FlatMember } from "../types/flat";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { refreshFlats } = useFlatContext();

  useEffect(() => {
    if (visible && flatId) {
      loadMembers();
    }
  }, [visible, flatId]);

  const loadMembers = async () => {
    if (!flatId) return;

    setIsLoading(true);

    try {
      // Získat aktuálního uživatele a jeho roli
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
        const { data: userProfile } = await supabase
          .from("flat_profile")
          .select("is_admin")
          .eq("flat_id", flatId)
          .eq("profile_id", user.id)
          .single();

        setIsCurrentUserAdmin(userProfile?.is_admin || false);
      }

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

  const handleRemoveMember = async (memberId: string) => {
    if (!flatId) return;

    try {
      // Nejdřív zkontrolovat, jestli řádek existuje
      const { data: existing, error: checkError } = await supabase
        .from("flat_profile")
        .select("*")
        .eq("flat_id", flatId)
        .eq("profile_id", memberId);

      if (!existing || existing.length === 0) {
        showToast("Člen nebyl nalezen v databázi", "error");
        return;
      }

      const { data, error } = await supabase
        .from("flat_profile")
        .delete()
        .eq("flat_id", flatId)
        .eq("profile_id", memberId)
        .select();

      if (error) {
        console.error("Delete error:", error);
        showToast("Nepodařilo se odebrat člena: " + error.message, "error");
      } else if (data && data.length > 0) {
        showToast("Člen byl odebrán z bytu", "success");

        // Pokud uživatel odstranil sám sebe, zavrít bottom sheet
        if (memberId === currentUserId) {
          onClose();
        }

        // Aktualizovat kontext - pokud uživatel opustil byt, layout ho přesměruje
        await refreshFlats();

        // Znovu načíst členy (pokud uživatel stále vidí tento byt)
        loadMembers();
      } else {
        showToast("Člen nebyl smazán (RLS policy?)", "error");
      }
    } catch (error: any) {
      console.error("Catch error:", error);
      showToast("Nepodařilo se odebrat člena: " + error.message, "error");
    }
  };

  const handleChangeRole = async (memberId: string, currentRole: string) => {
    if (!flatId || !isCurrentUserAdmin) return;

    const newRole = currentRole === "pronajimatel" ? "najemce" : "pronajimatel";

    try {
      const { error } = await supabase
        .from("flat_profile")
        .update({ role: newRole })
        .eq("flat_id", flatId)
        .eq("profile_id", memberId);

      if (error) {
        showToast("Nepodařilo se změnit roli: " + error.message, "error");
      } else {
        showToast(
          `Role změněna na ${newRole === "pronajimatel" ? "Pronajímatel" : "Nájemce"}`,
          "success",
        );
        
        // Aktualizovat FlatContext (důležité pokud se změnila role aktuálního uživatele)
        await refreshFlats();
        
        // Znovu načíst seznam členů
        loadMembers();
      }
    } catch (error: any) {
      showToast("Nepodařilo se změnit roli: " + error.message, "error");
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Členové bytu">
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Žádní členové</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const showDeleteButton =
                isCurrentUserAdmin || item.id === currentUserId;

              return (
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
                    <TouchableOpacity
                      onPress={() =>
                        isCurrentUserAdmin
                          ? handleChangeRole(item.id, item.role)
                          : null
                      }
                      disabled={!isCurrentUserAdmin}
                    >
                      <View style={styles.roleContainer}>
                        <Text
                          style={[
                            styles.memberRole,
                            isCurrentUserAdmin && styles.memberRoleClickable,
                          ]}
                        >
                          {item.role === "pronajimatel"
                            ? "Pronajímatel"
                            : "Nájemce"}
                        </Text>
                        {isCurrentUserAdmin && (
                          <Ionicons
                            name="swap-horizontal"
                            size={16}
                            color="#007AFF"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                  {showDeleteButton && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(item.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={24}
                        color="#FF3B30"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.membersList}
            scrollEnabled={members.length > 5}
          />
        </View>
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
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  listContainer: {
    maxHeight: SCREEN_HEIGHT * 0.6,
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
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberRole: {
    fontSize: 14,
    color: "#666",
  },
  memberRoleClickable: {
    color: "#007AFF",
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
  },
});
