import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { MemberSelectorSheet } from "@/components/shared/MemberSelectorSheet";
import React, { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { KeyWithAssignee } from "@/types/keys";
import { Member } from "@/types/members";
import { Avatar } from "@/components/ui/avatar";
import logger from "@/lib/logger";
import { useFlatHasLandlord } from "@/hooks/useFlatHasLandlord";

const Keys = () => {
  const { currentFlat, userRole } = useFlatContext();
  const { showToast } = useToast();
  const { hasLandlord, isLoading: landlordLoading } = useFlatHasLandlord();

  const [keys, setKeys] = useState<KeyWithAssignee[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [assigningKey, setAssigningKey] = useState<KeyWithAssignee | null>(
    null,
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<KeyWithAssignee | null>(null);

  const isLandlord = userRole === "pronajimatel";

  const loadKeys = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("keys")
        .select(
          "*, assignee:profiles!assigned_to(id, name, surname, avatar_url)",
        )
        .eq("flat_id", currentFlat.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setKeys((data as KeyWithAssignee[]) || []);
    } catch (error: any) {
      showToast("Chyba při načítání klíčů", "error");
      logger.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!currentFlat?.id) return;

    try {
      const { data, error } = await supabase
        .from("flat_profile")
        .select("profile_id, role, profiles(id, name, surname, avatar_url)")
        .eq("flat_id", currentFlat.id)
        .eq("active", true);

      if (error) throw error;

      const memberList: Member[] = (data || []).map((fp: any) => ({
        id: fp.profiles.id,
        name: fp.profiles.name,
        surname: fp.profiles.surname,
        avatar_url: fp.profiles.avatar_url,
        role: fp.role,
      }));

      setMembers(memberList);
    } catch (error: any) {
      logger.error("Chyba při načítání členů:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadKeys();
        if (isLandlord) loadMembers();
      }
    }, [currentFlat]),
  );

  const openAssignSheet = (key: KeyWithAssignee) => {
    setAssigningKey(key);
  };

  const closeAssignSheet = () => {
    setAssigningKey(null);
  };

  const handleMemberToggle = async (member: Member) => {
    if (!assigningKey) return;

    const isCurrentlyAssigned = assigningKey.assigned_to === member.id;
    const newAssignedTo = isCurrentlyAssigned ? null : member.id;

    try {
      const { error } = await supabase
        .from("keys")
        .update({ assigned_to: newAssignedTo })
        .eq("id", assigningKey.id);

      if (error) throw error;

      showToast(
        newAssignedTo ? "Klíč přiřazen" : "Přiřazení odebráno",
        "success",
      );
      closeAssignSheet();
      loadKeys();
    } catch (error: any) {
      showToast("Chyba: " + error.message, "error");
      logger.error(error);
    }
  };

  const handleDeleteKey = (key: KeyWithAssignee) => {
    setKeyToDelete(key);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!keyToDelete) return;

    try {
      const { error } = await supabase
        .from("keys")
        .delete()
        .eq("id", keyToDelete.id);

      if (error) throw error;

      showToast("Klíč smazán", "success");
      loadKeys();
    } catch (error: any) {
      showToast("Chyba při mazání: " + error.message, "error");
      logger.error(error);
    }
  };

  const renderKey = (item: KeyWithAssignee) => (
    <Card key={item.id} className="mb-3 py-4">
      <CardContent className="flex-row items-center px-4 gap-4">
        <Ionicons name="key-outline" size={24} className="text-foreground" />

        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {item.name}
          </Text>
          {item.description ? (
            <Text
              className="text-xs text-muted-foreground mt-0.5"
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}

          <View className="flex-row items-center gap-1.5 mt-1.5">
            {item.assignee ? (
              <>
                <Avatar name={item.assignee.name} imageUrl={item.assignee.avatar_url} size="sm" />
                <Text className="text-xs flex-1 text-foreground">
                  {item.assignee.name} {item.assignee.surname}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="person-outline"
                  size={14}
                  className="text-muted-foreground"
                />
                <Text className="text-xs text-muted-foreground italic">
                  Nepřiřazen
                </Text>
              </>
            )}
          </View>
        </View>

        {isLandlord && (
          <View className="flex-row gap-1">
            <Pressable
              className="w-10 h-10 items-center justify-center"
              onPress={() => openAssignSheet(item)}
            >
              <Ionicons
                name="person-add-outline"
                size={22}
                className="text-foreground"
              />
            </Pressable>

            <Pressable
              className="w-10 h-10 items-center justify-center"
              onPress={() => router.push(`/keys/${item.id}/edit`)}
            >
              <Ionicons
                name="create-outline"
                size={22}
                className="text-foreground"
              />
            </Pressable>

            <Pressable
              className="w-10 h-10 items-center justify-center"
              onPress={() => handleDeleteKey(item)}
            >
              <Ionicons
                name="trash-outline"
                size={22}
                className="text-destructive"
              />
            </Pressable>
          </View>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  if (!landlordLoading && !hasLandlord) {
    return (
      <View className="flex-1 bg-background">
        <ScrollView className="flex-1 p-4">
          <Text className="text-3xl font-bold text-foreground mb-4">Klíče</Text>
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons
              name="key-outline"
              size={64}
              className="text-muted-foreground"
            />
            <Text className="text-lg font-semibold text-foreground mt-4 text-center">
              V domácnosti chybí pronajímatel
            </Text>
            <Text className="text-sm text-muted-foreground mt-2 text-center px-8">
              Pro používání této funkce musí být v domácnosti alespoň jeden
              pronajímatel.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <Text className="text-3xl font-bold text-foreground mb-4">Klíče</Text>

        {keys.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons
              name="key-outline"
              size={64}
              className="text-muted-foreground"
            />
            <Text className="text-base text-muted-foreground mt-4 text-center w-full">
              {isLandlord
                ? "Zatím žádné klíče.\nPřidejte první klíč pomocí tlačítka +"
                : "Zatím žádné klíče"}
            </Text>
          </View>
        ) : (
          <>{keys.map(renderKey)}</>
        )}
      </ScrollView>

      {isLandlord && (
        <Pressable
          className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
          onPress={() => router.push("/keys/create")}
        >
          <Ionicons name="add" size={28} className="text-primary-foreground" />
        </Pressable>
      )}

      <MemberSelectorSheet
        visible={!!assigningKey}
        onClose={closeAssignSheet}
        members={members}
        selectedMembers={
          assigningKey?.assigned_to
            ? members.filter((m) => m.id === assigningKey.assigned_to)
            : []
        }
        onToggleMember={handleMemberToggle}
        multiSelect={false}
        title={`Přiřadit: ${assigningKey?.name ?? ""}`}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Smazat klíč"
        description={`Opravdu chcete smazat klíč "${keyToDelete?.name}"?`}
        actionText="Smazat"
        onAction={confirmDelete}
        destructive
      />
    </View>
  );
};

export default Keys;
