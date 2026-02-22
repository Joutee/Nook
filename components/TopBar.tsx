import React, { useState, Fragment } from "react";
import { View, TouchableOpacity,  } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
        <View className="px-2">
          {flats.map((item, index) => (
            <Fragment key={item.id}>
              <Button
                variant="ghost"
                className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
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
                    className="text-primary"
                  />
                )}
              </Button>
              {index < flats.length - 1 && <Separator />}
            </Fragment>
          ))}
        </View>
      </BottomSheet>
    </>
  );
};

export default TopBar;
