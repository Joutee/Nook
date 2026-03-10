import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MemberList, Member } from "@/components/MemberList";
import { AlertDialog } from "@/components/ui/alert-dialog";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useFlatContext } from "../../contexts/FlatContext";
import { useToast } from "../../contexts/ToastContext";

export const FlatMembersWidget = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const { currentFlat, refreshFlats } = useFlatContext();
  const { showToast } = useToast();

  useEffect(() => {
    loadMembers();
  }, [currentFlat]);

  const loadMembers = async () => {
    if (!currentFlat?.id) {
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
          .eq("flat_id", currentFlat.id)
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
            avatar_url
          )
        `,
        )
        .eq("flat_id", currentFlat.id)
        .eq("active", true);

      if (error) {
        console.error("Error loading members:", error);
      } else {
        const formattedMembers = (data || []).map((item: any) => ({
          id: item.profiles.id,
          name: item.profiles.name,
          surname: item.profiles.surname || "",
          avatar_url: item.profiles.avatar_url,
          role: item.role,
        }));
        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentFlat?.id) return;

    try {
      const { data: existing, error: checkError } = await supabase
        .from("flat_profile")
        .select("active")
        .eq("flat_id", currentFlat.id)
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
        .eq("flat_id", currentFlat.id)
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

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      handleRemoveMember(memberToRemove);
      setMemberToRemove(null);
    }
  };

  const handleRemoveMemberClick = (memberId: string) => {
    setMemberToRemove(memberId);
    setShowDeleteDialog(true);
  };

  const handleChangeRole = async (memberId: string, currentRole: string) => {
    if (!currentFlat?.id || !isCurrentUserAdmin) return;

    const newRole = currentRole === "pronajimatel" ? "najemce" : "pronajimatel";

    try {
      const { error } = await supabase
        .from("flat_profile")
        .update({ role: newRole })
        .eq("flat_id", currentFlat.id)
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

  return (
    <Card className="mb-4">
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <CardTitle>Členové bytu</CardTitle>
          <Ionicons name="people-outline" size={24} color="#6366f1" />
        </View>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <View className="py-4">
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <View>
            <MemberList
              members={members}
              showActions={true}
              isAdmin={isCurrentUserAdmin}
              currentUserId={currentUserId}
              onRemoveMember={handleRemoveMemberClick}
              onChangeRole={handleChangeRole}
            />
            {members.length > 0 && (
              <View className="mt-2">
                <Text className="text-xs text-muted-foreground text-right">
                  Klepněte pro detail bytu →
                </Text>
              </View>
            )}
          </View>
        )}
      </CardContent>
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
    </Card>
  );
};
