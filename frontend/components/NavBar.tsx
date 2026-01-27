import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React from "react";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NavBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Finance", path: "/finance" },
    { name: "Chores", path: "/chores" },
    { name: "Flat", path: "/flat" },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.path}
          style={[
            styles.navItem,
            pathname === item.path && styles.navItemActive,
          ]}
          onPress={() => router.push(item.path as any)}
        >
          <Text
            style={[
              styles.navText,
              pathname === item.path && styles.navTextActive,
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default NavBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  navText: {
    fontSize: 12,
    color: "#666",
  },
  navTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
