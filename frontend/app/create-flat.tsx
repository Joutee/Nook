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

export default function CreateFlat() {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshFlats } = useFlatContext();

  const generateCode = () => {
    // Generovat 6-místný náhodný kód
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateUniqueCode = async (): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = generateCode();

      // Zkontrolovat, jestli kód už existuje
      const { data, error } = await supabase
        .from("flats")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      // Pokud neexistuje (data je null), kód je unikátní
      if (!data && !error) {
        return code;
      }

      attempts++;
    }

    // Fallback - použít timestamp + random
    return `${Date.now().toString(36).substring(-4)}${Math.random().toString(36).substring(2, 4)}`.toUpperCase();
  };

  const handleCreateFlat = async () => {
    if (!address.trim()) {
      Alert.alert("Chyba", "Zadejte adresu bytu");
      return;
    }

    setLoading(true);

    try {
      // Získat aktuálního uživatele
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Chyba", "Nejste přihlášeni");
        setLoading(false);
        return;
      }

      // Vytvořit nový byt s vygenerovaným unikátním kódem
      const code = await generateUniqueCode();

      const { error: flatError } = await supabase.from("flats").insert({
        code: code,
        address: address.trim(),
        name: name.trim(),
      });

      if (flatError) {
        Alert.alert(
          "Chyba",
          "Nepodařilo se vytvořit byt: " + flatError?.message,
        );
        setLoading(false);
        return;
      }

      // Najít právě vytvořený byt podle kodu (fallback)
      const { data: createdFlat, error: findError } = await supabase
        .from("flats")
        .select("id")
        .eq("code", code)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (findError || !createdFlat) {
        Alert.alert("Chyba", "Nepodařilo se najít vytvořený byt");
        setLoading(false);
        return;
      }

      // Přidat uživatele do bytu
      const { error: joinError } = await supabase.from("flat_profile").insert({
        flat_id: createdFlat.id,
        profile_id: user.id,
        role: null,
      });

      if (joinError) {
        Alert.alert(
          "Chyba",
          "Byt byl vytvořen, ale nepodařilo se vás přidat: " +
            joinError.message,
        );
        setLoading(false);
        return;
      }

      // Obnovit kontext - layout se postará o přesměrování
      await refreshFlats();

      Alert.alert(
        "Úspěch",
        `Byt byl vytvořen!\n\nKód pro připojení: ${code}\n\nTento kód můžete sdílet s ostatními, aby se mohli připojit k bytu.`,
      );

      setLoading(false);
    } catch (error: any) {
      Alert.alert("Chyba", error.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Vytvořit novou domácnost</Text>
        <Text style={styles.description}>
          Zadejte adresu bytu. Po vytvoření obdržíte kód, který můžete sdílet s
          ostatními.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Adresa bytu (např. Vodičkova 12, Praha)"
          value={address}
          onChangeText={setAddress}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Název bytu (volitelné)"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateFlat}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Vytváření..." : "Vytvořit domácnost"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Zpět</Text>
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
    minHeight: 50,
  },
  button: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    padding: 15,
    alignItems: "center",
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
});
