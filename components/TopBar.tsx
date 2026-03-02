import React, { useState } from "react";
import { View, TouchableOpacity, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { useRouter, usePathname } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet from "./BottomSheet";

const TopBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentFlat, flats, setCurrentFlat } = useFlatContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleFlatPress = () => {
    if (flats.length > 1) {
      setIsModalVisible(true);
    }
  };

  const handleSelectFlat = (flat: {
    id: string;
    name: string;
    address: string;
  }) => {
    // Pokud už je tento byt vybraný, jen zavři modal
    if (currentFlat?.id === flat.id) {
      setIsModalVisible(false);
      return;
    }

    setCurrentFlat(flat);
    setIsModalVisible(false);
    // Pouze pokud nejsme na domovské stránce, přejdi na ni
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleSettingsPress = () => {
    // Pouze pokud nejsme už v nastavení, přejdi tam
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
        {/* Levá strana - název bytu s možností přepínání */}
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

        {/* Pravá strana - tlačítko nastavení */}
        <TouchableOpacity className="p-1" onPress={handleSettingsPress}>
          <Ionicons
            name="settings-outline"
            size={24}
            className="text-foreground"
          />
        </TouchableOpacity>
      </View>

      {/* BottomSheet pro výběr bytu */}
      <BottomSheet
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Vyberte byt"
      >
        <ScrollView style={{ maxHeight: 400 }}>
          {flats.map((item) => (
            <Pressable
              key={item.id}
              className={`flex-row items-center justify-between bg-secondary rounded-lg p-3 mb-2 mx-4 border ${
                currentFlat?.id === item.id
                  ? "bg-primary/10 border-primary"
                  : "border-border"
              }`}
              onPress={() => handleSelectFlat(item)}
            >
              <View className="flex-row items-center flex-1">
                <Text
                  className="text-sm text-foreground font-medium flex-1"
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
              </View>
              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  currentFlat?.id === item.id
                    ? "border-primary"
                    : "border-muted-foreground"
                }`}
              >
                {currentFlat?.id === item.id && (
                  <View className="w-3 h-3 rounded-full bg-primary" />
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </>
  );
};

export default TopBar;
