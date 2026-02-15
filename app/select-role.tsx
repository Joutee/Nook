import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { supabase } from "../utils/supabase";
import { useRouter } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";

export default function SelectRole() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshFlats, currentFlat } = useFlatContext();
  const { showToast } = useToast();

  const handleSelectRole = async (role: "pronajimatel" | "najemce") => {
    if (!currentFlat?.id) {
      showToast("ID bytu není k dispozici", "error");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("Nejste přihlášeni", "error");
        setLoading(false);
        return;
      }

      // Aktualizovat roli v flat_profile
      const { error } = await supabase
        .from("flat_profile")
        .update({ role })
        .eq("flat_id", currentFlat.id)
        .eq("profile_id", user.id);

      if (error) {
        showToast("Nepodařilo se nastavit roli: " + error.message, "error");
        setLoading(false);
        return;
      }

      // Obnovit kontext - layout se postará o přesměrování
      await refreshFlats();
      setLoading(false);

      showToast("Úspěšně jste si vybrali roli!", "success");
    } catch (error: any) {
      showToast("Chyba: " + error.message, "error");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Vyberte svou roli</Text>
        <Text style={styles.description}>Jak se vztahujete k tomuto bytu?</Text>

        <TouchableOpacity
          style={[styles.roleButton, loading && styles.buttonDisabled]}
          onPress={() => handleSelectRole("najemce")}
          disabled={loading}
        >
          <Text style={styles.roleTitle}>🏠 Bydlím zde</Text>
          <Text style={styles.roleDescription}>Jsem nájemce tohoto bytu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleButton, loading && styles.buttonDisabled]}
          onPress={() => handleSelectRole("pronajimatel")}
          disabled={loading}
        >
          <Text style={styles.roleTitle}>🔑 Pronajímám</Text>
          <Text style={styles.roleDescription}>Jsem pronajímatel/majitel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  roleButton: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#007AFF",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 5,
  },
  roleDescription: {
    fontSize: 14,
    color: "#666",
  },
});
