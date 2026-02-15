import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { supabase } from "../utils/supabase";
import { useRouter } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { useToast } from "../contexts/ToastContext";
import CodeModal from "./CodeModal";

interface CreateFlatFormProps {
  showBackButton?: boolean;
  onSuccess?: () => void;
}

export default function CreateFlatForm({
  showBackButton = true,
  onSuccess,
}: CreateFlatFormProps) {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const modalResolveRef = React.useRef<(() => void) | null>(null);
  const router = useRouter();
  const { refreshFlats, setCurrentFlat } = useFlatContext();
  const { showToast } = useToast();

  const generateCode = () => {
    // Generovat 6-místný náhodný kód
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const waitForModalClose = (): Promise<void> => {
    return new Promise((resolve) => {
      modalResolveRef.current = resolve;
    });
  };

  const handleModalClose = () => {
    setShowCodeModal(false);
    if (modalResolveRef.current) {
      modalResolveRef.current();
      modalResolveRef.current = null;
    }
    if (onSuccess) {
      onSuccess();
    }
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
      showToast("Zadejte adresu bytu", "error");
      return;
    }

    setLoading(true);

    try {
      // Získat aktuálního uživatele
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("Nejste přihlášeni", "error");
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
        showToast("Nepodařilo se vytvořit byt: " + flatError?.message, "error");
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
        showToast("Nepodařilo se najít vytvořený byt", "error");
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
        showToast(
          "Byt byl vytvořen, ale nepodařilo se vás přidat: " +
            joinError.message,
          "error",
        );
        setLoading(false);
        return;
      }

      // Načíst kompletní info o bytu a nastavit jako currentFlat
      const { data: flatData, error: flatDataError } = await supabase
        .from("flats")
        .select("id, name, address")
        .eq("id", createdFlat.id)
        .single();

      // Zobrazit modal s kódem a počkat na jeho zavření
      setGeneratedCode(code);
      setShowCodeModal(true);
      await waitForModalClose();

      // Teprve po zavření modalu pokračovat s aktualizací kontextu
      if (!flatDataError && flatData) {
        setCurrentFlat(flatData);
      }
      await refreshFlats();
      setLoading(false);
    } catch (error: any) {
      showToast(error.message, "error");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CodeModal
        visible={showCodeModal}
        code={generatedCode}
        onClose={handleModalClose}
      />
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

        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Zpět</Text>
          </TouchableOpacity>
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
