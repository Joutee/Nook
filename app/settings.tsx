import { View, Alert, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import MembersBottomSheet from "../components/MembersBottomSheet";
import * as Clipboard from "expo-clipboard";
import { useToast } from "../contexts/ToastContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { Separator } from "@/components/ui/separator";

const settings = () => {
  const router = useRouter();
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const [flatCode, setFlatCode] = useState<string | null>(null);

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
    Alert.alert("Odhlášení", "Opravdu se chcete odhlásit?", [
      {
        text: "Zrušit",
        style: "cancel",
      },
      {
        text: "Odhlásit",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            showToast("Nepodařilo se odhlásit", "error");
          }
        },
      },
    ]);
  };

  const handleOpenMembers = () => {
    setIsMembersModalVisible(true);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-5 gap-6">
        {/* Domácnost */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Domácnost
          </Text>

          <Card className="gap-0 py-0">
            {/* Kód bytu */}
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

            {/* Členové bytu */}
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

            {/* Připojit se k dalšímu bytu */}
            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("/join-another-flat")}
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

            {/* Vytvořit novou domácnost */}
            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("/create-another-flat")}
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

        {/* Aplikace */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Aplikace
          </Text>

          <Card className="gap-0 py-0">
            <ThemeToggle />
          </Card>
        </View>

        {/* Účet */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Účet
          </Text>

          <Card className="gap-0 py-0">
            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={handleLogout}
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

      {/* Bottom Sheet pro členy bytu */}
      <MembersBottomSheet
        visible={isMembersModalVisible}
        onClose={() => setIsMembersModalVisible(false)}
        flatId={currentFlat?.id || null}
      />
    </ScrollView>
  );
};

export default settings;
