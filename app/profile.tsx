import { View, ActivityIndicator, Linking, Pressable } from "react-native";
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
import { takePhoto, pickGalleryPhoto } from "@/lib/fileService";
import { uploadAvatar, deleteAvatar } from "@/lib/avatarService";
import BottomSheet from "@/components/shared/BottomSheet";
import { PhotoPickerTiles } from "@/components/shared/PhotoPickerTiles";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Profile {
  name: string | null;
  surname: string | null;
  email: string | null;
  iban: string | null;
  phone: string | null;
  avatar_url: string | null;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    const prefix = digits.slice(0, 4);
    const rest = digits.slice(4).replace(/(.{3})/g, "$1 ").trim();
    return rest ? `${prefix} ${rest}` : prefix;
  }
  return digits.replace(/(.{3})/g, "$1 ").trim();
}

function formatIban(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

const NAME_REGEX = /^[\p{L}\s'-]+$/u;

function validateName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} nesmí být prázdné`;
  if (!NAME_REGEX.test(trimmed)) return `${label} smí obsahovat pouze písmena`;
  return null;
}

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // phone is optional
  if (!PHONE_REGEX.test(trimmed)) return "Neplatný formát telefonního čísla";
  return null;
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingSurname, setIsEditingSurname] = useState(false);
  const [surnameInput, setSurnameInput] = useState("");
  const [isSavingSurname, setIsSavingSurname] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

      if (ownProfile && user?.id) {
        setCurrentUserId(user.id);
      }

      const { data } = await supabase
        .from("profiles")
        .select("name, surname, iban, phone, avatar_url")
        .eq("id", profileId)
        .single();

      setProfile({
        name: data?.name ?? null,
        surname: data?.surname ?? null,
        email: ownProfile ? (user?.email ?? null) : null,
        iban: data?.iban ?? null,
        phone: data?.phone ?? null,
        avatar_url: data?.avatar_url ?? null,
      });
      setAvatarUrl(data?.avatar_url ?? null);
      setIsLoading(false);
    };

    fetchProfile();
  }, [params.id]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("@current_flat_id");
      const allKeys = await AsyncStorage.getAllKeys();
      const layoutKeys = allKeys.filter((k) => k.startsWith("@dashboard_layout_"));
      if (layoutKeys.length > 0) {
        await AsyncStorage.multiRemove(layoutKeys);
      }
    } catch {
      // Non-critical cleanup, proceed with logout
    }

    const { error } = await supabase.auth.signOut();
    if (error) showToast("Nepodařilo se odhlásit", "error");
  };

  const handleEditIban = () => {
    if (isEditingName) handleCancelName();
    if (isEditingSurname) handleCancelSurname();
    if (isEditingPhone) handleCancelPhone();
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

  const handleEditName = () => {
    if (isEditingSurname) handleCancelSurname();
    if (isEditingIban) handleCancelIban();
    if (isEditingPhone) handleCancelPhone();
    setNameInput(profile?.name ?? "");
    setIsEditingName(true);
  };

  const handleCancelName = () => {
    setIsEditingName(false);
    setNameInput("");
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    const error = validateName(trimmed, "Jméno");
    if (error) {
      showToast(error, "error");
      return;
    }

    setIsSavingName(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSavingName(false);
      showToast("Relace vypršela, přihlaste se znovu", "error");
      return;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ name: trimmed })
      .eq("id", user.id);

    setIsSavingName(false);

    if (dbError) {
      showToast("Nepodařilo se uložit jméno", "error");
    } else {
      setProfile((prev) => (prev ? { ...prev, name: trimmed } : prev));
      setIsEditingName(false);
      showToast("Jméno bylo aktualizováno", "success");
    }
  };

  const handleEditSurname = () => {
    if (isEditingName) handleCancelName();
    if (isEditingIban) handleCancelIban();
    if (isEditingPhone) handleCancelPhone();
    setSurnameInput(profile?.surname ?? "");
    setIsEditingSurname(true);
  };

  const handleCancelSurname = () => {
    setIsEditingSurname(false);
    setSurnameInput("");
  };

  const handleSaveSurname = async () => {
    const trimmed = surnameInput.trim();
    const error = validateName(trimmed, "Příjmení");
    if (error) {
      showToast(error, "error");
      return;
    }

    setIsSavingSurname(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSavingSurname(false);
      showToast("Relace vypršela, přihlaste se znovu", "error");
      return;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ surname: trimmed })
      .eq("id", user.id);

    setIsSavingSurname(false);

    if (dbError) {
      showToast("Nepodařilo se uložit příjmení", "error");
    } else {
      setProfile((prev) => (prev ? { ...prev, surname: trimmed } : prev));
      setIsEditingSurname(false);
      showToast("Příjmení bylo aktualizováno", "success");
    }
  };

  const handleEditPhone = () => {
    if (isEditingName) handleCancelName();
    if (isEditingSurname) handleCancelSurname();
    if (isEditingIban) handleCancelIban();
    setPhoneInput(profile?.phone ?? "");
    setIsEditingPhone(true);
  };

  const handleCancelPhone = () => {
    setIsEditingPhone(false);
    setPhoneInput("");
  };

  const handleSavePhone = async () => {
    const trimmed = phoneInput.trim();
    const error = validatePhone(trimmed);
    if (error) {
      showToast(error, "error");
      return;
    }

    setIsSavingPhone(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSavingPhone(false);
      showToast("Relace vypršela, přihlaste se znovu", "error");
      return;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ phone: trimmed || null })
      .eq("id", user.id);

    setIsSavingPhone(false);

    if (dbError) {
      showToast("Nepodařilo se uložit telefonní číslo", "error");
    } else {
      setProfile((prev) => (prev ? { ...prev, phone: trimmed || null } : prev));
      setIsEditingPhone(false);
      showToast("Telefonní číslo bylo aktualizováno", "success");
    }
  };

  const handleAvatarAction = async (action: "camera" | "gallery" | "delete") => {
    setAvatarSheetVisible(false);

    if (!currentUserId) return;

    if (action === "delete") {
      setIsUploadingAvatar(true);
      try {
        await deleteAvatar(currentUserId, avatarUrl);
        setAvatarUrl(null);
        showToast("Profilová fotka byla smazána", "success");
      } catch {
        showToast("Nepodařilo se smazat fotku", "error");
      } finally {
        setIsUploadingAvatar(false);
      }
      return;
    }

    try {
      const uri =
        action === "camera" ? await takePhoto() : await pickGalleryPhoto();

      if (!uri) return;

      setIsUploadingAvatar(true);
      const publicUrl = await uploadAvatar(currentUserId, uri);
      setAvatarUrl(publicUrl);
      showToast("Profilová fotka byla aktualizována", "success");
    } catch (error: any) {
      showToast(
        error?.message || "Nepodařilo se nahrát fotku",
        "error",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
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
          {isOwnProfile ? (
            <Pressable
              onPress={() => setAvatarSheetVisible(true)}
              disabled={isUploadingAvatar}
            >
              <View>
                {isUploadingAvatar ? (
                  <View className="w-20 h-20 rounded-full bg-primary items-center justify-center">
                    <ActivityIndicator size="large" color="white" />
                  </View>
                ) : (
                  <Avatar
                    name={profile?.name}
                    imageUrl={avatarUrl}
                    size="2xl"
                  />
                )}
                {/* Camera badge */}
                <View className="absolute bottom-0 right-0 bg-primary rounded-full w-7 h-7 items-center justify-center border-2 border-background">
                  <Ionicons name="camera" size={14} color="white" />
                </View>
              </View>
            </Pressable>
          ) : (
            <Avatar
              name={profile?.name}
              imageUrl={avatarUrl}
              size="2xl"
            />
          )}
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
            <View className="py-4 px-6 gap-3">
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="person-outline"
                  size={24}
                  className="text-foreground"
                />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground mb-0.5">
                    Jméno
                  </Text>
                  {!isEditingName && (
                    <Text className="text-base text-foreground">
                      {profile?.name || "—"}
                    </Text>
                  )}
                </View>
                {isOwnProfile && !isEditingName && (
                  <Button variant="ghost" size="icon" onPress={handleEditName}>
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      className="text-muted-foreground"
                    />
                  </Button>
                )}
              </View>

              {isOwnProfile && isEditingName && (
                <View className="gap-2">
                  <Input
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Zadejte jméno"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <View className="flex-row gap-2">
                    <Button
                      className="flex-1"
                      onPress={handleSaveName}
                      disabled={isSavingName}
                    >
                      <Text>Uložit</Text>
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onPress={handleCancelName}
                      disabled={isSavingName}
                    >
                      <Text>Zrušit</Text>
                    </Button>
                  </View>
                </View>
              )}
            </View>

            <Separator />

            <View className="py-4 px-6 gap-3">
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="person-outline"
                  size={24}
                  className="text-foreground"
                />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground mb-0.5">
                    Příjmení
                  </Text>
                  {!isEditingSurname && (
                    <Text className="text-base text-foreground">
                      {profile?.surname || "—"}
                    </Text>
                  )}
                </View>
                {isOwnProfile && !isEditingSurname && (
                  <Button variant="ghost" size="icon" onPress={handleEditSurname}>
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      className="text-muted-foreground"
                    />
                  </Button>
                )}
              </View>

              {isOwnProfile && isEditingSurname && (
                <View className="gap-2">
                  <Input
                    value={surnameInput}
                    onChangeText={setSurnameInput}
                    placeholder="Zadejte příjmení"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveSurname}
                  />
                  <View className="flex-row gap-2">
                    <Button
                      className="flex-1"
                      onPress={handleSaveSurname}
                      disabled={isSavingSurname}
                    >
                      <Text>Uložit</Text>
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onPress={handleCancelSurname}
                      disabled={isSavingSurname}
                    >
                      <Text>Zrušit</Text>
                    </Button>
                  </View>
                </View>
              )}
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

            <Separator />

            <Pressable
              className="py-4 px-6 gap-3"
              onPress={() => {
                if (!isOwnProfile && profile?.phone) {
                  const digits = profile.phone.replace(/[^\d+]/g, "");
                  Linking.openURL(`tel:${digits}`);
                }
              }}
              disabled={isOwnProfile || !profile?.phone}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="call-outline"
                  size={24}
                  className="text-foreground"
                />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground mb-0.5">
                    Telefon
                  </Text>
                  {!isEditingPhone && (
                    <Text className="text-base text-foreground">
                      {profile?.phone ? formatPhone(profile.phone) : "Nenastaveno"}
                    </Text>
                  )}
                </View>
                {isOwnProfile && !isEditingPhone && (
                  <Button variant="ghost" size="icon" onPress={handleEditPhone}>
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      className="text-muted-foreground"
                    />
                  </Button>
                )}
                {!isOwnProfile && profile?.phone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={async () => {
                      await Clipboard.setStringAsync(profile.phone!);
                      showToast("Telefonní číslo zkopírováno do schránky", "success");
                    }}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      className="text-muted-foreground"
                    />
                  </Button>
                )}
              </View>

              {isOwnProfile && isEditingPhone && (
                <View className="gap-2">
                  <Input
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                    placeholder="+420 123 456 789"
                    keyboardType="phone-pad"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSavePhone}
                  />
                  <View className="flex-row gap-2">
                    <Button
                      className="flex-1"
                      onPress={handleSavePhone}
                      disabled={isSavingPhone}
                    >
                      <Text>Uložit</Text>
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onPress={handleCancelPhone}
                      disabled={isSavingPhone}
                    >
                      <Text>Zrušit</Text>
                    </Button>
                  </View>
                </View>
              )}
            </Pressable>
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

      <BottomSheet
        visible={avatarSheetVisible}
        onClose={() => setAvatarSheetVisible(false)}
        title="Profilová fotka"
      >
        <View className="px-5 pb-4 gap-3">
          <PhotoPickerTiles
            onTakePhoto={() => handleAvatarAction("camera")}
            onPickGallery={() => handleAvatarAction("gallery")}
          />

          {avatarUrl && (
            <Button
              variant="destructive"
              onPress={() => handleAvatarAction("delete")}
            >
              <Text>Smazat fotku</Text>
            </Button>
          )}
        </View>
      </BottomSheet>
    </KeyboardAwareScrollView>
  );
};

export default ProfilePage;
