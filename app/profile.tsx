import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as Clipboard from "expo-clipboard";

interface Profile {
  name: string | null;
  surname: string | null;
  email: string | null;
  iban: string | null;
}

function formatIban(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

const ProfilePage = () => {
  const params = useLocalSearchParams<{ id?: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isEditingIban, setIsEditingIban] = useState(false);
  const [ibanInput, setIbanInput] = useState("");
  const [isSavingIban, setIsSavingIban] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Pokud není ID, použij aktuálního uživatele
      const profileId = params.id || user?.id;
      if (!profileId) {
        setIsLoading(false);
        return;
      }

      const ownProfile = user?.id === profileId;
      setIsOwnProfile(ownProfile);

      const { data } = await supabase
        .from("profiles")
        .select("name, surname, iban")
        .eq("id", profileId)
        .single();

      setProfile({
        name: data?.name ?? null,
        surname: data?.surname ?? null,
        email: ownProfile ? (user?.email ?? null) : null,
        iban: data?.iban ?? null,
      });
      setIsLoading(false);
    };

    fetchProfile();
  }, [params.id]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showToast("Nepodařilo se odhlásit", "error");
  };

  const handleEditIban = () => {
    setIbanInput(profile?.iban ?? "");
    setIsEditingIban(true);
  };

  const handleCancelIban = () => {
    setIsEditingIban(false);
    setIbanInput("");
  };

  const handleSaveIban = async () => {
    const normalized = ibanInput.replace(/\s+/g, "").toUpperCase();

    if (normalized && !/^[A-Z]{2}[0-9A-Z]{2,32}$/.test(normalized)) {
      showToast("Neplatný formát IBAN", "error");
      return;
    }

    setIsSavingIban(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update({ iban: normalized || null })
      .eq("id", user!.id);

    setIsSavingIban(false);

    if (error) {
      showToast("Nepodařilo se uložit IBAN", "error");
    } else {
      setProfile((prev) =>
        prev ? { ...prev, iban: normalized || null } : prev,
      );
      setIsEditingIban(false);
      showToast("IBAN byl uložen", "success");
    }
  };

  const handleCopyIban = async () => {
    if (!profile?.iban) return;
    await Clipboard.setStringAsync(profile.iban);
    showToast("IBAN byl zkopírován do schránky", "success");
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const displayName = profile?.name
    ? profile.surname
      ? `${profile.name} ${profile.surname}`
      : profile.name
    : "Neznámý uživatel";

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 10, paddingTop: 10 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
      className="flex-1"
    >
      <View className="p-5 gap-6">
        {/* Avatar + jméno */}
        <View className="items-center gap-3 pt-4">
          <Avatar name={profile?.name} size="xl" />
          <Text className="text-xl font-bold text-foreground">
            {displayName}
          </Text>
        </View>

        {/* Informace */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Informace
          </Text>
          <Card className="gap-0 py-0">
            <View className="flex-row items-center gap-3 py-4 px-6">
              <Ionicons
                name="person-outline"
                size={24}
                className="text-foreground"
              />
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground mb-0.5">
                  Jméno
                </Text>
                <Text className="text-base text-foreground">
                  {profile?.name || "—"}
                </Text>
              </View>
            </View>

            <Separator />

            <View className="flex-row items-center gap-3 py-4 px-6">
              <Ionicons
                name="person-outline"
                size={24}
                className="text-foreground"
              />
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground mb-0.5">
                  Příjmení
                </Text>
                <Text className="text-base text-foreground">
                  {profile?.surname || "—"}
                </Text>
              </View>
            </View>

            {isOwnProfile && (
              <>
                <Separator />
                <View className="flex-row items-center gap-3 py-4 px-6">
                  <Ionicons
                    name="mail-outline"
                    size={24}
                    className="text-foreground"
                  />
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground mb-0.5">
                      E-mail
                    </Text>
                    <Text className="text-base text-foreground">
                      {profile?.email || "—"}
                    </Text>
                  </View>
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => router.push("/settings/change-email")}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      className="text-muted-foreground"
                    />
                  </Button>
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Platební údaje */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Platební údaje
          </Text>
          <Card className="gap-0 py-0">
            <View className="py-4 px-6 gap-3">
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="card-outline"
                  size={24}
                  className="text-foreground"
                />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground mb-0.5">
                    IBAN
                  </Text>
                  {!isEditingIban && (
                    <Text className="text-base text-foreground font-mono">
                      {profile?.iban ? formatIban(profile.iban) : "Nenastaveno"}
                    </Text>
                  )}
                </View>
                {isOwnProfile && !isEditingIban && (
                  <Button variant="ghost" size="icon" onPress={handleEditIban}>
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      className="text-muted-foreground"
                    />
                  </Button>
                )}
                {!isOwnProfile && profile?.iban && (
                  <Button variant="ghost" size="icon" onPress={handleCopyIban}>
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      className="text-muted-foreground"
                    />
                  </Button>
                )}
              </View>

              {isOwnProfile && isEditingIban && (
                <View className="gap-2">
                  <Input
                    value={ibanInput}
                    onChangeText={(t) => setIbanInput(t.toUpperCase())}
                    placeholder="CZ65 0800 0000 1920 0014 5399"
                    autoCapitalize="characters"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveIban}
                  />
                  <View className="flex-row gap-2">
                    <Button
                      className="flex-1"
                      onPress={handleSaveIban}
                      disabled={isSavingIban}
                    >
                      <Text>Uložit</Text>
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onPress={handleCancelIban}
                      disabled={isSavingIban}
                    >
                      <Text>Zrušit</Text>
                    </Button>
                  </View>
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* Účet — pouze vlastní profil */}
        {isOwnProfile && (
          <View className="gap-2">
            <Card className="gap-0 py-0">
              <Button
                variant="ghost"
                className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
                onPress={() => setLogoutDialogOpen(true)}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons
                    name="log-out-outline"
                    size={24}
                    className="text-destructive"
                  />
                  <Text className="text-base text-destructive">
                    Odhlásit se
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  className="text-foreground"
                />
              </Button>
            </Card>
          </View>
        )}
      </View>

      <AlertDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="Odhlášení"
        description="Opravdu se chcete odhlásit?"
        cancelText="Zrušit"
        actionText="Odhlásit"
        onAction={handleLogout}
        destructive
      />
    </KeyboardAwareScrollView>
  );
};

export default ProfilePage;
