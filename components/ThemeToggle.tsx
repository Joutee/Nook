import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  const iconColor =
    colorScheme === "dark" ? "hsl(0, 0%, 98%)" : "hsl(0, 0%, 3.9%)";

  return (
    <Button
      variant="ghost"
      className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none w-full"
      onPress={toggleColorScheme}
    >
      <View className="flex-row items-center gap-3">
        <Ionicons
          name={colorScheme === "dark" ? "moon" : "sunny"}
          size={24}
          color={iconColor}
        />
        <Text className="text-base">
          {colorScheme === "dark" ? "Tmavý režim" : "Světlý režim"}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">

        <Ionicons name="chevron-forward" size={20} color="hsl(0, 0%, 60%)" />
      </View>
    </Button>
  );
}
