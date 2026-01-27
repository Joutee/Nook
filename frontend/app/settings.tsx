import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { supabase } from "../utils/supabase";

const settings = () => {
  const router = useRouter();

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
          } else {
            router.replace("/login");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nastavení</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Odhlásit se</Text>
      </TouchableOpacity>
    </View>
  );
};

export default settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
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
