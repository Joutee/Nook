import { View, ScrollView, Modal, Pressable } from "react-native";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import MembersBottomSheet from "@/components/shared/MembersBottomSheet";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/contexts/ToastContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { AlertDialog } from "@/components/ui/alert-dialog";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PasswordVerification from "@/components/shared/PasswordVerification";
import {
  isBiometricAvailable,
  hasBiometricCredentials,
  saveBiometricCredentials,
  deleteBiometricCredentials,
} from "@/lib/biometricAuth";
import logger from "@/lib/logger";

const Settings = () => {
  const router = useRouter();
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const [flatCode, setFlatCode] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        setCurrentEmail(user.email || "");
      }
    });
  }, []);

  useEffect(() => {
    if (currentEmail) {
      checkBiometric();
    }
  }, [currentEmail]);

  async function checkBiometric() {
    try {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);

      if (available && currentEmail) {
        const hasSaved = await hasBiometricCredentials(currentEmail);
        setBiometricEnabled(hasSaved);
      }
    } catch (error) {
      logger.log("Error checking biometric:", error);
    }
  }

  useEffect(() => {
    const fetchFlatCode = async () => {
      if (currentFlat?.id) {
        const { data, error } = await supabase
          .from("flats")
          .select("code")
          .eq("id", currentFlat.id)
          .single();

        if (!error && data) {
          setFlatCode(data.code);
        }
      }
    };

    fetchFlatCode();
  }, [currentFlat?.id]);

  const handleCopyCode = async () => {
    if (flatCode) {
      await Clipboard.setStringAsync(flatCode);
      showToast("Kód byl zkopírován do schránky", "success");
    }
  };

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
    if (error) {
      showToast("Nepodařilo se odhlásit", "error");
    }
  };

  const handleOpenMembers = () => {
    setIsMembersModalVisible(true);
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      // Enabling biometrics requires password verification.
      setShowPasswordDialog(true);
    } else {
      try {
        await deleteBiometricCredentials(currentEmail);
        setBiometricEnabled(false);
        showToast("Biometrické přihlášení vypnuto", "success");
      } catch (error) {
        showToast("Nepodařilo se vypnout biometrické přihlášení", "error");
      }
    }
  };

  const handleBiometricPasswordVerified = async (password?: string) => {
    if (!password) {
      showToast("Chyba při ověření hesla", "error");
      return;
    }

    try {
      await saveBiometricCredentials(currentEmail, password);
      setBiometricEnabled(true);
      setShowPasswordDialog(false);
      showToast("Biometrické přihlášení zapnuto", "success");
    } catch (error) {
      showToast("Nepodařilo se zapnout biometrické přihlášení", "error");
    }
  };

  const handlePasswordDialogCancel = () => {
    setShowPasswordDialog(false);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-5 gap-6">
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Domácnost
          </Text>

          <Card className="gap-0 py-0">
            {flatCode && (
              <>
                <Button
                  variant="ghost"
                  className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
                  onPress={handleCopyCode}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <Ionicons
                      name="key-outline"
                      size={24}
                      className="text-foreground"
                    />
                    <View className="flex-1">
                      <Text className="text-xs text-muted-foreground mb-1">
                        Kód pro připojení
                      </Text>
                      <Text className="text-lg font-semibold text-primary tracking-widest">
                        {flatCode}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="copy-outline"
                    size={20}
                    className="text-foreground"
                  />
                </Button>
              </>
            )}
            <Separator />

            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={handleOpenMembers}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="people-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Členové bytu</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>

            <Separator />

            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("/flats/join")}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Připojit se k dalšímu bytu</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>

            <Separator />

            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("/flats/create")}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="home-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Vytvořit novou domácnost</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Aplikace
          </Text>

          <Card className="gap-0 py-0">
            <ThemeToggle />
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Bezpečnost
          </Text>

          <Card className="gap-0 py-0">
            {biometricAvailable && (
              <>
                <View className="flex-row justify-between items-center py-4 px-6">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Ionicons
                      name="finger-print-outline"
                      size={24}
                      className="text-foreground"
                    />
                    <View className="flex-1">
                      <Text className="text-base">Biometrické přihlášení</Text>
                      <Text className="text-xs text-muted-foreground">
                        Přihlášení pomocí otisku prstu
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                  />
                </View>
              </>
            )}
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Účet
          </Text>

          <Card className="gap-0 py-0">
            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => currentUserId && router.push(`/profile`)}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Profil</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>

            <Separator />

            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("/settings/change-email")}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="mail-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Změnit e-mail</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>

            <Separator />

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
                <Text className="text-base text-destructive">Odhlásit se</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>
          </Card>
        </View>
      </View>

      <MembersBottomSheet
        visible={isMembersModalVisible}
        onClose={() => setIsMembersModalVisible(false)}
      />

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

      <Modal
        visible={showPasswordDialog}
        transparent
        animationType="fade"
        onRequestClose={handlePasswordDialogCancel}
      >
        <Pressable
          className="flex-1 bg-black/75 items-center justify-center p-4"
          onPress={handlePasswordDialogCancel}
        >
          <Pressable
            className="w-80 max-w-[600px]"
            onPress={(e) => e.stopPropagation()}
          >
            <PasswordVerification
              title="Zapnout biometrické přihlášení"
              description="Pro zapnutí biometrického přihlášení zadejte své aktuální heslo"
              onVerified={handleBiometricPasswordVerified}
              onCancel={handlePasswordDialogCancel}
              returnPassword={true}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

export default Settings;
