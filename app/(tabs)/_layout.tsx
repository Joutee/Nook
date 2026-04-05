import { Tabs, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFlatContext } from "@/contexts/FlatContext";
import { useColorScheme } from "nativewind";
import { THEME } from "@/lib/theme";
import { useCallback, useState } from "react";
import { getUnreadCount } from "@/lib/chatService";
import { supabase } from "@/lib/supabase";

export default function TabLayout() {
  const { userRole, currentFlat } = useFlatContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const isTenant = userRole !== "pronajimatel";
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!currentFlat?.id) return;
      const load = async () => {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const count = await getUnreadCount(currentFlat.id, data.user.id);
        setUnreadCount(count);
      };
      load();
    }, [currentFlat?.id])
  );

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
          tabBarBadge: !isTenant && unreadCount > 0 ? unreadCount : undefined,
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
          tabBarBadge: isTenant && unreadCount > 0 ? unreadCount : undefined,
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
