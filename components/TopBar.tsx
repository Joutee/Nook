import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { Text } from "@/components/ui/text";
import { useRouter, usePathname } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
          <Text
            className="flex-1 text-lg font-semibold text-foreground"
            numberOfLines={1}
          >
            {currentFlat?.name || currentFlat?.address || "Žádný byt"}
          </Text>
          {flats.length > 1 && (
            <Ionicons
              name="chevron-down"
              size={20}
              className="ml-1 text-foreground"
            />
          )}
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

      {/* Modal pro výběr bytu */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onPress={() => setIsModalVisible(false)}
        >
          <View className="bg-card rounded-xl w-[80%] max-h-[60%] overflow-hidden">
            <View className="flex-row justify-between items-center p-4 border-b border-border">
              <Text className="text-lg font-semibold text-foreground">
                Vyberte byt
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="hsl(0, 0%, 20%)" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={flats}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`flex-row justify-between items-center p-4 gap-3 ${
                    currentFlat?.id === item.id ? "bg-muted" : ""
                  }`}
                  onPress={() => handleSelectFlat(item)}
                >
                  <Text
                    className={`flex-1 text-base ${
                      currentFlat?.id === item.id
                        ? "font-semibold text-primary"
                        : "text-foreground"
                    }`}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  {currentFlat?.id === item.id && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="hsl(0, 0%, 9%)"
                    />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default TopBar;
