import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { useRouter, usePathname } from "expo-router";
import { useFlatContext } from "@/contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet from "@/components/shared/BottomSheet";
import { FlatsList } from "@/components/flats/FlatsList";
import { Avatar } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";

const TopBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentFlat, flats } = useFlatContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setUserName(data?.name ?? null);
          setUserAvatarUrl(data?.avatar_url ?? null);
        });
    });
  }, []);

  const handleFlatPress = () => {
    if (flats.length > 1) {
      setIsModalVisible(true);
    }
  };

  const handleFlatSelect = () => {
    setIsModalVisible(false);
    if (pathname !== "/home") {
      router.push("/(tabs)/home");
    }
  };

  const handleProfilePress = () => {
    if (pathname !== "/profile") {
      router.push("/profile");
    }
  };

  const handleSettingsPress = () => {
    if (pathname !== "/settings") {
      router.push("/settings");
    }
  };

  return (
    <>
      <View
        className="flex-row items-center justify-between px-4 py-3 bg-card border-b border-border shadow-sm"
        style={{ paddingTop: insets.top + 12 }}
      >
        <TouchableOpacity
          className="flex-1 flex-row items-center pr-4"
          onPress={handleFlatPress}
          disabled={flats.length <= 1}
        >
          {flats.length > 1 && (
            <Ionicons
              name="chevron-expand-outline"
              size={24}
              className="ml-1 text-foreground"
            />
          )}
          <Text
            className="ml-1 flex-1 text-lg font-semibold text-foreground"
            numberOfLines={1}
          >
            {currentFlat?.name || currentFlat?.address || "Žádný byt"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity className="p-1" onPress={handleSettingsPress}>
            <Ionicons
              name="settings-outline"
              size={24}
              className="text-foreground"
            />
          </TouchableOpacity>
          <TouchableOpacity className="p-1" onPress={handleProfilePress}>
            <Avatar name={userName} imageUrl={userAvatarUrl} size="md" />
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheet
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Vyberte byt"
      >
        <ScrollView style={{ maxHeight: 400 }}>
          <View className="mx-4">
            <FlatsList onFlatSelect={handleFlatSelect} />
          </View>
        </ScrollView>
      </BottomSheet>
    </>
  );
};

export default TopBar;
