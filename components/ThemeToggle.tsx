import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "@theme_mode";

export function ThemeToggle() {
  const { setColorScheme } = useColorScheme();
  
  // Vlastní stav pro sledování vybrané volby
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");

  // Načíst uložené nastavení při startu
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
          setThemeMode(savedTheme);
          setColorScheme(savedTheme);
        }
      } catch (error) {
        console.error("Chyba při načítání tématu:", error);
      }
    };
    loadTheme();
  }, []);

  const handleThemeChange = async () => {
    let newMode: "light" | "dark" | "system";
    
    if (themeMode === "system") {
      newMode = "light";
    } else if (themeMode === "light") {
      newMode = "dark";
    } else {
      newMode = "system";
    }
    
    setThemeMode(newMode);
    setColorScheme(newMode);
    
    // Uložit nastavení
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error("Chyba při ukládání tématu:", error);
    }
  };

  const getThemeIcon = () => {
    if (themeMode === "dark") return "moon";
    if (themeMode === "light") return "sunny";
    return "phone-portrait-outline";
  };

  const getThemeText = () => {
    if (themeMode === "dark") return "Tmavý režim";
    if (themeMode === "light") return "Světlý režim";
    return "Systémový motiv";
  };

  return (
    <Button
      variant="ghost"
      className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none w-full"
      onPress={handleThemeChange}
    >
      <View className="flex-row items-center gap-3">
        {/* Přetypování as any pro případ, že TypeScript nezná přesný název ikony */}
        <Ionicons
          name={getThemeIcon() as any} 
          size={24}
          className="text-foreground"
        />
        <Text className="text-base">
          {getThemeText()}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Ionicons name="chevron-forward" size={20} className="text-muted-foreground" />
      </View>
    </Button>
  );
}