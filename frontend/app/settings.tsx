import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import MembersBottomSheet from "../components/MembersBottomSheet";

const settings = () => {
  const router = useRouter();
  const { currentFlat } = useFlatContext();
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);

  const handleLogout = async () => {
    Alert.alert("Odhlášení", "Opravdu se chcete odhlásit?", [
      {
        text: "Zrušit",
        style: "cancel",
      },
      {
        text: "Odhlásit",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert("Chyba", "Nepodařilo se odhlásit");
          }
        },
      },
    ]);
  };

  const handleOpenMembers = () => {
    setIsMembersModalVisible(true);
  };

  const settingsItems = [
    {
      id: "members",
      title: "Členové bytu",
      icon: "people-outline" as const,
      onPress: handleOpenMembers,
    },
    {
      id: "join-flat",
      title: "Připojit se k dalšímu bytu",
      icon: "add-circle-outline" as const,
      onPress: () => router.push("/join-another-flat"),
    },
    {
      id: "create-flat",
      title: "Vytvořit novou domácnost",
      icon: "home-outline" as const,
      onPress: () => router.push("/create-another-flat"),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nastavení</Text>

      {/* Seznam položek nastavení */}
      <View style={styles.settingsSection}>
        {settingsItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.settingsItem}
            onPress={item.onPress}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name={item.icon} size={24} color="#333" />
              <Text style={styles.settingsItemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Odhlásit se</Text>
      </TouchableOpacity>

      {/* Bottom Sheet pro členy bytu */}
      <MembersBottomSheet
        visible={isMembersModalVisible}
        onClose={() => setIsMembersModalVisible(false)}
        flatId={currentFlat?.id || null}
      />
    </View>
  );
};

export default settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  settingsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsItemText: {
    fontSize: 16,
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#ff3b30",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: "auto",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
