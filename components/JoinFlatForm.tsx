import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "../utils/supabase";
import { useRouter } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";

interface JoinFlatFormProps {
  showCreateOption?: boolean;
  onSuccess?: () => void;
}

export default function JoinFlatForm({
  showCreateOption = true,
  onSuccess,
}: JoinFlatFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshFlats, setCurrentFlat } = useFlatContext();
  const { showToast } = useToast();

  const handleJoinFlat = async () => {
    if (!code.trim()) {
      Alert.alert("Chyba", "Zadejte kód bytu");
      return;
    }

    setLoading(true);

    try {
      // Najít byt podle kódu
      const { data: flat, error: flatError } = await supabase
        .from("flats")
        .select("id")
        .eq("code", code.trim())
        .single();

      if (flatError || !flat) {
        Alert.alert("Chyba", "Byt s tímto kódem neexistuje");
        setLoading(false);
        return;
      }

      // Získat aktuálního uživatele
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Chyba", "Nejste přihlášeni");
        setLoading(false);
        return;
      }

      // Zkontrolovat, jestli uživatel už není v tomto bytě
      const { data: existingMembership } = await supabase
        .from("flat_profile")
        .select("id")
        .eq("flat_id", flat.id)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (existingMembership) {
        Alert.alert("Info", "Už jste členem tohoto bytu");
        setLoading(false);
        return;
      }

      // Přidat uživatele do bytu (flat_profile)
      const { error: joinError } = await supabase.from("flat_profile").insert({
        flat_id: flat.id,
        profile_id: user.id,
        role: null, // Nastaví se na další obrazovce
      });

      if (joinError) {
        Alert.alert(
          "Chyba",
          "Nepodařilo se přidat do bytu: " + joinError.message,
        );
        setLoading(false);
        return;
      }

      // Načíst kompletní info o bytu a nastavit jako currentFlat
      const { data: flatData, error: flatDataError } = await supabase
        .from("flats")
        .select("id, name, address")
        .eq("id", flat.id)
        .single();

      if (!flatDataError && flatData) {
        setCurrentFlat(flatData);
      }

      // Obnovit kontext - layout se postará o přesměrování
      await refreshFlats();
      setLoading(false);
      showToast("Úspěšně jste se připojili k bytu!", "success");
    } catch (error: any) {
      showToast(error.message, "error");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Připojit se k bytu</Text>
        <Text style={styles.description}>
          Zadejte kód bytu, ke kterému se chcete připojit
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Kód bytu"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleJoinFlat}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Připojování..." : "Připojit se"}
          </Text>
        </TouchableOpacity>

        {showCreateOption && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>nebo</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/create-flat")}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>
                Vytvořit novou domácnost
              </Text>
            </TouchableOpacity>
          </>
        )}
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
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#666",
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
