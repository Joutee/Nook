import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { supabase } from "../lib/supabase";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
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
          .eq("active", true)
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
        .eq("flat_id", flatId)
        .eq("active", true);

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
      // Nejdřív zkontrolovat, jestli řádek existuje a je aktivní
      const { data: existing, error: checkError } = await supabase
        .from("flat_profile")
        .select("active")
        .eq("flat_id", flatId)
        .eq("profile_id", memberId)
        .maybeSingle();

      if (!existing) {
        showToast("Člen nebyl nalezen v databázi", "error");
        return;
      }

      if (!existing.active) {
        showToast("Člen už není aktivní v tomto bytě", "info");
        return;
      }

      // Nastavit active na false místo smazání
      const { data, error } = await supabase
        .from("flat_profile")
        .update({ active: false })
        .eq("flat_id", flatId)
        .eq("profile_id", memberId)
        .select();

      if (error) {
        console.error("Update error:", error);
        showToast("Nepodařilo se odebrat člena: " + error.message, "error");
      } else if (data && data.length > 0) {
        showToast("Člen byl odpojen z bytu", "success");

        // Pokud uživatel odstranil sám sebe, zavrít bottom sheet
        if (memberId === currentUserId) {
          onClose();
        }

        // Aktualizovat kontext - pokud uživatel opustil byt, layout ho přesměruje
        await refreshFlats();

        // Znovu načíst členy (pokud uživatel stále vidí tento byt)
        loadMembers();
      } else {
        showToast("Člen nebyl odpojen (RLS policy?)", "error");
      }
    } catch (error: any) {
      console.error("Catch error:", error);
      showToast("Nepodařilo se odebrat člena: " + error.message, "error");
    }
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      handleRemoveMember(memberToRemove);
      setMemberToRemove(null);
    }
  };

  const openRemoveDialog = (memberId: string) => {
    setMemberToRemove(memberId);
    setShowDeleteDialog(true);
  };

  const handleChangeRole = async (memberId: string, currentRole: string) => {
    if (!flatId || !isCurrentUserAdmin) return;

    const newRole = currentRole === "pronajimatel" ? "najemce" : "pronajimatel";

    try {
      const { error } = await supabase
        .from("flat_profile")
        .update({ role: newRole })
        .eq("flat_id", flatId)
        .eq("profile_id", memberId)
        .eq("active", true);

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
        <View className="p-10 items-center justify-center">
          <ActivityIndicator size="large" color="hsl(270, 89.1%, 49%)" />
        </View>
      ) : members.length === 0 ? (
        <View className="p-10 items-center justify-center">
          <Text className="text-base text-muted-foreground">Žádní členové</Text>
        </View>
      ) : (
        <View style={{ maxHeight: SCREEN_HEIGHT * 0.6 }}>
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const showDeleteButton =
                isCurrentUserAdmin || item.id === currentUserId;

              return (
                <View className="bg-secondary rounded-lg p-3 mb-2 mx-4 border border-border">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2">
                        <Text className="text-primary-foreground text-sm font-semibold">
                          {item.name
                            ? item.name.charAt(0).toUpperCase()
                            : item.username
                              ? item.username.charAt(0).toUpperCase()
                              : "?"}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm text-foreground font-medium mb-0.5">
                          {item.name && item.surname
                            ? `${item.name} ${item.surname}`
                            : item.name || item.username || "Neznámý uživatel"}
                        </Text>
                        <Pressable
                          onPress={() =>
                            isCurrentUserAdmin
                              ? handleChangeRole(item.id, item.role)
                              : null
                          }
                          disabled={!isCurrentUserAdmin}
                        >
                          <View className="flex-row items-center gap-1">
                            {isCurrentUserAdmin && (
                              <Ionicons
                                name="swap-horizontal"
                                size={14}
                                className="text-primary"
                              />
                            )}
                            <Text
                              className={`text-xs ${
                                isCurrentUserAdmin
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {item.role === "pronajimatel"
                                ? "Pronajímatel"
                                : "Nájemce"}
                            </Text>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                    {showDeleteButton && (
                      <TouchableOpacity
                        onPress={() => openRemoveDialog(item.id)}
                        className="p-2 ml-2"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          className="text-destructive"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
            scrollEnabled={members.length > 5}
          />
        </View>
      )}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Odebrat člena"
        description={
          memberToRemove === currentUserId
            ? "Opravdu se chcete odpojit z tohoto bytu?"
            : "Opravdu chcete odebrat tohoto člena z bytu?"
        }
        cancelText="Zrušit"
        actionText="Odebrat"
        onAction={confirmRemoveMember}
        destructive
      />
    </BottomSheet>
  );
};

export default MembersBottomSheet;
