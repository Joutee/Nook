import {
  View,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
} from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { useFlatContext } from "@/contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import DocumentViewerModal from "@/components/documents/DocumentViewerModal";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Issue } from "@/types/issues";
import { Profile } from "@/types/profile";
import { getStatusColor, getStatusText } from "@/lib/issueUtils";
import logger from "@/lib/logger";

const IssueDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const { userRole } = useFlatContext();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isDeletedRef = useRef(false);

  const loadIssueData = useCallback(async () => {
    if (!id || isDeletedRef.current) return;

    setIsLoading(true);

    try {
      const { data: issueData, error: issueError } = await supabase
        .from("issues")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (issueError) {
        throw issueError;
      }

      if (!issueData) {
        showToast("Závada nebyla nalezena", "error");
        router.replace("/(tabs)/issues");
        return;
      }
      setIssue(issueData);

      if (issueData.profile_id) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, surname, avatar_url")
          .eq("id", issueData.profile_id)
          .single();

        if (profileError) {
          logger.error("Chyba při načítání profilu:", profileError);
        } else {
          setProfile(profileData);
        }
      }
    } catch (error: any) {
      showToast("Chyba při načítání závady: " + error.message, "error");
      logger.error(error);
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useFocusEffect(
    useCallback(() => {
      loadIssueData();
    }, [loadIssueData]),
  );

  useEffect(() => {
    if (!issue?.image_path) {
      setImageUri(null);
      return;
    }

    let isMounted = true;

    const fetchSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("issue-images")
          .createSignedUrl(issue.image_path!, 3600);

        if (error) {
          logger.error("Chyba signed URL:", error);
          return;
        }

        if (isMounted && data?.signedUrl) {
          setImageUri(data.signedUrl);
        }
      } catch (error) {
        logger.error("Chyba fetch obrázku:", error);
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [issue?.image_path]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleChangeStatus = async () => {
    if (!issue) return;

    const statusCycle: { [key: string]: string } = {
      new: "in_progress",
      in_progress: "resolved",
      resolved: "cancelled",
      cancelled: "new",
    };

    const newStatus = statusCycle[issue.status] || "new";
    await updateStatus(newStatus);
  };

  const updateStatus = async (newStatus: string) => {
    if (!issue || !id) return;

    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("issues")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setIssue({ ...issue, status: newStatus });
      showToast("Stav závady byl změněn", "success");
    } catch (error: any) {
      showToast("Chyba při změně stavu: " + error.message, "error");
      logger.error(error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteIssue = () => {
    setDeleteDialogOpen(true);
  };

  const deleteIssue = async () => {
    if (!issue || !id) return;

    setIsDeleting(true);
    try {
      if (issue.image_path) {
        const { error: storageError } = await supabase.storage
          .from("issue-images")
          .remove([issue.image_path]);

        if (storageError) {
          logger.error("Chyba při mazání obrázku:", storageError);
        }
      }

      const { error } = await supabase.from("issues").delete().eq("id", id);

      if (error) throw error;
      isDeletedRef.current = true;
      showToast("Závada byla smazána", "success");
      router.replace("/issues");
    } catch (error: any) {
      showToast("Chyba při mazání závady: " + error.message, "error");
      logger.error(error);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  if (!issue) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-base text-muted-foreground mb-5">
          Závada nebyla nalezena
        </Text>
        <Button onPress={() => router.back()}>
          <Text className="text-primary-foreground font-semibold">Zpět</Text>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-5">
        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-3xl font-bold text-foreground flex-1 mr-3">
            {issue.title}
          </Text>
          <View
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: getStatusColor(issue.status) }}
          >
            <Text className="text-white text-sm font-semibold">
              {getStatusText(issue.status)}
            </Text>
          </View>
        </View>

        {imageUri && (
          <Pressable
            onPress={() => setViewerVisible(true)}
            className="mb-6 rounded-xl overflow-hidden"
          >
            <Image
              source={{ uri: imageUri }}
              className="w-full h-72 bg-muted"
            />
          </Pressable>
        )}

        {issue.description && (
          <Card className="mb-4">
            <CardContent className="px-4">
              <Text className="text-base font-semibold text-foreground mb-2">
                Popis:
              </Text>
              <Text className="text-base text-muted-foreground leading-6">
                {issue.description}
              </Text>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4">
          <CardContent className="px-4">
            <Text className="text-base font-semibold text-foreground mb-3">
              Informace
            </Text>

            <View className="flex-row items-center mb-3">
              <Ionicons
                name="calendar-outline"
                size={20}
                className="text-muted-foreground"
              />
              <View className="ml-3 flex-1">
                <Text className="text-xs text-muted-foreground mb-0.5">
                  Vytvořena
                </Text>
                <Text className="text-base text-foreground font-medium">
                  {formatDate(issue.created_at)}
                </Text>
              </View>
            </View>

            {profile && (
              <View className="flex-row items-center">
                <Ionicons
                  name="person-outline"
                  size={20}
                  className="text-muted-foreground"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-muted-foreground mb-0.5">
                    Nahlásil
                  </Text>
                  <Text className="text-base text-foreground font-medium">
                    {profile.name} {profile.surname}
                  </Text>
                </View>
              </View>
            )}
          </CardContent>
        </Card>

        {userRole === "najemce" && issue.status === "new" && (
          <View className="gap-3 mt-2">
            <Button
              onPress={() => router.push(`/issues/${issue.id}/edit`)}
              disabled={isDeleting}
              className="w-full"
            >
              <Text>Upravit závadu</Text>
            </Button>

            <Button
              variant="destructive"
              onPress={handleDeleteIssue}
              disabled={isDeleting}
              className="w-full"
            >
              {isDeleting ? (
                <ActivityIndicator className="text-primary" />
              ) : (
                <Text>Smazat závadu</Text>
              )}
            </Button>
          </View>
        )}

        {userRole === "pronajimatel" && (
          <Button
            onPress={handleChangeStatus}
            disabled={isUpdatingStatus}
            className="w-full mt-2"
          >
            {isUpdatingStatus ? (
              <ActivityIndicator className="text-primary" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="swap-horizontal"
                  size={18}
                  className="text-primary-foreground"
                />
                <Text className="text-base font-semibold text-primary-foreground">
                  Změnit stav
                </Text>
              </View>
            )}
          </Button>
        )}
      </View>

      <DocumentViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        imageUri={imageUri}
        fileName={issue.title}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Smazat závadu"
        description="Opravdu chcete smazat tuto závadu? Tato akce je nevratná."
        actionText="Smazat"
        onAction={deleteIssue}
        destructive
      />
    </ScrollView>
  );
};

export default IssueDetail;
