import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { THEME } from "@/lib/theme";

export default function AuthLayout() {
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
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Zapomenuté heslo",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="verify-email"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: "Obnovení hesla",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
