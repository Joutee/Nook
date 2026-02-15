import { View } from "react-native";
import { Text } from "@/components/ui/text";
import React from "react";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFlatContext } from "../contexts/FlatContext";
import { Button } from "@/components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

const NavBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { userRole } = useFlatContext();

  // Definice navigačních položek s ikonami
  const tenantNavItems = [
    {
      name: "Home",
      path: "/",
      icon: "home" as const,
      iconOutline: "home-outline" as const,
    },
    {
      name: "Finance",
      path: "/finance",
      icon: "wallet" as const,
      iconOutline: "wallet-outline" as const,
    },
    {
      name: "Chores",
      path: "/chores",
      icon: "list" as const,
      iconOutline: "list-outline" as const,
    },
    {
      name: "Flat",
      path: "/flat",
      icon: "business" as const,
      iconOutline: "business-outline" as const,
    },
  ];

  const landlordNavItems = [
    {
      name: "Home",
      path: "/",
      icon: "home" as const,
      iconOutline: "home-outline" as const,
    },
    {
      name: "Issues",
      path: "/issues",
      icon: "alert-circle" as const,
      iconOutline: "alert-circle-outline" as const,
    },
    {
      name: "Keys",
      path: "/keys",
      icon: "key" as const,
      iconOutline: "key-outline" as const,
    },
    {
      name: "Documents",
      path: "/documents",
      icon: "document" as const,
      iconOutline: "document-outline" as const,
    },
  ];

  const navItems =
    userRole === "pronajimatel" ? landlordNavItems : tenantNavItems;

  return (
    <View
      className="flex-row justify-around items-center bg-card border-t border-border px-1"
      style={{ paddingBottom: insets.bottom + 10, paddingTop: 10 }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Button
            key={item.path}
            variant="ghost"
            size="icon"
            className={`flex-1 flex-col h-auto py-1 `}
            onPress={() => {
              if (pathname !== item.path) {
                router.push(item.path as any);
              }
            }}
          >
            <Ionicons
              name={isActive ? item.icon : item.iconOutline}
              size={22}
              className={isActive ? "text-primary" : "text-muted-foreground"}
            />
            <Text
              className={`text-xs ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}
            >
              {item.name}
            </Text>
          </Button>
        );
      })}
    </View>
  );
};

export default NavBar;
