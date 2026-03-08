import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { THEME } from "@/lib/theme";

export default function SetupLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const currentTheme = THEME[isDark ? "dark" : "light"];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: currentTheme.card,
        },
        headerTintColor: currentTheme.foreground,
        headerTitleStyle: {
          fontWeight: "bold",
          color: currentTheme.foreground,
        },
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen
        name="join-flat"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-flat"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="select-role"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
