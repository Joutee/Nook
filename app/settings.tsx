import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../utils/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import MembersBottomSheet from "../components/MembersBottomSheet";
import * as Clipboard from "expo-clipboard";
import { useToast } from "../contexts/ToastContext";

const settings = () => {
  const router = useRouter();
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const [flatCode, setFlatCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlatCode = async () => {
      if (currentFlat?.id) {
        const { data, error } = await supabase
          .from("flats")
          .select("code")
          .eq("id", currentFlat.id)
          .single();

        if (!error && data) {
          setFlatCode(data.code);
        }
      }
    };

    fetchFlatCode();
  }, [currentFlat?.id]);

  const handleCopyCode = async () => {
    if (flatCode) {
      await Clipboard.setStringAsync(flatCode);
      showToast("Kód byl zkopírován do schránky", "success");
    }
  };

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
            showToast("Nepodařilo se odhlásit", "error");
          }
        },
      },
    ]);
  };

  const handleOpenMembers = () => {
    setIsMembersModalVisible(true);
  };

  const settingsCategories = [
    {
      title: "Domácnost",
      items: [
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
      ],
    },
    {
      title: "Účet",
      items: [
        {
          id: "logout",
          title: "Odhlásit se",
          icon: "log-out-outline" as const,
          onPress: handleLogout,
        },
      ],
    },
    {
      title: "Aplikace",
      items: [],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Seznam kategorií a položek nastavení */}
      {settingsCategories.map((category, categoryIndex) => (
        <View key={categoryIndex}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          {category.items.length > 0 && (
            <View style={styles.settingsSection}>
              {/* Pokud je to kategorie Domácnost, zobraz nejdřív kód bytu */}
              {category.title === "Domácnost" && flatCode && (
                <TouchableOpacity
                  style={[styles.settingsItem, styles.settingsItemBorder]}
                  onPress={handleCopyCode}
                >
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="key-outline" size={24} color="#333" />
                    <View>
                      <Text style={styles.codeLabel}>Kód pro připojení</Text>
                      <Text style={styles.codeText}>{flatCode}</Text>
                    </View>
                  </View>
                  <Ionicons name="copy-outline" size={20} color="#999" />
                </TouchableOpacity>
              )}

              {category.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingsItem,
                    itemIndex < category.items.length - 1 &&
                      styles.settingsItemBorder,
                  ]}
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
          )}
        </View>
      ))}

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
  categoryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },
  settingsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
  codeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  codeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    letterSpacing: 2,
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
