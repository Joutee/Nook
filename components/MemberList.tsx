import {
  View,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { Member } from "@/types/members";
import { getRoleLabel } from "@/lib/memberUtils";
import { Avatar } from "@/components/ui/avatar";

export type { Member };

interface MemberListProps {
  showActions?: boolean;
  flatId?: string | null; // Volitelný flatId - pokud není poskytnut, použije currentFlat z kontextu
}

export const MemberList = ({
  showActions = false,
  flatId: propFlatId,
}: MemberListProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { currentFlat, refreshFlats } = useFlatContext();
  const { showToast } = useToast();

  // Použít propFlatId pokud je poskytnut, jinak currentFlat.id
  const effectiveFlatId = propFlatId || currentFlat?.id;

  const [removeAlert, setRemoveAlert] = useState<{
    open: boolean;
    memberId: string | null;
    memberName: string;
  }>({ open: false, memberId: null, memberName: "" });

  const [roleAlert, setRoleAlert] = useState<{
    open: boolean;
    memberId: string | null;
    memberName: string;
    currentRole: string;
  }>({ open: false, memberId: null, memberName: "", currentRole: "" });

  useEffect(() => {
    loadMembers();
  }, [effectiveFlatId]);

  const loadMembers = async () => {
    if (!effectiveFlatId) {
      setIsLoading(false);
      return;
    }

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
          .eq("flat_id", effectiveFlatId)
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
            name,
            surname,
            username,
            avatar_url
          )
        `,
        )
        .eq("flat_id", effectiveFlatId)
        .eq("active", true);

      if (error) {
        console.error("Error loading members:", error);
        showToast("Nepodařilo se načíst členy bytu", "error");
      } else {
        const formattedMembers = (data || [])
          .filter((item: any) => item.profiles && item.profiles.id)
          .map((item: any) => ({
            id: item.profiles.id,
            name: item.profiles.name,
            surname: item.profiles.surname || "",
            username: item.profiles.username,
            avatar_url: item.profiles.avatar_url,
            role: item.role,
          }));
        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst členy bytu", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeAlert.memberId || !effectiveFlatId) return;

    const memberId = removeAlert.memberId;

    try {
      const { data: existing, error: checkError } = await supabase
        .from("flat_profile")
        .select("active")
        .eq("flat_id", effectiveFlatId)
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

      const { data, error } = await supabase
        .from("flat_profile")
        .update({ active: false })
        .eq("flat_id", effectiveFlatId)
        .eq("profile_id", memberId)
        .select();

      if (error) {
        console.error("Update error:", error);
        showToast("Nepodařilo se odebrat člena: " + error.message, "error");
      } else if (data && data.length > 0) {
        showToast("Člen byl odpojen z bytu", "success");
        await refreshFlats();
        loadMembers();
      } else {
        showToast("Člen nebyl odpojen (RLS policy?)", "error");
      }
    } catch (error: any) {
      console.error("Catch error:", error);
      showToast("Nepodařilo se odebrat člena: " + error.message, "error");
    }
  };

  const handleChangeRole = async () => {
    if (!roleAlert.memberId || !effectiveFlatId || !isCurrentUserAdmin) return;

    const memberId = roleAlert.memberId;
    const newRole =
      roleAlert.currentRole === "pronajimatel" ? "najemce" : "pronajimatel";

    try {
      const { error } = await supabase
        .from("flat_profile")
        .update({ role: newRole })
        .eq("flat_id", effectiveFlatId)
        .eq("profile_id", memberId)
        .eq("active", true);

      if (error) {
        showToast("Nepodařilo se změnit roli: " + error.message, "error");
      } else {
        showToast(
          `Role změněna na ${newRole === "pronajimatel" ? "Pronajímatel" : "Nájemce"}`,
          "success",
        );
        await refreshFlats();
        loadMembers();
      }
    } catch (error: any) {
      showToast("Nepodařilo se změnit roli: " + error.message, "error");
    }
  };

  if (isLoading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (members.length === 0) {
    return <Text className="text-muted-foreground text-sm">Žádní členové</Text>;
  }

  return (
    <View>
      {members.map((member) => {
        const showDeleteButton =
          isCurrentUserAdmin || member.id === currentUserId;

        return (
          <View
            key={member.id}
            className="flex-row items-center py-3 px-3 bg-card border border-border rounded-lg mb-2 gap-3"
          >
            <Avatar
              name={member.name ?? member.username}
              imageUrl={member.avatar_url}
              size="xl"
            />
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {member.name && member.surname
                  ? `${member.name} ${member.surname}`
                  : member.name || member.username || "Neznámý uživatel"}
              </Text>
              <Pressable
                onPress={
                  isCurrentUserAdmin
                    ? () =>
                        setRoleAlert({
                          open: true,
                          memberId: member.id,
                          memberName:
                            member.name && member.surname
                              ? `${member.name} ${member.surname}`
                              : member.name ||
                                member.username ||
                                "Neznámý uživatel",
                          currentRole: member.role,
                        })
                    : undefined
                }
                disabled={!isCurrentUserAdmin}
                className="w-7/12"
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
                    {getRoleLabel(member.role)}
                  </Text>
                </View>
              </Pressable>
            </View>
            {showDeleteButton && showActions && (
              <TouchableOpacity
                onPress={() =>
                  setRemoveAlert({
                    open: true,
                    memberId: member.id,
                    memberName:
                      member.name && member.surname
                        ? `${member.name} ${member.surname}`
                        : member.name || member.username || "Neznámý uživatel",
                  })
                }
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
        );
      })}

      {/* Alert dialog pro odstranění člena */}
      <AlertDialog
        open={removeAlert.open}
        onOpenChange={(open) =>
          setRemoveAlert({ open, memberId: null, memberName: "" })
        }
        title="Odstranit člena"
        description={`Opravdu chcete odstranit ${removeAlert.memberName} z bytu?`}
        cancelText="Zrušit"
        actionText="Odstranit"
        onAction={handleRemoveMember}
        destructive
      />

      {/* Alert dialog pro změnu role */}
      <AlertDialog
        open={roleAlert.open}
        onOpenChange={(open) =>
          setRoleAlert({
            open,
            memberId: null,
            memberName: "",
            currentRole: "",
          })
        }
        title="Změnit roli"
        description={`Opravdu chcete změnit roli člena ${roleAlert.memberName}?`}
        cancelText="Zrušit"
        actionText="Změnit"
        onAction={handleChangeRole}
      />
    </View>
  );
};
