import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import CodeModal from "@/components/keys/CodeModal";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as Crypto from "expo-crypto";

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
    const bytes = Crypto.getRandomBytes(6);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
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

    // Fallback - použít kryptograficky bezpečný generátor
    return generateCode();
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
        active: true,
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
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20} // O kolik výš nad klávesnici se má input posunout
    >
      <View className="flex-1 bg-background justify-center p-5">
        <CodeModal
          visible={showCodeModal}
          code={generatedCode}
          onClose={handleModalClose}
        />
        <Card className="max-w-md w-full mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Vytvořit novou domácnost
            </CardTitle>
            <CardDescription className="text-center">
              Zadejte adresu bytu. Po vytvoření obdržíte kód, který můžete
              sdílet s ostatními.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-4">
            <View className="gap-2">
              <Label>Adresa bytu</Label>
              <Input
                placeholder="např. Vodičkova 12, Praha"
                value={address}
                onChangeText={setAddress}
                editable={!loading}
              />
            </View>

            <View className="gap-2">
              <Label>Název bytu (volitelné)</Label>
              <Input
                placeholder="např. Náš byt"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <Button onPress={handleCreateFlat} disabled={loading}>
              <Text>{loading ? "Vytváření..." : "Vytvořit domácnost"}</Text>
            </Button>

            {showBackButton && (
              <Button
                variant="ghost"
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text>Zpět</Text>
              </Button>
            )}
          </CardContent>
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
}
