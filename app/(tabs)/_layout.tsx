import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFlatContext } from "@/contexts/FlatContext";
import { useColorScheme } from "nativewind";
import { THEME } from "@/lib/theme";

export default function TabLayout() {
  const { userRole } = useFlatContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const isTenant = userRole !== "pronajimatel";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.light.primary,
        tabBarInactiveTintColor: isDark
          ? THEME.dark.mutedForeground
          : THEME.light.mutedForeground,
        tabBarStyle: {
          backgroundColor: isDark ? THEME.dark.card : THEME.light.card,
          borderTopColor: isDark ? THEME.dark.border : THEME.light.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {/* Domů - zobrazit všem */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Domů",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Finance - pouze pro nájemníky */}
      <Tabs.Screen
        name="finance"
        options={{
          title: "Finance",
          href: isTenant ? "/(tabs)/finance" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "wallet" : "wallet-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Úkoly - pouze pro nájemníky */}
      <Tabs.Screen
        name="chores"
        options={{
          title: "Úkoly",
          href: isTenant ? "/(tabs)/chores" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "reader" : "reader-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Závady - pouze pro pronajímatele */}
      <Tabs.Screen
        name="issues"
        options={{
          title: "Závady",
          href: !isTenant ? "/(tabs)/issues" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "warning" : "warning-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Chat - pouze pro pronajímatele jako tab */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          href: !isTenant ? "/(tabs)/chat" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Klíče - skrytý tab (přesunuto do Další pro pronajímatele) */}
      <Tabs.Screen
        name="keys"
        options={{
          href: null,
        }}
      />

      {/* Dokumenty - skrytý tab (přesunuto do Další pro pronajímatele) */}
      <Tabs.Screen
        name="documents"
        options={{
          href: null,
        }}
      />

      {/* Další - zobrazit všem */}
      <Tabs.Screen
        name="more"
        options={{
          title: "Další",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "menu" : "menu-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
